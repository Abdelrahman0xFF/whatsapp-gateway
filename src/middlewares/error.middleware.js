export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(err, req, res, next) {
  let statusCode = parseInt(err.status || err.statusCode || '500', 10);
  if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
    statusCode = 500;
  }
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] [${req.method} ${req.originalUrl}] ${statusCode}:`, err);

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}
