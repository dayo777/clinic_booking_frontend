import type { Appointment, Doctor, Patient, ScheduleSlot } from './types';

// Prefer runtime config from Docker/container environment, fall back to build-time value
const getRuntimeApiUrl = (): string => {
  // First: try the runtime env config (set by docker/entrypoint.sh)
  if (typeof window !== 'undefined' && (window as any).__APP_ENV__?.VITE_API_URL) {
    return (window as any).__APP_ENV__.VITE_API_URL;
  }
  // Second: use build-time Vite env variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Default fallback
  return 'http://localhost:8080/api';
};

const BASE_URL = getRuntimeApiUrl().replace(/\/$/, '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'x-api-version': '1', ...(options.headers || {}) },
    });
  } catch {
    throw new Error(`Cannot reach the API at ${BASE_URL}. Check that the backend is running and CORS allows this frontend origin.`);
  }
  const responseText = await response.text();
  if (!response.ok) throw new Error(responseText || `${response.status} ${response.statusText}`);
  if (!responseText.trim()) return undefined as T;
  try { return JSON.parse(responseText) as T; } catch { throw new Error(`The API returned an invalid response for ${path}.`); }
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  health: () => request<string>(''),
  patients: (page = 1, limit = 20) => request<Patient[]>(`/patient?page=${page}&limit=${limit}`),
  patient: (id: string) => request<Patient>(`/patient/${id}`),
  createPatient: (body: unknown) => request<void>('/patient', json('POST', body)),
  updatePatientContact: (id: string, body: unknown) => request<void>(`/patient/${id}/contact`, json('PUT', body)),
  updatePatientInsurance: (id: string, body: unknown) => request<void>(`/patient/${id}/insurance`, json('PUT', body)),
  updatePatientMedicalAlerts: (id: string, body: unknown) => request<void>(`/patient/${id}/medical-alerts`, json('PUT', body)),
  deletePatient: (id: string) => request<void>(`/patient/${id}`, { method: 'DELETE' }),
  doctors: (page = 1, limit = 20) => request<Doctor[]>(`/doctor?page=${page}&limit=${limit}`),
  inactiveDoctors: (page = 1, limit = 20) => request<Doctor[]>(`/doctor/inactive?page=${page}&limit=${limit}`),
  createDoctor: (body: unknown) => request<string>('/doctor', json('POST', body)),
  enableDoctor: (id: string) => request<void>(`/doctor/${id}/enable`, { method: 'PATCH' }),
  deactivateDoctor: (id: string) => request<void>(`/doctor/${id}`, { method: 'DELETE' }),
  doctorSchedule: (id: string) => request<ScheduleSlot[]>(`/doctor/${id}/active-doctor-schedule`),
  createSchedule: (id: string, slots: ScheduleSlot[]) => request<ScheduleSlot[]>(`/doctor/${id}/create-doctor-schedule`, json('POST', slots)),
  appointmentsForPatient: (id: string) => request<Appointment[]>(`/appointment/patient/${id}`),
  appointmentsForDoctor: (id: string) => request<Appointment[]>(`/appointment/doctor/${id}`),
  createAppointment: (body: unknown) => request<void>('/appointment', json('POST', body)),
  confirmAppointment: (id: string, reason = 'Confirmed by doctor') => request<void>(`/appointment/${id}/confirm`, json('PATCH', { reason })),
  cancelAppointment: (id: string, reason = 'Canceled by doctor') => request<void>(`/appointment/${id}/cancel`, json('PATCH', { reason })),
  completeAppointment: (id: string, reason = 'Completed') => request<void>(`/appointment/${id}/complete`, json('PATCH', { reason })),
  noShowAppointment: (id: string, reason = 'No-show') => request<void>(`/appointment/${id}/no-show`, json('PATCH', { reason })),
};
