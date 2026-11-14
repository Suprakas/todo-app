import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createTaskRouter } from './routes/tasks.js';
import { createTaskService } from './services/taskService.js';
import { errorHandler, notFound } from './middleware/errors.js';

export function createApp({ repo, corsOrigins = [], logRequests = true } = {}) {
  const app = express();

  app.set('trust proxy', 1); // behind Render/Railway proxies
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins.length ? corsOrigins : true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  if (logRequests) app.use(morgan('dev'));
  app.use(
    '/api',
    rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }),
  );

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/tasks', createTaskRouter(createTaskService(repo)));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
