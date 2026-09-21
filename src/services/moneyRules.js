// PURE money rules: how one payment is divided. Integer minor units (paise) only.
const { calcCharityContribution } = require("./charityRules");

const PRIZE_POOL_PERCENT = 50; // ASSUMPTION: 50% of every fee goes to the prize pool

// splitPayment(49900, 10) -> { prizePool: 24950, charity: 4990, platform: 19960 }
// The three parts always add up to exactly the amount paid.
function splitPayment(amountMinor, charityPercent) {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) throw new RangeError("amount must be a non-negative integer (minor units)");
  const prizePool = Math.floor((amountMinor * PRIZE_POOL_PERCENT + 50) / 100);
  // min() only matters for absurdly tiny amounts where rounding could over-allocate by 1 unit.
  const charity = Math.min(calcCharityContribution(amountMinor, charityPercent), amountMinor - prizePool);
  const platform = amountMinor - prizePool - charity;
  return { prizePool, charity, platform };
}

module.exports = { PRIZE_POOL_PERCENT, splitPayment };
