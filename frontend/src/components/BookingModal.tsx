import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
} from 'lucide-react';
import type {
  AppointmentCreateInput,
  AppointmentPriority,
  Doctor,
  Patient,
} from '../types';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: AppointmentCreateInput) => Promise<void>;
  doctors: Doctor[];
  patients: Patient[];
  preselectedDoctorId?: string;
  preselectedPatientId?: string;
  onConflictDetected?: (conflictDetails: { doctorName: string; time: string }) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  doctors,
  patients,
  preselectedDoctorId,
  preselectedPatientId,
  onConflictDetected,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [priority, setPriority] = useState<AppointmentPriority>('normal');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Default date to tomorrow
  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setScheduledDate(`${yyyy}-${mm}-${dd}`);

      if (preselectedDoctorId) setDoctorId(preselectedDoctorId);
      if (preselectedPatientId) setPatientId(preselectedPatientId);

      setStep(1);
      setGeneralError(null);
      setConflictError(null);
      setBookingSuccess(false);
    }
  }, [isOpen, preselectedDoctorId, preselectedPatientId]);

  if (!isOpen) return null;

  const selectedPatient = patients.find((p) => p.id === patientId);
  const selectedDoctor = doctors.find((d) => d.id === doctorId);

  // Time slot options (30-min increments during typical hospital consultation hours 08:00 - 17:30)
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  const handleNextStep = () => {
    setGeneralError(null);
    if (step === 1 && !patientId) {
      setGeneralError('Please select a patient to proceed.');
      return;
    }
    if (step === 2 && !doctorId) {
      setGeneralError('Please select a doctor to proceed.');
      return;
    }
    if (step === 3 && (!scheduledDate || !scheduledTime)) {
      setGeneralError('Please select both a valid date and 30-minute slot.');
      return;
    }
    setStep((prev) => (Math.min(prev + 1, 5) as any));
  };

  const handlePrevStep = () => {
    setGeneralError(null);
    setConflictError(null);
    setStep((prev) => (Math.max(prev - 1, 1) as any));
  };

  const handleConfirmBooking = async () => {
    if (!patientId || !doctorId || !scheduledDate || !scheduledTime) {
      setGeneralError('Incomplete booking information.');
      return;
    }

    setSubmitting(true);
    setGeneralError(null);
    setConflictError(null);

    try {
      // Build ISO 8601 timestamp with UTC or offset
      const combinedDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
      const isoString = combinedDateTime.toISOString();

      await onSubmit({
        patient_id: patientId,
        doctor_id: doctorId,
        scheduled_at: isoString,
        priority,
        reason: reason.trim() || undefined,
      });

      setBookingSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      if (err.status === 409 || err.message?.toLowerCase().includes('conflict')) {
        const errorMsg =
          err.message ||
          `Scheduling Conflict: ${selectedDoctor?.name || 'Selected Doctor'} already has an active consultation during this 30-minute slot.`;
        setConflictError(errorMsg);
        // Jump user back to Step 3 so they can pick a different slot
        setStep(3);
        if (onConflictDetected && selectedDoctor) {
          onConflictDetected({
            doctorName: selectedDoctor.name,
            time: `${scheduledDate} at ${scheduledTime}`,
          });
        }
      } else {
        setGeneralError(err.message || 'Failed to coordinate appointment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3>Schedule Medical Consultation</h3>
            <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
              30-minute slot coordination with real-time conflict evaluation
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Wizard Progress */}
        <div style={{ padding: '1.25rem 1.75rem 0' }}>
          <div className="modal-wizard-steps">
            <div className="wizard-line" />
            <div className={`wizard-step ${step >= 1 ? (step === 1 ? 'active' : 'completed') : ''}`}>
              <div className="wizard-dot">1</div>
              <span className="wizard-label">Patient</span>
            </div>
            <div className={`wizard-step ${step >= 2 ? (step === 2 ? 'active' : 'completed') : ''}`}>
              <div className="wizard-dot">2</div>
              <span className="wizard-label">Doctor</span>
            </div>
            <div className={`wizard-step ${step >= 3 ? (step === 3 ? 'active' : 'completed') : ''}`}>
              <div className="wizard-dot">3</div>
              <span className="wizard-label">Slot</span>
            </div>
            <div className={`wizard-step ${step >= 4 ? (step === 4 ? 'active' : 'completed') : ''}`}>
              <div className="wizard-dot">4</div>
              <span className="wizard-label">Triage</span>
            </div>
            <div className={`wizard-step ${step >= 5 ? 'active' : ''}`}>
              <div className="wizard-dot">5</div>
              <span className="wizard-label">Review</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Success Banner */}
          {bookingSuccess && (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                color: '#0D9488',
              }}
            >
              <CheckCircle2 size={48} style={{ margin: '0 auto 1rem' }} />
              <h4 style={{ fontSize: '1.2rem', color: '#142D4E', marginBottom: '0.5rem' }}>
                Appointment Coordinated!
              </h4>
              <p style={{ fontSize: '0.86rem', color: '#64748B' }}>
                Slot locked and committed to Supabase PostgreSQL database.
              </p>
            </div>
          )}

          {/* HTTP 409 Conflict Callout */}
          {conflictError && !bookingSuccess && (
            <div className="conflict-callout">
              <ShieldAlert size={22} className="conflict-icon" />
              <div className="conflict-content">
                <h4>Scheduling Conflict Detected (HTTP 409)</h4>
                <p>{conflictError}</p>
                <p style={{ marginTop: '0.4rem', fontWeight: 600, color: '#991B1B' }}>
                  Please select an alternate 30-minute time slot below. Your other selections are preserved.
                </p>
              </div>
            </div>
          )}

          {/* General Error Banner */}
          {generalError && !bookingSuccess && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                <span>{generalError}</span>
              </div>
            </div>
          )}

          {!bookingSuccess && (
            <>
              {/* Step 1: Patient Selection */}
              {step === 1 && (
                <div>
                  <div className="form-group">
                    <label>
                      Select Patient <span className="required">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                    >
                      <option value="">-- Choose Registered Patient --</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.age} yrs) {p.contact ? `• ${p.contact}` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="form-help">
                      Patient must be registered in the system. Check the Patients tab to register new patients.
                    </div>
                  </div>

                  {selectedPatient && (
                    <div className="review-box" style={{ marginTop: '1rem' }}>
                      <div className="review-item">
                        <span className="review-label">Patient Name</span>
                        <span className="review-value">{selectedPatient.name}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">Age</span>
                        <span className="review-value">{selectedPatient.age} years</span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">Contact</span>
                        <span className="review-value">{selectedPatient.contact || 'None'}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Doctor Selection */}
              {step === 2 && (
                <div>
                  <div className="form-group">
                    <label>
                      Select Physician <span className="required">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={doctorId}
                      onChange={(e) => setDoctorId(e.target.value)}
                    >
                      <option value="">-- Choose Doctor from Roster --</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id} disabled={!d.is_available}>
                          {d.name} — {d.specialization} {!d.is_available ? '(Unavailable)' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="form-help">
                      Only available doctors can be booked. Overlap protection is enforced at database level.
                    </div>
                  </div>

                  {selectedDoctor && (
                    <div className="review-box" style={{ marginTop: '1rem' }}>
                      <div className="review-item">
                        <span className="review-label">Physician</span>
                        <span className="review-value">{selectedDoctor.name}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">Specialization</span>
                        <span className="review-value">{selectedDoctor.specialization}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">Status</span>
                        <span className="review-value" style={{ color: selectedDoctor.is_available ? '#0D9488' : '#DC2626' }}>
                          {selectedDoctor.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Date & 30-Minute Slot */}
              {step === 3 && (
                <div>
                  <div className="form-group">
                    <label>
                      Consultation Date <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      30-Minute Consultation Slot <span className="required">*</span>
                    </label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                      }}
                    >
                      {timeSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`btn btn-sm ${
                            scheduledTime === slot ? 'btn-primary' : 'btn-outline'
                          }`}
                          style={{
                            padding: '0.45rem 0.2rem',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                          }}
                          onClick={() => setScheduledTime(slot)}
                        >
                          <Clock size={12} style={{ marginRight: 2 }} />
                          {slot}
                        </button>
                      ))}
                    </div>
                    <div className="form-help" style={{ marginTop: '0.5rem' }}>
                      Appointments are fixed at 30 minutes (e.g. {scheduledTime} – {
                        (() => {
                          const [h, m] = scheduledTime.split(':').map(Number);
                          const total = h * 60 + m + 30;
                          const eh = String(Math.floor(total / 60)).padStart(2, '0');
                          const em = String(total % 60).padStart(2, '0');
                          return `${eh}:${em}`;
                        })()
                      }).
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Triage Priority & Reason */}
              {step === 4 && (
                <div>
                  <div className="form-group">
                    <label>Triage Priority Level</label>
                    <div className="priority-selector">
                      <div
                        className={`priority-option ${priority === 'normal' ? 'selected normal' : ''}`}
                        onClick={() => setPriority('normal')}
                      >
                        <div className="priority-option-title" style={{ color: '#0D9488' }}>
                          Normal
                        </div>
                        <div className="priority-option-desc">Routine checkup or follow-up</div>
                      </div>

                      <div
                        className={`priority-option ${priority === 'high' ? 'selected high' : ''}`}
                        onClick={() => setPriority('high')}
                      >
                        <div className="priority-option-title" style={{ color: '#D97706' }}>
                          High
                        </div>
                        <div className="priority-option-desc">Near-term acute symptoms</div>
                      </div>

                      <div
                        className={`priority-option ${priority === 'urgent' ? 'selected urgent' : ''}`}
                        onClick={() => setPriority('urgent')}
                      >
                        <div className="priority-option-title" style={{ color: '#DC2626' }}>
                          Urgent
                        </div>
                        <div className="priority-option-desc">Immediate care required</div>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Consultation Reason / Clinical Symptoms</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="e.g. Persistent chest tightness, hypertension review, post-operative checkup..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <div className="form-help">
                      Provide symptom context to assist the physician and care coordination team.
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Review & Confirmation */}
              {step === 5 && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', color: '#142D4E', marginBottom: '0.75rem' }}>
                    Confirm Appointment Specifications
                  </h4>

                  <div className="review-box">
                    <div className="review-item">
                      <span className="review-label">Patient</span>
                      <span className="review-value">
                        {selectedPatient?.name} ({selectedPatient?.age} yrs)
                      </span>
                    </div>

                    <div className="review-item">
                      <span className="review-label">Assigned Physician</span>
                      <span className="review-value">
                        {selectedDoctor?.name} — {selectedDoctor?.specialization}
                      </span>
                    </div>

                    <div className="review-item">
                      <span className="review-label">Date & Time</span>
                      <span className="review-value">
                        {scheduledDate} at {scheduledTime} (30 mins duration)
                      </span>
                    </div>

                    <div className="review-item">
                      <span className="review-label">Triage Priority</span>
                      <span className="review-value">
                        <span className={`badge-priority ${priority}`}>{priority}</span>
                      </span>
                    </div>

                    <div className="review-item">
                      <span className="review-label">Reason</span>
                      <span className="review-value">{reason || 'None specified'}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#F0FDF8',
                      border: '1px solid #BBF7D0',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      fontSize: '0.78rem',
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>
                      Clicking confirm will submit this booking to FastAPI. PostgreSQL GIST constraint verifies slot availability.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!bookingSuccess && (
          <div className="modal-footer">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handlePrevStep}
                  disabled={submitting}
                >
                  <ChevronLeft size={14} />
                  <span>Back</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>

              {step < 5 ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleNextStep}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleConfirmBooking}
                  disabled={submitting}
                >
                  <span>{submitting ? 'Verifying & Booking...' : 'Confirm Booking'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
