import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User as UserIcon } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { ai } from '../../services/ai';

export const AICopilotDrawer: React.FC = () => {
  const { aiCopilotOpen, setAiCopilotOpen, leads, currentUser } = useStore();
  const [messages, setMessages] = useState<{ sender: 'ai' | 'user'; text: string }[]>([
    { sender: 'ai', text: `Olá ${currentUser.nome}! Sou seu Copiloto de IA no Será Cacau CRM. Como posso ajudar com suas vendas ou análise de leads hoje?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      let responseText = '';
      if (ai) {
        const leadContextSummary = leads.slice(0, 10).map(l => `- ${l.nome} (R$ ${l.valor})`).join('\n');
        const prompt = `Você é um assistente de IA especialista em CRM de vendas conversacionais chamado Será Cacau CRM. Aqui estão alguns leads atuais do sistema:\n${leadContextSummary}\n\nPergunta do usuário: "${userText}"\n\nResponda de forma objetiva, profissional e estratégica em português do Brasil.`;
        const res = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        responseText = res.text || 'Entendido!';
      } else {
        responseText = 'Chave de API Gemini não configurada. Configure VITE_GEMINI_API_KEY para habilitar o assistente inteligente completo.';
      }

      setMessages(prev => [...prev, { sender: 'ai', text: responseText }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { sender: 'ai', text: 'Desculpe, ocorreu um erro ao processar sua solicitação.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!aiCopilotOpen && (
        <button
          onClick={() => setAiCopilotOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center gap-2 transition-transform hover:scale-105 group"
          title="Abrir Copiloto de IA"
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-sm font-semibold">
            Copiloto IA
          </span>
        </button>
      )}

      {/* Drawer */}
      {aiCopilotOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold">Copiloto IA Será Cacau CRM</h3>
            </div>
            <button
              onClick={() => setAiCopilotOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
                {m.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 items-center text-slate-400 text-xs">
                <Bot className="w-4 h-4 animate-bounce text-indigo-500" />
                <span>IA pensando...</span>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Pergunte algo à IA..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              />
              <Button type="submit" size="sm" disabled={!input.trim() || loading}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
