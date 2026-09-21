const router = require("express").Router();
const ctrl = require("../controllers/draw.controller");
const { requireAuth } = require("../middleware/auth");

// Public: how draws work in practice and what has been won. Order matters (/next and /me before /:month).
router.get("/", ctrl.listPublished);
router.get("/next", ctrl.next);
router.get("/me", requireAuth, ctrl.mine);
router.get("/:month", ctrl.getByMonth);

module.exports = router;
