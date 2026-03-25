const prisma = require("../config/prisma");
const R      = require("../utils/apiResponse");
const { cacheDel } = require("../utils/cacheUtils");
const { createActivity } = require("../services/notificationService");

const inv = (uid) => cacheDel(`dashboard:${uid}`);

const getLast14Days = () => {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    days.push(d);
  }
  return days;
};

const formatHabit = (habit) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const days = getLast14Days();
  const grid = days.map(day => {
    const next = new Date(day); next.setDate(day.getDate() + 1);
    return habit.completions?.some(c => c.date >= day && c.date < next) ? 1 : 0;
  });
  const done = habit.completions?.some(c => c.date >= today && c.date < tomorrow) || false;
  return { ...habit, grid, done, streak: habit.currentStreak };
};

exports.getHabits = async (req, res, next) => {
  try {
    const since = new Date(); since.setDate(since.getDate() - 14); since.setHours(0,0,0,0);
    const habits = await prisma.habit.findMany({
      where: { userId: req.user.id, isActive: true },
      include: { completions: { where: { date: { gte: since } }, orderBy: { date: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return R.success(res, { habits: habits.map(formatHabit) });
  } catch (err) { next(err); }
};

exports.createHabit = async (req, res, next) => {
  try {
    const { name, icon, color } = req.body;
    const habit = await prisma.habit.create({ data: { name, icon, color, userId: req.user.id }, include: { completions: true } });
    await inv(req.user.id);
    return R.created(res, { habit: formatHabit(habit) });
  } catch (err) { next(err); }
};

exports.updateHabit = async (req, res, next) => {
  try {
    const existing = await prisma.habit.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return R.notFound(res, "Habit not found");
    const habit = await prisma.habit.update({ where: { id: req.params.id }, data: req.body, include: { completions: true } });
    await inv(req.user.id);
    return R.success(res, { habit: formatHabit(habit) });
  } catch (err) { next(err); }
};

exports.deleteHabit = async (req, res, next) => {
  try {
    const existing = await prisma.habit.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return R.notFound(res, "Habit not found");
    await prisma.habit.update({ where: { id: req.params.id }, data: { isActive: false } });
    await inv(req.user.id);
    return R.success(res, {}, 200, "Habit archived");
  } catch (err) { next(err); }
};

exports.toggleCompletion = async (req, res, next) => {
  try {
    const habit = await prisma.habit.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: { completions: true } });
    if (!habit) return R.notFound(res, "Habit not found");

    const today    = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const existing = await prisma.habitCompletion.findFirst({ where: { habitId: habit.id, date: { gte: today, lt: tomorrow } } });

    let completed;
    if (existing) {
      await prisma.habitCompletion.delete({ where: { id: existing.id } });
      await prisma.habit.update({ where: { id: habit.id }, data: { currentStreak: Math.max(0, habit.currentStreak - 1) } });
      completed = false;
    } else {
      await prisma.habitCompletion.create({ data: { habitId: habit.id, date: today } });
      const newStreak = habit.currentStreak + 1;
      await prisma.habit.update({ where: { id: habit.id }, data: { currentStreak: newStreak, longestStreak: Math.max(habit.longestStreak, newStreak), lastCompletedAt: today } });
      await createActivity(req.user.id, req.user.id, "completed habit", "habit", habit.id, habit.name);
      completed = true;
    }

    const updated = await prisma.habit.findUnique({ where: { id: habit.id }, include: { completions: true } });
    await inv(req.user.id);
    return R.success(res, { habit: formatHabit(updated), completed });
  } catch (err) { next(err); }
};
