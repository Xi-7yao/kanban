# Kanban Server (Backend)

NestJS backend for the Kanban project.

## Stack

- NestJS 11
- Prisma ORM
- SQLite
- Socket.IO (WebSocket gateway)
- JWT auth via HttpOnly cookie
- CSRF guard for state-changing HTTP requests

## What It Does

- User auth: register/login/logout/me
- Board APIs for columns and cards
- Ownership checks on board resources
- Real-time board event broadcast within user room
- Card editing lock acquire/release events

## Scripts

- `npm run start:dev`: run backend in watch mode
- `npm run build`: build Nest app
- `npm run test`: run unit tests
- `npm run test:e2e`: run e2e tests
- `npm run lint`: run ESLint

## Local Setup

```bash
cd kanban-server
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```

Server runs on `http://localhost:3000` by default.

## API Docs

Swagger UI is available at:

- `http://localhost:3000/api`
