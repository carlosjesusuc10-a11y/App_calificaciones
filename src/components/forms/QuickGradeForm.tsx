import { useState, type FormEvent } from 'react';
import { validateEvaluationInput } from '../../domain/validation';
import type { Evaluation } from '../../types/academic';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';

interface QuickGradeFormProps {
  evaluation: Evaluation;
  onSubmit: (score: number) => void;
  onCancel: () => void;
}

export function QuickGradeForm({ evaluation, onSubmit, onCancel }: QuickGradeFormProps) {
  const [scoreInput, setScoreInput] = useState(
    evaluation.obtainedScore !== null ? String(evaluation.obtainedScore) : '',
  );
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const parsedScore = scoreInput.trim() === '' ? null : Number(scoreInput);
    const result = validateEvaluationInput({
      name: evaluation.name,
      categoryId: evaluation.categoryId,
      maxScore: evaluation.maxScore,
      obtainedScore: parsedScore,
      status: 'graded',
    });

    if (!result.isValid || parsedScore === null) {
      setError(result.errors.obtainedScore ?? 'Ingresa una calificación válida.');
      return;
    }

    onSubmit(parsedScore);
  };

  const applyQuickScore = (value: number) => {
    const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
    setScoreInput(String(rounded));
    setError(undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <FormField
        id="quick-grade-input"
        label={`Calificación obtenida (máximo ${evaluation.maxScore})`}
        required
        error={error}
      >
        <input
          id="quick-grade-input"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          max={evaluation.maxScore}
          value={scoreInput}
          onChange={(event) => {
            setScoreInput(event.target.value);
            if (error) {
              setError(undefined);
            }
          }}
          placeholder={`0 – ${evaluation.maxScore}`}
          autoFocus
          aria-invalid={Boolean(error)}
          className={[
            'w-full min-h-[56px] rounded-xl border bg-white px-4 py-3 text-2xl font-bold font-mono tabular-nums text-center text-slate-900',
            'focus:outline-2 focus:outline-offset-0 focus:outline-blue-700',
            error ? 'border-red-500' : 'border-slate-300',
          ].join(' ')}
        />
      </FormField>

      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => applyQuickScore(0)}
          className="min-w-0 px-2 sm:px-4 text-xs sm:text-sm font-mono tabular-nums"
        >
          <span className="truncate">0</span>
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => applyQuickScore(evaluation.maxScore * 0.5)}
          className="min-w-0 px-2 sm:px-4 text-xs sm:text-sm font-mono tabular-nums"
        >
          <span className="truncate">50% ({Math.round(evaluation.maxScore * 50) / 100})</span>
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => applyQuickScore(evaluation.maxScore)}
          className="min-w-0 px-2 sm:px-4 text-xs sm:text-sm font-mono tabular-nums"
        >
          <span className="truncate">Máx ({evaluation.maxScore})</span>
        </Button>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
        <Button variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          Guardar calificación
        </Button>
      </div>
    </form>
  );
}
