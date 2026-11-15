import { useCallback, useEffect, useState } from 'react';
import { Activity, CalendarDays, Check, CircleAlert, HeartPulse, LoaderCircle, Plus, Search, Stethoscope, Trash2, Users, X } from 'lucide-react';
import { api } from './api';
import type { Appointment, Doctor, Patient, ScheduleSlot, StatusHistoryItem } from './types';
import { idOf, slotIdOf } from './types';
import './styles.css';

type View = 'overview' | 'patients' | 'doctors' | 'appointments';
const readableDate = (value?: string) => value ? new Date(value).toLocaleString() : 'Time not provided';

export default function App() {
  const [view, setView] = useState<View>('overview');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [inactiveDoctors, setInactiveDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [p, d, inactive] = await Promise.all([api.patients(), api.doctors(), api.inactiveDoctors()]);
      setPatients(p || []);
      setDoctors(d || []);
      setInactiveDoctors(inactive || []);
      // Appointment list routes are scoped by patient or doctor, not global.
      // Collect the patient lists so the dashboard reflects the available API.
      const lists = await Promise.all((p || []).map(patient => api.appointmentsForPatient(idOf(patient)).catch(() => [])));
      const unique = new Map<string, Appointment>();
      lists.flat().forEach(item => unique.set(idOf(item), item));
      setAppointments([...unique.values()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load clinic data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try { await action(); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The request could not be completed.'); }
  };

  const updateAppointment = (action: (id: string) => Promise<unknown>, item: Appointment) => {
    const id = idOf(item);
    if (id) void run(() => action(id));
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><HeartPulse size={21}/></div><div><strong>CarePoint</strong><span>Clinic operations</span></div></div>
      <nav>{([['overview', 'Overview', Activity], ['patients', 'Patients', Users], ['doctors', 'Doctors', Stethoscope], ['appointments', 'Appointments', CalendarDays]] as const).map(([key, label, Icon]) => <button key={key} className={view === key ? 'nav-item active' : 'nav-item'} onClick={() => setView(key)}><Icon size={18}/>{label}</button>)}</nav>
      <div className="sidebar-footer">API v1 connected</div>
    </aside>
    <main className="main">
      <header className="topbar"><div><p className="eyebrow">CLINIC BOOKING API</p><h1>{view[0].toUpperCase() + view.slice(1)}</h1></div><button className="avatar">CP</button></header>
      {error && <div className="alert"><CircleAlert size={18}/><span>{error}</span><button onClick={() => void load()}>Retry</button><button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
      {loading ? <div className="loading"><LoaderCircle className="spin" size={28}/><span>Loading clinic data…</span></div> : <>
        {view === 'overview' && <Overview patients={patients} doctors={doctors} appointments={appointments} onNavigate={setView}/>}
        {view === 'patients' && <PatientList patients={patients} onOpen={setSelectedPatient} onCreated={() => void load()} onArchive={patient => { const id = idOf(patient); if (id && window.confirm(`Archive ${patient.name}?`)) void run(() => api.deletePatient(id)); }}/>} 
        {view === 'doctors' && <DoctorList doctors={showInactive ? inactiveDoctors : doctors} inactive={showInactive} onToggle={() => setShowInactive(value => !value)} onOpen={setSelectedDoctor} onCreated={() => void load()}/>} 
        {view === 'appointments' && <AppointmentList appointments={appointments} patients={patients} doctors={doctors} onUpdate={updateAppointment} onChanged={() => void load()} onError={setError}/>} 
      </>}
    </main>
    {selectedDoctor && <DoctorDrawer doctor={selectedDoctor} inactive={selectedDoctor.is_active === false || showInactive} patients={patients} onClose={() => setSelectedDoctor(null)} onEnable={() => void run(() => api.enableDoctor(idOf(selectedDoctor)))} onDeactivate={() => { const id = idOf(selectedDoctor); if (id) void run(() => api.deactivateDoctor(id)); }} onError={setError} onChanged={() => void load()}/>}
    {selectedPatient && <PatientDrawer patient={selectedPatient} onClose={() => setSelectedPatient(null)}/>}
  </div>;
}

function Overview({ patients, doctors, appointments, onNavigate }: { patients: Patient[]; doctors: Doctor[]; appointments: Appointment[]; onNavigate: (view: View) => void }) {
  return <><section className="welcome"><div><p className="eyebrow">YOUR CLINIC AT A GLANCE</p><h2>Good day, team</h2><p>Manage people, schedules, and appointments from one place.</p></div><div className="welcome-icon"><HeartPulse size={34}/></div></section>
    <div className="stats-grid"><Stat label="Active patients" value={patients.length}/><Stat label="Active doctors" value={doctors.length}/><Stat label="Appointments" value={appointments.length}/><Stat label="Awaiting confirmation" value={appointments.filter(a => a.status === 'Scheduled').length}/></div>
    <section className="panel"><div className="panel-heading"><div><h2>Quick access</h2><p>Go to a clinic workspace</p></div></div><div className="quick-grid">{([['patients','Patients',Users],['doctors','Doctors',Stethoscope],['appointments','Appointments',CalendarDays]] as const).map(([key,label,Icon]) => <button key={key} className="quick-card" onClick={() => onNavigate(key)}><Icon size={20}/><span>{label}</span><span className="chevron">›</span></button>)}</div></section>
    <section className="panel"><div className="panel-heading"><div><h2>Upcoming activity</h2><p>Appointments loaded from patient records</p></div><button className="text-button" onClick={() => onNavigate('appointments')}>All appointments</button></div><AppointmentRows appointments={appointments.slice(0,5)} patients={patients} doctors={doctors}/></section>
  </>;
}
function Stat({ label, value }: { label: string; value: number }) { return <div className="stat"><div><span>{label}</span><strong>{value}</strong></div></div>; }
function Header({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <div className="page-heading"><div><p className="eyebrow">CAREPOINT</p><h2>{title}</h2><p>{description}</p></div>{action}</div>; }

function PatientList({ patients, onOpen, onCreated, onArchive }: { patients: Patient[]; onOpen: (patient: Patient) => void; onCreated: () => void; onArchive: (patient: Patient) => void }) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const list = patients.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || (p.contact?.email || p.contact_info?.email || '').toLowerCase().includes(query.toLowerCase()));
  return <><Header title="Patients" description="Search, register, review, or archive active patients." action={<button className="primary-button" onClick={() => setAdding(value => !value)}><Plus size={16}/> Add patient</button>}/>
    {adding && <PatientForm onCancel={() => setAdding(false)} onCreated={() => { setAdding(false); onCreated(); }}/>}<div className="search-box"><Search size={17}/><input aria-label="Search patients" placeholder="Search by name or email" value={query} onChange={event => setQuery(event.target.value)}/></div>
    <div className="panel table-panel">{list.length ? <div className="table-wrap"><table><thead><tr><th>Patient</th><th>Patient ID</th><th>Age</th><th>Contact</th><th></th></tr></thead><tbody>{list.map(patient => <tr key={idOf(patient)}><td><button className="person-link" onClick={() => onOpen(patient)}>{patient.name}</button></td><td className="muted">{idOf(patient)}</td><td>{patient.age ?? '—'}</td><td>{patient.contact?.email || patient.contact_info?.email || '—'}</td><td><button className="icon-button danger" aria-label={`Archive ${patient.name}`} title="Archive patient" onClick={() => onArchive(patient)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div> : <Empty text="No matching patients."/>}</div>
  </>;
}
function PatientForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError('');
    const data = new FormData(event.currentTarget);
    try { await api.createPatient({ name: data.get('name'), dob: data.get('dob'), gender: data.get('gender'), contact_info: { phone: data.get('phone'), email: data.get('email'), address: data.get('address'), emergency_contact_name: data.get('emergencyName') || undefined, emergency_contact_phone: data.get('emergencyPhone') || undefined } }); onCreated(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not register patient.'); } finally { setSaving(false); }
  };
  return <form className="panel form-panel" onSubmit={submit}><div className="panel-heading"><div><h2>Register patient</h2><p>Required patient and contact details</p></div><button type="button" className="icon-button" onClick={onCancel}><X size={18}/></button></div><div className="form-grid"><Field label="Full name" name="name" required/><Field label="Date of birth" name="dob" type="date" required/><label>Gender<select name="gender" required defaultValue=""><option value="" disabled>Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label><Field label="Phone" name="phone" required/><Field label="Email" name="email" type="email" required/><Field label="Address" name="address" required/><Field label="Emergency contact name" name="emergencyName"/><Field label="Emergency contact phone" name="emergencyPhone"/></div>{error && <p className="form-error">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Register patient'}</button></div></form>;
}

function DoctorList({ doctors, inactive, onToggle, onOpen, onCreated }: { doctors: Doctor[]; inactive: boolean; onToggle: () => void; onOpen: (doctor: Doctor) => void; onCreated: () => void }) {
  const [adding, setAdding] = useState(false);
  return <><Header title="Doctors" description="Manage doctor profiles and their appointment schedules." action={<div className="button-row"><button className="secondary-button" onClick={onToggle}>{inactive ? 'Show active' : 'Show inactive'}</button>{!inactive && <button className="primary-button" onClick={() => setAdding(value => !value)}><Plus size={16}/> Add doctor</button>}</div>}/>
    {adding && <DoctorForm onCancel={() => setAdding(false)} onCreated={() => { setAdding(false); onCreated(); }}/>}<div className="doctor-grid">{doctors.map(doctor => <button key={idOf(doctor)} className="doctor-card" onClick={() => onOpen(doctor)}><div className="doctor-avatar"><Stethoscope size={21}/></div><div className="doctor-card-copy"><strong>{doctor.name}</strong><span>{doctor.specialties.join(', ')}</span><small>{inactive ? 'Inactive' : doctor.license_num}</small></div><span className="chevron">›</span></button>)}</div>{!doctors.length && <Empty text={inactive ? 'No inactive doctors.' : 'No doctors found.'}/>}</>;
}
function DoctorForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(''); const data = new FormData(event.currentTarget);
    try { await api.createDoctor({ name: data.get('name'), license_num: data.get('license'), specialties: String(data.get('specialties')).split(',').map(value => value.trim().toLowerCase()).filter(Boolean) }); onCreated(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not register doctor.'); } finally { setSaving(false); }
  };
  return <form className="panel form-panel" onSubmit={submit}><div className="panel-heading"><div><h2>Register doctor</h2><p>Enter specialties as comma-separated API values, e.g. gp, derm.</p></div><button type="button" className="icon-button" onClick={onCancel}><X size={18}/></button></div><div className="form-grid"><Field label="Doctor name" name="name" required/><Field label="License number" name="license" required/><Field label="Specialties" name="specialties" placeholder="gp, derm" required/></div>{error && <p className="form-error">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Register doctor'}</button></div></form>;
}

function DoctorDrawer({ doctor, inactive, patients, onClose, onEnable, onDeactivate, onChanged, onError }: { doctor: Doctor; inactive: boolean; patients: Patient[]; onClose: () => void; onEnable: () => void; onDeactivate: () => void; onChanged: () => void; onError: (message: string) => void }) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]); const [available, setAvailable] = useState<ScheduleSlot[]>([]); const [refresh, setRefresh] = useState(0);
  const [startTime, setStartTime] = useState(''); const [minutes, setMinutes] = useState(30); const [saving, setSaving] = useState(false);
  useEffect(() => { const id = idOf(doctor); if (!id) return; Promise.all([api.doctorSchedule(id), api.availableDoctorSchedule(id)]).then(([all, open]) => { setSlots(all); setAvailable(open); }).catch(cause => onError(cause instanceof Error ? cause.message : 'Could not load schedule.')); }, [doctor, refresh, onError]);
  const addSlot = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); onError(''); try { const id = idOf(doctor); await api.createSchedule(id, [{ start_time: new Date(startTime).toISOString(), minutes: Number(minutes) }]); setStartTime(''); setRefresh(value => value + 1); onChanged(); } catch (cause) { onError(cause instanceof Error ? cause.message : 'Could not create schedule.'); } finally { setSaving(false); } };
  const book = async (slot: ScheduleSlot, patientId: string) => { onError(''); try { await api.createAppointment({ slot_id: slotIdOf(slot), doctor_id: idOf(doctor), patient_id: patientId, specialty: doctor.specialties[0], notes: '' }); setRefresh(value => value + 1); onChanged(); } catch (cause) { onError(cause instanceof Error ? cause.message : 'Could not create appointment.'); } };
  return <Drawer onClose={onClose}><p className="eyebrow">DOCTOR PROFILE</p><h2>{doctor.name}</h2><p className="muted">{doctor.license_num}</p><div className="detail-block"><span>Specialties</span><strong>{doctor.specialties.join(', ') || 'Not specified'}</strong></div><div className="form-actions left">{inactive ? <button className="primary-button" onClick={onEnable}><Check size={16}/> Enable doctor</button> : <button className="secondary-button danger-text" onClick={onDeactivate}><Trash2 size={16}/> Deactivate</button>}</div>
    {!inactive && <><div className="section-divider"/><h3>Create schedule slot</h3><p className="muted">Slots must start at least 24 hours in the future and last 10–60 minutes.</p><form className="slot-form" onSubmit={addSlot}><label>Start time<input type="datetime-local" value={startTime} onChange={event => setStartTime(event.target.value)} required/></label><label>Minutes<input type="number" min="10" max="60" value={minutes} onChange={event => setMinutes(Number(event.target.value))} required/></label><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Add slot'}</button></form>
    <h3>Available slots</h3>{available.length ? available.map(slot => <SlotRow key={slotIdOf(slot)} slot={slot} patients={patients} onBook={patientId => void book(slot, patientId)}/>) : <p className="muted">No available future slots.</p>}<h3>Full schedule</h3>{slots.length ? slots.map(slot => <div className="slot-row" key={slotIdOf(slot)}><span>{readableDate(slot.start_time)} – {new Date(slot.end_time).toLocaleTimeString()}</span><strong>{slot.is_available ? 'Available' : 'Booked'}</strong></div>) : <p className="muted">No schedule slots yet.</p>}</>}
  </Drawer>;
}
function SlotRow({ slot, patients, onBook }: { slot: ScheduleSlot; patients: Patient[]; onBook: (patientId: string) => void }) { const [patientId, setPatientId] = useState(''); return <div className="slot-row slot-book"><span>{readableDate(slot.start_time)} – {new Date(slot.end_time).toLocaleTimeString()}</span><select aria-label="Select patient to book" value={patientId} onChange={event => setPatientId(event.target.value)}><option value="">Select patient</option>{patients.map(patient => <option key={idOf(patient)} value={idOf(patient)}>{patient.name}</option>)}</select><button className="secondary-button" disabled={!patientId || !slotIdOf(slot)} onClick={() => onBook(patientId)}>Book</button></div>; }

function AppointmentList({ appointments, patients, doctors, onUpdate, onChanged, onError }: { appointments: Appointment[]; patients: Patient[]; doctors: Doctor[]; onUpdate: (action: (id: string) => Promise<unknown>, item: Appointment) => void; onChanged: () => void; onError: (message: string) => void }) {
  const [historyId, setHistoryId] = useState(''); const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const showHistory = async (item: Appointment) => { const id = idOf(item); if (!id) return; setHistoryId(id); try { setHistory(await api.appointmentStatusHistory(id)); } catch (cause) { onError(cause instanceof Error ? cause.message : 'Could not load appointment history.'); } };
  return <><Header title="Appointments" description="Review appointments and perform supported status transitions."/><div className="panel table-panel"><AppointmentRows appointments={appointments} patients={patients} doctors={doctors} onUpdate={onUpdate} onHistory={item => void showHistory(item)} onRefresh={onChanged}/></div>{historyId && <div className="panel history-panel"><div className="panel-heading"><div><h2>Status history</h2><p>Appointment {historyId}</p></div><button className="icon-button" onClick={() => setHistoryId('')}><X size={18}/></button></div>{history.length ? history.map((entry, index) => <div className="history-item" key={`${entry.changed_at}-${index}`}><strong>{entry.status}</strong><span>{readableDate(entry.changed_at)}</span><p>{entry.reason || '—'}</p></div>) : <Empty text="No status history."/>}</div>}</>;
}
function AppointmentRows({ appointments, patients, doctors, onUpdate, onHistory }: { appointments: Appointment[]; patients: Patient[]; doctors: Doctor[]; onUpdate?: (action: (id: string) => Promise<unknown>, item: Appointment) => void; onHistory?: (item: Appointment) => void; onRefresh?: () => void }) {
  const patientName = (id: string) => patients.find(item => idOf(item) === id)?.name || id;
  const doctorName = (id: string) => doctors.find(item => idOf(item) === id)?.name || id;
  if (!appointments.length) return <Empty text="No appointments found."/>;
  return <div className="table-wrap"><table><thead><tr><th>When</th><th>Patient</th><th>Doctor</th><th>Specialty</th><th>Status</th><th>Actions</th></tr></thead><tbody>{appointments.map(item => <tr key={idOf(item)}><td>{readableDate(item.start_time)}</td><td>{patientName(item.patient_id)}</td><td>{doctorName(item.doctor_id)}</td><td>{item.specialty}</td><td><span className={`status status-${item.status.toLowerCase()}`}>{item.status}</span></td><td><div className="button-row compact">{onUpdate && item.status === 'Scheduled' && <button className="small-button" onClick={() => onUpdate(api.confirmAppointment, item)}>Confirm</button>}{onUpdate && ['Scheduled','Confirmed'].includes(item.status) && <button className="small-button subtle-danger" onClick={() => onUpdate(id => api.cancelAppointment(id, 'doctor'), item)}>Cancel</button>}{onUpdate && item.status === 'Confirmed' && <><button className="small-button" onClick={() => onUpdate(api.completeAppointment, item)}>Complete</button><button className="small-button" onClick={() => onUpdate(api.noShowAppointment, item)}>No-show</button></>}{onHistory && <button className="small-button" onClick={() => onHistory(item)}>History</button>}</div></td></tr>)}</tbody></table></div>;
}
function PatientDrawer({ patient, onClose }: { patient: Patient; onClose: () => void }) { const contact = patient.contact || patient.contact_info; return <Drawer onClose={onClose}><p className="eyebrow">PATIENT PROFILE</p><h2>{patient.name}</h2><p className="muted">{idOf(patient)}</p><div className="detail-block"><span>Date of birth</span><strong>{patient.dob} {patient.age ? `· ${patient.age} years` : ''}</strong></div><div className="detail-block"><span>Gender</span><strong>{patient.gender}</strong></div><div className="detail-block"><span>Email</span><strong>{contact?.email || '—'}</strong></div><div className="detail-block"><span>Phone</span><strong>{contact?.phone || '—'}</strong></div><div className="detail-block"><span>Address</span><strong>{contact?.address || '—'}</strong></div><div className="detail-block"><span>Medical alerts</span><strong>{patient.medical_alerts?.allergies?.join(', ') || 'None listed'}</strong></div><div className="detail-block"><span>Insurance</span><strong>{patient.insurance?.provider_name || 'None listed'}</strong></div></Drawer>; }
function Drawer({ children, onClose }: { children: React.ReactNode; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><aside className="modal drawer"><button className="icon-button drawer-close" aria-label="Close" onClick={onClose}><X size={18}/></button>{children}</aside></div>; }
function Field({ label, name, type = 'text', required = false, placeholder }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) { return <label>{label}<input name={name} type={type} required={required} placeholder={placeholder}/></label>; }
function Empty({ text }: { text: string }) { return <div className="empty"><CalendarDays size={22}/>{text}</div>; }
