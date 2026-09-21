const router = require("express").Router();
const ctrl = require("../controllers/winner.controller");
const validate = require("../middleware/validate");
const validateQuery = require("../middleware/validateQuery");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { rejectSchema, listWinnersQuerySchema } = require("../validators/winner.schemas");

router.use(requireAuth, requireAdmin);

router.get("/", validateQuery(listWinnersQuerySchema), ctrl.adminList);
router.get("/:id", ctrl.adminGet);
router.post("/:id/approve", ctrl.adminApprove);
router.post("/:id/reject", validate(rejectSchema), ctrl.adminReject);
router.post("/:id/mark-paid", ctrl.adminMarkPaid);

module.exports = router;
