# Kanban App (Frontend)

React + TypeScript frontend for the Kanban project.

## Stack

- React 19
- TypeScript
- Vite
- TanStack Query
- dnd-kit
- Socket.IO client
- Tailwind CSS

## What It Does

- Render board data with a normalized client shape (`columns`, `taskMap`, `columnTaskIds`)
- Drag and drop columns/cards with optimistic UI
- Real-time sync across sessions via WebSocket events
- Card edit locking UI for collaboration
- Auth flow based on backend HttpOnly cookie + CSRF token

## Scripts

- `npm run dev`: start local dev server (`http://localhost:5173`)
- `npm run build`: type-check + production build
- `npm run lint`: run ESLint
- `npm run preview`: preview production build

## Local Setup

```bash
cd kanban-app
npm install
npm run dev
```

The app expects backend APIs at `http://localhost:3000` in current code.
