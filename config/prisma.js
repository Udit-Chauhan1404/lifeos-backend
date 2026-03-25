const { PrismaClient } = require("@prisma/client");

const prisma = global.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== "production") global.__prisma = prisma;

module.exports = prisma;