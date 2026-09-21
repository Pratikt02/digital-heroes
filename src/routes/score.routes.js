const router = require("express").Router();
const ctrl = require("../controllers/score.controller");
const validate = require("../middleware/validate");
const { requireAuth, requireSubscription } = require("../middleware/auth");
const { createScoreSchema, updateScoreSchema } = require("../validators/score.schemas");

// PRD: non-subscribers get restricted access, so only active subscribers can use scores.
router.use(requireAuth, requireSubscription);

router.get("/", ctrl.list);
router.post("/", validate(createScoreSchema), ctrl.create);
router.put("/:id", validate(updateScoreSchema), ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
