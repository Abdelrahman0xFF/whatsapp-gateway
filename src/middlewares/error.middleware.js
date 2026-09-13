function sanitizeUrlForLogs(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const qIndex = url.indexOf('?');
    if (qIndex === -1) return url;
    const pathname = url.slice(0, qIndex);
    const search = url.slice(qIndex + 1);
    const params = new URLSearchParams(search);
    let mutated = false;
    for (const key of Array.from(params.keys())) {
      if (/key|token|secret|pass|auth|code/i.test(key)) {
        params.set(key, '[REDACTED]');
        mutated = true;
      }
    }
    return mutated ? `${pathname}?${params.toString()}` : url;
  } catch {
    return url;
  }
}

export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.path || req.originalUrl}`
  });
}

export function errorHandler(err, req, res, next) {
  let statusCode = parseInt(err.status || err.statusCode || '500', 10);
  if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
    statusCode = 500;
  }

  const isProd = process.env.NODE_ENV === 'production';
  // If in production and internal 500, hide raw internal database/driver error messages
  const message = (isProd && statusCode === 500)
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error');

  const safeUrl = sanitizeUrlForLogs(req.originalUrl || req.url || '');
  console.error(`[Error] [${req.method} ${safeUrl}] ${statusCode}:`, err.message || err);

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(!isProd ? { stack: err.stack } : {})
  });
}
