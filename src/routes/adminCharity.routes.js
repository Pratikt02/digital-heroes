const router = require("express").Router();
const ctrl = require("../controllers/charity.controller");
const validate = require("../middleware/validate");
const validateQuery = require("../middleware/validateQuery");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { createCharitySchema, updateCharitySchema, listQuerySchema } = require("../validators/charity.schemas");

router.use(requireAuth, requireAdmin);

router.get("/", validateQuery(listQuerySchema), ctrl.adminList);
router.post("/", validate(createCharitySchema), ctrl.adminCreate);
router.put("/:id", validate(updateCharitySchema), ctrl.adminUpdate);
router.delete("/:id", ctrl.adminDelete);

module.exports = router;
