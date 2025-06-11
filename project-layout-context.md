# Project layout and file function overview
_Exported on 6/11/2025 at 09:25:46 EDT from Cursor (1.0.0)_

---

**User**

Can you take a look at this project and describe the layout, the files,with their functions for context?

---

**Cursor**

Here is a high-level orientation to the codebase so you know where the main pieces live and what they do.

Top-level
• package.json – Yarn/NPM workspace definition. Treats everything under apps/* as individual packages. Dev/build/lint/test commands are forwarded to the workspaces.
• apps/ – the active source code for both the front-end and the API.
• api/ – an earlier, JavaScript implementation of the API (now mostly superseded by apps/api).
• js/, pdfs/, unified-lesson.html, index.html, etc. – artefacts from the original prototype / static site. Kept for reference.
• database/ – SQL DDL scripts (PostgreSQL and MySQL flavours) that match the tables the API expects.
• vercel.json & run.bat – small deployment / local-run helpers.
• Numerous markdown notes beginning with cursor_… – design notes generated during earlier refactors; not used at runtime.

apps/web  (React + TypeScript + Vite)
│
├─ public/ and index.html – Vite static assets & root HTML.
├─ vite.config.ts – minimal Vite config.
├─ src/
│  ├─ App.tsx – Top-level router. Decides which page to show based on auth state.
│  ├─ context/
│  │   └─ AuthContext.tsx – Stores the currently logged-in user, handles login/logout,
│  │     generates fallback usernames, and syncs to localStorage when the API is offline.
│  ├─ data/
│  │   └─ allUnitsData.ts – A 300-line JSON-ish TypeScript file that describes every AP
│  │     Statistics unit/topic, including videos, quizzes, origami tasks, etc.
│  │     Also exports helper functions (findUnitById, getTotalItemCounts, …).
│  ├─ pages/  (the actual screens)
│  │   ├─ LoginPage.tsx – Username generator + “enter site” screen.
│  │   ├─ DashboardPage.tsx – Collapsible per-unit view of progress, overall stats,
│  │   │   and a logout button. Pulls progress from API or localStorage.
│  │   ├─ LessonPage.tsx – Shows one lesson/topic with its videos, quizzes, origami
│  │   │   challenge, and “Mark as complete” logic that syncs (or stores offline).
│  │   └─ LeaderboardPage.tsx – Placeholder “Coming soon” leaderboard.
│  └─ assets/, hooks/, css files – styling and (currently empty) custom hooks folder.
│
└─ package.json – declares React, React-Router, Vite, etc.

apps/api  (Express + TypeScript + PostgreSQL + Socket.IO)
│
├─ src/
│  ├─ index.ts      – 600+ lines. Single entry-point that:
│  │   • Creates the Express server, HTTP server, and Socket.IO server.
│  │   • Adds per-request logging middleware (uuid-style ids).
│  │   • Connects to PostgreSQL via pg.Pool.
│  │   • Registers REST endpoints:
│  │       /api/generate-username
│  │       /api/users/get-or-create
│  │       /api/users/:id/progress (GET, POST sync, etc.)
│  │       /api/users/:id/bookmarks
│  │       /api/leaderboard
│  │   • Listens to Postgres NOTIFY events (progress_updates, bookmark_updates, …)
│  │     and forwards them to all of the user’s open Socket.IO connections.
│  ├─ types.ts  – Central TypeScript interfaces for User, Progress, Bookmark,
│  │              request/response DTOs, and realtime message payloads.
│  └─ logger.ts – Small structured console logger with .child() capability.
│
├─ dist/  – transpiled JS emitted by tsc.
└─ sql-commands.txt – Handy psql snippets for creating tables and testing data.

apps/web-legacy
A static, pre-Vite version kept for archival purposes:
• index.html, mobile-lesson.html, unified-lesson.html – long static HTML pages.
• js/allUnitsData.js, js/syncManager.js – older vanilla-JS equivalents to
  the React data file and offline-sync logic.
• pdfs/ – quiz PDFs referenced by the legacy HTML.

api/ (root-level)  
Older Node/Express implementation (server.js ~850 lines) that predates the TypeScript rewrite. It provides similar endpoints and socket support but is no longer referenced from the monorepo scripts.

database/
• schema.sql      – PostgreSQL schema matching current apps/api code.
• schema_mysql.sql – MySQL version of the same tables (for flexibility).

Other notable files
• .eslintrc.json, .prettierrc – lint/format configuration shared by all workspaces.  
• syllabus.tex & pdfs/ – source for the printable course syllabus and associated PDFs.

How everything fits together
1. Learners open the React SPA (apps/web).  
2. LoginPage creates or fetches a username (via apps/api or local fallback).  
3. DashboardPage and LessonPage call the API to fetch/save progress. If the API is unreachable (e.g., offline classroom), the pages transparently fall back to localStorage and flag “Offline Mode”.  
4. The API persists data in PostgreSQL and emits NOTIFY events; index.ts listens to them and pushes realtime updates through Socket.IO so a user can have multiple tabs/devices open.  
5. When connectivity is restored, the front-end will call the sync endpoints to reconcile any offline progress.

With this map you should be able to jump to whatever layer you need—front-end UI in apps/web, server logic in apps/api, or the legacy/static artefacts for reference.

