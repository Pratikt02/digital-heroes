const { z } = require("zod");
const { parseDateOnly, latestAllowedDate, EARLIEST_ALLOWED_DATE } = require("../utils/date");

const value = z
  .number({ invalid_type_error: "Score must be a number", required_error: "Score is required" })
  .int("Score must be a whole number")
  .min(1, "Score must be between 1 and 45")
  .max(45, "Score must be between 1 and 45");

// Accepts "YYYY-MM-DD" and outputs a Date at UTC midnight.
const date = z
  .string({ required_error: "Date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .transform((str, ctx) => {
    const d = parseDateOnly(str);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "That is not a real calendar date" });
      return z.NEVER;
    }
    if (d > latestAllowedDate()) {
      ctx.addIssue({ code: "custom", message: "Date cannot be in the future" });
      return z.NEVER;
    }
    if (d < EARLIEST_ALLOWED_DATE) {
      ctx.addIssue({ code: "custom", message: "Date is too far in the past" });
      return z.NEVER;
    }
    return d;
  });

const createScoreSchema = z.object({ value, date });

const updateScoreSchema = z
  .object({ value: value.optional(), date: date.optional() })
  .refine((d) => d.value !== undefined || d.date !== undefined, { message: "Provide a score or a date to update" });

module.exports = { createScoreSchema, updateScoreSchema };
