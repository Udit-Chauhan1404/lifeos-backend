const prisma    = require("../config/prisma");
const aiService = require("../services/aiService");
const R         = require("../utils/apiResponse");

const DAILY_LIMITS = { free: 10, pro: 50, team: 200 };

const checkQuota = async (user) => {
  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const resetDay= new Date(user.aiResetDate); resetDay.setHours(0, 0, 0, 0);
  let   count   = user.aiRequestsToday;
  if (today > resetDay) count = 0;
  if (count >= (DAILY_LIMITS[user.plan] || 10)) return false;
  await prisma.user.update({ where: { id: user.id }, data: { aiRequestsToday: count + 1, aiResetDate: today } });
  return true;
};

const loadContext = async (userId) => {
  const [tasks, habits, goals] = await Promise.all([
    prisma.task.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.habit.findMany({ where: { userId, isActive: true } }),
    prisma.goal.findMany({ where: { userId } }),
  ]);
  return { tasks, habits, goals };
};

exports.getAdvice = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!await checkQuota(user)) return R.error(res, "Daily AI limit reached. Upgrade for more.", 429);
    const { tasks, habits, goals } = await loadContext(req.user.id);
    const text = await aiService.getAdvice(req.user.id, tasks, habits, goals);
    return R.success(res, { text });
  } catch (err) { next(err); }
};

exports.getDailyPlan = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!await checkQuota(user)) return R.error(res, "Daily AI limit reached.", 429);
    const { tasks, habits } = await loadContext(req.user.id);
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const events   = await prisma.event.findMany({ where: { userId: req.user.id, date: { gte: today.toISOString().split("T")[0] } } });
    const text = await aiService.getDailyPlan(req.user.id, tasks, habits, events);
    return R.success(res, { text });
  } catch (err) { next(err); }
};

exports.prioritizeTasks = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!await checkQuota(user)) return R.error(res, "Daily AI limit reached.", 429);
    const tasks = await prisma.task.findMany({ where: { userId: req.user.id, status: { not: "done" } }, take: 15 });
    const raw   = await aiService.prioritizeTasks(req.user.id, tasks);
    let parsed;
    try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { parsed = []; }
    return R.success(res, { prioritized: parsed });
  } catch (err) { next(err); }
};

exports.getWeeklyReport = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!await checkQuota(user)) return R.error(res, "Daily AI limit reached.", 429);
    const { tasks, habits, goals } = await loadContext(req.user.id);
    const text = await aiService.getWeeklyReport(req.user.id, tasks, habits, goals);
    return R.success(res, { text });
  } catch (err) { next(err); }
};

exports.chat = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!await checkQuota(user)) return R.error(res, "Daily AI limit reached.", 429);
    const { message, history = [] } = req.body;
    if (!message?.trim()) return R.badRequest(res, "Message is required");
    const text = await aiService.chat(req.user.id, message, history);
    return R.success(res, { text });
  } catch (err) { next(err); }
};
