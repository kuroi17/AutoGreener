sdinasldknslfnlsfn

# AutoGreener - Automated GitHub Workflow Scheduler 🚀

**AutoGreener** is a full-stack automation system for scheduling GitHub branch merges, pushes, and workflow executions at specific dates and times. Designed for teams and individuals who want to automate contribution graphs, coordinate releases, or enforce time-based code delivery. Built with Node.js, Express, Supabase, GitHub OAuth, and a modern React (Vite) frontend.

## 🎯 Features

- **GitHub OAuth Integration**: Securely connect your GitHub account
- **Add Repositories**: Register any accessible GitHub repo for scheduling
- **Branch-to-Branch Merge Scheduling**: Schedule merges from a source branch to a target branch
- **Date & Time Scheduling**: Pick exact UTC date and time for automatic merges
- **Dashboard View**: Monitor all scheduled merges and their statuses
- **Automatic Execution**: Merges execute automatically at scheduled times using the GitHub API
- **Rollback/Undo Merge**: Revert completed merges with one click
- **Edit & Cancel**: Modify or remove scheduled merges as needed
- **Error Handling & Logging**: See detailed error messages and merge results
- **Expandable Repo Cards**: Click to view merge details, errors, and history
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

- Full backend API (Express.js, Supabase, GitHub OAuth)
- Real scheduled merges via GitHub API
- Rollback/undo merge feature (revert completed merges)
- Dashboard with live status, error/success details
- Edit, cancel, and reschedule merges
- Error handling and detailed logging
- Modern, responsive frontend (React + Vite + Tailwind)
- Multi-repo and multi-branch support
- Audit logging for rollbacks

### 🚧 In Progress / Next

- Merge preview/diff before scheduling
- Email/in-app notifications
- Approval workflow for merges
- Comprehensive push/merge history log
- Conflict detection before scheduling

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
- `POST /api/schedule/:id/rollback` - Rollback/undo a completed merge

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

- `status`: pending | completed | error | rollback-completed
- `error_message`: error details if merge fails
- `merge_commit_sha`: SHA of the merge commit (required for rollback)
- `revert_commit_sha`: SHA of the revert commit (after rollback)

---

## 🔄 Rollback/Undo Merge Feature

When a scheduled merge is completed, you can rollback (undo) the merge with one click. This creates a new commit that reverses the merge changes.

### How it works

1. After a merge is completed, the merge commit SHA is stored in the database
2. In the Dashboard, click on a completed merge card to expand details
3. Click the **Rollback** button
4. Confirm the rollback action
5. AutoGreener creates a reverse merge commit that undoes the changes
6. The schedule status updates to `rollback-completed`

### Technical Details

- Uses GitHub Merge API to create a reverse merge
- Creates a new commit (does not rewrite history)
- Safe for public/shared branches
- Preserves audit trail with timestamps
- Handles merge conflicts gracefully with clear error messages

### Limitations

- Only works for completed merges with a stored merge commit SHA
- If conflicts occur during revert, manual resolution is required
- Cannot rollback a rollback (you can re-merge instead)

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
