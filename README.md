# LifeOS Backend v3 — PostgreSQL + Prisma + Neon

## Stack
- **Express** · **PostgreSQL** (via Neon) · **Prisma ORM** · **JWT** · **Socket.io** · **OpenAI** · **Stripe**

---

## Local Setup (5 minutes)

### 1. Install dependencies
```bash
npm install
```

### 2. Get free Neon database
1. Go to https://neon.tech → Sign up free
2. Create a new project (any name)
3. Copy your connection string from the dashboard

### 3. Set up .env
```bash
cp .env.example .env
```
Fill in your DATABASE_URL and DIRECT_URL from Neon, and your JWT secrets.

### 4. Push database schema
```bash
npm run db:push
```
This creates all tables automatically. You'll see: ✅ Your database is now in sync

### 5. Run the server
```bash
npm run dev
```
You should see:
```
✅ PostgreSQL connected via Prisma
🚀 LifeOS API running on port 5000
```

---

## Deploy to Render (free)

1. Push this folder to GitHub
2. Go to render.com → New Web Service → connect repo
3. Set:
   - Build Command: `npm install && npx prisma generate`
   - Start Command: `npm start`
4. Add ALL environment variables from your .env
5. Set NODE_ENV=production
6. Deploy

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Create account |
| POST | /api/auth/login | No | Login |
| POST | /api/auth/refresh | No | Refresh JWT |
| GET | /api/auth/me | Yes | Current user |
| GET | /api/tasks | Yes | List tasks |
| POST | /api/tasks | Yes | Create task |
| PUT | /api/tasks/:id | Yes | Update task |
| DELETE | /api/tasks/:id | Yes | Delete task |
| GET | /api/habits | Yes | List habits |
| POST | /api/habits/:id/toggle | Yes | Toggle habit |
| GET | /api/goals | Yes | List goals |
| GET | /api/notes | Yes | List notes |
| GET | /api/events | Yes | List events |
| GET | /api/analytics/dashboard | Yes | Dashboard stats |
| POST | /api/ai/chat | Yes | AI chat |
| GET | /api/ai/advice | Yes | AI advice |
| GET | /api/ai/daily-plan | Yes | AI daily plan |
| POST | /api/stripe/checkout | Yes | Payment session |
| GET | /api/stripe/status | Yes | Subscription |
| GET | /api/health | No | Health check |
