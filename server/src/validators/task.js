import { z } from 'zod';

export const PRIORITIES = ['low', 'medium', 'high'];
export const STATUSES = ['in_progress', 'completed'];

const title = z
  .string({ error: 'Title is required' })
  .trim()
  .min(1, 'Title is required')
  .max(120, 'Title must be 120 characters or fewer');

const description = z
  .string()
  .trim()
  .max(1000, 'Description must be 1000 characters or fewer');

const dueDate = z.coerce.date({ error: 'A valid date & time is required' });

// Optional end time (the design's "Ends" field). `null` clears it.
const endsAt = z.coerce.date({ error: 'End time must be a valid date' }).nullable();

const endAfterStart = (d) => !d.endsAt || !d.dueDate || d.endsAt > d.dueDate;
const endAfterStartIssue = { message: 'End time must be after the start time', path: ['endsAt'] };

// `null` clears an existing priority (it's optional per the spec)
const priority = z.enum(PRIORITIES).nullable();

const status = z.enum(STATUSES);

export const createTaskSchema = z
  .object({
    title,
    description: description.optional().default(''),
    dueDate,
    endsAt: endsAt.optional().default(null),
    priority: priority.optional().default(null),
    status: status.optional().default('in_progress'),
  })
  .refine(endAfterStart, endAfterStartIssue);

export const updateTaskSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    dueDate: dueDate.optional(),
    endsAt: endsAt.optional(),
    priority: priority.optional(),
    status: status.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  })
  .refine(endAfterStart, endAfterStartIssue);

export const statusSchema = z.object({ status });

export const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: status.optional(),
});
