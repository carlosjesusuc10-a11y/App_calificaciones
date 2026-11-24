import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAcademicStore } from '../../hooks/useAcademicStore';
import {
  selectActiveCycle,
  selectActiveSemester,
  selectCycleDeletionImpact,
  selectOrderedCycles,
  selectSemesterDeletionImpact,
  selectSemestersByCycle,
  selectSubjectsBySemester,
} from '../../state/selectors';
import type { SchoolCycle, Semester } from '../../types/academic';
import { CycleForm } from '../forms/CycleForm';
import { SemesterForm } from '../forms/SemesterForm';
import { AdaptiveSheet } from '../layout/AdaptiveSheet';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { SurfaceCard } from '../ui/SurfaceCard';

interface CyclesViewProps {
  onGoToDashboard: () => void;
}

type CycleModalState =
  | { mode: 'closed' }
  | { mode: 'create-cycle' }
  | { mode: 'edit-cycle'; cycle: SchoolCycle }
  | { mode: 'delete-cycle'; cycle: SchoolCycle }
  | { mode: 'create-semester'; cycle: SchoolCycle }
  | { mode: 'edit-semester'; cycle: SchoolCycle; semester: Semester }
  | { mode: 'delete-semester'; cycle: SchoolCycle; semester: Semester };

export function CyclesView({ onGoToDashboard }: CyclesViewProps) {
  const { database, dispatch } = useAcademicStore();
  const [modalState, setModalState] = useState<CycleModalState>({ mode: 'closed' });

  const cycles = useMemo(() => selectOrderedCycles(database), [database]);
  const activeCycle = useMemo(() => selectActiveCycle(database), [database]);
  const activeSemester = useMemo(() => selectActiveSemester(database), [database]);

  const closeModal = () => setModalState({ mode: 'closed' });

  const cycleImpact = useMemo(() => {
    if (modalState.mode !== 'delete-cycle') {
      return null;
    }
    return selectCycleDeletionImpact(database, modalState.cycle.id);
  }, [database, modalState]);

  const semesterImpact = useMemo(() => {
    if (modalState.mode !== 'delete-semester') {
      return null;
    }
    return selectSemesterDeletionImpact(database, modalState.semester.id);
  }, [database, modalState]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Ciclos escolares y semestres
          </h1>
          <p className="text-sm text-slate-600">
            Organiza tus periodos académicos y elige cuál ciclo y semestre están activos en el panel principal.
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => setModalState({ mode: 'create-cycle' })}
          className="w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
          <span>Nuevo ciclo</span>
        </Button>
      </header>

      {cycles.length === 0 ? (
        <EmptyState
          icon={<CalendarRange className="w-6 h-6" aria-hidden="true" />}
          title="Aún no tienes ciclos escolares"
          description="Crea tu primer ciclo escolar (por ejemplo 2026-2027) para comenzar a organizar tus semestres y materias."
          action={
            <Button size="lg" onClick={() => setModalState({ mode: 'create-cycle' })}>
              <Plus className="w-5 h-5" aria-hidden="true" />
              <span>Crear primer ciclo</span>
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {cycles.map((cycle) => {
            const semesters = selectSemestersByCycle(database, cycle.id);
            const isActiveCycle = activeCycle?.id === cycle.id;
            const totalSubjectsInCycle = semesters.reduce(
              (acc, sem) => acc + selectSubjectsBySemester(database, sem.id).length,
              0,
            );

            return (
              <SurfaceCard key={cycle.id}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="text-lg font-semibold text-slate-900 truncate">
                        {cycle.name}
                      </h2>
                      {isActiveCycle ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>Ciclo activo</span>
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {semesters.length} {semesters.length === 1 ? 'semestre' : 'semestres'} ·{' '}
                      {totalSubjectsInCycle}{' '}
                      {totalSubjectsInCycle === 1 ? 'materia' : 'materias'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isActiveCycle ? (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          dispatch({ type: 'SET_ACTIVE_CYCLE', payload: { cycleId: cycle.id } })
                        }
                      >
                        Seleccionar ciclo
                      </Button>
                    ) : null}

                    <Button
                      variant="secondary"
                      onClick={() => setModalState({ mode: 'create-semester', cycle })}
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      <span>Agregar semestre</span>
                    </Button>

                    <button
                      type="button"
                      onClick={() => setModalState({ mode: 'edit-cycle', cycle })}
                      aria-label={`Editar ciclo ${cycle.name}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalState({ mode: 'delete-cycle', cycle })}
                      aria-label={`Eliminar ciclo ${cycle.name}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  {semesters.length === 0 ? (
                    <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-sm text-slate-500">
                        Este ciclo aún no tiene semestres registrados.
                      </p>
                      <Button
                        variant="ghost"
                        onClick={() => setModalState({ mode: 'create-semester', cycle })}
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        <span>Crear primer semestre</span>
                      </Button>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100" aria-label={`Semestres de ${cycle.name}`}>
                      {semesters.map((semester) => {
                        const subjectCount = selectSubjectsBySemester(database, semester.id).length;
                        const isActiveSemester = activeSemester?.id === semester.id;

                        return (
                          <li
                            key={semester.id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                <span className="text-sm font-medium text-slate-900">
                                  {semester.name}
                                </span>
                                {isActiveSemester ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                    <span>Semestre activo</span>
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                                {subjectCount} {subjectCount === 1 ? 'materia' : 'materias'}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-1.5 shrink-0">
                              {!isActiveSemester ? (
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    dispatch({
                                      type: 'SET_ACTIVE_SEMESTER',
                                      payload: { semesterId: semester.id },
                                    })
                                  }
                                  className="flex-1 sm:flex-initial"
                                >
                                  Activar
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  onClick={onGoToDashboard}
                                  className="flex-1 sm:flex-initial justify-start sm:justify-center -ml-2 sm:ml-0"
                                >
                                  Ver en resumen
                                </Button>
                              )}

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setModalState({ mode: 'edit-semester', cycle, semester })
                                  }
                                  aria-label={`Editar ${semester.name}`}
                                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" aria-hidden="true" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setModalState({ mode: 'delete-semester', cycle, semester })
                                  }
                                  aria-label={`Eliminar ${semester.name}`}
                                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      {/* Crear ciclo */}
      <AdaptiveSheet
        open={modalState.mode === 'create-cycle'}
        onClose={closeModal}
        title="Nuevo ciclo escolar"
        description="Define un periodo escolar para agrupar tus semestres."
      >
        {modalState.mode === 'create-cycle' ? (
          <CycleForm
            existingNames={cycles.map((cycle) => cycle.name)}
            submitLabel="Crear ciclo"
            onSubmit={(name) => {
              dispatch({ type: 'CREATE_CYCLE', payload: { name } });
              closeModal();
            }}
            onCancel={closeModal}
          />
        ) : null}
      </AdaptiveSheet>

      {/* Editar ciclo */}
      <AdaptiveSheet
        open={modalState.mode === 'edit-cycle'}
        onClose={closeModal}
        title="Editar ciclo escolar"
        description="Los semestres y materias asociados se conservarán intactos."
      >
        {modalState.mode === 'edit-cycle' ? (
          <CycleForm
            initialName={modalState.cycle.name}
            existingNames={cycles
              .filter((cycle) => cycle.id !== modalState.cycle.id)
              .map((cycle) => cycle.name)}
            submitLabel="Guardar cambios"
            onSubmit={(name) => {
              dispatch({
                type: 'UPDATE_CYCLE',
                payload: { id: modalState.cycle.id, name },
              });
              closeModal();
            }}
            onCancel={closeModal}
          />
        ) : null}
      </AdaptiveSheet>

      {/* Confirmar eliminación de ciclo */}
      <AdaptiveSheet
        open={modalState.mode === 'delete-cycle'}
        onClose={closeModal}
        title="Eliminar ciclo escolar"
        description={
          modalState.mode === 'delete-cycle'
            ? `Estás por eliminar "${modalState.cycle.name}".`
            : undefined
        }
        footer={
          modalState.mode === 'delete-cycle' ? (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <Button variant="secondary" onClick={closeModal} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="lg"
                onClick={() => {
                  dispatch({
                    type: 'DELETE_CYCLE',
                    payload: { id: modalState.cycle.id },
                  });
                  closeModal();
                }}
                className="w-full sm:w-auto"
              >
                Eliminar ciclo
              </Button>
            </div>
          ) : null
        }
      >
        {modalState.mode === 'delete-cycle' && cycleImpact ? (
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            {cycleImpact.semesterCount > 0 ||
            cycleImpact.subjectCount > 0 ||
            cycleImpact.evaluationCount > 0 ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-1.5">
                <p className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Este ciclo contiene información registrada</span>
                </p>
                <p>
                  Al confirmarlo se eliminarán de forma permanente:{' '}
                  <span className="font-mono font-semibold tabular-nums">
                    {cycleImpact.semesterCount}
                  </span>{' '}
                  {cycleImpact.semesterCount === 1 ? 'semestre' : 'semestres'},{' '}
                  <span className="font-mono font-semibold tabular-nums">
                    {cycleImpact.subjectCount}
                  </span>{' '}
                  {cycleImpact.subjectCount === 1 ? 'materia' : 'materias'} y{' '}
                  <span className="font-mono font-semibold tabular-nums">
                    {cycleImpact.evaluationCount}
                  </span>{' '}
                  {cycleImpact.evaluationCount === 1 ? 'evaluación' : 'evaluaciones'}.
                </p>
              </div>
            ) : (
              <p>Este ciclo está vacío. ¿Confirmas que deseas eliminarlo?</p>
            )}
          </div>
        ) : null}
      </AdaptiveSheet>

      {/* Crear semestre */}
      <AdaptiveSheet
        open={modalState.mode === 'create-semester'}
        onClose={closeModal}
        title="Agregar semestre"
      >
        {modalState.mode === 'create-semester' ? (
          <SemesterForm
            cycleName={modalState.cycle.name}
            existingNamesInCycle={selectSemestersByCycle(database, modalState.cycle.id).map(
              (semester) => semester.name,
            )}
            submitLabel="Crear semestre"
            onSubmit={(name) => {
              dispatch({
                type: 'CREATE_SEMESTER',
                payload: { cycleId: modalState.cycle.id, name },
              });
              closeModal();
            }}
            onCancel={closeModal}
          />
        ) : null}
      </AdaptiveSheet>

      {/* Editar semestre */}
      <AdaptiveSheet
        open={modalState.mode === 'edit-semester'}
        onClose={closeModal}
        title="Editar semestre"
        description="Las materias dentro de este semestre no se verán afectadas."
      >
        {modalState.mode === 'edit-semester' ? (
          <SemesterForm
            cycleName={modalState.cycle.name}
            initialName={modalState.semester.name}
            existingNamesInCycle={selectSemestersByCycle(database, modalState.cycle.id)
              .filter((semester) => semester.id !== modalState.semester.id)
              .map((semester) => semester.name)}
            submitLabel="Guardar cambios"
            onSubmit={(name) => {
              dispatch({
                type: 'UPDATE_SEMESTER',
                payload: { id: modalState.semester.id, name },
              });
              closeModal();
            }}
            onCancel={closeModal}
          />
        ) : null}
      </AdaptiveSheet>

      {/* Confirmar eliminación de semestre */}
      <AdaptiveSheet
        open={modalState.mode === 'delete-semester'}
        onClose={closeModal}
        title="Eliminar semestre"
        description={
          modalState.mode === 'delete-semester'
            ? `Estás por eliminar "${modalState.semester.name}" del ciclo "${modalState.cycle.name}".`
            : undefined
        }
        footer={
          modalState.mode === 'delete-semester' ? (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <Button variant="secondary" onClick={closeModal} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="lg"
                onClick={() => {
                  dispatch({
                    type: 'DELETE_SEMESTER',
                    payload: { id: modalState.semester.id },
                  });
                  closeModal();
                }}
                className="w-full sm:w-auto"
              >
                Eliminar semestre
              </Button>
            </div>
          ) : null
        }
      >
        {modalState.mode === 'delete-semester' && semesterImpact ? (
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            {semesterImpact.subjectCount > 0 || semesterImpact.evaluationCount > 0 ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-1.5">
                <p className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Este semestre contiene información registrada</span>
                </p>
                <p>
                  Al confirmarlo se eliminarán de forma permanente:{' '}
                  <span className="font-mono font-semibold tabular-nums">
                    {semesterImpact.subjectCount}
                  </span>{' '}
                  {semesterImpact.subjectCount === 1 ? 'materia' : 'materias'} y{' '}
                  <span className="font-mono font-semibold tabular-nums">
                    {semesterImpact.evaluationCount}
                  </span>{' '}
                  {semesterImpact.evaluationCount === 1 ? 'evaluación' : 'evaluaciones'}.
                </p>
              </div>
            ) : (
              <p>Este semestre no contiene materias. ¿Confirmas que deseas eliminarlo?</p>
            )}
          </div>
        ) : null}
      </AdaptiveSheet>
    </div>
  );
}
