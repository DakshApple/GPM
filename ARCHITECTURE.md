# Architecture

The GPM application has been refactored into a scalable, production-ready React codebase using standard architectural patterns.

## Directory Structure

- **`src/services/`**: Core logic and side-effects.
  - `storage.js`: Wraps `window.storage` and `localStorage` to handle persistance.
  - `auth.js`: Handles Supabase authentication, session storage, and refresh.
  - `scheduler.js`: The AI Scheduler (Check 1 through 8). Detects priority conflicts, weekly overloads, and infeasibility.
  - `heuristics.js`: Provides AI breakdown logic for tasks and modules.

- **`src/utils/`**: Shared pure functions and data.
  - `date.js`: Date arithmetic, ISO conversions, and clamp logic.
  - `constants.js`: System metadata, palettes, UI colors.

- **`src/components/`**: Reusable view logic.
  - `ui/`: Standard reusable primitives (`StatCard`, `Toast`, `Field`, `CommandPalette`).
  - `layout/`: App chrome (`Sidebar`, `Topbar`).
  - `modals/`: Global forms for creation (`NewProjectModal`, `TaskModal`, `NewEmployeeModal`).

- **`src/views/`**: Full-page components connected to `App.jsx`. Each view isolates its own filtering and layout logic.

## State Management
State is held at the root (`App.jsx`) and synchronized with the storage service (`storage.js`).
When any state (projects, tasks, etc) mutates:
1. The new data is written to storage.
2. The UI state is updated.
3. The `runScheduler` function is triggered, evaluating all heuristics and updating `suggestions`.

## Storage Fallback
The `store` object seamlessly falls back to `localStorage` if `window.storage` is not present, making it compatible out-of-the-box with standard web environments, Tauri, or Electron wrappers.
