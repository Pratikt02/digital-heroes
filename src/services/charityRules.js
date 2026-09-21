// PURE charity rules: no database, no Express, easy to unit test.

const MIN_CHARITY_PERCENT = 10; // PRD: minimum contribution is 10% of the subscription fee
// Capped at 50% so the fee can always cover the 50% prize pool AND the charity share.
const MAX_CHARITY_PERCENT = 50;

function isValidPercentage(p) {
  return Number.isInteger(p) && p >= MIN_CHARITY_PERCENT && p <= MAX_CHARITY_PERCENT;
}

// Charity's share of a payment. Money is ALWAYS integer minor units (paise/cents) to avoid
// floating-point drift. Uses integer arithmetic only, rounding half up.
//   calcCharityContribution(1999, 10) -> 200
function calcCharityContribution(amountMinor, percentage) {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) throw new RangeError("amount must be a non-negative integer (minor units)");
  if (!isValidPercentage(percentage)) throw new RangeError(`percentage must be a whole number ${MIN_CHARITY_PERCENT}-${MAX_CHARITY_PERCENT}`);
  return Math.floor((amountMinor * percentage + 50) / 100);
}

// "Clean Water Collective!" -> "clean-water-collective"
function slugify(name) {
  const slug = String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "charity";
}

module.exports = { MIN_CHARITY_PERCENT, MAX_CHARITY_PERCENT, isValidPercentage, calcCharityContribution, slugify };
