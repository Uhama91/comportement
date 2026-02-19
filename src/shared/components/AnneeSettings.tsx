import { useState, useEffect } from 'react';
import { useAnneeStore } from '../stores/anneeStore';

export function AnneeSettings() {
  const { annees, activeAnnee, loadAnnees, createAnnee, cloturer, rouvrir } = useAnneeStore();

  const [label, setLabel] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'cloturer' | 'rouvrir'; id: number } | null>(null);

  useEffect(() => {
    loadAnnees();
  }, [loadAnnees]);

  const handleCreate = async () => {
    if (!label.trim() || !dateDebut || !dateFin) {
      setError('Tous les champs sont obligatoires');
      return;
    }
    if (dateDebut >= dateFin) {
      setError('La date de debut doit etre avant la date de fin');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createAnnee(label.trim(), dateDebut, dateFin);
      setLabel('');
      setDateDebut('');
      setDateFin('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Erreur lors de la creation');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'cloturer') {
        await cloturer(confirmAction.id);
      } else {
        await rouvrir(confirmAction.id);
      }
    } catch {
      setError('Erreur lors de l\'operation');
    } finally {
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="font-medium text-slate-800">Annee scolaire</div>

      {/* Liste des annees existantes */}
      {annees.length > 0 && (
        <div className="space-y-2">
          {annees.map(annee => (
            <div
              key={annee.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                annee.active ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {annee.label}
                  </span>
                  {annee.active && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      Active
                    </span>
                  )}
                  {annee.cloturee && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                      Cloturee
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {annee.dateDebut} — {annee.dateFin}
                </div>
              </div>

              <div className="flex gap-1 ml-2 flex-shrink-0">
                {annee.active && !annee.cloturee && (
                  <button
                    onClick={() => setConfirmAction({ type: 'cloturer', id: annee.id })}
                    className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                  >
                    Cloturer
                  </button>
                )}
                {annee.cloturee && (
                  <button
                    onClick={() => setConfirmAction({ type: 'rouvrir', id: annee.id })}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    Rouvrir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message annee cloturee */}
      {activeAnnee?.cloturee && (
        <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
          L'annee active est cloturee. Les modifications sont bloquees. Reouvrez-la pour modifier les donnees.
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 space-y-2">
          <div className="text-sm text-slate-700">
            {confirmAction.type === 'cloturer'
              ? 'Cloturer cette annee ? Les donnees passeront en lecture seule.'
              : 'Rouvrir cette annee ? Elle deviendra l\'annee active.'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className={`px-3 py-1 text-xs text-white rounded transition-colors ${
                confirmAction.type === 'cloturer'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              Confirmer
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              className="px-3 py-1 text-xs text-slate-600 bg-slate-200 rounded hover:bg-slate-300 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Formulaire de creation */}
      <div className="space-y-3 pt-2 border-t border-slate-200">
        <div className="text-sm font-medium text-slate-600">Nouvelle annee</div>
        <input
          type="text"
          placeholder="Ex: 2025-2026"
          value={label}
          onChange={(e) => { setLabel(e.target.value); setError(null); }}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 outline-none"
        />
        <div className="flex gap-3 items-center">
          <label className="text-xs text-slate-500 w-10">Debut</label>
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => { setDateDebut(e.target.value); setError(null); }}
            className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:border-blue-500 outline-none"
          />
          <label className="text-xs text-slate-500 w-6">Fin</label>
          <input
            type="date"
            value={dateFin}
            onChange={(e) => { setDateFin(e.target.value); setError(null); }}
            className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
          Annee scolaire creee
        </div>
      )}

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={saving}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
      >
        {saving ? 'Creation...' : 'Creer l\'annee scolaire'}
      </button>
    </div>
  );
}
