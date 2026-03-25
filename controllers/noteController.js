const prisma = require("../config/prisma");
const R      = require("../utils/apiResponse");

exports.getNotes = async (req, res, next) => {
  try {
    const { search, tag, pinned } = req.query;
    const where = { userId: req.user.id, archived: false };
    if (tag) where.tag = tag;
    if (pinned !== undefined) where.pinned = pinned === "true";
    if (search) where.OR = [{ title: { contains: search, mode: "insensitive" } }, { content: { contains: search, mode: "insensitive" } }];
    const notes = await prisma.note.findMany({ where, orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }], take: 200 });
    return R.success(res, { notes });
  } catch (err) { next(err); }
};

exports.createNote = async (req, res, next) => {
  try {
    const note = await prisma.note.create({ data: { ...req.body, userId: req.user.id } });
    return R.created(res, { note });
  } catch (err) { next(err); }
};

exports.updateNote = async (req, res, next) => {
  try {
    const existing = await prisma.note.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return R.notFound(res, "Note not found");
    const note = await prisma.note.update({ where: { id: req.params.id }, data: req.body });
    return R.success(res, { note });
  } catch (err) { next(err); }
};

exports.deleteNote = async (req, res, next) => {
  try {
    const existing = await prisma.note.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return R.notFound(res, "Note not found");
    await prisma.note.delete({ where: { id: req.params.id } });
    return R.success(res, {}, 200, "Note deleted");
  } catch (err) { next(err); }
};
