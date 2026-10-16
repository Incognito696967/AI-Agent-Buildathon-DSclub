export type AppointmentStatus = 'scheduled' | 'cancelled' | 'completed';
export type AppointmentPriority = 'normal' | 'high' | 'urgent';

export interface Patient {
  id: string;
  name: string;
  age: number;
  contact?: string | null;
  created_at: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  is_available: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  end_at: string;
  status: AppointmentStatus;
  priority: AppointmentPriority;
  reason?: string | null;
  created_at: string;
  patient_name?: string | null;
  doctor_name?: string | null;
  specialization?: string | null;
}

export interface AppointmentCreateInput {
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  priority: AppointmentPriority;
  reason?: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface DbHealthResponse {
  status: string;
  database: string;
  message: string;
  timestamp: string;
}

export interface DashboardMetrics {
  totalAppointments: number;
  urgentAppointments: number;
  availableDoctors: number;
  pendingAppointments: number;
}
