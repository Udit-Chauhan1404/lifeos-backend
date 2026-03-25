const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
router.use(protect);
router.get("/dashboard", require("../controllers/analyticsController").getDashboard);
module.exports = router;
