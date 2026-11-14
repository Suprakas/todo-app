import { Router } from 'express';
import {
  createTaskSchema,
  updateTaskSchema,
  statusSchema,
  listQuerySchema,
} from '../validators/task.js';

/**
 * GET    /api/tasks                 ?search=&from=&to=&status=
 * GET    /api/tasks/summary/weekly  ?tz=Asia/Kolkata
 * GET    /api/tasks/:id
 * POST   /api/tasks
 * PATCH  /api/tasks/:id
 * PATCH  /api/tasks/:id/status
 * DELETE /api/tasks/:id
 */
export function createTaskRouter(service) {
  const router = Router();

  router.get('/', async (req, res) => {
    const filters = listQuerySchema.parse(req.query);
    res.json({ data: await service.list(filters) });
  });

  // Declared before "/:id" so "summary" isn't treated as an id
  router.get('/summary/weekly', async (req, res) => {
    res.json({ data: await service.weeklySummary(req.query.tz) });
  });

  router.get('/:id', async (req, res) => {
    res.json({ data: await service.get(req.params.id) });
  });

  router.post('/', async (req, res) => {
    const body = createTaskSchema.parse(req.body ?? {});
    res.status(201).json({ data: await service.create(body) });
  });

  router.patch('/:id', async (req, res) => {
    const body = updateTaskSchema.parse(req.body ?? {});
    res.json({ data: await service.update(req.params.id, body) });
  });

  router.patch('/:id/status', async (req, res) => {
    const { status } = statusSchema.parse(req.body ?? {});
    res.json({ data: await service.update(req.params.id, { status }) });
  });

  router.delete('/:id', async (req, res) => {
    await service.remove(req.params.id);
    res.status(204).end();
  });

  return router;
}
