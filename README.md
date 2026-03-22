# AutoGreener

AutoGreener is a lightweight GitHub contribution scheduler. It creates GitHub Actions workflow files in your repository and executes scheduled commits at configured times.

## Current Features

- GitHub OAuth login
- Repository and branch picker from your GitHub account
- Future-only scheduling (past date/time is blocked)
- Streak Builder (daily/weekdays/alternate/M-W-F/weekend templates)
- Push plan modes:
  - Interval mode (every X hours)
  - Custom time set
- Workflow deploy/remove per schedule
- Auto status updates:
  - Webhook-based updates (`workflow_run`)
  - Polling + sync fallback
- Schedule cards with status badges
- Card pagination (4 cards per page)
- Dashboard stats (`total`, `active`, `done`)

## Tech Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: Supabase (PostgreSQL)
- GitHub Integration: OAuth + REST API + GitHub Actions

## Project Structure

```text
AutoGreener/
  backend/
    config/
    controllers/
    database/
    middleware/
    routes/
    services/
  frontend-vite/
    src/
      components/
      context/
      pages/
      services/
```

## Environment Variables

### Backend (`backend/.env`)

Required (typical):

- `PORT`
- `FRONTEND_URL`
- `SESSION_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (recommended for write operations)
- `GITHUB_WEBHOOK_SECRET` (recommended for real-time status updates)

Optional bot identity for workflow-file commits:

- `AUTOGREENER_BOT_NAME`
- `AUTOGREENER_BOT_EMAIL`

### Frontend (`frontend-vite/.env`)

- `VITE_API_URL`

Example:

```bash
VITE_API_URL=https://your-backend.onrender.com
```

## Local Development

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

### 2) Frontend

```bash
cd frontend-vite
npm install
npm run dev
```

## Render Deployment Notes

Recommended setup:

- Production service -> deploy from `main`
- Staging service (or preview) -> deploy from `staging` or feature branch
- Use separate environment variables and preferably separate database/project for staging

## GitHub Webhook Setup (Recommended)

Create a webhook in your target repository:

- Payload URL: `https://<your-backend>/api/webhook/github`
- Content type: `application/json`
- Secret: same value as `GITHUB_WEBHOOK_SECRET`
- Events: `workflow_run`

This enables fast schedule status updates (`completed`/`error`) after workflow execution.

## API Overview

### Auth

- `GET /auth/github`
- `GET /auth/github/callback`
- `POST /auth/logout`

### Schedules

- `GET /api/schedule`
- `GET /api/schedule/:id`
- `POST /api/schedule`
- `PUT /api/schedule/:id`
- `PUT /api/schedule/:id/toggle`
- `POST /api/schedule/sync-status`
- `DELETE /api/schedule/:id`

### Workflow

- `POST /api/workflow/deploy/:scheduleId`
- `DELETE /api/workflow/remove/:scheduleId`
- `GET /api/workflow/status/:scheduleId`

## Notes About Statuses

Typical flow:

1. `scheduled`
2. `in-progress` (when a matching run is detected)
3. `completed` or `error`

Status may be updated by webhook and by background sync fallback.

## License

MIT (see `LICENSE`).
