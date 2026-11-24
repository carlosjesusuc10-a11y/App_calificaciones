import assert from 'node:assert/strict';
import type {
  Evaluation,
  GradingScaleConfig,
  Subject,
  SubjectCategory,
  YellowZoneConfig,
} from '../types/academic';
import {
  calculateSubjectAcademicReport,
  convertPercentageToScale,
  determineGradeStatus,
  roundAcademicValue,
} from './calculations';

const NOW = '2026-11-23T00:00:00.000Z';

const DEFAULT_YELLOW: YellowZoneConfig = {
  belowPassingMarginPercent: 10,
  abovePassingRiskMarginPercent: 5,
};

function makeSubject(
  evaluationSystem: 'points' | 'percentage',
  gradingScale: GradingScaleConfig,
): Subject {
  return {
    id: 'sub-1',
    semesterId: 'sem-1',
    name: 'Materia de Prueba',
    teacher: 'Docente',
    gradingScale,
    evaluationSystem,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeCategory(
  id: string,
  name: string,
  weightPercentage?: number,
): SubjectCategory {
  return {
    id,
    subjectId: 'sub-1',
    name,
    weightPercentage,
    order: 1,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeEval(
  id: string,
  categoryId: string,
  maxScore: number,
  obtainedScore: number | null,
  status: 'graded' | 'pending' = obtainedScore !== null ? 'graded' : 'pending',
): Evaluation {
  return {
    id,
    subjectId: 'sub-1',
    categoryId,
    name: id,
    maxScore,
    obtainedScore,
    status,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

// 1. Modo por puntos: ejemplo exacto del usuario (59 / 70)
{
  const categories = [
    makeCategory('cat-ada', 'ADA'),
    makeCategory('cat-proy', 'Proyecto'),
    makeCategory('cat-ex', 'Examen'),
  ];
  const evaluations = [
    makeEval('ada-1', 'cat-ada', 10, 8),
    makeEval('ada-2', 'cat-ada', 10, 9),
    makeEval('proy-1', 'cat-proy', 20, 18),
    makeEval('ex-1', 'cat-ex', 30, 24),
  ];

  const subject100 = makeSubject('points', { preset: '100', maxGrade: 100, minPassingGrade: 70 });
  const report100 = calculateSubjectAcademicReport(
    subject100,
    evaluations,
    categories,
    DEFAULT_YELLOW,
  );

  assert.equal(report100.obtainedPoints, 59);
  assert.equal(report100.totalPossiblePoints, 70);
  assert.equal(report100.remainingPoints, 0);
  assert.equal(report100.currentPercentage, 84.29);
  assert.equal(report100.equivalentGrade, 84.29);
  assert.equal(report100.maxPossibleGrade, 84.29);
  assert.equal(report100.pointsNeededToPass, 0);
  assert.equal(report100.passOutcome, 'already_passed');
  assert.equal(report100.isFullyEvaluated, true);
  assert.equal(report100.status, 'green');

  // Mismos datos en escalas 10, 50, 20 y personalizada 25
  const scales: Array<[GradingScaleConfig, number]> = [
    [{ preset: '10', maxGrade: 10, minPassingGrade: 6 }, 8.43],
    [{ preset: 'custom', maxGrade: 50, minPassingGrade: 30 }, 42.14],
    [{ preset: 'custom', maxGrade: 20, minPassingGrade: 12 }, 16.86],
    [{ preset: 'custom', maxGrade: 25, minPassingGrade: 15 }, 21.07],
  ];

  for (const [scale, expectedGrade] of scales) {
    const report = calculateSubjectAcademicReport(
      makeSubject('points', scale),
      evaluations,
      categories,
      DEFAULT_YELLOW,
    );
    assert.equal(report.equivalentGrade, expectedGrade);
  }
}

// 2. Modo por porcentajes con categorías ponderadas proporcionalmente (30% / 20% / 50%)
{
  const categories = [
    makeCategory('cat-ada', 'ADAs', 30),
    makeCategory('cat-proy', 'Proyecto', 20),
    makeCategory('cat-ex', 'Examen', 50),
  ];
  const evaluations = [
    makeEval('ada-1', 'cat-ada', 10, 8),
    makeEval('ada-2', 'cat-ada', 10, 9), // (17/20)*30 = 25.5%
    makeEval('proy-1', 'cat-proy', 20, 18), // (18/20)*20 = 18%
    makeEval('ex-1', 'cat-ex', 30, 24), // (24/30)*50 = 40%
  ];

  const subject10 = makeSubject('percentage', { preset: '10', maxGrade: 10, minPassingGrade: 6 });
  const report = calculateSubjectAcademicReport(subject10, evaluations, categories, DEFAULT_YELLOW);

  assert.equal(report.usesWeightedCategories, true);
  assert.equal(report.obtainedPoints, 83.5);
  assert.equal(report.totalPossiblePoints, 100);
  assert.equal(report.currentPercentage, 83.5);
  assert.equal(report.equivalentGrade, 8.35);
  assert.equal(report.status, 'green');
}

// 3. Evaluaciones pendientes + cálculo exacto de lo necesario en lo restante
{
  const categories = [
    makeCategory('cat-ada', 'ADAs', 30),
    makeCategory('cat-proy', 'Proyecto', 20),
    makeCategory('cat-ex', 'Examen', 50),
  ];
  const evaluations = [
    makeEval('ada-1', 'cat-ada', 10, 8),
    makeEval('ada-2', 'cat-ada', 10, 9), // 25.5%
    makeEval('proy-1', 'cat-proy', 20, 18), // 18%
    makeEval('ex-1', 'cat-ex', 30, 24), // 24% de 50% (30/50 * 50)
    makeEval('ex-2', 'cat-ex', 20, null, 'pending'), // 20% restante
  ];

  const subject100 = makeSubject('percentage', { preset: '100', maxGrade: 100, minPassingGrade: 70 });
  const report = calculateSubjectAcademicReport(
    subject100,
    evaluations,
    categories,
    DEFAULT_YELLOW,
  );

  // Obtenido: 25.5 + 18 + 24 = 67.5; restante = 20; necesita 2.5 de 20 = 12.5%
  assert.equal(report.obtainedPoints, 67.5);
  assert.equal(report.remainingPoints, 20);
  assert.equal(report.pointsNeededToPass, 2.5);
  assert.equal(report.minimumNeededInRemainingPercentage, 12.5);
  assert.equal(report.minimumNeededInRemainingGrade, 12.5);
  assert.equal(report.maxPossibleGrade, 87.5);
  assert.equal(report.passOutcome, 'achievable');
  assert.equal(report.isMathematicallyImpossible, false);
}

// 4. Sin redondeo intermedio (tres categorías de 100/3% = 100% exacto, no 99.99%)
{
  const categories = [
    makeCategory('cat-1', 'Parcial 1', 100 / 3),
    makeCategory('cat-2', 'Parcial 2', 100 / 3),
    makeCategory('cat-3', 'Parcial 3', 100 / 3),
  ];
  const evaluations = [
    makeEval('e1', 'cat-1', 7, 7),
    makeEval('e2', 'cat-2', 9, 9),
    makeEval('e3', 'cat-3', 11, 11),
  ];
  const subject = makeSubject('percentage', { preset: '100', maxGrade: 100, minPassingGrade: 70 });
  const report = calculateSubjectAcademicReport(subject, evaluations, categories, DEFAULT_YELLOW);

  assert.equal(report.currentPercentage, 100);
  assert.equal(report.equivalentGrade, 100);
}

// 5. Materia sin evaluaciones y protección contra división entre cero
{
  const categories = [makeCategory('cat-1', 'ADA')];
  const subject = makeSubject('points', { preset: '100', maxGrade: 100, minPassingGrade: 70 });
  const emptyReport = calculateSubjectAcademicReport(subject, [], categories, DEFAULT_YELLOW);

  assert.equal(emptyReport.hasEvaluations, false);
  assert.equal(emptyReport.obtainedPoints, 0);
  assert.equal(emptyReport.totalPossiblePoints, 0);
  assert.equal(emptyReport.currentPercentage, 0);
  assert.equal(emptyReport.passOutcome, 'no_evaluations');
  assert.equal(emptyReport.minimumNeededInRemainingPercentage, null);

  // Evaluación con maxScore = 0 no produce NaN ni Infinity
  const zeroMaxEval = [makeEval('z1', 'cat-1', 0, 0)];
  const zeroReport = calculateSubjectAcademicReport(
    subject,
    zeroMaxEval,
    categories,
    DEFAULT_YELLOW,
  );
  assert.equal(Number.isNaN(zeroReport.currentPercentage), false);
  assert.equal(zeroReport.currentPercentage, 0);
}

// 6. Materia donde aprobar ya NO es matemáticamente posible (con pendientes y completamente evaluada)
{
  const categories = [makeCategory('cat-1', 'Examen')];
  const subject = makeSubject('points', { preset: '100', maxGrade: 100, minPassingGrade: 70 });

  // Pendiente 30 pts, obtenido 20 -> máximo posible 50 < 70
  const pendingImpossible = calculateSubjectAcademicReport(
    subject,
    [makeEval('e1', 'cat-1', 70, 20), makeEval('e2', 'cat-1', 30, null, 'pending')],
    categories,
    DEFAULT_YELLOW,
  );
  assert.equal(pendingImpossible.maxPossibleGrade, 50);
  assert.equal(pendingImpossible.pointsNeededToPass, 50);
  assert.equal(pendingImpossible.isMathematicallyImpossible, true);
  assert.equal(pendingImpossible.passOutcome, 'mathematically_impossible');
  assert.equal(pendingImpossible.minimumNeededInRemainingPercentage, null);

  // Completamente evaluada y reprobada
  const fullyFailed = calculateSubjectAcademicReport(
    subject,
    [makeEval('e1', 'cat-1', 100, 55)],
    categories,
    DEFAULT_YELLOW,
  );
  assert.equal(fullyFailed.isFullyEvaluated, true);
  assert.equal(fullyFailed.isMathematicallyImpossible, true);
  assert.equal(fullyFailed.passOutcome, 'mathematically_impossible');
  assert.equal(fullyFailed.status, 'red');
}

// 7. Precisión exacta en límites de aprobación, conversión de escala y zona amarilla configurable
{
  assert.equal(
    roundAcademicValue(
      convertPercentageToScale(60, { preset: '10', maxGrade: 10, minPassingGrade: 6 }),
    ),
    6,
  );

  const scale100: GradingScaleConfig = { preset: '100', maxGrade: 100, minPassingGrade: 70 };
  const standardYellow: YellowZoneConfig = {
    belowPassingMarginPercent: 10,
    abovePassingRiskMarginPercent: 0,
  };

  assert.equal(determineGradeStatus(59, scale100, standardYellow), 'red');
  assert.equal(determineGradeStatus(60, scale100, standardYellow), 'yellow');
  assert.equal(determineGradeStatus(69.99, scale100, standardYellow), 'yellow');
  assert.equal(determineGradeStatus(70, scale100, standardYellow), 'green');
  assert.equal(determineGradeStatus(100, scale100, standardYellow), 'green');

  // Con margen superior configurable
  assert.equal(
    determineGradeStatus(6, { preset: '10', maxGrade: 10, minPassingGrade: 6 }, DEFAULT_YELLOW),
    'yellow',
  );

  // Con margen inferior modificado (20% debajo de 70 -> amarillo desde 50)
  assert.equal(
    determineGradeStatus(55, scale100, {
      belowPassingMarginPercent: 20,
      abovePassingRiskMarginPercent: 0,
    }),
    'yellow',
  );
}

// 8. Pruebas específicas de "¿Cuánto necesito?" en múltiples escalas y modos
{
  const categories = [
    makeCategory('cat-ada', 'ADAs'),
    makeCategory('cat-ex', 'Examen'),
  ];

  // Ejemplo exacto del usuario: Actual 62/100, Restante 30 puntos, Mínimo 70 -> necesita 8 de 30 (26.67%)
  const userExampleSubject = makeSubject('points', {
    preset: '100',
    maxGrade: 100,
    minPassingGrade: 70,
  });
  const userExampleReport = calculateSubjectAcademicReport(
    userExampleSubject,
    [
      makeEval('e1', 'cat-ada', 70, 62),
      makeEval('e2', 'cat-ex', 30, null, 'pending'),
    ],
    categories,
    { belowPassingMarginPercent: 10, abovePassingRiskMarginPercent: 0 },
  );

  assert.equal(userExampleReport.equivalentGrade, 62);
  assert.equal(userExampleReport.remainingPoints, 30);
  assert.equal(userExampleReport.pointsNeededToPass, 8);
  assert.equal(userExampleReport.minimumNeededInRemainingPercentage, 26.67);
  assert.equal(userExampleReport.maxPossibleGrade, 92);
  assert.equal(userExampleReport.hasAlreadyPassed, false);
  assert.equal(userExampleReport.isMathematicallyImpossible, false);
  assert.equal(userExampleReport.passOutcome, 'achievable');
  assert.equal(userExampleReport.pendingCount, 1);

  // Escala de 10 (mínimo 6) con sistema por puntos (ej. 50 pts total: 20/30 calificado, 20 pendiente)
  const scale10Points = calculateSubjectAcademicReport(
    makeSubject('points', { preset: '10', maxGrade: 10, minPassingGrade: 6 }),
    [
      makeEval('e1', 'cat-ada', 30, 20),
      makeEval('e2', 'cat-ex', 20, null, 'pending'),
    ],
    categories,
    { belowPassingMarginPercent: 10, abovePassingRiskMarginPercent: 0 },
  );
  // Mínimo 6/10 = 60% de 50 = 30 pts -> necesita 10 de 20 (50%), máximo 40/50 = 8/10
  assert.equal(scale10Points.equivalentGrade, 4);
  assert.equal(scale10Points.pointsNeededToPass, 10);
  assert.equal(scale10Points.minimumNeededInRemainingPercentage, 50);
  assert.equal(scale10Points.minimumNeededInRemainingGrade, 5);
  assert.equal(scale10Points.maxPossibleGrade, 8);
  assert.equal(scale10Points.passOutcome, 'achievable');

  // Escala personalizada 50 (mínimo 35 = 70%) en modo por porcentajes con peso parcial configurado
  const partialWeightedCats = [
    makeCategory('cat-ada', 'ADAs', 30),
    makeCategory('cat-proy', 'Proyecto', 20),
  ];
  const scale50Percentage = calculateSubjectAcademicReport(
    makeSubject('percentage', { preset: 'custom', maxGrade: 50, minPassingGrade: 35 }),
    [
      makeEval('a1', 'cat-ada', 10, 8), // 24%
      makeEval('p1', 'cat-proy', 20, 15), // 15% -> total 39%, quedan 50% sin asignar = 61% restante
    ],
    partialWeightedCats,
    { belowPassingMarginPercent: 10, abovePassingRiskMarginPercent: 0 },
  );
  assert.equal(scale50Percentage.obtainedPoints, 39);
  assert.equal(scale50Percentage.remainingPoints, 50);
  assert.equal(scale50Percentage.pointsNeededToPass, 31);
  assert.equal(scale50Percentage.minimumNeededInRemainingPercentage, 62);
  assert.equal(scale50Percentage.maxPossiblePercentage, 89);
  assert.equal(scale50Percentage.maxPossibleGrade, 44.5);
  assert.equal(scale50Percentage.passOutcome, 'achievable');

  // Evaluaciones con maxScore = 0 no deben reportarse como "ya aprobó"
  const zeroPointsReport = calculateSubjectAcademicReport(
    userExampleSubject,
    [makeEval('z1', 'cat-ada', 0, 0)],
    categories,
    { belowPassingMarginPercent: 10, abovePassingRiskMarginPercent: 0 },
  );
  assert.equal(zeroPointsReport.hasAlreadyPassed, false);
  assert.equal(zeroPointsReport.passOutcome, 'no_evaluations');
}

// 9. Pruebas del sistema de proyección académica
{
  const yellowCfg: YellowZoneConfig = {
    belowPassingMarginPercent: 10,
    abovePassingRiskMarginPercent: 0,
  };
  const categories = [
    makeCategory('cat-ada', 'ADAs', 30),
    makeCategory('cat-proy', 'Proyecto', 20),
    makeCategory('cat-ex', 'Examen', 50),
  ];

  // 9a. Modo puntos, escala 100, >= 2 evaluaciones calificadas y >= 20% evaluado -> proyección confiable
  const pointsSubject = makeSubject('points', { preset: '100', maxGrade: 100, minPassingGrade: 70 });
  const pointsProjection = calculateSubjectAcademicReport(
    pointsSubject,
    [
      makeEval('e1', 'cat-ada', 20, 17),
      makeEval('e2', 'cat-proy', 20, 19), // 36 / 40 = 90% rendimiento
      makeEval('e3', 'cat-ex', 60, null, 'pending'),
    ],
    categories,
    yellowCfg,
  );
  assert.equal(pointsProjection.gradedPerformancePercentage, 90);
  assert.equal(pointsProjection.projectedPercentage, 90);
  assert.equal(pointsProjection.projectedGrade, 90);
  assert.equal(pointsProjection.projectedStatus, 'green');
  assert.equal(pointsProjection.maxPossibleGrade, 96);
  assert.equal(pointsProjection.isProjectionReliable, true);
  assert.equal(pointsProjection.projectionConfidence, 'reliable');

  // 9b. Modo porcentajes, escala personalizada 50 (mín. 35), evaluaciones pendientes
  const customPercentageSubject = makeSubject('percentage', {
    preset: 'custom',
    maxGrade: 50,
    minPassingGrade: 35,
  });
  const percentageProjection = calculateSubjectAcademicReport(
    customPercentageSubject,
    [
      makeEval('a1', 'cat-ada', 10, 8),
      makeEval('a2', 'cat-ada', 10, 9), // (17/20)*30 = 25.5%
      makeEval('p1', 'cat-proy', 20, 17), // (17/20)*20 = 17% -> 42.5 / 50 = 85% rendimiento
      makeEval('x1', 'cat-ex', 30, null, 'pending'), // 50% pendiente
    ],
    categories,
    yellowCfg,
  );
  assert.equal(percentageProjection.gradedPerformancePercentage, 85);
  assert.equal(percentageProjection.projectedPercentage, 85);
  assert.equal(percentageProjection.projectedGrade, 42.5);
  assert.equal(percentageProjection.projectedStatus, 'green');
  assert.equal(percentageProjection.maxPossibleGrade, 46.25);
  assert.equal(percentageProjection.isProjectionReliable, true);

  // 9c. Muy pocas evaluaciones (solo 1 calificada y pendientes) -> baja confianza
  const lowSampleOne = calculateSubjectAcademicReport(
    pointsSubject,
    [
      makeEval('e1', 'cat-ada', 25, 22),
      makeEval('e2', 'cat-ex', 75, null, 'pending'),
    ],
    categories,
    yellowCfg,
  );
  assert.equal(lowSampleOne.isProjectionReliable, false);
  assert.equal(lowSampleOne.projectionConfidence, 'low_sample');
  assert.equal(lowSampleOne.projectedGrade, 88);

  // 9d. Varias evaluaciones calificadas pero con menos del 20% evaluado -> baja confianza
  const lowSamplePercent = calculateSubjectAcademicReport(
    pointsSubject,
    [
      makeEval('e1', 'cat-ada', 5, 4),
      makeEval('e2', 'cat-ada', 5, 5),
      makeEval('e3', 'cat-ex', 90, null, 'pending'),
    ],
    categories,
    yellowCfg,
  );
  assert.equal(lowSamplePercent.progressPercent, 10);
  assert.equal(lowSamplePercent.isProjectionReliable, false);
  assert.equal(lowSamplePercent.projectionConfidence, 'low_sample');

  // 9e. Solo evaluaciones pendientes (0 calificadas) -> sin proyección numérica todavía
  const onlyPending = calculateSubjectAcademicReport(
    pointsSubject,
    [makeEval('e1', 'cat-ex', 100, null, 'pending')],
    categories,
    yellowCfg,
  );
  assert.equal(onlyPending.gradedPerformancePercentage, null);
  assert.equal(onlyPending.projectedGrade, null);
  assert.equal(onlyPending.isProjectionReliable, false);
  assert.equal(onlyPending.projectionConfidence, 'none');
}

console.log('Todas las pruebas del motor de cálculo académico pasaron correctamente.');
