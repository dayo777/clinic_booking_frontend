import type { Appointment, Doctor, Patient, ScheduleSlot } from './types';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/, '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-api-version': '1', ...(options.headers || {}) },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${response.status} ${response.statusText}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<string>(''),
  patients: (page = 1, limit = 20) => request<Patient[]>(`/patient?page=${page}&limit=${limit}`),
  createPatient: (body: unknown) => request<void>('/patient', { method: 'POST', body: JSON.stringify(body) }),
  deletePatient: (id: string) => request<void>(`/patient/${id}`, { method: 'DELETE' }),
  doctors: (page = 1, limit = 20) => request<Doctor[]>(`/doctor?page=${page}&limit=${limit}`),
  createDoctor: (body: unknown) => request<string>('/doctor', { method: 'POST', body: JSON.stringify(body) }),
  doctorSchedule: (id: string) => request<ScheduleSlot[]>(`/doctor/${id}/active-doctor-schedule`),
  createSchedule: (id: string, slots: ScheduleSlot[]) => request<ScheduleSlot[]>(`/doctor/${id}/create-doctor-schedule`, { method: 'POST', body: JSON.stringify(slots) }),
  appointmentsForPatient: (id: string) => request<Appointment[]>(`/appointment/patient/${id}`),
  appointmentsForDoctor: (id: string) => request<Appointment[]>(`/appointment/doctor/${id}`),
  createAppointment: (body: unknown) => request<void>('/appointment', { method: 'POST', body: JSON.stringify(body) }),
  confirmAppointment: (id: string, reason = 'Confirmed by doctor') => request<void>(`/appointment/${id}/confirm`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  cancelAppointment: (id: string, reason = 'Canceled by doctor') => request<void>(`/appointment/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
};
