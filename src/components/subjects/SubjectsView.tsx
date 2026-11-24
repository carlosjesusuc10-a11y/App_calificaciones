import { useMemo, useState } from 'react';
import { BookOpen, CalendarRange, Plus } from 'lucide-react';
import { useAcademicStore } from '../../hooks/useAcademicStore';
import {
  selectActiveCycle,
  selectActiveSemester,
  selectSubjectById,
  selectSubjectCardViewModels,
  selectSubjectsBySemester,
} from '../../state/selectors';
import type { EntityId } from '../../types/academic';
import { SubjectCard } from '../dashboard/SubjectCard';
import { SubjectForm, type SubjectFormValues } from '../forms/SubjectForm';
import { AdaptiveSheet } from '../layout/AdaptiveSheet';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { SubjectDetailView, type SubjectDetailTab } from './SubjectDetailView';

interface SubjectsViewProps {
  selectedSubjectId: EntityId | null;
  selectedSubjectTab?: SubjectDetailTab;
  onSelectSubject: (subjectId: EntityId) => void;
  onCloseSubjectDetail: () => void;
  onOpenSemesters: () => void;
}

export function SubjectsView({
  selectedSubjectId,
  selectedSubjectTab = 'summary',
  onSelectSubject,
  onCloseSubjectDetail,
  onOpenSemesters,
}: SubjectsViewProps) {
  const { database, dispatch } = useAcademicStore();
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

  const activeCycle = useMemo(() => selectActiveCycle(database), [database]);
  const activeSemester = useMemo(() => selectActiveSemester(database), [database]);
  const selectedSubject = useMemo(
    () => selectSubjectById(database, selectedSubjectId),
    [database, selectedSubjectId],
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

  if (selectedSubject) {
    const parentSemester = database.entities.semesters[selectedSubject.semesterId];
    const parentCycle = parentSemester
      ? database.entities.cycles[parentSemester.cycleId]
      : undefined;

    return (
      <SubjectDetailView
        key={`${selectedSubject.id}-${selectedSubjectTab}`}
        subject={selectedSubject}
        cycleName={parentCycle?.name ?? null}
        semesterName={parentSemester?.name ?? null}
        initialTab={selectedSubjectTab}
        onBack={onCloseSubjectDetail}
        onDeleted={onCloseSubjectDetail}
      />
    );
  }

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
    setIsCreateSheetOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          {activeCycle ? (
            <p className="text-sm text-slate-600">
              {activeCycle.name}
              {activeSemester ? ` · ${activeSemester.name}` : ' · Sin semestre activo'}
            </p>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Materias</h1>
        </div>

        {activeCycle && activeSemester ? (
          <Button
            size="lg"
            onClick={() => setIsCreateSheetOpen(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            <span>Agregar materia</span>
          </Button>
        ) : null}
      </header>

      {!activeCycle || !activeSemester ? (
        <EmptyState
          icon={<CalendarRange className="w-6 h-6" aria-hidden="true" />}
          title="Selecciona o crea un semestre primero"
          description="Las materias pertenecen a un semestre dentro de un ciclo escolar. Crea o activa un semestre para empezar."
          action={
            <Button size="lg" onClick={onOpenSemesters}>
              Ir a ciclos y semestres
            </Button>
          }
        />
      ) : subjectCards.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" aria-hidden="true" />}
          title={`Sin materias en ${activeSemester.name}`}
          description="Registra tus materias con su propio docente, escala de calificación y sistema de evaluación independiente."
          action={
            <Button size="lg" onClick={() => setIsCreateSheetOpen(true)}>
              <Plus className="w-5 h-5" aria-hidden="true" />
              <span>Crear primera materia</span>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectCards.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onSelect={(item) => onSelectSubject(item.id)}
            />
          ))}
        </div>
      )}

      <AdaptiveSheet
        open={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        title="Nueva materia"
        description={
          activeCycle && activeSemester
            ? `${activeCycle.name} · ${activeSemester.name}`
            : undefined
        }
      >
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
          onCancel={() => setIsCreateSheetOpen(false)}
        />
      </AdaptiveSheet>
    </div>
  );
}
