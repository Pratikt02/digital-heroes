const router = require("express").Router();
const ctrl = require("../controllers/winner.controller");
const upload = require("../middleware/upload");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth); // authenticate BEFORE parsing any upload

router.get("/me", ctrl.mine);
router.post("/:id/proof", upload, ctrl.uploadProof);

module.exports = router;
