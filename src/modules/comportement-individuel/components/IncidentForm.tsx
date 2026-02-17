import { useState, useEffect } from 'react';
import { useIncidentStore, EVENT_TYPES, type Incident } from '../../../shared/stores/incidentStore';
import { formatDate } from '../../../shared/utils/periodes';

interface IncidentFormProps {
  eleveId: number;
  editingIncident?: Incident | null;
  onClose: () => void;
  onSaved: () => void;
}

export function IncidentForm({ eleveId, editingIncident, onClose, onSaved }: IncidentFormProps) {
  const { addIncident, updateIncident } = useIncidentStore();

  const now = new Date();
  const todayStr = formatDate(now);
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [dateIncident, setDateIncident] = useState(editingIncident?.dateIncident || todayStr);
  const [heureIncident, setHeureIncident] = useState(editingIncident?.heureIncident || nowTime);
  const [typeEvenement, setTypeEvenement] = useState(editingIncident?.typeEvenement || '');
  const [motif, setMotif] = useState(editingIncident?.motif || '');
  const [description, setDescription] = useState(editingIncident?.description || '');
  const [intervenant, setIntervenant] = useState(editingIncident?.intervenant || 'Enseignant');
  const [motifError, setMotifError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingIncident) {
      setDateIncident(editingIncident.dateIncident);
      setHeureIncident(editingIncident.heureIncident || '');
      setTypeEvenement(editingIncident.typeEvenement);
      setMotif(editingIncident.motif);
      setDescription(editingIncident.description || '');
      setIntervenant(editingIncident.intervenant);
    }
  }, [editingIncident]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!motif.trim()) {
      setMotifError(true);
      return;
    }

    setSaving(true);
    try {
      if (editingIncident) {
        await updateIncident(editingIncident.id, {
          dateIncident,
          heureIncident,
          typeEvenement,
          motif: motif.trim(),
          description: description.trim() || undefined,
          intervenant,
        });
      } else {
        await addIncident({
          eleveId,
          dateIncident,
          heureIncident,
          typeEvenement,
          motif: motif.trim(),
          description: description.trim() || undefined,
          intervenant,
        });
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={onClose}>
      <div
        className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          {editingIncident ? 'Modifier l\'incident' : 'Nouvel incident'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Date + Heure */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">Date</label>
              <input
                type="date"
                value={dateIncident}
                onChange={e => setDateIncident(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">Heure</label>
              <input
                type="time"
                value={heureIncident}
                onChange={e => setHeureIncident(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Type événement */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Type d'evenement</label>
            <select
              value={typeEvenement}
              onChange={e => setTypeEvenement(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 outline-none bg-white"
            >
              <option value="">-- Choisir --</option>
              {EVENT_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Motif (obligatoire) */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Motif <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={motif}
              onChange={e => { setMotif(e.target.value); setMotifError(false); }}
              placeholder="Decrivez le motif..."
              maxLength={200}
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none ${
                motifError ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:border-blue-500'
              }`}
            />
            {motifError && (
              <p className="text-xs text-red-500 mt-1">Le motif est obligatoire</p>
            )}
          </div>

          {/* Description (optionnelle) */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Details supplementaires..."
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* Intervenant */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Intervenant</label>
            <input
              type="text"
              value={intervenant}
              onChange={e => setIntervenant(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 outline-none"
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
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
            >
              {saving ? 'Enregistrement...' : editingIncident ? 'Modifier' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
