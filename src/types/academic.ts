export type EntityId = string;

export type EvaluationSystem = 'points' | 'percentage';

export type EvaluationStatus = 'pending' | 'graded';

export type GradeStatus = 'red' | 'yellow' | 'green';

export type GradingScalePreset = '10' | '100' | 'custom';

export interface GradingScaleConfig {
  preset: GradingScalePreset;
  maxGrade: number;
  minPassingGrade: number;
}

export interface SchoolCycle {
  id: EntityId;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Semester {
  id: EntityId;
  cycleId: EntityId;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: EntityId;
  semesterId: EntityId;
  name: string;
  teacher: string;
  gradingScale: GradingScaleConfig;
  evaluationSystem: EvaluationSystem;
  additionalInfo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectCategory {
  id: EntityId;
  subjectId: EntityId;
  name: string;
  weightPercentage?: number;
  isDefaultFallback?: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Evaluation {
  id: EntityId;
  subjectId: EntityId;
  categoryId: EntityId;
  name: string;
  maxScore: number;
  obtainedScore: number | null;
  status: EvaluationStatus;
  date?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface YellowZoneConfig {
  belowPassingMarginPercent: number;
  abovePassingRiskMarginPercent: number;
}

export interface CategoryTemplate {
  id: EntityId;
  name: string;
  isCustom: boolean;
}

export interface AcademicSettings {
  yellowZone: YellowZoneConfig;
  defaultScale: GradingScaleConfig;
  defaultEvaluationSystem: EvaluationSystem;
  categoryTemplates: CategoryTemplate[];
}

export interface AcademicEntities {
  cycles: Record<EntityId, SchoolCycle>;
  semesters: Record<EntityId, Semester>;
  subjects: Record<EntityId, Subject>;
  categories: Record<EntityId, SubjectCategory>;
  evaluations: Record<EntityId, Evaluation>;
}

export interface AcademicNavigationState {
  activeCycleId: EntityId | null;
  activeSemesterId: EntityId | null;
}

export interface AcademicDatabase {
  schemaVersion: number;
  updatedAt: string;
  navigationState: AcademicNavigationState;
  entities: AcademicEntities;
  settings: AcademicSettings;
}

export interface EntityCountsSummary {
  cycles: number;
  semesters: number;
  subjects: number;
  categories: number;
  evaluations: number;
}

export interface SubjectCardViewModel {
  id: EntityId;
  name: string;
  teacher: string;
  currentGrade: number;
  maxGrade: number;
  minPassingGrade: number;
  currentPercentage: number;
  obtainedPoints: number;
  totalPossiblePoints: number;
  evaluationSystem: EvaluationSystem;
  progressPercent: number;
  status: GradeStatus;
}

export interface SemesterDashboardSummary {
  totalSubjects: number;
  averagePercentage: number | null;
  averageScaleGrade: number | null;
  defaultScaleMaxGrade: number;
  averageStatus: GradeStatus | null;
  averageGradedPerformancePercent: number | null;
  semesterProgressPercent: number;
  gradedEvaluationsCount: number;
  pendingEvaluationsCount: number;
  approvedCount: number;
  atRiskCount: number;
  failedCount: number;
}

