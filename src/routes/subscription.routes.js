const router = require("express").Router();
const ctrl = require("../controllers/subscription.controller");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { checkoutSchema, verifySchema } = require("../validators/subscription.schemas");

router.get("/plans", ctrl.plans); // public: the pricing section on the homepage

router.use(requireAuth);
router.get("/", ctrl.status);
router.post("/checkout", validate(checkoutSchema), ctrl.checkout);
router.post("/verify", validate(verifySchema), ctrl.verify);
router.post("/sync", ctrl.sync);
router.post("/cancel", ctrl.cancel);

module.exports = router;
