import assert from 'node:assert/strict';
import { calculateSubjectAcademicReport } from '../domain/calculations';
import {
  validateCategoryInput,
  validateCycleInput,
  validateEvaluationInput,
  validateSemesterInput,
  validateSubjectInput,
} from '../domain/validation';
import { serializeAcademicBackup, validateAndParseAcademicBackup } from '../storage/backup';
import { LocalStorageAcademicRepository } from '../storage/repository';
import { academicReducer, createInitialStoreState } from './academicReducer';
import {
  selectActiveCycle,
  selectActiveSemester,
  selectCategoriesBySubject,
  selectEvaluationsBySubject,
  selectOrderedCycles,
  selectSemesterDashboardSummary,
  selectSemestersByCycle,
  selectSubjectCardViewModels,
  selectSubjectsBySemester,
} from './selectors';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

// Simular window.localStorage para pruebas de persistencia de repositorio
(globalThis as unknown as { window: { localStorage: Storage } }).window = {
  localStorage: createMemoryStorage(),
};

const repository = new LocalStorageAcademicRepository('audit_test_db_v1');

// 1-2. Crear ciclo y semestre + validaciones
let state = {
  ...createInitialStoreState(),
  isHydrated: true,
};

assert.equal(validateCycleInput('').isValid, false);
state = academicReducer(state, { type: 'CREATE_CYCLE', payload: { name: '2026-2027' } });
const cycles = selectOrderedCycles(state.database);
assert.equal(cycles.length, 1);
const cycleId = cycles[0].id;
assert.equal(validateCycleInput('2026-2027', [cycles[0].name]).isValid, false);

assert.equal(validateSemesterInput('').isValid, false);
state = academicReducer(state, {
  type: 'CREATE_SEMESTER',
  payload: { cycleId, name: 'Semestre 1' },
});
const semesters = selectSemestersByCycle(state.database, cycleId);
assert.equal(semesters.length, 1);
const semesterId = semesters[0].id;
assert.equal(selectActiveCycle(state.database)?.id, cycleId);
assert.equal(selectActiveSemester(state.database)?.id, semesterId);

// 3-5, 12-16. Crear, editar y eliminar materia (escala 10, 100, personalizada; puntos y porcentajes)
assert.equal(
  validateSubjectInput({
    name: '',
    teacher: 'Docente',
    gradingScale: { preset: '100', maxGrade: 100, minPassingGrade: 70 },
    evaluationSystem: 'points',
  }).isValid,
  false,
);

state = academicReducer(state, {
  type: 'CREATE_SUBJECT',
  payload: {
    semesterId,
    name: 'Cálculo Diferencial',
    teacher: 'Dra. Elena Ríos',
    gradingScale: { preset: '100', maxGrade: 100, minPassingGrade: 70 },
    evaluationSystem: 'points',
  },
});
state = academicReducer(state, {
  type: 'CREATE_SUBJECT',
  payload: {
    semesterId,
    name: 'Física I',
    teacher: 'Ing. Marco Silva',
    gradingScale: { preset: '10', maxGrade: 10, minPassingGrade: 6 },
    evaluationSystem: 'percentage',
  },
});
state = academicReducer(state, {
  type: 'CREATE_SUBJECT',
  payload: {
    semesterId,
    name: 'Historia Temporal',
    teacher: 'Prof. Prueba',
    gradingScale: { preset: 'custom', maxGrade: 50, minPassingGrade: 35 },
    evaluationSystem: 'points',
  },
});

let subjects = selectSubjectsBySemester(state.database, semesterId);
assert.equal(subjects.length, 3);

const calcSubject = subjects.find((s) => s.name === 'Cálculo Diferencial')!;
const physicsSubject = subjects.find((s) => s.name === 'Física I')!;
const tempSubject = subjects.find((s) => s.name === 'Historia Temporal')!;

// Editar materia (Cálculo)
state = academicReducer(state, {
  type: 'UPDATE_SUBJECT',
  payload: {
    id: calcSubject.id,
    name: 'Cálculo Diferencial Avanzado',
    teacher: 'Dra. Elena Ríos Mora',
    gradingScale: { preset: '100', maxGrade: 100, minPassingGrade: 70 },
    evaluationSystem: 'points',
    additionalInfo: 'Aula B-12',
  },
});
assert.equal(state.database.entities.subjects[calcSubject.id].name, 'Cálculo Diferencial Avanzado');

// Eliminar materia temporal y validar cascada limpia
state = academicReducer(state, {
  type: 'DELETE_SUBJECT',
  payload: { id: tempSubject.id },
});
subjects = selectSubjectsBySemester(state.database, semesterId);
assert.equal(subjects.length, 2);
assert.equal(selectCategoriesBySubject(state.database, tempSubject.id).length, 0);

// 6. Crear categoría y configurar pesos porcentuales en Física I
assert.equal(validateCategoryInput('Laboratorio', ['ADA', 'Examen'], { weightPercentage: 110 }).isValid, false);
assert.equal(
  validateCategoryInput('Laboratorio', ['ADA', 'Examen'], {
    weightPercentage: 40,
    existingOtherWeightsTotal: 70,
  }).isValid,
  false,
);

state = academicReducer(state, {
  type: 'CREATE_CATEGORY',
  payload: {
    subjectId: physicsSubject.id,
    name: 'Laboratorio',
    weightPercentage: 30,
  },
});

const physicsCats = selectCategoriesBySubject(state.database, physicsSubject.id);
const physicsLabCat = physicsCats.find((c) => c.name === 'Laboratorio')!;
const physicsExamCat = physicsCats.find((c) => c.name === 'Examen')!;
const physicsProjectCat = physicsCats.find((c) => c.name === 'Proyecto')!;
assert.equal(physicsLabCat.weightPercentage, 30);

// Editar pesos de Examen (50%) y Proyecto (20%) -> total 100%
state = academicReducer(state, {
  type: 'UPDATE_CATEGORY',
  payload: { id: physicsExamCat.id, name: physicsExamCat.name, weightPercentage: 50 },
});
state = academicReducer(state, {
  type: 'UPDATE_CATEGORY',
  payload: { id: physicsProjectCat.id, name: physicsProjectCat.name, weightPercentage: 20 },
});

// 7-11. Crear, editar, calificar, marcar pendiente y eliminar evaluaciones
const calcCats = selectCategoriesBySubject(state.database, calcSubject.id);
const calcAdaCat = calcCats.find((c) => c.name === 'ADA')!;
const calcExamCat = calcCats.find((c) => c.name === 'Examen')!;

assert.equal(
  validateEvaluationInput({
    name: 'Inválida',
    categoryId: calcAdaCat.id,
    maxScore: 10,
    obtainedScore: 12,
    status: 'graded',
  }).isValid,
  false,
);

// Caso "todavía puede aprobar": 62/70 calificado, 30 restante pendiente, mínimo 70
state = academicReducer(state, {
  type: 'CREATE_EVALUATION',
  payload: {
    subjectId: calcSubject.id,
    categoryId: calcAdaCat.id,
    name: 'ADAs acumuladas',
    maxScore: 70,
    obtainedScore: 62,
    status: 'graded',
  },
});
state = academicReducer(state, {
  type: 'CREATE_EVALUATION',
  payload: {
    subjectId: calcSubject.id,
    categoryId: calcExamCat.id,
    name: 'Examen final',
    maxScore: 30,
    obtainedScore: null,
    status: 'pending',
  },
});

let calcEvals = selectEvaluationsBySubject(state.database, calcSubject.id);
assert.equal(calcEvals.length, 2);
const finalExamEval = calcEvals.find((e) => e.name === 'Examen final')!;

let calcReport = calculateSubjectAcademicReport(
  state.database.entities.subjects[calcSubject.id],
  calcEvals,
  calcCats,
  state.database.settings.yellowZone,
);
assert.equal(calcReport.equivalentGrade, 62);
assert.equal(calcReport.remainingPoints, 30);
assert.equal(calcReport.pointsNeededToPass, 8);
assert.equal(calcReport.passOutcome, 'achievable');

// Registrar calificación en evaluación pendiente -> ahora ya aprobó
state = academicReducer(state, {
  type: 'GRADE_EVALUATION',
  payload: { id: finalExamEval.id, obtainedScore: 20 },
});
calcEvals = selectEvaluationsBySubject(state.database, calcSubject.id);
calcReport = calculateSubjectAcademicReport(
  state.database.entities.subjects[calcSubject.id],
  calcEvals,
  calcCats,
  state.database.settings.yellowZone,
);
assert.equal(calcReport.equivalentGrade, 82);
assert.equal(calcReport.passOutcome, 'already_passed');
assert.equal(calcReport.status, 'green');

// Marcar como pendiente de nuevo y luego editar evaluación
state = academicReducer(state, {
  type: 'MARK_EVALUATION_PENDING',
  payload: { id: finalExamEval.id },
});
assert.equal(state.database.entities.evaluations[finalExamEval.id].status, 'pending');
assert.equal(state.database.entities.evaluations[finalExamEval.id].obtainedScore, null);

state = academicReducer(state, {
  type: 'UPDATE_EVALUATION',
  payload: {
    id: finalExamEval.id,
    categoryId: calcExamCat.id,
    name: 'Examen Final Ordinario',
    maxScore: 30,
    obtainedScore: 25,
    status: 'graded',
    notes: 'Actualizado',
  },
});
assert.equal(state.database.entities.evaluations[finalExamEval.id].name, 'Examen Final Ordinario');
assert.equal(state.database.entities.evaluations[finalExamEval.id].obtainedScore, 25);

// Crear y eliminar una evaluación extra
state = academicReducer(state, {
  type: 'CREATE_EVALUATION',
  payload: {
    subjectId: calcSubject.id,
    categoryId: calcAdaCat.id,
    name: 'Extra temporal',
    maxScore: 10,
    obtainedScore: 5,
    status: 'graded',
  },
});
const extraEval = selectEvaluationsBySubject(state.database, calcSubject.id).find(
  (e) => e.name === 'Extra temporal',
)!;
state = academicReducer(state, { type: 'DELETE_EVALUATION', payload: { id: extraEval.id } });
assert.equal(selectEvaluationsBySubject(state.database, calcSubject.id).length, 2);

// Verificar Física I en modo porcentajes ponderados y escala 10
state = academicReducer(state, {
  type: 'CREATE_EVALUATION',
  payload: {
    subjectId: physicsSubject.id,
    categoryId: physicsLabCat.id,
    name: 'Práctica 1',
    maxScore: 10,
    obtainedScore: 8,
    status: 'graded',
  },
});
state = academicReducer(state, {
  type: 'CREATE_EVALUATION',
  payload: {
    subjectId: physicsSubject.id,
    categoryId: physicsProjectCat.id,
    name: 'Proyecto puente',
    maxScore: 20,
    obtainedScore: 18,
    status: 'graded',
  },
});
state = academicReducer(state, {
  type: 'CREATE_EVALUATION',
  payload: {
    subjectId: physicsSubject.id,
    categoryId: physicsExamCat.id,
    name: 'Examen global',
    maxScore: 50,
    obtainedScore: null,
    status: 'pending',
  },
});

const physicsReport = calculateSubjectAcademicReport(
  state.database.entities.subjects[physicsSubject.id],
  selectEvaluationsBySubject(state.database, physicsSubject.id),
  selectCategoriesBySubject(state.database, physicsSubject.id),
  state.database.settings.yellowZone,
);
// Lab: (8/10)*30 = 24; Proyecto: (18/20)*20 = 18 -> 42%, restante 50%, min 6/10 -> necesita 18 de 50 (36%)
assert.equal(physicsReport.usesWeightedCategories, true);
assert.equal(physicsReport.obtainedPoints, 42);
assert.equal(physicsReport.remainingPoints, 50);
assert.equal(physicsReport.pointsNeededToPass, 18);
assert.equal(physicsReport.minimumNeededInRemainingPercentage, 36);
assert.equal(physicsReport.equivalentGrade, 4.2);
assert.equal(physicsReport.passOutcome, 'achievable');

// Dashboard summary refleja ambos estados en tiempo real
const summary = selectSemesterDashboardSummary(state.database, semesterId);
const cards = selectSubjectCardViewModels(state.database, semesterId);
assert.equal(summary.totalSubjects, 2);
assert.equal(cards.length, 2);

// 23-25. Guardar en localStorage, cerrar/reabrir (load), exportar JSON, reiniciar e importar JSON
const saveResult = repository.save(state.database);
assert.equal(saveResult.ok, true);

const reloaded = repository.load();
assert.equal(reloaded.ok, true);
assert.ok(reloaded.data);
assert.equal(Object.keys(reloaded.data!.entities.subjects).length, 2);
assert.equal(
  selectCategoriesBySubject(reloaded.data!, physicsSubject.id).find((c) => c.name === 'Laboratorio')
    ?.weightPercentage,
  30,
);

const exportedJson = serializeAcademicBackup(reloaded.data!);
const parsedBackup = validateAndParseAcademicBackup(exportedJson);
assert.equal(parsedBackup.ok, true);

// Reiniciar base de datos y restaurar desde respaldo
state = academicReducer(state, { type: 'RESET_DATABASE' });
assert.equal(selectOrderedCycles(state.database).length, 0);

if (parsedBackup.ok) {
  state = academicReducer(state, {
    type: 'IMPORT_DATABASE',
    payload: parsedBackup.preview.database,
  });
}
assert.equal(selectOrderedCycles(state.database).length, 1);
assert.equal(selectSubjectsBySemester(state.database, semesterId).length, 2);

// Guardas defensivas del reducer: NaN o categoría de otra materia no corrompen estado
const evalsBeforeInvalid = Object.keys(state.database.entities.evaluations).length;
state = academicReducer(state, {
  type: 'CREATE_EVALUATION',
  payload: {
    subjectId: calcSubject.id,
    categoryId: physicsLabCat.id, // categoría de otra materia!
    name: 'Cruce inválido',
    maxScore: 10,
    obtainedScore: 5,
    status: 'graded',
  },
});
assert.equal(Object.keys(state.database.entities.evaluations).length, evalsBeforeInvalid);

state = academicReducer(state, {
  type: 'GRADE_EVALUATION',
  payload: { id: finalExamEval.id, obtainedScore: Number.NaN },
});
assert.equal(state.database.entities.evaluations[finalExamEval.id].obtainedScore, 25);

console.log('Todas las pruebas de flujo completo, estado, pesos y persistencia pasaron correctamente.');
