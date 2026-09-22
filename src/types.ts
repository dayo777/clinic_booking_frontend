export type Patient = { _id?: string; patient_id?: string; name: string; age?: number; dob: string; gender: string; contact?: ContactInfo; medical_alerts?: MedicalAlerts | null; insurance?: Insurance | null; is_active?: boolean };
export type ContactInfo = { phone: string; email: string; address: string; emergency_contact_name?: string; emergency_contact_phone?: string };
export type MedicalAlerts = { blood_type: string; allergies: string[]; chronic_conditions: string[]; current_medications: string[] };
export type Insurance = { provider_name: string; policy_number: string; group_number?: string; primary_holder_name: string };
export type Doctor = { _id?: string; doctor_id?: string; name: string; specialties: string[]; license_num: string; is_active?: boolean; schedule?: ScheduleSlot[] };
export type ScheduleSlot = { slot_id?: string; start_time: string; end_time: string; is_available?: boolean };
export type Appointment = { _id?: string; appointment_id?: string; slot_id: string; doctor_id: string; patient_id: string; start_time?: string; end_time?: string; specialty: string; status: string; notes?: string };
export const idOf = (item: { _id?: string; patient_id?: string; doctor_id?: string; appointment_id?: string }) => item._id || item.patient_id || item.doctor_id || item.appointment_id || '';
