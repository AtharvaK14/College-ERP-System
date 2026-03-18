# College ERP System

A full-stack Enterprise Resource Planning system built for college management. Supports three roles — **Admin**, **Teacher**, and **Student** — each with their own dedicated portal and feature set.

**Live Demo:** [https://college-erp-system-one.vercel.app](https://college-erp-system-one.vercel.app)

> **Note:** The backend is hosted on Render's free tier and spins down after 15 minutes of inactivity. If the login takes 30–60 seconds on your first visit, that is normal — the server is waking up. Subsequent requests will be instant.

---

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Teacher | `prof.manimala` | `teacher123` |
| Teacher | `prof.divakar` | `teacher123` |
| Student | `1si21cs001` | `student123` |
| Student | `1si21cs002` | `student123` |

---

## Features

### Admin Portal
- Dashboard with live stats (students, teachers, departments, courses, pending leaves)
- Full CRUD for Departments, Classes, Courses, Teachers, and Students
- Assign teachers to courses and classes with timetable slots
- Enroll students in courses
- Approve or reject teacher leave requests
- Post and manage college-wide notices

### Teacher Portal
- Dashboard showing assigned courses, timetable, and pending actions
- Mark attendance for entire classes with one-click present/absent toggle
- Enter and update exam marks (CIE 1–5 and SEE) for all students
- Apply for casual, medical, or earned leave
- View and respond to student complaints

### Student Portal
- Dashboard with attendance progress bars and low-attendance warnings (below 75%)
- Day-by-day attendance calendar per course
- View marks for all CIE and SEE exams
- Full report card with CGPA calculation (10-point scale)
- College notices board
- Submit complaints and queries to teachers
- Direct messaging to teachers
- Student forum for peer communication

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python), async SQLAlchemy |
| Database | PostgreSQL (Neon) |
| Auth | JWT (access + refresh tokens), bcrypt |
| Deployment | Vercel (frontend), Render (backend), Neon (database) |
| Local Dev | Docker Compose |

---

## Project Structure

```
college-erp/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Settings via environment variables
│   │   ├── database.py          # Async SQLAlchemy engine and session
│   │   ├── seed.py              # Sample data seeder
│   │   ├── models/              # All database models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── core/
│   │   │   ├── security.py      # JWT and bcrypt utilities
│   │   │   └── deps.py          # Role-based access guards
│   │   └── routers/
│   │       ├── auth.py          # Login, refresh, /me
│   │       ├── admin.py         # Admin endpoints
│   │       ├── teacher.py       # Teacher endpoints
│   │       ├── student.py       # Student endpoints
│   │       └── shared.py        # Shared endpoints (any role)
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── login/           # Login page
│       │   ├── admin/           # Admin pages
│       │   ├── teacher/         # Teacher pages
│       │   └── student/         # Student pages
│       ├── components/
│       │   ├── ui/              # Shared UI components
│       │   └── layout/          # Sidebar and dashboard layout
│       └── lib/
│           ├── api.ts           # Axios client and API calls
│           └── auth-context.tsx # Auth state management
│
├── docker-compose.yml
├── .env.docker.example
└── README.md
```

---

## Running Locally

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

### Steps

**1. Clone the repository**

```bash
git clone https://github.com/AtharvaK14/College-ERP-System.git
cd College-ERP-System
```

**2. Create your local secrets file**

```bash
# macOS / Linux
cp .env.docker.example .env.docker

# Windows (PowerShell)
Copy-Item .env.docker.example .env.docker
```

Open `.env.docker` and fill in the values. Generate a secret key by running:

```bash
# macOS / Linux
openssl rand -hex 32

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

Your `.env.docker` should look like this:

```env
POSTGRES_DB=college_erp
POSTGRES_USER=erp_user
POSTGRES_PASSWORD=your_strong_password

SECRET_KEY=your_generated_secret_key
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**3. Start all services**

```bash
docker-compose --env-file .env.docker up --build
```

Wait until you see this line in the logs:

```
backend-1  | Database connected on attempt 1
backend-1  | INFO:     Application startup complete.
```

**4. Seed the database**

Open a second terminal and run:

```bash
docker-compose --env-file .env.docker exec backend python -m app.seed
```

You should see:

```
Seeding database...
Created admin user (username: admin, password: admin123)
Created 2 teachers (password: teacher123)
Created 5 students (password: student123)
=== Seed complete ===
```

**5. Open the app**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

Log in with any of the demo credentials listed above.

**6. Stop the app**

```bash
docker-compose --env-file .env.docker down
```

Add `-v` to also delete the database volume:

```bash
docker-compose --env-file .env.docker down -v
```

---

## API Documentation

FastAPI automatically generates interactive API documentation. When running locally, visit:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

All 57 endpoints are grouped by role:

| Prefix | Role | Example endpoints |
|--------|------|------------------|
| `/api/auth` | Any | Login, refresh token, /me |
| `/api/admin` | Admin only | CRUD for all entities, leave approvals |
| `/api/teacher` | Teacher + Admin | Attendance, marks, leaves, complaints |
| `/api/student` | Student only | View attendance, marks, report card |
| `/api/shared` | Any authenticated | Teacher listing for dropdowns |

---

## Academic Grading Logic

- Each course has 5 CIE (internal) exams and 1 SEE (semester-end) exam
- CIE: best 3 out of 5 scores are averaged, contributing 50% of the final grade
- SEE: contributes the remaining 50%
- Final percentage = (CIE average × 0.5) + (SEE percentage × 0.5)
- CGPA is calculated on a 10-point scale weighted by course credits
- Attendance below 75% triggers a warning on the student dashboard

| Percentage | Grade | Grade Point |
|-----------|-------|-------------|
| ≥ 90 | O | 10.0 |
| ≥ 80 | A+ | 9.0 |
| ≥ 70 | A | 8.0 |
| ≥ 60 | B+ | 7.0 |
| ≥ 50 | B | 6.0 |
| ≥ 40 | C | 5.0 |
| < 40 | F | 0.0 |

---

## Deployment

The live demo uses a fully free stack:

| Service | Provider | Purpose |
|---------|----------|---------|
| Frontend | [Vercel](https://vercel.com) | Next.js hosting |
| Backend | [Render](https://render.com) | FastAPI web service |
| Database | [Neon](https://neon.tech) | Serverless PostgreSQL |

See [README-DEPLOY.md](README-DEPLOY.md) for step-by-step deployment instructions.

---

## License

MIT