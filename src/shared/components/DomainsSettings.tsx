import { useState, useEffect } from 'react';
import { useAppreciationStore, type Domaine } from '../stores/appreciationStore';

export function DomainsSettings() {
  const { domaines, loadDomaines, addDomaine, updateDomaine, toggleDomaine, reorderDomaines } = useAppreciationStore();
  const [newDomainName, setNewDomainName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    loadDomaines();
  }, [loadDomaines]);

  const handleAdd = async () => {
    const name = newDomainName.trim();
    if (!name) return;
    await addDomaine(name);
    setNewDomainName('');
  };

  const handleStartEdit = (d: Domaine) => {
    setEditingId(d.id);
    setEditName(d.nom);
  };

  const handleSaveEdit = async () => {
    if (editingId == null || !editName.trim()) return;
    await updateDomaine(editingId, editName.trim());
    setEditingId(null);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const ids = domaines.map(d => d.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    reorderDomaines(ids);
  };

  const handleMoveDown = (index: number) => {
    if (index >= domaines.length - 1) return;
    const ids = domaines.map(d => d.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    reorderDomaines(ids);
  };

  return (
    <div className="space-y-3">
      <div className="font-medium text-slate-800">Domaines d'apprentissage</div>

      {/* Domain list */}
      <div className="space-y-1.5">
        {domaines.map((d, index) => (
          <div key={d.id} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
            {/* Reorder buttons */}
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="text-[10px] text-slate-400 hover:text-slate-600 disabled:opacity-20 leading-none"
              >
                ▲
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === domaines.length - 1}
                className="text-[10px] text-slate-400 hover:text-slate-600 disabled:opacity-20 leading-none"
              >
                ▼
              </button>
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              {editingId === d.id && d.isCustom ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 px-2 py-0.5 text-xs border border-blue-300 rounded outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span
                    onClick={() => d.isCustom && handleStartEdit(d)}
                    className={`text-sm ${d.isCustom ? 'cursor-pointer hover:text-blue-600' : 'cursor-default'} ${d.actif ? 'text-slate-700' : 'text-slate-400 line-through'}`}
                  >
                    {d.nom}
                  </span>
                  {d.cycle && (
                    <span className="px-1 py-0.5 text-[9px] font-medium bg-slate-200 text-slate-500 rounded">
                      C{d.cycle}
                    </span>
                  )}
                  {d.isCustom && (
                    <span className="px-1 py-0.5 text-[9px] font-medium bg-amber-100 text-amber-600 rounded">
                      custom
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Toggle active */}
            <button
              onClick={() => toggleDomaine(d.id, !d.actif)}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                d.actif ? 'bg-blue-600' : 'bg-slate-300'
              }`}
              title={d.actif ? 'Desactiver' : 'Activer'}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  d.actif ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Add new domain */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newDomainName}
          onChange={e => setNewDomainName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Nouveau domaine..."
          className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500"
        />
        <button
          onClick={handleAdd}
          disabled={!newDomainName.trim()}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}
