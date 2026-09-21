// Usage: node scripts/seed-demo.js [count]      (default 60 demo subscribers)
// Creates demo subscribers so the draw engine has something realistic to run on:
//   demo1@example.com ... demoN@example.com, all with password  DemoPass123
// Each has an active subscription, 5 scores, a chosen charity and a payment this month
// (about 1 in 5 on the yearly plan). Safe to re-run: it replaces its own previous demo data.
// Scores are deliberately bunched between 22 and 40 (typical Stableford range) so a demo draw
// produces some 3 and 4-number winners. Real data will naturally have fewer.
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const User = require("../src/models/User");
const Score = require("../src/models/Score");
const Payment = require("../src/models/Payment");
const Charity = require("../src/models/Charity");
const { splitPayment } = require("../src/services/moneyRules");
const { PLANS } = require("../src/config/plans");
const { monthKeyOf } = require("../src/utils/month");

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

(async () => {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to run in production.");
    process.exit(1);
  }
  const count = Math.min(Math.max(parseInt(process.argv[2], 10) || 60, 1), 500);
  await connectDB();

  // Remove earlier demo data (and only demo data).
  const old = await User.find({ email: /^demo\d+@example\.com$/ }).select("_id");
  const oldIds = old.map((u) => u._id);
  await Promise.all([Score.deleteMany({ user: { $in: oldIds } }), Payment.deleteMany({ user: { $in: oldIds } }), User.deleteMany({ _id: { $in: oldIds } })]);

  const charities = await Charity.find({ active: true }).select("_id");
  if (!charities.length) console.warn("No charities found. Run: node scripts/seed-charities.js first (users are created without a charity).");

  const passwordHash = await User.hashPassword("DemoPass123");
  const month = monthKeyOf(new Date());
  const now = new Date();

  for (let i = 1; i <= count; i++) {
    const yearly = i % 5 === 0;
    const plan = yearly ? "yearly" : "monthly";
    const pct = rand(10, 30);
    const user = await User.create({
      name: `Demo Player ${i}`,
      email: `demo${i}@example.com`,
      passwordHash,
      charityId: charities.length ? charities[rand(0, charities.length - 1)]._id : null,
      charityPercentage: pct,
      subscription: { status: "active", plan, currentPeriodEnd: new Date(Date.now() + (yearly ? 365 : 30) * 86400000), providerSubscriptionId: `demo_sub_${i}` },
    });

    // 5 scores on 5 different recent dates
    const values = Array.from({ length: 5 }, () => rand(22, 40));
    for (let d = 0; d < 5; d++) await Score.create({ user: user._id, value: values[d], date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - d * 3)) });

    const amount = PLANS[plan].amountMinor;
    const split = splitPayment(amount, pct);
    await Payment.create({
      user: user._id,
      providerPaymentId: `demo_pay_${i}_${month}`,
      providerSubscriptionId: `demo_sub_${i}`,
      plan,
      amount,
      coversMonths: PLANS[plan].months,
      charityId: user.charityId,
      charityPercentage: pct,
      charityAmount: split.charity,
      prizePoolAmount: split.prizePool,
      platformAmount: split.platform,
      paidAt: now,
    });
  }
  console.log(`Created ${count} demo subscribers (demo1@example.com ... demo${count}@example.com, password DemoPass123) with payments for ${month}.`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
