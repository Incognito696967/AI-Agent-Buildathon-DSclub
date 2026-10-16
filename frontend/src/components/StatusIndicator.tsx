import React from 'react';
import type { HealthResponse, DbHealthResponse } from '../types';

interface StatusIndicatorProps {
  apiHealth: HealthResponse | null;
  dbHealth: DbHealthResponse | null;
  loading: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  apiHealth,
  dbHealth,
  loading,
}) => {
  const isApiOnline = apiHealth?.status === 'healthy';
  const isDbConnected = dbHealth?.database === 'connected';

  if (loading && !apiHealth) {
    return (
      <div className="status-pill-group">
        <span className="status-pill warning">
          <span className="status-dot"></span> Checking services...
        </span>
      </div>
    );
  }

  return (
    <div className="status-pill-group">
      <span
        className={`status-pill ${isApiOnline ? 'online' : 'offline'}`}
        title={isApiOnline ? `FastAPI v${apiHealth?.version} Online` : 'Backend API is unreachable'}
      >
        <span className="status-dot"></span>
        API: {isApiOnline ? 'Online' : 'Offline'}
      </span>

      <span
        className={`status-pill ${isDbConnected ? 'online' : 'offline'}`}
        title={dbHealth?.message || 'Database status unknown'}
      >
        <span className="status-dot"></span>
        Database: {isDbConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
};
