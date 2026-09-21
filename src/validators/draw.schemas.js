const { z } = require("zod");
const { MONTH_RE, monthKeyOf } = require("../utils/month");

const month = z.string().regex(MONTH_RE, "Use the format YYYY-MM").refine((m) => m <= monthKeyOf(new Date()), "Cannot create a draw for a future month");
const mode = z.enum(["random", "algorithmic"], { errorMap: () => ({ message: "Mode must be random or algorithmic" }) });
const algorithmBias = z.enum(["frequent", "rare"], { errorMap: () => ({ message: "Bias must be frequent or rare" }) });

const createDrawSchema = z.object({ month: month.optional(), mode: mode.optional(), algorithmBias: algorithmBias.optional() });

const updateDrawSchema = z
  .object({ mode: mode.optional(), algorithmBias: algorithmBias.optional() })
  .refine((d) => d.mode !== undefined || d.algorithmBias !== undefined, { message: "Provide a mode and/or bias to update" });

module.exports = { createDrawSchema, updateDrawSchema };
