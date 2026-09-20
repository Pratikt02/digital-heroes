// Usage: node scripts/seed-charities.js
// Adds (or refreshes) sample charities so the directory has content. Safe to run repeatedly.
// All charities here are fictional. Replace or extend them from the admin panel.
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const Charity = require("../src/models/Charity");
const { slugify } = require("../src/services/charityRules");
const { formatDateOnly } = require("../src/utils/date");

const inDays = (n) => new Date(formatDateOnly(new Date(Date.now() + n * 86400000)) + "T00:00:00.000Z");

const data = [
  {
    name: "Clean Water Collective",
    category: "environment",
    featured: true,
    shortDescription: "Bringing safe drinking water to rural communities.",
    description: "We build and maintain community wells and filtration systems, and train local teams to keep them running for decades.",
    events: [{ title: "Charity Golf Day", date: inDays(21), location: "Pune", description: "A friendly 18-hole day; every entry funds a new well." }],
  },
  {
    name: "Bright Futures Education Trust",
    category: "education",
    featured: true,
    shortDescription: "School supplies and scholarships for children in need.",
    description: "Bright Futures funds books, uniforms and scholarships so that no child leaves school for lack of money.",
    events: [{ title: "Scholarship Fundraiser Tournament", date: inDays(45), location: "Mumbai", description: "Team event with a prize draw and dinner." }],
  },
  {
    name: "Second Chance Animal Rescue",
    category: "animals",
    featured: true,
    shortDescription: "Rescue, rehab and rehoming for abandoned animals.",
    description: "A volunteer-run shelter network that rescues, treats and rehomes stray and abandoned animals.",
  },
  {
    name: "Mind Matters Alliance",
    category: "health",
    shortDescription: "Free counselling and mental health awareness.",
    description: "We provide free counselling sessions and train community volunteers to support people in distress.",
  },
  {
    name: "Community Kitchen Network",
    category: "community",
    shortDescription: "Hot meals for families facing hunger.",
    description: "A network of community kitchens serving thousands of nutritious meals every week.",
  },
  {
    name: "Forest Restore Initiative",
    category: "environment",
    shortDescription: "Replanting native forests and protecting wildlife.",
    description: "We plant native trees with local villages, creating green cover, livelihoods and wildlife corridors.",
  },
];

(async () => {
  await connectDB();
  for (const c of data) {
    const slug = slugify(c.name);
    await Charity.findOneAndUpdate({ slug }, { $set: { ...c, slug, active: true } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
    console.log("Seeded:", c.name);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
