import type { Periode } from '../types';

/**
 * Get current school year string (e.g. "2025-2026")
 * School year starts September 1st
 */
export function getCurrentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // If before September, school year started previous year
  if (month < 8) {
    return `${year - 1}-${year}`;
  }
  return `${year}-${year + 1}`;
}

/**
 * Find the active period based on current date
 */
export function getActivePeriode(periodes: Periode[]): Periode | null {
  if (periodes.length === 0) return null;

  const today = new Date();
  const todayStr = formatDate(today);

  for (const p of periodes) {
    if (todayStr >= p.dateDebut && todayStr <= p.dateFin) {
      return p;
    }
  }

  // No exact match — return the closest upcoming period, or the last one
  const upcoming = periodes
    .filter(p => p.dateDebut > todayStr)
    .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));

  if (upcoming.length > 0) return upcoming[0];

  // All periods in the past — return the most recent
  return periodes[periodes.length - 1];
}

/**
 * Default period dates for trimestres
 */
export function getDefaultTrimestres(anneeScolaire: string): Array<{ numero: number; dateDebut: string; dateFin: string; nomAffichage: string }> {
  const [startYear, endYear] = anneeScolaire.split('-').map(Number);
  return [
    { numero: 1, dateDebut: `${startYear}-09-01`, dateFin: `${startYear}-11-30`, nomAffichage: 'Trimestre 1' },
    { numero: 2, dateDebut: `${startYear}-12-01`, dateFin: `${endYear}-02-28`, nomAffichage: 'Trimestre 2' },
    { numero: 3, dateDebut: `${endYear}-03-01`, dateFin: `${endYear}-06-30`, nomAffichage: 'Trimestre 3' },
  ];
}

/**
 * Default period dates for semestres
 */
export function getDefaultSemestres(anneeScolaire: string): Array<{ numero: number; dateDebut: string; dateFin: string; nomAffichage: string }> {
  const [startYear, endYear] = anneeScolaire.split('-').map(Number);
  return [
    { numero: 1, dateDebut: `${startYear}-09-01`, dateFin: `${endYear}-01-31`, nomAffichage: 'Semestre 1' },
    { numero: 2, dateDebut: `${endYear}-02-01`, dateFin: `${endYear}-06-30`, nomAffichage: 'Semestre 2' },
  ];
}

/**
 * Format a Date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format YYYY-MM-DD to DD/MM/YYYY for display
 */
export function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Parse DD/MM/YYYY input to YYYY-MM-DD
 */
export function parseDateInput(input: string): string | null {
  // Accept both YYYY-MM-DD and DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const match = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Validate period dates don't overlap
 */
export function validatePeriodes(periodes: Array<{ dateDebut: string; dateFin: string }>): string | null {
  for (let i = 0; i < periodes.length; i++) {
    const p = periodes[i];
    if (p.dateDebut >= p.dateFin) {
      return `Période ${i + 1} : la date de fin doit être après la date de début`;
    }
    for (let j = i + 1; j < periodes.length; j++) {
      const q = periodes[j];
      if (p.dateDebut <= q.dateFin && q.dateDebut <= p.dateFin) {
        return `Les périodes ${i + 1} et ${j + 1} se chevauchent`;
      }
    }
  }
  return null;
}
