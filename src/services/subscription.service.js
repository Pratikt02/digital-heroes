// Subscription business logic. Pure rules live in subscriptionRules.js / moneyRules.js,
// the provider API lives in razorpay.js.
const User = require("../models/User");
const Payment = require("../models/Payment");
const AppError = require("../utils/AppError");
const provider = require("./razorpay");
const { PLANS, CURRENCY } = require("../config/plans");
const { splitPayment } = require("./moneyRules");
const { mapProviderStatus, planKeyFromProviderPlanId } = require("./subscriptionRules");
const { verifyCheckoutSignature } = require("../utils/razorpaySignature");

const providerPlanIds = () => ({ monthly: process.env.RAZORPAY_PLAN_MONTHLY, yearly: process.env.RAZORPAY_PLAN_YEARLY });

// Copy the provider's subscription state onto our user. Idempotent by design.
async function applyProviderSubscription(user, sub) {
  const status = mapProviderStatus(sub.status);
  if (!status) return user; // unknown status: leave the user unchanged
  const s = user.subscription;
  s.status = status;
  const planKey = planKeyFromProviderPlanId(sub.plan_id, providerPlanIds());
  if (planKey) s.plan = planKey;
  if (sub.current_end) s.currentPeriodEnd = new Date(sub.current_end * 1000);
  await user.save();
  return user;
}

// Write one ledger row for a successful charge, splitting it into prize pool / charity / platform.
async function recordPayment(user, sub, pay) {
  const planKey = user.subscription.plan;
  const split = splitPayment(pay.amount, user.charityPercentage);
  const doc = {
    user: user._id,
    providerPaymentId: pay.id,
    providerSubscriptionId: sub.id,
    plan: planKey || null,
    amount: pay.amount,
    currency: pay.currency || CURRENCY,
    coversMonths: PLANS[planKey]?.months || 1,
    charityId: user.charityId || null,
    charityPercentage: user.charityPercentage,
    charityAmount: split.charity,
    prizePoolAmount: split.prizePool,
    platformAmount: split.platform,
    paidAt: pay.created_at ? new Date(pay.created_at * 1000) : new Date(),
  };
  try {
    return await Payment.create(doc);
  } catch (err) {
    if (err.code === 11000) return Payment.findOne({ providerPaymentId: pay.id }); // webhook retry: already recorded
    throw err;
  }
}

async function createCheckout(user, planKey) {
  if (user.isSubscribed) throw new AppError("You already have an active subscription", 409);
  // PRD: every subscriber directs part of their fee to a charity they choose.
  if (!user.charityId) throw new AppError("Choose a charity before subscribing", 400);

  const plan = PLANS[planKey];
  const planId = process.env[plan.envKey];
  if (!planId) throw new AppError("This plan is not configured yet", 503);

  const sub = await provider.createSubscription({
    plan_id: planId,
    total_count: plan.totalCount,
    customer_notify: false,
    notes: { userId: String(user._id), plan: planKey },
  });

  // Save the id BEFORE the popup opens: webhooks find the user through it.
  user.subscription.providerSubscriptionId = sub.id;
  user.subscription.plan = planKey;
  user.subscription.status = "inactive";
  user.subscription.cancelAtPeriodEnd = false;
  await user.save();

  return {
    subscriptionId: sub.id,
    keyId: process.env.RAZORPAY_KEY_ID,
    plan: planKey,
    amountMinor: plan.amountMinor,
    currency: CURRENCY,
    prefill: { name: user.name, email: user.email },
  };
}

// Called by the browser after the Checkout popup succeeds. The webhook is the safety net,
// but this makes the UI update immediately and works locally without a public webhook URL.
async function verifyCheckout(user, { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }) {
  const ourSubId = user.subscription.providerSubscriptionId;
  if (!ourSubId || ourSubId !== razorpay_subscription_id) throw new AppError("Subscription mismatch", 400);

  const valid = verifyCheckoutSignature({
    paymentId: razorpay_payment_id,
    subscriptionId: ourSubId, // from OUR database, not the browser
    signature: razorpay_signature,
    secret: process.env.RAZORPAY_KEY_SECRET || "",
  });
  if (!valid) throw new AppError("Payment verification failed", 400);

  const [sub, pay] = await Promise.all([provider.fetchSubscription(ourSubId), provider.fetchPayment(razorpay_payment_id)]);
  await applyProviderSubscription(user, sub);
  if (pay.status === "captured") await recordPayment(user, sub, pay);
  return user;
}

// Ask the provider for the current state (fixes any drift, e.g. a missed webhook).
async function syncSubscription(user) {
  const id = user.subscription.providerSubscriptionId;
  if (!id) throw new AppError("No subscription to sync", 404);
  await applyProviderSubscription(user, await provider.fetchSubscription(id));
  return user;
}

// Cancel at the END of the paid period: the user keeps access until then.
async function cancelAtPeriodEnd(user) {
  const s = user.subscription;
  if (!s.providerSubscriptionId || s.status !== "active") throw new AppError("There is no active subscription to cancel", 409);
  if (s.cancelAtPeriodEnd) return user; // already scheduled, nothing to do
  await provider.cancelSubscription(s.providerSubscriptionId, true);
  s.cancelAtPeriodEnd = true;
  await user.save();
  return user;
}

async function listPayments(userId, limit = 10) {
  return Payment.find({ user: userId }).sort({ paidAt: -1 }).limit(limit);
}

// Entry point for verified webhook events. Returns a short string describing what happened.
async function handleWebhookEvent(evt) {
  const sub = evt?.payload?.subscription?.entity;
  if (!evt?.event?.startsWith("subscription.") || !sub?.id) return "ignored";

  const user = await User.findOne({ "subscription.providerSubscriptionId": sub.id });
  // Not found = an old/abandoned subscription (the user has since created a newer one) or a foreign event.
  if (!user) return "no-user";

  await applyProviderSubscription(user, sub);

  if (evt.event === "subscription.charged") {
    const pay = evt.payload?.payment?.entity;
    if (pay?.id && pay.status === "captured") await recordPayment(user, sub, pay);
  }
  return "processed";
}

module.exports = {
  applyProviderSubscription,
  recordPayment,
  createCheckout,
  verifyCheckout,
  syncSubscription,
  cancelAtPeriodEnd,
  listPayments,
  handleWebhookEvent,
};
