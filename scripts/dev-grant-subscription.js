// DEV ONLY: give a user an active subscription without paying, so you can test scores/draws.
// Usage: node scripts/dev-grant-subscription.js user@example.com [monthly|yearly]
//        node scripts/dev-grant-subscription.js user@example.com --revoke
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const User = require("../src/models/User");

(async () => {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to run in production.");
    process.exit(1);
  }
  const [email, arg = "monthly"] = process.argv.slice(2);
  if (!email) {
    console.error("Usage: node scripts/dev-grant-subscription.js user@example.com [monthly|yearly|--revoke]");
    process.exit(1);
  }
  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    console.error("No user with that email.");
    process.exit(1);
  }
  if (arg === "--revoke") {
    user.subscription.status = "inactive";
    user.subscription.currentPeriodEnd = null;
  } else {
    const days = arg === "yearly" ? 365 : 30;
    user.subscription.status = "active";
    user.subscription.plan = arg === "yearly" ? "yearly" : "monthly";
    user.subscription.currentPeriodEnd = new Date(Date.now() + days * 86400000);
  }
  await user.save();
  console.log(`${user.email}: ${user.subscription.status} (${user.subscription.plan || "no plan"})`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
