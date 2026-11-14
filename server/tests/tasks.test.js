import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createMemoryTaskRepository } from '../src/repositories/memoryTaskRepository.js';

const repo = createMemoryTaskRepository();
const app = createApp({ repo, logRequests: false });

const createTask = (body) => request(app).post('/api/tasks').send(body);

beforeEach(() => repo.reset());

describe('POST /api/tasks', () => {
  it('creates a task with defaults', async () => {
    const res = await createTask({ title: 'Buy milk', dueDate: '2026-11-16T09:00:00.000Z' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: 'Buy milk',
      description: '',
      priority: null,
      status: 'in_progress',
      dueDate: '2026-11-16T09:00:00.000Z',
    });
    expect(res.body.data.id).toBeTruthy();
  });

  it('requires title and date', async () => {
    const res = await createTask({ description: 'nope' });
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'dueDate']));
  });

  it('rejects a blank title and an unknown priority', async () => {
    const res = await createTask({ title: '   ', dueDate: '2026-11-16', priority: 'urgent' });
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'priority']));
  });
});

describe('GET /api/tasks', () => {
  beforeEach(async () => {
    await createTask({ title: 'Design review', description: 'Figma pass', dueDate: '2026-11-17T10:00:00Z' });
    await createTask({ title: 'Gym', dueDate: '2026-11-16T06:00:00Z' });
    await createTask({ title: 'Pay rent', description: 'via UPI (urgent)', dueDate: '2026-11-25T10:00:00Z' });
  });

  it('lists tasks sorted by date', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.body.data.map((t) => t.title)).toEqual(['Gym', 'Design review', 'Pay rent']);
  });

  it('searches title and description case-insensitively, regex-safe', async () => {
    let res = await request(app).get('/api/tasks').query({ search: 'figma' });
    expect(res.body.data.map((t) => t.title)).toEqual(['Design review']);

    res = await request(app).get('/api/tasks').query({ search: '(urgent)' });
    expect(res.body.data.map((t) => t.title)).toEqual(['Pay rent']);
  });

  it('filters by date range', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .query({ from: '2026-11-16T00:00:00Z', to: '2026-11-23T00:00:00Z' });
    expect(res.body.data).toHaveLength(2);
  });
});

describe('update / status / delete', () => {
  it('edits any attribute and can clear priority', async () => {
    const { body } = await createTask({ title: 'Old', dueDate: '2026-11-16', priority: 'high' });
    const res = await request(app)
      .patch(`/api/tasks/${body.data.id}`)
      .send({ title: 'New', description: 'details', priority: null, dueDate: '2026-11-18T08:30:00Z' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      title: 'New',
      description: 'details',
      priority: null,
      dueDate: '2026-11-18T08:30:00.000Z',
    });
  });

  it('rejects an empty patch', async () => {
    const { body } = await createTask({ title: 'x', dueDate: '2026-11-16' });
    const res = await request(app).patch(`/api/tasks/${body.data.id}`).send({});
    expect(res.status).toBe(400);
  });

  it('toggles status', async () => {
    const { body } = await createTask({ title: 'x', dueDate: '2026-11-16' });
    const res = await request(app)
      .patch(`/api/tasks/${body.data.id}/status`)
      .send({ status: 'completed' });
    expect(res.body.data.status).toBe('completed');

    const bad = await request(app).patch(`/api/tasks/${body.data.id}/status`).send({ status: 'done' });
    expect(bad.status).toBe(400);
  });

  it('deletes and then 404s', async () => {
    const { body } = await createTask({ title: 'x', dueDate: '2026-11-16' });
    expect((await request(app).delete(`/api/tasks/${body.data.id}`)).status).toBe(204);
    expect((await request(app).get(`/api/tasks/${body.data.id}`)).status).toBe(404);
    expect((await request(app).delete(`/api/tasks/${body.data.id}`)).status).toBe(404);
  });
});

describe('GET /api/tasks/summary/weekly', () => {
  it('groups Monday→Sunday weeks with open/completed counts', async () => {
    await createTask({ title: 'Mon', dueDate: '2026-11-16T09:00:00Z' });
    const sun = await createTask({ title: 'Sun', dueDate: '2026-11-22T09:00:00Z' });
    await createTask({ title: 'Next Mon', dueDate: '2026-11-23T09:00:00Z' });
    await request(app).patch(`/api/tasks/${sun.body.data.id}/status`).send({ status: 'completed' });

    const res = await request(app).get('/api/tasks/summary/weekly').query({ tz: 'UTC' });
    const weeks = Object.fromEntries(res.body.data.weeks.map((w) => [w.weekKey, w]));

    expect(weeks['2026-11-16']).toMatchObject({ total: 2, open: 1, completed: 1 });
    expect(weeks['2026-11-16'].weekStart).toBe('2026-11-16T00:00:00.000Z');
    expect(weeks['2026-11-16'].weekEnd).toBe('2026-11-23T00:00:00.000Z');
    expect(weeks['2026-11-23']).toMatchObject({ total: 1, open: 1, completed: 0 });
  });

  it('uses the caller time zone for week boundaries', async () => {
    // Sunday 22 Nov, 23:30 IST == Sunday 18:00 UTC; Monday 23 Nov 01:00 IST == Sunday 19:30 UTC
    await createTask({ title: 'Late Sunday', dueDate: '2026-11-22T18:00:00Z' });
    await createTask({ title: 'Early Monday IST', dueDate: '2026-11-22T19:30:00Z' });

    const ist = await request(app).get('/api/tasks/summary/weekly').query({ tz: 'Asia/Kolkata' });
    const istWeeks = Object.fromEntries(ist.body.data.weeks.map((w) => [w.weekKey, w]));
    expect(istWeeks['2026-11-16'].total).toBe(1);
    expect(istWeeks['2026-11-23'].total).toBe(1);
    expect(istWeeks['2026-11-23'].weekStart).toBe('2026-11-22T18:30:00.000Z');

    const utc = await request(app).get('/api/tasks/summary/weekly').query({ tz: 'UTC' });
    const utcWeeks = Object.fromEntries(utc.body.data.weeks.map((w) => [w.weekKey, w]));
    expect(utcWeeks['2026-11-16'].total).toBe(2);
  });

  it('falls back to UTC for an invalid time zone', async () => {
    const res = await request(app).get('/api/tasks/summary/weekly').query({ tz: 'Mars/Olympus' });
    expect(res.body.data.timeZone).toBe('UTC');
    expect(res.body.data.weeks.length).toBeGreaterThanOrEqual(1); // current week always present
  });
});

describe('misc', () => {
  it('returns 404 JSON for unknown routes and bad ids', async () => {
    expect((await request(app).get('/api/nope')).status).toBe(404);
    expect((await request(app).get('/api/tasks/not-an-id')).status).toBe(404);
  });

  it('reports malformed JSON as 400', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title":');
    expect(res.status).toBe(400);
  });
});

describe('end time (design "Ends" field)', () => {
  it('accepts an end after the start and rejects one before it', async () => {
    const ok = await createTask({ title: 'Call', dueDate: '2026-11-16T10:00:00Z', endsAt: '2026-11-16T11:00:00Z' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.endsAt).toBe('2026-11-16T11:00:00.000Z');

    const bad = await createTask({ title: 'Call', dueDate: '2026-11-16T10:00:00Z', endsAt: '2026-11-16T09:00:00Z' });
    expect(bad.status).toBe(400);
    expect(bad.body.details[0].field).toBe('endsAt');
  });

  it('validates a partial update against the stored start time, and can clear the end', async () => {
    const { body } = await createTask({ title: 'Call', dueDate: '2026-11-16T10:00:00Z' });
    const bad = await request(app).patch(`/api/tasks/${body.data.id}`).send({ endsAt: '2026-11-16T08:00:00Z' });
    expect(bad.status).toBe(400);
    const ok = await request(app).patch(`/api/tasks/${body.data.id}`).send({ endsAt: '2026-11-16T12:00:00Z' });
    expect(ok.body.data.endsAt).toBe('2026-11-16T12:00:00.000Z');
    const cleared = await request(app).patch(`/api/tasks/${body.data.id}`).send({ endsAt: null });
    expect(cleared.body.data.endsAt).toBeNull();
  });
});
