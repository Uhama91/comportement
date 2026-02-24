// Module 2 — Registre d'Appel (Epic 23)
// Grille d'appel matin/apres-midi avec navigation par semaine + totaux

import { useState, useMemo, useCallback } from 'react';
import { AttendanceGrid } from './components/AttendanceGrid';
import { AbsenceSummary } from './components/AbsenceSummary';

type Tab = 'appel' | 'totaux';

function getWeekBounds(offset: number): { start: string; end: string; label: string } {
  const now = new Date();
  // Set to monday of current week
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const label = `${monday.getDate()}/${monday.getMonth() + 1} — ${friday.getDate()}/${friday.getMonth() + 1}`;

  return { start: fmt(monday), end: fmt(friday), label };
}

export default function RegistreAppelModule() {
  const [tab, setTab] = useState<Tab>('appel');
  const [weekOffset, setWeekOffset] = useState(0);
  const week = useMemo(() => getWeekBounds(weekOffset), [weekOffset]);

  const goBack = useCallback(() => setWeekOffset((o) => o - 1), []);
  const goForward = useCallback(() => setWeekOffset((o) => o + 1), []);
  const goToday = useCallback(() => setWeekOffset(0), []);

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-0 px-4 pt-2 flex-shrink-0">
        <button
          onClick={() => setTab('appel')}
          className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors ${
            tab === 'appel'
              ? 'border-blue-500 text-blue-700 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Appel
        </button>
        <button
          onClick={() => setTab('totaux')}
          className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors ${
            tab === 'totaux'
              ? 'border-blue-500 text-blue-700 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Totaux periode
        </button>
      </div>

      {tab === 'appel' && (
        <>
          {/* Week navigation */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50 flex-shrink-0">
            <button
              onClick={goBack}
              className="px-2 py-1 text-sm text-slate-600 hover:bg-slate-200 rounded transition-colors"
            >
              ← Sem. prec.
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">{week.label}</span>
              {weekOffset !== 0 && (
                <button
                  onClick={goToday}
                  className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Aujourd'hui
                </button>
              )}
            </div>

            <button
              onClick={goForward}
              className="px-2 py-1 text-sm text-slate-600 hover:bg-slate-200 rounded transition-colors"
            >
              Sem. suiv. →
            </button>
          </div>

          {/* Attendance grid */}
          <div className="flex-1 min-h-0 overflow-auto p-2">
            <AttendanceGrid weekStart={week.start} weekEnd={week.end} />
          </div>
        </>
      )}

      {tab === 'totaux' && (
        <div className="flex-1 min-h-0 overflow-auto">
          <AbsenceSummary />
        </div>
      )}
    </div>
  );
}
