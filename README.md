# AWS Route53 Clone

A full-stack clone of the AWS Route53 DNS management console, built with Next.js, FastAPI, and SQLite.

## Live Demo

> **Frontend:** [Deploy to Vercel] | **Backend:** [Deploy to Render]

**Demo credentials:** `admin` / `admin123`

---

## Features

- **Authentication** — JWT-based login with session persistence
- **Hosted Zones** — Full CRUD with search, pagination, and type filtering
- **DNS Records** — Full CRUD supporting A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA, SOA
- **AWS-faithful UI** — Sidebar navigation, data tables with checkboxes, modals, toast notifications, empty states
- **Placeholder sections** — Dashboard, Health Checks, Traffic Policies, Resolver, Profiles

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.12 |
| Database | SQLite via SQLAlchemy |
| Auth | JWT (python-jose) + bcrypt |

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.10+

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend starts at `http://localhost:8000`.  
API docs available at `http://localhost:8000/docs`.

A demo user (`admin` / `admin123`) is seeded automatically on first start.

### Frontend

```bash
cd frontend
npm install
```

Create a `.env.local` file:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Then run:
```bash
npm run dev
```

The frontend starts at `http://localhost:3000`.

---

## Architecture Overview

```
route53-clone/
├── backend/
│   ├── main.py          # FastAPI app — all models, routes, auth in one file
│   ├── requirements.txt
│   └── route53.db       # SQLite database (auto-created)
│
└── frontend/
    ├── app/
    │   ├── layout.tsx              # Root layout: sidebar + topbar + auth guard
    │   ├── login/page.tsx          # Login page
    │   ├── dashboard/page.tsx      # Dashboard with zone count cards
    │   ├── hosted-zones/
    │   │   ├── page.tsx            # Zones list: search, table, CRUD modals
    │   │   └── [id]/page.tsx       # Zone detail: DNS records CRUD
    │   ├── health-checks/page.tsx  # Placeholder
    │   ├── traffic-policies/page.tsx
    │   ├── resolver/page.tsx
    │   └── profiles/page.tsx
    ├── lib/
    │   └── api.ts                  # Axios client with JWT interceptors
    └── globals.css                 # AWS design system (colors, buttons, tables)
```

### Auth Flow
1. User submits credentials → `POST /auth/login` → JWT returned
2. JWT stored in `localStorage`
3. Axios interceptor attaches `Authorization: Bearer <token>` to all requests
4. On 401, user is redirected to `/login`

---

## Database Schema

```sql
-- Users (mocked auth)
CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Hosted Zones
CREATE TABLE hosted_zones (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,          -- Always ends with "." (e.g., example.com.)
  type         TEXT DEFAULT 'Public',  -- Public | Private
  comment      TEXT DEFAULT '',
  record_count INTEGER DEFAULT 2,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- DNS Records
CREATE TABLE dns_records (
  id             TEXT PRIMARY KEY,
  zone_id        TEXT NOT NULL REFERENCES hosted_zones(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL,        -- A | AAAA | CNAME | TXT | MX | NS | PTR | SRV | CAA | SOA
  ttl            INTEGER DEFAULT 300,
  value          TEXT NOT NULL,        -- Multi-value via newline separation
  routing_policy TEXT DEFAULT 'Simple',
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Overview

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login (form-encoded), returns JWT |
| GET | `/auth/me` | Get current user |

### Hosted Zones
| Method | Path | Description |
|--------|------|-------------|
| GET | `/zones` | List zones with `?search=`, `?page=`, `?page_size=` |
| POST | `/zones` | Create zone |
| GET | `/zones/{id}` | Get zone |
| PATCH | `/zones/{id}` | Update zone comment/type |
| DELETE | `/zones/{id}` | Delete zone (cascades to records) |

### DNS Records
| Method | Path | Description |
|--------|------|-------------|
| GET | `/zones/{id}/records` | List records with `?search=`, `?type_filter=`, `?page=` |
| POST | `/zones/{id}/records` | Create record |
| GET | `/zones/{id}/records/{rid}` | Get record |
| PATCH | `/zones/{id}/records/{rid}` | Update record |
| DELETE | `/zones/{id}/records/{rid}` | Delete record |

---

## Deployment

### Backend → Render

1. Push `backend/` to GitHub
2. New Railway project → "Deploy from GitHub"
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Copy the Railway public URL

### Frontend → Vercel

1. Push `frontend/` to GitHub
2. New Vercel project → import the repo
3. Set environment variable: `NEXT_PUBLIC_API_URL=<your-railway-url>`
4. Deploy

---

## Design Decisions

- **Single `main.py`** — All backend logic (models, routes, auth) in one file for simplicity. For production, split into `models.py`, `routers/`, `auth.py`.
- **SQLite** — Zero-configuration for demo. Swap `DATABASE_URL` for PostgreSQL in production.
- **CSS variables** — AWS design tokens defined in `globals.css`, applied globally. No CSS modules or Tailwind for the AWS-specific components (they need pixel-precise AWS styling).
- **UUID primary keys** — Match Route53's zone ID format.
- **Default NS + SOA records** — Created automatically on zone creation, matching real Route53 behavior.
