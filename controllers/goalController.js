const prisma = require("../config/prisma");
const R      = require("../utils/apiResponse");
const { cacheDel } = require("../utils/cacheUtils");
const { createActivity } = require("../services/notificationService");

const inv = (uid) => cacheDel(`dashboard:${uid}`);

exports.getGoals = async (req, res, next) => {
  try {
    const goals = await prisma.goal.findMany({ where: { userId: req.user.id }, include: { milestones: { orderBy: { order: "asc" } } }, orderBy: { createdAt: "desc" } });
    return R.success(res, { goals });
  } catch (err) { next(err); }
};

exports.createGoal = async (req, res, next) => {
  try {
    const { title, icon, color, target, milestones = [] } = req.body;
    const goal = await prisma.goal.create({
      data: { title, icon, color, target, userId: req.user.id, milestones: { create: milestones.map((m, i) => ({ title: m, order: i })) } },
      include: { milestones: true },
    });
    await inv(req.user.id);
    return R.created(res, { goal });
  } catch (err) { next(err); }
};

exports.updateGoal = async (req, res, next) => {
  try {
    const existing = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return R.notFound(res, "Goal not found");
    const { milestones, ...data } = req.body;
    if (data.progress === 100) { data.isCompleted = true; await createActivity(req.user.id, req.user.id, "completed goal", "goal", existing.id, existing.title); }
    const goal = await prisma.goal.update({ where: { id: req.params.id }, data, include: { milestones: { orderBy: { order: "asc" } } } });
    await inv(req.user.id);
    return R.success(res, { goal });
  } catch (err) { next(err); }
};

exports.deleteGoal = async (req, res, next) => {
  try {
    const existing = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return R.notFound(res, "Goal not found");
    await prisma.goal.delete({ where: { id: req.params.id } });
    await inv(req.user.id);
    return R.success(res, {});
  } catch (err) { next(err); }
};

exports.toggleMilestone = async (req, res, next) => {
  try {
    const milestone = await prisma.goalMilestone.findUnique({ where: { id: req.params.milestoneId } });
    if (!milestone) return R.notFound(res, "Milestone not found");
    await prisma.goalMilestone.update({ where: { id: req.params.milestoneId }, data: { completed: !milestone.completed, completedAt: !milestone.completed ? new Date() : null } });
    const goal = await prisma.goal.findUnique({ where: { id: req.params.id }, include: { milestones: { orderBy: { order: "asc" } } } });
    return R.success(res, { goal });
  } catch (err) { next(err); }
};
