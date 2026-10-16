import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/Header';
import { SummaryCards } from '../components/SummaryCards';
import { AppointmentsTable } from '../components/AppointmentsTable';
import { QuickBookingModal } from '../components/QuickBookingModal';
import { api } from '../api/client';
import type {
  Appointment,
  AppointmentCreateInput,
  Doctor,
  Patient,
  HealthResponse,
  DbHealthResponse,
  DashboardMetrics,
} from '../types';

export const Dashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [apiHealth, setApiHealth] = useState<HealthResponse | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealthResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalAppointments: 0,
    urgentAppointments: 0,
    availableDoctors: 0,
    pendingAppointments: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

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
        message: dbErr.message || 'Database disconnected',
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Fetch Data if backend is reachable
    try {
      const [fetchedAppointments, fetchedDoctors, fetchedPatients] = await Promise.all([
        api.getAppointments().catch(() => []),
        api.getDoctors().catch(() => []),
        api.getPatients().catch(() => []),
      ]);

      setAppointments(fetchedAppointments);
      setDoctors(fetchedDoctors);
      setPatients(fetchedPatients);

      // Compute metrics
      setMetrics({
        totalAppointments: fetchedAppointments.length,
        urgentAppointments: fetchedAppointments.filter(
          (a) => a.priority === 'urgent' && a.status === 'scheduled'
        ).length,
        availableDoctors: fetchedDoctors.filter((d) => d.is_available).length,
        pendingAppointments: fetchedAppointments.filter((a) => a.status === 'scheduled').length,
      });
    } catch (err: any) {
      setError(err.message || 'Error communicating with medical coordination backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelAppointment = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.cancelAppointment(id);
      await loadData();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    }
  };

  const handleCreateAppointment = async (input: AppointmentCreateInput) => {
    await api.createAppointment(input);
    await loadData();
  };

  return (
    <div className="app-container">
      <Header
        apiHealth={apiHealth}
        dbHealth={dbHealth}
        loading={loading}
        onOpenBooking={() => setIsModalOpen(true)}
        onRefresh={loadData}
      />

      <main className="main-content">
        {dbHealth && dbHealth.database !== 'connected' && (
          <div className="alert alert-warning">
            <div>
              <strong>Database Configuration Notice:</strong> Supabase PostgreSQL is not connected.
              Ensure <code>SUPABASE_URL</code> and <code>SUPABASE_SECRET_KEY</code> are set in{' '}
              <code>backend/.env</code> and <code>supabase/schema.sql</code> is applied.
            </div>
            <button className="btn btn-outline" style={{ padding: '0.2rem 0.6rem' }} onClick={loadData}>
              Retry Connection
            </button>
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}

        <SummaryCards metrics={metrics} loading={loading} />

        <div className="section-header">
          <h2 className="section-title">Coordinated Appointments Schedule</h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Showing {appointments.length} active and past records
          </span>
        </div>

        <AppointmentsTable
          appointments={appointments}
          loading={loading}
          onCancel={handleCancelAppointment}
          onRefresh={loadData}
        />
      </main>

      <QuickBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateAppointment}
        doctors={doctors}
        patients={patients}
      />
    </div>
  );
};
