const prisma = require("../config/prisma");
const R      = require("../utils/apiResponse");
const { cacheGet, cacheSet } = require("../utils/cacheUtils");

const calcScore = ({ taskRate, habitRate, goalAvg }) =>
  Math.min(100, Math.round(taskRate * 40 + habitRate * 35 + (goalAvg / 100) * 25));

exports.getDashboard = async (req, res, next) => {
  try {
    const cacheKey = `dashboard:${req.user.id}`;
    const cached   = await cacheGet(cacheKey);
    if (cached) return R.success(res, cached);

    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    const [tasks, habits, goals] = await Promise.all([
      prisma.task.findMany({ where: { userId: req.user.id } }),
      prisma.habit.findMany({ where: { userId: req.user.id, isActive: true }, include: { completions: { where: { date: { gte: new Date(Date.now() - 7 * 86400000) } } } } }),
      prisma.goal.findMany({ where: { userId: req.user.id } }),
    ]);

    const doneT    = tasks.filter(t => t.status === "done").length;
    const taskRate = tasks.length ? doneT / tasks.length : 0;
    const todayH   = habits.filter(h => h.completions?.some(c => c.date >= today && c.date < tomorrow)).length;
    const habitRate= habits.length ? todayH / habits.length : 0;
    const goalAvg  = goals.length ? goals.reduce((a, g) => a + g.progress, 0) / goals.length : 0;
    const prodScore= calcScore({ taskRate, habitRate, goalAvg });

    // Last 7 days series
    const weekly = Array.from({ length: 7 }, (_, i) => {
      const day  = new Date(); day.setDate(day.getDate() - (6 - i)); day.setHours(0, 0, 0, 0);
      const next = new Date(day); next.setDate(day.getDate() + 1);
      const dayT = tasks.filter(t => t.completedAt && t.completedAt >= day && t.completedAt < next).length;
      const dayH = habits.filter(h => h.completions?.some(c => c.date >= day && c.date < next)).length;
      return {
        day:   day.toLocaleDateString("en-US", { weekday: "short" }),
        tasks: dayT, habits: dayH,
        score: calcScore({ taskRate: dayT / (tasks.length || 1), habitRate: dayH / (habits.length || 1), goalAvg }),
      };
    });

    const stats = {
      tasks:    { total: tasks.length, done: doneT, pending: tasks.length - doneT, rate: Math.round(taskRate * 100) },
      habits:   { total: habits.length, todayDone: todayH, streak: habits.length ? Math.max(...habits.map(h => h.currentStreak)) : 0, rate: Math.round(habitRate * 100) },
      goals:    { total: goals.length, completed: goals.filter(g => g.isCompleted).length, avgProgress: Math.round(goalAvg) },
      prodScore, weekly,
    };

    await cacheSet(cacheKey, stats, 300);
    return R.success(res, stats);
  } catch (err) { next(err); }
};
