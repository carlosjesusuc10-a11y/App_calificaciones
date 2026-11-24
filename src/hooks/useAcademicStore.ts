import { useContext } from 'react';
import { AcademicContext, type AcademicContextValue } from '../state/AcademicContext';

export function useAcademicStore(): AcademicContextValue {
  const context = useContext(AcademicContext);

  if (!context) {
    throw new Error('useAcademicStore debe utilizarse dentro de un AcademicProvider.');
  }

  return context;
}
