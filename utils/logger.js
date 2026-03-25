const { createLogger, format, transports } = require("winston");
const { combine, timestamp, colorize, printf, json, errors } = format;

const devFmt = printf(({ level, message, timestamp, stack }) =>
  `${timestamp} [${level}]: ${stack || message}`
);

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(errors({ stack: true }), timestamp({ format: "YYYY-MM-DD HH:mm:ss" })),
  transports: [
    new transports.Console({
      format: combine(colorize(), devFmt),
    }),
  ],
});

if (process.env.NODE_ENV === "production") {
  logger.add(new transports.File({ filename: "logs/error.log",    level: "error", format: json() }));
  logger.add(new transports.File({ filename: "logs/combined.log",                format: json() }));
}

logger.http = (msg) => logger.info(msg);
module.exports = logger;
