import { useMemo } from 'react';
import { BookOpen, CalendarRange, ChevronRight, Target } from 'lucide-react';
import { calculateSubjectAcademicReport } from '../../domain/calculations';
import { useAcademicStore } from '../../hooks/useAcademicStore';
import {
  selectActiveCycle,
  selectActiveSemester,
  selectCategoriesBySubject,
  selectEvaluationsBySubject,
  selectSubjectsBySemester,
} from '../../state/selectors';
import type { EntityId } from '../../types/academic';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { GradeStatusLabel } from '../ui/GradeStatusLabel';
import { getProjectionHeadline } from './SubjectProjectionTab';

interface SimulatorOverviewProps {
  onOpenSubjectProjection: (subjectId: EntityId) => void;
  onOpenSemesters: () => void;
  onOpenSubjects: () => void;
}

export function SimulatorOverview({
  onOpenSubjectProjection,
  onOpenSemesters,
  onOpenSubjects,
}: SimulatorOverviewProps) {
  const { database } = useAcademicStore();

  const activeCycle = useMemo(() => selectActiveCycle(database), [database]);
  const activeSemester = useMemo(() => selectActiveSemester(database), [database]);

  const subjectReports = useMemo(() => {
    if (!activeSemester) {
      return [];
    }

    const subjects = selectSubjectsBySemester(database, activeSemester.id);
    return subjects.map((subject) => {
      const categories = selectCategoriesBySubject(database, subject.id);
      const evaluations = selectEvaluationsBySubject(database, subject.id);
      const report = calculateSubjectAcademicReport(
        subject,
        evaluations,
        categories,
        database.settings.yellowZone,
      );
      return { subject, report };
    });
  }, [database, activeSemester]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        {activeCycle ? (
          <p className="text-sm text-slate-600">
            {activeCycle.name}
            {activeSemester ? ` · ${activeSemester.name}` : ' · Sin semestre activo'}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          ¿Cuánto necesito? y proyecciones
        </h1>
        <p className="text-sm text-slate-600">
          Selecciona una materia para ver el desglose completo de puntos restantes y su proyección de desempeño.
        </p>
      </header>

      {!activeCycle || !activeSemester ? (
        <EmptyState
          icon={<CalendarRange className="w-6 h-6" aria-hidden="true" />}
          title="Selecciona o crea un semestre primero"
          description="Para analizar cuánto necesitas para aprobar primero crea o activa un ciclo y un semestre."
          action={
            <Button size="lg" onClick={onOpenSemesters}>
              Ir a ciclos y semestres
            </Button>
          }
        />
      ) : subjectReports.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" aria-hidden="true" />}
          title={`Sin materias en ${activeSemester.name}`}
          description="Agrega tus materias y evaluaciones para calcular cuánto necesitas para aprobar."
          action={
            <Button size="lg" onClick={onOpenSubjects}>
              Ir a materias
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjectReports.map(({ subject, report }) => (
            <button
              key={subject.id}
              type="button"
              onClick={() => onOpenSubjectProjection(subject.id)}
              className={[
                'w-full text-left bg-white border border-slate-200 rounded-2xl p-4 sm:p-5',
                'hover:border-slate-300 hover:shadow-sm active:scale-[0.99]',
                'transition-all duration-150 cursor-pointer',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
                    {subject.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                    Actual: {report.equivalentGrade} / {subject.gradingScale.maxGrade} · Mín:{' '}
                    {subject.gradingScale.minPassingGrade}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <GradeStatusLabel status={report.status} />
                  <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex items-start gap-2">
                <Target className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-slate-900 leading-snug">
                    {getProjectionHeadline(report)}
                  </p>
                  <p className="text-xs text-slate-500 font-mono tabular-nums">
                    {report.projectedGrade !== null
                      ? `Proyección: ${report.projectedGrade} / ${subject.gradingScale.maxGrade}`
                      : 'Sin calificaciones registradas'}
                    {' · '}
                    Máximo posible: {report.maxPossibleGrade} / {subject.gradingScale.maxGrade}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
