import { randomUUID } from 'node:crypto';

/**
 * In-memory implementation with the same contract as the Mongo repository.
 * Used by the test suite and as a zero-setup fallback when MONGODB_URI is not
 * set (data is lost on restart — never use it in production).
 */
export function createMemoryTaskRepository() {
  let tasks = [];

  const clone = (t) => (t ? structuredClone(t) : null);
  const serialize = (t) =>
    t && {
      ...clone(t),
      dueDate: t.dueDate.toISOString(),
      endsAt: t.endsAt ? t.endsAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };

  return {
    async find({ search, from, to, status } = {}) {
      const needle = search?.toLowerCase();
      return tasks
        .filter((t) => {
          if (needle && !`${t.title}\n${t.description}`.toLowerCase().includes(needle)) return false;
          if (from && t.dueDate < from) return false;
          if (to && t.dueDate >= to) return false;
          if (status && t.status !== status) return false;
          return true;
        })
        .sort((a, b) => a.dueDate - b.dueDate || a.createdAt - b.createdAt)
        .map(serialize);
    },

    async findForSummary() {
      return tasks.map(({ dueDate, status }) => ({ dueDate, status }));
    },

    async findById(id) {
      return serialize(tasks.find((t) => t.id === id));
    },

    async create(data) {
      const now = new Date();
      const task = { id: randomUUID(), ...data, createdAt: now, updatedAt: now };
      tasks.push(task);
      return serialize(task);
    },

    async update(id, data) {
      const task = tasks.find((t) => t.id === id);
      if (!task) return null;
      Object.assign(task, data, { updatedAt: new Date() });
      return serialize(task);
    },

    async delete(id) {
      const task = tasks.find((t) => t.id === id);
      if (!task) return null;
      tasks = tasks.filter((t) => t.id !== id);
      return serialize(task);
    },

    reset() {
      tasks = [];
    },
  };
}
