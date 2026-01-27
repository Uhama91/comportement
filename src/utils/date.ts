/**
 * Get current ISO week number and year
 */
export function getCurrentWeek(): { week: number; year: number } {
  const now = new Date();
  const year = now.getFullYear();

  // ISO week calculation
  const jan1 = new Date(year, 0, 1);
  const dayOfYear = Math.floor((now.getTime() - jan1.getTime()) / 86400000) + 1;
  const week = Math.ceil((dayOfYear + jan1.getDay()) / 7);

  return { week, year };
}

/**
 * Check if it's past the daily reset time (16:30)
 */
export function isPastDailyReset(): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  return hours > 16 || (hours === 16 && minutes >= 30);
}

/**
 * Check if today is Monday (for weekly reset)
 */
export function isMonday(): boolean {
  return new Date().getDay() === 1;
}

/**
 * Get a unique key for today's reset (YYYY-MM-DD)
 */
export function getResetKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Check if we should reset warnings (past 16:30 and not yet reset today)
 */
export function shouldResetWarnings(): boolean {
  if (!isPastDailyReset()) return false;

  const todayKey = getResetKey();
  const lastResetKey = localStorage.getItem('lastWarningReset');

  return lastResetKey !== todayKey;
}

/**
 * Mark today's reset as done
 */
export function markResetDone(): void {
  localStorage.setItem('lastWarningReset', getResetKey());
}

/**
 * Get current week key for weekly reset tracking (YYYY-WW)
 */
export function getWeekKey(): string {
  const { week, year } = getCurrentWeek();
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Check if we should reset sanctions (Monday and not yet reset this week)
 */
export function shouldResetSanctions(): boolean {
  if (!isMonday()) return false;

  const weekKey = getWeekKey();
  const lastResetKey = localStorage.getItem('lastSanctionReset');

  return lastResetKey !== weekKey;
}

/**
 * Mark this week's sanction reset as done
 */
export function markSanctionResetDone(): void {
  localStorage.setItem('lastSanctionReset', getWeekKey());
}
