import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Pencil,
  Target,
  Trash2,
} from 'lucide-react';
import { calculateSubjectAcademicReport } from '../../domain/calculations';
import { useAcademicStore } from '../../hooks/useAcademicStore';
import {
  selectCategoriesBySubject,
  selectEvaluationsBySubject,
  selectSubjectDeletionImpact,
  selectSubjectsBySemester,
} from '../../state/selectors';
import type { Subject } from '../../types/academic';
import { CategoryBreakdownChart } from '../charts/CategoryBreakdownChart';
import { ProgressBar } from '../charts/ProgressBar';
import { ScoreRing } from '../charts/ScoreRing';
import { SubjectForm, type SubjectFormValues } from '../forms/SubjectForm';
import { AdaptiveSheet } from '../layout/AdaptiveSheet';
import { Button } from '../ui/Button';
import { GradeStatusLabel } from '../ui/GradeStatusLabel';
import { SurfaceCard } from '../ui/SurfaceCard';
import { SubjectEvaluationsTab } from './SubjectEvaluationsTab';
import { getProjectionHeadline, SubjectProjectionTab } from './SubjectProjectionTab';

export type SubjectDetailTab =
  | 'summary'
  | 'evaluations'
  | 'progress'
  | 'projection'
  | 'settings';

interface SubjectDetailViewProps {
  subject: Subject;
  cycleName: string | null;
  semesterName: string | null;
  initialTab?: SubjectDetailTab;
  onBack: () => void;
  onDeleted: () => void;
}

const DETAIL_TABS: Array<{ id: SubjectDetailTab; label: string }> = [
  { id: 'summary', label: 'Resumen' },
  { id: 'evaluations', label: 'Evaluaciones' },
  { id: 'progress', label: 'Progreso' },
  { id: 'projection', label: 'Proyección' },
  { id: 'settings', label: 'Configuración' },
];

export function SubjectDetailView({
  subject,
  cycleName,
  semesterName,
  initialTab = 'summary',
  onBack,
  onDeleted,
}: SubjectDetailViewProps) {
  const { database, dispatch } = useAcademicStore();
  const [activeTab, setActiveTab] = useState<SubjectDetailTab>(initialTab);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const categories = useMemo(
    () => selectCategoriesBySubject(database, subject.id),
    [database, subject.id],
  );

  const evaluations = useMemo(
    () => selectEvaluationsBySubject(database, subject.id),
    [database, subject.id],
  );

  const report = useMemo(
    () =>
      calculateSubjectAcademicReport(
        subject,
        evaluations,
        categories,
        database.settings.yellowZone,
      ),
    [subject, evaluations, categories, database.settings.yellowZone],
  );

  const passingThresholdPercent =
    subject.gradingScale.maxGrade > 0
      ? (subject.gradingScale.minPassingGrade / subject.gradingScale.maxGrade) * 100
      : undefined;
  const pointsUnit = report.evaluationSystem === 'percentage' ? '%' : 'pts';

  const deletionImpact = useMemo(
    () => selectSubjectDeletionImpact(database, subject.id),
    [database, subject.id],
  );

  const siblingNames = useMemo(
    () =>
      selectSubjectsBySemester(database, subject.semesterId)
        .filter((item) => item.id !== subject.id)
        .map((item) => item.name),
    [database, subject.semesterId, subject.id],
  );

  const handleUpdateSubject = (values: SubjectFormValues) => {
    dispatch({
      type: 'UPDATE_SUBJECT',
      payload: {
        id: subject.id,
        ...values,
      },
    });
    setIsEditSheetOpen(false);
    setSavedNotice(true);
  };

  const handleConfirmDelete = () => {
    dispatch({ type: 'DELETE_SUBJECT', payload: { id: subject.id } });
    setIsDeleteSheetOpen(false);
    onDeleted();
  };

  const systemLabel =
    subject.evaluationSystem === 'points' ? 'Por puntos' : 'Por porcentajes';

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={onBack} className="-ml-2">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Volver</span>
          </Button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSavedNotice(false);
                setIsEditSheetOpen(true);
              }}
              aria-label={`Editar ${subject.name}`}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteSheetOpen(true)}
              aria-label={`Eliminar ${subject.name}`}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          {cycleName || semesterName ? (
            <p className="text-xs text-slate-500">
              {[cycleName, semesterName].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            {subject.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
            <span>{subject.teacher}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Escala {subject.gradingScale.maxGrade} (mín. {subject.gradingScale.minPassingGrade})
            </span>
            <span aria-hidden="true">·</span>
            <span>{systemLabel}</span>
          </div>
        </div>

        <nav
          aria-label="Secciones de la materia"
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar snap-x scroll-px-1"
        >
          {DETAIL_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={(event) => {
                  setSavedNotice(false);
                  setActiveTab(tab.id);
                  event.currentTarget.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'center',
                    block: 'nearest',
                  });
                }}
                className={[
                  'min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap shrink-0 snap-start transition-colors cursor-pointer',
                  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700',
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900',
                ].join(' ')}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 1. Resumen */}
      {activeTab === 'summary' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <SurfaceCard className="lg:col-span-2">
            <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-4 min-w-0">
                <ScoreRing
                  percentage={report.currentPercentage}
                  status={report.status}
                  label={`Porcentaje actual de ${subject.name}`}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">Calificación actual</p>
                  <p className="mt-0.5 flex items-baseline gap-1.5 font-mono tabular-nums">
                    <span className="text-3xl sm:text-4xl font-bold text-slate-900">
                      {report.equivalentGrade}
                    </span>
                    <span className="text-base text-slate-500">
                      / {subject.gradingScale.maxGrade}
                    </span>
                  </p>
                  <div className="mt-1">
                    <GradeStatusLabel status={report.status} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-slate-600 font-mono tabular-nums">
                <span>Acumulado: {report.currentPercentage}%</span>
                <span>
                  Mínimo: {subject.gradingScale.minPassingGrade} / {subject.gradingScale.maxGrade}
                </span>
              </div>
              <ProgressBar
                value={report.currentPercentage}
                status={report.status}
                passingThresholdPercent={passingThresholdPercent}
                heightClassName="h-2.5"
                label={`Calificación de ${subject.name}: ${report.currentPercentage}%`}
              />
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 pt-5 mt-5 border-t border-slate-100 text-sm">
              <div>
                <dt className="text-slate-500 text-xs">Porcentaje actual</dt>
                <dd className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
                  {report.currentPercentage}%
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Puntos obtenidos</dt>
                <dd className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
                  {report.obtainedPoints} / {report.totalPossiblePoints} {pointsUnit}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Avance evaluado</dt>
                <dd className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
                  {report.progressPercent}%
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Evaluaciones</dt>
                <dd className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
                  {report.gradedCount} cal. · {report.pendingCount} pend.
                </dd>
              </div>
            </dl>

            <div className="pt-4 mt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <Target className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">¿Cuánto necesito?</p>
                  <p className="text-sm font-medium text-slate-900 leading-snug">
                    {getProjectionHeadline(report)}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setActiveTab('projection')}
                className="shrink-0"
              >
                Ver proyección
              </Button>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <h2 className="text-base font-semibold text-slate-900">Descripción</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {subject.additionalInfo
                ? subject.additionalInfo
                : 'Sin descripción adicional registrada para esta materia.'}
            </p>
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2">
              <Button fullWidth onClick={() => setActiveTab('evaluations')}>
                Ir a evaluaciones
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setActiveTab('settings')}
              >
                Configurar materia
              </Button>
            </div>
          </SurfaceCard>
        </div>
      ) : null}

      {/* 2. Evaluaciones */}
      {activeTab === 'evaluations' ? (
        <SubjectEvaluationsTab subject={subject} />
      ) : null}

      {/* 3. Progreso */}
      {activeTab === 'progress' ? (
        <div className="space-y-5">
          <SurfaceCard>
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-slate-500" aria-hidden="true" />
                <h2 className="text-base font-semibold text-slate-900">Progreso de la materia</h2>
              </div>
              <GradeStatusLabel status={report.status} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-5 border-b border-slate-100">
              <ScoreRing
                percentage={report.currentPercentage}
                status={report.status}
                label={`Calificación acumulada de ${subject.name}`}
                size="lg"
              />

              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-500">Calificación y porcentaje actual</p>
                    <p className="mt-0.5 font-mono tabular-nums">
                      <span className="text-2xl font-bold text-slate-900">
                        {report.equivalentGrade}
                      </span>
                      <span className="text-sm text-slate-500">
                        {' '}/ {subject.gradingScale.maxGrade}
                      </span>
                      <span className="text-slate-400"> · </span>
                      <span className="text-base font-semibold text-slate-700">
                        {report.currentPercentage}%
                      </span>
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 font-mono tabular-nums">
                    Mínima: {subject.gradingScale.minPassingGrade} ({Math.round(passingThresholdPercent ?? 0)}%)
                  </p>
                </div>

                <ProgressBar
                  value={report.currentPercentage}
                  status={report.status}
                  passingThresholdPercent={passingThresholdPercent}
                  heightClassName="h-2.5"
                  label={`Calificación acumulada de ${subject.name}: ${report.currentPercentage}%`}
                />

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Avance de evaluaciones calificadas</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {report.progressPercent}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Avance evaluado de ${subject.name}`}
                    aria-valuenow={report.progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden"
                  >
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-200"
                      style={{ width: `${Math.min(100, Math.max(0, report.progressPercent))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Puntos obtenidos</dt>
                <dd className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
                  {report.obtainedPoints} {pointsUnit}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Puntos posibles</dt>
                <dd className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
                  {report.totalPossiblePoints} {pointsUnit}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Puntos restantes</dt>
                <dd className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
                  {report.remainingPoints} {pointsUnit}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Rendimiento en evaluadas</dt>
                <dd className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
                  {report.gradedPerformancePercentage !== null
                    ? `${report.gradedPerformancePercentage}%`
                    : '—'}
                </dd>
              </div>
            </dl>
          </SurfaceCard>

          <SurfaceCard>
            <div className="pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Desglose por categoría</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparativa entre puntaje obtenido y total configurado por categoría.
              </p>
            </div>
            <CategoryBreakdownChart
              breakdowns={report.categoryBreakdowns}
              evaluationSystem={report.evaluationSystem}
              usesWeightedCategories={report.usesWeightedCategories}
            />
          </SurfaceCard>
        </div>
      ) : null}

      {/* 4. Proyección */}
      {activeTab === 'projection' ? (
        <SubjectProjectionTab
          subject={subject}
          report={report}
          categories={categories}
          evaluations={evaluations}
          onGoToEvaluations={() => setActiveTab('evaluations')}
        />
      ) : null}

      {/* 5. Configuración independiente */}
      {activeTab === 'settings' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <SurfaceCard className="lg:col-span-2">
            <div className="pb-4 mb-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Configuración independiente
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Los cambios de escala o sistema solo afectan a esta materia.
                </p>
              </div>
              {savedNotice ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>Guardado</span>
                </span>
              ) : null}
            </div>

            <SubjectForm
              key={`${subject.id}-${subject.updatedAt}`}
              initialValues={{
                name: subject.name,
                teacher: subject.teacher,
                gradingScale: subject.gradingScale,
                evaluationSystem: subject.evaluationSystem,
                additionalInfo: subject.additionalInfo,
              }}
              existingNamesInSemester={siblingNames}
              submitLabel="Guardar configuración"
              onSubmit={handleUpdateSubject}
            />
          </SurfaceCard>

          <SurfaceCard>
            <h2 className="text-base font-semibold text-slate-900">Zona de eliminación</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Si eliminas esta materia se borrarán sus categorías y evaluaciones asociadas de este semestre.
            </p>
            <div className="mt-5">
              <Button
                variant="danger"
                fullWidth
                onClick={() => setIsDeleteSheetOpen(true)}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>Eliminar materia</span>
              </Button>
            </div>
          </SurfaceCard>
        </div>
      ) : null}

      <AdaptiveSheet
        open={isEditSheetOpen}
        onClose={() => setIsEditSheetOpen(false)}
        title="Editar materia"
        description="Modifica los datos generales, escala o sistema de evaluación."
      >
        <SubjectForm
          initialValues={{
            name: subject.name,
            teacher: subject.teacher,
            gradingScale: subject.gradingScale,
            evaluationSystem: subject.evaluationSystem,
            additionalInfo: subject.additionalInfo,
          }}
          existingNamesInSemester={siblingNames}
          submitLabel="Guardar cambios"
          onSubmit={handleUpdateSubject}
          onCancel={() => setIsEditSheetOpen(false)}
        />
      </AdaptiveSheet>

      <AdaptiveSheet
        open={isDeleteSheetOpen}
        onClose={() => setIsDeleteSheetOpen(false)}
        title="Eliminar materia"
        description={`Estás por eliminar "${subject.name}".`}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteSheetOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={handleConfirmDelete}
              className="w-full sm:w-auto"
            >
              Confirmar eliminación
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
          {deletionImpact.evaluationCount > 0 ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-1.5">
              <p className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Esta materia contiene evaluaciones</span>
              </p>
              <p>
                Se eliminarán de forma permanente{' '}
                <span className="font-mono font-semibold tabular-nums">
                  {deletionImpact.evaluationCount}
                </span>{' '}
                {deletionImpact.evaluationCount === 1 ? 'evaluación' : 'evaluaciones'}.
              </p>
            </div>
          ) : (
            <p>
              ¿Confirmas que deseas eliminar esta materia y sus{' '}
              <span className="font-mono font-semibold tabular-nums">
                {deletionImpact.categoryCount}
              </span>{' '}
              categorías configuradas?
            </p>
          )}
        </div>
      </AdaptiveSheet>
    </div>
  );
}
