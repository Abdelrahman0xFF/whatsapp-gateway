import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('etag', false);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const isStatic = req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/favicon');
    const isRoutinePolling = (req.path === '/api/instance/status' || req.path === '/api/instance/qr') && (res.statusCode === 200 || res.statusCode === 304);

    if (!isStatic && !isRoutinePolling) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
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
