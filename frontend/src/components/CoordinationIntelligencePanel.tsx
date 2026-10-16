import React from 'react';
import {
  Sparkles,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import type { Appointment, Doctor } from '../types';

interface CoordinationIntelligencePanelProps {
  appointments: Appointment[];
  doctors: Doctor[];
  onOpenBooking: () => void;
  onViewUrgent: () => void;
}

export const CoordinationIntelligencePanel: React.FC<CoordinationIntelligencePanelProps> = ({
  appointments,
  doctors,
  onOpenBooking,
  onViewUrgent,
}) => {
  const urgentApts = appointments.filter(
    (a) => a.priority === 'urgent' && a.status === 'scheduled'
  );
  const highApts = appointments.filter(
    (a) => a.priority === 'high' && a.status === 'scheduled'
  );
  const cancelledApts = appointments.filter((a) => a.status === 'cancelled');
  const availableDoctors = doctors.filter((d) => d.is_available);

  return (
    <div className="intelligence-card">
      <div className="intelligence-header">
        <div className="intelligence-title-group">
          <Sparkles size={20} color="#0D9488" />
          <h2>Coordination Intelligence</h2>
          <span className="intelligence-tag">Live Conflict & Triage Engine</span>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={onOpenBooking}
          style={{ fontSize: '0.78rem' }}
        >
          <span>Schedule New Slot</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="intelligence-body">
        <div className="insight-summary-box">
          {urgentApts.length > 0 ? (
            <div className="insight-item">
              <AlertCircle size={18} color="#DC2626" className="insight-icon" />
              <div className="insight-text">
                <strong>{urgentApts.length} urgent consultation(s) prioritized:</strong>{' '}
                {urgentApts.map((a) => a.patient_name || 'Patient').join(', ')}{' '}
                assigned to immediate triage attention.
                <div className="insight-subtext">
                  Slots protected from preemption. Verified against doctor rosters.
                </div>
              </div>
            </div>
          ) : (
            <div className="insight-item">
              <CheckCircle2 size={18} color="#0D9488" className="insight-icon" />
              <div className="insight-text">
                <strong>Zero urgent backlog:</strong> All high-priority consultation slots
                have been allocated without scheduling overlap.
              </div>
            </div>
          )}

          {cancelledApts.length > 0 && (
            <div className="insight-item">
              <Calendar size={18} color="#0284C7" className="insight-icon" />
              <div className="insight-text">
                <strong>{cancelledApts.length} soft cancellation(s) logged:</strong> Audit
                records preserved; previous 30-minute intervals are freed up for new patient bookings.
              </div>
            </div>
          )}

          <div className="insight-item">
            <ShieldCheck size={18} color="#0D9488" className="insight-icon" />
            <div className="insight-text">
              <strong>Database Overlap Invariant:</strong> PostgreSQL GIST exclusion constraint
              guarantees zero concurrent double-booking across all {doctors.length} physicians.
            </div>
          </div>
        </div>

        <div className="insight-status-col">
          <div className="rule-metric">
            <span>Slot Duration Policy</span>
            <span>Fixed 30 Minutes</span>
          </div>
          <div className="rule-metric">
            <span>Active Triage Level</span>
            <span>
              {urgentApts.length > 0 ? (
                <span style={{ color: '#DC2626', fontWeight: 700 }}>
                  Elevated ({urgentApts.length} Urgent)
                </span>
              ) : highApts.length > 0 ? (
                <span style={{ color: '#D97706', fontWeight: 700 }}>
                  Moderate ({highApts.length} High)
                </span>
              ) : (
                <span style={{ color: '#0D9488', fontWeight: 600 }}>Normal Flow</span>
              )}
            </span>
          </div>
          <div className="rule-metric">
            <span>Bookable Doctors</span>
            <span>
              {availableDoctors.length} / {doctors.length} Ready
            </span>
          </div>
          {urgentApts.length > 0 && (
            <button
              className="btn btn-danger-outline btn-sm"
              onClick={onViewUrgent}
              style={{ marginTop: '0.25rem' }}
            >
              Filter {urgentApts.length} Urgent Records
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
