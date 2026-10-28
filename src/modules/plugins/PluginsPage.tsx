import React, { useState, useEffect } from 'react';
import { 
  Plug, CheckCircle2, AlertCircle, Radio, Shield, Save, RefreshCw, Send, Zap, 
  MessageSquare, Instagram, Globe, Mail, Phone, ExternalLink, Settings2, Trash2, 
  Check, ArrowRight, HelpCircle, Lock, Users, Layers, Activity, QrCode, Smartphone, Link as LinkIcon 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/ui/Button';
import { db } from '../../services/db/storage';

interface WhatsAppAccount {
  id: string;
  waba_id: string;
  phone_number_id: string;
  display_name: string;
  formatted_number: string;
  quality_rating: string;
  message_limit: string;
  coexistence: boolean;
  status: string;
}

interface QRInstance {
  id: string;
  instanceName: string;
  nomeConexao: string;
  status: string;
  numero?: string;
  perfilNome?: string;
}

export const PluginsPage: React.FC = () => {
  const { addToast, refreshData } = useStore();
  const [activeTab, setActiveTab] = useState<'canais' | 'integracoes' | 'webhooks'>('canais');
  const [syncingMessages, setSyncingMessages] = useState(false);

  const [officialAccounts, setOfficialAccounts] = useState<WhatsAppAccount[]>([
    {
      id: 'ph-123456789',
      waba_id: 'waba-987654321',
      phone_number_id: 'ph-123456789',
      display_name: 'Será Cacau Atendimento',
      formatted_number: '+55 (11) 97777-8888',
      quality_rating: 'GREEN',
      message_limit: 'TIER_1K',
      coexistence: true,
      status: 'conectado'
    }
  ]);

  const [qrInstances, setQrInstances] = useState<QRInstance[]>(() => db.getWaQrInstances());

  useEffect(() => {
    fetch('/api/crm/data')
      .then(res => res.json())
      .then(data => {
        if (data.wa_qr_instances && Array.isArray(data.wa_qr_instances)) {
          const mapped = data.wa_qr_instances.map((i: any) => ({
            id: i.id || i.instance_name,
            instanceName: i.instance_name || i.id,
            nomeConexao: i.nome_conexao || i.instance_name,
            status: i.status || 'open',
            numero: i.numero || '',
            perfilNome: i.perfil_nome || i.nome_conexao
          }));
          setQrInstances(mapped);
          db.saveWaQrInstances(mapped);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    db.saveWaQrInstances(qrInstances);
    // Also sync to server crm data
    fetch('/api/crm/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wa_qr_instances: qrInstances })
    }).catch(() => {});
  }, [qrInstances]);

  // Assistant modal state
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantStep, setAssistantStep] = useState<1 | 2 | 3 | 4>(1);

  // QR Assistant modal state
  const [qrAssistantOpen, setQrAssistantOpen] = useState(false);
  const [qrStep, setQrStep] = useState<1 | 2 | 3 | 4>(1);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [connName, setConnName] = useState('Atendimento WhatsApp');
  const [ignoreGroups, setIgnoreGroups] = useState(true);
  const [rejectCall, setRejectCall] = useState(false);
  const [importHistory, setImportHistory] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const [currentQrBase64, setCurrentQrBase64] = useState<string | null>(null);
  const [fixedInstanceName, setFixedInstanceName] = useState<string | null>(null);
  const [evolutionError, setEvolutionError] = useState<string | null>(null);
  const [serverTestResult, setServerTestResult] = useState<any | null>(null);
  const [testingServer, setTestingServer] = useState(false);

  // Link Existing Instance modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [availableInstances, setAvailableInstances] = useState<any[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(false);

  // Manage modal for QR instance
  const [manageQrInstance, setManageQrInstance] = useState<QRInstance | null>(null);

  const handleStartQrAssistant = () => {
    setQrStep(1);
    setRiskAccepted(false);
    setConnName('Atendimento WhatsApp ' + Math.floor(10 + Math.random() * 90));
    setEvolutionError(null);
    setCurrentQrBase64(null);
    // Generate ONE fixed instance name for this session
    setFixedInstanceName('wa_qr_' + Date.now());
    setQrAssistantOpen(true);
  };

  const handleTestEvolutionServer = async () => {
    setTestingServer(true);
    setServerTestResult(null);
    try {
      const res = await fetch('/api/evolution/test', { method: 'POST' });
      const data = await res.json();
      setServerTestResult(data);
      if (data.success) {
        addToast('Servidor Conectado', `Evolution API ${data.version} respondendo em ${data.url}`, 'success');
      } else {
        addToast('Falha no Teste', data.error || 'Não foi possível conectar ao servidor Evolution.', 'error');
      }
    } catch (err: any) {
      setServerTestResult({ success: false, error: err.message });
      addToast('Erro de Rede', err.message, 'error');
    } finally {
      setTestingServer(false);
    }
  };

  const handleCreateOrConnectInstance = async () => {
    if (!fixedInstanceName) return;
    setQrLoading(true);
    setEvolutionError(null);

    try {
      const res = await fetch('/api/evolution/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: fixedInstanceName,
          options: {
            nomeConexao: connName,
            ignoreGroups,
            rejectCall,
            importHistory
          }
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Falha ao conectar à Evolution API');
      }

      if (data.qrBase64) {
        setCurrentQrBase64(data.qrBase64);
      }
      setQrStep(3);
    } catch (err: any) {
      setEvolutionError(err.message || 'Erro ao gerar QR Code');
      addToast('Erro', err.message, 'error');
    } finally {
      setQrLoading(false);
    }
  };

  const handleRefreshQr = async () => {
    if (!fixedInstanceName) return;
    setQrLoading(true);
    try {
      const res = await fetch('/api/evolution/connect-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: fixedInstanceName })
      });
      const data = await res.json();
      if (data.qrBase64) {
        setCurrentQrBase64(data.qrBase64);
        addToast('QR Code Atualizado', 'Novo QR gerado para a mesma instância.', 'success');
      }
    } catch (err: any) {
      addToast('Erro', 'Não foi possível atualizar o QR code.', 'error');
    } finally {
      setQrLoading(false);
    }
  };

  // Detecta sozinho quando o celular conecta (etapa 3 do assistente)
  useEffect(() => {
    if (!qrAssistantOpen || qrStep !== 3 || !fixedInstanceName) return;
    let cancelled = false;
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/evolution/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instanceName: fixedInstanceName, nomeConexao: connName })
        });
        const data = await res.json();
        if (cancelled || !res.ok || data.state !== 'open') return;
        cancelled = true;
        const connected: QRInstance = {
          id: fixedInstanceName,
          instanceName: fixedInstanceName,
          nomeConexao: connName,
          status: 'open',
          numero: data.numero || '',
          perfilNome: data.profileName || connName
        };
        setQrInstances(prev => [connected, ...prev.filter(i => i.instanceName !== fixedInstanceName)]);
        setQrAssistantOpen(false);
        setQrStep(1);
        if (data.warning) addToast('Atenção', data.warning, 'info');
        addToast('WhatsApp conectado', `${data.numero || fixedInstanceName} conectado. As mensagens novas vão aparecer em Chats.`, 'success');
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [qrAssistantOpen, qrStep, fixedInstanceName, connName, addToast]);

  const handleFetchAvailableInstances = async () => {
    setLoadingInstances(true);
    setLinkModalOpen(true);
    try {
      const res = await fetch('/api/evolution/instances');
      const data = await res.json();
      setAvailableInstances(data.instances || []);
    } catch (err) {
      addToast('Erro', 'Falha ao buscar instâncias na Evolution API.', 'error');
    } finally {
      setLoadingInstances(false);
    }
  };

  const handleLinkInstance = async (inst: any) => {
    const instName = inst.name || inst.instanceName;
    try {
      const res = await fetch('/api/evolution/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: instName, nomeConexao: inst.profileName || 'Instância ' + instName })
      });
      const data = await res.json();
      if (res.ok) {
        const linked: QRInstance = {
          id: 'link-' + Date.now(),
          instanceName: instName,
          nomeConexao: data.profileName || inst.profileName || 'Instância ' + instName,
          status: data.state || 'open',
          numero: data.numero || inst.owner || inst.number || '',
          perfilNome: data.profileName || inst.profileName
        };
        const updated = [linked, ...qrInstances.filter(i => i.instanceName !== instName)];
        setQrInstances(updated);
        db.saveWaQrInstances(updated);
        setLinkModalOpen(false);
        addToast('Instância Vinculada', `A instância ${instName} (${linked.numero}) foi vinculada e o webhook foi configurado.`, 'success');
        if (data.warning) addToast('Atenção', data.warning, 'info');
      } else {
        throw new Error(data.error || 'Não foi possível vincular a instância.');
      }
    } catch (err: any) {
      addToast('Erro ao vincular', err.message || 'Não foi possível vincular a instância.', 'error');
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-950 flex flex-col text-slate-100">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Plug className="w-6 h-6 text-emerald-500" /> Canais e Integrações de Atendimento
          </h2>
          <p className="text-xs text-slate-400">Gerencie canais oficiais e não oficiais para centralizar conversas no CRM.</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: 'canais', label: 'Canais' },
            { id: 'integracoes', label: 'Integrações' },
            { id: 'webhooks', label: 'Webhooks e API' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'canais' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* WhatsApp QR Code Card (Evolution API v2) */}
            <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">Não oficial</span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${qrInstances.length > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${qrInstances.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      {qrInstances.length > 0 ? `${qrInstances.length} Ativo(s)` : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">WhatsApp via QR Code</h3>
                  <p className="text-xs text-slate-400 mt-1">Conecte lendo o QR Code em Aparelhos conectados. Rápido, sem aprovação da Meta.</p>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-800">
                {qrInstances.length > 0 ? (
                  <div className="space-y-2">
                    {qrInstances.map(inst => (
                      <div key={inst.id} className="flex items-center justify-between p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
                        <div className="truncate pr-2">
                          <p className="text-xs font-bold text-white truncate">{inst.nomeConexao}</p>
                          <p className="text-[10px] text-slate-400">{inst.numero || inst.instanceName}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setManageQrInstance(inst)} className="text-[11px] h-7 px-2.5 shrink-0">
                          Gerenciar
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button onClick={handleStartQrAssistant} size="sm" variant="outline" className="flex-1 text-xs gap-1 border-dashed border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
                        + Novo QR
                      </Button>
                      <Button onClick={handleFetchAvailableInstances} size="sm" variant="outline" className="flex-1 text-xs gap-1 border-dashed border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10">
                        <LinkIcon className="w-3.5 h-3.5" /> Vincular existente
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button onClick={handleStartQrAssistant} size="sm" className="w-full gap-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold">
                      <QrCode className="w-4 h-4" /> Conectar via QR Code
                    </Button>
                    <Button onClick={handleFetchAvailableInstances} size="sm" variant="outline" className="w-full gap-2 text-xs border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10">
                      <LinkIcon className="w-3.5 h-3.5" /> Vincular instância existente
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Connection Assistant Modal */}
      {qrAssistantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-xl w-full space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">Conexão Não Oficial (Evolution API v2)</span>
                <h3 className="font-bold text-lg text-white mt-1">Assistente de Conexão por QR Code</h3>
              </div>
              <button onClick={() => setQrAssistantOpen(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            {/* Steps Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Etapa {qrStep} de 4</span>
                <span>{qrStep === 1 ? 'Riscos' : qrStep === 2 ? 'Configurar' : qrStep === 3 ? 'Ler QR Code' : 'Conectado'}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${(qrStep / 4) * 100}%` }} />
              </div>
            </div>

            {/* Step 1: Risks Warning */}
            {qrStep === 1 && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs text-amber-200">
                  <p className="font-bold flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" /> Aviso Importante sobre Conexões Não Oficiais</p>
                  <p>Esta conexão utiliza automação de navegador (Baileys) e não é endossada oficialmente pelo WhatsApp:</p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-300">
                    <li>Risco de bloqueio do número caso haja denúncias de spam ou disparos em massa.</li>
                    <li>O celular conectado precisa abrir o aplicativo do WhatsApp pelo menos a cada 14 dias para manter a sessão ativa.</li>
                  </ul>
                </div>

                <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 cursor-pointer">
                  <input type="checkbox" checked={riskAccepted} onChange={e => setRiskAccepted(e.target.checked)} className="w-4 h-4 text-amber-500 rounded" />
                  <span className="text-xs font-semibold text-slate-200">Compreendo os riscos e aceito os termos de uso da conexão por QR Code.</span>
                </label>

                <div className="flex justify-end pt-2">
                  <Button disabled={!riskAccepted} onClick={() => setQrStep(2)} className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs gap-2">
                    Continuar <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Configuration */}
            {qrStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Conexão</label>
                  <input type="text" value={connName} onChange={e => setConnName(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white" />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={ignoreGroups} onChange={e => setIgnoreGroups(e.target.checked)} className="text-amber-500" />
                    <span>Ignorar mensagens de Grupos do WhatsApp</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={rejectCall} onChange={e => setRejectCall(e.target.checked)} className="text-amber-500" />
                    <span>Rejeitar chamadas recebidas automaticamente</span>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <Button type="button" variant="outline" size="sm" onClick={handleTestEvolutionServer} disabled={testingServer} className="gap-2 text-xs">
                    <RefreshCw className={`w-3.5 h-3.5 ${testingServer ? 'animate-spin' : ''}`} /> Testar Servidor Evolution
                  </Button>
                  {serverTestResult && (
                    <span className={`text-[11px] font-bold ${serverTestResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {serverTestResult.success ? `Conectado (${serverTestResult.version})` : 'Falha na conexão'}
                    </span>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <Button onClick={() => setQrStep(1)} variant="outline" size="sm">Voltar</Button>
                  <Button onClick={() => { setQrStep(3); handleCreateOrConnectInstance(); }} className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs gap-2">
                    Gerar QR Code <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Scan QR Code */}
            {qrStep === 3 && (
              <div className="space-y-4 text-center">
                <div className="w-56 h-56 bg-white p-3 rounded-2xl mx-auto flex items-center justify-center shadow-inner relative">
                  {qrLoading ? (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
                      <span className="text-[11px] text-slate-600 font-semibold">Carregando QR Code...</span>
                    </div>
                  ) : evolutionError ? (
                    <div className="w-full h-full bg-red-950/80 p-3 rounded-xl flex flex-col items-center justify-center text-red-200 text-xs overflow-y-auto">
                      <AlertCircle className="w-6 h-6 text-red-400 mb-1" />
                      <p className="font-bold">Erro de Conexão:</p>
                      <p className="text-[10px] mt-1 text-red-300 font-mono text-left break-all">{evolutionError}</p>
                    </div>
                  ) : currentQrBase64 ? (
                    <img src={currentQrBase64} alt="Evolution QR Code" className="w-full h-full object-contain rounded-xl" />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
                      <span className="text-[11px] text-slate-600 font-semibold">Gerando QR na mesma instância...</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  No celular, abra o <strong className="text-white">WhatsApp ➔ Aparelhos Conectados ➔ Conectar um aparelho</strong> e aponte para este código.
                </p>

                <div className="pt-2 flex gap-2">
                  <Button onClick={handleTestEvolutionServer} variant="outline" size="sm" className="flex-1 gap-1 text-xs">
                    <RefreshCw className="w-3.5 h-3.5" /> Testar Servidor
                  </Button>
                  <Button onClick={handleRefreshQr} size="sm" className="flex-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs">
                    Gerar Novo QR
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Link Existing Instance Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white">Vincular Instância Existente</h3>
            <p className="text-xs text-slate-400">Selecione uma instância já ativa na Evolution API:</p>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {loadingInstances ? (
                <div className="py-8 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></div>
              ) : availableInstances.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Nenhuma instância encontrada.</p>
              ) : (
                availableInstances.map((inst, idx) => {
                  const name = inst.name || inst.instanceName;
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700">
                      <div>
                        <p className="text-xs font-bold text-white">{name}</p>
                        <p className="text-[10px] text-slate-400">{inst.connectionStatus || 'desconhecido'}</p>
                      </div>
                      <Button size="sm" onClick={() => handleLinkInstance(inst)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-7">
                        Vincular
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <Button onClick={() => setLinkModalOpen(false)} variant="outline" size="sm" className="w-full">Fechar</Button>
          </div>
        </div>
      )}

      {/* Manage QR Instance Modal */}
      {manageQrInstance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-white">{manageQrInstance.nomeConexao}</h3>
                <p className="text-xs text-slate-400">{manageQrInstance.numero || manageQrInstance.instanceName}</p>
              </div>
              <button onClick={() => setManageQrInstance(null)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 space-y-1 text-xs text-slate-300">
                <div className="flex justify-between"><span>Status da Sessão:</span><span className="text-emerald-400 font-bold uppercase">{manageQrInstance.status}</span></div>
                <div className="flex justify-between"><span>Instância:</span><span className="font-mono text-indigo-400">{manageQrInstance.instanceName}</span></div>
              </div>

              <Button 
                onClick={async () => {
                  setSyncingMessages(true);
                  try {
                    const res = await fetch('/api/evolution/sync', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ instanceName: manageQrInstance.instanceName })
                    });
                    const data = await res.json();
                    if (res.ok) {
                      addToast('Sincronização Concluída', `${data.syncedChats || 0} conversas e ${data.syncedMessages || 0} mensagens importadas.`, 'success');
                      setManageQrInstance(null);
                      refreshData();
                    } else {
                      throw new Error(data.error || 'Erro ao sincronizar');
                    }
                  } catch (err: any) {
                    addToast('Erro', err.message || 'Falha ao sincronizar mensagens.', 'error');
                  } finally {
                    setSyncingMessages(false);
                  }
                }} 
                disabled={syncingMessages} 
                size="sm" 
                className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingMessages ? 'animate-spin' : ''}`} /> Sincronizar Conversas e Mensagens
              </Button>
            </div>

            <div className="pt-2 flex gap-2">
              <Button onClick={() => { setManageQrInstance(null); handleStartQrAssistant(); }} variant="outline" size="sm" className="flex-1 gap-1 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Reconectar
              </Button>
              <Button onClick={() => { setQrInstances(prev => prev.filter(i => i.id !== manageQrInstance.id)); setManageQrInstance(null); addToast('Removido', 'Instância desconectada.', 'info'); }} variant="outline" size="sm" className="text-xs text-red-400 border-red-500/40 hover:bg-red-500/10">
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
