import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

// Confirmação dentro do próprio CRM (substitui o window.confirm do navegador,
// que pode ser bloqueado em silêncio e aí nada acontece ao clicar).
// Uso: if (await confirmDialog({ title: 'Excluir?', message: '...' })) { ... }

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const EVENT = 'crm-confirm-dialog';

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    window.dispatchEvent(new CustomEvent<Pending>(EVENT, { detail: { ...options, resolve } }));
  });
}

// Coloque uma vez no layout principal (Shell)
export const ConfirmDialogHost: React.FC = () => {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => setPending((e as CustomEvent<Pending>).detail);
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  if (!pending) return null;
  const danger = pending.danger !== false;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => close(false)} />
      <div role="alertdialog" aria-modal="true" className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
        <div className="flex items-start gap-3">
          {danger && (
            <div className="w-9 h-9 shrink-0 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{pending.title}</h2>
            {pending.message && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line">{pending.message}</p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            className="px-3 py-2 text-xs rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {pending.cancelLabel || 'Cancelar'}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => close(true)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {pending.confirmLabel || (danger ? 'Excluir' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
};
