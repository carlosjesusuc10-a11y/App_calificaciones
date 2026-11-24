import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { GradeStatus } from '../../types/academic';

interface GradeStatusLabelProps {
  status: GradeStatus;
}

const STATUS_META: Record<
  GradeStatus,
  { label: string; textClass: string; Icon: typeof CheckCircle2 }
> = {
  green: {
    label: 'Aprobada',
    textClass: 'text-emerald-700',
    Icon: CheckCircle2,
  },
  yellow: {
    label: 'En riesgo',
    textClass: 'text-amber-700',
    Icon: AlertTriangle,
  },
  red: {
    label: 'Reprobada',
    textClass: 'text-red-700',
    Icon: XCircle,
  },
};

export function GradeStatusLabel({ status }: GradeStatusLabelProps) {
  const { label, textClass, Icon } = STATUS_META[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${textClass}`}>
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
