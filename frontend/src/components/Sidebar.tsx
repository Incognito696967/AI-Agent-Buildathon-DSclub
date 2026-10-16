import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Stethoscope,
  Activity,
  ShieldCheck,
  HeartPulse,
  Sparkles,
} from 'lucide-react';
import type { NavTab } from '../types';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  counts: {
    appointments: number;
    patients: number;
    doctors: number;
    urgent: number;
  };
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  counts,
  mobileOpen,
  onCloseMobile,
}) => {
  const navigate = useNavigate();
  const handleNav = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
    const pathMap: Record<NavTab, string> = {
      overview: '/',
      copilot: '/copilot',
      appointments: '/appointments',
      patients: '/patients',
      doctors: '/doctors',
      coordination: '/coordination',
    };
    navigate(pathMap[tab]);
  };

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onCloseMobile} />}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-icon-wrap">
            <HeartPulse size={20} strokeWidth={2.2} />
          </div>
          <div className="brand-info">
            <span className="brand-title">MEDFLOW</span>
            <span className="brand-subtitle">Intelligent Care Coordination</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-category">Operations</span>

          <button
            className={`nav-item ${currentTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleNav('overview')}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </button>

          <button
            className={`nav-item ${currentTab === 'copilot' ? 'active' : ''}`}
            onClick={() => handleNav('copilot')}
            style={{
              background: currentTab === 'copilot' ? 'linear-gradient(135deg, rgba(13,148,136,0.25), rgba(20,45,78,0.3))' : undefined,
              borderColor: currentTab === 'copilot' ? 'rgba(13,148,136,0.5)' : undefined,
            }}
          >
            <Sparkles size={18} color="#14B8A6" />
            <span style={{ fontWeight: 600 }}>AI Copilot</span>
            <span
              className="badge-count"
              style={{
                background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)',
                color: '#FFFFFF',
                fontSize: '0.65rem',
                padding: '0.1rem 0.4rem',
              }}
            >
              AI
            </span>
          </button>

          <button
            className={`nav-item ${currentTab === 'appointments' ? 'active' : ''}`}
            onClick={() => handleNav('appointments')}
          >
            <CalendarCheck size={18} />
            <span>Appointments</span>
            {counts.appointments > 0 && (
              <span className="badge-count">{counts.appointments}</span>
            )}
          </button>

          <span className="nav-category">Directory & Rosters</span>

          <button
            className={`nav-item ${currentTab === 'patients' ? 'active' : ''}`}
            onClick={() => handleNav('patients')}
          >
            <Users size={18} />
            <span>Patients</span>
            {counts.patients > 0 && (
              <span className="badge-count">{counts.patients}</span>
            )}
          </button>

          <button
            className={`nav-item ${currentTab === 'doctors' ? 'active' : ''}`}
            onClick={() => handleNav('doctors')}
          >
            <Stethoscope size={18} />
            <span>Doctors</span>
            {counts.doctors > 0 && (
              <span className="badge-count">{counts.doctors}</span>
            )}
          </button>

          <span className="nav-category">Intelligence & Audit</span>

          <button
            className={`nav-item ${currentTab === 'coordination' ? 'active' : ''}`}
            onClick={() => handleNav('coordination')}
          >
            <Activity size={18} />
            <span>Coordination Trace</span>
            {counts.urgent > 0 && (
              <span
                className="badge-count"
                style={{ background: '#DC2626', color: '#FFFFFF', fontWeight: 600 }}
              >
                {counts.urgent} Urgent
              </span>
            )}
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="system-badge">
            <ShieldCheck size={14} />
            <span>PostgreSQL GIST Guaranteed</span>
          </div>
          <div>FastAPI 0.110+ • Supabase DB</div>
        </div>
      </aside>
    </>
  );
};
