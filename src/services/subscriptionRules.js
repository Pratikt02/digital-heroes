// PURE mapping from the payment provider's subscription status to OUR status.
// The provider's status inside each webhook is the source of truth, which also makes
// handling idempotent: replaying an event just sets the same state again.
const STATUS_MAP = {
  created: "inactive", // subscription exists but the customer has not paid yet
  authenticated: "inactive",
  active: "active",
  pending: "past_due", // a renewal charge failed; the provider is retrying
  halted: "lapsed", // retries exhausted
  cancelled: "canceled",
  completed: "canceled", // all billing cycles finished
  expired: "lapsed",
  paused: "past_due",
};

// Returns null for statuses we don't know, so callers can leave the user unchanged.
const mapProviderStatus = (status) => STATUS_MAP[status] ?? null;

// ids = { monthly: "plan_x", yearly: "plan_y" }
function planKeyFromProviderPlanId(planId, ids) {
  if (!planId) return null;
  return Object.keys(ids).find((k) => ids[k] && ids[k] === planId) || null;
}

module.exports = { mapProviderStatus, planKeyFromProviderPlanId };
