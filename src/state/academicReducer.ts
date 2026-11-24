import { createEmptyDatabase } from '../domain/defaults';
import type {
  AcademicDatabase,
  EntityId,
  Evaluation,
  SchoolCycle,
  Semester,
  Subject,
  SubjectCategory,
} from '../types/academic';
import type { AcademicAction } from './academicActions';

export interface AcademicStoreState {
  database: AcademicDatabase;
  isHydrated: boolean;
  shouldPersist: boolean;
}

export function createInitialStoreState(): AcademicStoreState {
  return {
    database: createEmptyDatabase(),
    isHydrated: false,
    shouldPersist: false,
  };
}

function generateId(prefix: string): EntityId {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function omitIds<T>(record: Record<EntityId, T>, idsToRemove: Set<EntityId>): Record<EntityId, T> {
  if (idsToRemove.size === 0) {
    return record;
  }
  const next: Record<EntityId, T> = {};
  for (const [id, value] of Object.entries(record)) {
    if (!idsToRemove.has(id)) {
      next[id] = value;
    }
  }
  return next;
}

export function academicReducer(
  state: AcademicStoreState,
  action: AcademicAction,
): AcademicStoreState {
  const now = new Date().toISOString();

  switch (action.type) {
    case 'HYDRATE_DATABASE':
      return {
        database: action.payload,
        isHydrated: true,
        shouldPersist: false,
      };

    case 'IMPORT_DATABASE':
      return {
        database: {
          ...action.payload,
          updatedAt: now,
        },
        isHydrated: true,
        shouldPersist: true,
      };

    case 'UPDATE_SETTINGS': {
      const { defaultScale, defaultEvaluationSystem, yellowZone } = action.payload;
      if (
        !Number.isFinite(defaultScale.maxGrade) ||
        defaultScale.maxGrade <= 0 ||
        !Number.isFinite(defaultScale.minPassingGrade) ||
        defaultScale.minPassingGrade <= 0 ||
        defaultScale.minPassingGrade > defaultScale.maxGrade ||
        !Number.isFinite(yellowZone.belowPassingMarginPercent) ||
        yellowZone.belowPassingMarginPercent < 0 ||
        !Number.isFinite(yellowZone.abovePassingRiskMarginPercent) ||
        yellowZone.abovePassingRiskMarginPercent < 0
      ) {
        return state;
      }

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          settings: {
            ...state.database.settings,
            defaultScale: { ...defaultScale },
            defaultEvaluationSystem,
            yellowZone: { ...yellowZone },
          },
        },
      };
    }

    case 'CREATE_CYCLE': {
      const trimmedName = action.payload.name.trim();
      const existingCycles = Object.values(state.database.entities.cycles);
      const nextOrder =
        existingCycles.length > 0
          ? Math.max(...existingCycles.map((cycle) => cycle.order)) + 1
          : 1;

      const newCycle: SchoolCycle = {
        id: generateId('cycle'),
        name: trimmedName,
        order: nextOrder,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          navigationState: {
            activeCycleId: newCycle.id,
            activeSemesterId: null,
          },
          entities: {
            ...state.database.entities,
            cycles: {
              ...state.database.entities.cycles,
              [newCycle.id]: newCycle,
            },
          },
        },
      };
    }

    case 'UPDATE_CYCLE': {
      const existing = state.database.entities.cycles[action.payload.id];
      if (!existing) {
        return state;
      }

      const updated: SchoolCycle = {
        ...existing,
        name: action.payload.name.trim(),
        updatedAt: now,
      };

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          entities: {
            ...state.database.entities,
            cycles: {
              ...state.database.entities.cycles,
              [updated.id]: updated,
            },
          },
        },
      };
    }

    case 'DELETE_CYCLE': {
      const cycleId = action.payload.id;
      if (!state.database.entities.cycles[cycleId]) {
        return state;
      }

      const semesterIds = new Set<EntityId>(
        Object.values(state.database.entities.semesters)
          .filter((semester) => semester.cycleId === cycleId)
          .map((semester) => semester.id),
      );

      const subjectIds = new Set<EntityId>(
        Object.values(state.database.entities.subjects)
          .filter((subject) => semesterIds.has(subject.semesterId))
          .map((subject) => subject.id),
      );

      const categoryIds = new Set<EntityId>(
        Object.values(state.database.entities.categories)
          .filter((category) => subjectIds.has(category.subjectId))
          .map((category) => category.id),
      );

      const evaluationIds = new Set<EntityId>(
        Object.values(state.database.entities.evaluations)
          .filter((evaluation) => subjectIds.has(evaluation.subjectId))
          .map((evaluation) => evaluation.id),
      );

      const nextCycles = omitIds<SchoolCycle>(state.database.entities.cycles, new Set([cycleId]));
      const nextSemesters = omitIds<Semester>(state.database.entities.semesters, semesterIds);
      const nextSubjects = omitIds<Subject>(state.database.entities.subjects, subjectIds);
      const nextCategories = omitIds<SubjectCategory>(
        state.database.entities.categories,
        categoryIds,
      );
      const nextEvaluations = omitIds<Evaluation>(
        state.database.entities.evaluations,
        evaluationIds,
      );

      let nextActiveCycleId = state.database.navigationState.activeCycleId;
      let nextActiveSemesterId = state.database.navigationState.activeSemesterId;

      if (nextActiveCycleId === cycleId) {
        const remainingCycles = Object.values(nextCycles).sort((a, b) => a.order - b.order);
        nextActiveCycleId = remainingCycles[0]?.id ?? null;
        if (nextActiveCycleId) {
          const semestersInFallback = Object.values(nextSemesters)
            .filter((semester) => semester.cycleId === nextActiveCycleId)
            .sort((a, b) => a.order - b.order);
          nextActiveSemesterId = semestersInFallback[0]?.id ?? null;
        } else {
          nextActiveSemesterId = null;
        }
      }

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          navigationState: {
            activeCycleId: nextActiveCycleId,
            activeSemesterId: nextActiveSemesterId,
          },
          entities: {
            cycles: nextCycles,
            semesters: nextSemesters,
            subjects: nextSubjects,
            categories: nextCategories,
            evaluations: nextEvaluations,
          },
        },
      };
    }

    case 'SET_ACTIVE_CYCLE': {
      const cycleId = action.payload.cycleId;
      const semestersInCycle = cycleId
        ? Object.values(state.database.entities.semesters)
            .filter((semester) => semester.cycleId === cycleId)
            .sort((a, b) => a.order - b.order)
        : [];

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          navigationState: {
            activeCycleId: cycleId,
            activeSemesterId: semestersInCycle[0]?.id ?? null,
          },
        },
      };
    }

    case 'CREATE_SEMESTER': {
      const { cycleId, name } = action.payload;
      if (!state.database.entities.cycles[cycleId]) {
        return state;
      }

      const semestersInCycle = Object.values(state.database.entities.semesters).filter(
        (semester) => semester.cycleId === cycleId,
      );
      const nextOrder =
        semestersInCycle.length > 0
          ? Math.max(...semestersInCycle.map((semester) => semester.order)) + 1
          : 1;

      const newSemester: Semester = {
        id: generateId('sem'),
        cycleId,
        name: name.trim(),
        order: nextOrder,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          navigationState: {
            activeCycleId: cycleId,
            activeSemesterId: newSemester.id,
          },
          entities: {
            ...state.database.entities,
            semesters: {
              ...state.database.entities.semesters,
              [newSemester.id]: newSemester,
            },
          },
        },
      };
    }

    case 'UPDATE_SEMESTER': {
      const existing = state.database.entities.semesters[action.payload.id];
      if (!existing) {
        return state;
      }

      const updated: Semester = {
        ...existing,
        name: action.payload.name.trim(),
        updatedAt: now,
      };

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          entities: {
            ...state.database.entities,
            semesters: {
              ...state.database.entities.semesters,
              [updated.id]: updated,
            },
          },
        },
      };
    }

    case 'DELETE_SEMESTER': {
      const semesterId = action.payload.id;
      const targetSemester = state.database.entities.semesters[semesterId];
      if (!targetSemester) {
        return state;
      }

      const subjectIds = new Set<EntityId>(
        Object.values(state.database.entities.subjects)
          .filter((subject) => subject.semesterId === semesterId)
          .map((subject) => subject.id),
      );

      const categoryIds = new Set<EntityId>(
        Object.values(state.database.entities.categories)
          .filter((category) => subjectIds.has(category.subjectId))
          .map((category) => category.id),
      );

      const evaluationIds = new Set<EntityId>(
        Object.values(state.database.entities.evaluations)
          .filter((evaluation) => subjectIds.has(evaluation.subjectId))
          .map((evaluation) => evaluation.id),
      );

      const nextSemesters = omitIds<Semester>(
        state.database.entities.semesters,
        new Set([semesterId]),
      );
      const nextSubjects = omitIds<Subject>(state.database.entities.subjects, subjectIds);
      const nextCategories = omitIds<SubjectCategory>(
        state.database.entities.categories,
        categoryIds,
      );
      const nextEvaluations = omitIds<Evaluation>(
        state.database.entities.evaluations,
        evaluationIds,
      );

      let nextActiveSemesterId = state.database.navigationState.activeSemesterId;
      if (nextActiveSemesterId === semesterId) {
        const remainingInCycle = Object.values(nextSemesters)
          .filter((semester) => semester.cycleId === targetSemester.cycleId)
          .sort((a, b) => a.order - b.order);
        nextActiveSemesterId = remainingInCycle[0]?.id ?? null;
      }

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          navigationState: {
            ...state.database.navigationState,
            activeSemesterId: nextActiveSemesterId,
          },
          entities: {
            ...state.database.entities,
            semesters: nextSemesters,
            subjects: nextSubjects,
            categories: nextCategories,
            evaluations: nextEvaluations,
          },
        },
      };
    }

    case 'SET_ACTIVE_SEMESTER': {
      const semesterId = action.payload.semesterId;
      const semester = semesterId ? state.database.entities.semesters[semesterId] : undefined;

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          navigationState: {
            activeCycleId: semester ? semester.cycleId : state.database.navigationState.activeCycleId,
            activeSemesterId: semesterId,
          },
        },
      };
    }

    case 'CREATE_SUBJECT': {
      const { semesterId, name, teacher, gradingScale, evaluationSystem, additionalInfo } =
        action.payload;

      if (!state.database.entities.semesters[semesterId]) {
        return state;
      }

      const subjectId = generateId('sub');
      const trimmedInfo = additionalInfo?.trim();

      const newSubject: Subject = {
        id: subjectId,
        semesterId,
        name: name.trim(),
        teacher: teacher.trim(),
        gradingScale: { ...gradingScale },
        evaluationSystem,
        additionalInfo: trimmedInfo || undefined,
        createdAt: now,
        updatedAt: now,
      };

      const initialCategories: Record<EntityId, SubjectCategory> = {};
      state.database.settings.categoryTemplates.forEach((template, index) => {
        const categoryId = generateId('cat');
        initialCategories[categoryId] = {
          id: categoryId,
          subjectId,
          name: template.name,
          isDefaultFallback: template.name.toLowerCase() === 'otro',
          order: index + 1,
          createdAt: now,
          updatedAt: now,
        };
      });

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          entities: {
            ...state.database.entities,
            subjects: {
              ...state.database.entities.subjects,
              [subjectId]: newSubject,
            },
            categories: {
              ...state.database.entities.categories,
              ...initialCategories,
            },
          },
        },
      };
    }

    case 'UPDATE_SUBJECT': {
      const existing = state.database.entities.subjects[action.payload.id];
      if (!existing) {
        return state;
      }

      const trimmedInfo = action.payload.additionalInfo?.trim();
      const updated: Subject = {
        ...existing,
        name: action.payload.name.trim(),
        teacher: action.payload.teacher.trim(),
        gradingScale: { ...action.payload.gradingScale },
        evaluationSystem: action.payload.evaluationSystem,
        additionalInfo: trimmedInfo || undefined,
        updatedAt: now,
      };

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          entities: {
            ...state.database.entities,
            subjects: {
              ...state.database.entities.subjects,
              [updated.id]: updated,
            },
          },
        },
      };
    }

    case 'DELETE_SUBJECT': {
      const subjectId = action.payload.id;
      if (!state.database.entities.subjects[subjectId]) {
        return state;
      }

      const categoryIds = new Set<EntityId>(
        Object.values(state.database.entities.categories)
          .filter((category) => category.subjectId === subjectId)
          .map((category) => category.id),
      );

      const evaluationIds = new Set<EntityId>(
        Object.values(state.database.entities.evaluations)
          .filter((evaluation) => evaluation.subjectId === subjectId)
          .map((evaluation) => evaluation.id),
      );

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          entities: {
            ...state.database.entities,
            subjects: omitIds<Subject>(state.database.entities.subjects, new Set([subjectId])),
            categories: omitIds<SubjectCategory>(state.database.entities.categories, categoryIds),
            evaluations: omitIds<Evaluation>(
              state.database.entities.evaluations,
              evaluationIds,
            ),
          },
        },
      };
    }

    case 'CREATE_CATEGORY': {
      const { subjectId, name, weightPercentage } = action.payload;
      if (!state.database.entities.subjects[subjectId]) {
        return state;
      }

      const subjectCategories = Object.values(state.database.entities.categories).filter(
        (category) => category.subjectId === subjectId,
      );
      const nextOrder =
        subjectCategories.length > 0
          ? Math.max(...subjectCategories.map((category) => category.order)) + 1
          : 1;

      const sanitizedWeight =
        typeof weightPercentage === 'number' &&
        Number.isFinite(weightPercentage) &&
        weightPercentage > 0 &&
        weightPercentage <= 100
          ? weightPercentage
          : undefined;

      const newCategory: SubjectCategory = {
        id: generateId('cat'),
        subjectId,
        name: name.trim(),
        weightPercentage: sanitizedWeight,
        order: nextOrder,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          entities: {
            ...state.database.entities,
            categories: {
              ...state.database.entities.categories,
              [newCategory.id]: newCategory,
            },
          },
        },
      };
    }

    case 'UPDATE_CATEGORY': {
      const existing = state.database.entities.categories[action.payload.id];
      if (!existing) {
        return state;
      }

      const hasWeightProperty = Object.prototype.hasOwnProperty.call(
        action.payload,
        'weightPercentage',
      );
      const rawWeight = action.payload.weightPercentage;
      const nextWeight = hasWeightProperty
        ? typeof rawWeight === 'number' &&
          Number.isFinite(rawWeight) &&
          rawWeight > 0 &&
          rawWeight <= 100
          ? rawWeight
          : undefined
        : existing.weightPercentage;

      const updated: SubjectCategory = {
        ...existing,
        name: action.payload.name.trim(),
        weightPercentage: nextWeight,
        updatedAt: now,
      };

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          entities: {
            ...state.database.entities,
            categories: {
              ...state.database.entities.categories,
              [updated.id]: updated,
            },
          },
        },
      };
    }

    case 'DELETE_CATEGORY': {
      const categoryId = action.payload.id;
      const target = state.database.entities.categories[categoryId];
      if (!target) {
        return state;
      }

      const siblingCategories = Object.values(state.database.entities.categories)
        .filter((category) => category.subjectId === target.subjectId && category.id !== categoryId)
        .sort((a, b) => a.order - b.order);

      if (siblingCategories.length === 0) {
        return state;
      }

      const fallbackCategory =
        siblingCategories.find((category) => category.isDefaultFallback) ??
        siblingCategories.find((category) => category.name.toLowerCase() === 'otro') ??
        siblingCategories[0];

      const nextEvaluations: Record<EntityId, Evaluation> = {};
      for (const [evalId, evaluation] of Object.entries(state.database.entities.evaluations)) {
        if (evaluation.categoryId === categoryId) {
          nextEvaluations[evalId] = {
            ...evaluation,
            categoryId: fallbackCategory.id,
            updatedAt: now,
          };
        } else {
          nextEvaluations[evalId] = evaluation;
        }
      }

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          entities: {
            ...state.database.entities,
            categories: omitIds<SubjectCategory>(
              state.database.entities.categories,
              new Set([categoryId]),
            ),
            evaluations: nextEvaluations,
          },
        },
      };
    }

    case 'CREATE_EVALUATION': {
      const { subjectId, categoryId, name, maxScore, obtainedScore, status, date, notes } =
        action.payload;

      const targetCategory = state.database.entities.categories[categoryId];
      if (
        !state.database.entities.subjects[subjectId] ||
        !targetCategory ||
        targetCategory.subjectId !== subjectId ||
        !Number.isFinite(maxScore) ||
        maxScore <= 0
      ) {
        return state;
      }

      let sanitizedObtained: number | null = null;
      if (status === 'graded') {
        if (obtainedScore === null || !Number.isFinite(obtainedScore)) {
          return state;
        }
        sanitizedObtained = Math.min(maxScore, Math.max(0, obtainedScore));
      }

      const evaluationId = generateId('eval');
      const newEvaluation: Evaluation = {
        id: evaluationId,
        subjectId,
        categoryId,
        name: name.trim(),
        maxScore,
        obtainedScore: sanitizedObtained,
        status,
        date: date?.trim() || undefined,
        notes: notes?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          entities: {
            ...state.database.entities,
            evaluations: {
              ...state.database.entities.evaluations,
              [evaluationId]: newEvaluation,
            },
          },
        },
      };
    }

    case 'UPDATE_EVALUATION': {
      const existing = state.database.entities.evaluations[action.payload.id];
      const targetCategory = state.database.entities.categories[action.payload.categoryId];
      if (
        !existing ||
        !targetCategory ||
        targetCategory.subjectId !== existing.subjectId ||
        !Number.isFinite(action.payload.maxScore) ||
        action.payload.maxScore <= 0
      ) {
        return state;
      }

      let sanitizedObtained: number | null = null;
      if (action.payload.status === 'graded') {
        if (
          action.payload.obtainedScore === null ||
          !Number.isFinite(action.payload.obtainedScore)
        ) {
          return state;
        }
        sanitizedObtained = Math.min(
          action.payload.maxScore,
          Math.max(0, action.payload.obtainedScore),
        );
      }

      const updated: Evaluation = {
        ...existing,
        categoryId: action.payload.categoryId,
        name: action.payload.name.trim(),
        maxScore: action.payload.maxScore,
        obtainedScore: sanitizedObtained,
        status: action.payload.status,
        date: action.payload.date?.trim() || undefined,
        notes: action.payload.notes?.trim() || undefined,
        updatedAt: now,
      };

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          entities: {
            ...state.database.entities,
            evaluations: {
              ...state.database.entities.evaluations,
              [updated.id]: updated,
            },
          },
        },
      };
    }

    case 'GRADE_EVALUATION': {
      const existing = state.database.entities.evaluations[action.payload.id];
      if (!existing || !Number.isFinite(action.payload.obtainedScore)) {
        return state;
      }

      const clampedScore = Math.min(
        existing.maxScore,
        Math.max(0, action.payload.obtainedScore),
      );

      const updated: Evaluation = {
        ...existing,
        obtainedScore: clampedScore,
        status: 'graded',
        updatedAt: now,
      };

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          entities: {
            ...state.database.entities,
            evaluations: {
              ...state.database.entities.evaluations,
              [updated.id]: updated,
            },
          },
        },
      };
    }

    case 'MARK_EVALUATION_PENDING': {
      const existing = state.database.entities.evaluations[action.payload.id];
      if (!existing) {
        return state;
      }

      const updated: Evaluation = {
        ...existing,
        obtainedScore: null,
        status: 'pending',
        updatedAt: now,
      };

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          entities: {
            ...state.database.entities,
            evaluations: {
              ...state.database.entities.evaluations,
              [updated.id]: updated,
            },
          },
        },
      };
    }

    case 'DELETE_EVALUATION': {
      const evaluationId = action.payload.id;
      if (!state.database.entities.evaluations[evaluationId]) {
        return state;
      }

      return {
        ...state,
        shouldPersist: true,
        database: {
          ...state.database,
          updatedAt: now,
          entities: {
            ...state.database.entities,
            evaluations: omitIds<Evaluation>(
              state.database.entities.evaluations,
              new Set([evaluationId]),
            ),
          },
        },
      };
    }

    case 'RESET_DATABASE':
      return {
        database: createEmptyDatabase(),
        isHydrated: true,
        shouldPersist: true,
      };

    default:
      return state;
  }
}
