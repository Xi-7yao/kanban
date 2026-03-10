# Kanban Board

A full-stack real-time collaborative Kanban board with drag-and-drop, optimistic updates, and enterprise-grade security.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, dnd-kit |
| State Management | TanStack React Query (normalized cache) |
| Backend | NestJS 11, Prisma ORM, SQLite |
| Real-time | WebSocket (Socket.IO) |
| Auth | JWT via HttpOnly Cookie + CSRF Token |
| DevOps | Docker, GitHub Actions CI |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│                                                     │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ dnd-kit  │  │  React    │  │  socket.io-client │  │
│  │ drag &   │──│  Query    │──│  (real-time sync) │  │
│  │ drop     │  │ (cache +  │  │                   │  │
│  │          │  │  mutation) │  │                   │  │
│  └──────────┘  └───────────┘  └──────────────────┘  │
│       │              │                │              │
│  dragOverrides   normalized       board:event        │
│  (local layer)   BoardData        (live updates)     │
└────────────────────┬──────────────────┬──────────────┘
                     │  HTTP + Cookie   │  WebSocket
┌────────────────────┴──────────────────┴──────────────┐
│                  Backend (NestJS)                     │
│                                                      │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐   │
│  │ Auth     │  │ Cards /   │  │  EventsGateway   │   │
│  │ (JWT     │  │ Columns   │──│  (Socket.IO      │   │
│  │  Cookie) │  │ Service   │  │   broadcasting)  │   │
│  └──────────┘  └───────────┘  └──────────────────┘   │
│       │              │                               │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐   │
│  │ CSRF     │  │ AuditLog  │  │ Throttler        │   │
│  │ Guard    │  │ Interceptor│  │ (rate limit)     │   │
│  └──────────┘  └───────────┘  └──────────────────┘   │
│                      │                               │
│               ┌──────┴──────┐                        │
│               │   Prisma    │                        │
│               │   (SQLite)  │                        │
│               └─────────────┘                        │
└──────────────────────────────────────────────────────┘
```

## Features

- **Drag & Drop** — Smooth card and column reordering with dnd-kit
- **Optimistic Updates** — Instant UI feedback with automatic rollback on failure (React Query)
- **Normalized State** — `taskMap` + `columnTaskIds` structure for O(1) lookups and precise re-renders
- **Real-time Sync** — WebSocket broadcasting for multi-client collaboration
- **Security** — HttpOnly Cookie JWT, CSRF Token validation, Helmet headers, rate limiting
- **Audit Trail** — Every write operation logged with user, action, and timestamp
- **Precise Rendering** — React.memo with custom comparators; dragging only re-renders source and destination columns

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Backend

```bash
cd kanban-server
npm install
cp .env.example .env          # Edit JWT_SECRET for production
npx prisma db push
npx prisma generate
npm run start:dev              # http://localhost:3000
```

### Frontend

```bash
cd kanban-app
npm install
npm run dev                    # http://localhost:5173
```

### Docker

```bash
docker-compose up --build      # Backend :3000, Frontend :5173
```

## API Documentation

Swagger UI available at [http://localhost:3000/api](http://localhost:3000/api) when the backend is running.

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register + set auth cookies |
| POST | `/auth/login` | Login + set auth cookies |
| GET | `/auth/me` | Verify auth status |
| GET | `/columns` | Get board (columns + cards) |
| POST | `/columns` | Create column |
| PUT | `/cards/:id` | Update/move card |
| GET | `/audit-logs` | Operation history |
| WS | `/board` | Real-time events |

## Technical Highlights

### Race Condition Resolution
The original closure-based optimistic rollback captured stale state during rapid operations. React Query's `onMutate` reads snapshots from the query cache (always the latest committed state), eliminating the stale-closure problem.

### Normalized Cache + Precise Rendering
Data is stored as `{ taskMap, columnTaskIds }` instead of flat arrays. Combined with `React.memo` custom comparators, dragging a card from column A to B only triggers re-renders in those two columns — O(2) instead of O(n*m).

### Drag State Architecture
Drag operations use a local overlay layer on top of the React Query cache:
```
React Query Cache (server truth) → dragOverrides (ephemeral) → Component reads
```
This separates frame-by-frame drag updates from server state management.

## License

MIT
