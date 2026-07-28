'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';

export interface ToastOptions {
  title?: string;
  message: string;
  type?: 'warning' | 'info' | 'error' | 'success';
  durationMs?: number;
}

export interface ToastItem extends ToastOptions {
  id: string;
}

export interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(({ title = 'AUDIO FILE REQUIRED', message, type = 'warning', durationMs = 4000 }: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
      if (prev.some((t) => t.title === title && t.message === message)) {
        return prev;
      }
      return [...prev, { id, title, message, type, durationMs }];
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getIcon = (type: 'warning' | 'info' | 'error' | 'success' = 'warning') => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-[#C84B31]" />;
      case 'warning':
      default:
        return <AlertTriangle className="w-5 h-5 text-[#C84B31]" />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-20 right-6 z-[100] flex flex-col gap-3 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-[#111113] text-[#F6F4F0] border border-[#C84B31]/40 p-4 rounded-lg shadow-2xl flex items-start gap-3.5 animate-toast-slide-in relative overflow-hidden"
          >
            <div
              className="absolute bottom-0 left-0 h-1 bg-[#C84B31]"
              style={{
                animationName: 'toastProgress',
                animationDuration: `${toast.durationMs || 4000}ms`,
                animationTimingFunction: 'linear',
                animationFillMode: 'forwards',
              }}
            />

            <div className="p-2 rounded-full bg-[#C84B31]/20 shrink-0 mt-0.5">
              {getIcon(toast.type)}
            </div>

            <div className="flex-1 pr-4">
              <div className="font-mono text-xs font-bold tracking-wider text-[#C84B31] uppercase">
                {toast.title}
              </div>
              <div className="text-xs text-[#E2DFD7] font-sans mt-1 leading-relaxed">
                {toast.message}
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-[#8C887B] hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
