// Run with: npm test
process.env.MONGODB_URI ||= "mongodb://127.0.0.1:1/x";
process.env.JWT_SECRET ||= "0123456789abcdef0123456789abcdef0123";
process.env.RAZORPAY_PLAN_MONTHLY = "plan_m";
process.env.RAZORPAY_PLAN_YEARLY = "plan_y";
process.env.RAZORPAY_KEY_SECRET = "key_secret_test";
process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { splitPayment } = require("../src/services/moneyRules");
const { mapProviderStatus, planKeyFromProviderPlanId } = require("../src/services/subscriptionRules");
const { hmacHex, verifyCheckoutSignature, verifyWebhookSignature } = require("../src/utils/razorpaySignature");
const { publicPlans } = require("../src/config/plans");
const { checkoutSchema, verifySchema } = require("../src/validators/subscription.schemas");
const User = require("../src/models/User");
const Payment = require("../src/models/Payment");
const service = require("../src/services/subscription.service");
const { razorpayWebhook } = require("../src/controllers/webhook.controller");

// ---------- money ----------
test("monthly payment split: 50% pool, 10% charity, rest platform (sums exactly)", () => {
  assert.deepEqual(splitPayment(49900, 10), { prizePool: 24950, charity: 4990, platform: 19960 });
});

test("yearly payment split", () => {
  assert.deepEqual(splitPayment(499900, 10), { prizePool: 249950, charity: 49990, platform: 199960 });
});

test("maximum 50% charity leaves zero platform share, never negative", () => {
  assert.deepEqual(splitPayment(49900, 50), { prizePool: 24950, charity: 24950, platform: 0 });
  const tiny = splitPayment(1, 50);
  assert.equal(tiny.prizePool + tiny.charity + tiny.platform, 1);
  assert.ok(tiny.platform >= 0);
});

test("split always sums to the amount, for many amounts and percentages", () => {
  for (const amount of [0, 1, 7, 99, 12345, 49900, 499900, 1000001]) {
    for (const pct of [10, 11, 25, 33, 50]) {
      const s = splitPayment(amount, pct);
      assert.equal(s.prizePool + s.charity + s.platform, amount, `amount ${amount} @ ${pct}%`);
      assert.ok(s.platform >= 0 && s.charity >= 0 && s.prizePool >= 0);
    }
  }
});

test("split rejects bad input", () => {
  assert.throws(() => splitPayment(10.5, 10), RangeError);
  assert.throws(() => splitPayment(1000, 5), RangeError); // below the 10% minimum
  assert.throws(() => splitPayment(1000, 60), RangeError); // above the 50% cap
});

// ---------- plans ----------
test("plans: prices and yearly savings", () => {
  const [m, y] = publicPlans();
  assert.equal(m.amountMinor, 49900);
  assert.equal(m.display, "₹499");
  assert.equal(y.amountMinor, 499900);
  assert.equal(y.months, 12);
  assert.equal(y.savingsPercent, 17);
});

// ---------- status mapping ----------
test("provider statuses map to ours; unknown returns null", () => {
  assert.equal(mapProviderStatus("active"), "active");
  assert.equal(mapProviderStatus("authenticated"), "inactive");
  assert.equal(mapProviderStatus("pending"), "past_due");
  assert.equal(mapProviderStatus("halted"), "lapsed");
  assert.equal(mapProviderStatus("cancelled"), "canceled");
  assert.equal(mapProviderStatus("completed"), "canceled");
  assert.equal(mapProviderStatus("wat"), null);
  assert.equal(planKeyFromProviderPlanId("plan_y", { monthly: "plan_m", yearly: "plan_y" }), "yearly");
  assert.equal(planKeyFromProviderPlanId("plan_z", { monthly: "plan_m", yearly: "plan_y" }), null);
  assert.equal(planKeyFromProviderPlanId(undefined, { monthly: undefined }), null);
});

// ---------- signatures ----------
test("checkout signature: valid, tampered, wrong subscription", () => {
  const good = hmacHex("sek", "pay_1|sub_1");
  assert.equal(verifyCheckoutSignature({ paymentId: "pay_1", subscriptionId: "sub_1", signature: good, secret: "sek" }), true);
  assert.equal(verifyCheckoutSignature({ paymentId: "pay_1", subscriptionId: "sub_2", signature: good, secret: "sek" }), false);
  assert.equal(verifyCheckoutSignature({ paymentId: "pay_2", subscriptionId: "sub_1", signature: good, secret: "sek" }), false);
  assert.equal(verifyCheckoutSignature({ paymentId: "pay_1", subscriptionId: "sub_1", signature: good, secret: "other" }), false);
  assert.equal(verifyCheckoutSignature({ paymentId: "pay_1", subscriptionId: "sub_1", signature: "short", secret: "sek" }), false);
  assert.equal(verifyCheckoutSignature({ paymentId: "pay_1", subscriptionId: "sub_1", signature: undefined, secret: "sek" }), false);
});

test("webhook signature is over the raw bytes", () => {
  const raw = Buffer.from('{"event":"subscription.charged"}');
  const sig = hmacHex("whsec", raw);
  assert.equal(verifyWebhookSignature(raw, sig, "whsec"), true);
  assert.equal(verifyWebhookSignature(Buffer.from('{"event":"subscription.charged" }'), sig, "whsec"), false); // one extra space
});

test("webhook controller rejects missing or bad signatures before touching the database", async () => {
  const run = async (headers, body) => {
    let out = {};
    const req = { get: (h) => headers[h.toLowerCase()], body };
    const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
    await razorpayWebhook(req, res, (e) => { out.err = e; });
    return out;
  };
  const raw = Buffer.from('{"event":"subscription.charged"}');
  assert.equal((await run({}, raw)).status, 400); // no signature
  assert.equal((await run({ "x-razorpay-signature": "deadbeef" }, raw)).status, 400); // wrong signature
  assert.equal((await run({ "x-razorpay-signature": hmacHex("whsec_test", raw) }, { parsed: "object" })).status, 400); // body was already JSON-parsed (misconfigured middleware)
});

// ---------- request validation ----------
test("checkout and verify request validation", () => {
  assert.equal(checkoutSchema.safeParse({ plan: "monthly" }).success, true);
  assert.equal(checkoutSchema.safeParse({ plan: "yearly" }).success, true);
  assert.equal(checkoutSchema.safeParse({ plan: "lifetime" }).success, false);
  assert.equal(checkoutSchema.safeParse({}).success, false);
  assert.equal(verifySchema.safeParse({ razorpay_payment_id: "pay_1234", razorpay_subscription_id: "sub_1234", razorpay_signature: "abcdef123456" }).success, true);
  assert.equal(verifySchema.safeParse({ razorpay_payment_id: "pay_1234" }).success, false);
});

// ---------- webhook state machine (database calls stubbed) ----------
function setup(over = {}) {
  const user = {
    _id: "u1",
    charityId: "c1",
    charityPercentage: 20,
    subscription: { status: "inactive", plan: "monthly", providerSubscriptionId: "sub_1", currentPeriodEnd: null, cancelAtPeriodEnd: false, ...over },
    saves: 0,
    async save() { this.saves++; },
  };
  const payments = new Map();
  User.findOne = async (q) => (q["subscription.providerSubscriptionId"] === user.subscription.providerSubscriptionId ? user : null);
  Payment.create = async (doc) => {
    if (payments.has(doc.providerPaymentId)) throw Object.assign(new Error("dup"), { code: 11000 });
    payments.set(doc.providerPaymentId, doc);
    return doc;
  };
  Payment.findOne = async (q) => payments.get(q.providerPaymentId);
  return { user, payments };
}

const subEntity = (o = {}) => ({ id: "sub_1", plan_id: "plan_m", status: "active", current_end: 1900000000, ...o });
const payEntity = (o = {}) => ({ id: "pay_1", amount: 49900, currency: "INR", status: "captured", created_at: 1800000000, ...o });
const evt = (event, sub, pay) => ({ event, payload: { subscription: { entity: sub }, ...(pay && { payment: { entity: pay } }) } });

test("subscription.charged activates the user and records a correctly split payment", async () => {
  const { user, payments } = setup();
  assert.equal(await service.handleWebhookEvent(evt("subscription.charged", subEntity(), payEntity())), "processed");
  assert.equal(user.subscription.status, "active");
  assert.equal(user.subscription.currentPeriodEnd.getTime(), 1900000000 * 1000);
  const p = payments.get("pay_1");
  assert.equal(p.amount, 49900);
  assert.equal(p.charityPercentage, 20);
  assert.equal(p.charityAmount, 9980); // 20% of 49900
  assert.equal(p.prizePoolAmount, 24950);
  assert.equal(p.platformAmount, 14970);
  assert.equal(p.coversMonths, 1);
  assert.equal(p.paidAt.getTime(), 1800000000 * 1000);
});

test("yearly plan: coversMonths is 12 so the pool share can be spread over 12 draws", async () => {
  const { payments } = setup({ plan: null });
  await service.handleWebhookEvent(evt("subscription.charged", subEntity({ plan_id: "plan_y" }), payEntity({ id: "pay_y", amount: 499900 })));
  const p = payments.get("pay_y");
  assert.equal(p.plan, "yearly");
  assert.equal(p.coversMonths, 12);
  assert.equal(p.prizePoolAmount, 249950);
});

test("a retried webhook does not double count the payment", async () => {
  const { payments } = setup();
  const e = evt("subscription.charged", subEntity(), payEntity());
  await service.handleWebhookEvent(e);
  await service.handleWebhookEvent(e);
  await service.handleWebhookEvent(e);
  assert.equal(payments.size, 1);
});

test("a failed payment (not captured) never enters the ledger", async () => {
  const { payments } = setup();
  await service.handleWebhookEvent(evt("subscription.charged", subEntity(), payEntity({ status: "failed" })));
  assert.equal(payments.size, 0);
});

test("lifecycle: pending -> past_due, halted -> lapsed, cancelled -> canceled", async () => {
  const { user } = setup({ status: "active" });
  await service.handleWebhookEvent(evt("subscription.pending", subEntity({ status: "pending" })));
  assert.equal(user.subscription.status, "past_due");
  await service.handleWebhookEvent(evt("subscription.halted", subEntity({ status: "halted" })));
  assert.equal(user.subscription.status, "lapsed");
  await service.handleWebhookEvent(evt("subscription.cancelled", subEntity({ status: "cancelled" })));
  assert.equal(user.subscription.status, "canceled");
});

test("replaying an event is harmless (idempotent state)", async () => {
  const { user } = setup();
  const e = evt("subscription.activated", subEntity());
  await service.handleWebhookEvent(e);
  const first = JSON.stringify(user.subscription);
  await service.handleWebhookEvent(e);
  assert.equal(JSON.stringify(user.subscription), first);
});

test("events for an unknown or superseded subscription are ignored", async () => {
  const { user } = setup();
  assert.equal(await service.handleWebhookEvent(evt("subscription.charged", subEntity({ id: "sub_OLD" }), payEntity())), "no-user");
  assert.equal(user.subscription.status, "inactive"); // untouched
  assert.equal(await service.handleWebhookEvent({ event: "payment.failed", payload: {} }), "ignored");
  assert.equal(await service.handleWebhookEvent({}), "ignored");
});

test("unknown provider status leaves the user unchanged", async () => {
  const { user } = setup({ status: "active" });
  await service.handleWebhookEvent(evt("subscription.updated", subEntity({ status: "something_new" })));
  assert.equal(user.subscription.status, "active");
});

// ---------- access rules on the real User model ----------
test("isSubscribed: only active AND within the paid period", () => {
  const u = new User({ name: "A", email: "a@b.co", passwordHash: "x" });
  assert.equal(u.isSubscribed, false);
  u.subscription.status = "active";
  u.subscription.currentPeriodEnd = new Date(Date.now() + 86400000);
  assert.equal(u.isSubscribed, true);
  u.subscription.currentPeriodEnd = new Date(Date.now() - 1000);
  assert.equal(u.isSubscribed, false);
  u.subscription.currentPeriodEnd = new Date(Date.now() + 86400000);
  for (const s of ["past_due", "lapsed", "canceled", "inactive"]) {
    u.subscription.status = s;
    assert.equal(u.isSubscribed, false, s);
  }
});

test("charity percentage is capped 10-50 at model level", async () => {
  const u = new User({ name: "A", email: "a@b.co", passwordHash: "x" });
  u.charityPercentage = 9;
  await assert.rejects(u.validate());
  u.charityPercentage = 51;
  await assert.rejects(u.validate());
  u.charityPercentage = 50;
  await assert.doesNotReject(u.validate());
});
