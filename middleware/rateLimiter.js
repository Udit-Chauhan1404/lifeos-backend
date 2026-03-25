const rateLimit = require("express-rate-limit");
const make = (windowMs, max, message) => rateLimit({ windowMs, max, message: { success: false, message }, standardHeaders: true, legacyHeaders: false });
module.exports = {
  authLimiter:   make(15 * 60 * 1000, 10, "Too many auth attempts. Try again in 15 minutes."),
  aiLimiter:     make(60 * 60 * 1000, 30, "AI rate limit reached. Try again in 1 hour."),
  strictLimiter: make(60 * 1000,       5, "Max 5 requests/minute for this endpoint."),
};
