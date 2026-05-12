require("dotenv").config();
const http           = require("http");
const app            = require("./app");
const prisma         = require("./config/prisma");
const { connectRedis } = require("./config/redis");
const { initSocket } = require("./socket/socketServer");
const logger         = require("./utils/logger");

const PORT = process.env.PORT || 5000;

(async () => {
  // Test DB connection
  try {
  for (let i = 1; i <= 5; i++) {
    try {
      await prisma.$connect();
      console.log("✅ PostgreSQL connected via Prisma");
      break;
    } catch (err) {
      console.log(`Attempt ${i} failed: ${err.message}`);
      if (i === 5) throw err;
      await new Promise(r => setTimeout(r, 5000));
    }
  }
} catch (err) {
  console.error("❌ Database connection failed:", err.message);
  process.exit(1);
}

  // Redis (optional)
  connectRedis();

  // HTTP + Socket.io
  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    logger.info(`🚀 LifeOS API running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
  });

  if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    fetch(`https://lifeos-backend-jpk9.onrender.com/health`)
      .then(() => console.log('Self-ping: awake'))
      .catch(() => {});
  }, 14 * 60 * 1000);
}

  // Graceful shutdown
  const shutdown = async (sig) => {
    logger.info(`${sig} — shutting down`);
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
})();
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
});
