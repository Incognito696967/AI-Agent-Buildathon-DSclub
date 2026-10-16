import React, { useState } from 'react';
import {
  Stethoscope,
  Search,
  UserPlus,
  Calendar,
} from 'lucide-react';
import type { Doctor, DoctorCreateInput, Appointment } from '../types';

interface DoctorsViewProps {
  doctors: Doctor[];
  appointments: Appointment[];
  loading: boolean;
  onRefresh: () => void;
  onCreateDoctor: (input: DoctorCreateInput) => Promise<void>;
  onBookWithDoctor?: (doctorId: string) => void;
}

export const DoctorsView: React.FC<DoctorsViewProps> = ({
  doctors,
  appointments,
  loading,
  onRefresh,
  onCreateDoctor,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAvailable, setFilterAvailable] = useState<boolean | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('General Medicine');
  const [isAvailable, setIsAvailable] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredDoctors = doctors.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAvailability =
      filterAvailable === 'all' || d.is_available === filterAvailable;
    return matchesSearch && matchesAvailability;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Doctor name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onCreateDoctor({
        name: name.trim().startsWith('Dr.') ? name.trim() : `Dr. ${name.trim()}`,
        specialization: specialization.trim(),
        is_available: isAvailable,
      });
      setShowAddModal(false);
      setName('');
      setSpecialization('General Medicine');
      setIsAvailable(true);
    } catch (err: any) {
      setError(err.message || 'Failed to add doctor to roster.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content-surface">
      <div className="surface-header">
        <div className="surface-title-group">
          <h3>Medical Staff Roster</h3>
          <span className="surface-subtitle">
            {doctors.length} physicians registered • Double-booking protected by GIST
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
            <span>Add Doctor</span>
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by physician name or specialty (e.g., Cardiology)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={filterAvailable === 'all' ? 'all' : filterAvailable ? 'true' : 'false'}
          onChange={(e) => {
            const val = e.target.value;
            setFilterAvailable(val === 'all' ? 'all' : val === 'true');
          }}
          aria-label="Filter availability"
        >
          <option value="all">All Doctors</option>
          <option value="true">Available for Bookings</option>
          <option value="false">Unavailable / On Leave</option>
        </select>
      </div>

      {loading && doctors.length === 0 ? (
        <div className="state-box">
          <div className="state-icon-wrap">
            <Stethoscope size={24} />
          </div>
          <h4 className="state-title">Loading Medical Roster</h4>
          <p className="state-desc">Retrieving physician directory from Supabase...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="state-box">
          <div className="state-icon-wrap">
            <Stethoscope size={24} />
          </div>
          <h4 className="state-title">No Doctors Found</h4>
          <p className="state-desc">
            {doctors.length === 0
              ? 'No doctors found in the database. Add a physician to initialize the scheduling roster.'
              : 'No physician matches the current filter.'}
          </p>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddModal(true)}
          >
            Add First Doctor
          </button>
        </div>
      ) : (
        <div className="roster-grid">
          {filteredDoctors.map((doc) => {
            const docApts = appointments.filter((a) => a.doctor_id === doc.id);
            const activeCount = docApts.filter(
              (a) => a.status === 'scheduled'
            ).length;

            return (
              <div key={doc.id} className="doctor-card">
                <div className="doctor-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div className="doctor-avatar">
                      {doc.name.replace('Dr.', '').trim().charAt(0)}
                    </div>
                    <div className="doctor-info">
                      <h4>{doc.name}</h4>
                      <div className="doctor-specialty">{doc.specialization}</div>
                    </div>
                  </div>
                  <span
                    className={`health-pill ${doc.is_available ? 'connected' : 'disconnected'}`}
                    style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}
                  >
                    <span className="pulsing-dot" />
                    {doc.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </div>

                <div className="doctor-card-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={13} color="#64748B" />
                    <span>{activeCount} scheduled slot(s)</span>
                  </div>
                </div>

                {/* Appointments List for this Physician */}
                <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid #EDF2F7' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={13} color="#0D9488" />
                      <span>Consultation Schedule ({docApts.length})</span>
                    </div>
                    {activeCount > 0 && (
                      <span style={{ fontSize: '0.68rem', color: '#0D9488', fontWeight: 600 }}>
                        {activeCount} Active
                      </span>
                    )}
                  </div>

                  {docApts.length === 0 ? (
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontStyle: 'italic', padding: '0.2rem 0' }}>
                      No consultations scheduled for this physician
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {docApts.map((apt) => {
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
                                {apt.patient_name || 'Patient Record'}
                              </span>
                              <span
                                className={`priority-pill ${apt.priority || 'normal'}`}
                                style={{ fontSize: '0.62rem', padding: '0.08rem 0.35rem' }}
                              >
                                {apt.status === 'cancelled' ? 'Cancelled' : apt.priority?.toUpperCase()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: '0.72rem' }}>
                              <span>30m Slot</span>
                              <span>{aptDate} at {aptTime}</span>
                            </div>
                            {apt.reason && (
                              <div style={{ color: '#64748B', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Notes: {apt.reason}
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

      {/* Add Doctor Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Doctor to Medical Roster</h3>
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
                    Doctor Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Dr. Jennifer Wu"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Specialization <span className="required">*</span>
                  </label>
                  <select
                    className="form-control"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    required
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Diagnostic Medicine">Diagnostic Medicine</option>
                    <option value="Pulmonology">Pulmonology</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                    />
                    <span>Available immediately for appointment booking</span>
                  </label>
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
                  {submitting ? 'Adding...' : 'Add to Roster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
