import {
  createContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import { academicRepository } from '../storage/repository';
import type { AcademicDatabase } from '../types/academic';
import type { AcademicAction } from './academicActions';
import {
  academicReducer,
  createInitialStoreState,
  type AcademicStoreState,
} from './academicReducer';

export interface AcademicContextValue {
  database: AcademicDatabase;
  isHydrated: boolean;
  storageError: string | null;
  clearStorageError: () => void;
  dispatch: Dispatch<AcademicAction>;
}

export const AcademicContext = createContext<AcademicContextValue | null>(null);

interface AcademicProviderProps {
  children: ReactNode;
}

function createHydratedInitialState(): {
  initialStore: AcademicStoreState;
  initialError: string | null;
} {
  if (typeof window === 'undefined') {
    return { initialStore: createInitialStoreState(), initialError: null };
  }

  const loadResult = academicRepository.load();
  const base = createInitialStoreState();

  return {
    initialStore: {
      database: loadResult.data ?? base.database,
      isHydrated: true,
      shouldPersist: false,
    },
    initialError: !loadResult.ok && loadResult.error ? loadResult.error : null,
  };
}

export function AcademicProvider({ children }: AcademicProviderProps) {
  const [initialBootstrap] = useState(createHydratedInitialState);
  const [state, dispatch] = useReducer(academicReducer, initialBootstrap.initialStore);
  const [storageError, setStorageError] = useState<string | null>(initialBootstrap.initialError);
  const latestStateRef = useRef(state);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!state.isHydrated || !state.shouldPersist) {
      return;
    }

    const saveResult = academicRepository.save(state.database);
    if (!saveResult.ok && saveResult.error) {
      setStorageError(saveResult.error);
    }
  }, [state.database, state.isHydrated, state.shouldPersist]);

  // Solicitar almacenamiento persistente en navegadores móviles y asegurar guardado al ocultar/cerrar la pestaña
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {
        // Ignorar si el navegador no concede almacenamiento persistente automático
      });
    }

    const flushPendingSave = () => {
      const current = latestStateRef.current;
      if (current.isHydrated && current.shouldPersist) {
        academicRepository.save(current.database);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSave();
      }
    };

    window.addEventListener('pagehide', flushPendingSave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushPendingSave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const clearStorageError = () => setStorageError(null);

  return (
    <AcademicContext.Provider
      value={{
        database: state.database,
        isHydrated: state.isHydrated,
        storageError,
        clearStorageError,
        dispatch,
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
}
