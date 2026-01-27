import { useState, useEffect } from 'react';
import { useStudentStore } from '../stores/studentStore';
import type { WeekSummary } from '../types';
import { getCurrentWeek } from '../utils/date';

export function WeeklySummary() {
  const { getWeeklySummary, getHistory } = useStudentStore();
  const [currentSummary, setCurrentSummary] = useState<WeekSummary | null>(null);
  const [history, setHistory] = useState<WeekSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const summary = await getWeeklySummary();
    const hist = await getHistory(12); // Last 12 weeks for display
    setCurrentSummary(summary);
    setHistory(hist);
    setIsLoading(false);
  };

  if (isLoading) {
    return <div className="text-slate-500 text-center py-4">Chargement...</div>;
  }

  const { week, year } = getCurrentWeek();

  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">
          Semaine {week} ({year})
        </h3>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showHistory ? 'Masquer historique' : 'Voir historique'}
        </button>
      </div>

      {/* Current week summary */}
      {currentSummary && (
        <div className="mb-4">
          <div className="text-2xl font-bold text-slate-700 mb-2">
            {currentSummary.totalSanctions} sanction{currentSummary.totalSanctions !== 1 ? 's' : ''} cette semaine
          </div>

          {currentSummary.students.filter(s => s.sanctionCount > 0).length > 0 ? (
            <div className="space-y-1">
              {currentSummary.students
                .filter(s => s.sanctionCount > 0)
                .map(student => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between py-1 px-2 bg-white rounded"
                  >
                    <span className="text-slate-700">{student.firstName}</span>
                    <span className="text-red-600 font-medium">
                      {student.sanctionCount} {Array.from({ length: Math.min(student.sanctionCount, 5) }).map(() => '🙁').join('')}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Aucune sanction cette semaine</p>
          )}
        </div>
      )}

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="border-t border-slate-200 pt-4 mt-4">
          <h4 className="text-sm font-medium text-slate-600 mb-2">Historique récent</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((weekData) => (
              <div
                key={`${weekData.year}-${weekData.weekNumber}`}
                className="flex items-center justify-between py-2 px-3 bg-white rounded border border-slate-100"
              >
                <span className="text-slate-600">
                  Semaine {weekData.weekNumber} ({weekData.year})
                </span>
                <span className={`font-medium ${weekData.totalSanctions > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {weekData.totalSanctions} sanction{weekData.totalSanctions !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showHistory && history.length === 0 && (
        <div className="border-t border-slate-200 pt-4 mt-4">
          <p className="text-slate-500 text-sm text-center">Aucun historique disponible</p>
        </div>
      )}
    </div>
  );
}
