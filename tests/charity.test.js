// Run with: npm test
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { calcCharityContribution, isValidPercentage, slugify } = require("../src/services/charityRules");
const { createCharitySchema, updateCharitySchema, listQuerySchema, selectCharitySchema } = require("../src/validators/charity.schemas");

test("10% minimum: only whole numbers from 10 to 100 are valid", () => {
  assert.equal(isValidPercentage(10), true);
  assert.equal(isValidPercentage(100), true);
  assert.equal(isValidPercentage(9), false);
  assert.equal(isValidPercentage(101), false);
  assert.equal(isValidPercentage(10.5), false);
  assert.equal(isValidPercentage("15"), false);
});

test("server-side schema rejects a percentage below 10 (cannot be bypassed from the UI)", () => {
  assert.equal(selectCharitySchema.safeParse({ percentage: 9 }).success, false);
  assert.equal(selectCharitySchema.safeParse({ percentage: 0 }).success, false);
  assert.equal(selectCharitySchema.safeParse({ percentage: 10 }).success, true);
  assert.equal(selectCharitySchema.safeParse({ percentage: 25 }).success, true);
  assert.equal(selectCharitySchema.safeParse({ percentage: 12.5 }).success, false);
  assert.equal(selectCharitySchema.safeParse({}).success, false);
  assert.equal(selectCharitySchema.safeParse({ charityId: "not-an-id" }).success, false);
  assert.equal(selectCharitySchema.safeParse({ charityId: "6ab0097b793701884cb68492" }).success, true);
});

test("contribution is calculated in integer minor units, rounding half up", () => {
  assert.equal(calcCharityContribution(1000, 10), 100);
  assert.equal(calcCharityContribution(1999, 10), 200); // 199.9 -> 200
  assert.equal(calcCharityContribution(999, 15), 150); // 149.85 -> 150
  assert.equal(calcCharityContribution(10000, 100), 10000);
  assert.equal(calcCharityContribution(0, 10), 0);
  assert.equal(calcCharityContribution(5, 10), 1); // 0.5 rounds up
});

test("contribution rejects bad input instead of returning nonsense", () => {
  assert.throws(() => calcCharityContribution(10.5, 10), RangeError);
  assert.throws(() => calcCharityContribution(-1, 10), RangeError);
  assert.throws(() => calcCharityContribution(1000, 5), RangeError);
});

test("slugify makes clean URL slugs", () => {
  assert.equal(slugify("Clean Water Collective"), "clean-water-collective");
  assert.equal(slugify("  Cancer Research UK!! "), "cancer-research-uk");
  assert.equal(slugify("Café & Kids"), "cafe-kids");
  assert.equal(slugify("!!!"), "charity"); // fallback
});

test("create needs a name and category; unknown fields are stripped", () => {
  assert.equal(createCharitySchema.safeParse({ name: "Good Cause" }).success, false);
  assert.equal(createCharitySchema.safeParse({ category: "health" }).success, false);
  const r = createCharitySchema.parse({ name: "Good Cause", category: " HEALTH ", slug: "hacked", _id: "x" });
  assert.equal(r.category, "health"); // trimmed + lowercased
  assert.equal(r.slug, undefined);
});

test("partial update does not inject defaults (featured must not silently reset)", () => {
  assert.deepEqual(updateCharitySchema.parse({ name: "New Name" }), { name: "New Name" });
  assert.equal(updateCharitySchema.safeParse({}).success, false);
});

test("images must be https URLs; events need real dates", () => {
  const ok = (extra) => createCharitySchema.safeParse({ name: "Good Cause", category: "health", ...extra }).success;
  assert.equal(ok({ images: ["https://example.com/a.jpg"] }), true);
  assert.equal(ok({ images: ["http://example.com/a.jpg"] }), false);
  assert.equal(ok({ images: ["javascript:alert(1)"] }), false);
  assert.equal(ok({ events: [{ title: "Golf Day", date: "2026-11-05" }] }), true);
  assert.equal(ok({ events: [{ title: "Golf Day", date: "2026-02-30" }] }), false);
  assert.equal(ok({ events: [{ title: "Golf Day", date: "soon" }] }), false);
});

test("list query: defaults, empty strings ignored, limits enforced", () => {
  const d = listQuerySchema.parse({});
  assert.equal(d.page, 1);
  assert.equal(d.limit, 12);
  assert.equal(listQuerySchema.parse({ search: "", category: "" }).search, undefined);
  assert.equal(listQuerySchema.parse({ featured: "true" }).featured, true);
  assert.equal(listQuerySchema.parse({ featured: "false" }).featured, false);
  assert.equal(listQuerySchema.parse({ category: "Health" }).category, "health");
  assert.equal(listQuerySchema.safeParse({ limit: "500" }).success, false);
  assert.equal(listQuerySchema.safeParse({ page: "0" }).success, false);
  assert.equal(listQuerySchema.safeParse({ featured: "maybe" }).success, false);
});
