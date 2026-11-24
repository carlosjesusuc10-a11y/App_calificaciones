import type { GradeStatus } from '../../types/academic';

interface ScoreRingProps {
  percentage: number | null;
  status: GradeStatus | null;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

const STROKE_CLASSES: Record<GradeStatus, string> = {
  green: 'stroke-emerald-600',
  yellow: 'stroke-amber-500',
  red: 'stroke-red-600',
};

const TEXT_CLASSES: Record<GradeStatus, string> = {
  green: 'text-emerald-700',
  yellow: 'text-amber-700',
  red: 'text-red-700',
};

const SIZE_CLASSES = {
  sm: 'w-14 h-14 text-xs',
  md: 'w-20 h-20 text-sm',
  lg: 'w-24 h-24 text-base',
};

export function ScoreRing({
  percentage,
  status,
  label,
  size = 'md',
}: ScoreRingProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const hasValue = percentage !== null && Number.isFinite(percentage);
  const clamped = hasValue ? Math.min(100, Math.max(0, percentage)) : 0;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const strokeClass = status && hasValue ? STROKE_CLASSES[status] : 'stroke-slate-300';
  const textClass = status && hasValue ? TEXT_CLASSES[status] : 'text-slate-500';
  const displayValue = hasValue ? `${Math.round(clamped)}%` : '—';

  return (
    <div
      role="img"
      aria-label={`${label}: ${displayValue}`}
      className={`relative inline-flex items-center justify-center shrink-0 ${SIZE_CLASSES[size]}`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="10"
          className="stroke-slate-100"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`${strokeClass} transition-[stroke-dashoffset] duration-300`}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-mono font-bold tabular-nums ${textClass}`}
      >
        {displayValue}
      </span>
    </div>
  );
}
