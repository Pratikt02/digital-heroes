// Thin Razorpay REST client. This is the ONLY file that knows about Razorpay's API,
// so switching payment providers later means rewriting this file, not the app.
const AppError = require("../utils/AppError");

const BASE = "https://api.razorpay.com/v1";

function credentials() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new AppError("Payments are not configured yet", 503);
  return { id, secret };
}

async function request(method, path, body) {
  const { id, secret } = credentials();
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new AppError("Could not reach the payment provider, please try again", 502);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AppError(`Payment provider error: ${data?.error?.description || res.status}`, 502);
  return data;
}

const createSubscription = (params) => request("POST", "/subscriptions", params);
const fetchSubscription = (id) => request("GET", `/subscriptions/${encodeURIComponent(id)}`);
const fetchPayment = (id) => request("GET", `/payments/${encodeURIComponent(id)}`);
// atCycleEnd = true keeps the subscriber's access until the period they already paid for ends.
const cancelSubscription = (id, atCycleEnd) =>
  request("POST", `/subscriptions/${encodeURIComponent(id)}/cancel`, { cancel_at_cycle_end: !!atCycleEnd });

module.exports = { createSubscription, fetchSubscription, fetchPayment, cancelSubscription };
