import { GoogleGenAI } from '@google/genai';

const apiKey = typeof window !== 'undefined' 
  ? (import.meta.env.VITE_GEMINI_API_KEY || '') 
  : '';

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateAiSummary(leadContext: string): Promise<string> {
  if (!ai) {
    return 'Chave de API Gemini não configurada. Configure VITE_GEMINI_API_KEY para habilitar recursos de IA.';
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analise as seguintes informações do lead, conversas e notas e forneça um resumo executivo estratégico em português com os pontos principais e próximos passos recomendados:\n\n${leadContext}`,
    });
    return response.text || 'Não foi possível gerar o resumo.';
  } catch (error) {
    console.error('Erro na IA:', error);
    return 'Erro ao processar resumo com IA.';
  }
}

export async function rewriteMessage(text: string, tone: 'formal' | 'friendly' | 'shorter' | 'correct'): Promise<string> {
  if (!ai) return text;

  const prompts = {
    formal: 'Reescreva a seguinte mensagem de atendimento comercial em um tom profissional, corporativo e polido em português:',
    friendly: 'Reescreva a seguinte mensagem em um tom amigável, acolhedor e empático (com emojis adequados) em português:',
    shorter: 'Resuma e torne mais concisa a seguinte mensagem comercial em português:',
    correct: 'Corrija erros gramaticais e de ortografia da seguinte mensagem comercial em português:'
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${prompts[tone]}\n\n"${text}"`,
    });
    return response.text?.trim().replace(/^["']|["']$/g, '') || text;
  } catch (error) {
    console.error('Erro ao reescrever:', error);
    return text;
  }
}

export async function suggestReplies(conversationHistory: string): Promise<string[]> {
  if (!ai) return ['Olá! Como posso ajudar?', 'Entendido, vou verificar aqui.', 'Pode enviar mais detalhes?'];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Com base na seguinte conversa de atendimento, sugira exatamente 3 respostas curtas e profissionais que o atendente pode enviar. Retorne cada resposta separada por quebra de linha:\n\n${conversationHistory}`,
    });
    const text = response.text || '';
    const replies = text.split('\n').filter(s => s.trim().length > 3).slice(0, 3);
    return replies.length > 0 ? replies : ['Olá! Como posso ajudar?', 'Entendido, vou verificar aqui.', 'Pode enviar mais detalhes?'];
  } catch {
    return ['Olá! Como posso ajudar?', 'Entendido, vou verificar aqui.', 'Pode enviar mais detalhes?'];
  }
}

export async function askAiAnalyst(question: string, aggregatedData: string): Promise<{ text: string; chartType?: 'bar' | 'pie' | 'line'; data?: any[] }> {
  if (!ai) {
    return { text: 'Chave de API Gemini não configurada.' };
  }

  try {
    const prompt = `Analise os dados agregados abaixo e responda à pergunta do usuário. Retorne um JSON válido com a estrutura: {"text": "...", "chartType": "bar", "data": [{"name": "A", "value": 10}]}. Dados: ${aggregatedData}. Pergunta: ${question}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const raw = response.text?.trim() || '{}';
    const cleanJson = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return parsed;
  } catch (e) {
    console.error('Erro no Analista IA:', e);
    return { text: 'Não foi possível processar a análise com IA.' };
  }
}

export async function runAiSupportAgent(message: string, knowledgeBase: string): Promise<string> {
  if (!ai) return 'Olá! Sou o assistente de IA. Como posso ajudar?';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Você é um agente de atendimento ao cliente em um CRM. Use a base de conhecimento abaixo para responder à mensagem do cliente em português.\n\nBase:\n${knowledgeBase}\n\nCliente:\n"${message}"`,
    });
    return response.text?.trim() || 'Entendido!';
  } catch {
    return 'Entendido, um atendente humano irá assumir em instantes.';
  }
}
