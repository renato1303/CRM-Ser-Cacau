// Cria uma única vez (para o CRM inteiro) a sequência "Follow-up pós-catálogo"
// e os 4 modelos de mensagem que ela usa. Depois disso, tudo é editável em Configurações.
import { db } from './storage';
import { lastPullSucceeded } from './sync';

const MARKER_ID = 'seed-followup-catalogo-v1';

const MODELOS = [
  {
    id: 'tpl-fu-catalogo-1',
    nome: 'Follow-up catálogo 1 (2 dias)',
    corpo: 'Oi {{primeiro_nome}}, tudo bem? Aqui é da Será Cacau 🍫\n\nConseguiu dar uma olhada no nosso catálogo? Se ficou alguma dúvida sobre os produtos, as embalagens ou como fazer o pedido, é só me chamar por aqui.',
  },
  {
    id: 'tpl-fu-catalogo-2',
    nome: 'Follow-up catálogo 2 (5 dias)',
    corpo: 'Oi {{primeiro_nome}}! Passando para saber se você já escolheu os produtos para a {{empresa}}.\n\nSe quiser, eu monto com você o primeiro pedido e te passo prazos de entrega e condições de pagamento.',
  },
  {
    id: 'tpl-fu-catalogo-3',
    nome: 'Follow-up catálogo 3 (10 dias)',
    corpo: '{{primeiro_nome}}, sei que a rotina é corrida, então vou facilitar: me conta qual é o seu tipo de negócio e o volume que você costuma trabalhar, que eu te mando uma sugestão de pedido inicial pronta para você só aprovar.',
  },
  {
    id: 'tpl-fu-catalogo-4',
    nome: 'Follow-up catálogo 4 (20 dias)',
    corpo: 'Oi {{primeiro_nome}}, vou deixar o catálogo da Será Cacau aqui com você. Quando quiser fazer o pedido ou tirar qualquer dúvida, é só responder esta mensagem que eu te atendo.\n\nAgradeço pela atenção e conte com a gente! 🍫',
  },
];

export function seedFollowupOnce(): boolean {
  if (!lastPullSucceeded()) return false;
  const settings = db.getSettings();
  if (settings.some(s => s.id === MARKER_ID)) return false;

  const templates = db.getMessageTemplates();
  const missing = MODELOS.filter(m => !templates.some(t => t.id === m.id));
  if (missing.length) {
    db.saveMessageTemplates([...templates, ...missing.map(m => ({ ...m, canal: 'whatsapp', variaveis: ['primeiro_nome', 'empresa'] }))]);
  }

  const sequences = db.getFollowupSequences();
  if (!sequences.some(s => s.id === 'seq-pos-catalogo')) {
    db.saveFollowupSequences([...sequences, {
      id: 'seq-pos-catalogo',
      nome: 'Follow-up pós-catálogo',
      ativo: true,
      gatilho: { tipo: 'documento', palavraChave: 'catálogo' },
      pausarQuandoResponder: true,
      janela: { dias: [1, 2, 3, 4, 5, 6], inicio: '09:00', fim: '19:00' },
      passos: [
        { id: 'p1', diasApos: 2, templateId: 'tpl-fu-catalogo-1' },
        { id: 'p2', diasApos: 5, templateId: 'tpl-fu-catalogo-2' },
        { id: 'p3', diasApos: 10, templateId: 'tpl-fu-catalogo-3' },
        { id: 'p4', diasApos: 20, templateId: 'tpl-fu-catalogo-4' },
      ],
      createdAt: new Date().toISOString(),
    }]);
  }

  db.saveSettings([...settings, { id: MARKER_ID, feitaEm: new Date().toISOString() }]);
  return true;
}
