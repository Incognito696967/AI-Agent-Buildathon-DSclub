import React, { useState } from 'react';
import {
  Clock,
  User,
  Stethoscope,
  XCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { Appointment, AppointmentPriority, AppointmentStatus } from '../types';

interface AppointmentsViewProps {
  appointments: Appointment[];
  loading: boolean;
  onCancel: (id: string) => Promise<void>;
  onRefresh: () => void;
  onOpenBooking: () => void;
  initialPriorityFilter?: AppointmentPriority | 'all';
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  loading,
  onCancel,
  onRefresh,
  onOpenBooking,
  initialPriorityFilter = 'all',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<AppointmentPriority | 'all'>(
    initialPriorityFilter
  );
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Detail drawer state
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handleCancelClick = async (apt: Appointment) => {
    if (
      !window.confirm(
        `Are you sure you want to cancel the 30-minute consultation for ${
          apt.patient_name || 'Patient'
        } with ${apt.doctor_name || 'Doctor'}?`
      )
    ) {
      return;
    }

    setCancellingId(apt.id);
    try {
      await onCancel(apt.id);
      if (selectedAppointment?.id === apt.id) {
        setSelectedAppointment((prev) =>
          prev ? { ...prev, status: 'cancelled' } : null
        );
      }
    } finally {
      setCancellingId(null);
    }
  };

  // Filtered appointments
  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      (apt.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apt.doctor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apt.specialization || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apt.reason || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || apt.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="content-surface">
      <div className="surface-header">
        <div className="surface-title-group">
          <h3>Coordinated Appointments</h3>
          <span className="surface-subtitle">
            Showing {filteredAppointments.length} of {appointments.length} records • 30-minute time slots
          </span>
        </div>
        <div className="surface-actions">
          <button className="btn btn-outline btn-sm" onClick={onRefresh}>
            Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={onOpenBooking}>
            + Book Slot
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by patient, doctor, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          aria-label="Filter by Status"
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled Only</option>
          <option value="cancelled">Cancelled Only</option>
          <option value="completed">Completed Only</option>
        </select>

        <select
          className="filter-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as any)}
          aria-label="Filter by Priority"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent Priority</option>
          <option value="high">High Priority</option>
          <option value="normal">Normal Priority</option>
        </select>

        {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setPriorityFilter('all');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table view */}
      {loading && appointments.length === 0 ? (
        <div className="state-box">
          <div className="state-icon-wrap">
            <Clock size={24} />
          </div>
          <h4 className="state-title">Loading Appointments</h4>
          <p className="state-desc">Synchronizing appointments from Supabase PostgreSQL...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="state-box">
          <div className="state-icon-wrap">
            <Filter size={24} />
          </div>
          <h4 className="state-title">No Appointments Match Criteria</h4>
          <p className="state-desc">
            {appointments.length === 0
              ? 'No appointments have been coordinated yet.'
              : 'Try clearing your search term or adjusting status and priority filters.'}
          </p>
          <button className="btn btn-primary btn-sm" onClick={onOpenBooking}>
            Book New Appointment
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="medflow-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Assigned Doctor</th>
                <th>Specialization</th>
                <th>Slot Time (30m)</th>
                <th>Triage Priority</th>
                <th>Status</th>
                <th>Consultation Reason</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((apt) => (
                <tr
                  key={apt.id}
                  className={apt.priority === 'urgent' && apt.status === 'scheduled' ? 'row-urgent' : ''}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedAppointment(apt)}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <User size={15} color="#64748B" />
                      <strong>{apt.patient_name || apt.patient_id.slice(0, 8)}</strong>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Stethoscope size={15} color="#0D9488" />
                      <span>{apt.doctor_name || apt.doctor_id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: '#475569', fontSize: '0.82rem' }}>
                      {apt.specialization || 'General'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={13} color="#64748B" />
                      <span>{formatDateTime(apt.scheduled_at)}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge-priority ${apt.priority}`}>
                      {apt.priority === 'urgent' && <AlertTriangle size={11} />}
                      {apt.priority === 'high' && <Info size={11} />}
                      {apt.priority === 'normal' && <CheckCircle2 size={11} />}
                      {apt.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge-status ${apt.status}`}>{apt.status}</span>
                  </td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {apt.reason || '—'}
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    {apt.status === 'scheduled' && (
                      <button
                        className="btn btn-danger-outline btn-sm"
                        disabled={cancellingId === apt.id}
                        onClick={() => handleCancelClick(apt)}
                        title="Cancel this appointment and free slot"
                      >
                        <XCircle size={13} />
                        <span>{cancellingId === apt.id ? 'Cancelling...' : 'Cancel'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="modal-overlay" onClick={() => setSelectedAppointment(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Appointment Coordination Details</h3>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedAppointment(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="review-box">
                <div className="review-item">
                  <span className="review-label">Appointment ID</span>
                  <span className="review-value" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {selectedAppointment.id}
                  </span>
                </div>
                <div className="review-item">
                  <span className="review-label">Patient</span>
                  <span className="review-value">
                    {selectedAppointment.patient_name || selectedAppointment.patient_id}
                  </span>
                </div>
                <div className="review-item">
                  <span className="review-label">Physician</span>
                  <span className="review-value">
                    {selectedAppointment.doctor_name || selectedAppointment.doctor_id}
                  </span>
                </div>
                <div className="review-item">
                  <span className="review-label">Specialization</span>
                  <span className="review-value">
                    {selectedAppointment.specialization || 'General Consultation'}
                  </span>
                </div>
                <div className="review-item">
                  <span className="review-label">Slot Start</span>
                  <span className="review-value">
                    {formatDateTime(selectedAppointment.scheduled_at)}
                  </span>
                </div>
                <div className="review-item">
                  <span className="review-label">Slot End (Fixed 30m)</span>
                  <span className="review-value">
                    {formatDateTime(selectedAppointment.end_at)}
                  </span>
                </div>
                <div className="review-item">
                  <span className="review-label">Triage Priority</span>
                  <span className="review-value">
                    <span className={`badge-priority ${selectedAppointment.priority}`}>
                      {selectedAppointment.priority}
                    </span>
                  </span>
                </div>
                <div className="review-item">
                  <span className="review-label">Status</span>
                  <span className="review-value">
                    <span className={`badge-status ${selectedAppointment.status}`}>
                      {selectedAppointment.status}
                    </span>
                  </span>
                </div>
                <div className="review-item">
                  <span className="review-label">Consultation Reason</span>
                  <span className="review-value">
                    {selectedAppointment.reason || 'None specified'}
                  </span>
                </div>
              </div>

              {selectedAppointment.status === 'scheduled' && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.75rem',
                  }}
                >
                  <button
                    className="btn btn-danger-outline"
                    disabled={cancellingId === selectedAppointment.id}
                    onClick={() => handleCancelClick(selectedAppointment)}
                  >
                    <XCircle size={15} />
                    <span>
                      {cancellingId === selectedAppointment.id
                        ? 'Cancelling...'
                        : 'Cancel Appointment'}
                    </span>
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                Backed by Supabase PostgreSQL exclusion trigger
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedAppointment(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
