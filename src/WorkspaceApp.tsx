import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, Stethoscope, Users } from 'lucide-react';
import { api } from './api';
import type { Appointment, Doctor, Patient, ScheduleSlot } from './types';
import { idOf, slotIdOf } from './types';
import './styles.css';

type Workspace = 'patient' | 'doctor';
const dateTime = (value?: string) => value ? new Date(value).toLocaleString() : 'Time not provided';

export default function WorkspaceApp() {
  const [workspace, setWorkspace] = useState<Workspace>('patient');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const doctor = useMemo(() => doctors.find(item => idOf(item) === selectedDoctor), [doctors, selectedDoctor]);

  const loadPeople = async () => {
    setLoading(true);
    setError('');
    try {
      const [patientList, doctorList] = await Promise.all([api.patients(), api.doctors()]);
      setPatients(patientList || []);
      setDoctors(doctorList || []);
      setSelectedPatient(current => current || idOf(patientList?.[0] || {}));
      setSelectedDoctor(current => current || idOf(doctorList?.[0] || {}));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load clinic records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadPeople(); }, []);

  const loadAppointments = async (role: Workspace, id: string) => {
    if (!id) { setAppointments([]); return; }
    try {
      const result = role === 'patient'
        ? await api.appointmentsForPatient(id)
        : await api.appointmentsForDoctor(id);
      setAppointments(result || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load appointments.');
    }
  };

  useEffect(() => {
    if (workspace === 'patient') void loadAppointments('patient', selectedPatient);
    else void loadAppointments('doctor', selectedDoctor);
  }, [workspace, selectedPatient, selectedDoctor]);

  useEffect(() => {
    let cancelled = false;
    setSlots([]);
    setSelectedSlot('');
    if (workspace !== 'patient' || !selectedDoctor) return;
    api.availableDoctorSchedule(selectedDoctor)
      .then(result => { if (!cancelled) setSlots(result || []); })
      .catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load available times.'); });
    return () => { cancelled = true; };
  }, [workspace, selectedDoctor]);

  useEffect(() => { setSpecialty(doctor?.specialties?.[0] || ''); }, [doctor]);

  const refreshCurrentAppointments = () => loadAppointments(workspace, workspace === 'patient' ? selectedPatient : selectedDoctor);
  const act = async (request: () => Promise<unknown>, success: string) => {
    setSaving(true); setError(''); setMessage('');
    try { await request(); setMessage(success); await refreshCurrentAppointments(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The request could not be completed.'); }
    finally { setSaving(false); }
  };

  const bookSlot = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPatient || !selectedDoctor || !selectedSlot || !specialty) return;
    await act(() => api.createAppointment({ slot_id: selectedSlot, doctor_id: selectedDoctor, patient_id: selectedPatient, specialty, notes: notes.trim() || undefined }), 'Appointment request booked.');
    setSelectedSlot(''); setNotes('');
    const available = await api.availableDoctorSchedule(selectedDoctor).catch(() => []);
    setSlots(available || []);
  };

  const createSlots = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDoctor || !startTime) return;
    await act(async () => {
      await api.createSchedule(selectedDoctor, [{ start_time: new Date(startTime).toISOString(), minutes }]);
      setStartTime('');
    }, 'Availability added to your schedule.');
  };

  const runStatus = (action: (id: string) => Promise<unknown>, item: Appointment, success: string) => {
    const id = idOf(item);
    if (id) void act(() => action(id), success);
  };

  if (loading) return <div className="workspace-loading"><span className="spin"><CalendarDays size={24}/></span>Loading appointment workspaces…</div>;

  return <div className="workspace-shell">
    <header className="workspace-header">
      <div className="workspace-brand"><div className="brand-mark"><CalendarDays size={20}/></div><div><strong>CarePoint</strong><span>Appointment workspaces</span></div></div>
      <nav className="workspace-nav" aria-label="Choose appointment workspace">
        <button className={workspace === 'patient' ? 'workspace-tab active' : 'workspace-tab'} onClick={() => { setWorkspace('patient'); setError(''); setMessage(''); }}><Users size={16}/> Patient appointments</button>
        <button className={workspace === 'doctor' ? 'workspace-tab active' : 'workspace-tab'} onClick={() => { setWorkspace('doctor'); setError(''); setMessage(''); }}><Stethoscope size={16}/> Doctor workspace</button>
      </nav>
    </header>
    <main className="workspace-main">
      <div className="workspace-intro"><p className="eyebrow">SEPARATE APPOINTMENT VIEWS</p><h1>{workspace === 'patient' ? 'Patient appointments' : 'Doctor workspace'}</h1><p>{workspace === 'patient' ? 'Choose an available time and manage your bookings.' : 'Publish availability and manage appointments booked with you.'}</p></div>
      <div className="workspace-notice"><strong>Workspace identity</strong><span>This app does not have sign-in yet. Choose the patient or doctor record for this session; these selectors are not access controls.</span></div>
      {error && <div className="alert" role="alert"><span>{error}</span><button onClick={() => void loadPeople()}>Retry</button><button onClick={() => setError('')}>Dismiss</button></div>}
      {message && <div className="workspace-success" role="status"><Check size={17}/>{message}</div>}

      {workspace === 'patient' ? <>
        <section className="workspace-panel">
          <div className="workspace-panel-heading"><div><span className="workspace-icon"><Users size={18}/></span><div><h2>Book an appointment</h2><p>Select a patient, doctor, and an available time.</p></div></div></div>
          <form onSubmit={bookSlot}>
            <div className="workspace-form-grid">
              <label>Patient record<select value={selectedPatient} onChange={event => setSelectedPatient(event.target.value)} required><option value="">Select patient</option>{patients.map(item => <option key={idOf(item)} value={idOf(item)}>{item.name}</option>)}</select></label>
              <label>Doctor<select value={selectedDoctor} onChange={event => setSelectedDoctor(event.target.value)} required><option value="">Select doctor</option>{doctors.map(item => <option key={idOf(item)} value={idOf(item)}>{item.name}</option>)}</select></label>
              <label>Specialty<select value={specialty} onChange={event => setSpecialty(event.target.value)} required disabled={!doctor?.specialties?.length}>{doctor?.specialties?.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>Available time<select value={selectedSlot} onChange={event => setSelectedSlot(event.target.value)} required><option value="">Select a time</option>{slots.map(slot => <option key={slotIdOf(slot)} value={slotIdOf(slot)}>{dateTime(slot.start_time)} – {new Date(slot.end_time).toLocaleTimeString()}</option>)}</select></label>
              <label className="workspace-notes">Notes (optional)<input value={notes} onChange={event => setNotes(event.target.value)} placeholder="Reason for visit" maxLength={500}/></label>
            </div>
            {!patients.length && <p className="workspace-hint">Register a patient in the clinic dashboard first.</p>}
            {doctors.length > 0 && selectedDoctor && !slots.length && <p className="workspace-hint">No available times for this doctor right now.</p>}
            <div className="workspace-actions"><button className="primary-button" disabled={saving || !patients.length || !doctors.length || !slots.length}>{saving ? 'Booking…' : 'Book appointment'}</button></div>
          </form>
        </section>
        <AppointmentTable appointments={appointments} patients={patients} doctors={doctors} role="patient" saving={saving} onCancel={item => runStatus(id => api.cancelAppointment(id, 'patient', 'Canceled by patient.'), item, 'Appointment canceled.')}/>
      </> : <>
        <section className="workspace-panel">
          <div className="workspace-panel-heading"><div><span className="workspace-icon"><Stethoscope size={18}/></span><div><h2>Doctor availability</h2><p>Add appointment times that patients can book.</p></div></div></div>
          <label className="workspace-identity">Doctor record<select value={selectedDoctor} onChange={event => setSelectedDoctor(event.target.value)} required><option value="">Select doctor</option>{doctors.map(item => <option key={idOf(item)} value={idOf(item)}>{item.name}</option>)}</select></label>
          {doctor?.is_active === false && <p className="workspace-hint">This doctor is inactive. Enable the doctor in the clinic dashboard before publishing availability.</p>}
          {doctor && <form className="workspace-form-grid schedule-form" onSubmit={createSlots}>
            <label>Start time<input type="datetime-local" value={startTime} onChange={event => setStartTime(event.target.value)} required/></label>
            <label>Duration<select value={minutes} onChange={event => setMinutes(Number(event.target.value))}><option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={20}>20 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select></label>
            <div className="workspace-submit"><button className="primary-button" disabled={saving || doctor.is_active === false}>{saving ? 'Saving…' : 'Add availability'}</button></div>
            <p className="workspace-hint schedule-hint">Times must be at least 24 hours in the future and may not overlap existing slots.</p>
          </form>}
        </section>
        <AppointmentTable appointments={appointments} patients={patients} doctors={doctors} role="doctor" saving={saving}
          onConfirm={item => runStatus(id => api.confirmAppointment(id), item, 'Appointment confirmed.')}
          onCancel={item => runStatus(id => api.cancelAppointment(id, 'doctor', 'Canceled by doctor.'), item, 'Appointment canceled.')}
          onComplete={item => runStatus(id => api.completeAppointment(id), item, 'Appointment marked complete.')}
          onNoShow={item => runStatus(id => api.noShowAppointment(id), item, 'Appointment marked as no-show.')}/>
      </>}
    </main>
  </div>;
}

function AppointmentTable({ appointments, patients, doctors, role, saving, onCancel, onConfirm, onComplete, onNoShow }: {
  appointments: Appointment[]; patients: Patient[]; doctors: Doctor[]; role: Workspace; saving: boolean;
  onCancel?: (item: Appointment) => void; onConfirm?: (item: Appointment) => void; onComplete?: (item: Appointment) => void; onNoShow?: (item: Appointment) => void;
}) {
  const patientName = (id: string) => patients.find(item => idOf(item) === id)?.name || id;
  const doctorName = (id: string) => doctors.find(item => idOf(item) === id)?.name || id;
  return <section className="workspace-panel appointments-panel">
    <div className="workspace-panel-heading"><div><span className="workspace-icon"><Clock3 size={18}/></span><div><h2>{role === 'patient' ? 'Your bookings' : 'Appointments with you'}</h2><p>{appointments.length} appointment{appointments.length === 1 ? '' : 's'}</p></div></div></div>
    {!appointments.length ? <div className="workspace-empty"><CalendarDays size={23}/><span>No appointments to show yet.</span></div> : <div className="table-wrap"><table><thead><tr><th>When</th><th>Patient</th><th>Doctor</th><th>Specialty</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {appointments.map(item => <tr key={idOf(item)}><td>{dateTime(item.start_time)}</td><td>{patientName(item.patient_id)}</td><td>{doctorName(item.doctor_id)}</td><td>{item.specialty}</td><td><span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span></td><td><div className="button-row compact">
        {role === 'doctor' && item.status === 'Scheduled' && <button className="small-button" disabled={saving} onClick={() => onConfirm?.(item)}>Confirm</button>}
        {role === 'doctor' && ['Scheduled', 'Confirmed'].includes(item.status) && <><button className="small-button" disabled={saving} onClick={() => onComplete?.(item)}>Complete</button><button className="small-button" disabled={saving} onClick={() => onNoShow?.(item)}>No-show</button></>}
        {['Scheduled', 'Confirmed'].includes(item.status) && <button className="small-button" disabled={saving} onClick={() => onCancel?.(item)}>Cancel</button>}
        {!['Scheduled', 'Confirmed'].includes(item.status) && <span className="muted">—</span>}
      </div></td></tr>)}
    </tbody></table></div>}
  </section>;
}
