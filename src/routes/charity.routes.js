const router = require("express").Router();
const ctrl = require("../controllers/charity.controller");
const validateQuery = require("../middleware/validateQuery");
const { listQuerySchema } = require("../validators/charity.schemas");

// Public: no login needed. Order matters: /featured and /categories must come before /:idOrSlug.
router.get("/", validateQuery(listQuerySchema), ctrl.list);
router.get("/featured", ctrl.featured);
router.get("/categories", ctrl.categories);
router.get("/:idOrSlug", ctrl.detail);

module.exports = router;
