// The two subscription plans. Prices are in INR paise (integer minor units).
// The provider plan IDs (plan_xxx) come from env vars because they differ per Razorpay account.
// The amount charged is set on the Razorpay plan itself, and we always trust the amount
// reported by the provider on each payment, never these constants, when recording money.
const CURRENCY = "INR";

const PLANS = {
  monthly: { key: "monthly", label: "Monthly", amountMinor: 49900, months: 1, totalCount: 120, envKey: "RAZORPAY_PLAN_MONTHLY" },
  // Razorpay allows at most 10 years of billing: 120 monthly cycles or 10 yearly cycles.
  yearly: { key: "yearly", label: "Yearly", amountMinor: 499900, months: 12, totalCount: 10, envKey: "RAZORPAY_PLAN_YEARLY" },
};

const PLAN_KEYS = Object.keys(PLANS);

const rupees = (minor) => `₹${(minor / 100).toLocaleString("en-IN")}`;

function publicPlans() {
  const monthlyYear = PLANS.monthly.amountMinor * 12;
  return PLAN_KEYS.map((k) => {
    const p = PLANS[k];
    return {
      key: p.key,
      label: p.label,
      amountMinor: p.amountMinor,
      display: rupees(p.amountMinor),
      months: p.months,
      // Yearly shows how much cheaper it is than 12 monthly payments.
      savingsPercent: k === "yearly" ? Math.round((1 - p.amountMinor / monthlyYear) * 100) : 0,
    };
  });
}

module.exports = { CURRENCY, PLANS, PLAN_KEYS, publicPlans };
