import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={18} color="#0D9488" />}
          {toast.type === 'error' && <AlertCircle size={18} color="#DC2626" />}
          {toast.type === 'warning' && <AlertTriangle size={18} color="#D97706" />}
          {toast.type === 'info' && <Info size={18} color="#2563EB" />}

          <div className="toast-body">
            {toast.title && <div className="toast-title">{toast.title}</div>}
            <div className="toast-msg">{toast.message}</div>
          </div>

          <button
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
