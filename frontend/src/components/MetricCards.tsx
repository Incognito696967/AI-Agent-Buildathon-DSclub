import React from 'react';
import { CalendarCheck, AlertTriangle, UserCheck, Clock } from 'lucide-react';
import type { DashboardMetrics } from '../types';

interface MetricCardsProps {
  metrics: DashboardMetrics;
  loading: boolean;
  onFilterUrgent?: () => void;
  onFilterAvailableDoctors?: () => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  metrics,
  loading,
  onFilterUrgent,
  onFilterAvailableDoctors,
}) => {
  return (
    <div className="metrics-grid">
      <div className="kpi-card">
        <div className="kpi-card-top">
          <span className="kpi-label">Today's Appointments</span>
          <div className="kpi-icon-wrap kpi-icon-total">
            <CalendarCheck size={18} />
          </div>
        </div>
        <div className="kpi-value">{loading ? '—' : metrics.totalAppointments}</div>
        <div className="kpi-meta">All coordinated booking records</div>
      </div>

      <div
        className="kpi-card"
        onClick={onFilterUrgent}
        style={{ cursor: onFilterUrgent ? 'pointer' : 'default' }}
        title="View urgent prioritization cases"
      >
        <div className="kpi-card-top">
          <span className="kpi-label" style={{ color: '#DC2626' }}>Urgent Cases</span>
          <div className="kpi-icon-wrap kpi-icon-urgent">
            <AlertTriangle size={18} />
          </div>
        </div>
        <div className="kpi-value" style={{ color: '#DC2626' }}>
          {loading ? '—' : metrics.urgentAppointments}
        </div>
        <div className="kpi-meta">Triage prioritized consultations</div>
      </div>

      <div
        className="kpi-card"
        onClick={onFilterAvailableDoctors}
        style={{ cursor: onFilterAvailableDoctors ? 'pointer' : 'default' }}
        title="View active doctor roster"
      >
        <div className="kpi-card-top">
          <span className="kpi-label">Available Doctors</span>
          <div className="kpi-icon-wrap kpi-icon-available">
            <UserCheck size={18} />
          </div>
        </div>
        <div className="kpi-value" style={{ color: '#0D9488' }}>
          {loading ? '—' : metrics.availableDoctors}
        </div>
        <div className="kpi-meta">Active and bookable physicians</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-card-top">
          <span className="kpi-label">Scheduled / Active</span>
          <div className="kpi-icon-wrap kpi-icon-pending">
            <Clock size={18} />
          </div>
        </div>
        <div className="kpi-value">{loading ? '—' : metrics.pendingAppointments}</div>
        <div className="kpi-meta">Awaiting consultation slot</div>
      </div>
    </div>
  );
};
