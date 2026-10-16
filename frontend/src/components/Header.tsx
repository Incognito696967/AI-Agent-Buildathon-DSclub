import React from 'react';
import type { HealthResponse, DbHealthResponse } from '../types';
import { StatusIndicator } from './StatusIndicator';

interface HeaderProps {
  apiHealth: HealthResponse | null;
  dbHealth: DbHealthResponse | null;
  loading: boolean;
  onOpenBooking: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  apiHealth,
  dbHealth,
  loading,
  onOpenBooking,
  onRefresh,
}) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <h1>
          <span>🏥</span> Intelligent Medical Appointment Coordination
        </h1>
        <p>AI-Powered Scheduling, Triage Priority & Conflict Management</p>
      </div>

      <div className="header-actions">
        <StatusIndicator apiHealth={apiHealth} dbHealth={dbHealth} loading={loading} />

        <button className="btn btn-outline" onClick={onRefresh} title="Refresh records">
          🔄 Refresh
        </button>

        <button className="btn btn-primary" onClick={onOpenBooking}>
          + Book Appointment
        </button>
      </div>
    </header>
  );
};
