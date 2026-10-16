# API Contract: Intelligent Medical Appointment Coordination

**Base URL:** `http://localhost:8000/api/v1`  
**Interactive Docs:** `http://localhost:8000/docs`  
**Alternative ReDoc:** `http://localhost:8000/redoc`

---

## 1. Health & Readiness

### `GET /health`
Liveness probe. Returns 200 without requiring database connectivity.

**Response `200 OK`:**
```json
{
  "status": "healthy",
  "service": "Intelligent Medical Appointment Coordination API",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-10-16T12:00:00.000000Z"
}
```

---

### `GET /health/db`
Readiness probe verifying active Supabase PostgreSQL connectivity.

**Response `200 OK` (Connected):**
```json
{
  "status": "healthy",
  "database": "connected",
  "message": "Successfully connected to Supabase PostgreSQL.",
  "timestamp": "2026-10-16T12:00:00.000000Z"
}
```

**Response `503 Service Unavailable` (Disconnected/Unconfigured):**
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "message": "Database credentials (SUPABASE_URL and SUPABASE_SECRET_KEY) are not configured.",
  "timestamp": "2026-10-16T12:00:00.000000Z"
}
```

---

## 2. Patients API

### `GET /patients`
List registered patients.

**Query Parameters:**
- `limit` (int, default: 50, max: 200)
- `offset` (int, default: 0)

**Response `200 OK`:**
```json
[
  {
    "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "name": "John Doe",
    "age": 45,
    "contact": "+1-555-0100",
    "created_at": "2026-10-16T12:00:00.000000Z"
  }
]
```

---

### `POST /patients`
Register a new patient.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "age": 32,
  "contact": "+1-555-0101"
}
```

**Response `201 Created`:**
```json
{
  "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  "name": "Jane Smith",
  "age": 32,
  "contact": "+1-555-0101",
  "created_at": "2026-10-16T12:05:00.000000Z"
}
```

**Errors:**
- `422 Unprocessable Content`: `age < 0` or `name` is empty.

---

## 3. Doctors API

### `GET /doctors`
List doctors roster.

**Query Parameters:**
- `available_only` (bool, default: `false`)
- `limit` (int, default: 50, max: 200)

**Response `200 OK`:**
```json
[
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Dr. Sarah Connor",
    "specialization": "Cardiology",
    "is_available": true,
    "created_at": "2026-10-16T12:00:00.000000Z"
  }
]
```

---

### `POST /doctors`
Add a doctor to the roster.

**Request Body:**
```json
{
  "name": "Dr. Gregory House",
  "specialization": "Diagnostic Medicine",
  "is_available": true
}
```

**Response `201 Created`:**
```json
{
  "id": "22222222-2222-2222-2222-222222222222",
  "name": "Dr. Gregory House",
  "specialization": "Diagnostic Medicine",
  "is_available": true,
  "created_at": "2026-10-16T12:06:00.000000Z"
}
```

---

## 4. Appointments API

### `GET /appointments`
List appointments with joined patient and doctor details.

**Query Parameters:**
- `doctor_id` (UUID, optional)
- `patient_id` (UUID, optional)
- `status` (string, optional: `scheduled`, `cancelled`, `completed`)
- `limit` (int, default: 100, max: 500)

**Response `200 OK`:**
```json
[
  {
    "id": "55555555-5555-5555-5555-555555555555",
    "patient_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "doctor_id": "11111111-1111-1111-1111-111111111111",
    "scheduled_at": "2026-10-20T10:00:00Z",
    "end_at": "2026-10-20T10:30:00Z",
    "status": "scheduled",
    "priority": "urgent",
    "reason": "Acute chest pain follow-up",
    "created_at": "2026-10-16T12:07:00Z",
    "patient_name": "John Doe",
    "doctor_name": "Dr. Sarah Connor",
    "specialization": "Cardiology"
  }
]
```

---

### `POST /appointments`
Book an appointment slot (fixed 30-minute duration).

**Request Body:**
```json
{
  "patient_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "doctor_id": "11111111-1111-1111-1111-111111111111",
  "scheduled_at": "2026-10-20T10:00:00Z",
  "priority": "high",
  "reason": "Persistent migraine symptoms"
}
```

**Response `201 Created`:**
```json
{
  "id": "66666666-6666-6666-6666-666666666666",
  "patient_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "doctor_id": "11111111-1111-1111-1111-111111111111",
  "scheduled_at": "2026-10-20T10:00:00Z",
  "end_at": "2026-10-20T10:30:00Z",
  "status": "scheduled",
  "priority": "high",
  "reason": "Persistent migraine symptoms",
  "created_at": "2026-10-16T12:08:00Z",
  "patient_name": "John Doe",
  "doctor_name": "Dr. Sarah Connor",
  "specialization": "Cardiology"
}
```

**Errors:**
- `400 Bad Request`: Doctor is marked unavailable (`is_available = false`).
- `404 Not Found`: Patient or Doctor ID does not exist.
- `409 Conflict`: Doctor already has an overlapping appointment in that 30-minute interval.
- `422 Unprocessable Content`: Missing required fields or invalid priority (`normal`, `high`, `urgent`).

---

### `PATCH /appointments/{appointment_id}/cancel`
Cancel an appointment (preserves record, marks `status = 'cancelled'`).

**Response `200 OK`:**
```json
{
  "id": "66666666-6666-6666-6666-666666666666",
  "status": "cancelled",
  "message": "Appointment cancelled successfully."
}
```

**Errors:**
- `404 Not Found`: Appointment ID does not exist.
