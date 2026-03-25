const crypto = require("crypto");
const prisma  = require("../config/prisma");
const R       = require("../utils/apiResponse");

exports.getWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: { OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    return R.success(res, { workspaces });
  } catch (err) { next(err); }
};

exports.createWorkspace = async (req, res, next) => {
  try {
    const ws = await prisma.workspace.create({
      data: { ...req.body, ownerId: req.user.id, members: { create: { userId: req.user.id, role: "owner" } } },
    });
    return R.created(res, { workspace: ws });
  } catch (err) { next(err); }
};

exports.updateWorkspace = async (req, res, next) => {
  try {
    const ws = await prisma.workspace.findFirst({ where: { id: req.params.id, ownerId: req.user.id } });
    if (!ws) return R.notFound(res, "Workspace not found");
    const updated = await prisma.workspace.update({ where: { id: req.params.id }, data: req.body });
    return R.success(res, { workspace: updated });
  } catch (err) { next(err); }
};

exports.deleteWorkspace = async (req, res, next) => {
  try {
    const ws = await prisma.workspace.findFirst({ where: { id: req.params.id, ownerId: req.user.id } });
    if (!ws) return R.notFound(res);
    if (ws.isPersonal) return R.forbidden(res, "Cannot delete personal workspace");
    await prisma.workspace.delete({ where: { id: req.params.id } });
    return R.success(res, {}, 200, "Workspace deleted");
  } catch (err) { next(err); }
};

exports.generateInvite = async (req, res, next) => {
  try {
    const code = crypto.randomBytes(16).toString("hex");
    const ws   = await prisma.workspace.update({ where: { id: req.params.id }, data: { inviteCode: code } });
    return R.success(res, { inviteCode: code, inviteUrl: `${process.env.FRONTEND_URL}/join/${code}` });
  } catch (err) { next(err); }
};

exports.joinByCode = async (req, res, next) => {
  try {
    const ws = await prisma.workspace.findUnique({ where: { inviteCode: req.params.code }, include: { members: true } });
    if (!ws) return R.notFound(res, "Invalid invite code");
    if (ws.members.some(m => m.userId === req.user.id)) return R.conflict(res, "Already a member");
    await prisma.workspaceMember.create({ data: { workspaceId: ws.id, userId: req.user.id, role: "member" } });
    return R.success(res, { workspace: ws });
  } catch (err) { next(err); }
};

exports.removeMember = async (req, res, next) => {
  try {
    const ws = await prisma.workspace.findFirst({ where: { id: req.params.id, ownerId: req.user.id } });
    if (!ws) return R.notFound(res);
    await prisma.workspaceMember.deleteMany({ where: { workspaceId: req.params.id, userId: req.params.userId } });
    return R.success(res, {}, 200, "Member removed");
  } catch (err) { next(err); }
};
