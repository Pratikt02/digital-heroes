const { z } = require("zod");
const { parseDateOnly } = require("../utils/date");
const { MIN_CHARITY_PERCENT, MAX_CHARITY_PERCENT } = require("../services/charityRules");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const httpsUrl = z.string().trim().url("Must be a valid URL").max(500).refine((u) => u.startsWith("https://"), "Image URLs must use https");

// Event dates may be in the past or future (admins can keep history), but must be real dates.
const eventDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD").transform((s, ctx) => {
  const d = parseDateOnly(s);
  if (!d) {
    ctx.addIssue({ code: "custom", message: "That is not a real calendar date" });
    return z.NEVER;
  }
  return d;
});

const event = z.object({
  title: z.string().trim().min(2).max(100),
  date: eventDate,
  location: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
});

// NOTE: no .default() here. Defaults live on the Mongoose model, otherwise a partial
// update would silently reset fields like `featured` back to false.
const base = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  shortDescription: z.string().trim().max(200),
  description: z.string().trim().max(5000),
  category: z.string().trim().toLowerCase().min(2).max(40),
  images: z.array(httpsUrl).max(8),
  events: z.array(event).max(20),
  featured: z.boolean(),
  active: z.boolean(),
});

const createCharitySchema = base
  .partial() // everything optional...
  .required({ name: true, category: true }); // ...except the two we truly need

const updateCharitySchema = base.partial().refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

// ?search=&category=&featured=&active=&page=&limit=
const emptyToUndefined = (v) => (v === "" ? undefined : v);
const boolFlag = z.preprocess(emptyToUndefined, z.enum(["true", "false"]).transform((v) => v === "true").optional());

const listQuerySchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().max(60).optional()),
  category: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().max(40).optional()),
  featured: boolFlag,
  active: boolFlag, // only honoured on the admin route
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

// PUT /api/users/me/charity
const selectCharitySchema = z
  .object({
    charityId: objectId.optional(),
    percentage: z
      .number({ invalid_type_error: "Percentage must be a number" })
      .int("Percentage must be a whole number")
      .min(MIN_CHARITY_PERCENT, `Minimum contribution is ${MIN_CHARITY_PERCENT}%`)
      .max(MAX_CHARITY_PERCENT, `Maximum is ${MAX_CHARITY_PERCENT}%`)
      .optional(),
  })
  .refine((d) => d.charityId !== undefined || d.percentage !== undefined, { message: "Provide a charity and/or a percentage" });

module.exports = { createCharitySchema, updateCharitySchema, listQuerySchema, selectCharitySchema };
