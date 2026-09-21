const router = require("express").Router();
const ctrl = require("../controllers/draw.controller");
const validate = require("../middleware/validate");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { createDrawSchema, updateDrawSchema } = require("../validators/draw.schemas");

router.use(requireAuth, requireAdmin);

router.get("/", ctrl.adminList);
router.post("/", validate(createDrawSchema), ctrl.adminCreate);
router.get("/:id", ctrl.adminGet);
router.put("/:id", validate(updateDrawSchema), ctrl.adminUpdate);
router.post("/:id/simulate", ctrl.adminSimulate);
router.post("/:id/publish", ctrl.adminPublish);
router.delete("/:id", ctrl.adminDelete);

module.exports = router;
