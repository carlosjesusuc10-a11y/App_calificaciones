import { useEffect, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { validateCategoryInput, validateEvaluationInput } from '../../domain/validation';
import type { EntityId, EvaluationStatus, SubjectCategory } from '../../types/academic';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';

export interface EvaluationFormValues {
  categoryId: EntityId;
  name: string;
  maxScore: number;
  obtainedScore: number | null;
  status: EvaluationStatus;
  date?: string;
  notes?: string;
}

interface EvaluationFormProps {
  categories: SubjectCategory[];
  initialValues: EvaluationFormValues;
  submitLabel: string;
  onCreateCategory?: (name: string) => void;
  onSubmit: (values: EvaluationFormValues) => void;
  onCancel: () => void;
}

const STATUS_OPTIONS: Array<{ id: EvaluationStatus; label: string }> = [
  { id: 'graded', label: 'Calificada' },
  { id: 'pending', label: 'Pendiente' },
];

export function EvaluationForm({
  categories,
  initialValues,
  submitLabel,
  onCreateCategory,
  onSubmit,
  onCancel,
}: EvaluationFormProps) {
  const [categoryId, setCategoryId] = useState(
    initialValues.categoryId || categories[0]?.id || '',
  );
  const [name, setName] = useState(initialValues.name);
  const [status, setStatus] = useState<EvaluationStatus>(initialValues.status);
  const [maxScoreInput, setMaxScoreInput] = useState(
    initialValues.maxScore > 0 ? String(initialValues.maxScore) : '',
  );
  const [obtainedScoreInput, setObtainedScoreInput] = useState(
    initialValues.obtainedScore !== null ? String(initialValues.obtainedScore) : '',
  );
  const [date, setDate] = useState(initialValues.date ?? '');
  const [notes, setNotes] = useState(initialValues.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryError, setNewCategoryError] = useState<string | undefined>(undefined);
  const [pendingCategoryName, setPendingCategoryName] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingCategoryName) {
      return;
    }
    const match = categories.find(
      (category) => category.name.toLowerCase() === pendingCategoryName.toLowerCase(),
    );
    if (match) {
      setCategoryId(match.id);
      setPendingCategoryName(null);
    }
  }, [categories, pendingCategoryName]);

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSaveInlineCategory = () => {
    if (!onCreateCategory) {
      return;
    }

    const validation = validateCategoryInput(
      newCategoryName,
      categories.map((category) => category.name),
    );
    if (!validation.isValid) {
      setNewCategoryError(validation.errors.name);
      return;
    }

    const trimmed = newCategoryName.trim();
    setPendingCategoryName(trimmed);
    onCreateCategory(trimmed);
    clearFieldError('categoryId');
    setNewCategoryName('');
    setNewCategoryError(undefined);
    setIsAddingCategory(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const parsedMax = maxScoreInput.trim() === '' ? NaN : Number(maxScoreInput);
    const parsedObtained =
      status === 'graded'
        ? obtainedScoreInput.trim() === ''
          ? null
          : Number(obtainedScoreInput)
        : null;

    const result = validateEvaluationInput({
      name,
      categoryId,
      maxScore: parsedMax,
      obtainedScore: parsedObtained,
      status,
      notes,
    });

    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    onSubmit({
      categoryId,
      name: name.trim(),
      maxScore: parsedMax,
      obtainedScore: status === 'graded' ? parsedObtained : null,
      status,
      date: date.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField id="evaluation-category-select" label="Categoría" required error={errors.categoryId}>
        <div className="flex items-center gap-2">
          <select
            id="evaluation-category-select"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              clearFieldError('categoryId');
            }}
            aria-invalid={Boolean(errors.categoryId)}
            className={[
              'flex-1 min-w-0 min-h-[44px] rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900',
              'focus:outline-2 focus:outline-offset-0 focus:outline-blue-700',
              errors.categoryId ? 'border-red-500' : 'border-slate-300',
            ].join(' ')}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {onCreateCategory ? (
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddingCategory((prev) => !prev);
                setNewCategoryError(undefined);
              }}
              aria-label="Crear categoría personalizada"
              className="px-3 sm:px-4"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Nueva</span>
            </Button>
          ) : null}
        </div>
      </FormField>

      {isAddingCategory ? (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
          <label htmlFor="inline-new-category" className="block text-xs font-medium text-slate-700">
            Nueva categoría personalizada
          </label>
          <div className="flex items-center gap-2">
            <input
              id="inline-new-category"
              type="text"
              value={newCategoryName}
              onChange={(event) => {
                setNewCategoryName(event.target.value);
                if (newCategoryError) {
                  setNewCategoryError(undefined);
                }
              }}
              placeholder="Ej. Laboratorio"
              maxLength={40}
              className="flex-1 min-w-0 min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-2 focus:outline-blue-700"
            />
            <Button onClick={handleSaveInlineCategory}>Agregar</Button>
          </div>
          {newCategoryError ? (
            <p role="alert" className="text-xs font-medium text-red-700">
              {newCategoryError}
            </p>
          ) : null}
        </div>
      ) : null}

      <FormField
        id="evaluation-name-input"
        label="Nombre de la evaluación"
        required
        error={errors.name}
      >
        <input
          id="evaluation-name-input"
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            clearFieldError('name');
          }}
          placeholder="Ej. ADA 1, Parcial 1, Proyecto final"
          maxLength={80}
          aria-invalid={Boolean(errors.name)}
          className={[
            'w-full min-w-0 min-h-[44px] rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900',
            'placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0 focus:outline-blue-700',
            errors.name ? 'border-red-500' : 'border-slate-300',
          ].join(' ')}
        />
      </FormField>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-slate-800">Estado</span>
        <div
          role="group"
          aria-label="Estado de la evaluación"
          className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl"
        >
          {STATUS_OPTIONS.map((option) => {
            const isActive = status === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setStatus(option.id);
                  clearFieldError('obtainedScore');
                }}
                className={[
                  'min-h-[44px] px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer',
                  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700',
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900',
                ].join(' ')}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="evaluation-max-score"
          label="Valor máximo"
          required
          error={errors.maxScore}
        >
          <input
            id="evaluation-max-score"
            type="number"
            inputMode="decimal"
            step="any"
            min="0.1"
            value={maxScoreInput}
            onChange={(event) => {
              setMaxScoreInput(event.target.value);
              clearFieldError('maxScore');
              clearFieldError('obtainedScore');
            }}
            placeholder="Ej. 10"
            aria-invalid={Boolean(errors.maxScore)}
            className={[
              'w-full min-w-0 min-h-[48px] rounded-xl border bg-white px-3.5 py-2.5 text-base font-mono tabular-nums text-slate-900',
              'focus:outline-2 focus:outline-offset-0 focus:outline-blue-700',
              errors.maxScore ? 'border-red-500' : 'border-slate-300',
            ].join(' ')}
          />
        </FormField>

        <FormField
          id="evaluation-obtained-score"
          label="Calificación"
          required={status === 'graded'}
          error={errors.obtainedScore}
        >
          <input
            id="evaluation-obtained-score"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            disabled={status === 'pending'}
            value={status === 'pending' ? '' : obtainedScoreInput}
            onChange={(event) => {
              setObtainedScoreInput(event.target.value);
              clearFieldError('obtainedScore');
            }}
            placeholder={status === 'pending' ? 'Pendiente' : 'Ej. 8.5'}
            aria-invalid={Boolean(errors.obtainedScore)}
            className={[
              'w-full min-w-0 min-h-[48px] rounded-xl border px-3.5 py-2.5 text-base font-mono tabular-nums',
              'focus:outline-2 focus:outline-offset-0 focus:outline-blue-700',
              status === 'pending'
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white text-slate-900',
              errors.obtainedScore ? 'border-red-500' : 'border-slate-300',
            ].join(' ')}
          />
        </FormField>
      </div>

      {status === 'graded' && Number(maxScoreInput) > 0 ? (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setObtainedScoreInput(maxScoreInput);
              clearFieldError('obtainedScore');
            }}
            className="min-h-[44px] px-3 text-xs font-medium text-blue-700 hover:bg-blue-50 active:bg-blue-100 rounded-xl transition-colors cursor-pointer"
          >
            Usar valor máximo ({maxScoreInput})
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <FormField id="evaluation-date-input" label="Fecha opcional">
          <input
            id="evaluation-date-input"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full min-w-0 max-w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base sm:text-sm text-slate-900 focus:outline-2 focus:outline-blue-700"
          />
        </FormField>

        <FormField id="evaluation-notes-input" label="Nota opcional" error={errors.notes}>
          <input
            id="evaluation-notes-input"
            type="text"
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              clearFieldError('notes');
            }}
            placeholder="Ej. Entregada a tiempo"
            maxLength={300}
            aria-invalid={Boolean(errors.notes)}
            className={[
              'w-full min-w-0 min-h-[44px] rounded-xl border bg-white px-3.5 py-2 text-base sm:text-sm text-slate-900',
              'placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0 focus:outline-blue-700',
              errors.notes ? 'border-red-500' : 'border-slate-300',
            ].join(' ')}
          />
        </FormField>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
        <Button variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
