import type { Appointment, Doctor, Patient, CoordinationEvent } from './types';

export const INITIAL_DOCTORS: Doctor[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Dr. Sarah Connor',
    specialization: 'Cardiology',
    is_available: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Dr. Gregory House',
    specialization: 'Diagnostic Medicine',
    is_available: true,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Dr. Meredith Grey',
    specialization: 'General Surgery',
    is_available: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Dr. Stephen Strange',
    specialization: 'Neuro-Surgery',
    is_available: false,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'Dr. Leonard McCoy',
    specialization: 'Emergency Medicine',
    is_available: true,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'John Doe',
    age: 45,
    contact: '+1-555-0100',
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    name: 'Jane Smith',
    age: 32,
    contact: '+1-555-0101',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    name: 'Robert Paulson',
    age: 58,
    contact: '+1-555-0102',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    name: 'Maria Garcia',
    age: 29,
    contact: '+1-555-0103',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    name: 'David Kim',
    age: 64,
    contact: '+1-555-0104',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

const now = new Date();
const todaySlot1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0).toISOString();
const todaySlot1End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0).toISOString();
const todaySlot2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0).toISOString();
const todaySlot2End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0).toISOString();
const todaySlot3 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0).toISOString();
const todaySlot3End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30, 0).toISOString();
const tomorrowSlot1 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 30, 0).toISOString();
const tomorrowSlot1End = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0).toISOString();

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-001',
    patient_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    doctor_id: '11111111-1111-1111-1111-111111111111',
    patient_name: 'John Doe',
    doctor_name: 'Dr. Sarah Connor',
    specialization: 'Cardiology',
    scheduled_at: todaySlot1,
    end_at: todaySlot1End,
    status: 'scheduled',
    priority: 'urgent',
    reason: 'Acute arrhythmia and persistent chest pressure',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'apt-002',
    patient_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    doctor_id: '22222222-2222-2222-2222-222222222222',
    patient_name: 'Jane Smith',
    doctor_name: 'Dr. Gregory House',
    specialization: 'Diagnostic Medicine',
    scheduled_at: todaySlot2,
    end_at: todaySlot2End,
    status: 'scheduled',
    priority: 'high',
    reason: 'Unexplained recurrent fever and elevated inflammatory markers',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'apt-003',
    patient_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    doctor_id: '33333333-3333-3333-3333-333333333333',
    patient_name: 'Robert Paulson',
    doctor_name: 'Dr. Meredith Grey',
    specialization: 'General Surgery',
    scheduled_at: todaySlot3,
    end_at: todaySlot3End,
    status: 'scheduled',
    priority: 'normal',
    reason: 'Post-operative 6-week incision follow-up',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'apt-004',
    patient_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    doctor_id: '55555555-5555-5555-5555-555555555555',
    patient_name: 'Maria Garcia',
    doctor_name: 'Dr. Leonard McCoy',
    specialization: 'Emergency Medicine',
    scheduled_at: tomorrowSlot1,
    end_at: tomorrowSlot1End,
    status: 'cancelled',
    priority: 'normal',
    reason: 'Routine consultation (Patient rescheduled)',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const INITIAL_EVENTS: CoordinationEvent[] = [
  {
    id: 'init-1',
    timestamp: new Date().toISOString(),
    type: 'system',
    title: 'MEDFLOW Coordination Gateway Initialized',
    description: 'PostgreSQL GIST exclusion engine and row serialization active.',
    details: {
      'Engine': 'FastAPI + Supabase PostgreSQL',
      'Exclusion': 'no_overlapping_doctor_appointments',
      'Slot Duration': '30 Minutes Fixed',
    },
  },
  {
    id: 'evt-urgent-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    type: 'booking',
    title: 'Urgent Patient Fast-Tracked (URGENT)',
    description: 'Priority consultation scheduled for John Doe with Dr. Sarah Connor.',
    priority: 'urgent',
    status: 'warning',
    details: {
      'Priority': 'Urgent',
      'Physician': 'Dr. Sarah Connor',
      'Specialty': 'Cardiology',
    },
  },
  {
    id: 'evt-conflict-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    type: 'conflict',
    title: 'Double-Booking Attempt Preempted (HTTP 409)',
    description: 'Concurrent booking request blocked: Dr. Sarah Connor was already booked.',
    status: 'danger',
    details: {
      'Trigger': 'trg_appointment_prepare',
      'Constraint': 'GIST Slot Exclusion',
      'Result': 'Overlap Blocked (Zero Double-Booking)',
    },
  },
  {
    id: 'evt-cancel-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    type: 'cancellation',
    title: 'Appointment Soft-Cancelled & Slot Released',
    description: 'Maria Garcia appointment cancelled; audit trail preserved and slot reopened.',
    status: 'info',
    details: {
      'Audit Status': 'soft_cancelled',
      'Slot Freed': '09:30 AM',
    },
  },
];
