// Golf scores are tied to a calendar DATE (no time of day). We store them as UTC midnight
// so "2026-09-20" is the same day for everyone regardless of timezone.

// "2026-09-20" -> Date at UTC midnight, or null if not a real calendar date (e.g. 2026-02-30).
function parseDateOnly(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return formatDateOnly(date) === str ? date : null; // catches rollover like Feb 30 -> Mar 2
}

function formatDateOnly(date) {
  return new Date(date).toISOString().slice(0, 10);
}

// Latest date we accept: tomorrow (UTC). The extra day means users ahead of UTC
// (for example India) can still log a round played "today" in their local time.
function latestAllowedDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

const EARLIEST_ALLOWED_DATE = new Date(Date.UTC(2000, 0, 1));

module.exports = { parseDateOnly, formatDateOnly, latestAllowedDate, EARLIEST_ALLOWED_DATE };
