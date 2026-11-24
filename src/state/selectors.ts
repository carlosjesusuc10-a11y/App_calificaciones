import {
  calculateSubjectBasicMetrics,
  convertPercentageToScale,
  determineGradeStatus,
  roundAcademicValue,
} from '../domain/calculations';
import type {
  AcademicDatabase,
  EntityCountsSummary,
  EntityId,
  Evaluation,
  SchoolCycle,
  Semester,
  SemesterDashboardSummary,
  Subject,
  SubjectCardViewModel,
  SubjectCategory,
} from '../types/academic';

export function selectOrderedCycles(database: AcademicDatabase): SchoolCycle[] {
  return Object.values(database.entities.cycles).sort((a, b) => a.order - b.order);
}

export function selectSemestersByCycle(
  database: AcademicDatabase,
  cycleId: EntityId | null,
): Semester[] {
  if (!cycleId) {
    return [];
  }

  return Object.values(database.entities.semesters)
    .filter((semester) => semester.cycleId === cycleId)
    .sort((a, b) => a.order - b.order);
}

export function selectActiveCycle(database: AcademicDatabase): SchoolCycle | null {
  const ordered = selectOrderedCycles(database);
  if (ordered.length === 0) {
    return null;
  }

  const activeId = database.navigationState.activeCycleId;
  if (activeId && database.entities.cycles[activeId]) {
    return database.entities.cycles[activeId];
  }

  return ordered[0];
}

export function selectActiveSemester(database: AcademicDatabase): Semester | null {
  const activeCycle = selectActiveCycle(database);
  if (!activeCycle) {
    return null;
  }

  const semestersInCycle = selectSemestersByCycle(database, activeCycle.id);
  if (semestersInCycle.length === 0) {
    return null;
  }

  const activeSemesterId = database.navigationState.activeSemesterId;
  if (activeSemesterId) {
    const match = semestersInCycle.find((semester) => semester.id === activeSemesterId);
    if (match) {
      return match;
    }
  }

  return semestersInCycle[0];
}

export function selectSubjectsBySemester(
  database: AcademicDatabase,
  semesterId: EntityId | null,
): Subject[] {
  if (!semesterId) {
    return [];
  }

  return Object.values(database.entities.subjects)
    .filter((subject) => subject.semesterId === semesterId)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function selectSubjectById(
  database: AcademicDatabase,
  subjectId: EntityId | null,
): Subject | null {
  if (!subjectId) {
    return null;
  }

  return database.entities.subjects[subjectId] ?? null;
}

export function selectCategoriesBySubject(
  database: AcademicDatabase,
  subjectId: EntityId | null,
): SubjectCategory[] {
  if (!subjectId) {
    return [];
  }

  return Object.values(database.entities.categories)
    .filter((category) => category.subjectId === subjectId)
    .sort((a, b) => a.order - b.order);
}

export function selectEvaluationsBySubject(
  database: AcademicDatabase,
  subjectId: EntityId | null,
): Evaluation[] {
  if (!subjectId) {
    return [];
  }

  return Object.values(database.entities.evaluations)
    .filter((evaluation) => evaluation.subjectId === subjectId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function selectSubjectCardViewModels(
  database: AcademicDatabase,
  semesterId: EntityId | null,
): SubjectCardViewModel[] {
  const subjects = selectSubjectsBySemester(database, semesterId);

  return subjects.map((subject) => {
    const evaluations = selectEvaluationsBySubject(database, subject.id);
    const categories = selectCategoriesBySubject(database, subject.id);
    const metrics = calculateSubjectBasicMetrics(
      subject,
      evaluations,
      database.settings.yellowZone,
      categories,
    );

    return {
      id: subject.id,
      name: subject.name,
      teacher: subject.teacher,
      currentGrade: metrics.equivalentGrade,
      maxGrade: subject.gradingScale.maxGrade,
      minPassingGrade: subject.gradingScale.minPassingGrade,
      currentPercentage: metrics.accumulatedPercentage,
      obtainedPoints: metrics.obtainedPoints,
      totalPossiblePoints: metrics.totalConfiguredPoints,
      evaluationSystem: subject.evaluationSystem,
      progressPercent: metrics.progressPercent,
      status: metrics.status,
    };
  });
}

export interface CycleDeletionImpact {
  semesterCount: number;
  subjectCount: number;
  evaluationCount: number;
}

export function selectCycleDeletionImpact(
  database: AcademicDatabase,
  cycleId: EntityId,
): CycleDeletionImpact {
  const semesters = selectSemestersByCycle(database, cycleId);
  const semesterIds = new Set(semesters.map((semester) => semester.id));

  const subjects = Object.values(database.entities.subjects).filter((subject) =>
    semesterIds.has(subject.semesterId),
  );
  const subjectIds = new Set(subjects.map((subject) => subject.id));

  const evaluations = Object.values(database.entities.evaluations).filter((evaluation) =>
    subjectIds.has(evaluation.subjectId),
  );

  return {
    semesterCount: semesters.length,
    subjectCount: subjects.length,
    evaluationCount: evaluations.length,
  };
}

export interface SemesterDeletionImpact {
  subjectCount: number;
  evaluationCount: number;
}

export function selectSemesterDeletionImpact(
  database: AcademicDatabase,
  semesterId: EntityId,
): SemesterDeletionImpact {
  const subjects = selectSubjectsBySemester(database, semesterId);
  const subjectIds = new Set(subjects.map((subject) => subject.id));

  const evaluations = Object.values(database.entities.evaluations).filter((evaluation) =>
    subjectIds.has(evaluation.subjectId),
  );

  return {
    subjectCount: subjects.length,
    evaluationCount: evaluations.length,
  };
}

export interface SubjectDeletionImpact {
  categoryCount: number;
  evaluationCount: number;
}

export function selectSubjectDeletionImpact(
  database: AcademicDatabase,
  subjectId: EntityId,
): SubjectDeletionImpact {
  return {
    categoryCount: selectCategoriesBySubject(database, subjectId).length,
    evaluationCount: selectEvaluationsBySubject(database, subjectId).length,
  };
}

export function selectSemesterDashboardSummary(
  database: AcademicDatabase,
  semesterId: EntityId | null,
): SemesterDashboardSummary {
  const subjects = selectSubjectsBySemester(database, semesterId);
  const defaultScale = database.settings.defaultScale;

  if (subjects.length === 0) {
    return {
      totalSubjects: 0,
      averagePercentage: null,
      averageScaleGrade: null,
      defaultScaleMaxGrade: defaultScale.maxGrade,
      averageStatus: null,
      averageGradedPerformancePercent: null,
      semesterProgressPercent: 0,
      gradedEvaluationsCount: 0,
      pendingEvaluationsCount: 0,
      approvedCount: 0,
      atRiskCount: 0,
      failedCount: 0,
    };
  }

  let approvedCount = 0;
  let atRiskCount = 0;
  let failedCount = 0;
  let percentageSum = 0;
  let progressSum = 0;
  let gradedPerfSum = 0;
  let gradedPerfSubjectsCount = 0;
  let gradedEvaluationsCount = 0;
  let pendingEvaluationsCount = 0;

  for (const subject of subjects) {
    const evaluations = selectEvaluationsBySubject(database, subject.id);
    const categories = selectCategoriesBySubject(database, subject.id);
    const metrics = calculateSubjectBasicMetrics(
      subject,
      evaluations,
      database.settings.yellowZone,
      categories,
    );

    percentageSum += metrics.accumulatedPercentage;
    progressSum += metrics.progressPercent;
    gradedEvaluationsCount += metrics.gradedCount;
    pendingEvaluationsCount += metrics.pendingCount;

    if (metrics.gradedPerformancePercentage !== null) {
      gradedPerfSum += metrics.gradedPerformancePercentage;
      gradedPerfSubjectsCount += 1;
    }

    if (metrics.status === 'green') {
      approvedCount += 1;
    } else if (metrics.status === 'yellow') {
      atRiskCount += 1;
    } else {
      failedCount += 1;
    }
  }

  const rawAveragePercentage = percentageSum / subjects.length;
  const averageEquivalentGrade = convertPercentageToScale(rawAveragePercentage, defaultScale);
  const averageStatus = determineGradeStatus(
    averageEquivalentGrade,
    defaultScale,
    database.settings.yellowZone,
  );

  return {
    totalSubjects: subjects.length,
    averagePercentage: Math.round(rawAveragePercentage * 10) / 10,
    averageScaleGrade: roundAcademicValue(averageEquivalentGrade, 2),
    defaultScaleMaxGrade: defaultScale.maxGrade,
    averageStatus,
    averageGradedPerformancePercent:
      gradedPerfSubjectsCount > 0
        ? Math.round((gradedPerfSum / gradedPerfSubjectsCount) * 10) / 10
        : null,
    semesterProgressPercent: Math.round(progressSum / subjects.length),
    gradedEvaluationsCount,
    pendingEvaluationsCount,
    approvedCount,
    atRiskCount,
    failedCount,
  };
}

export function selectEntityCounts(database: AcademicDatabase): EntityCountsSummary {
  return {
    cycles: Object.keys(database.entities.cycles).length,
    semesters: Object.keys(database.entities.semesters).length,
    subjects: Object.keys(database.entities.subjects).length,
    categories: Object.keys(database.entities.categories).length,
    evaluations: Object.keys(database.entities.evaluations).length,
  };
}
