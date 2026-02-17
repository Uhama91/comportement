import { useEffect, useState } from 'react';
import { useStudentStore } from '../../../../shared/stores/studentStore';
import { StudentGridCard } from './StudentGridCard';
import { AddStudentForm } from '../../../../shared/components/AddStudentForm';
import { WeeklySummary } from '../WeeklySummary';
import { ExportButton } from '../../../../shared/components/ExportButton';
import { useWindowSize, LIST_MODE_THRESHOLD } from '../../../../shared/hooks/useWindowSize';
import { useTBIMode } from '../../../../shared/hooks/useFullscreen';

interface StudentGridProps {
  compact?: boolean; // Mode compact pour fenêtre principale vs TBI
  onNavigateToStudent?: (studentId: number) => void;
}

export function StudentGrid({ compact = true, onNavigateToStudent }: StudentGridProps) {
  const { students, isLoading, error, loadStudents } = useStudentStore();
  const [showSummary, setShowSummary] = useState(false);
  const { width } = useWindowSize();
  const isTBI = useTBIMode();

  // Mode liste si fenêtre trop petite
  const isListMode = width < LIST_MODE_THRESHOLD;

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Tri alphabétique fixe (ne change jamais)
  const sortedStudents = [...students].sort((a, b) =>
    a.firstName.localeCompare(b.firstName, 'fr')
  );

  // Calcul du nombre de colonnes optimal selon le nombre d'élèves et la largeur
  const getGridCols = (count: number): string => {
    // TBI mode: fewer columns for larger, readable cards (visible at 3m)
    if (isTBI) {
      if (count <= 12) return 'grid-cols-3';
      if (count <= 20) return 'grid-cols-4';
      return 'grid-cols-5'; // 25-30 eleves
    }
    // Pour les fenêtres moyennes (450-600px), moins de colonnes
    if (width < 600) return 'grid-cols-2';
    if (width < 800) return 'grid-cols-3';
    if (count <= 12) return 'grid-cols-3 sm:grid-cols-4';
    if (count <= 16) return 'grid-cols-4 sm:grid-cols-4';
    if (count <= 20) return 'grid-cols-4 sm:grid-cols-5';
    if (count <= 24) return 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6';
    return 'grid-cols-5 sm:grid-cols-6 md:grid-cols-7'; // 25-30 élèves
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-slate-500">
        Chargement...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSummary(!showSummary)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              showSummary
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Résumé
          </button>
          <span className="text-xs text-slate-400">
            {students.length}/30
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AddStudentForm inline />
          <ExportButton />
        </div>
      </div>

      {/* Weekly Summary */}
      {showSummary && (
        <div className="mb-3 flex-shrink-0">
          <WeeklySummary />
        </div>
      )}

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex-shrink-0">
          {error}
        </div>
      )}

      {students.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <p className="text-base mb-1">Aucun élève</p>
            <p className="text-xs">Ajoutez votre premier élève</p>
          </div>
        </div>
      ) : isListMode ? (
        /* Mode liste vertical avec scroll - pour petites fenêtres */
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {sortedStudents.map((student) => (
            <StudentGridCard
              key={student.id}
              student={student}
              compact={compact}
              onNavigateToStudent={onNavigateToStudent}
            />
          ))}
        </div>
      ) : (
        /* Grille de cartes - pas de scroll */
        <div
          className={`
            grid gap-2 flex-1
            ${getGridCols(students.length)}
            auto-rows-fr
          `}
          style={{
            // S'assure que la grille prend toute la hauteur disponible
            minHeight: 0,
          }}
        >
          {sortedStudents.map((student) => (
            <StudentGridCard
              key={student.id}
              student={student}
              compact={compact}
              onNavigateToStudent={onNavigateToStudent}
            />
          ))}
        </div>
      )}
    </div>
  );
}
