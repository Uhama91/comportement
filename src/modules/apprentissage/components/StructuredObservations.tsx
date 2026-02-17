import type { ObservationResult, NiveauAcquisition } from '../../../shared/types';
import { useAppreciationStore } from '../../../shared/stores/appreciationStore';

interface StructuredObservationsProps {
  observations: ObservationResult[];
  durationMs: number | null;
  onUpdateObservation: (index: number, obs: ObservationResult) => void;
  onAddObservation: () => void;
  onRemoveObservation: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const NIVEAU_OPTIONS: Array<{ value: NiveauAcquisition; label: string }> = [
  { value: 'debut', label: 'Debut' },
  { value: 'en_cours_acquisition', label: 'En cours d\'acquisition' },
  { value: 'maitrise', label: 'Maitrise' },
];

const NIVEAU_COLORS: Record<string, string> = {
  debut: 'text-red-600',
  en_cours_acquisition: 'text-amber-600',
  maitrise: 'text-green-600',
};

export function StructuredObservations({
  observations,
  durationMs,
  onUpdateObservation,
  onAddObservation,
  onRemoveObservation,
  onSave,
  onCancel,
  saving,
}: StructuredObservationsProps) {
  const { domaines } = useAppreciationStore();
  const activeDomaines = domaines.filter(d => d.actif);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Resultat structure ({observations.length} observation{observations.length > 1 ? 's' : ''})
        </h3>
        {durationMs != null && (
          <span className="text-xs text-slate-400">{(durationMs / 1000).toFixed(1)}s</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 w-[180px]">Domaine</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 w-[160px]">Niveau</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Commentaire</th>
              <th className="w-[40px]"></th>
            </tr>
          </thead>
          <tbody>
            {observations.map((obs, index) => (
              <tr key={index} className="border-b border-slate-100">
                {/* Domaine */}
                <td className="py-2 px-3">
                  <select
                    value={obs.domaine}
                    onChange={e => onUpdateObservation(index, { ...obs, domaine: e.target.value })}
                    className="w-full text-xs px-2 py-1 border border-slate-200 rounded outline-none bg-white"
                  >
                    <option value="">-- Domaine --</option>
                    {activeDomaines.map(d => (
                      <option key={d.id} value={d.nom}>{d.nom}</option>
                    ))}
                  </select>
                </td>

                {/* Niveau */}
                <td className="py-2 px-3">
                  <select
                    value={obs.niveau}
                    onChange={e => onUpdateObservation(index, { ...obs, niveau: e.target.value as NiveauAcquisition })}
                    className={`w-full text-xs px-2 py-1 border border-slate-200 rounded outline-none ${NIVEAU_COLORS[obs.niveau] || ''}`}
                  >
                    {NIVEAU_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>

                {/* Commentaire */}
                <td className="py-2 px-3">
                  <input
                    type="text"
                    value={obs.commentaire}
                    onChange={e => onUpdateObservation(index, { ...obs, commentaire: e.target.value })}
                    className="w-full text-xs px-2 py-1 border border-slate-200 rounded outline-none"
                    placeholder="Commentaire..."
                  />
                </td>

                {/* Delete */}
                <td className="py-2 px-1">
                  <button
                    onClick={() => onRemoveObservation(index)}
                    className="text-xs text-red-400 hover:text-red-600 px-1"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <button
        onClick={onAddObservation}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        + Ajouter une ligne
      </button>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onSave}
          disabled={saving || observations.length === 0}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
        >
          {saving ? 'Enregistrement...' : 'Valider et enregistrer'}
        </button>
      </div>
    </div>
  );
}
