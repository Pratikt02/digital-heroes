const { z } = require("zod");
const { MIN_CHARITY_PERCENT, MAX_CHARITY_PERCENT } = require("../services/charityRules");

const emptyToUndefined = (v) => (v === "" ? undefined : v);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const STATUSES = ["inactive", "active", "past_due", "canceled", "lapsed"];

const listUsersQuerySchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().max(60).optional()),
  role: z.preprocess(emptyToUndefined, z.enum(["subscriber", "admin"]).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(STATUSES).optional()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Admins can edit profile details, role and charity choice. Never the password.
const updateUserSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(60),
    email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
    role: z.enum(["subscriber", "admin"]),
    charityId: objectId.nullable(),
    charityPercentage: z.number().int().min(MIN_CHARITY_PERCENT, `Minimum contribution is ${MIN_CHARITY_PERCENT}%`).max(MAX_CHARITY_PERCENT, `Maximum is ${MAX_CHARITY_PERCENT}%`),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

// Manual override for support cases (for example a refund or a payment made outside the app).
// Provider webhooks can overwrite it later, which is why the normal path is cancel/sync.
const overrideSubscriptionSchema = z
  .object({
    status: z.enum(STATUSES),
    plan: z.enum(["monthly", "yearly"]).nullable().optional(),
    currentPeriodEnd: z.string().datetime({ message: "Use an ISO date such as 2026-12-31T00:00:00Z" }).nullable().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.status === "active") {
      if (!d.plan) ctx.addIssue({ code: "custom", path: ["plan"], message: "An active subscription needs a plan" });
      if (!d.currentPeriodEnd) ctx.addIssue({ code: "custom", path: ["currentPeriodEnd"], message: "An active subscription needs an end date" });
      else if (new Date(d.currentPeriodEnd) <= new Date()) ctx.addIssue({ code: "custom", path: ["currentPeriodEnd"], message: "The end date must be in the future" });
    }
  });

module.exports = { listUsersQuerySchema, updateUserSchema, overrideSubscriptionSchema };
