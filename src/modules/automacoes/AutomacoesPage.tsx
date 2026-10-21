import React, { useState } from 'react';
import { 
  Workflow, Bot, Plus, Play, CheckCircle2, Settings, Trash2, 
  ArrowRight, Sparkles, MessageSquare, Tag, CheckSquare, Globe 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { AutomationRule, SalesBot, BotNode } from '../../types';

export const AutomacoesPage: React.FC = () => {
  const { 
    automationRules, salesBots, pipelines, 
    addAutomationRule, updateAutomationRule, deleteAutomationRule, 
    addSalesBot, updateSalesBot, deleteSalesBot 
  } = useStore();

  const [tab, setTab] = useState<'funil' | 'salesbots'>('funil');
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [botEditorOpen, setBotEditorOpen] = useState(false);
  const [simulatorModalOpen, setSimulatorModalOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<SalesBot | null>(null);

  // New rule state
  const [ruleName, setRuleName] = useState('');
  const [rulePipelineId, setRulePipelineId] = useState(pipelines[0]?.id || '');
  const [ruleStageId, setRuleStageId] = useState(pipelines[0]?.stages[0]?.id || '');
  const [ruleGatilho, setRuleGatilho] = useState<'lead_entrou' | 'lead_saiu' | 'tempo_etapa' | 'mensagem_recebida' | 'campo_alterado'>('lead_entrou');
  const [ruleAcao, setRuleAcao] = useState('Criar Tarefa de Follow-up');

  // Bot test simulator state
  const [simStep, setSimStep] = useState(0);
  const [simInput, setSimInput] = useState('');
  const [simMessages, setSimMessages] = useState<{ sender: 'bot' | 'user'; text: string }[]>([]);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const newRule: AutomationRule = {
      id: `rule-${Date.now()}`,
      nome: ruleName,
      pipelineId: rulePipelineId,
      stageId: ruleStageId,
      gatilho: ruleGatilho,
      condicoes: {},
      acoes: [ruleAcao],
      atraso: { valor: 0, unidade: 'minutos' },
      ativo: true,
    };

    // Save rule
    const rules = [...automationRules, newRule];
    useStore.setState({ automationRules: rules });
    setRuleName('');
    setRuleModalOpen(false);
  };

  const startBotTest = (bot: SalesBot) => {
    setSelectedBot(bot);
    setSimMessages([
      { sender: 'bot', text: bot.nodes.find(n => n.tipo === 'mensagem')?.config.text || 'Olá! Como posso ajudar?' }
    ]);
    setSimStep(0);
    setSimulatorModalOpen(true);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Automações & Salesbot</h2>
          <p className="text-xs text-slate-500">Funil digital com automações por etapa e construtor visual de Salesbot com IA.</p>
        </div>

        <Button 
          size="sm" 
          onClick={() => tab === 'funil' ? setRuleModalOpen(true) : setBotEditorOpen(true)} 
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> {tab === 'funil' ? 'Nova Regra de Automação' : 'Novo Salesbot'}
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'funil', label: 'Funil Digital (Automações)', badge: automationRules.length },
          { id: 'salesbots', label: 'Salesbots de Atendimento', badge: salesBots.length },
        ]}
        activeTab={tab}
        onChange={(id) => setTab(id as any)}
        className="mb-6"
      />

      {tab === 'funil' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {automationRules.map(rule => (
            <div key={rule.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{rule.nome}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Ativo</span>
                </div>
                <p className="text-xs text-slate-500 mb-2">Gatilho: <span className="font-semibold text-indigo-600 capitalize">{rule.gatilho.replace('_', ' ')}</span></p>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ações:</p>
                  {rule.acoes.map((ac, idx) => (
                    <p key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Workflow className="w-3.5 h-3.5 text-indigo-500" /> {ac}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                <button
                  onClick={() => {
                    const rules = automationRules.filter(r => r.id !== rule.id);
                    useStore.setState({ automationRules: rules });
                  }}
                  className="text-xs text-red-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'salesbots' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {salesBots.map(bot => (
            <div key={bot.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-indigo-600" /> {bot.nome}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Ativo</span>
                </div>
                <p className="text-xs text-slate-500 mb-4">Gatilhos: {bot.gatilhos.join(', ')}</p>
                <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-300 mb-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{bot.estatisticas.executado}</p>
                    <p className="text-[11px] text-slate-400">Execuções</p>
                  </div>
                  <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                    <p className="font-bold text-green-600">{bot.estatisticas.convertido}</p>
                    <p className="text-[11px] text-slate-400">Conversões</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={() => startBotTest(bot)} className="gap-2">
                  <Play className="w-4 h-4 text-indigo-600" /> Testar Bot
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Rule Modal */}
      <Modal isOpen={ruleModalOpen} onClose={() => setRuleModalOpen(false)} title="Nova Regra de Automação">
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Regra *</label>
            <input
              type="text"
              required
              placeholder="Ex: Enviar boas-vindas automáticas"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Gatilho</label>
            <select
              value={ruleGatilho}
              onChange={(e) => setRuleGatilho(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            >
              <option value="lead_entrou">Lead entrou na etapa</option>
              <option value="lead_saiu">Lead saiu da etapa</option>
              <option value="mensagem_recebida">Mensagem recebida</option>
              <option value="tempo_etapa">Tempo limite na etapa</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Ação a Executar</label>
            <select
              value={ruleAcao}
              onChange={(e) => setRuleAcao(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            >
              <option value="Criar Tarefa de Follow-up">Criar Tarefa de Follow-up</option>
              <option value="Enviar Mensagem WhatsApp Padrão">Enviar Mensagem WhatsApp Padrão</option>
              <option value="Alterar Responsável Automático">Alterar Responsável Automático</option>
              <option value="Acionar Salesbot">Acionar Salesbot</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setRuleModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Salvar Regra</Button>
          </div>
        </form>
      </Modal>

      {/* Bot Test Simulator Modal */}
      <Modal isOpen={simulatorModalOpen} onClose={() => setSimulatorModalOpen(false)} title={`Simulador: ${selectedBot?.nome || 'Bot'}`} maxWidth="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-96">
          {/* Canvas Preview */}
          <div className="bg-slate-900 rounded-xl p-4 flex flex-col items-center justify-center text-white relative overflow-hidden">
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-4">Fluxo Visual do Bot (Nó Ativo)</p>
            <div className="space-y-4 w-full max-w-xs">
              {selectedBot?.nodes.map((n, idx) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    idx === simStep ? 'bg-indigo-600 border-indigo-400 font-bold animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <span>{n.titulo}</span>
                  <span className="text-[10px] opacity-70 uppercase">{n.tipo}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Simulator */}
          <div className="flex flex-col bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {simMessages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-xl text-xs max-w-[80%] ${m.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Responder ao bot..."
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!simInput.trim() || !selectedBot) return;
                  const text = simInput;
                  setSimInput('');
                  setSimMessages(prev => [...prev, { sender: 'user', text }]);
                  
                  setTimeout(() => {
                    if (simStep + 1 < selectedBot.nodes.length) {
                      setSimStep(s => s + 1);
                      const nextNode = selectedBot.nodes[simStep + 1];
                      setSimMessages(prev => [...prev, { sender: 'bot', text: nextNode.config.texto || nextNode.config.pergunta || 'Entendido. Próxima etapa do fluxo.' }]);
                    } else {
                      setSimMessages(prev => [...prev, { sender: 'bot', text: 'Atendimento concluído e transferido para humano com sucesso! 🎉' }]);
                    }
                  }, 1000);
                }}
              >
                Enviar
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
