const mongoose = require("mongoose");
const { formatDateOnly } = require("../utils/date");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    date: { type: Date, required: true }, // UTC midnight, like scores
    location: { type: String, trim: true, maxlength: 100, default: "" },
    description: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { _id: false }
);

const charitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true }, // stable, used in public URLs
    shortDescription: { type: String, trim: true, maxlength: 200, default: "" },
    description: { type: String, trim: true, maxlength: 5000, default: "" },
    category: { type: String, required: true, trim: true, lowercase: true, maxlength: 40 },
    images: { type: [String], default: [] }, // first image is the cover
    events: { type: [eventSchema], default: [] }, // upcoming events such as golf days
    featured: { type: Boolean, default: false }, // homepage spotlight
    active: { type: Boolean, default: true }, // false hides it from the public but keeps history
  },
  { timestamps: true }
);

charitySchema.index({ active: 1, featured: -1, name: 1 });
charitySchema.index({ category: 1 });

const sortedEvents = (events) => [...events].sort((a, b) => a.date - b.date);
const mapEvent = (e) => ({ title: e.title, date: formatDateOnly(e.date), location: e.location, description: e.description });

// Compact shape for directory cards and the homepage spotlight.
charitySchema.methods.toListItem = function () {
  return {
    id: this._id,
    slug: this.slug,
    name: this.name,
    shortDescription: this.shortDescription,
    category: this.category,
    imageUrl: this.images[0] || null,
    featured: this.featured,
  };
};

// Public profile page: only UPCOMING events (today or later).
charitySchema.methods.toDetail = function () {
  const today = new Date(new Date().toISOString().slice(0, 10)); // UTC midnight today
  return {
    ...this.toListItem(),
    description: this.description,
    images: this.images,
    events: sortedEvents(this.events).filter((e) => e.date >= today).map(mapEvent),
  };
};

// Admin view: everything, including inactive state and past events.
charitySchema.methods.toAdmin = function () {
  return {
    ...this.toListItem(),
    description: this.description,
    images: this.images,
    events: sortedEvents(this.events).map(mapEvent),
    active: this.active,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.models.Charity || mongoose.model("Charity", charitySchema);
