// PURE draw engine: no database, no Express, no clock (time is passed in). Everything the
// PRD's evaluation calls "data handling accuracy" lives here so it can be tested exhaustively.
//
//   1. drawing the winning numbers (random or frequency-weighted)
//   2. matching a player's scores against them
//   3. building the monthly prize pool
//   4. splitting the pool into tiers, sharing it among winners, and rolling the jackpot over
const crypto = require("crypto");
const { monthKeyOf, monthIndex } = require("../utils/month");

const DRAW_SIZE = 5; // numbers drawn each month
const NUMBER_MAX = 45; // numbers are 1..45, the same range as a Stableford score
const MIN_SCORES_TO_ENTER = 5; // ASSUMPTION: PRD says users "must enter their last 5 scores"
const TIER_SHARES = { match5: 40, match4: 35, match3: 25 }; // PRD prize pool split (percent)

const tierForMatches = (n) => (n >= 5 ? "match5" : n === 4 ? "match4" : n === 3 ? "match3" : null);

// ---------------------------------------------------------------------------------------------
// 1. Drawing numbers
// ---------------------------------------------------------------------------------------------

// Deterministic random stream from a seed: SHA-256(seed:counter) -> 48 bits -> [0, 1).
// Same seed, same draw. That makes tests reproducible and lets us publish the seed so anyone
// can re-check a random draw ("provably fair").
function makeRng(seed) {
  let counter = 0;
  return () => {
    const digest = crypto.createHash("sha256").update(`${seed}:${counter++}`).digest();
    return digest.readUIntBE(0, 6) / 2 ** 48;
  };
}

// Standard lottery: DRAW_SIZE distinct numbers from 1..max, all equally likely (partial Fisher-Yates).
function drawRandomNumbers(rng, count = DRAW_SIZE, max = NUMBER_MAX) {
  const pool = Array.from({ length: max }, (_, i) => i + 1);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (max - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}

// Algorithmic draw: weight each number by how often it appears in players' scores.
//   bias "frequent": popular scores are MORE likely to be drawn (more winners, jackpot pays out more often)
//   bias "rare":     popular scores are LESS likely (fewer winners, jackpot rolls over more often)
// Every number keeps a non-zero chance (+1 smoothing), so the draw is never fully predictable.
function drawWeightedNumbers(frequency, rng, { bias = "frequent", count = DRAW_SIZE, max = NUMBER_MAX } = {}) {
  const weight = (v) => {
    const f = frequency[v] || 0;
    return bias === "rare" ? 1 / (f + 1) : f + 1;
  };
  const picked = new Set();
  for (let n = 0; n < count; n++) {
    let total = 0;
    for (let v = 1; v <= max; v++) if (!picked.has(v)) total += weight(v);
    let r = rng() * total;
    let chosen = null;
    for (let v = 1; v <= max; v++) {
      if (picked.has(v)) continue;
      chosen = v; // remembers the last candidate as a fallback for floating point edge cases
      r -= weight(v);
      if (r < 0) break;
    }
    picked.add(chosen);
  }
  return [...picked].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------------------------
// 2. Matching
// ---------------------------------------------------------------------------------------------

// How many of the drawn numbers appear among a player's scores. Duplicate scores count once,
// so a player needs 5 DIFFERENT score values to hit the 5-number jackpot.
function countMatches(drawn, scores) {
  const have = new Set(scores);
  return drawn.filter((n) => have.has(n)).length;
}

// ---------------------------------------------------------------------------------------------
// 3. Prize pool for a month
// ---------------------------------------------------------------------------------------------

// How much of ONE payment's prize-pool share belongs to `monthKey`.
// Monthly payments (coversMonths 1) count entirely in the month they were paid. A yearly payment
// is spread over the 12 months starting in its payment month; the remainder (pool % 12) goes to
// the earliest months, so the 12 pieces add up to exactly the original amount.
function monthlyPoolContribution(payment, monthKey) {
  const n = payment.coversMonths || 1;
  const k = monthIndex(monthKey) - monthIndex(monthKeyOf(payment.paidAt));
  if (k < 0 || k >= n) return 0;
  const pool = payment.prizePoolAmount;
  return Math.floor(pool / n) + (k < pool % n ? 1 : 0);
}

const computeMonthlyPool = (payments, monthKey) => payments.reduce((sum, p) => sum + monthlyPoolContribution(p, monthKey), 0);

// ---------------------------------------------------------------------------------------------
// 4. Tiers, winners, rollover
// ---------------------------------------------------------------------------------------------

// winnerCounts = { match5, match4, match3 }. All money is integer paise.
//   - pool is split 40 / 35 / 25 (any rounding remainder goes to the jackpot tier)
//   - the 5-match tier also receives the jackpot carried over from earlier draws
//   - each tier's money is shared EQUALLY among its winners (floor; sub-rupee remainder is retained)
//   - the jackpot rolls over if nobody hit 5; unclaimed 4/3-match money is NOT rolled over (PRD)
function computePrizeTiers({ poolTotal, rolloverIn = 0, winnerCounts }) {
  const t4 = Math.floor((poolTotal * TIER_SHARES.match4) / 100);
  const t3 = Math.floor((poolTotal * TIER_SHARES.match3) / 100);
  const t5 = poolTotal - t4 - t3 + rolloverIn; // 40% + rounding remainder + carried-over jackpot

  const build = (pool, winners) => {
    const prizeEach = winners > 0 ? Math.floor(pool / winners) : 0;
    const distributed = prizeEach * winners;
    return { pool, winners, prizeEach, distributed, unclaimed: pool - distributed };
  };
  const tiers = {
    match5: build(t5, winnerCounts.match5 || 0),
    match4: build(t4, winnerCounts.match4 || 0),
    match3: build(t3, winnerCounts.match3 || 0),
  };

  const jackpotUnclaimed = tiers.match5.winners === 0;
  const rolloverOut = jackpotUnclaimed ? tiers.match5.pool : 0;
  const retained = tiers.match4.unclaimed + tiers.match3.unclaimed + (jackpotUnclaimed ? 0 : tiers.match5.unclaimed);
  return { tiers, rolloverOut, retained };
}

// ---------------------------------------------------------------------------------------------
// The whole simulation, as one pure function
// ---------------------------------------------------------------------------------------------
//   participants: [{ userId, scores: [values, newest first] }] for every ACTIVE subscriber
//   payments:     ledger rows that may fund this month: { prizePoolAmount, coversMonths, paidAt }
//   returns:      { result (stored on the draw), entries (one per eligible player) }
function buildSimulation({ monthKey, mode = "random", bias = "frequent", seed, participants, payments, rolloverIn = 0, now = new Date() }) {
  const eligible = participants.filter((p) => p.scores.length >= MIN_SCORES_TO_ENTER);

  const frequency = {};
  for (const p of eligible) for (const v of p.scores) frequency[v] = (frequency[v] || 0) + 1;

  const rng = makeRng(seed);
  const numbers = mode === "algorithmic" ? drawWeightedNumbers(frequency, rng, { bias }) : drawRandomNumbers(rng);

  const distribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const winnerCounts = { match5: 0, match4: 0, match3: 0 };
  const entries = eligible.map((p) => {
    const scores = p.scores.slice(0, DRAW_SIZE);
    const matchCount = countMatches(numbers, scores);
    const tier = tierForMatches(matchCount);
    distribution[matchCount]++;
    if (tier) winnerCounts[tier]++;
    return { userId: p.userId, scores, matchCount, tier };
  });

  const poolTotal = computeMonthlyPool(payments, monthKey);
  const { tiers, rolloverOut, retained } = computePrizeTiers({ poolTotal, rolloverIn, winnerCounts });

  const result = {
    seed,
    mode,
    algorithmBias: mode === "algorithmic" ? bias : undefined,
    numbers,
    ranAt: now,
    activeSubscribers: participants.length,
    eligibleCount: eligible.length,
    distribution,
    poolTotal,
    rolloverIn,
    rolloverOut,
    retained,
    tiers,
    frequency: mode === "algorithmic" ? frequency : undefined, // kept so an algorithmic draw can be audited
  };
  return { result, entries };
}

module.exports = {
  DRAW_SIZE,
  NUMBER_MAX,
  MIN_SCORES_TO_ENTER,
  TIER_SHARES,
  tierForMatches,
  makeRng,
  drawRandomNumbers,
  drawWeightedNumbers,
  countMatches,
  monthlyPoolContribution,
  computeMonthlyPool,
  computePrizeTiers,
  buildSimulation,
};
