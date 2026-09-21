const router = require("express").Router();

router.use("/auth", require("./auth.routes"));
router.use("/scores", require("./score.routes"));
router.use("/charities", require("./charity.routes"));
router.use("/admin/charities", require("./adminCharity.routes"));
router.use("/users", require("./user.routes"));
router.use("/subscription", require("./subscription.routes"));
router.use("/draws", require("./draw.routes"));
router.use("/admin/draws", require("./adminDraw.routes"));
router.use("/cron", require("./cron.routes"));
// Phase 7 mounts here: /winners, /admin/winners, /admin/users, /admin/reports

module.exports = router;
