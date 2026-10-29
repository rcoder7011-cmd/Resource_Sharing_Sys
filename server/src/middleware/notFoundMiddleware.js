/**
 * 404 Not Found Middleware
 * Handles all requests directed to nonexistent endpoints
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource Not Found — ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = notFoundHandler;
