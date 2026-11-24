import { CURRENT_SCHEMA_VERSION, DEFAULT_CATEGORY_TEMPLATES } from '../domain/defaults';
import type {
  AcademicDatabase,
  AcademicSettings,
  CategoryTemplate,
  EntityCountsSummary,
  EntityId,
  Evaluation,
  EvaluationStatus,
  EvaluationSystem,
  GradingScaleConfig,
  GradingScalePreset,
  SchoolCycle,
  Semester,
  Subject,
  SubjectCategory,
  YellowZoneConfig,
} from '../types/academic';

export const BACKUP_APP_ID = 'mi-control-academico';
export const BACKUP_FORMAT_VERSION = 1;

export interface AcademicBackupFile {
  app: typeof BACKUP_APP_ID;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  schemaVersion: number;
  data: AcademicDatabase;
}

export interface ParsedBackupPreview {
  database: AcademicDatabase;
  exportedAt: string | null;
  counts: EntityCountsSummary;
}

export type BackupValidationResult =
  | { ok: true; preview: ParsedBackupPreview }
  | { ok: false; error: string };

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasForbiddenKeys(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(hasForbiddenKeys);
  }
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) {
      return true;
    }
    if (hasForbiddenKeys((value as Record<string, unknown>)[key])) {
      return true;
    }
  }
  return false;
}

function validateGradingScale(candidate: unknown): GradingScaleConfig | null {
  if (!isPlainRecord(candidate)) {
    return null;
  }

  const preset = candidate.preset as GradingScalePreset;
  if (preset !== '10' && preset !== '100' && preset !== 'custom') {
    return null;
  }

  if (
    !isFiniteNumber(candidate.maxGrade) ||
    !isFiniteNumber(candidate.minPassingGrade) ||
    candidate.maxGrade <= 0 ||
    candidate.minPassingGrade <= 0 ||
    candidate.minPassingGrade > candidate.maxGrade
  ) {
    return null;
  }

  return {
    preset,
    maxGrade: candidate.maxGrade,
    minPassingGrade: candidate.minPassingGrade,
  };
}

function validateEvaluationSystem(value: unknown): EvaluationSystem | null {
  if (value === 'points' || value === 'percentage') {
    return value;
  }
  return null;
}

function validateYellowZone(candidate: unknown): YellowZoneConfig | null {
  if (!isPlainRecord(candidate)) {
    return null;
  }

  if (
    !isFiniteNumber(candidate.belowPassingMarginPercent) ||
    !isFiniteNumber(candidate.abovePassingRiskMarginPercent) ||
    candidate.belowPassingMarginPercent < 0 ||
    candidate.belowPassingMarginPercent > 100 ||
    candidate.abovePassingRiskMarginPercent < 0 ||
    candidate.abovePassingRiskMarginPercent > 100
  ) {
    return null;
  }

  return {
    belowPassingMarginPercent: candidate.belowPassingMarginPercent,
    abovePassingRiskMarginPercent: candidate.abovePassingRiskMarginPercent,
  };
}

function validateSettings(candidate: unknown): AcademicSettings | null {
  if (!isPlainRecord(candidate)) {
    return null;
  }

  const yellowZone = validateYellowZone(candidate.yellowZone);
  const defaultScale = validateGradingScale(candidate.defaultScale);
  const defaultEvaluationSystem = validateEvaluationSystem(candidate.defaultEvaluationSystem);

  if (!yellowZone || !defaultScale || !defaultEvaluationSystem) {
    return null;
  }

  if (!Array.isArray(candidate.categoryTemplates)) {
    return null;
  }

  const categoryTemplates: CategoryTemplate[] = [];
  for (const item of candidate.categoryTemplates) {
    if (!isPlainRecord(item) || !hasNonEmptyString(item.id) || !hasNonEmptyString(item.name)) {
      return null;
    }
    categoryTemplates.push({
      id: item.id.trim(),
      name: item.name.trim(),
      isCustom: Boolean(item.isCustom),
    });
  }

  return {
    yellowZone,
    defaultScale,
    defaultEvaluationSystem,
    categoryTemplates:
      categoryTemplates.length > 0
        ? categoryTemplates
        : DEFAULT_CATEGORY_TEMPLATES.map((template) => ({ ...template })),
  };
}

function safeTimestamp(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return fallback;
}

export function createAcademicBackupPayload(database: AcademicDatabase): AcademicBackupFile {
  return {
    app: BACKUP_APP_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    schemaVersion: database.schemaVersion,
    data: database,
  };
}

export function serializeAcademicBackup(database: AcademicDatabase): string {
  return JSON.stringify(createAcademicBackupPayload(database), null, 2);
}

export function getBackupFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `mi-control-academico-respaldo-${year}-${month}-${day}.json`;
}

export function hasExistingAcademicData(database: AcademicDatabase): boolean {
  const { cycles, semesters, subjects, evaluations } = database.entities;
  return (
    Object.keys(cycles).length > 0 ||
    Object.keys(semesters).length > 0 ||
    Object.keys(subjects).length > 0 ||
    Object.keys(evaluations).length > 0
  );
}

export function validateAndParseAcademicBackup(rawJson: string): BackupValidationResult {
  if (!rawJson || !rawJson.trim()) {
    return { ok: false, error: 'El archivo seleccionado está vacío.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: 'El archivo no tiene un formato JSON válido.' };
  }

  if (hasForbiddenKeys(parsed)) {
    return { ok: false, error: 'El archivo contiene propiedades no permitidas.' };
  }

  if (!isPlainRecord(parsed)) {
    return { ok: false, error: 'La estructura del archivo JSON no es válida.' };
  }

  let exportedAt: string | null = null;
  let dbCandidate: unknown = parsed;

  if ('app' in parsed || 'data' in parsed) {
    if (parsed.app !== BACKUP_APP_ID) {
      return {
        ok: false,
        error: 'El archivo no corresponde a un respaldo de Mi Control Académico.',
      };
    }
    if (!isFiniteNumber(parsed.formatVersion) || parsed.formatVersion > BACKUP_FORMAT_VERSION) {
      return {
        ok: false,
        error: 'La versión de respaldo no es compatible con esta versión de la aplicación.',
      };
    }
    exportedAt = typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null;
    dbCandidate = parsed.data;
  }

  if (!isPlainRecord(dbCandidate)) {
    return { ok: false, error: 'No se encontraron datos académicos válidos dentro del respaldo.' };
  }

  if (
    !isFiniteNumber(dbCandidate.schemaVersion) ||
    dbCandidate.schemaVersion < 1 ||
    dbCandidate.schemaVersion > CURRENT_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      error: 'La versión de esquema del respaldo no es compatible.',
    };
  }

  const entities = dbCandidate.entities;
  if (
    !isPlainRecord(entities) ||
    !isPlainRecord(entities.cycles) ||
    !isPlainRecord(entities.semesters) ||
    !isPlainRecord(entities.subjects) ||
    !isPlainRecord(entities.categories) ||
    !isPlainRecord(entities.evaluations)
  ) {
    return {
      ok: false,
      error: 'Faltan colecciones requeridas (ciclos, semestres, materias, categorías o evaluaciones).',
    };
  }

  const settings = validateSettings(dbCandidate.settings);
  if (!settings) {
    return {
      ok: false,
      error: 'La sección de configuraciones y preferencias del archivo no es válida.',
    };
  }

  const now = new Date().toISOString();

  // 1. Ciclos
  const cycles: Record<EntityId, SchoolCycle> = {};
  for (const [key, item] of Object.entries(entities.cycles)) {
    if (
      !isPlainRecord(item) ||
      !hasNonEmptyString(item.id) ||
      item.id !== key ||
      !hasNonEmptyString(item.name) ||
      !isFiniteNumber(item.order)
    ) {
      return { ok: false, error: 'Uno de los ciclos escolares del respaldo tiene un formato inválido.' };
    }
    cycles[key] = {
      id: item.id,
      name: item.name.trim(),
      order: item.order,
      createdAt: safeTimestamp(item.createdAt, now),
      updatedAt: safeTimestamp(item.updatedAt, now),
    };
  }

  // 2. Semestres (deben pertenecer a un ciclo existente)
  const semesters: Record<EntityId, Semester> = {};
  for (const [key, item] of Object.entries(entities.semesters)) {
    if (
      !isPlainRecord(item) ||
      !hasNonEmptyString(item.id) ||
      item.id !== key ||
      !hasNonEmptyString(item.cycleId) ||
      !cycles[item.cycleId] ||
      !hasNonEmptyString(item.name) ||
      !isFiniteNumber(item.order)
    ) {
      return {
        ok: false,
        error: 'Uno de los semestres del respaldo tiene datos inválidos o referencia a un ciclo inexistente.',
      };
    }
    semesters[key] = {
      id: item.id,
      cycleId: item.cycleId,
      name: item.name.trim(),
      order: item.order,
      createdAt: safeTimestamp(item.createdAt, now),
      updatedAt: safeTimestamp(item.updatedAt, now),
    };
  }

  // 3. Materias (deben pertenecer a un semestre existente)
  const subjects: Record<EntityId, Subject> = {};
  for (const [key, item] of Object.entries(entities.subjects)) {
    if (
      !isPlainRecord(item) ||
      !hasNonEmptyString(item.id) ||
      item.id !== key ||
      !hasNonEmptyString(item.semesterId) ||
      !semesters[item.semesterId] ||
      !hasNonEmptyString(item.name) ||
      !hasNonEmptyString(item.teacher)
    ) {
      return {
        ok: false,
        error: 'Una de las materias del respaldo tiene datos inválidos o referencia a un semestre inexistente.',
      };
    }

    const gradingScale = validateGradingScale(item.gradingScale);
    const evaluationSystem = validateEvaluationSystem(item.evaluationSystem);
    if (!gradingScale || !evaluationSystem) {
      return {
        ok: false,
        error: `La configuración de escala o sistema de "${item.name}" no es válida.`,
      };
    }

    subjects[key] = {
      id: item.id,
      semesterId: item.semesterId,
      name: item.name.trim(),
      teacher: item.teacher.trim(),
      gradingScale,
      evaluationSystem,
      additionalInfo:
        typeof item.additionalInfo === 'string' && item.additionalInfo.trim().length > 0
          ? item.additionalInfo.trim()
          : undefined,
      createdAt: safeTimestamp(item.createdAt, now),
      updatedAt: safeTimestamp(item.updatedAt, now),
    };
  }

  // 4. Categorías (deben pertenecer a una materia existente)
  const categories: Record<EntityId, SubjectCategory> = {};
  for (const [key, item] of Object.entries(entities.categories)) {
    if (
      !isPlainRecord(item) ||
      !hasNonEmptyString(item.id) ||
      item.id !== key ||
      !hasNonEmptyString(item.subjectId) ||
      !subjects[item.subjectId] ||
      !hasNonEmptyString(item.name) ||
      !isFiniteNumber(item.order)
    ) {
      return {
        ok: false,
        error: 'Una de las categorías del respaldo es inválida o pertenece a una materia inexistente.',
      };
    }

    let weightPercentage: number | undefined;
    if (item.weightPercentage !== undefined) {
      if (
        !isFiniteNumber(item.weightPercentage) ||
        item.weightPercentage < 0 ||
        item.weightPercentage > 100
      ) {
        return {
          ok: false,
          error: `El porcentaje de la categoría "${item.name}" está fuera de rango (0–100).`,
        };
      }
      weightPercentage = item.weightPercentage;
    }

    categories[key] = {
      id: item.id,
      subjectId: item.subjectId,
      name: item.name.trim(),
      weightPercentage,
      isDefaultFallback: Boolean(item.isDefaultFallback),
      order: item.order,
      createdAt: safeTimestamp(item.createdAt, now),
      updatedAt: safeTimestamp(item.updatedAt, now),
    };
  }

  // 5. Evaluaciones (deben pertenecer a una materia y categoría válidas de esa materia)
  const evaluations: Record<EntityId, Evaluation> = {};
  for (const [key, item] of Object.entries(entities.evaluations)) {
    if (
      !isPlainRecord(item) ||
      !hasNonEmptyString(item.id) ||
      item.id !== key ||
      !hasNonEmptyString(item.subjectId) ||
      !subjects[item.subjectId] ||
      !hasNonEmptyString(item.categoryId) ||
      !categories[item.categoryId] ||
      categories[item.categoryId].subjectId !== item.subjectId ||
      !hasNonEmptyString(item.name) ||
      !isFiniteNumber(item.maxScore) ||
      item.maxScore <= 0
    ) {
      return {
        ok: false,
        error: 'Una de las evaluaciones del respaldo contiene datos o referencias inválidas.',
      };
    }

    const status = item.status as EvaluationStatus;
    if (status !== 'pending' && status !== 'graded') {
      return {
        ok: false,
        error: `El estado de la evaluación "${item.name}" no es válido.`,
      };
    }

    let obtainedScore: number | null = null;
    if (status === 'graded') {
      if (
        !isFiniteNumber(item.obtainedScore) ||
        item.obtainedScore < 0 ||
        item.obtainedScore > item.maxScore
      ) {
        return {
          ok: false,
          error: `La calificación de la evaluación "${item.name}" es inválida respecto a su valor máximo.`,
        };
      }
      obtainedScore = item.obtainedScore;
    } else if (item.obtainedScore !== null && item.obtainedScore !== undefined) {
      return {
        ok: false,
        error: `La evaluación pendiente "${item.name}" no debe tener calificación numérica asignada.`,
      };
    }

    evaluations[key] = {
      id: item.id,
      subjectId: item.subjectId,
      categoryId: item.categoryId,
      name: item.name.trim(),
      maxScore: item.maxScore,
      obtainedScore,
      status,
      date:
        typeof item.date === 'string' && item.date.trim().length > 0 ? item.date.trim() : undefined,
      notes:
        typeof item.notes === 'string' && item.notes.trim().length > 0
          ? item.notes.trim()
          : undefined,
      createdAt: safeTimestamp(item.createdAt, now),
      updatedAt: safeTimestamp(item.updatedAt, now),
    };
  }

  // 6. Estado de navegación seguro
  const rawNav = isPlainRecord(dbCandidate.navigationState) ? dbCandidate.navigationState : {};
  const orderedCycles = Object.values(cycles).sort((a, b) => a.order - b.order);

  let activeCycleId: EntityId | null =
    typeof rawNav.activeCycleId === 'string' && cycles[rawNav.activeCycleId]
      ? rawNav.activeCycleId
      : (orderedCycles[0]?.id ?? null);

  let activeSemesterId: EntityId | null = null;
  if (activeCycleId) {
    const semestersInCycle = Object.values(semesters)
      .filter((semester) => semester.cycleId === activeCycleId)
      .sort((a, b) => a.order - b.order);

    if (
      typeof rawNav.activeSemesterId === 'string' &&
      semesters[rawNav.activeSemesterId]?.cycleId === activeCycleId
    ) {
      activeSemesterId = rawNav.activeSemesterId;
    } else {
      activeSemesterId = semestersInCycle[0]?.id ?? null;
    }
  } else {
    activeCycleId = null;
  }

  const normalizedDatabase: AcademicDatabase = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: safeTimestamp(dbCandidate.updatedAt, now),
    navigationState: {
      activeCycleId,
      activeSemesterId,
    },
    entities: {
      cycles,
      semesters,
      subjects,
      categories,
      evaluations,
    },
    settings,
  };

  return {
    ok: true,
    preview: {
      database: normalizedDatabase,
      exportedAt,
      counts: {
        cycles: Object.keys(cycles).length,
        semesters: Object.keys(semesters).length,
        subjects: Object.keys(subjects).length,
        categories: Object.keys(categories).length,
        evaluations: Object.keys(evaluations).length,
      },
    },
  };
}
