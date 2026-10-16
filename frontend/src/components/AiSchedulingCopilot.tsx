import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Stethoscope,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  AlertOctagon,
  ChevronDown,
} from 'lucide-react';
import { api } from '../api/client';
import type {
  Doctor,
  Patient,
  Appointment,
  AppointmentCreateInput,
  AppointmentPriority,
} from '../types';

export interface CopilotSlotRecommendation {
  id: string;
  doctor: Doctor;
  slotIso: string;
  dateStr: string;
  timeStr: string;
  rationale: string;
  matchScore: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  isEmergency?: boolean;
  recommendations?: CopilotSlotRecommendation[];
  clarificationOptions?: string[];
  bookedAppointment?: {
    doctorName: string;
    patientName: string;
    specialization: string;
    time: string;
    date: string;
    priority: string;
  };
}

interface AiSchedulingCopilotProps {
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  onBookAppointment: (input: AppointmentCreateInput) => Promise<void>;
  onRefreshData?: () => void;
}

const EMERGENCY_KEYWORDS = [
  'chest pain',
  'severe breathing',
  'difficulty breathing',
  'shortness of breath',
  'stroke',
  'heart attack',
  'unconscious',
  'severe bleeding',
  'severe trauma',
  'choking',
  'coughing blood',
];

const SUGGESTED_QUERIES = [
  'Book the earliest available cardiologist appointment this week after 4 PM.',
  'I need a diagnostic medicine appointment tomorrow morning.',
  'Show me the next three available appointments with an emergency medicine doctor.',
  'I have high fever and severe fatigue. Recommend the right specialist.',
  'Book Dr. Sarah Connor for tomorrow at 10:00 AM.',
];

export const AiSchedulingCopilot: React.FC<AiSchedulingCopilotProps> = ({
  doctors,
  patients,
  appointments,
  onBookAppointment,
  onRefreshData,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your **MediFlow AI Scheduling Copilot**. You can ask me in plain language to search slots, match doctors by medical condition, check availability, or schedule appointments. How can I assist you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStep, setAgentStep] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    patients[0]?.id || ''
  );
  const [confirmingSlot, setConfirmingSlot] = useState<CopilotSlotRecommendation | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentStep, confirmingSlot]);

  // Sync selected patient if empty
  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

  // Deterministic Slot Search Helper
  const searchAvailableSlots = (
    targetSpecialization?: string,
    targetDoctorName?: string,
    preferredTimeRange?: 'morning' | 'afternoon' | 'after4pm' | 'any',
    daysAhead: number = 5,
    maxResults: number = 3
  ): CopilotSlotRecommendation[] => {
    // 1. Filter eligible doctors
    let eligibleDoctors = doctors.filter((d) => d.is_available);

    if (targetDoctorName) {
      const matchDoc = eligibleDoctors.filter((d) =>
        d.name.toLowerCase().includes(targetDoctorName.toLowerCase())
      );
      if (matchDoc.length > 0) eligibleDoctors = matchDoc;
    }

    if (targetSpecialization && targetSpecialization.toLowerCase() !== 'general') {
      const specDocs = eligibleDoctors.filter((d) =>
        d.specialization.toLowerCase().includes(targetSpecialization.toLowerCase())
      );
      if (specDocs.length > 0) eligibleDoctors = specDocs;
    }

    if (eligibleDoctors.length === 0) {
      // Fallback to any available doctor
      eligibleDoctors = doctors.filter((d) => d.is_available);
    }

    const recommendations: CopilotSlotRecommendation[] = [];
    const now = new Date();

    // Iterate through upcoming days
    for (let dayOffset = 1; dayOffset <= daysAhead; dayOffset++) {
      const day = new Date();
      day.setDate(now.getDate() + dayOffset);
      // Skip weekends if desired or keep all days for hospital
      const yyyy = day.getFullYear();
      const mm = String(day.getMonth() + 1).padStart(2, '0');
      const dd = String(day.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Working hours: 09:00 to 17:00
      const standardHours = [9, 10, 11, 13, 14, 15, 16];

      for (const hour of standardHours) {
        for (const minute of [0, 30]) {
          // Time filter checks
          if (preferredTimeRange === 'morning' && hour >= 12) continue;
          if (preferredTimeRange === 'afternoon' && (hour < 12 || hour >= 16)) continue;
          if (preferredTimeRange === 'after4pm' && hour < 16) continue;

          const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          const slotStart = new Date(`${dateStr}T${timeStr}:00`);
          const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

          for (const doc of eligibleDoctors) {
            // Check conflict against current appointments
            const hasConflict = appointments.some((apt) => {
              if (apt.doctor_id !== doc.id || apt.status !== 'scheduled') return false;
              const aptStart = new Date(apt.scheduled_at).getTime();
              const aptEnd = new Date(apt.end_at).getTime();
              return slotStart.getTime() < aptEnd && slotEnd.getTime() > aptStart;
            });

            if (!hasConflict) {
              let score = 10;
              if (targetDoctorName && doc.name.toLowerCase().includes(targetDoctorName.toLowerCase())) {
                score += 20;
              }
              if (targetSpecialization && doc.specialization.toLowerCase().includes(targetSpecialization.toLowerCase())) {
                score += 15;
              }
              if (dayOffset === 1) score += 5; // Earliest bonus

              recommendations.push({
                id: `rec-${doc.id}-${dateStr}-${timeStr}`,
                doctor: doc,
                slotIso: slotStart.toISOString(),
                dateStr,
                timeStr,
                rationale: `${doc.name} (${doc.specialization}) is available at ${timeStr} with zero slot overlap.`,
                matchScore: score,
              });

              if (recommendations.length >= maxResults * 2) break;
            }
          }
          if (recommendations.length >= maxResults * 2) break;
        }
        if (recommendations.length >= maxResults * 2) break;
      }
      if (recommendations.length >= maxResults * 2) break;
    }

    // Sort by matchScore descending, then date/time
    return recommendations
      .sort((a, b) => b.matchScore - a.matchScore || new Date(a.slotIso).getTime() - new Date(b.slotIso).getTime())
      .slice(0, maxResults);
  };

  // Main Submit Handler
  const handleSendMessage = async (textToSend?: string) => {
    const rawQuery = textToSend || inputQuery;
    if (!rawQuery.trim() || isProcessing) return;

    const query = rawQuery.trim();
    setInputQuery('');
    setConfirmingSlot(null);
    setBookingError(null);

    // 1. Push user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    // 2. Safety & Emergency Filter Check (DO NOT DELAY)
    const lowerQuery = query.toLowerCase();
    const isEmergency = EMERGENCY_KEYWORDS.some((kw) => lowerQuery.includes(kw));

    if (isEmergency) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            isEmergency: true,
            text: '🚨 **CLINICAL ESCALATION WARNING**: Your reported symptoms indicate a potential medical emergency (such as severe chest pain, acute respiratory distress, or stroke indicators).\n\n**Please call 911 or your local emergency medical service immediately, or proceed to the nearest Hospital Emergency Department.**\n\nFor clinical safety, automated non-emergency scheduling is halted for acute emergency presentations.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setIsProcessing(false);
        setAgentStep(null);
      }, 300);
      return;
    }

    // 3. Step 1: Understand request
    setAgentStep('Understanding scheduling constraints...');

    let detectedSpecialty: string | undefined;
    let detectedDoctorName: string | undefined;
    let preferredTimeRange: 'morning' | 'afternoon' | 'after4pm' | 'any' = 'any';

    if (lowerQuery.includes('cardio') || lowerQuery.includes('heart') || lowerQuery.includes('chest pressure')) {
      detectedSpecialty = 'Cardiology';
    } else if (lowerQuery.includes('neuro') || lowerQuery.includes('brain') || lowerQuery.includes('headache')) {
      detectedSpecialty = 'Neuro-Surgery';
    } else if (lowerQuery.includes('derm') || lowerQuery.includes('skin') || lowerQuery.includes('rash')) {
      detectedSpecialty = 'Dermatology';
    } else if (lowerQuery.includes('ortho') || lowerQuery.includes('bone') || lowerQuery.includes('joint')) {
      detectedSpecialty = 'Orthopedics';
    } else if (lowerQuery.includes('fever') || lowerQuery.includes('diagnostic') || lowerQuery.includes('fatigue')) {
      detectedSpecialty = 'Diagnostic Medicine';
    } else if (lowerQuery.includes('surgery') || lowerQuery.includes('incision')) {
      detectedSpecialty = 'General Surgery';
    } else if (lowerQuery.includes('emergency') || lowerQuery.includes('urgent')) {
      detectedSpecialty = 'Emergency Medicine';
    }

    // Check doctor names mentioned
    for (const doc of doctors) {
      const surname = doc.name.split(' ').pop()?.toLowerCase();
      if (surname && lowerQuery.includes(surname)) {
        detectedDoctorName = doc.name;
        detectedSpecialty = doc.specialization;
        break;
      }
    }

    // Time constraints
    if (lowerQuery.includes('after 4') || lowerQuery.includes('4 pm') || lowerQuery.includes('evening') || lowerQuery.includes('16:00')) {
      preferredTimeRange = 'after4pm';
    } else if (lowerQuery.includes('morning') || lowerQuery.includes('am')) {
      preferredTimeRange = 'morning';
    } else if (lowerQuery.includes('afternoon') || lowerQuery.includes('pm')) {
      preferredTimeRange = 'afternoon';
    }

    // Step 2: Try calling backend AI Triage service if available, else deterministic fallback
    setAgentStep('Scanning verified doctor availability & GIST exclusion slots...');

    let liveTriageResult: any = null;
    try {
      liveTriageResult = await api.aiTriage(query);
    } catch {
      // Backend offline or without Gemini key - transparent fallback
    }

    if (liveTriageResult?.recommended_specialization) {
      detectedSpecialty = liveTriageResult.recommended_specialization;
    }

    // Step 3: Recommend the best slots deterministically from real local/database state
    setTimeout(() => {
      setAgentStep('Ranking optimal conflict-free appointments...');

      const results = searchAvailableSlots(
        detectedSpecialty,
        detectedDoctorName,
        preferredTimeRange,
        5,
        3
      );

      setAgentStep(null);
      setIsProcessing(false);

      if (results.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: `I evaluated all on-duty physician schedules, but could not find open 30-minute slots strictly matching **${detectedSpecialty || 'your request'}** for the **${preferredTimeRange}** window.\n\nWould you like me to search across all departments or show morning/afternoon slots instead?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            clarificationOptions: [
              'Search all available doctors today',
              'Check any time slot tomorrow',
              'Show general medicine consultations',
            ],
          },
        ]);
        return;
      }

      const assistantText = `I have analyzed your request${
        detectedSpecialty ? ` for **${detectedSpecialty}**` : ''
      }${
        preferredTimeRange !== 'any' ? ` (${preferredTimeRange} preference)` : ''
      }. Here are the top recommended conflict-free consultation slots backed by our scheduling engine:`;

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: assistantText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          recommendations: results,
        },
      ]);
    }, 600);
  };

  // Step 4: Handle Slot Booking Confirmation
  const handleInitiateBooking = (rec: CopilotSlotRecommendation) => {
    setConfirmingSlot(rec);
    setBookingError(null);
  };

  const handleFinalConfirmBooking = async () => {
    if (!confirmingSlot) return;

    const patient = patients.find((p) => p.id === selectedPatientId) || patients[0];
    if (!patient) {
      setBookingError('No patient selected. Please register or select a patient.');
      return;
    }

    setBookingInProgress(true);
    setBookingError(null);

    try {
      const priority: AppointmentPriority =
        confirmingSlot.doctor.specialization === 'Emergency Medicine' ||
        confirmingSlot.doctor.specialization === 'Cardiology'
          ? 'urgent'
          : 'normal';

      await onBookAppointment({
        patient_id: patient.id,
        doctor_id: confirmingSlot.doctor.id,
        scheduled_at: confirmingSlot.slotIso,
        priority,
        reason: `Scheduled via MediFlow AI Copilot (${confirmingSlot.doctor.specialization})`,
      });

      // Successful Booking Message
      const bookedData = {
        doctorName: confirmingSlot.doctor.name,
        patientName: patient.name,
        specialization: confirmingSlot.doctor.specialization,
        time: confirmingSlot.timeStr,
        date: confirmingSlot.dateStr,
        priority: priority.toUpperCase(),
      };

      setMessages((prev) => [
        ...prev,
        {
          id: `booking-success-${Date.now()}`,
          sender: 'assistant',
          text: `🎉 **Appointment Successfully Confirmed!**\n\nThe 30-minute consultation has been locked in the database with GIST exclusion guarantee. Details are outlined below:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          bookedAppointment: bookedData,
        },
      ]);

      setConfirmingSlot(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      const errMsg = err?.message || 'Database booking rejected due to slot conflict.';
      setBookingError(errMsg);
    } finally {
      setBookingInProgress(false);
    }
  };

  return (
    <div className="copilot-container">
      {/* Top Copilot Bar */}
      <div className="copilot-header-card">
        <div className="copilot-header-info">
          <div className="copilot-badge-icon">
            <Sparkles size={20} color="#FFFFFF" />
          </div>
          <div>
            <div className="copilot-title-row">
              <h3>MediFlow AI Scheduling Copilot</h3>
              <span className="copilot-status-pill">
                <span className="pulsing-dot" />
                Active Agent
              </span>
            </div>
            <p className="copilot-subtitle">
              Natural language appointment triage & deterministic slot search with PostgreSQL GIST conflict prevention.
            </p>
          </div>
        </div>

        {/* Patient Context Selector */}
        <div className="copilot-patient-context">
          <label className="copilot-patient-label">
            <User size={13} style={{ display: 'inline', marginRight: 4 }} />
            Active Patient:
          </label>
          <div className="copilot-patient-select-wrap">
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="copilot-patient-select"
              aria-label="Select Patient for Copilot"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.age} yrs)
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="select-arrow-icon" />
          </div>
        </div>
      </div>

      {/* Main Chat Feed */}
      <div className="copilot-chat-surface">
        <div className="copilot-messages-area">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`copilot-bubble-wrap ${
                msg.sender === 'user' ? 'user-align' : 'assistant-align'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className={`copilot-avatar ${msg.isEmergency ? 'emergency-avatar' : ''}`}>
                  {msg.isEmergency ? <AlertOctagon size={16} /> : <Sparkles size={16} />}
                </div>
              )}

              <div
                className={`copilot-bubble ${
                  msg.sender === 'user'
                    ? 'user-bubble'
                    : msg.isEmergency
                    ? 'emergency-bubble'
                    : 'assistant-bubble'
                }`}
              >
                {/* Message Text with markdown formatting */}
                <div className="copilot-message-text">
                  {msg.text.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} style={{ marginBottom: idx < msg.text.split('\n\n').length - 1 ? '0.65rem' : 0 }}>
                      {paragraph.split('**').map((part, partIdx) =>
                        partIdx % 2 === 1 ? <strong key={partIdx}>{part}</strong> : part
                      )}
                    </p>
                  ))}
                </div>

                {/* Booked Appointment Confirmation Card */}
                {msg.bookedAppointment && (
                  <div className="copilot-confirmed-card">
                    <div className="confirmed-card-header">
                      <CheckCircle2 size={18} color="#0D9488" />
                      <strong>Verified Booking Record</strong>
                      <span className="priority-pill normal">GIST Confirmed</span>
                    </div>
                    <div className="confirmed-card-grid">
                      <div>
                        <span className="confirmed-label">Patient</span>
                        <span className="confirmed-val">{msg.bookedAppointment.patientName}</span>
                      </div>
                      <div>
                        <span className="confirmed-label">Physician</span>
                        <span className="confirmed-val">{msg.bookedAppointment.doctorName}</span>
                      </div>
                      <div>
                        <span className="confirmed-label">Department</span>
                        <span className="confirmed-val">{msg.bookedAppointment.specialization}</span>
                      </div>
                      <div>
                        <span className="confirmed-label">Date & Time</span>
                        <span className="confirmed-val">
                          {msg.bookedAppointment.date} at {msg.bookedAppointment.time} (30 mins)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations Cards */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="copilot-recommendations-list">
                    <div className="recommendations-heading">
                      <Stethoscope size={15} color="#0D9488" />
                      <span>Recommended Available Slots:</span>
                    </div>

                    <div className="recommendation-cards-grid">
                      {msg.recommendations.map((rec, rIdx) => (
                        <div key={rec.id} className="copilot-rec-card">
                          <div className="rec-card-top">
                            <div className="rec-rank-badge">Option #{rIdx + 1}</div>
                            <span className="health-pill connected" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                              Available
                            </span>
                          </div>

                          <div className="rec-doctor-info">
                            <h4>{rec.doctor.name}</h4>
                            <span className="rec-specialty">{rec.doctor.specialization}</span>
                          </div>

                          <div className="rec-time-badge">
                            <Calendar size={13} color="#0D9488" />
                            <span>{rec.dateStr}</span>
                            <span style={{ color: '#CBD5E1' }}>•</span>
                            <Clock size={13} color="#0D9488" />
                            <span>{rec.timeStr} (30 min)</span>
                          </div>

                          <p className="rec-rationale">{rec.rationale}</p>

                          <button
                            className="btn btn-primary btn-sm btn-block"
                            onClick={() => handleInitiateBooking(rec)}
                            style={{ marginTop: '0.65rem', justifyContent: 'center' }}
                          >
                            <span>Book This Slot</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clarification Options */}
                {msg.clarificationOptions && (
                  <div className="copilot-options-wrap">
                    {msg.clarificationOptions.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        className="copilot-chip-btn"
                        onClick={() => handleSendMessage(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                <div className="copilot-bubble-timestamp">{msg.timestamp}</div>
              </div>
            </div>
          ))}

          {/* Active Agent Step Indicator */}
          {agentStep && (
            <div className="copilot-bubble-wrap assistant-align">
              <div className="copilot-avatar">
                <RefreshCw size={14} className="spinning-icon" />
              </div>
              <div className="copilot-thinking-bubble">
                <span className="pulsing-dot" />
                <span style={{ fontSize: '0.82rem', color: '#0F766E', fontWeight: 500 }}>
                  {agentStep}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Confirmation Modal / Overlay before Final Booking */}
        {confirmingSlot && (
          <div className="copilot-confirm-dialog">
            <div className="confirm-dialog-content">
              <div className="confirm-dialog-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={20} color="#0D9488" />
                  <h4>Confirm Appointment Booking</h4>
                </div>
                <button
                  className="modal-close-btn"
                  onClick={() => setConfirmingSlot(null)}
                  disabled={bookingInProgress}
                >
                  ✕
                </button>
              </div>

              <div className="confirm-dialog-body">
                {bookingError && (
                  <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                    <AlertTriangle size={16} />
                    <span>{bookingError}</span>
                  </div>
                )}

                <p style={{ fontSize: '0.86rem', color: '#64748B', marginBottom: '1rem' }}>
                  Please verify the consultation details before committing to the database:
                </p>

                <div className="confirm-summary-box">
                  <div className="confirm-row">
                    <span className="row-label">Patient:</span>
                    <span className="row-value">
                      {patients.find((p) => p.id === selectedPatientId)?.name || 'Selected Patient'}
                    </span>
                  </div>
                  <div className="confirm-row">
                    <span className="row-label">Physician:</span>
                    <span className="row-value">{confirmingSlot.doctor.name}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="row-label">Department:</span>
                    <span className="row-value">{confirmingSlot.doctor.specialization}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="row-label">Scheduled Date:</span>
                    <span className="row-value">{confirmingSlot.dateStr}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="row-label">Consultation Slot:</span>
                    <span className="row-value">{confirmingSlot.timeStr} (30 Minutes)</span>
                  </div>
                </div>

                <div className="gist-guarantee-note">
                  <ShieldCheck size={14} color="#0D9488" />
                  <span>
                    Database trigger will lock the physician row and enforce zero overlapping slots via GIST exclusion.
                  </span>
                </div>
              </div>

              <div className="confirm-dialog-footer">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setConfirmingSlot(null)}
                  disabled={bookingInProgress}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleFinalConfirmBooking}
                  disabled={bookingInProgress}
                >
                  {bookingInProgress ? (
                    <>
                      <RefreshCw size={14} className="spinning-icon" />
                      <span>Verifying & Booking...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Confirm & Commit Booking</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Request Chips */}
        <div className="copilot-suggested-queries-bar">
          <div className="chips-scroll">
            <span className="chips-intro">
              <HelpCircle size={13} style={{ display: 'inline', marginRight: 4 }} />
              Try asking:
            </span>
            {SUGGESTED_QUERIES.map((q, idx) => (
              <button
                key={idx}
                className="copilot-suggestion-chip"
                onClick={() => handleSendMessage(q)}
                disabled={isProcessing}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="copilot-input-bar">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="copilot-input-form"
          >
            <input
              type="text"
              className="copilot-text-input"
              placeholder="e.g. Book the earliest cardiologist tomorrow after 2 PM..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isProcessing}
            />
            <button
              type="submit"
              className="btn btn-primary copilot-send-btn"
              disabled={!inputQuery.trim() || isProcessing}
              aria-label="Send query"
            >
              {isProcessing ? (
                <RefreshCw size={16} className="spinning-icon" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
