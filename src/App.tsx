import { useCallback, useEffect, useState } from 'react';
import { Activity, CalendarDays, Check, CircleAlert, HeartPulse, LoaderCircle, Power, Search, Stethoscope, Trash2, Users, X } from 'lucide-react';
import { api } from './api';
import type { Appointment, Doctor, Patient } from './types';
import { idOf } from './types';
import './styles.css';

type View = 'overview' | 'patients' | 'doctors' | 'appointments';

export default function App() {
  const [view, setView] = useState<View>('overview');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [inactiveDoctors, setInactiveDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [p, d, inactive] = await Promise.all([api.patients(), api.doctors(), api.inactiveDoctors()]);
      setPatients(p || []); setDoctors(d || []); setInactiveDoctors(inactive || []);
      const lists = await Promise.all((p || []).slice(0, 20).map(patient => api.appointmentsForPatient(idOf(patient)).catch(() => [])));
      setAppointments(lists.flat());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load clinic data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientAppointments(await api.appointmentsForPatient(idOf(patient)).catch(() => []));
  };
  const enableDoctor = async (doctor: Doctor) => { await api.enableDoctor(idOf(doctor)); setSelectedDoctor(null); await load(); };
  const deactivateDoctor = async (doctor: Doctor) => { await api.deactivateDoctor(idOf(doctor)); setSelectedDoctor(null); await load(); };

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><HeartPulse size={21}/></div><div><strong>CarePoint</strong><span>Clinic operations</span></div></div><nav>
      {([['overview', 'Overview', Activity], ['patients', 'Patients', Users], ['doctors', 'Doctors', Stethoscope], ['appointments', 'Appointments', CalendarDays]] as const).map(([key, label, Icon]) => <button key={key} className={view === key ? 'nav-item active' : 'nav-item'} onClick={() => setView(key)}><Icon size={18}/>{label}</button>)}
    </nav><div className="sidebar-footer">API v1 connected</div></aside>
    <main className="main"><header className="topbar"><div><p className="eyebrow">CLINIC BOOKING API</p><h1>{view[0].toUpperCase() + view.slice(1)}</h1></div><button className="avatar">DU</button></header>
      {error && <div className="alert"><CircleAlert size={18}/><span>{error}</span><button onClick={load}>Retry</button></div>}
      {loading ? <div className="loading"><LoaderCircle className="spin" size={28}/><span>Loading clinic data…</span></div> : <>
        {view === 'overview' && <Overview patients={patients} doctors={doctors} appointments={appointments} onNavigate={setView}/>} 
        {view === 'patients' && <PatientList patients={patients} onOpen={openPatient}/>} 
        {view === 'doctors' && <DoctorList doctors={showInactive ? inactiveDoctors : doctors} inactive={showInactive} onToggle={() => setShowInactive(value => !value)} onOpen={setSelectedDoctor}/>} 
        {view === 'appointments' && <AppointmentList appointments={appointments}/>} 
      </>}
    </main>
    {selectedDoctor && <DoctorDrawer doctor={selectedDoctor} inactive={selectedDoctor.is_active === false || showInactive} onClose={() => setSelectedDoctor(null)} onEnable={() => enableDoctor(selectedDoctor)} onDeactivate={() => deactivateDoctor(selectedDoctor)}/>} 
    {selectedPatient && <PatientDrawer patient={selectedPatient} appointments={patientAppointments} onClose={() => setSelectedPatient(null)}/>} 
  </div>;
}

function Overview({ patients, doctors, appointments, onNavigate }: { patients: Patient[]; doctors: Doctor[]; appointments: Appointment[]; onNavigate: (view: View) => void }) { return <><section className="hero"><div><p className="eyebrow light">GOOD MORNING, ADMIN</p><h2>Your clinic, at a glance.</h2><p>Keep every patient, provider and appointment moving smoothly.</p></div><HeartPulse size={58}/></section><div className="stat-grid"><Stat label="Total patients" value={patients.length}/><Stat label="Active doctors" value={doctors.length}/><Stat label="Appointments" value={appointments.length}/><Stat label="Scheduled" value={appointments.filter(a => a.status === 'Scheduled').length}/></div><div className="panel quick-actions"><button onClick={() => onNavigate('patients')}><Users/> Manage patients</button><button onClick={() => onNavigate('doctors')}><Stethoscope/> Manage doctors</button><button onClick={() => onNavigate('appointments')}><CalendarDays/> Review appointments</button></div></> }
function Stat({ label, value }: { label: string; value: number }) { return <div className="stat"><div><span>{label}</span><strong>{value}</strong></div></div> }
function Header({ title, description }: { title: string; description: string }) { return <div className="page-heading"><div><p className="eyebrow">CAREPOINT</p><h2>{title}</h2><p>{description}</p></div></div> }
function PatientList({ patients, onOpen }: { patients: Patient[]; onOpen: (patient: Patient) => void }) { const [query, setQuery] = useState(''); const list = patients.filter(p => p.name.toLowerCase().includes(query.toLowerCase())); return <><Header title="Patients" description="Select a patient to view contact details and appointments."/><div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Search patients…" value={query} onChange={event => setQuery(event.target.value)}/></div></div><div className="panel table-wrap"><table><thead><tr><th>Patient</th><th>Date of birth</th><th>Gender</th><th>Contact</th><th/></tr></thead><tbody>{list.map(patient => <tr key={idOf(patient)}><td><b>{patient.name}</b><small>{idOf(patient)}</small></td><td>{patient.dob}</td><td>{patient.gender}</td><td>{patient.contact?.email || '—'}</td><td><button className="small-button confirm" onClick={() => onOpen(patient)}>View details</button></td></tr>)}</tbody></table>{!list.length && <Empty text="No patients found"/>}</div></> }
function DoctorList({ doctors, inactive, onToggle, onOpen }: { doctors: Doctor[]; inactive: boolean; onToggle: () => void; onOpen: (doctor: Doctor) => void }) { return <><Header title="Doctors" description="Review active and inactive doctors, schedules, and availability."/><div className="toolbar"><button className="secondary" onClick={onToggle}>{inactive ? 'Show active doctors' : 'Show inactive doctors'}</button><span className="muted">{doctors.length} {inactive ? 'inactive' : 'active'} doctors</span></div><div className="doctor-grid">{doctors.map(doctor => <div className="panel doctor-card" key={idOf(doctor)}><div className="doctor-top"><div className="person-avatar blue-bg"><Stethoscope size={21}/></div><span className={inactive ? 'status inactive' : 'status'}>{inactive ? 'Inactive' : 'Active'}</span></div><h3>{doctor.name}</h3><p className="muted">{doctor.license_num}</p><div className="specialties">{doctor.specialties.map(specialty => <span className="tag" key={specialty}>{specialty}</span>)}</div><button className="small-button confirm" onClick={() => onOpen(doctor)}>View details <ChevronRightFallback/></button></div>)}</div>{!doctors.length && <Empty text={inactive ? 'No inactive doctors' : 'No active doctors'}/>}</> }
function ChevronRightFallback() { return <span>›</span> }
function AppointmentList({ appointments }: { appointments: Appointment[] }) { return <><Header title="Appointments" description="Review appointment status and patient references."/><div className="panel table-wrap"><table><thead><tr><th>Appointment</th><th>Patient</th><th>Doctor</th><th>Specialty</th><th>Status</th></tr></thead><tbody>{appointments.map(appointment => <tr key={idOf(appointment)}><td>{idOf(appointment) || appointment.slot_id}</td><td>{appointment.patient_id}</td><td>{appointment.doctor_id}</td><td>{appointment.specialty}</td><td><span className={`status ${appointment.status.toLowerCase()}`}>{appointment.status}</span></td></tr>)}</tbody></table>{!appointments.length && <Empty text="No appointments found"/>}</div></> }
function Empty({ text }: { text: string }) { return <div className="empty"><CalendarDays size={22}/>{text}</div> }
function Drawer({ children, onClose }: { children: React.ReactNode; onClose: () => void }) { return <div className="modal-backdrop"><aside className="modal drawer"><button className="icon-button" onClick={onClose}><X/></button>{children}</aside></div> }
function DoctorDrawer({ doctor, inactive, onClose, onEnable, onDeactivate }: { doctor: Doctor; inactive: boolean; onClose: () => void; onEnable: () => void; onDeactivate: () => void }) { return <Drawer onClose={onClose}><p className="eyebrow">DOCTOR DETAILS</p><h2>{doctor.name}</h2><p className="muted">{doctor.license_num}</p><p>Status: <span className={inactive ? 'status inactive' : 'status'}>{inactive ? 'Inactive' : 'Active'}</span></p><h3>Specialties</h3><div className="specialties">{doctor.specialties.map(s => <span className="tag" key={s}>{s}</span>)}</div><div className="form-actions">{inactive ? <button className="primary" onClick={onEnable}><Power size={15}/> Enable doctor</button> : <button className="secondary" onClick={onDeactivate}><Trash2 size={15}/> Deactivate</button>}</div></Drawer> }
function PatientDrawer({ patient, appointments, onClose }: { patient: Patient; appointments: Appointment[]; onClose: () => void }) { return <Drawer onClose={onClose}><p className="eyebrow">PATIENT DETAILS</p><h2>{patient.name}</h2><p className="muted">{idOf(patient)}</p><h3>Contact</h3><p>{patient.contact?.email || 'No email recorded'}<br/>{patient.contact?.phone || 'No phone recorded'}<br/>{patient.contact?.address || 'No address recorded'}</p><h3>Appointments ({appointments.length})</h3>{appointments.map(appointment => <div className="status-line" key={idOf(appointment)}><CalendarDays size={15}/><span>{appointment.specialty} · {appointment.status}</span></div>)}{!appointments.length && <p className="muted">No appointments found.</p>}</Drawer> }
