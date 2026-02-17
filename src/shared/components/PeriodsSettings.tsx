import { useState, useEffect } from 'react';
import { useConfigStore } from '../stores/configStore';
import type { TypePeriode } from '../types';
import {
  getCurrentSchoolYear,
  getDefaultTrimestres,
  getDefaultSemestres,
  validatePeriodes,
} from '../utils/periodes';

interface PeriodRow {
  numero: number;
  dateDebut: string;
  dateFin: string;
  nomAffichage: string;
}

export function PeriodsSettings() {
  const { periodes, savePeriodes } = useConfigStore();
  const anneeScolaire = getCurrentSchoolYear();

  const [typePeriode, setTypePeriode] = useState<TypePeriode>('trimestre');
  const [rows, setRows] = useState<PeriodRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize from existing data or defaults
  useEffect(() => {
    if (periodes.length > 0) {
      setTypePeriode(periodes[0].typePeriode);
      setRows(periodes.map(p => ({
        numero: p.numero,
        dateDebut: p.dateDebut,
        dateFin: p.dateFin,
        nomAffichage: p.nomAffichage || `${p.typePeriode === 'trimestre' ? 'Trimestre' : 'Semestre'} ${p.numero}`,
      })));
    } else {
      applyDefaults('trimestre');
    }
  }, [periodes]);

  const applyDefaults = (type: TypePeriode) => {
    const defaults = type === 'trimestre'
      ? getDefaultTrimestres(anneeScolaire)
      : getDefaultSemestres(anneeScolaire);
    setRows(defaults);
    setValidationError(null);
  };

  const handleTypeChange = (type: TypePeriode) => {
    setTypePeriode(type);
    applyDefaults(type);
    setSuccess(false);
  };

  const updateRow = (index: number, field: keyof PeriodRow, value: string) => {
    setRows(prev => prev.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    ));
    setValidationError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    const error = validatePeriodes(rows);
    if (error) {
      setValidationError(error);
      return;
    }

    setSaving(true);
    setValidationError(null);
    try {
      await savePeriodes(typePeriode, rows);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setValidationError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="font-medium text-slate-800">
        Periodes scolaires — {anneeScolaire}
      </div>

      {/* Type selector */}
      <div className="flex gap-2">
        <button
          onClick={() => handleTypeChange('trimestre')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            typePeriode === 'trimestre'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Trimestres (3)
        </button>
        <button
          onClick={() => handleTypeChange('semestre')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            typePeriode === 'semestre'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Semestres (2)
        </button>
      </div>

      {/* Period rows */}
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-2">
            <input
              type="text"
              value={row.nomAffichage}
              onChange={(e) => updateRow(i, 'nomAffichage', e.target.value)}
              className="w-full text-sm font-medium text-slate-800 bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none pb-1"
            />
            <div className="flex gap-3 items-center">
              <label className="text-xs text-slate-500 w-8">Du</label>
              <input
                type="date"
                value={row.dateDebut}
                onChange={(e) => updateRow(i, 'dateDebut', e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:border-blue-500 outline-none"
              />
              <label className="text-xs text-slate-500 w-8">Au</label>
              <input
                type="date"
                value={row.dateFin}
                onChange={(e) => updateRow(i, 'dateFin', e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {validationError}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
          Periodes enregistrees
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer les periodes'}
      </button>
    </div>
  );
}
