const router = require("express").Router();
const ctrl   = require("../controllers/eventController");
const { protect } = require("../middleware/authMiddleware");
router.use(protect);
router.get("/",     ctrl.getEvents);
router.post("/",    ctrl.createEvent);
router.put("/:id",  ctrl.updateEvent);
router.delete("/:id", ctrl.deleteEvent);
module.exports = router;
