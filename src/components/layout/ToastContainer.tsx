import React from 'react';
import { useStore } from '../../store/useStore';
import { CheckCircle2, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-4 rounded-xl shadow-2xl border border-slate-800 dark:border-slate-200 flex items-start gap-3 animate-in slide-in-from-bottom duration-300"
        >
          {toast.type === 'error' ? (
            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          ) : toast.type === 'info' ? (
            <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          )}

          <div className="flex-1">
            <h4 className="font-bold text-xs">{toast.title}</h4>
            <p className="text-[11px] opacity-80 mt-0.5">{toast.message}</p>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
