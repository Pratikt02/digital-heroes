const { z } = require("zod");

const email = z.string().trim().toLowerCase().email("Enter a valid email").max(254);

// bcrypt only uses the first 72 bytes, so cap the length there.
const password = z.string().min(8, "Password must be at least 8 characters").max(72);

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  email,
  password,
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(72),
});

module.exports = { signupSchema, loginSchema };
