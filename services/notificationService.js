const prisma = require("../config/prisma");
const logger = require("../utils/logger");

let _io = null;
const setIO = (io) => { _io = io; };

const createActivity = async (userId, actorId, action, entityType, entityId, entityTitle, workspaceId = null) => {
  try {
    await prisma.activity.create({ data: { userId, actorId, action, entityType, entityId: entityId || null, entityTitle: entityTitle || null, workspaceId: workspaceId || null } });
  } catch (e) { logger.warn("createActivity failed:", e.message); }
};

const createNotification = async (userId, type, title, message, link = null) => {
  try {
    const notif = await prisma.notification.create({ data: { userId, type, title, message, link } });
    if (_io) _io.to(`user:${userId}`).emit("notification:new", notif);
    return notif;
  } catch (e) { logger.warn("createNotification failed:", e.message); }
};

module.exports = { setIO, createActivity, createNotification };
