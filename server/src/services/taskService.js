import { HttpError } from '../middleware/errors.js';
import { summarizeByWeek, resolveTimeZone } from '../utils/week.js';

export function createTaskService(repo) {
  const getOr404 = async (promise) => {
    const task = await promise;
    if (!task) throw new HttpError(404, 'Task not found');
    return task;
  };

  return {
    list: (filters) => repo.find(filters),
    get: (id) => getOr404(repo.findById(id)),
    create: (data) => repo.create(data),
    async update(id, data) {
      // When only one side of the time range changes, validate against the stored value
      if ((data.dueDate || data.endsAt) && !(data.dueDate && 'endsAt' in data)) {
        const current = await getOr404(repo.findById(id));
        const start = new Date(data.dueDate ?? current.dueDate);
        const end = 'endsAt' in data ? data.endsAt : current.endsAt && new Date(current.endsAt);
        if (end && end <= start) {
          throw new HttpError(400, 'Validation failed', [
            { field: 'endsAt', message: 'End time must be after the start time' },
          ]);
        }
      }
      return getOr404(repo.update(id, data));
    },
    remove: (id) => getOr404(repo.delete(id)),

    async weeklySummary(tz) {
      const timeZone = resolveTimeZone(tz);
      const tasks = await repo.findForSummary();
      return { timeZone, weeks: summarizeByWeek(tasks, timeZone) };
    },
  };
}
