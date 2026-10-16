-- ==============================================================================
-- Intelligent Medical Appointment Coordination - PostgreSQL Schema Migration
-- ==============================================================================
-- Target Database: Supabase PostgreSQL (15+)
-- This script is idempotent and safe to rerun without dropping data.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    age INTEGER NOT NULL CHECK (age >= 0 AND age <= 150),
    contact TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. DOCTORS TABLE
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    specialization TEXT NOT NULL CHECK (char_length(trim(specialization)) > 0),
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. APPOINTMENTS TABLE
-- Note: Fixed duration slots of 30 minutes for MVP slot conflict prevention.
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. AUTOMATIC END_AT CALCULATION AND CONCURRENCY LOCK TRIGGER
-- Computes 30-minute slot end_at and serializes doctor-level bookings to prevent race conditions.
CREATE OR REPLACE FUNCTION trg_fn_appointment_prepare()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure 30-minute fixed slot duration for initial MVP
    NEW.end_at := NEW.scheduled_at + INTERVAL '30 minutes';

    -- Row-level serialization lock on doctor row to prevent concurrent double-booking races
    PERFORM id FROM doctors WHERE id = NEW.doctor_id FOR UPDATE;

    -- Trigger-level verification of overlapping active scheduled appointments
    IF NEW.status = 'scheduled' THEN
        IF EXISTS (
            SELECT 1 FROM appointments
            WHERE doctor_id = NEW.doctor_id
              AND status = 'scheduled'
              AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
              AND tstzrange(scheduled_at, end_at, '[)') && tstzrange(NEW.scheduled_at, NEW.end_at, '[)')
        ) THEN
            RAISE EXCEPTION 'Doctor is already booked for an overlapping time slot.'
                USING ERRCODE = '23P01'; -- exclusion_violation
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appointment_prepare ON appointments;
CREATE TRIGGER trg_appointment_prepare
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_appointment_prepare();

-- 6. DATABASE-LEVEL GIST EXCLUSION CONSTRAINT
-- Guarantees at the storage engine level that no doctor has overlapping active (status='scheduled') slots.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_doctor_appointments'
    ) THEN
        ALTER TABLE appointments
        ADD CONSTRAINT no_overlapping_doctor_appointments
        EXCLUDE USING gist (
            doctor_id WITH =,
            tstzrange(scheduled_at, end_at, '[)') WITH &&
        )
        WHERE (status = 'scheduled');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doctors_available ON doctors(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_slot ON appointments(doctor_id, scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_priority ON appointments(priority);

-- 8. ROW LEVEL SECURITY (RLS)
-- NOTE: The backend FastAPI service uses the Supabase service_role key, which bypasses RLS
-- to perform administrative medical coordination tasks. RLS policies here provide defense-in-depth
-- if anonymous or authenticated user tokens access the tables directly.
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Allow reading doctor listings publicly / to authenticated users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'doctors' AND policyname = 'Allow read access to doctors'
    ) THEN
        CREATE POLICY "Allow read access to doctors" ON doctors FOR SELECT USING (true);
    END IF;
END $$;

-- 9. OPTIONAL SEED DATA (SAFE IDEMPOTENT INSERTION FOR IMMEDIATE TESTING)
INSERT INTO doctors (id, name, specialization, is_available)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Dr. Sarah Connor', 'Cardiology', true),
    ('22222222-2222-2222-2222-222222222222', 'Dr. Gregory House', 'Diagnostic Medicine', true),
    ('33333333-3333-3333-3333-333333333333', 'Dr. Meredith Grey', 'General Surgery', true),
    ('44444444-4444-4444-4444-444444444444', 'Dr. Stephen Strange', 'Neuro-Surgery', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO patients (id, name, age, contact)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'John Doe', 45, '+1-555-0100'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Jane Smith', 32, '+1-555-0101'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Robert Paulson', 58, '+1-555-0102')
ON CONFLICT (id) DO NOTHING;
