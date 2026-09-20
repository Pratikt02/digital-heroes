const AppError = require("../utils/AppError");

// validate(zodSchema) parses req.body, replaces it with the cleaned data, or responds 400.
module.exports = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    return next(new AppError("Validation failed", 400, details));
  }
  req.body = result.data;
  next();
};
