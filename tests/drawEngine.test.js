// Run with: npm test
const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../src/services/drawEngine");
const { addMonths, previousMonthKey, monthRange, isValidMonthKey, monthKeyOf } = require("../src/utils/month");

// ---------- month helpers ----------
test("month helpers: keys, ranges, year boundaries", () => {
  assert.equal(isValidMonthKey("2026-09"), true);
  assert.equal(isValidMonthKey("2026-13"), false);
  assert.equal(isValidMonthKey("2026-9"), false);
  assert.equal(addMonths("2026-01", -1), "2025-12");
  assert.equal(addMonths("2026-12", 1), "2027-01");
  assert.equal(addMonths("2026-09", -11), "2025-10");
  assert.equal(previousMonthKey(new Date("2026-01-15T00:00:00Z")), "2025-12");
  assert.equal(monthKeyOf(new Date("2026-03-31T23:59:59Z")), "2026-03");
  const r = monthRange("2026-12");
  assert.equal(r.start.toISOString(), "2026-12-01T00:00:00.000Z");
  assert.equal(r.end.toISOString(), "2027-01-01T00:00:00.000Z");
});

// ---------- random stream ----------
test("rng is deterministic per seed and differs between seeds", () => {
  const a = E.makeRng("seed-1"), b = E.makeRng("seed-1"), c = E.makeRng("seed-2");
  const A = [a(), a(), a()], B = [b(), b(), b()], C = [c(), c(), c()];
  assert.deepEqual(A, B);
  assert.notDeepEqual(A, C);
  for (const x of A) assert.ok(x >= 0 && x < 1);
});

// ---------- random draw ----------
test("random draw: 5 distinct integers in 1..45, sorted, reproducible", () => {
  for (let i = 0; i < 300; i++) {
    const n = E.drawRandomNumbers(E.makeRng(`s${i}`));
    assert.equal(n.length, 5);
    assert.equal(new Set(n).size, 5);
    assert.ok(n.every((x) => Number.isInteger(x) && x >= 1 && x <= 45));
    assert.deepEqual(n, [...n].sort((p, q) => p - q));
  }
  assert.deepEqual(E.drawRandomNumbers(E.makeRng("fixed")), E.drawRandomNumbers(E.makeRng("fixed")));
});

test("random draw is roughly uniform (every number 1..45 appears at about the expected rate)", () => {
  const counts = new Array(46).fill(0);
  const draws = 6000; // expected per number: 6000*5/45 = 666.7
  for (let i = 0; i < draws; i++) for (const n of E.drawRandomNumbers(E.makeRng(`u${i}`))) counts[n]++;
  for (let v = 1; v <= 45; v++) assert.ok(counts[v] > 560 && counts[v] < 775, `number ${v} appeared ${counts[v]} times`);
});

// ---------- weighted draw ----------
test("weighted draw: distinct, in range, reproducible", () => {
  const freq = { 30: 50, 31: 40, 32: 10 };
  for (let i = 0; i < 200; i++) {
    const n = E.drawWeightedNumbers(freq, E.makeRng(`w${i}`));
    assert.equal(new Set(n).size, 5);
    assert.ok(n.every((x) => x >= 1 && x <= 45));
  }
  assert.deepEqual(E.drawWeightedNumbers(freq, E.makeRng("k")), E.drawWeightedNumbers(freq, E.makeRng("k")));
});

test("weighted draw: 'frequent' favours popular scores, 'rare' avoids them", () => {
  const freq = { 30: 200 }; // 30 is hugely popular
  let frequentHits = 0, rareHits = 0, uniformHits = 0;
  const N = 1500;
  for (let i = 0; i < N; i++) {
    if (E.drawWeightedNumbers(freq, E.makeRng(`f${i}`), { bias: "frequent" }).includes(30)) frequentHits++;
    if (E.drawWeightedNumbers(freq, E.makeRng(`r${i}`), { bias: "rare" }).includes(30)) rareHits++;
    if (E.drawRandomNumbers(E.makeRng(`x${i}`)).includes(30)) uniformHits++;
  }
  assert.ok(frequentHits > uniformHits * 2, `frequent ${frequentHits} vs uniform ${uniformHits}`);
  assert.ok(rareHits < uniformHits / 5, `rare ${rareHits} vs uniform ${uniformHits}`);
});

test("weighted draw: numbers nobody scored still have a chance (smoothing)", () => {
  const freq = { 30: 100 };
  let sawOther = false;
  for (let i = 0; i < 100 && !sawOther; i++) if (E.drawWeightedNumbers(freq, E.makeRng(`o${i}`)).some((n) => n !== 30)) sawOther = true;
  assert.ok(sawOther);
});

// ---------- matching ----------
test("countMatches counts distinct matching values only", () => {
  const drawn = [5, 12, 23, 34, 40];
  assert.equal(E.countMatches(drawn, [5, 12, 23, 34, 40]), 5);
  assert.equal(E.countMatches(drawn, [5, 12, 23, 34, 1]), 4);
  assert.equal(E.countMatches(drawn, [5, 12, 23, 1, 2]), 3);
  assert.equal(E.countMatches(drawn, [1, 2, 3, 4, 6]), 0);
  assert.equal(E.countMatches(drawn, [5, 5, 5, 5, 5]), 1); // duplicates never inflate the count
  assert.equal(E.countMatches(drawn, [5, 5, 12, 12, 23]), 3);
  assert.equal(E.tierForMatches(5), "match5");
  assert.equal(E.tierForMatches(4), "match4");
  assert.equal(E.tierForMatches(3), "match3");
  assert.equal(E.tierForMatches(2), null);
  assert.equal(E.tierForMatches(0), null);
});

// ---------- monthly pool ----------
const pay = (paidAt, prizePoolAmount, coversMonths = 1) => ({ paidAt: new Date(paidAt), prizePoolAmount, coversMonths });

test("monthly payment counts only in the month it was paid", () => {
  const p = pay("2026-09-15T10:00:00Z", 24950);
  assert.equal(E.monthlyPoolContribution(p, "2026-09"), 24950);
  assert.equal(E.monthlyPoolContribution(p, "2026-08"), 0);
  assert.equal(E.monthlyPoolContribution(p, "2026-10"), 0);
});

test("yearly payment is spread over 12 months and sums to exactly the original amount", () => {
  for (const amount of [249950, 249951, 249961, 12, 5, 0]) {
    const p = pay("2026-03-31T23:00:00Z", amount, 12);
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += E.monthlyPoolContribution(p, addMonths("2026-03", i));
    assert.equal(sum, amount, `amount ${amount}`);
    assert.equal(E.monthlyPoolContribution(p, "2026-02"), 0); // before
    assert.equal(E.monthlyPoolContribution(p, "2027-03"), 0); // after the 12th month
  }
});

test("computeMonthlyPool adds monthly and yearly contributions together", () => {
  const payments = [pay("2026-09-01T00:00:00Z", 24950), pay("2026-09-20T00:00:00Z", 24950), pay("2026-05-10T00:00:00Z", 249950, 12), pay("2025-08-10T00:00:00Z", 249950, 12)];
  // 2 monthly + the May yearly slice; the August-2025 yearly has expired
  assert.equal(E.computeMonthlyPool(payments, "2026-09"), 24950 * 2 + Math.floor(249950 / 12) + (4 < 249950 % 12 ? 1 : 0));
});

// ---------- tiers ----------
const sumMoney = (r, poolTotal, rolloverIn) => {
  const paid = r.tiers.match5.distributed + r.tiers.match4.distributed + r.tiers.match3.distributed;
  return { in: poolTotal + rolloverIn, out: paid + r.retained + r.rolloverOut };
};

test("40/35/25 split of a pool with no winners: jackpot rolls over, others are retained", () => {
  const r = E.computePrizeTiers({ poolTotal: 100000, rolloverIn: 0, winnerCounts: {} });
  assert.equal(r.tiers.match5.pool, 40000);
  assert.equal(r.tiers.match4.pool, 35000);
  assert.equal(r.tiers.match3.pool, 25000);
  assert.equal(r.rolloverOut, 40000); // only the 5-match tier rolls over
  assert.equal(r.retained, 60000); // 4 and 3-match money is NOT rolled over (PRD)
});

test("winners share their tier equally; jackpot does not roll over when won", () => {
  const r = E.computePrizeTiers({ poolTotal: 100000, rolloverIn: 0, winnerCounts: { match5: 1, match4: 2, match3: 5 } });
  assert.equal(r.tiers.match5.prizeEach, 40000);
  assert.equal(r.tiers.match4.prizeEach, 17500);
  assert.equal(r.tiers.match3.prizeEach, 5000);
  assert.equal(r.rolloverOut, 0);
  assert.equal(r.retained, 0);
});

test("carried-over jackpot is added to the 5-match tier", () => {
  const r = E.computePrizeTiers({ poolTotal: 100000, rolloverIn: 80000, winnerCounts: { match5: 2 } });
  assert.equal(r.tiers.match5.pool, 120000);
  assert.equal(r.tiers.match5.prizeEach, 60000);
});

test("rolled-over jackpot keeps growing across consecutive unclaimed months", () => {
  let carry = 0;
  const jackpots = [];
  for (let m = 0; m < 4; m++) {
    const r = E.computePrizeTiers({ poolTotal: 100000, rolloverIn: carry, winnerCounts: {} });
    jackpots.push(r.tiers.match5.pool);
    carry = r.rolloverOut;
  }
  assert.deepEqual(jackpots, [40000, 80000, 120000, 160000]);
});

test("indivisible amounts: every winner gets the same integer, the remainder is retained", () => {
  const r = E.computePrizeTiers({ poolTotal: 100000, winnerCounts: { match4: 3 } }); // 35000 / 3
  assert.equal(r.tiers.match4.prizeEach, 11666);
  assert.equal(r.tiers.match4.distributed, 34998);
  assert.equal(r.tiers.match4.unclaimed, 2);
});

test("money is conserved for many pools, rollovers and winner counts", () => {
  for (const poolTotal of [0, 1, 99, 24950, 100000, 1234567]) {
    for (const rolloverIn of [0, 7, 40000]) {
      for (const w of [{}, { match5: 1 }, { match5: 3, match4: 7, match3: 11 }, { match4: 2 }, { match3: 13 }]) {
        const r = E.computePrizeTiers({ poolTotal, rolloverIn, winnerCounts: w });
        const s = sumMoney(r, poolTotal, rolloverIn);
        assert.equal(s.out, s.in, `pool ${poolTotal} rollover ${rolloverIn} winners ${JSON.stringify(w)}`);
        for (const t of Object.values(r.tiers)) assert.ok(t.prizeEach >= 0 && t.unclaimed >= 0);
      }
    }
  }
});

// ---------- full simulation ----------
const SEED = "test-seed-123";
const drawn = E.drawRandomNumbers(E.makeRng(SEED)); // the numbers this seed will produce
const others = Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => !drawn.includes(n)); // numbers NOT drawn
const NOW = new Date("2026-10-01T00:00:00Z");
const payments = [pay("2026-09-05T00:00:00Z", 100000)];

const sim = (participants, extra = {}) =>
  E.buildSimulation({ monthKey: "2026-09", mode: "random", seed: SEED, participants, payments, now: NOW, ...extra });

test("simulation: each player lands in the right tier and prizes are split correctly", () => {
  const participants = [
    { userId: "jackpot", scores: [...drawn] }, // 5 matches
    { userId: "four-a", scores: [...drawn.slice(0, 4), others[0]] },
    { userId: "four-b", scores: [...drawn.slice(1, 5), others[1]] },
    { userId: "three", scores: [...drawn.slice(0, 3), others[2], others[3]] },
    { userId: "two", scores: [...drawn.slice(0, 2), others[4], others[5], others[6]] },
    { userId: "none", scores: others.slice(0, 5) },
    { userId: "short", scores: [...drawn.slice(0, 4)] }, // only 4 scores: not eligible
  ];
  const { result, entries } = sim(participants);
  assert.deepEqual(result.numbers, drawn);
  assert.equal(result.activeSubscribers, 7);
  assert.equal(result.eligibleCount, 6); // "short" excluded
  assert.equal(entries.find((e) => e.userId === "jackpot").tier, "match5");
  assert.equal(entries.find((e) => e.userId === "four-a").tier, "match4");
  assert.equal(entries.find((e) => e.userId === "three").tier, "match3");
  assert.equal(entries.find((e) => e.userId === "two").tier, null);
  assert.equal(entries.find((e) => e.userId === "short"), undefined);
  assert.deepEqual(result.distribution, { 0: 1, 1: 0, 2: 1, 3: 1, 4: 2, 5: 1 });
  assert.equal(result.poolTotal, 100000);
  assert.equal(result.tiers.match5.prizeEach, 40000); // one jackpot winner takes 40%
  assert.equal(result.tiers.match4.prizeEach, 17500); // two winners split 35%
  assert.equal(result.tiers.match3.prizeEach, 25000);
  assert.equal(result.rolloverOut, 0);
});

test("simulation: nobody hits 5, so the jackpot rolls over and feeds the next month", () => {
  const first = sim([{ userId: "a", scores: [...drawn.slice(0, 4), others[0]] }, { userId: "b", scores: others.slice(0, 5) }]);
  assert.equal(first.result.rolloverOut, 40000);
  const second = sim([{ userId: "a", scores: [...drawn] }], { rolloverIn: first.result.rolloverOut, payments: [pay("2026-09-05T00:00:00Z", 100000)] });
  assert.equal(second.result.tiers.match5.pool, 80000);
  assert.equal(second.result.tiers.match5.prizeEach, 80000);
});

test("simulation is fully reproducible from its seed", () => {
  const participants = [{ userId: "a", scores: [1, 2, 3, 4, 5] }, { userId: "b", scores: [10, 20, 30, 40, 41] }];
  const a = sim(participants), b = sim(participants);
  assert.deepEqual(a.result, b.result);
  assert.deepEqual(a.entries, b.entries);
  const c = sim(participants, { seed: "another" });
  assert.notDeepEqual(c.result.numbers, a.result.numbers);
});

test("simulation with no players still works and the whole pool rolls over", () => {
  const { result, entries } = sim([]);
  assert.equal(entries.length, 0);
  assert.equal(result.eligibleCount, 0);
  assert.equal(result.rolloverOut, 40000);
});

test("algorithmic simulation stores the frequency table and uses only eligible players", () => {
  const participants = [
    { userId: "a", scores: [30, 30, 31, 31, 32] },
    { userId: "b", scores: [30, 31, 32, 33, 34] },
    { userId: "c", scores: [1, 2] }, // not eligible: must not influence weights
  ];
  const { result } = sim(participants, { mode: "algorithmic", bias: "frequent" });
  assert.equal(result.mode, "algorithmic");
  assert.equal(result.algorithmBias, "frequent");
  assert.equal(result.frequency[30], 3);
  assert.equal(result.frequency[1], undefined);
  assert.equal(new Set(result.numbers).size, 5);
});

test("a player with repeated scores cannot win the jackpot with fewer than 5 different values", () => {
  const { entries } = sim([{ userId: "dup", scores: [drawn[0], drawn[0], drawn[1], drawn[1], drawn[2]] }]);
  assert.equal(entries[0].matchCount, 3);
  assert.equal(entries[0].tier, "match3");
});
