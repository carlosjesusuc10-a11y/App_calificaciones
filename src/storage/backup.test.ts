import assert from 'node:assert/strict';
import { createEmptyDatabase } from '../domain/defaults';
import type { AcademicDatabase } from '../types/academic';
import {
  hasExistingAcademicData,
  serializeAcademicBackup,
  validateAndParseAcademicBackup,
} from './backup';

const NOW = '2026-11-23T00:00:00.000Z';

function createPopulatedDatabase(): AcademicDatabase {
  const base = createEmptyDatabase();
  return {
    ...base,
    navigationState: {
      activeCycleId: 'cycle-1',
      activeSemesterId: 'sem-1',
    },
    entities: {
      cycles: {
        'cycle-1': {
          id: 'cycle-1',
          name: '2026-2027',
          order: 1,
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
      semesters: {
        'sem-1': {
          id: 'sem-1',
          cycleId: 'cycle-1',
          name: 'Semestre 1',
          order: 1,
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
      subjects: {
        'sub-1': {
          id: 'sub-1',
          semesterId: 'sem-1',
          name: 'Cálculo Diferencial',
          teacher: 'Dr. Carlos Méndez',
          gradingScale: { preset: '100', maxGrade: 100, minPassingGrade: 70 },
          evaluationSystem: 'points',
          additionalInfo: 'Grupo A',
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
      categories: {
        'cat-1': {
          id: 'cat-1',
          subjectId: 'sub-1',
          name: 'Examen',
          order: 1,
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
      evaluations: {
        'eval-1': {
          id: 'eval-1',
          subjectId: 'sub-1',
          categoryId: 'cat-1',
          name: 'Parcial 1',
          maxScore: 40,
          obtainedScore: 34,
          status: 'graded',
          createdAt: NOW,
          updatedAt: NOW,
        },
        'eval-2': {
          id: 'eval-2',
          subjectId: 'sub-1',
          categoryId: 'cat-1',
          name: 'Final',
          maxScore: 60,
          obtainedScore: null,
          status: 'pending',
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
    },
    settings: {
      ...base.settings,
      yellowZone: {
        belowPassingMarginPercent: 12,
        abovePassingRiskMarginPercent: 0,
      },
    },
  };
}

// 1. Exportación e importación completa (round-trip)
{
  const original = createPopulatedDatabase();
  assert.equal(hasExistingAcademicData(original), true);
  assert.equal(hasExistingAcademicData(createEmptyDatabase()), false);

  const json = serializeAcademicBackup(original);
  const parsed = validateAndParseAcademicBackup(json);

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.preview.counts.cycles, 1);
    assert.equal(parsed.preview.counts.semesters, 1);
    assert.equal(parsed.preview.counts.subjects, 1);
    assert.equal(parsed.preview.counts.categories, 1);
    assert.equal(parsed.preview.counts.evaluations, 2);
    assert.equal(parsed.preview.database.entities.subjects['sub-1'].teacher, 'Dr. Carlos Méndez');
    assert.equal(parsed.preview.database.entities.evaluations['eval-1'].obtainedScore, 34);
    assert.equal(parsed.preview.database.settings.yellowZone.belowPassingMarginPercent, 12);
  }
}

// 2. Rechazo de JSON corrupto, vacío o de otra aplicación
{
  assert.equal(validateAndParseAcademicBackup('').ok, false);
  assert.equal(validateAndParseAcademicBackup('{invalid json').ok, false);
  assert.equal(
    validateAndParseAcademicBackup(JSON.stringify({ app: 'otra-app', data: {} })).ok,
    false,
  );
  assert.equal(
    validateAndParseAcademicBackup('{"__proto__":{"polluted":true}}').ok,
    false,
  );
}

// 3. Rechazo por integridad referencial rota o calificaciones inválidas
{
  const brokenRef = createPopulatedDatabase();
  delete brokenRef.entities.cycles['cycle-1'];
  assert.equal(validateAndParseAcademicBackup(serializeAcademicBackup(brokenRef)).ok, false);

  const invalidGrade = createPopulatedDatabase();
  invalidGrade.entities.evaluations['eval-1'].obtainedScore = 999;
  assert.equal(validateAndParseAcademicBackup(serializeAcademicBackup(invalidGrade)).ok, false);

  const pendingWithScore = createPopulatedDatabase();
  pendingWithScore.entities.evaluations['eval-2'].obtainedScore = 10;
  assert.equal(validateAndParseAcademicBackup(serializeAcademicBackup(pendingWithScore)).ok, false);
}

console.log('Todas las pruebas de respaldo y validación JSON pasaron correctamente.');
