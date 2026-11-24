import { CURRENT_SCHEMA_VERSION, createEmptyDatabase } from '../domain/defaults';
import type { AcademicDatabase } from '../types/academic';
import { migrateDatabase } from './migrations';

export const STORAGE_KEY = 'mi_control_academico_db_v1';

export interface StorageOperationResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface AcademicRepository {
  load(): StorageOperationResult<AcademicDatabase>;
  save(database: AcademicDatabase): StorageOperationResult<AcademicDatabase>;
  reset(): StorageOperationResult<AcademicDatabase>;
}

export class LocalStorageAcademicRepository implements AcademicRepository {
  private readonly storageKey: string;

  constructor(storageKey: string = STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  load(): StorageOperationResult<AcademicDatabase> {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) {
        return { ok: true, data: createEmptyDatabase() };
      }

      const parsed: unknown = JSON.parse(raw);
      const { database, migrated, valid } = migrateDatabase(parsed);

      if (!valid) {
        return {
          ok: false,
          data: database,
          error: 'El formato guardado no es válido. Se inició una estructura limpia.',
        };
      }

      if (migrated) {
        this.save(database);
      }

      return { ok: true, data: database };
    } catch {
      return {
        ok: false,
        data: createEmptyDatabase(),
        error: 'No se pudo acceder al almacenamiento local del navegador.',
      };
    }
  }

  save(database: AcademicDatabase): StorageOperationResult<AcademicDatabase> {
    try {
      const nextDatabase: AcademicDatabase = {
        ...database,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(this.storageKey, JSON.stringify(nextDatabase));
      return { ok: true, data: nextDatabase };
    } catch {
      return {
        ok: false,
        error: 'No se pudieron guardar los cambios en el almacenamiento local.',
      };
    }
  }

  reset(): StorageOperationResult<AcademicDatabase> {
    return this.save(createEmptyDatabase());
  }
}

export const academicRepository: AcademicRepository = new LocalStorageAcademicRepository();
