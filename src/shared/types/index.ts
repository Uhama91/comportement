// Re-export depuis domaines-officiels
export type { NiveauCode, CycleNumber } from './domaines-officiels';

export interface Student {
  id: number;
  firstName: string;
  warnings: number; // 0, 1, 2, or 3
  niveau: string | null; // NiveauCode (PS-CM2) ou null si non defini
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

// Périodes scolaires (V2)
export type TypePeriode = 'trimestre' | 'semestre';

export interface Periode {
  id: number;
  anneeScolaire: string;
  typePeriode: TypePeriode;
  numero: number;
  dateDebut: string; // YYYY-MM-DD
  dateFin: string;   // YYYY-MM-DD
  nomAffichage: string | null;
  createdAt: string;
}

// Annee scolaire (V2.1)
export interface AnneeScolaire {
  id: number;
  label: string;
  dateDebut: string; // YYYY-MM-DD
  dateFin: string;   // YYYY-MM-DD
  active: boolean;
  cloturee: boolean;
  createdAt: string;
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

// Echelle LSU 4 niveaux officiels (V2.1)
export type NiveauLsu = 'non_atteints' | 'partiellement_atteints' | 'atteints' | 'depasses';

export const NIVEAUX_LSU: Array<{ value: NiveauLsu | ''; label: string; color: string }> = [
  { value: '',                      label: 'Non evalue',              color: 'text-slate-400' },
  { value: 'non_atteints',          label: 'Non atteints',            color: 'text-red-600 bg-red-50' },
  { value: 'partiellement_atteints', label: 'Partiellement atteints', color: 'text-amber-600 bg-amber-50' },
  { value: 'atteints',              label: 'Atteints',                color: 'text-green-600 bg-green-50' },
  { value: 'depasses',              label: 'Depasses',                color: 'text-blue-600 bg-blue-50' },
];

// Ancien type V2 — conserve pour retrocompat pipeline LLM
export type NiveauAcquisition = 'maitrise' | 'en_cours_acquisition' | 'debut';

export interface ObservationResult {
  domaine: string;
  niveau: NiveauAcquisition;
  commentaire: string;
}

// V2.1 — Classification + Fusion result (Story 19.3, multi-domain)
export interface ClassificationResultItem {
  domaine_id: number;
  domaine_nom: string;
  domaine_index: number;
  observation_before: string | null;
  observation_after: string;
}

export interface ClassificationResults {
  items: ClassificationResultItem[];
  duration_ms: number;
}

// Event Sourcing — Journal Pedagogique (V2.1-rev2, ADR-014)
export type EventType = 'observation' | 'evaluation' | 'motif_sanction';
export type EventSource = 'vocal' | 'manual';

export interface PedagogicalEvent {
  id: number;
  uuid: string;
  eleveId: number;
  anneeScolaireId: number;
  periodeId: number | null;
  type: EventType;
  domaineId: number | null;
  lecon: string | null;
  niveauLsu: NiveauLsu | null;
  observations: string | null;
  texteDictation: string | null;
  source: EventSource;
  createdAt: string;
  syncedAt: string | null;
}

export interface NewEvent {
  eleveId: number;
  anneeScolaireId: number;
  periodeId: number | null;
  type: EventType;
  domaineId: number | null;
  lecon: string | null;
  niveauLsu: NiveauLsu | null;
  observations: string | null;
  texteDictation: string | null;
  source: EventSource;
}

export interface EventFilter {
  eleveId?: number;
  anneeScolaireId?: number;
  periodeId?: number;
  domaineId?: number;
  eventType?: EventType;
}

// Registre d'Appel — Absences V2 (ADR-019)
export type DemiJournee = 'matin' | 'apres_midi';
export type TypeAbsence = 'justifiee' | 'medicale' | 'injustifiee';

export interface AbsenceV2 {
  id: number;
  eleveId: number;
  date: string;          // YYYY-MM-DD
  demiJournee: DemiJournee;
  typeAbsence: TypeAbsence;
  motif: string | null;
  retard: boolean;
  anneeScolaireId: number;
  createdAt: string;
}

export interface NewAbsenceV2 {
  eleveId: number;
  date: string;
  demiJournee: DemiJournee;
  typeAbsence?: TypeAbsence;
  motif?: string;
  retard?: boolean;
  anneeScolaireId: number;
}

export interface AbsenceAlert {
  eleveId: number;
  count: number;
}

export interface AbsenceTotaux {
  eleveId: number;
  justifiees: number;
  injustifiees: number;
}

// Model Management (Epic 16)
export interface ModelInfo {
  name: string;
  filename: string;
  installed: boolean;
  path: string | null;
  expected_size_mb: number;
}

export interface ModelsCheckResult {
  whisper: ModelInfo;
  llama: ModelInfo;
  all_installed: boolean;
  models_dir: string;
}

export interface DownloadProgress {
  model_name: string;
  downloaded_bytes: number;
  total_bytes: number;
  percentage: number;
  current_model: number;
  total_models: number;
  status: 'downloading' | 'verifying' | 'complete' | 'error';
}

// LSU Vivant — Syntheses (V2.1-rev2, Epic 25)
export interface Synthese {
  id: number;
  eleveId: number;
  domaineId: number;
  periodeId: number;
  anneeScolaireId: number;
  version: number;
  texte: string;
  generatedBy: 'llm' | 'manual';
  createdAt: string;
}

export interface SyntheseVersion {
  id: number;
  version: number;
  texte: string;
  generatedBy: 'llm' | 'manual';
  createdAt: string;
}

export interface SyntheseResult {
  synthese: string;
  duration_ms: number;
}

export interface AppreciationResult {
  appreciation: string;
  duration_ms: number;
}

// LSU Vivant — Appreciation Générale versionnée (V2.1-rev2, Story 25.4)
export interface AppreciationGenerale {
  id: number;
  eleveId: number;
  periodeId: number;
  anneeScolaireId: number;
  version: number;
  texte: string;
  generatedBy: 'llm' | 'manual';
  createdAt: string;
}

export interface AppreciationGeneraleVersion {
  id: number;
  version: number;
  texte: string;
  generatedBy: 'llm' | 'manual';
  createdAt: string;
}
