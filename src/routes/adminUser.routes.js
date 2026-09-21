const router = require("express").Router();
const ctrl = require("../controllers/adminUser.controller");
const validate = require("../middleware/validate");
const validateQuery = require("../middleware/validateQuery");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { listUsersQuerySchema, updateUserSchema, overrideSubscriptionSchema } = require("../validators/admin.schemas");
const { createScoreSchema, updateScoreSchema } = require("../validators/score.schemas");

router.use(requireAuth, requireAdmin);

router.get("/", validateQuery(listUsersQuerySchema), ctrl.list);
router.get("/:id", ctrl.get);
router.put("/:id", validate(updateUserSchema), ctrl.update);

router.put("/:id/subscription", validate(overrideSubscriptionSchema), ctrl.overrideSubscription);
router.post("/:id/subscription/cancel", ctrl.cancelSubscription);
router.post("/:id/subscription/sync", ctrl.syncSubscription);

router.post("/:id/scores", validate(createScoreSchema), ctrl.addScore);
router.put("/:id/scores/:scoreId", validate(updateScoreSchema), ctrl.updateScore);
router.delete("/:id/scores/:scoreId", ctrl.deleteScore);

module.exports = router;
