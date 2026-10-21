import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Paperclip, Smile, Mic, FileText, Image as ImageIcon, X, Sparkles, Check, CheckCheck 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';

interface MessageComposerProps {
  onSend: (conteudo: string, tipo?: 'texto' | 'imagem' | 'audio' | 'arquivo' | 'modelo', anexos?: any[]) => void;
  leadContext?: { nome: string; valor: number };
  contactContext?: { nome: string };
}

export const MessageComposer: React.FC<MessageComposerProps> = ({ 
  onSend, leadContext, contactContext 
}) => {
  const { messageTemplates, currentUser } = useStore();
  const [text, setText] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<{ url: string; nome: string; tipo: string }[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emojis = ['👍', '🚀', '😊', '🤝', '🔥', '💡', '✅', '👋', '⭐', '💼'];

  useEffect(() => {
    if (text.endsWith('/')) {
      setShowTemplates(true);
    } else if (!text.includes('/')) {
      setShowTemplates(false);
    }
  }, [text]);

  const handleSendAction = () => {
    if (!text.trim() && attachedFiles.length === 0) return;
    onSend(text, attachedFiles.length > 0 ? 'imagem' : 'texto', attachedFiles);
    setText('');
    setAttachedFiles([]);
    setShowTemplates(false);
  };

  const handleSelectTemplate = (tplCorpo: string) => {
    let filled = tplCorpo
      .replace(/\{\{contato\.nome\}\}/g, contactContext?.nome || 'Cliente')
      .replace(/\{\{contato\.primeiro_nome\}\}/g, contactContext?.nome?.split(' ')[0] || 'Cliente')
      .replace(/\{\{usuario\.nome\}\}/g, currentUser.nome)
      .replace(/\{\{lead\.nome\}\}/g, leadContext?.nome || 'Projeto')
      .replace(/\{\{lead\.valor\}\}/g, leadContext?.valor ? leadContext.valor.toLocaleString('pt-BR') : '0');

    setText(filled);
    setShowTemplates(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const dummyUrl = URL.createObjectURL(file);
    setAttachedFiles(prev => [...prev, { url: dummyUrl, nome: file.name, tipo: file.type }]);
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setRecordingSeconds(0);
      const timer = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
      (window as any).__audioTimer = timer;
    } else {
      setIsRecording(false);
      clearInterval((window as any).__audioTimer);
      // Send dummy audio
      onSend('Mensagem de voz gravada (0:05)', 'audio', [{ url: '#', nome: 'audio.wav', tipo: 'audio/wav' }]);
    }
  };

  return (
    <div className="relative bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4">
      {/* Templates popup on '/' */}
      {showTemplates && messageTemplates.length > 0 && (
        <div className="absolute bottom-full left-4 mb-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-2 z-30">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">Modelos de Mensagem (atalho /)</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {messageTemplates.map(tpl => (
              <div
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl.corpo)}
                className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs"
              >
                <p className="font-bold text-slate-900 dark:text-slate-100">{tpl.nome}</p>
                <p className="text-slate-500 truncate">{tpl.corpo}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emoji Picker popup */}
      {showEmojis && (
        <div className="absolute bottom-full left-4 mb-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl grid grid-cols-5 gap-2 z-30">
          {emojis.map(e => (
            <button
              key={e}
              onClick={() => {
                setText(prev => prev + e);
                setShowEmojis(false);
              }}
              className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-lg"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span className="truncate max-w-[150px]">{file.nome}</span>
              <button onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}>
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Anexar arquivo"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <button
          onClick={() => setShowEmojis(!showEmojis)}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Inserir emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        <input
          type="text"
          placeholder="Digite sua mensagem (use '/' para modelos)..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendAction();
            }
          }}
          className="flex-1 px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500"
        />

        {isRecording ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-semibold animate-pulse">
            <span>Gravando... 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
            <button onClick={toggleRecording} className="p-1 bg-red-600 text-white rounded-full">
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={toggleRecording}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Gravar áudio"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}

        <Button onClick={handleSendAction} size="sm">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
