import { useState } from 'react';
import { useStudentStore } from '../stores/studentStore';
import { NIVEAUX_ORDERED, NIVEAU_TO_CYCLE, type NiveauCode } from '../types/domaines-officiels';

const CYCLE_COLORS: Record<number, string> = {
  1: 'bg-purple-100 text-purple-700',
  2: 'bg-green-100 text-green-700',
  3: 'bg-blue-100 text-blue-700',
};

export function NiveauxSettings() {
  const { students, updateStudentNiveau, updateStudentNiveauBatch } = useStudentStore();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchNiveau, setBatchNiveau] = useState<NiveauCode>('CM2');
  const [saving, setSaving] = useState(false);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map(s => s.id)));
    }
  };

  const handleBatchAssign = async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      await updateStudentNiveauBatch(Array.from(selectedIds), batchNiveau);
      setSelectedIds(new Set());
    } finally {
      setSaving(false);
    }
  };

  const handleNiveauChange = async (studentId: number, value: string) => {
    const niveau = value === '' ? null : (value as NiveauCode);
    await updateStudentNiveau(studentId, niveau);
  };

  return (
    <div className="space-y-3">
      <div className="font-medium text-slate-800">Niveaux scolaires</div>

      {students.length === 0 ? (
        <div className="text-sm text-slate-400">Aucun eleve. Ajoutez des eleves dans le Module Classe.</div>
      ) : (
        <>
          {/* Batch assignment */}
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
            <button
              onClick={selectAll}
              className="px-2 py-1 text-xs bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              {selectedIds.size === students.length ? 'Deselectionner' : 'Tout selectionner'}
            </button>
            <select
              value={batchNiveau}
              onChange={e => setBatchNiveau(e.target.value as NiveauCode)}
              className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
            >
              {NIVEAUX_ORDERED.map(n => (
                <option key={n.code} value={n.code}>{n.code} — {n.libelle}</option>
              ))}
            </select>
            <button
              onClick={handleBatchAssign}
              disabled={selectedIds.size === 0 || saving}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '...' : `Attribuer (${selectedIds.size})`}
            </button>
          </div>

          {/* Student list */}
          <div className="space-y-1">
            {students.map(s => {
              const niveau = s.niveau as NiveauCode | null;
              const cycle = niveau ? NIVEAU_TO_CYCLE[niveau] : null;

              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    selectedIds.has(s.id) ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 flex-shrink-0"
                  />

                  <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">
                    {s.firstName}
                  </span>

                  <select
                    value={niveau ?? ''}
                    onChange={e => handleNiveauChange(s.id, e.target.value)}
                    className="text-xs px-2 py-1 border border-slate-300 rounded bg-white min-w-[120px]"
                  >
                    <option value="">(non defini)</option>
                    {NIVEAUX_ORDERED.map(n => (
                      <option key={n.code} value={n.code}>{n.code} — {n.libelle}</option>
                    ))}
                  </select>

                  {cycle && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${CYCLE_COLORS[cycle]}`}>
                      C{cycle}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
