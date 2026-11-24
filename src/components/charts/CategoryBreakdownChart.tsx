import type { CategoryCalculationBreakdown } from '../../domain/calculations';
import type { EvaluationSystem } from '../../types/academic';

interface CategoryBreakdownChartProps {
  breakdowns: CategoryCalculationBreakdown[];
  evaluationSystem: EvaluationSystem;
  usesWeightedCategories: boolean;
}

export function CategoryBreakdownChart({
  breakdowns,
  evaluationSystem,
  usesWeightedCategories,
}: CategoryBreakdownChartProps) {
  const activeBreakdowns = breakdowns.filter(
    (item) =>
      item.evaluationCount > 0 || (item.weightPercentage !== null && item.weightPercentage > 0),
  );

  if (activeBreakdowns.length === 0) {
    return (
      <p className="text-sm text-slate-500 leading-relaxed">
        Agrega evaluaciones para visualizar el aporte y desempeño de cada categoría.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {activeBreakdowns.map((item) => {
        const hasWeighted =
          evaluationSystem === 'percentage' &&
          usesWeightedCategories &&
          item.weightPercentage !== null &&
          item.weightPercentage > 0;

        const barPercent = hasWeighted
          ? Math.min(100, Math.max(0, (item.weightedObtainedPercentage / item.weightPercentage!) * 100))
          : item.totalPossibleRawPoints > 0
            ? Math.min(100, Math.max(0, (item.obtainedRawPoints / item.totalPossibleRawPoints) * 100))
            : 0;

        const gradedCoveragePercent = hasWeighted
          ? Math.min(100, Math.max(0, (item.weightedPossiblePercentage / item.weightPercentage!) * 100))
          : item.totalPossibleRawPoints > 0
            ? Math.min(100, Math.max(0, (item.gradedPossibleRawPoints / item.totalPossibleRawPoints) * 100))
            : 0;

        const roundedBarPercent = Math.round(barPercent * 10) / 10;

        return (
          <li key={item.categoryId} className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
              <div className="min-w-0 flex items-baseline gap-2">
                <span className="font-medium text-slate-900 break-words">{item.categoryName}</span>
                {hasWeighted ? (
                  <span className="text-xs text-slate-500 font-mono tabular-nums shrink-0">
                    Peso {item.weightPercentage}%
                  </span>
                ) : null}
              </div>

              <div className="text-xs sm:text-sm font-mono tabular-nums text-slate-700">
                {hasWeighted ? (
                  <>
                    <span className="font-semibold text-slate-900">
                      {item.weightedObtainedPercentage}%
                    </span>
                    <span className="text-slate-500"> / {item.weightPercentage}%</span>
                    <span className="text-slate-400"> · </span>
                    <span className="text-slate-600">
                      {item.obtainedRawPoints}/{item.totalPossibleRawPoints} pts
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-slate-900">{item.obtainedRawPoints}</span>
                    <span className="text-slate-500"> / {item.totalPossibleRawPoints} pts</span>
                    <span className="text-slate-400"> · </span>
                    <span className="text-slate-600">{roundedBarPercent}%</span>
                  </>
                )}
              </div>
            </div>

            <div
              role="progressbar"
              aria-label={`Desempeño en ${item.categoryName}`}
              aria-valuenow={roundedBarPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="relative w-full h-2.5 sm:h-2 rounded-full bg-slate-100 overflow-hidden"
            >
              {gradedCoveragePercent > barPercent ? (
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 rounded-full bg-slate-200 transition-all duration-200"
                  style={{ width: `${gradedCoveragePercent}%` }}
                />
              ) : null}
              <div
                className="relative h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{ width: `${barPercent}%` }}
              />
            </div>

            <p className="text-xs text-slate-500 font-mono tabular-nums">
              {item.gradedCount} calificada{item.gradedCount === 1 ? '' : 's'}
              {item.pendingCount > 0
                ? ` · ${item.pendingCount} pendiente${item.pendingCount === 1 ? '' : 's'}`
                : ''}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
