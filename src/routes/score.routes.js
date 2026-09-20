const router = require("express").Router();
const ctrl = require("../controllers/score.controller");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { createScoreSchema, updateScoreSchema } = require("../validators/score.schemas");

router.use(requireAuth);
// PHASE 5: add requireSubscription here so only active subscribers can enter scores:
//   router.use(requireAuth, requireSubscription);

router.get("/", ctrl.list);
router.post("/", validate(createScoreSchema), ctrl.create);
router.put("/:id", validate(updateScoreSchema), ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
