import { useMemo } from 'react';
import { useStudentStore } from '../../stores/studentStore';
import type { DailyReward, Absence } from '../../types';

interface WeeklyRewardLineProps {
  studentId: number;
  absences?: Absence[];
  compact?: boolean;
}

// Jours travaillés (pas de mercredi)
const WORK_DAYS = [
  { day: 1, label: 'L' }, // Lundi
  { day: 2, label: 'M' }, // Mardi
  { day: 4, label: 'J' }, // Jeudi
  { day: 5, label: 'V' }, // Vendredi
] as const;

// Détermine le jour de la semaine actuel (1=Lundi, 2=Mardi, 4=Jeudi, 5=Vendredi)
function getCurrentWorkDayIndex(): number {
  const day = new Date().getDay();
  // Mapping: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const mapping: Record<number, number> = {
    1: 0, // Lundi -> index 0
    2: 1, // Mardi -> index 1
    4: 2, // Jeudi -> index 2
    5: 3, // Vendredi -> index 3
  };
  return mapping[day] ?? -1;
}

// Retourne les indices des jours écoulés (incluant aujourd'hui si après 16h30)
function getElapsedDayIndices(): number[] {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const isAfter1630 = currentHour > 16 || (currentHour === 16 && currentMinutes >= 30);

  const dayIndex = getCurrentWorkDayIndex();

  if (dayIndex === -1) {
    // Mercredi, samedi ou dimanche
    const day = now.getDay();
    if (day === 3) return [0, 1]; // Mercredi -> L, M
    if (day === 6 || day === 0) return [0, 1, 2, 3]; // Samedi/Dimanche -> toute la semaine
    return [];
  }

  // Jours écoulés (sans aujourd'hui si avant 16h30)
  const endIndex = isAfter1630 ? dayIndex + 1 : dayIndex;
  return Array.from({ length: endIndex }, (_, i) => i);
}

export function WeeklyRewardLine({ studentId, absences = [], compact = true }: WeeklyRewardLineProps) {
  const getStudentWeeklyRewards = useStudentStore(state => state.getStudentWeeklyRewards);
  const rewards = getStudentWeeklyRewards(studentId);

  const elapsedIndices = useMemo(() => getElapsedDayIndices(), []);

  // Map rewards by day
  const rewardsByDay = useMemo(() => {
    const map = new Map<number, DailyReward>();
    for (const r of rewards) {
      map.set(r.dayOfWeek, r);
    }
    return map;
  }, [rewards]);

  // Map absences by day of week (from date string)
  const absentDays = useMemo(() => {
    const set = new Set<number>();
    for (const a of absences) {
      const d = new Date(a.date);
      const jsDay = d.getDay(); // 0=Sun, 1=Mon...
      // Map JS day to our day_of_week: 1=Mon, 2=Tue, 4=Thu, 5=Fri
      const mapping: Record<number, number> = { 1: 1, 2: 2, 4: 4, 5: 5 };
      if (mapping[jsDay] !== undefined) {
        set.add(mapping[jsDay]);
      }
    }
    return set;
  }, [absences]);

  return (
    <div className={`flex items-center gap-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
      {WORK_DAYS.map((workDay, index) => {
        const isElapsed = elapsedIndices.includes(index);
        const isToday = index === getCurrentWorkDayIndex();
        const reward = rewardsByDay.get(workDay.day);
        const isAbsent = absentDays.has(workDay.day);

        // Determine what to display
        let emoji = '';
        let bgClass = 'bg-slate-100';
        let textClass = 'text-slate-300';
        let label: string = workDay.label;

        if (isAbsent) {
          // Absent day - neutral gray with "A"
          bgClass = 'bg-slate-200';
          textClass = 'text-slate-500 font-bold';
          label = 'A';
        } else if (reward) {
          if (reward.cancelled) {
            // Cancelled reward - show strikethrough
            emoji = reward.rewardType === 'full' ? '😊' : '🙂';
            bgClass = 'bg-slate-200';
            textClass = 'text-slate-400 line-through opacity-50';
          } else {
            // Active reward
            emoji = reward.rewardType === 'full' ? '😊' : '🙂';
            bgClass = reward.rewardType === 'full' ? 'bg-green-100' : 'bg-yellow-100';
            textClass = 'text-slate-700';
          }
        } else if (isElapsed) {
          // Day passed without reward (had sanction)
          bgClass = 'bg-red-100';
          textClass = 'text-slate-500';
        }

        return (
          <div
            key={workDay.day}
            className={`
              flex items-center justify-center
              ${compact ? 'w-5 h-5' : 'w-6 h-6'}
              rounded
              ${bgClass}
              ${textClass}
              ${isToday ? 'ring-1 ring-blue-400' : ''}
            `}
            title={`${workDay.label}${isAbsent ? ' - Absent' : reward ? ` - ${reward.rewardType === 'full' ? 'Parfait' : '1-2 avert.'}${reward.cancelled ? ' (annulé)' : ''}` : isElapsed ? ' - Sanction' : ''}`}
          >
            {emoji || <span className="font-medium">{label}</span>}
          </div>
        );
      })}
    </div>
  );
}
