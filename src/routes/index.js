const router = require("express").Router();

router.use("/auth", require("./auth.routes"));
router.use("/scores", require("./score.routes"));
// Later phases mount here: /charities, /subscription, /draws, /winners, /admin

module.exports = router;
