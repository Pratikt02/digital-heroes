// Run with: npm test
process.env.MONGODB_URI ||= "mongodb://127.0.0.1:1/x";
process.env.JWT_SECRET ||= "0123456789abcdef0123456789abcdef0123";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const R = require("../src/services/winnerRules");
const { signParams } = require("../src/services/cloudinary");
const { rejectSchema, listWinnersQuerySchema } = require("../src/validators/winner.schemas");
const { listUsersQuerySchema, updateUserSchema, overrideSubscriptionSchema } = require("../src/validators/admin.schemas");

const w = (verificationStatus, paymentStatus = "pending") => ({ verificationStatus, paymentStatus });

// ---------- state machine ----------
test("proof upload is allowed until approval, and never after payment", () => {
  assert.equal(R.checkUploadProof(w("awaiting_proof")), null);
  assert.equal(R.checkUploadProof(w("pending_review")), null); // replace a wrong screenshot
  assert.equal(R.checkUploadProof(w("rejected")), null); // resubmit after rejection
  assert.match(R.checkUploadProof(w("approved")), /approved/);
  assert.match(R.checkUploadProof(w("approved", "paid")), /paid/);
});

test("approve and reject only work on proof that is waiting for review", () => {
  assert.equal(R.checkApprove(w("pending_review")), null);
  assert.equal(R.checkReject(w("pending_review")), null);
  for (const s of ["awaiting_proof", "approved", "rejected"]) {
    assert.ok(R.checkApprove(w(s)), `approve from ${s}`);
    assert.ok(R.checkReject(w(s)), `reject from ${s}`);
  }
  assert.match(R.checkApprove(w("awaiting_proof")), /no proof/);
});

test("payment can only be marked once, and only after approval", () => {
  assert.equal(R.checkMarkPaid(w("approved")), null);
  assert.match(R.checkMarkPaid(w("pending_review")), /Approve/);
  assert.match(R.checkMarkPaid(w("awaiting_proof")), /Approve/);
  assert.match(R.checkMarkPaid(w("rejected")), /Approve/);
  assert.match(R.checkMarkPaid(w("approved", "paid")), /Already/);
});

// ---------- real image detection ----------
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20)]);
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 2, 3, 4]), Buffer.from("WEBP"), Buffer.alloc(10)]);

test("sniffImageType trusts bytes, not names: accepts JPEG/PNG/WebP only", () => {
  assert.equal(R.sniffImageType(png), "image/png");
  assert.equal(R.sniffImageType(jpg), "image/jpeg");
  assert.equal(R.sniffImageType(webp), "image/webp");
  assert.equal(R.sniffImageType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>")), null);
  assert.equal(R.sniffImageType(Buffer.from("%PDF-1.7 fake pdf content")), null);
  assert.equal(R.sniffImageType(Buffer.from("GIF89a" + "x".repeat(20))), null);
  assert.equal(R.sniffImageType(Buffer.from("MZ" + "x".repeat(30))), null); // an .exe renamed to .png
  assert.equal(R.sniffImageType(Buffer.alloc(5)), null); // too short
  assert.equal(R.sniffImageType(null), null);
  assert.equal(R.sniffImageType("not a buffer"), null);
  assert.equal(R.sniffImageType(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVE"), Buffer.alloc(10)])), null); // RIFF but not WebP
});

// ---------- Cloudinary signing ----------
test("Cloudinary signature reproduces the worked example in Cloudinary's docs", () => {
  const sig = signParams({ timestamp: 1315060510, public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop" }, "abcd");
  assert.equal(sig, "bfd09f95f331f558cbd1320e67aa8d488770583e");
});

test("Cloudinary signing sorts parameters, ignores empty ones, and depends on the secret", () => {
  const a = signParams({ folder: "f", timestamp: 1 }, "s1");
  assert.equal(signParams({ timestamp: 1, folder: "f" }, "s1"), a); // order-independent
  assert.equal(signParams({ timestamp: 1, folder: "f", extra: "" }, "s1"), a); // empty values are skipped
  assert.notEqual(signParams({ folder: "f", timestamp: 1 }, "s2"), a);
  assert.notEqual(signParams({ folder: "g", timestamp: 1 }, "s1"), a);
  assert.match(a, /^[0-9a-f]{40}$/);
});

// ---------- schemas ----------
test("rejection needs a real reason", () => {
  assert.equal(rejectSchema.safeParse({ reason: "Screenshot is blurry" }).success, true);
  assert.equal(rejectSchema.safeParse({ reason: "  ok " }).success, false);
  assert.equal(rejectSchema.safeParse({ reason: "x".repeat(301) }).success, false);
  assert.equal(rejectSchema.safeParse({}).success, false);
});

test("winner list filters: known values only, sane paging", () => {
  assert.equal(listWinnersQuerySchema.safeParse({ verification: "pending_review", payment: "pending", month: "2026-09" }).success, true);
  assert.equal(listWinnersQuerySchema.safeParse({ verification: "maybe" }).success, false);
  assert.equal(listWinnersQuerySchema.safeParse({ month: "2026-9" }).success, false);
  assert.equal(listWinnersQuerySchema.safeParse({ limit: "1000" }).success, false);
  assert.equal(listWinnersQuerySchema.parse({}).limit, 20);
  assert.equal(listWinnersQuerySchema.parse({ verification: "" }).verification, undefined);
});

test("admin user updates: partial, validated, and no password/subscription smuggling", () => {
  assert.equal(updateUserSchema.safeParse({}).success, false);
  assert.deepEqual(updateUserSchema.parse({ name: " Sam Lee " }), { name: "Sam Lee" });
  assert.equal(updateUserSchema.parse({ email: "SAM@Test.COM" }).email, "sam@test.com");
  assert.equal(updateUserSchema.safeParse({ role: "superuser" }).success, false);
  assert.equal(updateUserSchema.safeParse({ charityPercentage: 9 }).success, false);
  assert.equal(updateUserSchema.safeParse({ charityPercentage: 51 }).success, false);
  assert.equal(updateUserSchema.safeParse({ charityId: null }).success, true); // clearing the charity is allowed
  assert.equal(updateUserSchema.safeParse({ charityId: "nope" }).success, false);
  const r = updateUserSchema.parse({ name: "Sam", passwordHash: "x", subscription: { status: "active" } });
  assert.equal(r.passwordHash, undefined);
  assert.equal(r.subscription, undefined);
});

test("manual subscription override: an active status needs a plan and a future end date", () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  assert.equal(overrideSubscriptionSchema.safeParse({ status: "active", plan: "monthly", currentPeriodEnd: future }).success, true);
  assert.equal(overrideSubscriptionSchema.safeParse({ status: "active", plan: "monthly" }).success, false);
  assert.equal(overrideSubscriptionSchema.safeParse({ status: "active", currentPeriodEnd: future }).success, false);
  assert.equal(overrideSubscriptionSchema.safeParse({ status: "active", plan: "yearly", currentPeriodEnd: past }).success, false);
  assert.equal(overrideSubscriptionSchema.safeParse({ status: "lapsed" }).success, true);
  assert.equal(overrideSubscriptionSchema.safeParse({ status: "inactive", plan: null, currentPeriodEnd: null }).success, true);
  assert.equal(overrideSubscriptionSchema.safeParse({ status: "vip" }).success, false);
  assert.equal(overrideSubscriptionSchema.safeParse({ status: "active", plan: "weekly", currentPeriodEnd: future }).success, false);
});

test("user list filters", () => {
  assert.equal(listUsersQuerySchema.safeParse({ role: "admin", status: "active", search: "sam" }).success, true);
  assert.equal(listUsersQuerySchema.safeParse({ role: "root" }).success, false);
  assert.equal(listUsersQuerySchema.safeParse({ status: "vip" }).success, false);
  assert.equal(listUsersQuerySchema.parse({ search: "" }).search, undefined);
});
