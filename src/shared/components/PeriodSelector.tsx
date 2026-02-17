import { useConfigStore } from '../stores/configStore';

export function PeriodSelector() {
  const { periodes, activePeriode, setActivePeriode } = useConfigStore();

  if (periodes.length === 0) {
    return (
      <span className="text-xs text-slate-400 italic">
        Aucune periode configuree
      </span>
    );
  }

  return (
    <select
      value={activePeriode?.id ?? ''}
      onChange={(e) => {
        const id = Number(e.target.value);
        const p = periodes.find(p => p.id === id) || null;
        setActivePeriode(p);
      }}
      className="text-sm px-2 py-1 border border-slate-300 rounded bg-white text-slate-700 focus:border-blue-500 outline-none"
    >
      {periodes.map(p => (
        <option key={p.id} value={p.id}>
          {p.nomAffichage || `${p.typePeriode === 'trimestre' ? 'T' : 'S'}${p.numero}`}
        </option>
      ))}
    </select>
  );
}
