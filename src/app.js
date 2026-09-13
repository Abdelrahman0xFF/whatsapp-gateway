import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', 1);
app.set('etag', false);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'x-api-key', 'apikey']
  })
);
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

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

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const isStatic = req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/favicon');
    const isRoutinePolling =
      (req.path === '/api/instance/status' ||
        req.path === '/api/instance/qr' ||
        req.path === '/api/activity' ||
        req.path === '/api/health') &&
      (res.statusCode === 200 || res.statusCode === 304);

    if (!isStatic && !isRoutinePolling) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${sanitizeUrlForLogs(req.originalUrl)} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
