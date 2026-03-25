const Redis  = require("ioredis");
const logger = require("../utils/logger");

let client = null;

const connectRedis = () => {
  if (!process.env.REDIS_URL) { logger.warn("REDIS_URL not set — caching disabled"); return; }
  try {
    client = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 3, enableOfflineQueue: false, lazyConnect: true });
    client.on("connect", () => logger.info("✅ Redis connected"));
    client.on("error",   (e) => { logger.warn("Redis error (non-fatal):", e.message); client = null; });
  } catch (e) { logger.warn("Redis init failed (non-fatal):", e.message); client = null; }
};

const getRedis = () => client;
module.exports = { connectRedis, getRedis };
