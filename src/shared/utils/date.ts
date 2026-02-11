/**
 * Get current ISO week number and year
 * Uses proper ISO 8601 week calculation
 */
export function getCurrentWeek(): { week: number; year: number } {
  const now = new Date();

  // Create a copy to avoid mutating
  const date = new Date(now.getTime());

  // Set to nearest Thursday: current date + 4 - current day number (makes Sunday day 7)
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));

  // Get first day of year
  const yearStart = new Date(date.getFullYear(), 0, 1);

  // Calculate full weeks to nearest Thursday
  const weekNumber = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  // The year is the year of the Thursday
  const year = date.getFullYear();

  return { week: weekNumber, year };
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

/**
 * Get current work day number (1=Mon, 2=Tue, 4=Thu, 5=Fri)
 * Returns -1 if not a work day (Wednesday, Saturday, Sunday)
 */
export function getCurrentWorkDay(): number {
  const day = new Date().getDay();
  // Mapping: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const workDays: Record<number, number> = {
    1: 1, // Lundi
    2: 2, // Mardi
    4: 4, // Jeudi
    5: 5, // Vendredi
  };
  return workDays[day] ?? -1;
}

/**
 * Check if we should trigger daily rewards (past 16:30 and not yet triggered today)
 */
export function shouldTriggerRewards(): boolean {
  if (!isPastDailyReset()) return false;
  if (getCurrentWorkDay() === -1) return false;

  const todayKey = getResetKey();
  const lastTriggerKey = localStorage.getItem('lastRewardTrigger');

  return lastTriggerKey !== todayKey;
}

/**
 * Mark today's reward trigger as done
 */
export function markRewardTriggerDone(): void {
  localStorage.setItem('lastRewardTrigger', getResetKey());
}
