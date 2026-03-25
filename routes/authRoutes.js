const router = require("express").Router();
const ctrl   = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { body } = require("express-validator");

const emailPass = [body("email").isEmail(), body("password").isLength({ min: 6 })];

router.post("/register", authLimiter, [body("name").notEmpty(), ...emailPass], validate, ctrl.register);
router.post("/login",    authLimiter, emailPass, validate, ctrl.login);
router.post("/refresh",  ctrl.refreshToken);
router.post("/logout",   protect, ctrl.logout);
router.get ("/me",       protect, ctrl.getMe);
router.put ("/profile",  protect, ctrl.updateProfile);
router.post("/forgot-password", authLimiter, [body("email").isEmail()], validate, ctrl.forgotPassword);
router.post("/reset-password/:token", [body("password").isLength({ min: 6 })], validate, ctrl.resetPassword);

module.exports = router;
