const { Server }  = require("socket.io");
const { verifyAccessToken } = require("../utils/tokenUtils");
const { setIO }   = require("../services/notificationService");
const logger      = require("../utils/logger");

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: [process.env.FRONTEND_URL, "http://localhost:5173"], credentials: true },
    pingTimeout: 60000,
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
      if (!token) return next(new Error("No token"));
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.id;
      next();
    } catch { next(new Error("Invalid token")); }
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.userId}`);
    socket.join(`user:${socket.userId}`);

    socket.on("workspace:join",  (id) => { socket.join(`workspace:${id}`); socket.to(`workspace:${id}`).emit("user:online", { userId: socket.userId }); });
    socket.on("workspace:leave", (id) => socket.leave(`workspace:${id}`));
    socket.on("task:update",     (d)  => d.workspaceId && socket.to(`workspace:${d.workspaceId}`).emit("task:updated", d));
    socket.on("note:update",     (d)  => d.workspaceId && socket.to(`workspace:${d.workspaceId}`).emit("note:updated", d));
    socket.on("cursor:move",     (d)  => d.workspaceId && socket.to(`workspace:${d.workspaceId}`).emit("cursor:moved", { ...d, userId: socket.userId }));
    socket.on("disconnect",      ()   => logger.info(`Socket disconnected: ${socket.userId}`));
  });

  setIO(io);
  logger.info("✅ Socket.io initialized");
  return io;
};

module.exports = { initSocket, getIO: () => io };
