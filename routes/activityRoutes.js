const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
router.use(protect);
router.get("/", require("../controllers/activityController").getFeed);
module.exports = router;
