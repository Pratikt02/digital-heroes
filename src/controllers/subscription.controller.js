const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/subscription.service");
const { publicPlans, CURRENCY } = require("../config/plans");

const statusResponse = async (user) => {
  const payments = await service.listPayments(user._id);
  const pub = user.toPublic();
  return { subscription: pub.subscription, isSubscribed: pub.isSubscribed, payments: payments.map((p) => p.toPublic()) };
};

exports.plans = (req, res) => res.json({ plans: publicPlans(), currency: CURRENCY });

exports.status = asyncHandler(async (req, res) => res.json(await statusResponse(req.user)));

exports.checkout = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createCheckout(req.user, req.body.plan));
});

exports.verify = asyncHandler(async (req, res) => {
  await service.verifyCheckout(req.user, req.body);
  res.json(await statusResponse(req.user));
});

exports.sync = asyncHandler(async (req, res) => {
  await service.syncSubscription(req.user);
  res.json(await statusResponse(req.user));
});

exports.cancel = asyncHandler(async (req, res) => {
  await service.cancelAtPeriodEnd(req.user);
  res.json(await statusResponse(req.user));
});
