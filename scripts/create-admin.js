// Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=StrongPass123 npm run create-admin
// Creates the admin account, or promotes it if the email already exists.
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const User = require("../src/models/User");

(async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ chars).");
    process.exit(1);
  }
  await connectDB();
  const email = ADMIN_EMAIL.toLowerCase().trim();
  const passwordHash = await User.hashPassword(ADMIN_PASSWORD);
  await User.findOneAndUpdate(
    { email },
    { $set: { role: "admin", passwordHash }, $setOnInsert: { name: "Admin", email } },
    { upsert: true, new: true }
  );
  console.log(`Admin ready: ${email}`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
