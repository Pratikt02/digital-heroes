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
router.use("/winners", require("./winner.routes"));
router.use("/admin/winners", require("./adminWinner.routes"));
router.use("/admin/users", require("./adminUser.routes"));
router.use("/admin/reports", require("./adminReport.routes"));

module.exports = router;
