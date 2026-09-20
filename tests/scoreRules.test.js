// Run with: npm test
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { checkInsertAllowed, selectToEvict, sortNewestFirst } = require("../src/services/scoreRules");
const { createScoreSchema, updateScoreSchema } = require("../src/validators/score.schemas");
const { parseDateOnly } = require("../src/utils/date");

const s = (id, day) => ({ id, date: new Date(Date.UTC(2026, 0, day)) }); // Jan `day`, 2026
const d = (day) => new Date(Date.UTC(2026, 0, day));
const five = [s("a", 10), s("b", 12), s("c", 14), s("d", 16), s("e", 18)];

test("allows inserts while fewer than 5 scores are stored", () => {
  assert.equal(checkInsertAllowed([s("a", 10), s("b", 12)], d(1)), null); // even an older date is fine
});

test("rejects a second score on the same date", () => {
  assert.equal(checkInsertAllowed(five, d(14)), "DUPLICATE_DATE");
});

test("with 5 stored, a newer date is allowed and evicts the oldest", () => {
  assert.equal(checkInsertAllowed(five, d(20)), null);
  const evicted = selectToEvict([...five, s("new", 20)]);
  assert.deepEqual(evicted.map((x) => x.id), ["a"]);
});

test("with 5 stored, a date between existing ones evicts the oldest", () => {
  assert.equal(checkInsertAllowed(five, d(13)), null);
  assert.deepEqual(selectToEvict([...five, s("new", 13)]).map((x) => x.id), ["a"]);
});

test("with 5 stored, a date older than all of them is rejected", () => {
  assert.equal(checkInsertAllowed(five, d(9)), "TOO_OLD");
});

test("stored input order does not matter", () => {
  const shuffled = [five[3], five[0], five[4], five[2], five[1]];
  assert.equal(checkInsertAllowed(shuffled, d(9)), "TOO_OLD");
  assert.deepEqual(selectToEvict([...shuffled, s("new", 20)]).map((x) => x.id), ["a"]);
});

test("nothing is evicted at exactly 5; extras beyond 5 are all evicted", () => {
  assert.deepEqual(selectToEvict(five), []);
  const seven = [...five, s("x", 1), s("y", 2)];
  assert.deepEqual(selectToEvict(seven).map((x) => x.id).sort(), ["x", "y"]);
});

test("list is sorted newest first", () => {
  assert.deepEqual(sortNewestFirst(five).map((x) => x.id), ["e", "d", "c", "b", "a"]);
});

test("score value must be a whole number from 1 to 45", () => {
  const ok = (value) => createScoreSchema.safeParse({ value, date: "2026-01-10" }).success;
  assert.equal(ok(1), true);
  assert.equal(ok(45), true);
  assert.equal(ok(0), false);
  assert.equal(ok(46), false);
  assert.equal(ok(3.5), false);
  assert.equal(ok("20"), false);
  assert.equal(ok(null), false);
});

test("date must be a real calendar date, not future, in YYYY-MM-DD", () => {
  const ok = (date) => createScoreSchema.safeParse({ value: 20, date }).success;
  assert.equal(ok("2026-01-10"), true);
  assert.equal(ok("2026-02-30"), false); // not a real date
  assert.equal(ok("10-01-2026"), false); // wrong format
  assert.equal(ok("2999-01-01"), false); // future
  assert.equal(ok("1990-01-01"), false); // too old
  assert.equal(ok(undefined), false);
});

test("parsed date is stored at UTC midnight", () => {
  const r = createScoreSchema.parse({ value: 20, date: "2026-01-10" });
  assert.equal(r.date.toISOString(), "2026-01-10T00:00:00.000Z");
  assert.equal(parseDateOnly("2026-02-30"), null);
});

test("update needs at least one field, and role-like extras are stripped", () => {
  assert.equal(updateScoreSchema.safeParse({}).success, false);
  assert.equal(updateScoreSchema.safeParse({ value: 30 }).success, true);
  assert.equal(updateScoreSchema.safeParse({ date: "2026-01-10" }).success, true);
  assert.equal(updateScoreSchema.parse({ value: 30, user: "someone-else" }).user, undefined);
});
