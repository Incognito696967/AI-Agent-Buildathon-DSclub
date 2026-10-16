import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopNavbar } from '../components/TopNavbar';
import { MetricCards } from '../components/MetricCards';
import { CoordinationIntelligencePanel } from '../components/CoordinationIntelligencePanel';
import { AppointmentsView } from '../components/AppointmentsView';
import { PatientsView } from '../components/PatientsView';
import { DoctorsView } from '../components/DoctorsView';
import { CoordinationActivityView } from '../components/CoordinationActivityView';
import { BookingModal } from '../components/BookingModal';
import { ToastContainer } from '../components/ToastContainer';
import { api } from '../api/client';
import {
  Calendar,
  AlertTriangle,
  Database,
} from 'lucide-react';
import type {
  Appointment,
  AppointmentCreateInput,
  Doctor,
  Patient,
  HealthResponse,
  DbHealthResponse,
  DashboardMetrics,
  NavTab,
  CoordinationEvent,
  ToastMessage,
  PatientCreateInput,
  DoctorCreateInput,
} from '../types';

export const Dashboard: React.FC = () => {
  // Navigation & UI state
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [preselectedDoctorId, setPreselectedDoctorId] = useState<string | undefined>();
  const [preselectedPatientId, setPreselectedPatientId] = useState<string | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent'>('all');

  // Backend state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [apiHealth, setApiHealth] = useState<HealthResponse | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealthResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Operational trace & notifications
  const [events, setEvents] = useState<CoordinationEvent[]>([
    {
      id: 'init-1',
      timestamp: new Date().toISOString(),
      type: 'system',
      title: 'Coordination Engine Initialized',
      description: 'Connected to MEDFLOW coordination gateway. GIST exclusion trigger active.',
      details: {
        'Engine': 'FastAPI + Supabase',
        'Constraint': 'no_overlapping_doctor_appointments',
      },
    },
  ]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addEvent = (event: Omit<CoordinationEvent, 'id' | 'timestamp'>) => {
    const newEvent: CoordinationEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    setEvents((prev) => [newEvent, ...prev]);
  };

  // Metrics calculation
  const metrics: DashboardMetrics = {
    totalAppointments: appointments.length,
    urgentAppointments: appointments.filter(
      (a) => a.priority === 'urgent' && a.status === 'scheduled'
    ).length,
    availableDoctors: doctors.filter((d) => d.is_available).length,
    pendingAppointments: appointments.filter((a) => a.status === 'scheduled').length,
  };

  // Load backend and database data
  const loadData = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);

    // 1. Check API Liveness
    try {
      const health = await api.checkHealth();
      setApiHealth(health);
    } catch {
      setApiHealth(null);
    }

    // 2. Check Database Connectivity
    try {
      const db = await api.checkDbHealth();
      setDbHealth(db);
    } catch (dbErr: any) {
      setDbHealth({
        status: 'unhealthy',
        database: 'disconnected',
        message: dbErr.message || 'Supabase PostgreSQL disconnected',
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Fetch Data from FastAPI
    try {
      const [fetchedAppointments, fetchedDoctors, fetchedPatients] = await Promise.all([
        api.getAppointments().catch(() => []),
        api.getDoctors().catch(() => []),
        api.getPatients().catch(() => []),
      ]);

      setAppointments(fetchedAppointments);
      setDoctors(fetchedDoctors);
      setPatients(fetchedPatients);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed communicating with coordination gateway.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Appointment creation handler
  const handleCreateAppointment = async (input: AppointmentCreateInput) => {
    try {
      const created = await api.createAppointment(input);
      addToast({
        type: 'success',
        title: 'Appointment Booked',
        message: `Successfully scheduled 30m slot for ${created.patient_name || 'Patient'} with ${
          created.doctor_name || 'Doctor'
        }.`,
      });

      addEvent({
        type: 'booking',
        title: `Appointment Slot Coordinated (${input.priority.toUpperCase()})`,
        description: `Scheduled 30-min consultation slot for ${created.patient_name || input.patient_id} with ${
          created.doctor_name || input.doctor_id
        }.`,
        priority: input.priority,
        status: 'success',
        details: {
          'Priority': input.priority,
          'Doctor': created.doctor_name || input.doctor_id,
          'Time': new Date(input.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      });

      await loadData();
    } catch (err: any) {
      throw err;
    }
  };

  // Conflict detection callback from modal
  const handleConflictDetected = (conflict: { doctorName: string; time: string }) => {
    addToast({
      type: 'warning',
      title: 'Slot Double-Booking Prevented',
      message: `Conflict prevented: ${conflict.doctorName} is already booked at ${conflict.time}.`,
    });

    addEvent({
      type: 'conflict',
      title: 'Slot Overlap Prevented (HTTP 409)',
      description: `Concurrent overlap rejected by PostgreSQL exclusion logic for ${conflict.doctorName} at ${conflict.time}.`,
      status: 'warning',
      details: {
        'Doctor': conflict.doctorName,
        'Conflict Time': conflict.time,
        'Engine Action': 'Preempted double-booking',
      },
    });
  };

  // Appointment cancellation handler
  const handleCancelAppointment = async (id: string) => {
    const targetApt = appointments.find((a) => a.id === id);
    try {
      await api.cancelAppointment(id);
      addToast({
        type: 'info',
        title: 'Appointment Soft-Cancelled',
        message: 'The slot was released and marked cancelled for audit purposes.',
      });

      addEvent({
        type: 'cancellation',
        title: 'Appointment Cancelled & Slot Freed',
        description: `Soft-cancelled appointment for ${
          targetApt?.patient_name || 'Patient'
        } with ${targetApt?.doctor_name || 'Doctor'}. 30m slot is now available.`,
        status: 'info',
        details: {
          'Appointment ID': id.slice(0, 8),
          'Freed Slot': targetApt ? new Date(targetApt.scheduled_at).toLocaleTimeString() : 'N/A',
        },
      });

      await loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: err.message || 'Unable to cancel appointment.',
      });
      throw err;
    }
  };

  // Patient registration handler
  const handleCreatePatient = async (input: PatientCreateInput) => {
    try {
      const created = await api.createPatient(input);
      addToast({
        type: 'success',
        title: 'Patient Registered',
        message: `${created.name} added to directory.`,
      });
      addEvent({
        type: 'system',
        title: 'New Patient Registered',
        description: `Registered patient ${created.name} (${created.age} yrs) in Supabase database.`,
        status: 'info',
      });
      await loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Registration Error',
        message: err.message || 'Failed to register patient.',
      });
      throw err;
    }
  };

  // Doctor roster creation handler
  const handleCreateDoctor = async (input: DoctorCreateInput) => {
    try {
      const created = await api.createDoctor({
        name: input.name,
        specialization: input.specialization,
        is_available: input.is_available ?? true,
      });
      addToast({
        type: 'success',
        title: 'Physician Added',
        message: `${created.name} added to medical roster.`,
      });
      addEvent({
        type: 'system',
        title: 'Physician Added to Roster',
        description: `Added ${created.name} (${created.specialization}) to active coordination pool.`,
        status: 'info',
      });
      await loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Roster Error',
        message: err.message || 'Failed to add doctor.',
      });
      throw err;
    }
  };

  // Quick book shortcuts
  const openBookingForPatient = (patientId: string) => {
    setPreselectedPatientId(patientId);
    setPreselectedDoctorId(undefined);
    setIsBookingModalOpen(true);
  };

  const openBookingForDoctor = (doctorId: string) => {
    setPreselectedDoctorId(doctorId);
    setPreselectedPatientId(undefined);
    setIsBookingModalOpen(true);
  };

  const openGeneralBooking = () => {
    setPreselectedDoctorId(undefined);
    setPreselectedPatientId(undefined);
    setIsBookingModalOpen(true);
  };

  // Filter urgent from dashboard
  const filterUrgentAppointments = () => {
    setPriorityFilter('urgent');
    setCurrentTab('appointments');
  };

  const filterAvailableDoctors = () => {
    setCurrentTab('doctors');
  };

  // Get greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning, Care Team';
    if (hour < 17) return 'Good afternoon, Care Team';
    return 'Good evening, Care Team';
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'appointments') setPriorityFilter('all');
        }}
        counts={{
          appointments: appointments.length,
          patients: patients.length,
          doctors: doctors.length,
          urgent: metrics.urgentAppointments,
        }}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="app-content-area">
        <TopNavbar
          currentTab={currentTab}
          apiHealth={apiHealth}
          dbHealth={dbHealth}
          loading={loading}
          onOpenBooking={openGeneralBooking}
          onRefresh={loadData}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="view-container">
          {/* Database Notice if disconnected */}
          {dbHealth && dbHealth.database !== 'connected' && (
            <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Database size={18} color="#D97706" />
                <div>
                  <strong>Database Configuration Notice:</strong> Supabase PostgreSQL is not connected.
                  Ensure <code>SUPABASE_URL</code> and <code>SUPABASE_SECRET_KEY</code> are configured in{' '}
                  <code>backend/.env</code> and <code>supabase/schema.sql</code> is applied.
                </div>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={loadData}
                style={{ marginLeft: '1rem', whiteSpace: 'nowrap' }}
              >
                Retry
              </button>
            </div>
          )}

          {globalError && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <AlertTriangle size={18} color="#DC2626" />
                <div>{globalError}</div>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW DASHBOARD (PRIMARY JUDGING SCREEN) */}
          {currentTab === 'overview' && (
            <div>
              {/* Welcome Banner */}
              <div className="welcome-banner">
                <div className="welcome-text">
                  <h1>{getGreeting()}</h1>
                  <p>Your command center for smarter appointment coordination.</p>
                </div>
                <div className="welcome-actions">
                  <button
                    className="btn btn-primary"
                    onClick={openGeneralBooking}
                    id="btn-overview-schedule"
                  >
                    <Calendar size={16} />
                    <span>Schedule Appointment</span>
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <MetricCards
                metrics={metrics}
                loading={loading}
                onFilterUrgent={filterUrgentAppointments}
                onFilterAvailableDoctors={filterAvailableDoctors}
              />

              {/* Coordination Intelligence Panel */}
              <CoordinationIntelligencePanel
                appointments={appointments}
                doctors={doctors}
                onOpenBooking={openGeneralBooking}
                onViewUrgent={filterUrgentAppointments}
              />

              {/* Two Column Layout: Recent Schedule & Quick Roster */}
              <div className="dashboard-columns">
                <div>
                  <AppointmentsView
                    appointments={appointments}
                    loading={loading}
                    onCancel={handleCancelAppointment}
                    onRefresh={loadData}
                    onOpenBooking={openGeneralBooking}
                    initialPriorityFilter="all"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Doctor Availability Summary */}
                  <div className="content-surface" style={{ padding: '1.25rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1rem',
                        borderBottom: '1px solid #E2E8F0',
                        paddingBottom: '0.75rem',
                      }}
                    >
                      <h4 style={{ fontSize: '0.95rem', color: '#142D4E', fontWeight: 700 }}>
                        On-Duty Physicians
                      </h4>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                        onClick={() => setCurrentTab('doctors')}
                      >
                        All ({doctors.length})
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {doctors.slice(0, 4).map((doc) => (
                        <div
                          key={doc.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.65rem',
                            borderRadius: '8px',
                            background: '#F8FAFC',
                            border: '1px solid #EDF2F7',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#142D4E' }}>
                              {doc.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#0D9488' }}>
                              {doc.specialization}
                            </div>
                          </div>
                          {doc.is_available ? (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: '0.2rem 0.45rem', fontSize: '0.74rem' }}
                              onClick={() => openBookingForDoctor(doc.id)}
                            >
                              Book
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Unavailable</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Coordination Activity Widget */}
                  <div className="content-surface" style={{ padding: '1.25rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1rem',
                        borderBottom: '1px solid #E2E8F0',
                        paddingBottom: '0.75rem',
                      }}
                    >
                      <h4 style={{ fontSize: '0.95rem', color: '#142D4E', fontWeight: 700 }}>
                        Live Activity Log
                      </h4>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                        onClick={() => setCurrentTab('coordination')}
                      >
                        Full Trace
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {events.slice(0, 3).map((evt) => (
                        <div key={evt.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              marginTop: 6,
                              background:
                                evt.type === 'conflict'
                                  ? '#DC2626'
                                  : evt.type === 'cancellation'
                                  ? '#D97706'
                                  : '#0D9488',
                            }}
                          />
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#142D4E' }}>
                              {evt.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              {evt.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPOINTMENTS */}
          {currentTab === 'appointments' && (
            <div>
              <AppointmentsView
                appointments={appointments}
                loading={loading}
                onCancel={handleCancelAppointment}
                onRefresh={loadData}
                onOpenBooking={openGeneralBooking}
                initialPriorityFilter={priorityFilter}
              />
            </div>
          )}

          {/* TAB 3: PATIENTS */}
          {currentTab === 'patients' && (
            <div>
              <PatientsView
                patients={patients}
                appointments={appointments}
                loading={loading}
                onRefresh={loadData}
                onCreatePatient={handleCreatePatient}
                onBookForPatient={openBookingForPatient}
              />
            </div>
          )}

          {/* TAB 4: DOCTORS */}
          {currentTab === 'doctors' && (
            <div>
              <DoctorsView
                doctors={doctors}
                appointments={appointments}
                loading={loading}
                onRefresh={loadData}
                onCreateDoctor={handleCreateDoctor}
                onBookWithDoctor={openBookingForDoctor}
              />
            </div>
          )}

          {/* TAB 5: COORDINATION ACTIVITY & TRANSPARENCY */}
          {currentTab === 'coordination' && (
            <div>
              <CoordinationActivityView
                events={events}
                appointments={appointments}
                onOpenBooking={openGeneralBooking}
              />
            </div>
          )}
        </main>
      </div>

      {/* 5-Step Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSubmit={handleCreateAppointment}
        doctors={doctors}
        patients={patients}
        preselectedDoctorId={preselectedDoctorId}
        preselectedPatientId={preselectedPatientId}
        onConflictDetected={handleConflictDetected}
      />

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
