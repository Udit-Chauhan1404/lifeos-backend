const prisma = require("../config/prisma");
const R      = require("../utils/apiResponse");

exports.getNotifications = async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.notification.count({ where: { userId: req.user.id, read: false } }),
    ]);
    return R.success(res, { notifications, unreadCount });
  } catch (err) { next(err); }
};
exports.markRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { read: true } });
    return R.success(res, {});
  } catch (err) { next(err); }
};
exports.markAllRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
    return R.success(res, {}, 200, "All read");
  } catch (err) { next(err); }
};
exports.deleteNotification = async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    return R.success(res, {});
  } catch (err) { next(err); }
};
