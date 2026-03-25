const prisma = require("../config/prisma");
const R      = require("../utils/apiResponse");

exports.getEvents = async (req, res, next) => {
  try {
    const { from, to, workspaceId } = req.query;
    const where = { userId: req.user.id };
    if (workspaceId) where.workspaceId = workspaceId;
    const events = await prisma.event.findMany({ where, orderBy: { date: "asc" } });
    return R.success(res, { events });
  } catch (err) { next(err); }
};
exports.createEvent = async (req, res, next) => {
  try {
    const event = await prisma.event.create({ data: { ...req.body, userId: req.user.id } });
    return R.created(res, { event });
  } catch (err) { next(err); }
};
exports.updateEvent = async (req, res, next) => {
  try {
    const existing = await prisma.event.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return R.notFound(res, "Event not found");
    const event = await prisma.event.update({ where: { id: req.params.id }, data: req.body });
    return R.success(res, { event });
  } catch (err) { next(err); }
};
exports.deleteEvent = async (req, res, next) => {
  try {
    const existing = await prisma.event.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return R.notFound(res, "Event not found");
    await prisma.event.delete({ where: { id: req.params.id } });
    return R.success(res, {}, 200, "Event deleted");
  } catch (err) { next(err); }
};
