# To-Do List — Weekly Planner (MERN)

A mobile-first to-do app that groups tasks into **Monday → Sunday weeks** and shows open vs. completed counts per week. The UI follows the provided Figma design (*To-Do List Mobile app*). The app uses its own REST API (Express + MongoDB).

```
todo-app/
├── client/   React 19 + Vite + TypeScript + Tailwind CSS v4 (deploy to Netlify)
├── server/   Node + Express 5 + Mongoose REST API (deploy to Render / Railway)
└── render.yaml
```

## Features (mapped to the brief)

| Requirement | Where |
| --- | --- |
| Create task: title*, description, date & time*, priority | FAB → **Add New Task** bottom sheet (Figma). Priority (Low/Medium/High) is optional and tapping it again clears it. Optional **Ends** time matches the Figma "Set Time" field. |
| Edit any attribute | Edit icon on a task, or tap the task (opens the same sheet pre-filled; status can be changed here too) |
| Delete | **Swipe a task left → Delete**, the trash icon, or "Delete task" in the sheet. Every delete shows an **Undo** toast |
| Search by keyword (title + description) | Search bar → Search screen (debounced, server-side, highlights matches). Results can be **viewed** (tap), **edited** or **deleted** |
| Weeks Monday → Sunday | Grouping is done on the server **in the user's time zone** (`?tz=` param), so late-Sunday tasks don't slip into the next week |
| Weekly summary cards (open / completed) | Top of home: **Task Complete / Task Pending** cards and **Weekly Progress** for the selected week. **Weekly Overview**: one card per week; tap a card to expand its tasks |
| Mark Completed / In Progress | Checkbox on every task (optimistic update; the week's counts update immediately) |
| Responsive mobile UI | Built from the 390 px Figma frames; scales to tablets and desktop as a centred column, where the form becomes a centred dialog |

Also included: a day strip that filters by day and moves between weeks with ‹ ›, the onboarding screen (shown on the first visit), loading skeletons, a "waking up the server" note for cold starts on free hosting, keyboard and screen-reader support (checkbox and radio roles, Esc closes the sheet), and `prefers-reduced-motion`.

## Run locally

Requirements: Node 18+ (tested on 22).

```bash
# 1. API (http://localhost:5000)
cd server
cp .env.example .env        # optionally set MONGODB_URI; leave it empty to use in-memory storage
npm install
npm run dev

# 2. Web app (http://localhost:5173), in a second terminal
cd client
npm install
npm run dev                 # /api is proxied to localhost:5000
```

Without `MONGODB_URI` the API uses an in-memory store, which makes local trials easy. In production it refuses to start without a database.

### Tests

```bash
cd server && npm test       # 17 API tests (vitest + supertest)
```

## API

Base URL: `/api`. All responses are JSON: `{ data }` on success, `{ error, details? }` on failure (400 validation, 404 not found).

| Method | Endpoint | Body / query |
| --- | --- | --- |
| GET | `/tasks` | `?search=&from=&to=&status=` (`from` inclusive, `to` exclusive, ISO dates) |
| GET | `/tasks/summary/weekly` | `?tz=Asia/Kolkata` returns `{ timeZone, weeks: [{ weekKey, weekStart, weekEnd, total, open, completed }] }` |
| GET | `/tasks/:id` | |
| POST | `/tasks` | `{ title*, dueDate*, endsAt?, description?, priority?: "low"\|"medium"\|"high"\|null, status?: "in_progress"\|"completed" }` |
| PATCH | `/tasks/:id` | any subset of the fields above |
| PATCH | `/tasks/:id/status` | `{ status }` |
| DELETE | `/tasks/:id` | returns 204 |
| GET | `/health` | liveness check |

Server notes: input is validated with **zod** (`endsAt` must be after `dueDate`, including on partial updates). Search uses an escaped, case-insensitive regex. The server also has helmet, CORS allow-listing and rate limiting. A repository layer swaps in MongoDB or the in-memory store, and the tests use the in-memory one.

## Deploy

### 1. Database: MongoDB Atlas (free M0)
Create a cluster, a database user, and allow network access from `0.0.0.0/0` (Render's free tier has no static IPs). Copy the connection string.

### 2. API: Render
- Choose **New → Blueprint** and select this repo (it uses `render.yaml`), **or** create a Web Service with *Root directory* `server`, *Build* `npm ci`, *Start* `npm start`.
- Set these env vars: `MONGODB_URI` (from Atlas) and `CORS_ORIGIN` (your Netlify URL, set once you have it).
- Check that `https://<your-api>.onrender.com/api/health` returns `{"status":"ok"}`.

> On Render's free tier the server sleeps when idle, so the first request can take around 30–50 s. The app shows a "waking up" note while it waits.

### 3. Web app: Netlify
- **Add new site → Import from Git**, then set *Base directory* to `client`. The build settings come from `client/netlify.toml` (`npm run build` → `dist`, plus an SPA redirect).
- Add the env var `VITE_API_URL=https://<your-api>.onrender.com/api` and redeploy.
- Put the Netlify URL into the API's `CORS_ORIGIN`.

## Design notes

- Design tokens (colours, font, borders) are in `client/src/index.css` (`@theme`), taken from the Figma file: Poppins, `#4566EC` primary, `#253C98`/`#DADAFF` progress, `#EFF2FF`/`#FFE6E7` summary cards, square corners.
- Icons come from Lucide, the maintained fork of Feather. The Figma icon layers are Feather icons (`edit`, `trash-2`, `search`, `plus`…). The onboarding zig-zag and ring shapes are redrawn as inline SVG.
- The brief asks for things the Figma doesn't show (expandable week cards, priority, task status, a view screen, swipe-to-delete). These use the same tokens so they look like part of the design.
