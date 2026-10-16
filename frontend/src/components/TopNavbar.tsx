import React from 'react';
import { Menu, RefreshCw, Plus, Calendar, Database, Server } from 'lucide-react';
import type { HealthResponse, DbHealthResponse, NavTab } from '../types';

interface TopNavbarProps {
  currentTab: NavTab;
  apiHealth: HealthResponse | null;
  dbHealth: DbHealthResponse | null;
  loading: boolean;
  onOpenBooking: () => void;
  onRefresh: () => void;
  onOpenMobileMenu: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentTab,
  apiHealth,
  dbHealth,
  loading,
  onOpenBooking,
  onRefresh,
  onOpenMobileMenu,
}) => {
  const isApiOnline = apiHealth?.status === 'healthy';
  const isDbConnected = dbHealth?.database === 'connected';

  const tabTitles: Record<NavTab, string> = {
    overview: 'Operations Overview',
    appointments: 'Appointments Management',
    patients: 'Patient Directory',
    doctors: 'Medical Staff Roster',
    coordination: 'Coordination Intelligence Trace',
  };

  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="top-navbar">
      <div className="top-nav-left">
        <button
          className="mobile-menu-btn"
          onClick={onOpenMobileMenu}
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div className="breadcrumb-title">
          <span>{tabTitles[currentTab]}</span>
          <span className="breadcrumb-date">
            <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
            {todayFormatted}
          </span>
        </div>
      </div>

      <div className="top-nav-right">
        {/* Independent Status Indicators */}
        <div className="health-pills-wrap">
          <span
            className={`health-pill ${
              loading && !apiHealth
                ? 'checking'
                : isApiOnline
                ? 'connected'
                : 'disconnected'
            }`}
            title={
              isApiOnline
                ? `FastAPI ${apiHealth?.version || '1.0'} online`
                : 'FastAPI Backend unreachable'
            }
          >
            <Server size={12} />
            <span className="pulsing-dot" />
            <span>API: {isApiOnline ? 'Online' : 'Offline'}</span>
          </span>

          <span
            className={`health-pill ${
              loading && !dbHealth
                ? 'checking'
                : isDbConnected
                ? 'connected'
                : 'disconnected'
            }`}
            title={dbHealth?.message || 'Supabase PostgreSQL status unknown'}
          >
            <Database size={12} />
            <span className="pulsing-dot" />
            <span>Database: {isDbConnected ? 'Connected' : 'Disconnected'}</span>
          </span>
        </div>

        <button
          className="btn btn-outline btn-sm"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh All Records"
        >
          <RefreshCw size={14} className={loading ? 'skeleton' : ''} />
          <span>Refresh</span>
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={onOpenBooking}
          id="btn-schedule-appointment"
        >
          <Plus size={15} />
          <span>New Appointment</span>
        </button>
      </div>
    </header>
  );
};
