# GPM: GenArtML Project Manager

A single-page, modular React application designed to manage projects, tasks, employees, and client updates. Features a built-in "AI Scheduler" to detect resource collisions and scheduling risks automatically.

## Features
- **Dashboard**: High-level overview of active projects, task counts, team loads, and updates.
- **Calendar & Timeline**: Visualize project spans and task deadlines.
- **Projects**: Manage projects from start to finish.
- **Tasks & Kanban**: Break down work into tasks across multiple project modules.
- **AI Radar (Scheduler)**: Analyzes project dates, loads, and priorities to suggest timeline changes and task reassignments.
- **Supabase Auth**: Secure authentication and session management.

## Installation

1. Install Node.js (v16+).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Development
- The app uses Vite for fast hot-reloading.
- `src/styles/index.css` contains all global custom styling (fonts, colors, etc.).
- `window.storage` is abstracted away in `src/services/storage.js`, falling back to `localStorage` in browser environments.

## Build for Production
```bash
npm run build
npm run preview
```
