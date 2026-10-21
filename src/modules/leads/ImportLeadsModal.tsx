import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineId: string;
  stageId: string;
}

export const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({ isOpen, onClose, pipelineId, stageId }) => {
  const { addContact, addLead, users, sources, addToast } = useStore();
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        setParsedRows(json);
        setLoading(false);
      } catch (err) {
        console.error(err);
        addToast('Erro ao ler arquivo', 'Certifique-se de que é um arquivo XLSX ou CSV válido.', 'error');
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = () => {
    if (parsedRows.length === 0) return;
    setLoading(true);

    let count = 0;
    parsedRows.forEach((row: any) => {
      const nome = row.Nome || row.nome || row.Lead || row.lead || row.Cliente || row.cliente || 'Lead Importado';
      const telefone = String(row.Telefone || row.telefone || row.Celular || row.celular || '+55 (11) 99999-9999');
      const email = String(row.Email || row.email || row['E-mail'] || row['e-mail'] || `${nome.toLowerCase().replace(/\s+/g, '')}@exemplo.com`);
      const valor = parseFloat(row.Valor || row.valor || row.Preco || row.preco || 5000) || 5000;

      const contact = addContact({
        nome,
        telefones: [telefone],
        emails: [email],
        tags: ['importado_xlsx'],
        customFields: {},
        canais: { whatsapp: telefone },
        consentimentoMarketing: true,
      });

      addLead({
        nome: `Lead: ${nome}`,
        valor,
        pipelineId,
        stageId,
        responsavelId: users[0].id,
        contactIds: [contact.id],
        tags: ['importado', 'entrada'],
        origemId: sources[0]?.id || 'src-1',
        customFields: row,
        produtos: [],
      });

      count++;
    });

    setSuccessCount(count);
    setLoading(false);
    addToast('Importação Concluída', `${count} leads importados com sucesso para Leads de Entrada!`, 'success');
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { setFileName(null); setParsedRows([]); setSuccessCount(null); onClose(); }} title="Importar Leads (XLSX / CSV)">
      <div className="space-y-4">
        {successCount !== null ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-950 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100">Importação Realizada com Sucesso!</h4>
            <p className="text-xs text-slate-500">{successCount} leads foram adicionados na etapa <span className="font-semibold text-indigo-600">Leads de Entrada</span>.</p>
            <Button onClick={() => { setFileName(null); setParsedRows([]); setSuccessCount(null); onClose(); }} className="mt-4">
              Concluir
            </Button>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-800 dark:text-indigo-300">
              <p className="font-semibold mb-1">Instruções para a Planilha:</p>
              <p className="opacity-90">Sua planilha deve conter colunas como <code className="bg-indigo-100 dark:bg-indigo-900 px-1 py-0.5 rounded font-mono">Nome</code>, <code className="bg-indigo-100 dark:bg-indigo-900 px-1 py-0.5 rounded font-mono">Telefone</code>, <code className="bg-indigo-100 dark:bg-indigo-900 px-1 py-0.5 rounded font-mono">Email</code> e <code className="bg-indigo-100 dark:bg-indigo-900 px-1 py-0.5 rounded font-mono">Valor</code>. Todos os leads importados entrarão automaticamente na etapa de <strong>Leads de Entrada</strong>.</p>
            </div>

            <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-900">
              <FileSpreadsheet className="w-10 h-10 text-indigo-500 mb-3" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {fileName ? fileName : 'Clique para selecionar arquivo XLSX ou CSV'}
              </span>
              <span className="text-xs text-slate-400">Suporta .xlsx, .xls e .csv</span>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
            </label>

            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pré-visualização ({parsedRows.length} linhas encontradas):</p>
                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500">
                      <tr>
                        <th className="p-2">Nome</th>
                        <th className="p-2">Telefone</th>
                        <th className="p-2">E-mail</th>
                        <th className="p-2">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {parsedRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td className="p-2">{row.Nome || row.nome || row.Lead || '-'}</td>
                          <td className="p-2">{row.Telefone || row.telefone || '-'}</td>
                          <td className="p-2">{row.Email || row.email || '-'}</td>
                          <td className="p-2">{row.Valor || row.valor || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
              <Button type="button" size="sm" disabled={parsedRows.length === 0 || loading} onClick={handleImport} className="gap-2">
                <Upload className="w-4 h-4" /> Importar para Leads de Entrada
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
