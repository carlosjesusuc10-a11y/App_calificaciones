import type {
  EntityId,
  Evaluation,
  GradeStatus,
  GradingScaleConfig,
  Subject,
  SubjectCategory,
  YellowZoneConfig,
} from '../types/academic';

const FLOAT_EPSILON = 1e-9;

export type AcademicPassOutcome =
  | 'no_evaluations'
  | 'already_passed'
  | 'achievable'
  | 'mathematically_impossible';

export type ProjectionConfidence = 'none' | 'low_sample' | 'reliable' | 'complete';

export interface CategoryCalculationBreakdown {
  categoryId: EntityId;
  categoryName: string;
  weightPercentage: number | null;
  evaluationCount: number;
  gradedCount: number;
  pendingCount: number;
  obtainedRawPoints: number;
  gradedPossibleRawPoints: number;
  totalPossibleRawPoints: number;
  remainingRawPoints: number;
  weightedObtainedPercentage: number;
  weightedPossiblePercentage: number;
  weightedRemainingPercentage: number;
}

export interface SubjectAcademicReport {
  evaluationSystem: 'points' | 'percentage';
  usesWeightedCategories: boolean;
  obtainedPoints: number;
  gradedPossiblePoints: number;
  totalPossiblePoints: number;
  remainingPoints: number;
  currentPercentage: number;
  gradedPerformancePercentage: number | null;
  equivalentGrade: number;
  projectedPercentage: number | null;
  projectedGrade: number | null;
  projectedStatus: GradeStatus | null;
  isProjectionReliable: boolean;
  projectionConfidence: ProjectionConfidence;
  maxPossiblePercentage: number;
  maxPossibleGrade: number;
  pointsNeededToPass: number;
  minimumNeededInRemainingPercentage: number | null;
  minimumNeededInRemainingGrade: number | null;
  progressPercent: number;
  gradedCount: number;
  pendingCount: number;
  hasEvaluations: boolean;
  isFullyEvaluated: boolean;
  hasAlreadyPassed: boolean;
  isMathematicallyImpossible: boolean;
  passOutcome: AcademicPassOutcome;
  status: GradeStatus;
  categoryBreakdowns: CategoryCalculationBreakdown[];
}

export interface SubjectBasicMetrics {
  obtainedPoints: number;
  gradedPossiblePoints: number;
  totalConfiguredPoints: number;
  remainingPoints: number;
  accumulatedPercentage: number;
  gradedPerformancePercentage: number | null;
  equivalentGrade: number;
  progressPercent: number;
  gradedCount: number;
  pendingCount: number;
  status: GradeStatus;
}

/**
 * Redondea únicamente al presentar resultados finales.
 */
export function roundAcademicValue(value: number, decimals: number = 2): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = Math.pow(10, Math.max(0, decimals));
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function convertPercentageToScale(
  percentage: number,
  gradingScale: GradingScaleConfig,
): number {
  if (!Number.isFinite(percentage) || !Number.isFinite(gradingScale.maxGrade) || gradingScale.maxGrade <= 0) {
    return 0;
  }

  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  return (clampedPercentage / 100) * gradingScale.maxGrade;
}

export function determineGradeStatus(
  equivalentGrade: number,
  gradingScale: GradingScaleConfig,
  yellowZone: YellowZoneConfig,
): GradeStatus {
  const { minPassingGrade, maxGrade } = gradingScale;
  if (maxGrade <= 0 || minPassingGrade <= 0) {
    return 'red';
  }

  const belowMargin = (maxGrade * Math.max(0, yellowZone.belowPassingMarginPercent)) / 100;
  const aboveMargin = (maxGrade * Math.max(0, yellowZone.abovePassingRiskMarginPercent)) / 100;

  if (equivalentGrade + FLOAT_EPSILON >= minPassingGrade + aboveMargin) {
    return 'green';
  }

  if (equivalentGrade + FLOAT_EPSILON >= minPassingGrade - belowMargin) {
    return 'yellow';
  }

  return 'red';
}

export const determineBasicGradeStatus = determineGradeStatus;

function sanitizeEvaluationScores(evaluation: Evaluation): {
  maxScore: number;
  obtainedScore: number;
  isGraded: boolean;
} {
  const maxScore = Number.isFinite(evaluation.maxScore) ? Math.max(0, evaluation.maxScore) : 0;
  const isGraded = evaluation.status === 'graded' && evaluation.obtainedScore !== null;
  const rawObtained =
    isGraded && evaluation.obtainedScore !== null && Number.isFinite(evaluation.obtainedScore)
      ? evaluation.obtainedScore
      : 0;
  const obtainedScore = Math.min(maxScore, Math.max(0, rawObtained));

  return { maxScore, obtainedScore, isGraded };
}

export function calculateCategoryBreakdowns(
  categories: SubjectCategory[],
  evaluations: Evaluation[],
): CategoryCalculationBreakdown[] {
  const grouped = new Map<EntityId, Evaluation[]>();

  for (const evaluation of evaluations) {
    const bucket = grouped.get(evaluation.categoryId) ?? [];
    bucket.push(evaluation);
    grouped.set(evaluation.categoryId, bucket);
  }

  const knownIds = new Set(categories.map((category) => category.id));
  const orphanEvaluations = evaluations.filter((evaluation) => !knownIds.has(evaluation.categoryId));

  const categoryList: Array<{ id: EntityId; name: string; weightPercentage: number | null }> =
    categories.map((category) => ({
      id: category.id,
      name: category.name,
      weightPercentage:
        typeof category.weightPercentage === 'number' &&
        Number.isFinite(category.weightPercentage) &&
        category.weightPercentage > 0
          ? category.weightPercentage
          : null,
    }));

  if (orphanEvaluations.length > 0) {
    categoryList.push({
      id: '__uncategorized__',
      name: 'Sin categoría',
      weightPercentage: null,
    });
    grouped.set('__uncategorized__', orphanEvaluations);
  }

  return categoryList.map((cat) => {
    const items = grouped.get(cat.id) ?? [];
    let obtainedRawPoints = 0;
    let gradedPossibleRawPoints = 0;
    let totalPossibleRawPoints = 0;
    let gradedCount = 0;
    let pendingCount = 0;

    for (const item of items) {
      const { maxScore, obtainedScore, isGraded } = sanitizeEvaluationScores(item);
      totalPossibleRawPoints += maxScore;
      if (isGraded) {
        obtainedRawPoints += obtainedScore;
        gradedPossibleRawPoints += maxScore;
        gradedCount += 1;
      } else {
        pendingCount += 1;
      }
    }

    const remainingRawPoints = Math.max(0, totalPossibleRawPoints - gradedPossibleRawPoints);
    const weight = cat.weightPercentage ?? 0;

    let weightedObtainedPercentage = 0;
    let weightedPossiblePercentage = 0;
    let weightedRemainingPercentage = 0;

    if (weight > 0) {
      if (totalPossibleRawPoints > 0) {
        weightedObtainedPercentage = (obtainedRawPoints / totalPossibleRawPoints) * weight;
        weightedPossiblePercentage = (gradedPossibleRawPoints / totalPossibleRawPoints) * weight;
        weightedRemainingPercentage = (remainingRawPoints / totalPossibleRawPoints) * weight;
      } else {
        weightedRemainingPercentage = weight;
      }
    }

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      weightPercentage: cat.weightPercentage,
      evaluationCount: items.length,
      gradedCount,
      pendingCount,
      obtainedRawPoints,
      gradedPossibleRawPoints,
      totalPossibleRawPoints,
      remainingRawPoints,
      weightedObtainedPercentage,
      weightedPossiblePercentage,
      weightedRemainingPercentage,
    };
  });
}

export function calculateSubjectAcademicReport(
  subject: Subject,
  evaluations: Evaluation[],
  categories: SubjectCategory[],
  yellowZone: YellowZoneConfig,
): SubjectAcademicReport {
  const breakdowns = calculateCategoryBreakdowns(categories, evaluations);

  const totalConfiguredCategoryWeight = breakdowns.reduce(
    (sum, item) => sum + (item.weightPercentage ?? 0),
    0,
  );
  const usesWeightedCategories =
    subject.evaluationSystem === 'percentage' && totalConfiguredCategoryWeight > 0;

  let rawObtained = 0;
  let rawGradedPossible = 0;
  let rawTotalPossible = 0;
  let rawRemaining = 0;
  let gradedCount = 0;
  let pendingCount = 0;

  for (const item of breakdowns) {
    gradedCount += item.gradedCount;
    pendingCount += item.pendingCount;
  }

  if (usesWeightedCategories) {
    for (const item of breakdowns) {
      rawObtained += item.weightedObtainedPercentage;
      rawGradedPossible += item.weightedPossiblePercentage;
      rawRemaining += item.weightedRemainingPercentage;
    }
    rawTotalPossible = Math.max(100, totalConfiguredCategoryWeight);
    rawRemaining += Math.max(0, rawTotalPossible - totalConfiguredCategoryWeight);
  } else {
    for (const item of breakdowns) {
      rawObtained += item.obtainedRawPoints;
      rawGradedPossible += item.gradedPossibleRawPoints;
      rawTotalPossible += item.totalPossibleRawPoints;
      rawRemaining += item.remainingRawPoints;
    }

    if (subject.evaluationSystem === 'percentage') {
      rawTotalPossible = rawTotalPossible > 0 ? Math.max(100, rawTotalPossible) : 100;
      rawRemaining = Math.max(0, rawTotalPossible - rawGradedPossible);
    }
  }

  const hasEvaluations = evaluations.length > 0;
  const hasAnyMeasurableScope =
    rawTotalPossible > FLOAT_EPSILON && (hasEvaluations || usesWeightedCategories);

  const rawCurrentPercentage =
    hasAnyMeasurableScope && rawTotalPossible > 0
      ? Math.min(100, Math.max(0, (rawObtained / rawTotalPossible) * 100))
      : 0;

  const rawGradedPerformancePercentage =
    rawGradedPossible > 0
      ? Math.min(100, Math.max(0, (rawObtained / rawGradedPossible) * 100))
      : null;

  const rawProgressPercent =
    hasAnyMeasurableScope && rawTotalPossible > 0
      ? Math.min(100, Math.max(0, (rawGradedPossible / rawTotalPossible) * 100))
      : 0;

  const rawEquivalentGrade = convertPercentageToScale(rawCurrentPercentage, subject.gradingScale);

  const rawMaxPossiblePoints = Math.min(rawTotalPossible, rawObtained + rawRemaining);
  const rawMaxPossiblePercentage =
    hasAnyMeasurableScope && rawTotalPossible > 0
      ? Math.min(100, Math.max(0, (rawMaxPossiblePoints / rawTotalPossible) * 100))
      : 0;

  const rawMaxPossibleGrade = convertPercentageToScale(
    rawMaxPossiblePercentage,
    subject.gradingScale,
  );

  const passingRatio =
    subject.gradingScale.maxGrade > 0
      ? Math.min(1, Math.max(0, subject.gradingScale.minPassingGrade / subject.gradingScale.maxGrade))
      : 0;

  const rawRequiredTotalToPass = rawTotalPossible * passingRatio;
  const rawDeltaToPass = rawRequiredTotalToPass - rawObtained;
  const rawPointsNeededToPass = rawDeltaToPass <= FLOAT_EPSILON ? 0 : rawDeltaToPass;

  const isFullyEvaluated = hasEvaluations && pendingCount === 0 && rawRemaining <= FLOAT_EPSILON;
  const hasAlreadyPassed = hasAnyMeasurableScope && rawPointsNeededToPass <= FLOAT_EPSILON;

  let passOutcome: AcademicPassOutcome;
  let isMathematicallyImpossible = false;
  let rawMinimumNeededInRemainingPercentage: number | null = null;
  let rawMinimumNeededInRemainingGrade: number | null = null;

  if (!hasAnyMeasurableScope) {
    passOutcome = 'no_evaluations';
  } else if (hasAlreadyPassed) {
    passOutcome = 'already_passed';
    rawMinimumNeededInRemainingPercentage = 0;
    rawMinimumNeededInRemainingGrade = 0;
  } else if (rawRemaining <= FLOAT_EPSILON || rawPointsNeededToPass - rawRemaining > FLOAT_EPSILON) {
    passOutcome = 'mathematically_impossible';
    isMathematicallyImpossible = true;
  } else {
    passOutcome = 'achievable';
    const clampedNeeded = Math.min(rawRemaining, rawPointsNeededToPass);
    rawMinimumNeededInRemainingPercentage = (clampedNeeded / rawRemaining) * 100;
    rawMinimumNeededInRemainingGrade = convertPercentageToScale(
      rawMinimumNeededInRemainingPercentage,
      subject.gradingScale,
    );
  }

  const status = determineGradeStatus(rawEquivalentGrade, subject.gradingScale, yellowZone);

  let rawProjectedPercentage: number | null = null;
  let rawProjectedGrade: number | null = null;
  let projectedStatus: GradeStatus | null = null;

  if (hasAnyMeasurableScope && rawGradedPerformancePercentage !== null && rawTotalPossible > 0) {
    const projectedRemainingPoints = (rawGradedPerformancePercentage / 100) * rawRemaining;
    const rawProjectedTotal = Math.min(rawTotalPossible, rawObtained + projectedRemainingPoints);
    rawProjectedPercentage = Math.min(
      100,
      Math.max(0, (rawProjectedTotal / rawTotalPossible) * 100),
    );
    rawProjectedGrade = convertPercentageToScale(rawProjectedPercentage, subject.gradingScale);
    projectedStatus = determineGradeStatus(rawProjectedGrade, subject.gradingScale, yellowZone);
  }

  let projectionConfidence: ProjectionConfidence;
  if (!hasAnyMeasurableScope || gradedCount === 0) {
    projectionConfidence = 'none';
  } else if (isFullyEvaluated) {
    projectionConfidence = 'complete';
  } else if (gradedCount >= 2 && rawProgressPercent + FLOAT_EPSILON >= 20) {
    projectionConfidence = 'reliable';
  } else {
    projectionConfidence = 'low_sample';
  }

  const isProjectionReliable =
    projectionConfidence === 'reliable' || projectionConfidence === 'complete';

  return {
    evaluationSystem: subject.evaluationSystem,
    usesWeightedCategories,
    obtainedPoints: roundAcademicValue(rawObtained),
    gradedPossiblePoints: roundAcademicValue(rawGradedPossible),
    totalPossiblePoints: roundAcademicValue(rawTotalPossible),
    remainingPoints: roundAcademicValue(rawRemaining),
    currentPercentage: roundAcademicValue(rawCurrentPercentage),
    gradedPerformancePercentage:
      rawGradedPerformancePercentage !== null
        ? roundAcademicValue(rawGradedPerformancePercentage)
        : null,
    equivalentGrade: roundAcademicValue(rawEquivalentGrade),
    projectedPercentage:
      rawProjectedPercentage !== null ? roundAcademicValue(rawProjectedPercentage) : null,
    projectedGrade: rawProjectedGrade !== null ? roundAcademicValue(rawProjectedGrade) : null,
    projectedStatus,
    isProjectionReliable,
    projectionConfidence,
    maxPossiblePercentage: roundAcademicValue(rawMaxPossiblePercentage),
    maxPossibleGrade: roundAcademicValue(rawMaxPossibleGrade),
    pointsNeededToPass: roundAcademicValue(rawPointsNeededToPass),
    minimumNeededInRemainingPercentage:
      rawMinimumNeededInRemainingPercentage !== null
        ? roundAcademicValue(rawMinimumNeededInRemainingPercentage)
        : null,
    minimumNeededInRemainingGrade:
      rawMinimumNeededInRemainingGrade !== null
        ? roundAcademicValue(rawMinimumNeededInRemainingGrade)
        : null,
    progressPercent: Math.round(rawProgressPercent),
    gradedCount,
    pendingCount,
    hasEvaluations,
    isFullyEvaluated,
    hasAlreadyPassed,
    isMathematicallyImpossible,
    passOutcome,
    status,
    categoryBreakdowns: breakdowns.map((item) => ({
      ...item,
      obtainedRawPoints: roundAcademicValue(item.obtainedRawPoints),
      gradedPossibleRawPoints: roundAcademicValue(item.gradedPossibleRawPoints),
      totalPossibleRawPoints: roundAcademicValue(item.totalPossibleRawPoints),
      remainingRawPoints: roundAcademicValue(item.remainingRawPoints),
      weightedObtainedPercentage: roundAcademicValue(item.weightedObtainedPercentage),
      weightedPossiblePercentage: roundAcademicValue(item.weightedPossiblePercentage),
      weightedRemainingPercentage: roundAcademicValue(item.weightedRemainingPercentage),
    })),
  };
}

export function calculateSubjectBasicMetrics(
  subject: Subject,
  evaluations: Evaluation[],
  yellowZone: YellowZoneConfig,
  categories: SubjectCategory[] = [],
): SubjectBasicMetrics {
  const report = calculateSubjectAcademicReport(subject, evaluations, categories, yellowZone);

  return {
    obtainedPoints: report.obtainedPoints,
    gradedPossiblePoints: report.gradedPossiblePoints,
    totalConfiguredPoints: report.totalPossiblePoints,
    remainingPoints: report.remainingPoints,
    accumulatedPercentage: report.currentPercentage,
    gradedPerformancePercentage: report.gradedPerformancePercentage,
    equivalentGrade: report.equivalentGrade,
    progressPercent: report.progressPercent,
    gradedCount: report.gradedCount,
    pendingCount: report.pendingCount,
    status: report.status,
  };
}
