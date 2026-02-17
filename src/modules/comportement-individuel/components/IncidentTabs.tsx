import { useState, useEffect } from 'react';
import type { StudentWithSanctions } from '../../../shared/types';
import { useIncidentStore, EVENT_TYPES, type Incident } from '../../../shared/stores/incidentStore';
import { useConfigStore } from '../../../shared/stores/configStore';
import { IncidentForm } from './IncidentForm';

interface IncidentTabsProps {
  student: StudentWithSanctions;
}

type TabId = 'comportement' | 'historique';

export function IncidentTabs({ student }: IncidentTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('comportement');

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'comportement', label: 'Comportement' },
    { id: 'historique', label: 'Historique' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'comportement' && (
          <ComportementTab student={student} />
        )}
        {activeTab === 'historique' && (
          <HistoriqueTab student={student} />
        )}
      </div>
    </div>
  );
}

function ComportementTab({ student }: { student: StudentWithSanctions }) {
  const [showForm, setShowForm] = useState(false);
  const { loadIncidents } = useIncidentStore();

  return (
    <div className="space-y-4">
      {/* Résumé semaine en cours */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Semaine en cours</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-amber-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-amber-600">{student.warnings}</div>
            <div className="text-xs text-amber-600">Avertissements</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{student.weekSanctionCount}</div>
            <div className="text-xs text-red-600">Sanctions</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {student.weeklyRewards.filter(r => !r.cancelled).length}
            </div>
            <div className="text-xs text-green-600">Recompenses</div>
          </div>
        </div>
      </div>

      {/* Sanctions détaillées */}
      {student.sanctions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Sanctions cette semaine</h3>
          <div className="space-y-2">
            {student.sanctions.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
                <span className="text-lg">🙁</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700">
                    {s.reason || 'Sans motif'}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(s.createdAt).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bouton nouvel incident */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-2.5 px-4 text-sm font-medium rounded-lg border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        + Nouvel incident
      </button>

      {showForm && (
        <IncidentForm
          eleveId={student.id}
          onClose={() => setShowForm(false)}
          onSaved={() => loadIncidents(student.id)}
        />
      )}
    </div>
  );
}

function HistoriqueTab({ student }: { student: StudentWithSanctions }) {
  const { incidents, isLoading, loadIncidents, deleteIncident } = useIncidentStore();
  const { periodes } = useConfigStore();

  const [filterType, setFilterType] = useState<string>('');
  const [filterPeriode, setFilterPeriode] = useState<string>('');
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    loadIncidents(student.id);
  }, [student.id, loadIncidents]);

  // Filter incidents
  const filteredIncidents = incidents.filter(i => {
    if (filterType && i.typeEvenement !== filterType) return false;
    if (filterPeriode) {
      const periode = periodes.find(p => p.id === Number(filterPeriode));
      if (periode) {
        if (i.dateIncident < periode.dateDebut || i.dateIncident > periode.dateFin) return false;
      }
    }
    return true;
  });

  // Summary by type
  const summaryByType = new Map<string, number>();
  for (const i of filteredIncidents) {
    summaryByType.set(i.typeEvenement, (summaryByType.get(i.typeEvenement) || 0) + 1);
  }

  const handleDelete = async (id: number) => {
    await deleteIncident(id, student.id);
    setConfirmDelete(null);
  };

  const handleEdit = (incident: Incident) => {
    setEditingIncident(incident);
    setShowForm(true);
  };

  if (isLoading) {
    return <div className="text-sm text-slate-400 text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-xs px-2 py-1 border border-slate-300 rounded bg-white text-slate-600 outline-none"
        >
          <option value="">Tous les types</option>
          {EVENT_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {periodes.length > 0 && (
          <select
            value={filterPeriode}
            onChange={e => setFilterPeriode(e.target.value)}
            className="text-xs px-2 py-1 border border-slate-300 rounded bg-white text-slate-600 outline-none"
          >
            <option value="">Toutes les periodes</option>
            {periodes.map(p => (
              <option key={p.id} value={p.id}>
                {p.nomAffichage || `Periode ${p.numero}`}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={() => { setShowForm(true); setEditingIncident(null); }}
          className="ml-auto text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          + Incident
        </button>
      </div>

      {/* Summary */}
      {filteredIncidents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 font-medium">
            {filteredIncidents.length} incident{filteredIncidents.length > 1 ? 's' : ''}
          </span>
          {Array.from(summaryByType.entries()).map(([type, count]) => (
            <span key={type} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              {type}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Timeline */}
      {filteredIncidents.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">Aucun incident enregistre</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredIncidents.map(incident => (
            <div key={incident.id} className="p-3 bg-slate-50 rounded-lg group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-500">
                      {formatDisplayDate(incident.dateIncident)}
                      {incident.heureIncident && ` a ${incident.heureIncident}`}
                    </span>
                    {incident.typeEvenement && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                        {incident.typeEvenement}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-slate-800">{incident.motif}</div>
                  {incident.description && (
                    <div className="text-xs text-slate-500 mt-1">{incident.description}</div>
                  )}
                  <div className="text-xs text-slate-400 mt-1">
                    Par {incident.intervenant}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => handleEdit(incident)}
                    className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Modifier
                  </button>
                  {confirmDelete === incident.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(incident.id)}
                        className="px-2 py-1 text-xs text-red-600 bg-red-50 rounded font-medium"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded"
                      >
                        Non
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(incident.id)}
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <IncidentForm
          eleveId={student.id}
          editingIncident={editingIncident}
          onClose={() => { setShowForm(false); setEditingIncident(null); }}
          onSaved={() => loadIncidents(student.id)}
        />
      )}
    </div>
  );
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
