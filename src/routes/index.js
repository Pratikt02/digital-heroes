const router = require("express").Router();

router.use("/auth", require("./auth.routes"));
router.use("/scores", require("./score.routes"));
router.use("/charities", require("./charity.routes"));
router.use("/admin/charities", require("./adminCharity.routes"));
router.use("/users", require("./user.routes"));
router.use("/subscription", require("./subscription.routes"));
// Later phases mount here: /draws, /winners, more /admin/*

module.exports = router;
