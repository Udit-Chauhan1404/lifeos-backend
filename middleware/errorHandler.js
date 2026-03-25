const logger = require("../utils/logger");

const errorHandler = (err, req, res, _next) => {
  logger.error(`${err.name}: ${err.message}`);
  if (err.code === "P2002") return res.status(409).json({ success: false, message: `${err.meta?.target} already exists` });
  if (err.code === "P2025") return res.status(404).json({ success: false, message: "Record not found" });
  if (err.name === "JsonWebTokenError") return res.status(401).json({ success: false, message: "Invalid token" });
  if (err.name === "TokenExpiredError") return res.status(401).json({ success: false, message: "Token expired" });
  const status = err.statusCode || 500;
  const message = process.env.NODE_ENV === "production" && status === 500 ? "Internal server error" : err.message;
  return res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
