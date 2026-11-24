import type {
  AcademicDatabase,
  EntityId,
  EvaluationStatus,
  EvaluationSystem,
  GradingScaleConfig,
  YellowZoneConfig,
} from '../types/academic';

export interface SubjectMutationPayload {
  name: string;
  teacher: string;
  gradingScale: GradingScaleConfig;
  evaluationSystem: EvaluationSystem;
  additionalInfo?: string;
}

export interface EvaluationMutationPayload {
  categoryId: EntityId;
  name: string;
  maxScore: number;
  obtainedScore: number | null;
  status: EvaluationStatus;
  date?: string;
  notes?: string;
}

export interface SettingsUpdatePayload {
  defaultScale: GradingScaleConfig;
  defaultEvaluationSystem: EvaluationSystem;
  yellowZone: YellowZoneConfig;
}

export type AcademicAction =
  | { type: 'HYDRATE_DATABASE'; payload: AcademicDatabase }
  | { type: 'IMPORT_DATABASE'; payload: AcademicDatabase }
  | { type: 'UPDATE_SETTINGS'; payload: SettingsUpdatePayload }
  | { type: 'CREATE_CYCLE'; payload: { name: string } }
  | { type: 'UPDATE_CYCLE'; payload: { id: EntityId; name: string } }
  | { type: 'DELETE_CYCLE'; payload: { id: EntityId } }
  | { type: 'SET_ACTIVE_CYCLE'; payload: { cycleId: EntityId | null } }
  | { type: 'CREATE_SEMESTER'; payload: { cycleId: EntityId; name: string } }
  | { type: 'UPDATE_SEMESTER'; payload: { id: EntityId; name: string } }
  | { type: 'DELETE_SEMESTER'; payload: { id: EntityId } }
  | { type: 'SET_ACTIVE_SEMESTER'; payload: { semesterId: EntityId | null } }
  | { type: 'CREATE_SUBJECT'; payload: SubjectMutationPayload & { semesterId: EntityId } }
  | { type: 'UPDATE_SUBJECT'; payload: SubjectMutationPayload & { id: EntityId } }
  | { type: 'DELETE_SUBJECT'; payload: { id: EntityId } }
  | { type: 'CREATE_CATEGORY'; payload: { subjectId: EntityId; name: string; weightPercentage?: number } }
  | { type: 'UPDATE_CATEGORY'; payload: { id: EntityId; name: string; weightPercentage?: number } }
  | { type: 'DELETE_CATEGORY'; payload: { id: EntityId } }
  | { type: 'CREATE_EVALUATION'; payload: EvaluationMutationPayload & { subjectId: EntityId } }
  | { type: 'UPDATE_EVALUATION'; payload: EvaluationMutationPayload & { id: EntityId } }
  | { type: 'GRADE_EVALUATION'; payload: { id: EntityId; obtainedScore: number } }
  | { type: 'MARK_EVALUATION_PENDING'; payload: { id: EntityId } }
  | { type: 'DELETE_EVALUATION'; payload: { id: EntityId } }
  | { type: 'RESET_DATABASE' };
