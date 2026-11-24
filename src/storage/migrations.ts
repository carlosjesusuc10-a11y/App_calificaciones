import { CURRENT_SCHEMA_VERSION, createEmptyDatabase } from '../domain/defaults';
import type { AcademicDatabase } from '../types/academic';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isNormalizedDatabase(candidate: unknown): candidate is AcademicDatabase {
  if (!isRecord(candidate)) {
    return false;
  }

  const entities = candidate.entities;
  const navigationState = candidate.navigationState;
  const settings = candidate.settings;

  return (
    typeof candidate.schemaVersion === 'number' &&
    isRecord(entities) &&
    isRecord(entities.cycles) &&
    isRecord(entities.semesters) &&
    isRecord(entities.subjects) &&
    isRecord(entities.categories) &&
    isRecord(entities.evaluations) &&
    isRecord(navigationState) &&
    isRecord(settings) &&
    Array.isArray(settings.categoryTemplates)
  );
}

export function migrateDatabase(candidate: unknown): {
  database: AcademicDatabase;
  migrated: boolean;
  valid: boolean;
} {
  if (isNormalizedDatabase(candidate)) {
    if (candidate.schemaVersion === CURRENT_SCHEMA_VERSION) {
      return { database: candidate, migrated: false, valid: true };
    }

    return {
      database: {
        ...candidate,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      },
      migrated: true,
      valid: true,
    };
  }

  // Migración limpia desde estructura inicial v1 (si existiera sin datos reales)
  if (isRecord(candidate) && candidate.schemaVersion === 1 && Array.isArray(candidate.cycles)) {
    return {
      database: createEmptyDatabase(),
      migrated: true,
      valid: true,
    };
  }

  return {
    database: createEmptyDatabase(),
    migrated: false,
    valid: false,
  };
}
