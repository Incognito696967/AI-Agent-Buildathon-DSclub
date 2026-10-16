import React from 'react';
import {
  Activity,
  CalendarCheck,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import type { CoordinationEvent, Appointment } from '../types';

interface CoordinationActivityViewProps {
  events: CoordinationEvent[];
  appointments: Appointment[];
  onOpenBooking: () => void;
}

export const CoordinationActivityView: React.FC<CoordinationActivityViewProps> = ({
  events,
  appointments: _appointments,
  onOpenBooking,
}) => {
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Visual Pipeline Flow for Hackathon Judges */}
      <div className="content-surface" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
          <Layers size={20} color="#0D9488" />
          <h3 style={{ fontSize: '1.05rem', color: '#142D4E' }}>
            System Coordination Workflow Architecture
          </h3>
        </div>
        <p style={{ fontSize: '0.84rem', color: '#64748B', marginBottom: '1.25rem' }}>
          How MEDFLOW evaluates consultation requests in real-time before committing records to PostgreSQL:
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#0D9488',
                marginBottom: '0.35rem',
              }}
            >
              STEP 1: INGESTION
            </div>
            <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#142D4E', marginBottom: '0.25rem' }}>
              Request Validation
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
              Pydantic verifies 30-min slot format, triage priority, patient ID, and active physician.
            </div>
          </div>

          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#0D9488',
                marginBottom: '0.35rem',
              }}
            >
              STEP 2: PRE-CHECK
            </div>
            <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#142D4E', marginBottom: '0.25rem' }}>
              Service Conflict Scan
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
              Queries existing scheduled intervals for target doctor. Returns HTTP 409 if slot overlaps.
            </div>
          </div>

          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#0D9488',
                marginBottom: '0.35rem',
              }}
            >
              STEP 3: CONCURRENCY
            </div>
            <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#142D4E', marginBottom: '0.25rem' }}>
              GIST Exclusion Lock
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
              Database trigger serializes doctor rows (`FOR UPDATE`) & enforces PostgreSQL GIST exclusion.
            </div>
          </div>

          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#0D9488',
                marginBottom: '0.35rem',
              }}
            >
              STEP 4: AUDIT TRAIL
            </div>
            <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#142D4E', marginBottom: '0.25rem' }}>
              Soft Lifecycle
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
              Cancellations soft-update status to preserve audit history while instantly freeing the slot.
            </div>
          </div>
        </div>
      </div>

      {/* Real Live Events Trace */}
      <div className="content-surface">
        <div className="surface-header">
          <div className="surface-title-group">
            <h3>Session Coordination Trace</h3>
            <span className="surface-subtitle">
              Verified operational events logged during active coordination session
            </span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onOpenBooking}>
            + Test New Booking
          </button>
        </div>

        {events.length === 0 ? (
          <div className="state-box">
            <div className="state-icon-wrap">
              <Activity size={24} />
            </div>
            <h4 className="state-title">No Session Operations Yet</h4>
            <p className="state-desc">
              Book or cancel an appointment to see live coordination decisions and database trace.
            </p>
          </div>
        ) : (
          <div className="activity-feed">
            {events.map((evt) => (
              <div key={evt.id} className="activity-item">
                <div className={`activity-node ${evt.type}`}>
                  {evt.type === 'booking' && <CalendarCheck size={16} />}
                  {evt.type === 'cancellation' && <XCircle size={16} />}
                  {evt.type === 'conflict' && <AlertTriangle size={16} />}
                  {evt.type === 'system' && <CheckCircle2 size={16} />}
                </div>

                <div className="activity-content">
                  <div className="activity-header">
                    <span className="activity-title">{evt.title}</span>
                    <span className="activity-time">{formatTime(evt.timestamp)}</span>
                  </div>
                  <div className="activity-desc">{evt.description}</div>

                  {evt.details && (
                    <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {Object.entries(evt.details).map(([key, value]) => (
                        <span key={key} className="activity-trace-badge">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
