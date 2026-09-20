const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const ctrl = require("../controllers/auth.controller");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { signupSchema, loginSchema } = require("../validators/auth.schemas");

// Slows brute-force attempts on credential endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, try again later" },
});

router.post("/signup", authLimiter, validate(signupSchema), ctrl.signup);
router.post("/login", authLimiter, validate(loginSchema), ctrl.login);
router.post("/logout", ctrl.logout);
router.get("/me", requireAuth, ctrl.me);

module.exports = router;
