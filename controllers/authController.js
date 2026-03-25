const crypto  = require("crypto");
const bcrypt  = require("bcryptjs");
const prisma  = require("../config/prisma");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../utils/tokenUtils");
const { sendWelcome, sendPasswordReset } = require("../utils/emailService");
const R       = require("../utils/apiResponse");
const logger  = require("../utils/logger");

const sanitize = (u) => {
  const { password, refreshToken, passwordResetToken, stripeCustomerId, stripeSubscriptionId, ...safe } = u;
  return safe;
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return R.conflict(res, "Email already in use");

    const hashed = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
    const user   = await prisma.user.create({ data: { name, email, password: hashed } });

    // Personal workspace
    await prisma.workspace.create({
      data: {
        name: `${name}'s Workspace`, ownerId: user.id, isPersonal: true,
        members: { create: { userId: user.id, role: "owner" } },
      },
    });

    const accessToken  = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    sendWelcome(user).catch(() => {});
    logger.info(`New user: ${email}`);
    return R.created(res, { accessToken, refreshToken, user: sanitize(user) }, "Account created");
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) return R.unauthorized(res, "Invalid email or password");

    const accessToken  = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken, lastActiveAt: new Date() } });

    logger.info(`Login: ${email}`);
    return R.success(res, { accessToken, refreshToken, user: sanitize(user) }, 200, "Login successful");
  } catch (err) { next(err); }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return R.unauthorized(res, "Refresh token required");
    const decoded = verifyRefreshToken(refreshToken);
    const user    = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.refreshToken !== refreshToken) return R.unauthorized(res, "Invalid refresh token");

    const newAccess  = generateAccessToken(user.id);
    const newRefresh = generateRefreshToken(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefresh } });
    return R.success(res, { accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) {
    if (err.name === "TokenExpiredError") return R.unauthorized(res, "Refresh token expired. Please log in again.");
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.user.id }, data: { refreshToken: null } });
    return R.success(res, {}, 200, "Logged out");
  } catch (err) { next(err); }
};

exports.getMe = async (req, res) => R.success(res, { user: sanitize(req.user) });

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, timezone, theme } = req.body;
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { name, timezone, theme } });
    return R.success(res, { user: sanitize(user) });
  } catch (err) { next(err); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user) return R.success(res, {}, 200, "If that email exists, a reset link was sent");
    const token  = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    await prisma.user.update({ where: { id: user.id }, data: { passwordResetToken: hashed, passwordResetExpires: new Date(Date.now() + 3600000) } });
    await sendPasswordReset(user, `${process.env.FRONTEND_URL}/reset-password?token=${token}`);
    return R.success(res, {}, 200, "Reset link sent");
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user   = await prisma.user.findFirst({ where: { passwordResetToken: hashed, passwordResetExpires: { gt: new Date() } } });
    if (!user) return R.badRequest(res, "Token is invalid or expired");
    const newHash = await bcrypt.hash(req.body.password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: newHash, passwordResetToken: null, passwordResetExpires: null, refreshToken: null } });
    return R.success(res, {}, 200, "Password reset successful");
  } catch (err) { next(err); }
};
