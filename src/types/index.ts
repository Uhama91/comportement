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

export interface StudentWithSanctions extends Student {
  sanctions: Sanction[];
  weekSanctionCount: number;
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
