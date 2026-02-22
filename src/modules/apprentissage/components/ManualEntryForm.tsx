import { useState } from 'react';
import { useAppreciationStore } from '../../../shared/stores/appreciationStore';
import { useStudentStore } from '../../../shared/stores/studentStore';
import { useConfigStore } from '../../../shared/stores/configStore';
import { NIVEAUX_LSU, type NiveauLsu } from '../../../shared/types';

interface ManualEntryFormProps {
  defaultEleveId?: number;
  defaultPeriodeId?: number;
  onClose: () => void;
  onSaved: () => void;
}

export function ManualEntryForm({ defaultEleveId, defaultPeriodeId, onClose, onSaved }: ManualEntryFormProps) {
  const { students } = useStudentStore();
  const { periodes } = useConfigStore();
  const { domaines, addAppreciation } = useAppreciationStore();

  const activeDomaines = domaines.filter(d => d.actif);

  const [eleveId, setEleveId] = useState<number>(defaultEleveId || (students[0]?.id ?? 0));
  const [periodeId, setPeriodeId] = useState<number>(defaultPeriodeId || (periodes[0]?.id ?? 0));
  const [domaineId, setDomaineId] = useState<number>(activeDomaines[0]?.id ?? 0);
  const [niveau, setNiveau] = useState<string>('');
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [domaineError, setDomaineError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!domaineId) {
      setDomaineError(true);
      return;
    }

    if (!periodeId) return;

    setSaving(true);
    try {
      const success = await addAppreciation({
        eleveId,
        periodeId,
        domaineId,
        niveauLsu: (niveau || null) as NiveauLsu | null,
        observations: observations.trim() || undefined,
      });
      if (success) {
        onSaved();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Saisie manuelle</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Eleve */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Eleve</label>
            <select
              value={eleveId}
              onChange={e => setEleveId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.firstName}</option>
              ))}
            </select>
          </div>

          {/* Periode */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Periode</label>
            {periodes.length === 0 ? (
              <p className="text-xs text-red-500">Configurez les periodes dans les parametres</p>
            ) : (
              <select
                value={periodeId}
                onChange={e => setPeriodeId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none"
              >
                {periodes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nomAffichage || `Periode ${p.numero}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Domaine */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Domaine <span className="text-red-500">*</span>
            </label>
            <select
              value={domaineId}
              onChange={e => { setDomaineId(Number(e.target.value)); setDomaineError(false); }}
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-white outline-none ${
                domaineError ? 'border-red-400' : 'border-slate-300'
              }`}
            >
              <option value={0}>-- Choisir --</option>
              {activeDomaines.map(d => (
                <option key={d.id} value={d.id}>{d.nom}</option>
              ))}
            </select>
            {domaineError && <p className="text-xs text-red-500 mt-1">Domaine obligatoire</p>}
          </div>

          {/* Niveau */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Niveau</label>
            <select
              value={niveau}
              onChange={e => setNiveau(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none"
            >
              {NIVEAUX_LSU.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Observations</label>
            <textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Observations sur les competences..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || periodes.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
