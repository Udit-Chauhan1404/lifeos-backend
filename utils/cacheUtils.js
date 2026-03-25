const { getRedis } = require("../config/redis");
const logger = require("./logger");

const cacheGet = async (key) => {
  const redis = getRedis();
  if (!redis) return null;
  try { const v = await redis.get(key); return v ? JSON.parse(v) : null; } catch (e) { logger.warn(`Cache GET [${key}]:`, e.message); return null; }
};

const cacheSet = async (key, value, ttl = 300) => {
  const redis = getRedis();
  if (!redis) return;
  try { await redis.setex(key, ttl, JSON.stringify(value)); } catch (e) { logger.warn(`Cache SET [${key}]:`, e.message); }
};

const cacheDel = async (...keys) => {
  const redis = getRedis();
  if (!redis || !keys.length) return;
  try { await redis.del(...keys); } catch (e) { logger.warn("Cache DEL:", e.message); }
};

const cacheInvalidatePattern = async (pattern) => {
  const redis = getRedis();
  if (!redis) return;
  try { const keys = await redis.keys(pattern); if (keys.length) await redis.del(...keys); } catch (e) { logger.warn("Cache invalidate:", e.message); }
};

module.exports = { cacheGet, cacheSet, cacheDel, cacheInvalidatePattern };
