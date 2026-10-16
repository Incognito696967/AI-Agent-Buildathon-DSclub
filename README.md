# Intelligent Medical Appointment Coordination

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5+-646CFF.svg)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E.svg)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An intelligent hospital scheduling and consultation coordination platform. The system coordinates doctor availability, prioritizes urgent patient consultations, detects and prevents scheduling conflicts, and manages cancellations backed by a persistent Supabase PostgreSQL database.

---

## 1. Project Overview & MVP Scope

Hospitals routinely face appointment double-booking, long waitlists, and missed consultations due to disconnected scheduling systems. This system provides:
- **Centralized Appointment Coordination:** Orchestrates patient records, doctor rosters, and 30-minute consultation slots.
- **Strict Database Conflict Prevention:** Prevents double-booking via PostgreSQL GIST exclusion constraints and row-level serialization triggers.
- **Triage Prioritization:** Supports urgent, high, and normal priority levels for emergency and routine consultations.
- **Soft Cancellations:** Retains audit history by marking records `cancelled` rather than destructive deletions.
- **Real-Time System Monitoring:** Live status indicators reflecting FastAPI and Supabase connectivity.

---

## 2. Technology Stack

- **Backend:** Python 3.11+ with **FastAPI**
- **Database:** **Supabase-hosted PostgreSQL** (15+)
- **Database Client:** Official `supabase` Python client (PostgREST)
- **Validation:** Pydantic v2 & Pydantic-Settings
- **Frontend:** React 18, Vite, TypeScript
- **Styling:** Custom lightweight responsive CSS
- **Testing:** pytest & FastAPI TestClient (with mock Supabase fixtures)

---

## 3. Prerequisites

Before running the application, ensure you have:
- **Python 3.11+** installed (`python --version`)
- **Node.js 18+** & npm installed (`node --version`)
- A **Supabase account** and active project ([supabase.com](https://supabase.com))

---

## 4. Supabase Setup & Database Migration

### Step 1: Obtain Credentials from Supabase
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project (or create a new one).
3. Navigate to **Project Settings** -> **API**.
4. Note your **Project URL** (`https://<project-ref>.supabase.co`).
5. Under **Project API keys**, copy the **`service_role` secret key** (or the secret key `sb_secret_...`).
   > ⚠️ **IMPORTANT:** Never expose this key in client-side code or commit it to GitHub. It is exclusively for the FastAPI backend.

### Step 2: Apply the SQL Schema
1. In your Supabase Dashboard, open the **SQL Editor** from the left navigation.
2. Click **New Query**.
3. Open [`supabase/schema.sql`](supabase/schema.sql) in this repository and copy its entire content into the SQL Editor.
4. Click **Run**.
   - This creates the `patients`, `doctors`, and `appointments` tables.
   - It enables the `btree_gist` extension for slot conflict exclusion.
   - It sets up concurrency triggers, indexes, and initial seed doctors/patients.
   - The script is idempotent and safe to rerun at any time.

---

## 5. Environment Configuration

### Backend Environment (`backend/.env`)
Copy the backend example file:
```bash
# Windows PowerShell
Copy-Item backend/.env.example backend/.env

# macOS / Linux
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your actual Supabase credentials:
```dotenv
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_or_service_role_key

HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Frontend Environment (`frontend/.env`)
Copy the frontend example file:
```bash
# Windows PowerShell
Copy-Item frontend/.env.example frontend/.env

# macOS / Linux
cp frontend/.env.example frontend/.env
```

Contents of `frontend/.env`:
```dotenv
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## 6. Installation & Startup

### A. Start the Backend API

1. Set up a virtual environment and activate it:
   ```bash
   # Windows PowerShell
   python -m venv backend/.venv
   .\backend\.venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv backend/.venv
   source backend/.venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. Start the FastAPI development server:
   ```bash
   # From project root:
   python -m uvicorn app.main:app --app-dir backend --reload --port 8000
   ```
   The backend will be running at `http://localhost:8000`.

### B. Start the React Frontend

1. Install frontend packages:
   ```bash
   npm --prefix frontend install
   ```

2. Start the Vite development server:
   ```bash
   npm --prefix frontend run dev
   ```
   The frontend dashboard will be running at `http://localhost:5173`.

---

## 7. Interactive API Documentation

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Root Info:** [http://localhost:8000/](http://localhost:8000/)
- **Liveness Probe:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **Database Readiness:** [http://localhost:8000/api/v1/health/db](http://localhost:8000/api/v1/health/db)

---

## 8. Running Tests

The test suite validates health probes, input validation, conflict prevention, and CRUD workflows using mock Supabase fixtures (no live Supabase connection needed for unit tests).

Run pytest with the virtual environment activated:
```bash
# Windows PowerShell
$env:PYTHONPATH="backend"
.\backend\.venv\Scripts\pytest.exe backend/app/tests -v

# macOS / Linux
PYTHONPATH=backend pytest backend/app/tests -v
```

To run TypeScript verification and build the frontend:
```bash
npm --prefix frontend run build
```

---

## 9. Project Structure

```text
AI-Agents-DS-Buildathon/
├── README.md                          # Project documentation and setup guide
├── .gitignore                         # Git exclusion rules
├── .env.example                       # Root environment templates
├── docs/
│   ├── ARCHITECTURE.md                # System flow, conflict logic & security
│   ├── API_CONTRACT.md                # REST API specifications and payloads
│   └── TEAM_TASKS.md                  # 4-member role distribution and interfaces
├── supabase/
│   └── schema.sql                     # PostgreSQL schema, GIST constraints & RLS
├── backend/
│   ├── requirements.txt               # Backend Python dependencies
│   ├── .env.example                   # Backend environment template
│   └── app/
│       ├── __init__.py
│       ├── main.py                    # FastAPI entrypoint, CORS, lifespan
│       ├── core/
│       │   ├── __init__.py
│       │   └── config.py              # Pydantic Settings & credential loader
│       ├── db/
│       │   ├── __init__.py
│       │   └── supabase_client.py     # Singleton client & connection tester
│       ├── models/
│       │   └── __init__.py            # Domain models
│       ├── schemas/                   # Pydantic request/response schemas
│       │   ├── __init__.py
│       │   ├── patient.py
│       │   ├── doctor.py
│       │   └── appointment.py
│       ├── api/                       # API route controllers
│       │   ├── __init__.py
│       │   └── routes/
│       │       ├── __init__.py
│       │       ├── health.py          # /health & /health/db probes
│       │       ├── patients.py        # /patients endpoints
│       │       ├── doctors.py         # /doctors endpoints
│       │       └── appointments.py    # /appointments endpoints & cancellation
│       ├── services/                  # Business logic layer
│       │   ├── __init__.py
│       │   ├── patient_service.py
│       │   ├── doctor_service.py
│       │   └── appointment_service.py # 30m slot calculation & conflict checks
│       └── tests/                     # Unit & integration tests
│           ├── __init__.py
│           ├── conftest.py            # Mock Supabase fixtures
│           ├── test_health.py
│           ├── test_patients.py
│           ├── test_doctors.py
│           └── test_appointments.py
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   ├── .env.example
│   └── src/
│       ├── main.tsx                   # React root
│       ├── App.tsx                    # Top-level application component
│       ├── api/
│       │   └── client.ts              # Typed API communication layer
│       ├── components/
│       │   ├── Header.tsx             # Title, actions, system status
│       │   ├── StatusIndicator.tsx    # Live API & Database health pills
│       │   ├── SummaryCards.tsx       # Metrics summary
│       │   ├── AppointmentsTable.tsx  # Dynamic appointment schedule
│       │   └── QuickBookingModal.tsx  # Interactive 30m booking dialog
│       ├── pages/
│       │   └── Dashboard.tsx          # Main dashboard coordinator
│       ├── types/
│       │   └── index.ts               # Shared TypeScript interfaces
│       └── styles/
│           └── index.css              # Clean healthcare UI styles
└── .github/
    └── pull_request_template.md       # Team PR checklist
```

---

## 10. Troubleshooting

### 1. Missing or Invalid Supabase Credentials
- **Symptom:** `/api/v1/health/db` returns status `503` with `"database": "disconnected"`.
- **Fix:** Check `backend/.env`. Ensure `SUPABASE_URL` begins with `https://` and `SUPABASE_SECRET_KEY` matches the secret or `service_role` key from your Supabase dashboard.

### 2. CORS Errors in Frontend
- **Symptom:** Browser console shows `Access-Control-Allow-Origin` blocked.
- **Fix:** Ensure `CORS_ORIGINS` in `backend/.env` includes your frontend port (defaults to `http://localhost:5173`).

### 3. Slot Conflict HTTP 409
- **Symptom:** `POST /api/v1/appointments` returns `409 Conflict`.
- **Reason:** Another appointment is already booked for that doctor within that 30-minute interval. The system is functioning as designed to protect doctors from double-booking. Choose another time slot.

### 4. PowerShell Script Execution Policy
- **Symptom:** Running `npm` or `activate.ps1` gives `PSSecurityException`.
- **Fix:** Run commands with `npm.cmd` or run PowerShell with `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.
