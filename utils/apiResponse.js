const success     = (res, data = {}, statusCode = 200, message = "Success") => res.status(statusCode).json({ success: true, message, data });
const created     = (res, data = {}, message = "Created successfully") => success(res, data, 201, message);
const error       = (res, message = "Internal server error", statusCode = 500, errors = null) => { const b = { success: false, message }; if (errors) b.errors = errors; return res.status(statusCode).json(b); };
const badRequest  = (res, msg, errs) => error(res, msg, 400, errs);
const unauthorized= (res, msg = "Unauthorized") => error(res, msg, 401);
const forbidden   = (res, msg = "Forbidden")    => error(res, msg, 403);
const notFound    = (res, msg = "Not found")    => error(res, msg, 404);
const conflict    = (res, msg = "Conflict")     => error(res, msg, 409);
module.exports = { success, created, error, badRequest, unauthorized, forbidden, notFound, conflict };
