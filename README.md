# Project Management

A full-stack app for managing projects, their members, tasks, subtasks and
notes. Express 5 + MongoDB/Mongoose API with JWT auth, and a React (Vite)
client.

```
.
├── src/      Express API            → localhost:8000
├── client/   React + Vite frontend  → localhost:5173
└── tests/    end-to-end API suite
```

## Getting started

Two processes, two terminals.

```bash
# terminal 1 — API
npm install
cp .env.example .env    # then fill in the values
npm run dev             # http://localhost:8000

# terminal 2 — client
npm --prefix client install
cp client/.env.example client/.env
npm run client          # http://localhost:5173
```

`npm start` runs the API without nodemon. `npm test` runs the API test
suite against an in-memory MongoDB, so it needs no database of its own.

### No MongoDB installed?

`npm run dev:memdb` starts the API against a throwaway in-memory MongoDB
with development secrets already set, so you can click around without
installing anything. **Every record is discarded when the process exits** —
for real work, install MongoDB or point `MONGO_URI` at an Atlas cluster.

### Environment

Every variable the code reads is listed in `.env.example`. The ones
without a usable default:

| Variable               | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `MONGO_URI`            | MongoDB connection string                        |
| `ACCESS_TOKEN_SECRET`  | signs short-lived access tokens                  |
| `REFRESH_TOKEN_SECRET` | signs refresh tokens (use a different value)     |
| `MAILTRAP_SMTP_*`      | SMTP credentials for verification and reset mail |

Email failures are logged rather than thrown, so a missing SMTP config
will not break registration — the verification mail just never arrives.

## Roles

Every membership carries one of three roles, checked per project by
`validateProjectPermission`:

| Role            | Can do                                                        |
| --------------- | ------------------------------------------------------------- |
| `admin`         | everything, including members, notes and deleting the project |
| `project_admin` | manage tasks and subtasks                                     |
| `member`        | read the project, tick subtasks complete                      |

The user who creates a project becomes its first `admin`. A project
always keeps at least one admin — the last one cannot be demoted or
removed.

## API

All routes are prefixed `/api/v1`. Responses share one envelope:

```json
{ "statusCode": 200, "data": {}, "message": "Success", "success": true }
```

Errors use the same shape with `success: false` and an `errors` array.

### Auth — `/auth`

| Method | Path                               | Auth | Purpose                                         |
| ------ | ---------------------------------- | ---- | ----------------------------------------------- |
| POST   | `/register`                        | —    | create an account, sends a verification mail    |
| POST   | `/login`                           | —    | log in with `email` **or** `username`           |
| POST   | `/refresh-token`                   | —    | exchange a refresh token for a new access token |
| GET    | `/verify-email/:verificationToken` | —    | confirm an email address                        |
| POST   | `/forgot-password`                 | —    | request a reset link                            |
| POST   | `/reset-password/:resetToken`      | —    | set a new password from that link               |
| GET    | `/current-user`                    | ✓    | the logged-in user                              |
| POST   | `/logout`                          | ✓    | clear the session                               |
| POST   | `/change-password`                 | ✓    | change password with the old one                |
| POST   | `/resend-email-verification`       | ✓    | send the verification mail again                |

Tokens are returned in the body and set as `httpOnly` cookies. Send them
back either way — `Authorization: Bearer <token>` or the cookie.

### Projects — `/projects`

| Method | Path          | Role                                                        |
| ------ | ------------- | ----------------------------------------------------------- |
| GET    | `/`           | any — lists your projects with your role and a member count |
| POST   | `/`           | any — you become its admin                                  |
| GET    | `/:projectId` | any member                                                  |
| PUT    | `/:projectId` | admin                                                       |
| DELETE | `/:projectId` | admin — cascades to tasks, subtasks, notes, members         |

### Members — `/projects/:projectId/members`

| Method | Path       | Role                                |
| ------ | ---------- | ----------------------------------- |
| GET    | `/`        | any member                          |
| POST   | `/`        | admin — by `email`, optional `role` |
| PUT    | `/:userId` | admin — set `newRole`               |
| DELETE | `/:userId` | admin                               |

### Tasks — `/projects/:projectId/tasks`

| Method | Path                           | Role                                                   |
| ------ | ------------------------------ | ------------------------------------------------------ |
| GET    | `/`                            | any member — filter with `?status=` and `?assignedTo=` |
| POST   | `/`                            | admin, project_admin                                   |
| GET    | `/:taskId`                     | any member — includes its subtasks                     |
| PUT    | `/:taskId`                     | admin, project_admin — partial update                  |
| DELETE | `/:taskId`                     | admin, project_admin                                   |
| POST   | `/:taskId/subtasks`            | admin, project_admin                                   |
| PUT    | `/:taskId/subtasks/:subTaskId` | any member                                             |
| DELETE | `/:taskId/subtasks/:subTaskId` | admin, project_admin                                   |

`status` is one of `todo`, `in_progress`, `done`. A task can only be
assigned to someone who is already a member of the project.

### Notes — `/projects/:projectId/notes`

| Method | Path       | Role       |
| ------ | ---------- | ---------- |
| GET    | `/`        | any member |
| POST   | `/`        | admin      |
| GET    | `/:noteId` | any member |
| PUT    | `/:noteId` | admin      |
| DELETE | `/:noteId` | admin      |

### Healthcheck — `/healthcheck`

`GET /api/v1/healthcheck` returns 200 once the server is up.

## Client

The React client lives in `client/` and talks to the API over
`VITE_API_URL` (default `http://localhost:8000`).

```
client/src/
  api/client.js          fetch wrapper: envelope, errors, token refresh
  context/               AuthProvider and the useAuth hook
  hooks/useResource.js   load-on-mount + refresh, ignoring stale responses
  components/            Layout, ProtectedRoute, TaskBoard, TaskCard,
                         MembersPanel, ErrorBanner, Spinner
  pages/                 Login, Register, Projects, ProjectDetail
```

Screens:

- **Projects** — everything you own or were added to, with your role and
  the member count; create a new one inline.
- **Project** — a three-column board (To do / In progress / Done). Opening
  a task reveals its status, its subtasks and an inline add field; subtasks
  load on expand rather than making the board issue a request per task.
  Alongside it, a members panel to add people by email and set their role.

The UI mirrors the API's permissions rather than second-guessing them: a
plain member sees the board and can tick subtasks complete, but the
controls for creating tasks, managing members and deleting the project are
not rendered for them. The API still enforces all of it — hiding a button
is a courtesy, not a security boundary.

It authenticates with `Authorization: Bearer <token>` rather than cookies,
storing both tokens in `localStorage`. When a request comes back 401, the
client refreshes once and retries, so an expired access token does not
bounce the user to the login screen. Parallel 401s share a single refresh.

> **Deploying to two different domains?** The API also sets the tokens as
> `httpOnly` cookies, but those are flagged `sameSite: "lax"`, which the
> browser will not send cross-site. Either serve both from one domain, or
> stay on the Bearer header — which is what the client already does.

## Deploying

The app is built to run as **one service**: Express serves the API and the
built client from the same origin. That keeps the auth cookies first-party
and means there is no CORS configuration to get wrong.

```bash
npm ci
npm run build        # builds client/dist
NODE_ENV=production npm start
```

Any host that runs those three commands works — Render, Railway, Fly, a
VPS, or the included `Dockerfile`. Set the build command to `npm run build`
and the start command to `npm start`.

### Environment in production

Everything in `.env.example`, with these mattering most:

| Variable               | Notes                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `NODE_ENV`             | must be `production` — gates stack traces out of error responses and marks cookies secure |
| `MONGO_URI`            | a real database; MongoDB Atlas has a free tier                                            |
| `ACCESS_TOKEN_SECRET`  | generate a fresh one, see below                                                           |
| `REFRESH_TOKEN_SECRET` | must differ from the access secret                                                        |
| `CLIENT_URL`           | your public URL — the verification and reset emails link here                             |
| `PORT`                 | most hosts inject this; the app honours it                                                |

Generate the secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The server refuses to boot if a required variable is missing, if the two
secrets match, or if either is still a placeholder or under 32 characters
in production. A failed deploy with a clear message beats a running one
that breaks at the first login.

### Two separate domains instead

If you would rather host the client separately (Vercel, Netlify, a CDN):

1. Build the client with `VITE_API_URL=https://api.example.com` set — it is
   embedded at build time, not read at runtime.
2. Set `CORS_ORIGIN` on the API to the client's origin.
3. Switch the cookies in `src/controller/auth.controllers.js` to
   `sameSite: "none"` — `lax` is not sent cross-site. The client
   authenticates with the `Authorization` header, so this only matters if
   you start relying on the cookies.

### Checklist

- [ ] `npm test` passes
- [ ] `npm run build` produces `client/dist`
- [ ] Real `MONGO_URI`, and the database accepts connections from the host
- [ ] Fresh secrets, `NODE_ENV=production`, `CLIENT_URL` set
- [ ] SMTP credentials set, or accept that verification and reset emails
      will not send — registration still succeeds, the mail is logged as
      failed rather than thrown
- [ ] Health check pointed at `/api/v1/healthcheck`

## Layout

```
src/
  app.js            express app, middleware and route mounting
  index.js          entry point: loads .env, connects, listens
  db/               mongoose connection
  models/           user, project, projectmember, task, subtask, note
  controller/       auth, project, task, note, healthcheck
  routes/           one router per resource; tasks and notes nest under projects
  middlewares/      auth (JWT + per-project roles), validator, error handler
  validators/       express-validator chains
  utils/            ApiResponse, ApiError, asyncHandler, mail, constants
tests/              end-to-end suite over the whole API
```

Nested resources are always scoped to their parent, so an id belonging
to one project cannot be reached through another.
