const router = require("express").Router();
const ctrl = require("../controllers/draw.controller");

// Protected by CRON_SECRET inside the controller, not by a login.
router.get("/monthly-draw", ctrl.cronMonthly);

module.exports = router;
