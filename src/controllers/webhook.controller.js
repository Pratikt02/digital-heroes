const { connectDB } = require("../config/db");
const { verifyWebhookSignature } = require("../utils/razorpaySignature");
const { handleWebhookEvent } = require("../services/subscription.service");

// POST /api/webhooks/razorpay. Mounted in app.js with express.raw() BEFORE express.json(),
// because the signature is computed over the exact raw bytes Razorpay sent.
exports.razorpayWebhook = async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ error: "Webhook secret not configured" });

    const signature = req.get("x-razorpay-signature");
    const raw = req.body; // a Buffer, thanks to express.raw()
    if (!Buffer.isBuffer(raw) || !verifyWebhookSignature(raw, signature, secret)) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    let evt;
    try {
      evt = JSON.parse(raw.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    await connectDB();
    const result = await handleWebhookEvent(evt);
    res.json({ received: true, result }); // any 2xx tells Razorpay not to retry
  } catch (err) {
    next(err); // a 5xx makes Razorpay retry later, which is what we want for transient failures
  }
};
