const AppError = require("../utils/AppError");

// Like validate(), but for the query string (?search=...&page=2). Result lands on req.validatedQuery.
module.exports = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    return next(new AppError("Invalid query parameters", 400, details));
  }
  req.validatedQuery = result.data;
  next();
};
