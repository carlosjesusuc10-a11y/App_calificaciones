import type { GradeStatus } from '../../types/academic';

interface ProgressBarProps {
  value: number;
  status: GradeStatus;
  label: string;
  passingThresholdPercent?: number;
  heightClassName?: string;
}

const FILL_CLASSES: Record<GradeStatus, string> = {
  green: 'bg-emerald-600',
  yellow: 'bg-amber-500',
  red: 'bg-red-600',
};

export function ProgressBar({
  value,
  status,
  label,
  passingThresholdPercent,
  heightClassName = 'h-2.5 sm:h-2',
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const clampedThreshold =
    typeof passingThresholdPercent === 'number' &&
    Number.isFinite(passingThresholdPercent) &&
    passingThresholdPercent > 0 &&
    passingThresholdPercent < 100
      ? Math.min(100, Math.max(0, passingThresholdPercent))
      : null;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped * 10) / 10}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative w-full ${heightClassName} rounded-full bg-slate-100 overflow-hidden`}
    >
      <div
        className={`h-full rounded-full transition-all duration-200 ${FILL_CLASSES[status]}`}
        style={{ width: `${clamped}%` }}
      />
      {clampedThreshold !== null ? (
        <span
          aria-hidden="true"
          title={`Mínimo aprobatorio: ${Math.round(clampedThreshold)}%`}
          className="absolute top-0 bottom-0 w-0.5 bg-slate-800/70"
          style={{ left: `${clampedThreshold}%` }}
        />
      ) : null}
    </div>
  );
}
