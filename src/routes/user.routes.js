const router = require("express").Router();
const ctrl = require("../controllers/charity.controller");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { selectCharitySchema } = require("../validators/charity.schemas");

router.use(requireAuth);

router.get("/me/charity", ctrl.getMine);
router.put("/me/charity", validate(selectCharitySchema), ctrl.setMine);

module.exports = router;
