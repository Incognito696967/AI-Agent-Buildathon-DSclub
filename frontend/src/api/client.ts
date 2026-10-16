import type {
  Appointment,
  AppointmentCreateInput,
  Doctor,
  Patient,
  HealthResponse,
  DbHealthResponse,
  TriageRecommendation,
  AutoScheduleInput,
  AutoScheduleResult,
} from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.detail || errorBody.message || errorMessage;
      } catch {
        // Fallback to text status
      }
      throw new ApiError(errorMessage, response.status);
    }
    return (await response.json()) as T;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Network connection failed to ${API_BASE_URL}. Ensure FastAPI backend is running.`,
      0
    );
  }
}

export const api = {
  // Health
  checkHealth: () => request<HealthResponse>('/health'),
  checkDbHealth: () => request<DbHealthResponse>('/health/db'),

  // Patients
  getPatients: () => request<Patient[]>('/patients'),
  createPatient: (data: Omit<Patient, 'id' | 'created_at'>) =>
    request<Patient>('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Doctors
  getDoctors: (availableOnly = false) =>
    request<Doctor[]>(`/doctors${availableOnly ? '?available_only=true' : ''}`),
  createDoctor: (data: Omit<Doctor, 'id' | 'created_at'>) =>
    request<Doctor>('/doctors', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Appointments
  getAppointments: (params?: { doctor_id?: string; patient_id?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.doctor_id) searchParams.append('doctor_id', params.doctor_id);
    if (params?.patient_id) searchParams.append('patient_id', params.patient_id);
    if (params?.status) searchParams.append('status', params.status);
    const qs = searchParams.toString();
    return request<Appointment[]>(`/appointments${qs ? `?${qs}` : ''}`);
  },
  createAppointment: (data: AppointmentCreateInput) =>
    request<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cancelAppointment: (id: string) =>
    request<{ id: string; status: string; message: string }>(`/appointments/${id}/cancel`, {
      method: 'PATCH',
    }),

  // AI Coordination & Automatic Scheduling
  triageSymptoms: (patient_id: string, symptoms_text: string) =>
    request<TriageRecommendation>('/ai/triage', {
      method: 'POST',
      body: JSON.stringify({ patient_id, symptoms_text }),
    }),
  getRecommendedSlots: (patient_id: string, symptoms_text: string) =>
    request<TriageRecommendation>('/ai/recommend-slots', {
      method: 'POST',
      body: JSON.stringify({ patient_id, symptoms_text }),
    }),
  autoSchedule: (data: AutoScheduleInput) =>
    request<AutoScheduleResult>('/ai/auto-schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // AI Scheduling Copilot Helpers
  aiTriage: (symptomsText: string) =>
    request<{
      recommended_specialization: string;
      suggested_priority: 'normal' | 'high' | 'urgent';
      urgency_rationale: string;
      suggested_doctors: Doctor[];
      recommended_slots: string[];
    }>('/ai/triage', {
      method: 'POST',
      body: JSON.stringify({ symptoms_text: symptomsText }),
    }),
  aiRecommendSlots: (symptomsText: string) =>
    request<{
      recommended_specialization: string;
      suggested_priority: 'normal' | 'high' | 'urgent';
      urgency_rationale: string;
      suggested_doctors: Doctor[];
      recommended_slots: string[];
    }>('/ai/recommend-slots', {
      method: 'POST',
      body: JSON.stringify({ symptoms_text: symptomsText }),
    }),
};
