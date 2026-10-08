# 🚀 TaskMaster Pro - Full-Stack Task Management Platform (Supabase Edition)

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-emerald.svg)](https://supabase.com/)
[![Vanilla JS](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-yellow.svg)](https://developer.mozilla.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A production-style, modern, and responsive Task Management application crafted with **Node.js**, **Express.js**, **Supabase PostgreSQL**, and clean **Vanilla JavaScript**. Designed with a sleek dark/light theme, micro-animations, glassmorphism aesthetics, real-time productivity statistics, subtask checklists, and robust JWT-based authentication.

---

## 🌟 Key Features

### 1. 🔐 Authentication & Security
- **Bcrypt Password Hashing**: Passwords are salted and hashed using bcrypt before persisting.
- **Stateless JWT Authentication**: Secure authorization header tokens with expiration.
- **Forgot Password & Account Recovery**: 2-step verification code flow allowing users to safely reset forgotten passwords.
- **User Data Isolation**: Queries and aggregations are strictly scoped to the authenticated user ID.
- **Protected API Endpoints**: Modular middleware verifies session validity on private routes.

### 2. 📋 Complete Task Management (CRUD)
- Create, Read, Update, and Delete tasks.
- **Priority Levels**: `High` (Rose), `Medium` (Amber), `Low` (Emerald) with color-coded badges.
- **Task Statuses**: `Pending`, `In Progress`, and `Completed`.
- **Subtask Checklist**: Break large tasks into smaller actionable items with live progress tracking (`2/3 completed`).
- **Task Pinning**: Pin critical tasks to stay at the top of your list.
- **Soft Delete & Trash Bin**: Move tasks to trash with one-click restore or empty trash permanently.
- **Bulk Actions**: Select multiple tasks to batch-mark as completed or batch-delete.

### 3. ⏰ Notification Center & Deadline Alerts
- **Interactive Notification Dropdown**: Bell icon with real-time unread badge alerting users to overdue, due today, and upcoming deadlines.
- **Notification Options Modal**: Configurable settings for desktop push alerts, due date alerts, harmonic audio chime, email digests, and customizable reminder lead times (15m to 24h).
- **Web Audio Chime**: Synthesized glass harmonic chime previewed with a single click.
- **Browser Push Reminders**: HTML5 Web Notifications alert users about impending deadlines.

### 4. 🏷️ Categories & Tags
- Default workspaces seeded automatically (`Work`, `Study`, `Personal`, `Projects`, `Important`).
- Custom Category Creator with color picker swatches.
- Multi-tag support (e.g., `#design`, `#sprint`, `#database`).

### 5. 📊 Real-Time Productivity Analytics
- 5 interactive stat cards (Total, Pending, In Progress, Completed, Overdue).
- **Weekly Productivity Trend**: 7-day completed tasks distribution chart.
- **Goal Completion**: Radial animated progress ring showing completion rate percentage.

### 6. 🔍 Search, Filter & Sort
- Instant real-time search across task titles, descriptions, and tags.
- Client-side filtering by **Status**, **Priority**, and **Category** without full page reload.
- Sorting by **Newest First**, **Oldest First**, **Priority**, and **Nearest Deadline**.
- Toggle between **Grid View** and **Compact List View**.
- **CSV Data Export**: Download your full task history directly into a spreadsheet.

### 7. 🎨 Design Aesthetics & Responsiveness
- **Dual Themes**: Polished Dark Mode (Obsidian) and Light Mode with persistent `localStorage` preference.
- **Glassmorphism**: Backdrop blur cards, smooth micro-transitions, and modern typography (`Plus Jakarta Sans`).
- **Mobile First**: Adaptive sidebar and layout for mobile, tablet, and desktop screens.

---

## 📁 Project Architecture

```
task-manager/
├── server/
│   ├── config/
│   │   └── supabase.js         # Supabase client with live PostgREST & local memory adapter
│   ├── controllers/
│   │   ├── authController.js   # User registration, login, profile & preferences
│   │   ├── taskController.js   # Task CRUD, filters, subtasks, trash, bulk, CSV export
│   │   ├── categoryController.js # Custom categories & task counts
│   │   └── statsController.js  # 7-day productivity & dashboard counters
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT validation & user attachment
│   │   └── errorHandler.js     # Unified JSON error response handler (with Postgres codes)
│   ├── models/
│   │   ├── User.js             # Supabase PostgreSQL User repository
│   │   ├── Task.js             # Supabase PostgreSQL Task repository with subtasks
│   │   ├── Category.js         # Supabase PostgreSQL Category repository
│   │   └── ActivityLog.js      # Supabase PostgreSQL ActivityLog repository
│   ├── routes/
│   │   ├── authRoutes.js       # /api/auth
│   │   ├── taskRoutes.js       # /api/tasks
│   │   ├── categoryRoutes.js   # /api/categories
│   │   └── statsRoutes.js      # /api/stats
│   ├── utils/
│   │   ├── helpers.js          # JWT generator, category seeder & activity logger
│   │   ├── seed.js             # Quick-start demo seeder script
│   │   └── test-e2e.js         # Automated end-to-end integration test runner
│   └── server.js               # Main Express entry point
│
├── public/
│   ├── css/
│   │   ├── styles.css          # Design system tokens, variables & layout
│   │   └── components.css      # Stat cards, modals, checklists & toast styles
│   ├── js/
│   │   ├── api.js              # Centralized HTTP fetch client & token handling
│   │   ├── auth.js             # Authentication state manager & route guards
│   │   ├── notifications.js    # Toast alert system & HTML5 browser alerts
│   │   ├── theme.js            # Light/Dark mode controller
│   │   └── dashboard.js        # Main UI application controller
│   ├── index.html              # Landing & marketing showcase page
│   ├── login.html              # Authentication sign-in page (with 1-click demo fill)
│   ├── register.html           # User registration page
│   └── dashboard.html          # Flagship Task Management dashboard
│
├── supabase/
│   └── schema.sql              # Supabase PostgreSQL DDL, Indexes & RLS Policies
├── schema.sql                  # Root copy of Supabase SQL schema
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3 (Custom Variables, Flexbox, Grid), Vanilla JavaScript (ES6+) |
| **Backend** | Node.js, Express.js |
| **Database** | Supabase PostgreSQL, `@supabase/supabase-js` |
| **Security** | bcryptjs, jsonwebtoken, Row-Level Security (RLS), Environment Variables |
| **Dev Tooling**| morgan, nodemon |

---

## ⚡ Quick Start & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or newer installed on your machine.
- A free [Supabase](https://supabase.com/) account (or use the built-in zero-config local testing adapter).

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Supabase Database Setup
1. Create a project at [Supabase](https://supabase.com/).
2. In the Supabase Dashboard, open the **SQL Editor**.
3. Copy the contents of `supabase/schema.sql` (or `schema.sql`) and run it.
4. Retrieve your **Project URL** and **Service Role Key** from **Settings > API**.

### Step 3: Configure Environment Variables
Update `.env` in the root folder:
```env
PORT=5000
NODE_ENV=development

# Supabase Credentials
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Set to true for offline testing or false when connecting to live Supabase
USE_MOCK_SUPABASE=false

# Authentication
JWT_SECRET=taskmaster_super_secure_jwt_secret_token_key_2026_!@#$%^
JWT_EXPIRES_IN=7d
```

### Step 4: Seed Demo Data
```bash
npm run seed
```
**Demo Account Credentials:**
- **Email:** `alex@example.com`
- **Password:** `password123`

### Step 5: Start the Server
```bash
npm start
```
Or for development with hot-reload:
```bash
npm run dev
```

Navigate to:
👉 **`http://localhost:5000`**

### Step 6: Run Automated Integration Tests
```bash
npm test
```

---

## 📡 REST API Reference

All protected endpoints require the HTTP header:
`Authorization: Bearer <your_jwt_token>`

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user (`name`, `email`, `password`) | Public |
| `POST` | `/api/auth/login` | Sign in with email and password | Public |
| `GET` | `/api/auth/me` | Fetch current user profile | Private |
| `PUT` | `/api/auth/preferences` | Update theme preference (`light` / `dark`) | Private |
| `POST` | `/api/auth/logout` | Invalidate / discard session | Private |

### 2. Tasks (`/api/tasks`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/tasks` | Get tasks (Supports `status`, `priority`, `category`, `deadline`, `search`, `sort`) | Private |
| `POST` | `/api/tasks` | Create a new task | Private |
| `GET` | `/api/tasks/:id` | Get details of a single task | Private |
| `PUT` | `/api/tasks/:id` | Update task fields | Private |
| `DELETE` | `/api/tasks/:id` | Soft delete to trash (or permanent delete if in trash) | Private |
| `PATCH` | `/api/tasks/:id/status` | Update task status (`Pending`, `In Progress`, `Completed`) | Private |
| `PATCH` | `/api/tasks/:id/pin` | Toggle pin to top | Private |
| `PATCH` | `/api/tasks/:id/restore`| Restore task from trash | Private |
| `DELETE` | `/api/tasks/trash/empty` | Permanently remove all items in trash | Private |
| `PATCH` | `/api/tasks/bulk/status`| Bulk update status for multiple task IDs | Private |
| `POST` | `/api/tasks/bulk/delete` | Bulk delete or trash multiple task IDs | Private |
| `POST` | `/api/tasks/:id/subtasks` | Add a subtask item | Private |
| `PATCH` | `/api/tasks/:id/subtasks/:subtaskId` | Toggle subtask checkbox | Private |
| `DELETE` | `/api/tasks/:id/subtasks/:subtaskId` | Delete subtask item | Private |
| `GET` | `/api/tasks/export/csv` | Download tasks spreadsheet as CSV | Private |

### 3. Categories (`/api/categories`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/categories` | List user categories with associated task counts | Private |
| `POST` | `/api/categories` | Create custom category (`name`, `color`) | Private |
| `PUT` | `/api/categories/:id` | Update category name or color | Private |
| `DELETE` | `/api/categories/:id` | Delete category and unassign from tasks | Private |

### 4. Dashboard Stats (`/api/stats`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/stats` | Returns totals, pending, in-progress, completed, overdue, weekly productivity trend | Private |

---

## ❓ Common Errors & Solutions

| Error | Root Cause | Solution |
|---|---|---|
| `Row not found` / `PGRST116` | Record does not exist or user mismatch | Confirm resource ID and user authorization. |
| `401 Unauthorized: Invalid token` | Token expired or missing | Log in again via `/login.html` to obtain a fresh token. |
| `duplicate key value violates unique constraint "users_email_key"` | Attempting to register existing email | Log in with the account or use a different email. |
| `EADDRINUSE: port 5000 already in use` | Another process is occupying port 5000 | Change `PORT=5001` in `.env` or terminate the existing process. |

---

## 📄 License
MIT License - open for personal, commercial, and portfolio use.
