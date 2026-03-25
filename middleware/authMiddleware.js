const { verifyAccessToken } = require("../utils/tokenUtils");
const prisma = require("../config/prisma");
const R      = require("../utils/apiResponse");

const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return R.unauthorized(res, "No token provided");
    const decoded = verifyAccessToken(auth.split(" ")[1]);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return R.unauthorized(res, "User not found");
    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return R.unauthorized(res, "Token expired");
    return R.unauthorized(res, "Invalid token");
  }
};

const requirePlan = (...plans) => (req, res, next) => {
  if (!plans.includes(req.user.plan)) return R.forbidden(res, `Requires ${plans.join(" or ")} plan`);
  next();
};

const requireWorkspaceMember = async (req, res, next) => {
  const { workspaceId } = req.params;
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, include: { members: true } });
  if (!ws) return R.notFound(res, "Workspace not found");
  const isMember = ws.ownerId === req.user.id || ws.members.some(m => m.userId === req.user.id);
  if (!isMember) return R.forbidden(res, "Not a member");
  req.workspace = ws;
  next();
};

module.exports = { protect, requirePlan, requireWorkspaceMember };
