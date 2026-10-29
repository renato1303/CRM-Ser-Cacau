import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/cn';
import { Lead } from '../../types';

interface Props {
  lead: Lead | null;
  stageName: string;
  onConfirm: (valorFechado: number) => void;
  onCancel: () => void;
}

// Ao marcar como venda ganha, pede o valor final (já preenchido com o negociado)
export const WonValueModal: React.FC<Props> = ({ lead, stageName, onConfirm, onCancel }) => {
  const [valor, setValor] = useState('');

  useEffect(() => {
    if (lead) setValor(String(lead.valorFechado ?? lead.valor ?? 0).replace('.', ','));
  }, [lead]);

  const parsed = Number(valor.replace(/\./g, '').replace(',', '.'));
  const valid = valor.trim() !== '' && !Number.isNaN(parsed) && parsed >= 0;

  return (
    <Modal isOpen={!!lead} onClose={onCancel} title={`Mover para "${stageName}"`} maxWidth="sm">
      {lead && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (valid) onConfirm(parsed); }}
          className="space-y-4"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{lead.nome}</p>
            <p className="text-xs text-slate-500">Valor negociado: {formatCurrency(lead.valor || 0)}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Valor fechado (R$)</label>
            <input
              autoFocus
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {!valid && <p className="text-[11px] text-red-500">Digite um valor válido, por exemplo 12500,00.</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" variant="success" disabled={!valid}>Confirmar venda</Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
