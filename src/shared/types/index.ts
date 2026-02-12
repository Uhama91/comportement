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

export interface Absence {
  id: number;
  studentId: number;
  date: string;
  weekNumber: number;
  year: number;
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
  absences: Absence[];
  todayAbsent: boolean;
}

export interface WeekSummary {
  weekNumber: number;
  year: number;
  students: {
    id: number;
    firstName: string;
    sanctionCount: number;
    sanctions?: { id: number; reason: string | null; createdAt: string }[];
    absences?: string[]; // dates YYYY-MM-DD
    rewards?: {
      dayOfWeek: number; // 1=Lundi, 2=Mardi, 4=Jeudi, 5=Vendredi
      rewardType: 'full' | 'partial';
      cancelled: boolean;
      cancelledBy?: string | null; // Motif de la sanction qui a annulé la récompense
    }[];
  }[];
  totalSanctions: number;
}

export interface ExportData {
  exportDate: string;
  currentWeek: { week: number; year: number };
  students: Student[];
  weeklyHistory: WeekSummary[];
}

// IA Sidecar Types
export interface TranscriptionResult {
  text: string;
  duration_ms: number;
}

export interface SidecarInstanceStatus {
  running: boolean;
  port: number | null;
  request_count: number | null;
  uptime_secs: number | null;
}

export interface SidecarStatusResponse {
  whisper: SidecarInstanceStatus;
  llama: SidecarInstanceStatus;
}

// Pipeline Types (Story 13.4)
export type PipelineMode = 'sequential' | 'concurrent';

export interface PipelineConfig {
  mode: PipelineMode;
  total_ram_gb: number;
  concurrent_available: boolean;
}

// Structuration LLM Types
export type NiveauAcquisition = 'maitrise' | 'en_cours_acquisition' | 'debut';

export interface ObservationResult {
  domaine: string;
  niveau: NiveauAcquisition;
  commentaire: string;
}

export interface StructurationResult {
  observations: ObservationResult[];
  duration_ms: number;
}
