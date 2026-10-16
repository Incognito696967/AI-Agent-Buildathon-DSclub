import React from 'react';
import type { Appointment } from '../types';

interface AppointmentsTableProps {
  appointments: Appointment[];
  loading: boolean;
  onCancel: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export const AppointmentsTable: React.FC<AppointmentsTableProps> = ({
  appointments,
  loading,
  onCancel,
  onRefresh,
}) => {
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

  if (loading && appointments.length === 0) {
    return (
      <div className="content-card">
        <div className="state-box">
          <p>Loading appointments from Supabase...</p>
        </div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="content-card">
        <div className="state-box">
          <h3>No Appointments Found</h3>
          <p>There are currently no scheduled appointments in the database.</p>
          <button className="btn btn-outline" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-card">
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Specialization</th>
              <th>Scheduled Slot (30m)</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Reason</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((apt) => (
              <tr key={apt.id}>
                <td>
                  <strong>{apt.patient_name || apt.patient_id.slice(0, 8)}</strong>
                </td>
                <td>{apt.doctor_name || apt.doctor_id.slice(0, 8)}</td>
                <td>{apt.specialization || 'General'}</td>
                <td>{formatDateTime(apt.scheduled_at)}</td>
                <td>
                  <span className={`badge badge-${apt.priority}`}>{apt.priority}</span>
                </td>
                <td>
                  <span className={`badge badge-${apt.status}`}>{apt.status}</span>
                </td>
                <td>{apt.reason || '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  {apt.status === 'scheduled' && (
                    <button
                      className="btn btn-danger-outline"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => onCancel(apt.id)}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
