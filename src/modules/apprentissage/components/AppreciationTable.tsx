import { useEffect, useState } from 'react';
import { useAppreciationStore, type Appreciation, type Domaine } from '../../../shared/stores/appreciationStore';
import type { NiveauAcquisition } from '../../../shared/types';

interface AppreciationTableProps {
  eleveId: number;
  periodeId: number;
}

const NIVEAU_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Non evalue' },
  { value: 'debut', label: 'Debut' },
  { value: 'en_cours_acquisition', label: 'En cours d\'acquisition' },
  { value: 'maitrise', label: 'Maitrise' },
];

const NIVEAU_COLORS: Record<string, string> = {
  '': 'text-slate-400',
  debut: 'text-red-600 bg-red-50',
  en_cours_acquisition: 'text-amber-600 bg-amber-50',
  maitrise: 'text-green-600 bg-green-50',
};

export function AppreciationTable({ eleveId, periodeId }: AppreciationTableProps) {
  const { domaines, appreciations, isLoading, loadDomaines, loadAppreciations, updateAppreciation } = useAppreciationStore();

  useEffect(() => {
    loadDomaines();
  }, [loadDomaines]);

  useEffect(() => {
    if (periodeId) {
      loadAppreciations(eleveId, periodeId);
    }
  }, [eleveId, periodeId, loadAppreciations]);

  const activeDomaines = domaines.filter(d => d.actif);

  // Build map: domaineId -> latest appreciation
  const appreciationMap = new Map<number, Appreciation>();
  for (const a of appreciations) {
    const existing = appreciationMap.get(a.domaineId);
    if (!existing || a.createdAt > existing.createdAt) {
      appreciationMap.set(a.domaineId, a);
    }
  }

  if (isLoading) {
    return <div className="text-sm text-slate-400 text-center py-8">Chargement...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 w-[200px]">Domaine</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 w-[180px]">Niveau</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Observations</th>
          </tr>
        </thead>
        <tbody>
          {activeDomaines.map(domaine => (
            <DomainRow
              key={domaine.id}
              domaine={domaine}
              appreciation={appreciationMap.get(domaine.id) || null}
              onUpdateAppreciation={updateAppreciation}
            />
          ))}
        </tbody>
      </table>

      {activeDomaines.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          Aucun domaine actif. Configurez les domaines dans les parametres.
        </div>
      )}
    </div>
  );
}

function DomainRow({
  domaine,
  appreciation,
  onUpdateAppreciation,
}: {
  domaine: Domaine;
  appreciation: Appreciation | null;
  onUpdateAppreciation: (id: number, data: { niveau?: NiveauAcquisition | null; observations?: string }) => Promise<void>;
}) {
  const [editingObs, setEditingObs] = useState(false);
  const [obsText, setObsText] = useState(appreciation?.observations || '');

  useEffect(() => {
    setObsText(appreciation?.observations || '');
  }, [appreciation]);

  const handleNiveauChange = async (value: string) => {
    if (!appreciation) return;
    const niveau = value === '' ? null : value as NiveauAcquisition;
    await onUpdateAppreciation(appreciation.id, { niveau });
  };

  const handleObsSave = async () => {
    if (!appreciation) return;
    await onUpdateAppreciation(appreciation.id, { observations: obsText.trim() });
    setEditingObs(false);
  };

  const niveauValue = appreciation?.niveau || '';
  const niveauColor = NIVEAU_COLORS[niveauValue] || '';

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-2 px-3 font-medium text-slate-700">{domaine.nom}</td>
      <td className="py-2 px-3">
        {appreciation ? (
          <select
            value={niveauValue}
            onChange={e => handleNiveauChange(e.target.value)}
            className={`text-xs px-2 py-1 border border-slate-200 rounded outline-none ${niveauColor}`}
          >
            {NIVEAU_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-slate-300 italic">Non evalue</span>
        )}
      </td>
      <td className="py-2 px-3">
        {appreciation ? (
          editingObs ? (
            <div className="flex gap-1">
              <input
                type="text"
                value={obsText}
                onChange={e => setObsText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleObsSave(); if (e.key === 'Escape') setEditingObs(false); }}
                className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded outline-none"
                autoFocus
              />
              <button onClick={handleObsSave} className="px-2 py-1 text-xs bg-blue-600 text-white rounded">OK</button>
            </div>
          ) : (
            <span
              onClick={() => setEditingObs(true)}
              className="text-xs text-slate-600 cursor-pointer hover:text-blue-600"
            >
              {appreciation.observations || <span className="text-slate-300 italic">Cliquer pour ajouter</span>}
            </span>
          )
        ) : (
          <span className="text-xs text-slate-300 italic">—</span>
        )}
      </td>
    </tr>
  );
}
