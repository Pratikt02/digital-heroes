const { z } = require("zod");

const emptyToUndefined = (v) => (v === "" ? undefined : v);

const rejectSchema = z.object({ reason: z.string({ required_error: "A reason is required" }).trim().min(3, "Give the player a short reason").max(300) });

const listWinnersQuerySchema = z.object({
  verification: z.preprocess(emptyToUndefined, z.enum(["awaiting_proof", "pending_review", "approved", "rejected"]).optional()),
  payment: z.preprocess(emptyToUndefined, z.enum(["pending", "paid"]).optional()),
  month: z.preprocess(emptyToUndefined, z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM").optional()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { rejectSchema, listWinnersQuerySchema };
