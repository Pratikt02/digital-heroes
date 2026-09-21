const { z } = require("zod");
const { PLAN_KEYS } = require("../config/plans");

const checkoutSchema = z.object({ plan: z.enum(PLAN_KEYS, { errorMap: () => ({ message: `Plan must be one of: ${PLAN_KEYS.join(", ")}` }) }) });

// What Razorpay Checkout hands back to the browser after a successful payment.
const verifySchema = z.object({
  razorpay_payment_id: z.string().min(5).max(100),
  razorpay_subscription_id: z.string().min(5).max(100),
  razorpay_signature: z.string().min(10).max(200),
});

module.exports = { checkoutSchema, verifySchema };
