export interface Student {
  id: number;
  firstName: string;
  warnings: number; // 0, 1, 2, or 3
  createdAt: string;
}

export interface Sanction {
  id: number;
  studentId: number;
  reason: string | null;
  weekNumber: number;
  year: number;
  createdAt: string;
}

export type RewardType = 'full' | 'partial';

export interface DailyReward {
  id: number;
  studentId: number;
  dayOfWeek: number; // 1=Lundi, 2=Mardi, 4=Jeudi, 5=Vendredi (pas de mercredi)
  weekNumber: number;
  year: number;
  rewardType: RewardType; // 'full' = 😊, 'partial' = 🙂
  cancelled: boolean;
  cancelledBySanctionId: number | null;
  createdAt: string;
}

export interface StudentWithSanctions extends Student {
  sanctions: Sanction[];
  weekSanctionCount: number;
  weeklyRewards: DailyReward[];
}

export interface WeekSummary {
  weekNumber: number;
  year: number;
  students: {
    id: number;
    firstName: string;
    sanctionCount: number;
  }[];
  totalSanctions: number;
}

export interface ExportData {
  exportDate: string;
  currentWeek: { week: number; year: number };
  students: Student[];
  weeklyHistory: WeekSummary[];
}
