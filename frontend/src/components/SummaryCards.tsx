import React from 'react';
import type { DashboardMetrics } from '../types';

interface SummaryCardsProps {
  metrics: DashboardMetrics;
  loading: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ metrics, loading }) => {
  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-title">Total Appointments</div>
        <div className="metric-value">{loading ? '...' : metrics.totalAppointments}</div>
      </div>

      <div className="metric-card metric-urgent">
        <div className="metric-title">Urgent Consultations</div>
        <div className="metric-value">{loading ? '...' : metrics.urgentAppointments}</div>
      </div>

      <div className="metric-card metric-available">
        <div className="metric-title">Available Doctors</div>
        <div className="metric-value">{loading ? '...' : metrics.availableDoctors}</div>
      </div>

      <div className="metric-card">
        <div className="metric-title">Scheduled / Pending</div>
        <div className="metric-value">{loading ? '...' : metrics.pendingAppointments}</div>
      </div>
    </div>
  );
};
