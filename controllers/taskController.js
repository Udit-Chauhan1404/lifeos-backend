const prisma = require("../config/prisma");
const R      = require("../utils/apiResponse");
const { cacheDel } = require("../utils/cacheUtils");
const { createActivity } = require("../services/notificationService");

const inv = (uid) => cacheDel(`dashboard:${uid}`);

exports.getTasks = async (req, res, next) => {
  try {
    const { status, priority, cat, workspaceId } = req.query;
    const where = { userId: req.user.id, ...(status && { status }), ...(priority && { priority }), ...(cat && { cat }), ...(workspaceId && { workspaceId }) };
    const tasks = await prisma.task.findMany({ where, orderBy: { createdAt: "desc" } });
    return R.success(res, { tasks, count: tasks.length });
  } catch (err) { next(err); }
};

exports.createTask = async (req, res, next) => {
  try {
    const task = await prisma.task.create({ data: { ...req.body, userId: req.user.id } });
    await inv(req.user.id);
    await createActivity(req.user.id, req.user.id, "created task", "task", task.id, task.title);
    return R.created(res, { task });
  } catch (err) { next(err); }
};

exports.updateTask = async (req, res, next) => {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return R.notFound(res, "Task not found");
    const data = { ...req.body };
    if (req.body.status === "done" && existing.status !== "done") data.completedAt = new Date();
    const task = await prisma.task.update({ where: { id: req.params.id }, data });
    await inv(req.user.id);
    if (req.body.status === "done") await createActivity(req.user.id, req.user.id, "completed task", "task", task.id, task.title);
    return R.success(res, { task });
  } catch (err) { next(err); }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return R.notFound(res, "Task not found");
    await prisma.task.delete({ where: { id: req.params.id } });
    await inv(req.user.id);
    return R.success(res, {}, 200, "Task deleted");
  } catch (err) { next(err); }
};

exports.bulkUpdate = async (req, res, next) => {
  try {
    const { ids, update } = req.body;
    await prisma.task.updateMany({ where: { id: { in: ids }, userId: req.user.id }, data: update });
    await inv(req.user.id);
    return R.success(res, {}, 200, `${ids.length} tasks updated`);
  } catch (err) { next(err); }
};
