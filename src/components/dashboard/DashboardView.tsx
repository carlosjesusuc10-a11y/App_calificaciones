import { useMemo, useState } from 'react';
import { BookOpen, CalendarRange, CheckCircle2, Plus } from 'lucide-react';
import { useAcademicStore } from '../../hooks/useAcademicStore';
import {
  selectActiveCycle,
  selectActiveSemester,
  selectOrderedCycles,
  selectSemesterDashboardSummary,
  selectSemestersByCycle,
  selectSubjectCardViewModels,
  selectSubjectsBySemester,
} from '../../state/selectors';
import type { EntityId, GradeStatus } from '../../types/academic';
import { SubjectForm, type SubjectFormValues } from '../forms/SubjectForm';
import { AdaptiveSheet } from '../layout/AdaptiveSheet';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { DashboardHeader } from './DashboardHeader';
import { SemesterSummary } from './SemesterSummary';
import { SubjectCard } from './SubjectCard';

type StatusFilter = 'all' | GradeStatus;

interface DashboardViewProps {
  onOpenSemesters: () => void;
  onOpenSettings: () => void;
  onSelectSubject: (subjectId: EntityId) => void;
}

const FILTER_OPTIONS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'green', label: 'Aprobadas' },
  { id: 'yellow', label: 'En riesgo' },
  { id: 'red', label: 'Reprobadas' },
];

export function DashboardView({
  onOpenSemesters,
  onOpenSettings,
  onSelectSubject,
}: DashboardViewProps) {
  const { database, dispatch } = useAcademicStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  const cycles = useMemo(() => selectOrderedCycles(database), [database]);
  const activeCycle = useMemo(() => selectActiveCycle(database), [database]);
  const activeSemester = useMemo(() => selectActiveSemester(database), [database]);

  const summary = useMemo(
    () => selectSemesterDashboardSummary(database, activeSemester?.id ?? null),
    [database, activeSemester],
  );

  const subjectCards = useMemo(
    () => selectSubjectCardViewModels(database, activeSemester?.id ?? null),
    [database, activeSemester],
  );

  const existingSubjectNames = useMemo(
    () =>
      selectSubjectsBySemester(database, activeSemester?.id ?? null).map(
        (subject) => subject.name,
      ),
    [database, activeSemester],
  );

  const filteredSubjects = useMemo(() => {
    if (statusFilter === 'all') {
      return subjectCards;
    }
    return subjectCards.filter((subject) => subject.status === statusFilter);
  }, [subjectCards, statusFilter]);

  const handleCreateSubject = (values: SubjectFormValues) => {
    if (!activeSemester) {
      return;
    }

    dispatch({
      type: 'CREATE_SUBJECT',
      payload: {
        semesterId: activeSemester.id,
        ...values,
      },
    });
    setIsAddSheetOpen(false);
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        cycleName={activeCycle?.name ?? null}
        semesterName={activeSemester?.name ?? null}
        canSwitchContext={cycles.length > 0}
        onSwitchContext={() => setIsSwitcherOpen(true)}
        onAddSubject={() => setIsAddSheetOpen(true)}
        onOpenSemesters={onOpenSemesters}
        onOpenSettings={onOpenSettings}
      />

      {!activeCycle ? (
        <EmptyState
          icon={<CalendarRange className="w-6 h-6" aria-hidden="true" />}
          title="Comienza creando un ciclo escolar"
          description="Para organizar tus semestres y materias primero registra un ciclo escolar, por ejemplo 2026-2027."
          action={
            <Button size="lg" onClick={onOpenSemesters}>
              <Plus className="w-5 h-5" aria-hidden="true" />
              <span>Ir a ciclos y semestres</span>
            </Button>
          }
        />
      ) : !activeSemester ? (
        <EmptyState
          icon={<CalendarRange className="w-6 h-6" aria-hidden="true" />}
          title={`El ciclo ${activeCycle.name} aún no tiene semestres`}
          description="Agrega al menos un semestre dentro de este ciclo para comenzar a registrar tus materias."
          action={
            <Button size="lg" onClick={onOpenSemesters}>
              <Plus className="w-5 h-5" aria-hidden="true" />
              <span>Agregar semestre</span>
            </Button>
          }
        />
      ) : (
        <>
          <SemesterSummary summary={summary} />

          <section aria-labelledby="subjects-heading" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <h2 id="subjects-heading" className="text-lg font-semibold text-slate-900">
                  Materias
                </h2>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {filteredSubjects.length} de {subjectCards.length}
                </span>
              </div>

              {subjectCards.length > 0 ? (
                <div
                  role="group"
                  aria-label="Filtrar materias por estado"
                  className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar snap-x scroll-px-1"
                >
                  {FILTER_OPTIONS.map((option) => {
                    const isActive = statusFilter === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setStatusFilter(option.id)}
                        className={[
                          'min-h-[44px] sm:min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 snap-start transition-colors cursor-pointer',
                          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700',
                          isActive
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900',
                        ].join(' ')}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {subjectCards.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="w-6 h-6" aria-hidden="true" />}
                title={`Sin materias en ${activeSemester.name}`}
                description="Agrega tus materias con su docente, calificación mínima, máxima y sistema de evaluación independiente."
                action={
                  <Button size="lg" onClick={() => setIsAddSheetOpen(true)}>
                    <Plus className="w-5 h-5" aria-hidden="true" />
                    <span>Crear primera materia</span>
                  </Button>
                }
              />
            ) : filteredSubjects.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="w-6 h-6" aria-hidden="true" />}
                title="Sin materias en este filtro"
                description="No hay materias con el estado seleccionado en este semestre."
                action={
                  <Button variant="secondary" onClick={() => setStatusFilter('all')}>
                    Mostrar todas las materias
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSubjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    onSelect={(item) => onSelectSubject(item.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Selector rápido de ciclo y semestre */}
      <AdaptiveSheet
        open={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        title="Cambiar ciclo o semestre"
        description="Selecciona el periodo que deseas visualizar en el panel."
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2.5">
            <Button
              variant="secondary"
              onClick={() => {
                setIsSwitcherOpen(false);
                onOpenSemesters();
              }}
              className="w-full sm:w-auto"
            >
              Administrar ciclos
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsSwitcherOpen(false)}
              className="w-full sm:w-auto"
            >
              Cerrar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {cycles.map((cycle) => {
            const semesters = selectSemestersByCycle(database, cycle.id);
            const isCurrentCycle = activeCycle?.id === cycle.id;

            return (
              <div
                key={cycle.id}
                className="space-y-2 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0"
              >
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'SET_ACTIVE_CYCLE', payload: { cycleId: cycle.id } });
                    if (semesters.length === 0) {
                      setIsSwitcherOpen(false);
                    }
                  }}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-semibold text-slate-900">{cycle.name}</span>
                  {isCurrentCycle ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      <span>Activo</span>
                    </span>
                  ) : null}
                </button>

                {semesters.length > 0 ? (
                  <div className="pl-4 space-y-1">
                    {semesters.map((semester) => {
                      const isCurrentSemester = activeSemester?.id === semester.id;
                      return (
                        <button
                          key={semester.id}
                          type="button"
                          onClick={() => {
                            dispatch({
                              type: 'SET_ACTIVE_SEMESTER',
                              payload: { semesterId: semester.id },
                            });
                            setIsSwitcherOpen(false);
                          }}
                          className={[
                            'w-full min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-left text-sm transition-colors cursor-pointer',
                            isCurrentSemester
                              ? 'bg-blue-50 text-blue-800 font-medium'
                              : 'text-slate-700 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <span>{semester.name}</span>
                          {isCurrentSemester ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="pl-7 text-xs text-slate-500">Sin semestres en este ciclo</p>
                )}
              </div>
            );
          })}
        </div>
      </AdaptiveSheet>

      {/* Creación de materia desde el Dashboard */}
      <AdaptiveSheet
        open={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        title="Agregar materia"
        description={
          activeCycle && activeSemester
            ? `${activeCycle.name} · ${activeSemester.name}`
            : 'Primero selecciona o crea un ciclo y un semestre.'
        }
        footer={
          !activeCycle || !activeSemester ? (
            <div className="flex justify-end gap-2.5">
              <Button variant="secondary" onClick={() => setIsAddSheetOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setIsAddSheetOpen(false);
                  onOpenSemesters();
                }}
              >
                Ir a ciclos y semestres
              </Button>
            </div>
          ) : undefined
        }
      >
        {activeCycle && activeSemester ? (
          <SubjectForm
            initialValues={{
              name: '',
              teacher: '',
              gradingScale: database.settings.defaultScale,
              evaluationSystem: database.settings.defaultEvaluationSystem,
              additionalInfo: '',
            }}
            existingNamesInSemester={existingSubjectNames}
            submitLabel="Crear materia"
            onSubmit={handleCreateSubject}
            onCancel={() => setIsAddSheetOpen(false)}
          />
        ) : (
          <p className="text-sm text-slate-600 leading-relaxed">
            Necesitas tener un ciclo escolar y un semestre activos antes de poder registrar materias.
          </p>
        )}
      </AdaptiveSheet>
    </div>
  );
}
