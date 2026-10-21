import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Lock, Mail, UserCheck } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, setCurrentUser } = useStore();
  const [email, setEmail] = useState(currentUser.email);
  const [senha, setSenha] = useState('123456');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setCurrentUser(found);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Entrar no Será Cacau CRM" maxWidth="md">
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="bg-indigo-50 dark:bg-indigo-950/50 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-700 dark:text-indigo-300">
          <p className="font-semibold mb-1">Modo de Demonstração / Teste de Permissões</p>
          <p>Selecione abaixo um dos usuários de exemplo para testar diferentes perfis (Admin, Gerente, Vendedor) com senha padrão <span className="font-bold">123456</span> (ou <span className="font-bold">Remah13032019</span> para o Master).</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Selecione o Usuário:</label>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
            {users.map(u => (
              <div
                key={u.id}
                onClick={() => {
                  setEmail(u.email);
                  setCurrentUser(u);
                  onClose();
                }}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  currentUser.id === u.id
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <img src={u.avatar} alt={u.nome} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{u.nome}</p>
                  <p className="text-xs text-slate-500">{u.email} · <span className="font-medium text-indigo-600 dark:text-indigo-400">{u.roleId}</span></p>
                </div>
                {currentUser.id === u.id && <UserCheck className="w-5 h-5 text-indigo-600" />}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Entrar no Sistema</Button>
        </div>
      </form>
    </Modal>
  );
};
