const router = require("express").Router();
const ctrl = require("../controllers/adminUser.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.use(requireAuth, requireAdmin);

router.get("/overview", ctrl.overview);
router.get("/charities", ctrl.charities);
router.get("/revenue", ctrl.revenue);

module.exports = router;
