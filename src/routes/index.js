const router = require("express").Router();

router.use("/auth", require("./auth.routes"));
// Later phases mount here: /scores, /charities, /subscription, /draws, /winners, /admin

module.exports = router;
