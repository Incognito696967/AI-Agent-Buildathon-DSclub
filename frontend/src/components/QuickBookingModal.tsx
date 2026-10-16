import React, { useState } from 'react';
import type { AppointmentCreateInput, Doctor, Patient } from '../types';

interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: AppointmentCreateInput) => Promise<void>;
  doctors: Doctor[];
  patients: Patient[];
}

export const QuickBookingModal: React.FC<QuickBookingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  doctors,
  patients,
}) => {
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !doctorId || !scheduledAt) {
      setError('Please select a patient, doctor, and scheduled time.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const isoDate = new Date(scheduledAt).toISOString();
      await onSubmit({
        patient_id: patientId,
        doctor_id: doctorId,
        scheduled_at: isoDate,
        priority,
        reason: reason || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Schedule Medical Appointment</h2>
          <button
            className="btn btn-outline"
            style={{ padding: '0.2rem 0.5rem', border: 'none' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Patient</label>
            <select
              className="form-control"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
            >
              <option value="">-- Select Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.age} yrs) {p.contact ? `• ${p.contact}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Doctor</label>
            <select
              className="form-control"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              required
            >
              <option value="">-- Select Doctor --</option>
              {doctors.map((d) => (
                <option
                  key={d.id}
                  value={d.id}
                  disabled={!d.is_available}
                >
                  {d.name} — {d.specialization} {!d.is_available ? '(Unavailable)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Scheduled Slot (30 mins duration)</label>
            <input
              type="datetime-local"
              className="form-control"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Priority / Triage</label>
            <select
              className="form-control"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
            >
              <option value="normal">Normal (Routine Consultation)</option>
              <option value="high">High (Needs Near-Term Care)</option>
              <option value="urgent">Urgent (Immediate Priority)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Consultation Reason / Symptoms</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Chest discomfort, post-op follow-up"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Confirming...' : 'Book 30m Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
