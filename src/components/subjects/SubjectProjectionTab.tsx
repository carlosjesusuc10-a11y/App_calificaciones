import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Info,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  convertPercentageToScale,
  roundAcademicValue,
  type SubjectAcademicReport,
} from '../../domain/calculations';
import type { Evaluation, Subject, SubjectCategory } from '../../types/academic';
import { Button } from '../ui/Button';
import { GradeStatusLabel } from '../ui/GradeStatusLabel';
import { SurfaceCard } from '../ui/SurfaceCard';

interface SubjectProjectionTabProps {
  subject: Subject;
  report: SubjectAcademicReport;
  categories: SubjectCategory[];
  evaluations: Evaluation[];
  onGoToEvaluations: () => void;
}

export function getProjectionHeadline(report: SubjectAcademicReport): string {
  switch (report.passOutcome) {
    case 'already_passed':
      return 'Ya alcanzaste la calificación mínima.';
    case 'mathematically_impossible':
      return 'No es posible alcanzar la calificación mínima con los puntos restantes.';
    case 'achievable':
      if (report.evaluationSystem === 'percentage') {
        return `Necesitas obtener al menos ${report.pointsNeededToPass} de los ${report.remainingPoints} puntos porcentuales restantes para aprobar.`;
      }
      return `Necesitas obtener al menos ${report.pointsNeededToPass} de los ${report.remainingPoints} puntos restantes para aprobar.`;
    case 'no_evaluations':
    default:
      return 'Agrega evaluaciones para calcular cuánto necesitas para aprobar.';
  }
}

export function SubjectProjectionTab({
  subject,
  report,
  categories,
  evaluations,
  onGoToEvaluations,
}: SubjectProjectionTabProps) {
  const { maxGrade, minPassingGrade } = subject.gradingScale;
  const passingThresholdPercent =
    maxGrade > 0 ? roundAcademicValue((minPassingGrade / maxGrade) * 100) : 0;
  const pointsUnit = report.evaluationSystem === 'percentage' ? '%' : 'pts';
  const headline = getProjectionHeadline(report);

  const pendingEvaluations = evaluations.filter((item) => item.status === 'pending');
  const categoryNameById = new Map(categories.map((cat) => [cat.id, cat.name]));

  const performanceScaleEquivalent =
    report.gradedPerformancePercentage !== null
      ? roundAcademicValue(
          convertPercentageToScale(report.gradedPerformancePercentage, subject.gradingScale),
        )
      : null;

  // Segmentos para la barra visual de "¿Cuánto necesito?" (0–100%)
  const currentPercentClamped = Math.min(100, Math.max(0, report.currentPercentage));
  const maxPossibleClamped = Math.min(
    100,
    Math.max(currentPercentClamped, report.maxPossiblePercentage),
  );
  const neededDeltaPercent =
    report.passOutcome === 'achievable'
      ? Math.max(
          0,
          Math.min(
            maxPossibleClamped - currentPercentClamped,
            passingThresholdPercent - currentPercentClamped,
          ),
        )
      : 0;
  const extraPotentialPercent = Math.max(
    0,
    maxPossibleClamped - currentPercentClamped - neededDeltaPercent,
  );

  const currentFillClass =
    report.passOutcome === 'already_passed'
      ? 'bg-emerald-600'
      : report.passOutcome === 'mathematically_impossible'
        ? 'bg-red-600'
        : 'bg-blue-600';

  const projectedFillClass =
    report.projectedStatus === 'green'
      ? 'bg-emerald-600'
      : report.projectedStatus === 'yellow'
        ? 'bg-amber-500'
        : report.projectedStatus === 'red'
          ? 'bg-red-600'
          : 'bg-slate-400';

  if (report.passOutcome === 'no_evaluations') {
    return (
      <SurfaceCard>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">
              Proyección y cálculo "¿Cuánto necesito?"
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Se necesitan más calificaciones para generar una proyección confiable.
            </p>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              Mínima configurada: {minPassingGrade} / {maxGrade} ({passingThresholdPercent}%)
            </p>
            <div className="pt-2">
              <Button onClick={onGoToEvaluations}>
                <ClipboardList className="w-4 h-4" aria-hidden="true" />
                <span>Registrar evaluaciones</span>
              </Button>
            </div>
          </div>
        </div>
      </SurfaceCard>
    );
  }

  const VerdictIcon =
    report.passOutcome === 'already_passed'
      ? CheckCircle2
      : report.passOutcome === 'mathematically_impossible'
        ? AlertOctagon
        : Target;

  const verdictIconWrapClass =
    report.passOutcome === 'already_passed'
      ? 'bg-emerald-50 text-emerald-700'
      : report.passOutcome === 'mathematically_impossible'
        ? 'bg-red-50 text-red-700'
        : 'bg-blue-50 text-blue-700';

  const comparisonRows = [
    {
      label: 'Calificación actual',
      percent: report.currentPercentage,
      display: `${report.equivalentGrade} / ${maxGrade}`,
      barClass: currentFillClass,
    },
    ...(report.projectedPercentage !== null && report.projectedGrade !== null
      ? [
          {
            label: report.isProjectionReliable
              ? 'Calificación proyectada'
              : 'Proyección preliminar',
            percent: report.projectedPercentage,
            display: `${report.projectedGrade} / ${maxGrade}`,
            barClass: projectedFillClass,
          },
        ]
      : []),
    {
      label: 'Mejor resultado posible',
      percent: report.maxPossiblePercentage,
      display: `${report.maxPossibleGrade} / ${maxGrade}`,
      barClass: 'bg-slate-700',
    },
  ];

  return (
    <div className="space-y-5">
      {/* 1. Proyección académica basada en rendimiento actual */}
      <SurfaceCard>
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                Proyección académica
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Proyección basada en tu rendimiento actual.
              </p>
            </div>
          </div>

          {report.projectedStatus ? <GradeStatusLabel status={report.projectedStatus} /> : null}
        </div>

        {/* Aviso cuando hay muy pocas evaluaciones */}
        {!report.isProjectionReliable ? (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-0.5">
              <p className="font-semibold">
                Se necesitan más calificaciones para generar una proyección confiable.
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                {report.gradedCount === 0
                  ? 'Aún no hay evaluaciones calificadas; la proyección numérica aparecerá en cuanto registres al menos una calificación.'
                  : `Actualmente solo hay ${report.gradedCount} ${report.gradedCount === 1 ? 'evaluación calificada' : 'evaluaciones calificadas'} (${report.progressPercent}% del curso). Toma el valor mostrado únicamente como referencia preliminar.`}
              </p>
            </div>
          </div>
        ) : null}

        {/* 5 indicadores clave requeridos */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-5">
          <div className="pb-3 sm:pb-0 border-b sm:border-b-0 border-slate-100">
            <dt className="text-xs text-slate-500">Calificación actual</dt>
            <dd className="mt-1 font-mono tabular-nums">
              <span className="text-2xl font-bold text-slate-900">{report.equivalentGrade}</span>
              <span className="text-sm text-slate-500"> / {maxGrade}</span>
              <span className="block text-xs text-slate-500 mt-0.5">
                {report.currentPercentage}% acumulado
              </span>
            </dd>
          </div>

          <div className="pb-3 sm:pb-0 border-b sm:border-b-0 border-slate-100">
            <dt className="text-xs text-slate-500">Rendimiento promedio</dt>
            <dd className="mt-1 font-mono tabular-nums">
              <span className="text-2xl font-bold text-slate-900">
                {report.gradedPerformancePercentage !== null
                  ? `${report.gradedPerformancePercentage}%`
                  : '—'}
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
                {performanceScaleEquivalent !== null
                  ? `Equivalente a ${performanceScaleEquivalent} / ${maxGrade} en lo calificado`
                  : 'Sin evaluaciones calificadas aún'}
              </span>
            </dd>
          </div>

          <div className="pb-3 sm:pb-0 border-b sm:border-b-0 border-slate-100">
            <dt className="text-xs text-slate-500">
              {report.isProjectionReliable
                ? 'Calificación proyectada'
                : 'Calificación proyectada (preliminar)'}
            </dt>
            <dd className="mt-1 font-mono tabular-nums">
              {report.projectedGrade !== null && report.projectedPercentage !== null ? (
                <>
                  <span className="text-2xl font-bold text-slate-900">
                    {report.projectedGrade}
                  </span>
                  <span className="text-sm text-slate-500"> / {maxGrade}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    {report.projectedPercentage}% estimado al cierre
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-slate-400">—</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    Pendiente de calificaciones
                  </span>
                </>
              )}
            </dd>
          </div>

          <div className="pb-3 sm:pb-0 border-b sm:border-b-0 border-slate-100">
            <dt className="text-xs text-slate-500">Mejor resultado posible</dt>
            <dd className="mt-1 font-mono tabular-nums">
              <span className="text-2xl font-bold text-slate-900">{report.maxPossibleGrade}</span>
              <span className="text-sm text-slate-500"> / {maxGrade}</span>
              <span className="block text-xs text-slate-500 mt-0.5">
                {report.maxPossiblePercentage}% obteniendo todo lo restante
              </span>
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">Resultado mínimo necesario para aprobar</dt>
            <dd className="mt-1 font-mono tabular-nums">
              {report.hasAlreadyPassed ? (
                <>
                  <span className="text-xl font-bold text-emerald-700">0 {pointsUnit}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    Ya alcanzaste la mínima de {minPassingGrade} / {maxGrade}
                  </span>
                </>
              ) : report.isMathematicallyImpossible ? (
                <>
                  <span className="text-xl font-bold text-red-700">No alcanzable</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    Faltan {report.pointsNeededToPass} {pointsUnit} y quedan {report.remainingPoints}{' '}
                    {pointsUnit} disponibles
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-slate-900">
                    {report.pointsNeededToPass} {pointsUnit}
                  </span>
                  <span className="text-sm text-slate-500">
                    {' '}
                    de {report.remainingPoints} {pointsUnit}
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    Requiere {report.minimumNeededInRemainingPercentage}% en lo restante (
                    {report.minimumNeededInRemainingGrade} / {maxGrade})
                  </span>
                </>
              )}
            </dd>
          </div>
        </dl>

        {/* Comparativa gráfica ligera de escenarios */}
        <div className="mt-5 pt-5 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-slate-500 font-mono tabular-nums">
            <span>Comparativa de escenarios</span>
            <span>
              Mínimo: {minPassingGrade} / {maxGrade} ({passingThresholdPercent}%)
            </span>
          </div>

          <div className="space-y-3">
            {comparisonRows.map((row) => {
              const clamped = Math.min(100, Math.max(0, row.percent));
              return (
                <div key={row.label} className="space-y-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs">
                    <span className="font-medium text-slate-700">{row.label}</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                      {row.display} ({clamped}%)
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${row.label}: ${row.display}`}
                    aria-valuenow={clamped}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="relative w-full h-2.5 sm:h-2 rounded-full bg-slate-100 overflow-hidden"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${row.barClass}`}
                      style={{ width: `${clamped}%` }}
                    />
                    {passingThresholdPercent > 0 && passingThresholdPercent < 100 ? (
                      <span
                        aria-hidden="true"
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-900/75"
                        style={{ left: `${passingThresholdPercent}%` }}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nota metodológica explícita: no es garantía */}
        <p className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            {report.isFullyEvaluated
              ? 'Proyección basada en tu rendimiento actual. Todas las evaluaciones registradas ya fueron calificadas; este cálculo no constituye una garantía ante cambios posteriores en la materia.'
              : 'Proyección basada en tu rendimiento actual. Es únicamente una estimación estadística y no garantiza tu calificación final, ya que depende de tus resultados en las evaluaciones restantes.'}
          </span>
        </p>
      </SurfaceCard>

      {/* 2. Diagnóstico "¿Cuánto necesito?" */}
      <SurfaceCard>
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${verdictIconWrapClass}`}
            >
              <VerdictIcon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">¿Cuánto necesito?</p>
              <h3 className="mt-0.5 text-base font-semibold text-slate-900 leading-snug">
                {headline}
              </h3>
            </div>
          </div>
          <div className="shrink-0">
            <GradeStatusLabel status={report.status} />
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-600 leading-relaxed">
          {report.passOutcome === 'already_passed' ? (
            report.remainingPoints > 0 ? (
              <>
                Con tu calificación actual de{' '}
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {report.equivalentGrade} / {maxGrade}
                </span>{' '}
                ya superaste el mínimo de{' '}
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {minPassingGrade}
                </span>
                . Aún puedes llegar hasta{' '}
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {report.maxPossibleGrade} / {maxGrade}
                </span>{' '}
                con los{' '}
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {report.remainingPoints} {pointsUnit}
                </span>{' '}
                restantes.
              </>
            ) : (
              <>
                Materia evaluada en su totalidad con{' '}
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {report.equivalentGrade} / {maxGrade}
                </span>{' '}
                (mínimo requerido:{' '}
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {minPassingGrade}
                </span>
                ).
              </>
            )
          ) : report.passOutcome === 'achievable' ? (
            <>
              Equivale a obtener un rendimiento mínimo de{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {report.minimumNeededInRemainingPercentage}%
              </span>{' '}
              en tus evaluaciones restantes (nivel{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {report.minimumNeededInRemainingGrade} / {maxGrade}
              </span>
              ).
            </>
          ) : report.remainingPoints > 0 ? (
            <>
              Te faltan{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {report.pointsNeededToPass} {pointsUnit}
              </span>{' '}
              para aprobar, pero solo quedan{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {report.remainingPoints} {pointsUnit}
              </span>{' '}
              disponibles. Incluso obteniendo el 100% restante alcanzarías{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {report.maxPossibleGrade} / {maxGrade}
              </span>
              .
            </>
          ) : (
            <>
              No quedan puntos restantes por evaluar. Tu calificación máxima alcanzable cerró en{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {report.maxPossibleGrade} / {maxGrade}
              </span>{' '}
              frente al mínimo de{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {minPassingGrade} / {maxGrade}
              </span>
              .
            </>
          )}
        </p>

        {/* Barra de alcance hasta el mínimo */}
        <div className="mt-5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 font-mono tabular-nums">
            <span>Actual: {report.currentPercentage}%</span>
            <span>Mínimo: {passingThresholdPercent}%</span>
            <span>Máximo posible: {report.maxPossiblePercentage}%</span>
          </div>

          <div
            role="img"
            aria-label={`Alcance para aprobar: actual ${report.currentPercentage}%, mínimo ${passingThresholdPercent}%, máximo posible ${report.maxPossiblePercentage}%`}
            className="relative w-full h-3 rounded-full bg-slate-100 overflow-hidden flex"
          >
            {currentPercentClamped > 0 ? (
              <div
                className={`h-full transition-all duration-200 ${currentFillClass}`}
                style={{ width: `${currentPercentClamped}%` }}
              />
            ) : null}
            {neededDeltaPercent > 0 ? (
              <div
                className="h-full bg-amber-400 transition-all duration-200"
                style={{ width: `${neededDeltaPercent}%` }}
              />
            ) : null}
            {extraPotentialPercent > 0 ? (
              <div
                className="h-full bg-slate-300 transition-all duration-200"
                style={{ width: `${extraPotentialPercent}%` }}
              />
            ) : null}

            {passingThresholdPercent > 0 && passingThresholdPercent < 100 ? (
              <span
                aria-hidden="true"
                className="absolute top-0 bottom-0 w-0.5 bg-slate-900/75"
                style={{ left: `${passingThresholdPercent}%` }}
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${currentFillClass}`} aria-hidden="true" />
              <span>Acumulado actual</span>
            </span>
            {neededDeltaPercent > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" aria-hidden="true" />
                <span>Necesario para aprobar</span>
              </span>
            ) : null}
            {extraPotentialPercent > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" aria-hidden="true" />
                <span>Margen restante posible</span>
              </span>
            ) : null}
          </div>
        </div>
      </SurfaceCard>

      {/* 3. Evaluaciones pendientes */}
      {pendingEvaluations.length > 0 ? (
        <SurfaceCard>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Evaluaciones pendientes ({pendingEvaluations.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {report.passOutcome === 'achievable' &&
                report.minimumNeededInRemainingPercentage !== null
                  ? `Referencia manteniendo ${report.minimumNeededInRemainingPercentage}% promedio en lo restante.`
                  : 'Actividades aún sin calificación registrada.'}
              </p>
            </div>
            <Button variant="secondary" onClick={onGoToEvaluations} className="w-full sm:w-auto shrink-0">
              <span>Calificar evaluaciones</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>

          <ul className="divide-y divide-slate-100">
            {pendingEvaluations.map((evaluation) => {
              const categoryName = categoryNameById.get(evaluation.categoryId) ?? 'Sin categoría';
              const suggestedScore =
                report.passOutcome === 'achievable' &&
                report.minimumNeededInRemainingPercentage !== null
                  ? roundAcademicValue(
                      (report.minimumNeededInRemainingPercentage / 100) * evaluation.maxScore,
                    )
                  : null;

              return (
                <li
                  key={evaluation.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
                      <span className="truncate">{evaluation.name}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {categoryName}
                      {evaluation.date ? ` · ${evaluation.date}` : ''}
                    </p>
                  </div>

                  <div className="text-right font-mono tabular-nums shrink-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {evaluation.maxScore} pts máx.
                    </p>
                    {suggestedScore !== null ? (
                      <p className="text-xs text-blue-700">
                        Meta ref.: {suggestedScore} / {evaluation.maxScore}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
