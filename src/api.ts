import type { Appointment, CreateScheduleSlot, Doctor, Patient, ScheduleSlot, StatusHistoryItem } from './types';

const getRuntimeApiUrl = (): string => {
  if (typeof window !== 'undefined' && (window as any).__APP_ENV__?.VITE_API_URL) {
    return (window as any).__APP_ENV__.VITE_API_URL;
  }
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return 'http://localhost:8080/api';
};

const BASE_URL = getRuntimeApiUrl().replace(/\/$/, '');
const resource = (id: string) => encodeURIComponent(id);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), 'x-api-version': '1', ...(options.headers || {}) },
    });
  } catch {
    throw new Error(`Cannot reach the API at ${BASE_URL}. Check that the backend is running and CORS allows this frontend origin.`);
  }
  const responseText = await response.text();
  if (!response.ok) throw new Error(responseText || `${response.status} ${response.statusText}`);
  if (!responseText.trim()) return undefined as T;
  try {
    return JSON.parse(responseText) as T;
  } catch {
    // The API root returns plain text ("Welcome to v1!"). Other successful
    // endpoints documented here may also return a string ID.
    return responseText as T;
  }
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
const paged = (page: number, limit: number) => `?page=${page}&limit=${limit}`;

export const api = {
  health: () => request<string>(''),
  patients: (page = 1, limit = 100) => request<Patient[]>(`/patient${paged(page, limit)}`),
  patient: (id: string) => request<Patient>(`/patient/${resource(id)}`),
  createPatient: (body: unknown) => request<void>('/patient', json('POST', body)),
  updatePatientContact: (id: string, body: unknown) => request<void>(`/patient/${resource(id)}/contact`, json('PUT', body)),
  updatePatientInsurance: (id: string, body: unknown) => request<void>(`/patient/${resource(id)}/insurance`, json('PUT', body)),
  updatePatientMedicalAlerts: (id: string, body: unknown) => request<void>(`/patient/${resource(id)}/medical-alerts`, json('PUT', body)),
  deletePatient: (id: string) => request<void>(`/patient/${resource(id)}`, { method: 'DELETE' }),
  doctors: (page = 1, limit = 100) => request<Doctor[]>(`/doctor${paged(page, limit)}`),
  inactiveDoctors: (page = 1, limit = 100) => request<Doctor[]>(`/doctor/inactive${paged(page, limit)}`),
  createDoctor: (body: unknown) => request<string>('/doctor', json('POST', body)),
  enableDoctor: (id: string) => request<void>(`/doctor/${resource(id)}/enable`, { method: 'PATCH' }),
  deactivateDoctor: (id: string) => request<void>(`/doctor/${resource(id)}`, { method: 'DELETE' }),
  disableDoctor: (id: string) => request<void>(`/doctor/${resource(id)}/disable-doctor`, { method: 'PATCH' }),
  doctorSchedule: (id: string) => request<ScheduleSlot[]>(`/doctor/${resource(id)}/schedule`),
  availableDoctorSchedule: (id: string) => request<ScheduleSlot[]>(`/doctor/${resource(id)}/active-doctor-schedule`),
  createSchedule: (id: string, slots: CreateScheduleSlot[]) => request<string[]>(`/doctor/${resource(id)}/create-doctor-schedule`, json('POST', slots)),
  appointmentsForPatient: (id: string, page = 1, limit = 100) => request<Appointment[]>(`/appointment/patient/${resource(id)}${paged(page, limit)}`),
  appointmentsForDoctor: (id: string, page = 1, limit = 100) => request<Appointment[]>(`/appointment/doctor/${resource(id)}${paged(page, limit)}`),
  appointment: (id: string) => request<Appointment>(`/appointment/${resource(id)}`),
  createAppointment: (body: unknown) => request<void>('/appointment', json('POST', body)),
  confirmAppointment: (id: string, reason = 'Appointment confirmed by doctor.') => request<void>(`/appointment/${resource(id)}/confirm`, json('PATCH', { reason })),
  cancelAppointment: (id: string, canceled_by: 'patient' | 'doctor', reason = 'Appointment canceled.') => request<void>(`/appointment/${resource(id)}/cancel`, json('PATCH', { canceled_by, reason })),
  completeAppointment: (id: string, reason = 'Consultation completed.') => request<void>(`/appointment/${resource(id)}/complete`, json('PATCH', { reason })),
  noShowAppointment: (id: string, reason = 'Patient did not attend the appointment.') => request<void>(`/appointment/${resource(id)}/no-show`, json('PATCH', { reason })),
  appointmentStatusHistory: (id: string) => request<StatusHistoryItem[]>(`/appointment/${resource(id)}/status-history`),
};
