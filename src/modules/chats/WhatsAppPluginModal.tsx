import React, { useState } from 'react';
import { MessageSquare, CheckCircle2, Smartphone, RefreshCw, Radio } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

interface WhatsAppPluginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppPluginModal: React.FC<WhatsAppPluginModalProps> = ({ isOpen, onClose }) => {
  const { addToast } = useStore();
  const [phoneNumber, setPhoneNumber] = useState('+55 (11) 99999-9999');
  const [instanceToken, setInstanceToken] = useState('sera_cacau_wa_prod_99821');
  const [isConnected, setIsConnected] = useState(true);
  const [mirroringActive, setMirroringActive] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnected(true);
    addToast('WhatsApp Conectado', 'Seu WhatsApp foi vinculado e as mensagens estão sendo espelhadas em tempo real.', 'success');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Plugin de Conexão WhatsApp Oficial">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Status: Conectado & Espelhado em Tempo Real</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Todas as mensagens enviadas e recebidas no CRM são salvas e sincronizadas com seu WhatsApp.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Número do WhatsApp Conectado</label>
          <div className="relative">
            <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Token da Instância / API</label>
          <input
            type="text"
            required
            value={instanceToken}
            onChange={(e) => setInstanceToken(e.target.value)}
            className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono outline-none"
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Espelhamento Automático</p>
            <p className="text-[11px] text-slate-500">Salvar e sincronizar todas as mensagens digitadas no CRM</p>
          </div>
          <input
            type="checkbox"
            checked={mirroringActive}
            onChange={(e) => setMirroringActive(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button type="submit" size="sm" className="gap-2">
            <CheckCircle2 className="w-4 h-4" /> Salvar Conexão
          </Button>
        </div>
      </form>
    </Modal>
  );
};
