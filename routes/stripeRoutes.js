const router = require("express").Router();
const ctrl   = require("../controllers/stripeController");
const { protect } = require("../middleware/authMiddleware");
router.post("/webhook",  ctrl.webhook);
router.post("/checkout", protect, ctrl.createCheckout);
router.post("/portal",   protect, ctrl.createPortal);
router.get("/status",    protect, ctrl.getStatus);
module.exports = router;
