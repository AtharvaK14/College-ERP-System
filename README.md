# College ERP System

A full-stack College Enterprise Resource Planning system built with **FastAPI** (backend), **Next.js 14** (frontend), and **MySQL** (database).

## Feature Overview

| Role | Features |
|------|----------|
| Admin | Manage departments, classes, courses, teachers, students, course assignments, leave approvals, notices |
| Teacher | Mark attendance, enter marks (CIE/SEE), apply for leave, respond to student complaints |
| Student | View attendance with calendar, view marks, report card with CGPA, notices, submit complaints, student forum |

---

## Quick Start (Docker — Recommended)

### Prerequisites
- Docker Desktop installed and running

### Run everything with one command

```bash
git clone <your-repo>
cd college-erp
docker-compose up --build
```

Wait ~60 seconds for MySQL to initialize and all services to start.

Then seed the database with sample data:

```bash
docker-compose exec backend python -m app.seed
```

Open:
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

### Demo credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Teacher | `prof.manimala` | `teacher123` |
| Teacher | `prof.divakar` | `teacher123` |
| Student | `1si21cs001` | `student123` |
| Student | `1si21cs002` | `student123` |

---

## Manual Local Setup (without Docker)

### 1. MySQL

Create database and user:

```sql
CREATE DATABASE college_erp;
CREATE USER 'erp_user'@'localhost' IDENTIFIED BY 'erp_pass';
GRANT ALL PRIVILEGES ON college_erp.* TO 'erp_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env if your MySQL credentials differ

uvicorn app.main:app --reload   # Starts on http://localhost:8000
```

Seed in a separate terminal:

```bash
cd backend
source venv/bin/activate
python -m app.seed
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                     # Starts on http://localhost:3000
```

---

## Project Structure

```
college-erp/
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app + CORS + lifespan
│   │   ├── config.py           # Settings via pydantic-settings
│   │   ├── database.py         # Async SQLAlchemy engine + session
│   │   ├── seed.py             # Sample data seeder
│   │   ├── models/             # All SQLAlchemy ORM models
│   │   ├── schemas/            # All Pydantic v2 schemas
│   │   ├── core/
│   │   │   ├── security.py     # JWT + bcrypt
│   │   │   └── deps.py         # FastAPI dependencies + role guards
│   │   └── routers/
│   │       ├── auth.py         # Login, refresh, me
│   │       ├── admin.py        # Full CRUD for all entities
│   │       ├── teacher.py      # Attendance, marks, leaves, complaints
│   │       └── student.py      # View attendance, marks, report card, forum
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── login/          # Login page
│       │   ├── admin/          # All admin pages
│       │   ├── teacher/        # All teacher pages
│       │   └── student/        # All student pages
│       ├── components/
│       │   ├── ui/             # Button, Card, Table, Modal, Badge, etc.
│       │   └── layout/
│       │       ├── Sidebar.tsx # Role-aware navigation sidebar
│       │       └── DashboardLayout.tsx
│       └── lib/
│           ├── api.ts          # Axios client + all typed API calls
│           └── auth-context.tsx # Auth state + login/logout
│
└── docker-compose.yml
```

---

## API Documentation

FastAPI auto-generates interactive docs at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

All endpoints are grouped by role:
- `/api/auth/*` — authentication
- `/api/admin/*` — admin operations (requires admin JWT)
- `/api/teacher/*` — teacher operations (requires teacher or admin JWT)
- `/api/student/*` — student operations (requires student JWT)

---

## Deployment (Free Tier Live Demo)

### Backend → Render.com

1. Push code to GitHub
2. Create new **Web Service** on Render.com
3. Root directory: `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables:
   - `DATABASE_URL` — your PlanetScale or Render MySQL URL
   - `SECRET_KEY` — any long random string
   - `FRONTEND_URL` — your Vercel frontend URL

To seed on Render: go to Shell tab → `python -m app.seed`

### Frontend → Vercel

1. Import GitHub repo on Vercel
2. Root directory: `frontend`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` — your Render backend URL

### Database → PlanetScale (free MySQL)

1. Create account at planetscale.com
2. Create database `college_erp`
3. Get connection string in format:
   `mysql+aiomysql://user:pass@host/college_erp?ssl_ca=/etc/ssl/certs/ca-certificates.crt`

---

## Database Schema

Entities and relationships (from original ERD):

- **Department** → has many Classes, Teachers, Courses
- **Class** (semester + section) → belongs to Department, has many Students
- **Teacher** → belongs to Department, assigned to TeacherCourse
- **Course** → belongs to Department
- **TeacherCourse** → Teacher + Course + Class + timetable slot
- **Student** → belongs to Class, enrolled in StudentCourse
- **StudentCourse** → Student + Course enrollment
- **Attendance** → Student + Course + Date + Status (present/absent)
- **Marks** → Student + Course + MarkType (CIE1-5, SEE) + Score
- **Leave** → Teacher leave request with approval workflow
- **Notice** → Admin broadcast to all students
- **Complaint** → Student to Teacher with response workflow
- **Message** → Direct messages + Forum posts

---

## Academic Grading Logic

- CIE: 5 internal exams per course, best 3 counted, averaged to 50%
- SEE: 1 semester-end exam, counted at 50%
- Final percentage = (CIE_avg × 0.5) + (SEE_pct × 0.5)
- Grade points: O(10), A+(9), A(8), B+(7), B(6), C(5), F(0)
- CGPA = Σ(grade_point × credits) / Σ(credits)
- Attendance threshold: 75% (alerts shown below this)
