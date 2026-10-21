import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, User, Phone, Mail } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';

interface PublicSchedulingPageProps {
  usuarioId: string;
}

export const PublicSchedulingPage: React.FC<PublicSchedulingPageProps> = ({ usuarioId }) => {
  const { users, bookPublicAppointment } = useStore();
  const user = users.find(u => u.id === usuarioId) || users[0];

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);

  const slots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !nome.trim()) return;

    const dataHora = `${selectedDate}T${selectedSlot}:00Z`;
    bookPublicAppointment(nome, telefone, email, dataHora, user.id);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950 text-green-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Reunião Agendada com Sucesso!</h2>
          <p className="text-xs text-slate-500 mb-6">Enviamos os detalhes e o link do vídeo para {email}. Obrigado!</p>
          <Button onClick={() => window.location.hash = '#/painel'} className="w-full">
            Voltar ao CRM
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-indigo-600 text-white flex items-center gap-4">
          <Avatar src={user.avatar} name={user.nome} size="lg" />
          <div>
            <h2 className="text-lg font-bold">Agende sua Reunião com {user.nome}</h2>
            <p className="text-xs text-indigo-200">Selecione uma data e horário livre abaixo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Selecione a Data</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Horários Disponíveis</label>
            <div className="grid grid-cols-4 gap-2">
              {slots.map(slot => (
                <button
                  type="button"
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2 rounded-lg text-xs font-semibold transition-colors border ${
                    selectedSlot === slot
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-500'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Seu Nome Completo *</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Ana Silva"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">WhatsApp / Telefone *</label>
                <input
                  type="text"
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="+55 (11) 91234-5678"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ana@exemplo.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={!selectedSlot || !nome.trim()} className="w-full py-2.5">
            Confirmar Agendamento
          </Button>
        </form>
      </div>
    </div>
  );
};
