export type ContactInfo = {
  phone: string;
  email: string;
  address: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
};

export type MedicalAlerts = {
  blood_type: string;
  allergies: string[];
  chronic_conditions: string[];
  current_medications: string[];
};

export type Insurance = {
  provider_name: string;
  policy_number: string;
  group_number?: string;
  primary_holder_name: string;
};

export type Patient = {
  _id?: string;
  patient_id?: string;
  name: string;
  age?: number;
  dob: string;
  gender: string;
  contact?: ContactInfo;
  contact_info?: ContactInfo;
  medical_alerts?: MedicalAlerts | null;
  insurance?: Insurance | null;
};

export type Doctor = {
  _id?: string;
  doctor_id?: string;
  name: string;
  specialties: string[];
  license_num: string;
  is_active?: boolean;
};

// Schedule creation accepts start_time + minutes, but schedule reads return
// start_time/end_time and `_id`. Keep those API shapes separate.
export type ScheduleSlot = {
  _id?: string;
  slot_id?: string;
  doctor_id?: string;
  start_time: string;
  end_time: string;
  is_available?: boolean;
  created_at?: string;
  updated_at?: string | null;
};

export type CreateScheduleSlot = { start_time: string; minutes: number };
export type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Canceled' | 'Completed' | 'NoShow' | string;
export type StatusHistoryItem = { status: AppointmentStatus; changed_at: string; reason?: string };

export type Appointment = {
  _id?: string;
  appointment_id?: string;
  slot_id: string;
  doctor_id: string;
  patient_id: string;
  start_time?: string;
  end_time?: string;
  specialty: string;
  status: AppointmentStatus;
  status_history?: StatusHistoryItem[];
  notes?: string | null;
};

export const idOf = (item: {
  _id?: string;
  patient_id?: string;
  doctor_id?: string;
  appointment_id?: string;
}) => item._id || item.patient_id || item.doctor_id || item.appointment_id || '';

export const slotIdOf = (slot: ScheduleSlot) => slot._id || slot.slot_id || '';
