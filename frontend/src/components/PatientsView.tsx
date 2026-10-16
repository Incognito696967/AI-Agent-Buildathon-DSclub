import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Calendar,
  Phone,
} from 'lucide-react';
import type { Patient, PatientCreateInput, Appointment } from '../types';

interface PatientsViewProps {
  patients: Patient[];
  appointments: Appointment[];
  loading: boolean;
  onRefresh: () => void;
  onCreatePatient: (input: PatientCreateInput) => Promise<void>;
  onBookForPatient?: (patientId: string) => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  appointments,
  loading,
  onRefresh,
  onCreatePatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(30);
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredPatients = patients.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.contact || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Patient name is required.');
      return;
    }
    if (age <= 0) {
      setError('Age must be greater than 0.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onCreatePatient({
        name: name.trim(),
        age: Number(age),
        contact: contact.trim() || undefined,
      });
      setShowAddModal(false);
      setName('');
      setAge(30);
      setContact('');
    } catch (err: any) {
      setError(err.message || 'Failed to register patient.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content-surface">
      <div className="surface-header">
        <div className="surface-title-group">
          <h3>Registered Patients</h3>
          <span className="surface-subtitle">
            {patients.length} patient records in database • Triage history linked
          </span>
        </div>
        <div className="surface-actions">
          <button className="btn btn-outline btn-sm" onClick={onRefresh}>
            Refresh
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={15} />
            <span>Add Patient</span>
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search patients by name or contact number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading && patients.length === 0 ? (
        <div className="state-box">
          <div className="state-icon-wrap">
            <Users size={24} />
          </div>
          <h4 className="state-title">Loading Patients</h4>
          <p className="state-desc">Retrieving patient roster from Supabase...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="state-box">
          <div className="state-icon-wrap">
            <Users size={24} />
          </div>
          <h4 className="state-title">No Patients Found</h4>
          <p className="state-desc">
            {patients.length === 0
              ? 'No patients have been registered yet. Add a patient to begin booking.'
              : 'No patient matches your search term.'}
          </p>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddModal(true)}
          >
            Register First Patient
          </button>
        </div>
      ) : (
        <div className="patient-grid">
          {filteredPatients.map((patient) => {
            const patientApts = appointments.filter(
              (a) => a.patient_id === patient.id
            );
            const activeCount = patientApts.filter(
              (a) => a.status === 'scheduled'
            ).length;

            return (
              <div key={patient.id} className="patient-card">
                <div className="patient-card-header">
                  <div className="patient-avatar">
                    {patient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="patient-name">{patient.name}</div>
                    <div className="patient-meta">
                      {patient.age} years old • ID: {patient.id.slice(0, 8)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: '#64748B' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={13} />
                    <span>{patient.contact || 'No phone provided'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={13} />
                    <span>
                      {activeCount > 0
                        ? `${activeCount} upcoming appointment(s)`
                        : 'No upcoming appointments'}
                    </span>
                  </div>
                </div>

                {/* Appointments List for this Patient */}
                <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid #EDF2F7' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={13} color="#0D9488" />
                      <span>Appointments ({patientApts.length})</span>
                    </div>
                    {activeCount > 0 && (
                      <span style={{ fontSize: '0.68rem', color: '#0D9488', fontWeight: 600 }}>
                        {activeCount} Active
                      </span>
                    )}
                  </div>

                  {patientApts.length === 0 ? (
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontStyle: 'italic', padding: '0.2rem 0' }}>
                      No appointments recorded for this patient
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {patientApts.map((apt) => {
                        const aptDate = new Date(apt.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
                        const aptTime = new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return (
                          <div
                            key={apt.id}
                            style={{
                              padding: '0.45rem 0.6rem',
                              borderRadius: '6px',
                              background: apt.status === 'cancelled' ? '#F8FAFC' : '#F0FDF8',
                              border: `1px solid ${apt.status === 'cancelled' ? '#E2E8F0' : '#CCFBF1'}`,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.2rem',
                              fontSize: '0.76rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 600, color: '#142D4E' }}>
                                {apt.doctor_name || 'Assigned Doctor'}
                              </span>
                              <span
                                className={`priority-pill ${apt.priority || 'normal'}`}
                                style={{ fontSize: '0.62rem', padding: '0.08rem 0.35rem' }}
                              >
                                {apt.status === 'cancelled' ? 'Cancelled' : apt.priority?.toUpperCase()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: '0.72rem' }}>
                              <span>{apt.specialization || 'Consultation'}</span>
                              <span>{aptDate} at {aptTime}</span>
                            </div>
                            {apt.reason && (
                              <div style={{ color: '#64748B', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Reason: {apt.reason}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Register New Patient</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}

                <div className="form-group">
                  <label>
                    Full Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Eleanor Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Age <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="125"
                    className="form-control"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value, 10))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Phone / Email</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. +1-555-0145"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                  <div className="form-help">
                    Contact details used for consultation follow-up and confirmation.
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
