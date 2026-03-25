const prisma = require("../config/prisma");
const R      = require("../utils/apiResponse");

exports.getFeed = async (req, res, next) => {
  try {
    const { workspaceId, page = 1, limit = 30 } = req.query;
    const where = { userId: req.user.id, ...(workspaceId && { workspaceId }) };
    const activities = await prisma.activity.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * parseInt(limit), take: parseInt(limit),
    });
    return R.success(res, { activities });
  } catch (err) { next(err); }
};
