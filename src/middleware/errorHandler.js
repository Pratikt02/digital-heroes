const env = require("../config/env");
const AppError = require("../utils/AppError");

const notFound = (req, res, next) => next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));

// Single place where every error becomes a consistent JSON response.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Mongo duplicate key (for example a race on unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({ error: `That ${field} is already in use` });
  }
  if (err.name === "CastError") return res.status(400).json({ error: "Invalid id" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body" });

  const status = err.statusCode || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    error: status >= 500 && env.NODE_ENV === "production" ? "Something went wrong" : err.message,
    ...(err.details && { details: err.details }),
  });
};

module.exports = { notFound, errorHandler };
