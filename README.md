<p align="center">
  <img src="frontend-vite/public/favicon.png" alt="AutoGreener Logo" width="150" height="150" style="border-radius: 12px;"/>
</p>

<h1 align="center">AutoGreener – Lightweight Contribution Scheduler</h1>
<p align="center"><b>Automate your GitHub streaks with scheduled green squares.</b></p>
<p align="center">
  A simple, privacy-friendly tool to schedule GitHub pushes and keep your contribution graph green – no bloat, no bots, just your own workflow.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" />
  <img src="https://img.shields.io/badge/Vite-4.0-purple?logo=vite" />
  <img src="https://img.shields.io/badge/Express-4.18-green?logo=express" />
  <img src="https://img.shields.io/badge/Supabase-DB-3ECF8E?logo=supabase" />
  <img src="https://img.shields.io/badge/GitHub%20OAuth-Enabled-black?logo=github" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" />
</p>

---

## About AutoGreener

AutoGreener is a lightweight, open-source platform that helps you maintain your GitHub contribution streaks by scheduling real pushes to your own repositories. No fake commits, no bots—just a simple dashboard to automate your workflow and keep your green squares going, even on your busiest days.

- **Schedule real GitHub pushes** to any repo you own
- **OAuth-secured**: Your data stays private, no password sharing
- **Modern UI**: Built with React, Vite, and Tailwind CSS
- **Open source**: MIT licensed, easy to self-host

---

## ✨ Features

- **Killer Feature: Streak Builder**  
  Create multiple day-by-day schedules in one click! Enable “Streak Mode” to quickly automate a series of daily pushes and keep your GitHub streak alive with minimal effort.

- **(Planned) Date Range Streaks**  
  Select a start and end date, and AutoGreener will automatically schedule daily pushes for the entire range. Perfect for vacations, busy weeks, or planning ahead—just set it and forget it!

- **GitHub OAuth Integration**: Securely connect your GitHub account
- **Add Repositories**: Register any accessible GitHub repo for scheduling
- **Branch-to-Branch Merge Scheduling**: Schedule merges from a source branch to a target branch
- **Date & Time Scheduling**: Pick exact UTC date and time for automatic pushes
- **Dashboard View**: Monitor all scheduled pushes and their statuses
- **Automatic Execution**: Pushes execute automatically at scheduled times using the GitHub API
- **Edit & Cancel**: Modify or remove scheduled pushes as needed
- **Error Handling & Logging**: See detailed error messages and results
- **Multi-Repo Support**: Manage multiple repositories from one dashboard
- **Secure Backend**: All sensitive operations require authentication

## 🏗️ Project Structure

```
AutoGreener/
 ├─ frontend-vite/           # React + Vite + Tailwind CSS frontend
 │   ├─ src/
 │   │   ├─ components/      # AddRepoForm.jsx, RepoCard.jsx, etc.
 │   │   ├─ pages/           # Dashboard.jsx, AddSchedule.jsx, Login.jsx
 │   │   ├─ services/        # API, GitHub, Auth helpers
 │   │   └─ ...
 │   └─ package.json
 ├─ backend/                 # Node.js + Express + Supabase backend
 │   ├─ config/              # supabase.js, passport.js
 │   ├─ controllers/         # scheduleController.js
 │   ├─ routes/              # scheduleRoutes.js, githubRoutes.js, authRoutes.js
 │   ├─ services/            # githubService.js, schedulerService.js, workflowService.js
 │   ├─ database/            # schema-phaseX.sql (Supabase/PostgreSQL)
 │   └─ ...
 └─ README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm (v9+) or yarn
- GitHub account (for OAuth)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/AutoGreener.git
cd AutoGreener
```

### 2. Setup the backend

```bash
cd backend
npm install
```

1. Create a Supabase project (https://supabase.com)
2. Copy your Supabase URL and anon key to backend/.env
3. Run the SQL in backend/database/schema-phaseX.sql (latest phase) in Supabase SQL Editor
4. Set up GitHub OAuth app and add credentials to .env

Start the backend server:

```bash
npm start
# or for development:
```

Backend runs at http://localhost:5000

### 3. Setup the frontend

```bash
cd ../frontend-vite
npm install
npm run dev
```

Frontend runs at http://localhost:5173

## 🛠️ Technology Stack

### Frontend

- **React** (Vite) - UI library
- **Tailwind CSS** - Styling
- **React Router** - Routing

### Backend

- **Node.js** + **Express** - API server
- **Supabase (PostgreSQL)** - Database
- **node-schedule** - Task scheduling
- **GitHub OAuth** - Secure authentication
- **Axios** - GitHub API requests

## 📋 Current Status

### ✅ Completed

- Full backend API (Express.js, Supabase) with GitHub OAuth
- Workflow deploy support: creates `.github/workflows/pushclock-schedule-<id>.yml` in target repos
- Normalized branch handling: backend maps incoming `branch` to `source_branch` and falls back to `target_branch` or repo default when deploying workflows
- GitHub integration fixes: token compatibility, conditional `branch` payloads, and improved error diagnostics
- Supabase improvements: prefers service-role key for writes and surfaces DB errors clearly to the frontend
- Frontend dashboard with live status, error/success details and workflow controls
- Streak Builder, pushes-per-day (interval + custom times), and date-range scheduling UI improvements
- Edit, cancel, and reschedule schedules
- Modern, responsive frontend (React + Vite + Tailwind)
- Multi-repo and multi-branch support

### 🚧 In Progress / Next

- Merge preview/diff before scheduling
- Email/in-app notifications
- Approval workflow for merges
- Comprehensive push/merge history log
- Conflict detection before scheduling

### 🔧 Recent Backend & Deployment Notes

- OAuth scope: GitHub login now requests the `workflow` scope (in addition to `repo`) — users must re-authenticate after backend redeploy to allow workflow writes.
- Deployment: After redeploy, re-login to refresh token scopes before using "Deploy workflow".
- DB compatibility: backend maps `branch` → `source_branch` for compatibility with the existing `schedules` schema; optionally add a `branch` column via Supabase SQL if you want parity.
- Workflow creation: service validates repo access, chooses an effective branch (prefers schedule branch, falls back to repo default), and creates/updates the workflow file. Errors are logged with GitHub response bodies for easier debugging.

If you want, I can add a small debug endpoint to report the current OAuth token scopes so you can confirm `workflow` is present after re-login.

## 🎨 UI Preview & Features

- **Modern Gradient Design** - Blue to indigo color scheme
- **Responsive Layout** - Desktop and mobile friendly
- **Interactive Repo Cards** - Expand for merge details, errors, and logs
- **Real-time Notifications** - Success, error, warning, info
- **Statistics Dashboard** - Scheduled, completed, failed merges

## 🔧 Development Workflow

- Frontend: Add components in frontend-vite/src/components/
- Backend: Add routes/controllers/services in backend/
- Use Tailwind CSS for styling
- Use .env files for secrets (never commit them)
- Use Supabase SQL Editor for DB migrations

## 📝 API Overview

### Auth

- `GET /api/auth/github` - Start GitHub OAuth
- `GET /api/auth/callback` - OAuth callback

### Schedules

- `GET /api/schedule` - Get all schedules for user
- `GET /api/schedule/:id` - Get single schedule
- `POST /api/schedule` - Create new schedule
- `PUT /api/schedule/:id` - Update schedule
- `DELETE /api/schedule/:id` - Delete schedule

#### Example POST body

```json
{
  "repo_owner": "your-username",
  "repo_name": "your-repo",
  "source_branch": "feature-branch",
  "target_branch": "main",
  "commit_message": "Scheduled merge via AutoGreener",
  "push_time": "2026-03-11T14:30:00Z"
}
```

### Response fields

- `error_message`: error details if merge fails

---

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests

## 📄 License

This project is open source and available under the MIT License.

## 👨‍💻 Author

Built with ❤️ by **kuroi17** and contributors

## 🎯 Next Steps

1. Merge preview/diff before scheduling
2. Email/in-app notifications
3. Approval workflow for merges
4. Comprehensive push/merge history log
5. Conflict detection before scheduling
6. Branch protection rule integration

---

**Happy Scheduling & Merging! 🚀**
