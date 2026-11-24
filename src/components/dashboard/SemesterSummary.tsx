import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { SemesterDashboardSummary } from '../../types/academic';
import { ScoreRing } from '../charts/ScoreRing';
import { GradeStatusLabel } from '../ui/GradeStatusLabel';
import { SurfaceCard } from '../ui/SurfaceCard';

interface SemesterSummaryProps {
  summary: SemesterDashboardSummary;
}

export function SemesterSummary({ summary }: SemesterSummaryProps) {
  const formattedAverage =
    summary.averagePercentage !== null ? `${summary.averagePercentage.toFixed(1)}%` : '—';

  const hasSubjects = summary.totalSubjects > 0;
  const approvedWidth = hasSubjects ? (summary.approvedCount / summary.totalSubjects) * 100 : 0;
  const atRiskWidth = hasSubjects ? (summary.atRiskCount / summary.totalSubjects) * 100 : 0;
  const failedWidth = hasSubjects ? (summary.failedCount / summary.totalSubjects) * 100 : 0;

  return (
    <SurfaceCard>
      <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-4 min-w-0">
          <ScoreRing
            percentage={summary.averagePercentage}
            status={summary.averageStatus}
            label="Promedio actual del semestre"
            size="md"
          />

          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Promedio actual</p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <p className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
                {formattedAverage}
              </p>
              {summary.averageScaleGrade !== null && summary.defaultScaleMaxGrade !== 100 ? (
                <span className="text-sm font-mono font-medium text-slate-500 tabular-nums">
                  ({summary.averageScaleGrade} / {summary.defaultScaleMaxGrade})
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-slate-600">
              {summary.averageStatus ? <GradeStatusLabel status={summary.averageStatus} /> : null}
              <span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {summary.totalSubjects}
                </span>{' '}
                {summary.totalSubjects === 1 ? 'materia registrada' : 'materias registradas'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {hasSubjects ? (
        <div className="pt-4">
          <div
            role="img"
            aria-label={`Distribución del semestre: ${summary.approvedCount} aprobadas, ${summary.atRiskCount} en riesgo, ${summary.failedCount} reprobadas`}
            className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden flex"
          >
            {approvedWidth > 0 ? (
              <div
                className="h-full bg-emerald-600 transition-all duration-200"
                style={{ width: `${approvedWidth}%` }}
              />
            ) : null}
            {atRiskWidth > 0 ? (
              <div
                className="h-full bg-amber-500 transition-all duration-200"
                style={{ width: `${atRiskWidth}%` }}
              />
            ) : null}
            {failedWidth > 0 ? (
              <div
                className="h-full bg-red-600 transition-all duration-200"
                style={{ width: `${failedWidth}%` }}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <dl className="grid grid-cols-3 divide-x divide-slate-200 pt-4">
        <div className="pr-2.5 sm:pr-4 min-w-0">
          <dt className="flex flex-col min-[400px]:flex-row items-start min-[400px]:items-center gap-1 min-[400px]:gap-1.5 text-[11px] sm:text-xs font-medium text-slate-600 leading-tight">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>Aprobadas</span>
          </dt>
          <dd className="mt-1.5 text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {summary.approvedCount}
          </dd>
        </div>

        <div className="px-2.5 sm:px-4 min-w-0">
          <dt className="flex flex-col min-[400px]:flex-row items-start min-[400px]:items-center gap-1 min-[400px]:gap-1.5 text-[11px] sm:text-xs font-medium text-slate-600 leading-tight">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700 shrink-0" aria-hidden="true" />
            <span>En riesgo</span>
          </dt>
          <dd className="mt-1.5 text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {summary.atRiskCount}
          </dd>
        </div>

        <div className="pl-2.5 sm:pl-4 min-w-0">
          <dt className="flex flex-col min-[400px]:flex-row items-start min-[400px]:items-center gap-1 min-[400px]:gap-1.5 text-[11px] sm:text-xs font-medium text-slate-600 leading-tight">
            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-700 shrink-0" aria-hidden="true" />
            <span>Reprobadas</span>
          </dt>
          <dd className="mt-1.5 text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {summary.failedCount}
          </dd>
        </div>
      </dl>

      {hasSubjects ? (
        <div className="mt-4 sm:mt-5 pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
            <span className="font-medium text-slate-700">Rendimiento general del semestre</span>
            <span className="font-mono text-slate-600 tabular-nums">
              {summary.gradedEvaluationsCount} calificada
              {summary.gradedEvaluationsCount === 1 ? '' : 's'} · {summary.pendingEvaluationsCount}{' '}
              pendiente{summary.pendingEvaluationsCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-600 font-mono tabular-nums">
              <span>Avance evaluado promedio</span>
              <span className="font-semibold text-slate-900 shrink-0">{summary.semesterProgressPercent}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Avance evaluado promedio del semestre"
              aria-valuenow={summary.semesterProgressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full h-2 sm:h-1.5 rounded-full bg-slate-100 overflow-hidden"
            >
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{ width: `${Math.min(100, Math.max(0, summary.semesterProgressPercent))}%` }}
              />
            </div>
          </div>

          {summary.averageGradedPerformancePercent !== null ? (
            <p className="text-xs text-slate-600 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span>Rendimiento promedio en actividades calificadas</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                {summary.averageGradedPerformancePercent}%
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </SurfaceCard>
  );
}
