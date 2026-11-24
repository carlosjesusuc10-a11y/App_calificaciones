import type { EvaluationStatus, EvaluationSystem, GradingScaleConfig } from '../types/academic';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateCycleInput(
  name: string,
  existingNames: string[] = [],
): ValidationResult {
  const errors: Record<string, string> = {};
  const trimmed = name.trim();

  if (!trimmed) {
    errors.name = 'El nombre del ciclo escolar es obligatorio.';
  } else if (trimmed.length > 60) {
    errors.name = 'El nombre del ciclo no puede superar los 60 caracteres.';
  } else if (
    existingNames.some((existing) => existing.trim().toLowerCase() === trimmed.toLowerCase())
  ) {
    errors.name = 'Ya existe un ciclo escolar con ese nombre.';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateSemesterInput(
  name: string,
  existingNamesInCycle: string[] = [],
): ValidationResult {
  const errors: Record<string, string> = {};
  const trimmed = name.trim();

  if (!trimmed) {
    errors.name = 'El nombre del semestre es obligatorio.';
  } else if (trimmed.length > 60) {
    errors.name = 'El nombre del semestre no puede superar los 60 caracteres.';
  } else if (
    existingNamesInCycle.some(
      (existing) => existing.trim().toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    errors.name = 'Ya existe un semestre con ese nombre en este ciclo.';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export interface SubjectInputValidation {
  name: string;
  teacher: string;
  gradingScale: GradingScaleConfig;
  evaluationSystem: EvaluationSystem;
  additionalInfo?: string;
}

export function validateSubjectInput(
  input: SubjectInputValidation,
  existingNamesInSemester: string[] = [],
): ValidationResult {
  const errors: Record<string, string> = {};
  const trimmedName = input.name.trim();
  const trimmedTeacher = input.teacher.trim();

  if (!trimmedName) {
    errors.name = 'El nombre de la materia es obligatorio.';
  } else if (trimmedName.length > 80) {
    errors.name = 'El nombre de la materia no puede superar los 80 caracteres.';
  } else if (
    existingNamesInSemester.some(
      (existing) => existing.trim().toLowerCase() === trimmedName.toLowerCase(),
    )
  ) {
    errors.name = 'Ya existe una materia con ese nombre en este semestre.';
  }

  if (!trimmedTeacher) {
    errors.teacher = 'El nombre del docente es obligatorio.';
  } else if (trimmedTeacher.length > 80) {
    errors.teacher = 'El nombre del docente no puede superar los 80 caracteres.';
  }

  if (!Number.isFinite(input.gradingScale.maxGrade) || input.gradingScale.maxGrade <= 0) {
    errors.maxGrade = 'La calificación máxima debe ser mayor a 0.';
  }

  if (
    !Number.isFinite(input.gradingScale.minPassingGrade) ||
    input.gradingScale.minPassingGrade <= 0 ||
    input.gradingScale.minPassingGrade > input.gradingScale.maxGrade
  ) {
    errors.minPassingGrade = 'La calificación mínima debe ser mayor a 0 y menor o igual a la máxima.';
  }

  if (input.additionalInfo && input.additionalInfo.trim().length > 300) {
    errors.additionalInfo = 'La descripción no puede superar los 300 caracteres.';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export interface CategoryWeightValidationOptions {
  weightPercentage?: number;
  existingOtherWeightsTotal?: number;
}

export function validateCategoryInput(
  name: string,
  existingNamesInSubject: string[] = [],
  weightOptions?: CategoryWeightValidationOptions,
): ValidationResult {
  const errors: Record<string, string> = {};
  const trimmed = name.trim();

  if (!trimmed) {
    errors.name = 'El nombre de la categoría es obligatorio.';
  } else if (trimmed.length > 40) {
    errors.name = 'La categoría no puede superar los 40 caracteres.';
  } else if (
    existingNamesInSubject.some(
      (existing) => existing.trim().toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    errors.name = 'Ya existe una categoría con ese nombre en esta materia.';
  }

  if (weightOptions && weightOptions.weightPercentage !== undefined) {
    const weight = weightOptions.weightPercentage;
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
      errors.weightPercentage = 'El porcentaje debe ser mayor a 0 y menor o igual a 100.';
    } else if (
      typeof weightOptions.existingOtherWeightsTotal === 'number' &&
      Number.isFinite(weightOptions.existingOtherWeightsTotal) &&
      weight + weightOptions.existingOtherWeightsTotal > 100 + 1e-6
    ) {
      const available = Math.max(
        0,
        Math.round((100 - weightOptions.existingOtherWeightsTotal) * 100) / 100,
      );
      errors.weightPercentage = `La suma de porcentajes no puede superar 100% (disponible: ${available}%).`;
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export interface EvaluationInputValidation {
  name: string;
  categoryId: string;
  maxScore: number;
  obtainedScore: number | null;
  status: EvaluationStatus;
  notes?: string;
}

export function validateEvaluationInput(input: EvaluationInputValidation): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.name.trim()) {
    errors.name = 'El nombre de la evaluación es obligatorio.';
  } else if (input.name.trim().length > 80) {
    errors.name = 'El nombre no puede superar los 80 caracteres.';
  }

  if (!input.categoryId.trim()) {
    errors.categoryId = 'Selecciona una categoría.';
  }

  if (!Number.isFinite(input.maxScore) || input.maxScore <= 0) {
    errors.maxScore = 'El valor máximo debe ser mayor a 0.';
  }

  if (input.status === 'graded') {
    if (input.obtainedScore === null || !Number.isFinite(input.obtainedScore)) {
      errors.obtainedScore = 'Ingresa la calificación obtenida.';
    } else if (input.obtainedScore < 0) {
      errors.obtainedScore = 'La calificación obtenida no puede ser menor a 0.';
    } else if (Number.isFinite(input.maxScore) && input.maxScore > 0 && input.obtainedScore > input.maxScore) {
      errors.obtainedScore = `La calificación obtenida no puede superar ${input.maxScore}.`;
    }
  }

  if (input.notes && input.notes.trim().length > 300) {
    errors.notes = 'La nota no puede superar los 300 caracteres.';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
