// PURE rolling-score rules. No database, no Express, so they are trivial to unit test.
//
// PRD rules implemented:
//  - Only the latest 5 scores are retained
//  - One score per date
//  - A new score replaces the oldest automatically
//
// ASSUMPTION ("latest" and "oldest" are decided by the round's DATE, not by when it was typed in):
// if a user enters a score dated older than all 5 stored scores, it would be the oldest and
// immediately dropped, so we reject it with a clear message instead of silently discarding it.

const MAX_SCORES = 5;

const time = (d) => new Date(d).getTime();

function sortNewestFirst(scores) {
  return [...scores].sort((a, b) => time(b.date) - time(a.date));
}

// Returns null if the insert is allowed, otherwise an error code.
function checkInsertAllowed(existing, newDate, max = MAX_SCORES) {
  const t = time(newDate);
  if (existing.some((s) => time(s.date) === t)) return "DUPLICATE_DATE";

  if (existing.length >= max) {
    const cutoff = time(sortNewestFirst(existing)[max - 1].date); // the oldest score we'd keep
    if (t < cutoff) return "TOO_OLD";
  }
  return null;
}

// Given a user's scores (after an insert), which ones must be deleted to keep only the latest `max`?
function selectToEvict(scores, max = MAX_SCORES) {
  return sortNewestFirst(scores).slice(max);
}

module.exports = { MAX_SCORES, sortNewestFirst, checkInsertAllowed, selectToEvict };
