// Month keys look like "2026-09". Everything is UTC so results never depend on server timezone.
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const isValidMonthKey = (k) => typeof k === "string" && MONTH_RE.test(k);
const monthKeyOf = (date) => new Date(date).toISOString().slice(0, 7);

const monthIndex = (key) => {
  const [y, m] = key.split("-").map(Number);
  return y * 12 + (m - 1);
};

function addMonths(key, n) {
  const idx = monthIndex(key) + n;
  const y = Math.floor(idx / 12);
  return `${String(y).padStart(4, "0")}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

// [start, end) of a month, as UTC Dates
function monthRange(key) {
  const [y, m] = key.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

const previousMonthKey = (date = new Date()) => addMonths(monthKeyOf(date), -1);

module.exports = { MONTH_RE, isValidMonthKey, monthKeyOf, monthIndex, addMonths, monthRange, previousMonthKey };
