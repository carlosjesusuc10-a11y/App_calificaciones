import { ChevronRight } from 'lucide-react';
import type { SubjectCardViewModel } from '../../types/academic';
import { ProgressBar } from '../charts/ProgressBar';
import { GradeStatusLabel } from '../ui/GradeStatusLabel';

interface SubjectCardProps {
  subject: SubjectCardViewModel;
  onSelect: (subject: SubjectCardViewModel) => void;
}

export function SubjectCard({ subject, onSelect }: SubjectCardProps) {
  const passingThresholdPercent =
    subject.maxGrade > 0 ? (subject.minPassingGrade / subject.maxGrade) * 100 : undefined;
  const pointsUnit = subject.evaluationSystem === 'percentage' ? '%' : 'pts';

  return (
    <button
      type="button"
      onClick={() => onSelect(subject)}
      className={[
        'w-full text-left bg-white border border-slate-200 rounded-2xl p-4 sm:p-5',
        'hover:border-slate-300 hover:shadow-sm active:scale-[0.99]',
        'transition-all duration-150 cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
            {subject.name}
          </h3>
          <p className="mt-0.5 text-sm text-slate-600 truncate">{subject.teacher}</p>
        </div>

        <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
      </div>

      <div className="mt-3.5 sm:mt-4 pt-3.5 border-t border-slate-100 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">Calificación</p>
          <p className="mt-0.5 flex items-baseline gap-1 font-mono tabular-nums">
            <span className="text-2xl font-bold text-slate-900">{subject.currentGrade}</span>
            <span className="text-sm text-slate-500">/ {subject.maxGrade}</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
            Escala {subject.maxGrade} · mín. {subject.minPassingGrade}
          </p>
        </div>

        <div className="text-right space-y-1 shrink-0">
          <GradeStatusLabel status={subject.status} />
          <p className="text-xs text-slate-600 font-mono tabular-nums">
            {subject.currentPercentage}% acumulado
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <ProgressBar
          value={subject.currentPercentage}
          status={subject.status}
          passingThresholdPercent={passingThresholdPercent}
          label={`Calificación de ${subject.name}: ${subject.currentPercentage}%`}
        />

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-slate-500 font-mono tabular-nums">
          <span>
            Puntos: {subject.obtainedPoints} / {subject.totalPossiblePoints} {pointsUnit}
          </span>
          <span>Progreso {subject.progressPercent}%</span>
        </div>
      </div>
    </button>
  );
}
