import { useState, type FormEvent } from 'react';
import { SCALE_PRESETS } from '../../domain/defaults';
import { validateSubjectInput } from '../../domain/validation';
import type {
  EvaluationSystem,
  GradingScaleConfig,
  GradingScalePreset,
} from '../../types/academic';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';

export interface SubjectFormValues {
  name: string;
  teacher: string;
  gradingScale: GradingScaleConfig;
  evaluationSystem: EvaluationSystem;
  additionalInfo?: string;
}

interface SubjectFormProps {
  initialValues: SubjectFormValues;
  existingNamesInSemester: string[];
  submitLabel: string;
  onSubmit: (values: SubjectFormValues) => void;
  onCancel?: () => void;
}

const PRESET_OPTIONS: Array<{ id: GradingScalePreset; label: string }> = [
  { id: '100', label: 'Escala 100' },
  { id: '10', label: 'Escala 10' },
  { id: 'custom', label: 'Personalizada' },
];

const SYSTEM_OPTIONS: Array<{ id: EvaluationSystem; label: string }> = [
  { id: 'points', label: 'Por puntos' },
  { id: 'percentage', label: 'Por porcentajes' },
];

export function SubjectForm({
  initialValues,
  existingNamesInSemester,
  submitLabel,
  onSubmit,
  onCancel,
}: SubjectFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [teacher, setTeacher] = useState(initialValues.teacher);
  const [preset, setPreset] = useState<GradingScalePreset>(initialValues.gradingScale.preset);
  const [maxGradeInput, setMaxGradeInput] = useState(
    String(initialValues.gradingScale.maxGrade),
  );
  const [minPassingInput, setMinPassingInput] = useState(
    String(initialValues.gradingScale.minPassingGrade),
  );
  const [evaluationSystem, setEvaluationSystem] = useState<EvaluationSystem>(
    initialValues.evaluationSystem,
  );
  const [additionalInfo, setAdditionalInfo] = useState(initialValues.additionalInfo ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSelectPreset = (nextPreset: GradingScalePreset) => {
    setPreset(nextPreset);
    clearFieldError('maxGrade');
    clearFieldError('minPassingGrade');

    if (nextPreset === '100' || nextPreset === '10') {
      const presetConfig = SCALE_PRESETS[nextPreset];
      setMaxGradeInput(String(presetConfig.maxGrade));
      setMinPassingInput(String(presetConfig.minPassingGrade));
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const parsedMax = Number(maxGradeInput);
    const parsedMin = Number(minPassingInput);

    const candidate: SubjectFormValues = {
      name,
      teacher,
      gradingScale: {
        preset,
        maxGrade: parsedMax,
        minPassingGrade: parsedMin,
      },
      evaluationSystem,
      additionalInfo,
    };

    const result = validateSubjectInput(candidate, existingNamesInSemester);
    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    onSubmit({
      name: name.trim(),
      teacher: teacher.trim(),
      gradingScale: {
        preset,
        maxGrade: parsedMax,
        minPassingGrade: parsedMin,
      },
      evaluationSystem,
      additionalInfo: additionalInfo.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <FormField
        id="subject-name-input"
        label="Nombre de la materia"
        required
        error={errors.name}
      >
        <input
          id="subject-name-input"
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            clearFieldError('name');
          }}
          placeholder="Ej. Cálculo Diferencial"
          maxLength={80}
          aria-invalid={Boolean(errors.name)}
          className={[
            'w-full min-w-0 min-h-[44px] rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900',
            'placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0 focus:outline-blue-700',
            errors.name ? 'border-red-500' : 'border-slate-300',
          ].join(' ')}
        />
      </FormField>

      <FormField id="subject-teacher-input" label="Docente" required error={errors.teacher}>
        <input
          id="subject-teacher-input"
          type="text"
          value={teacher}
          onChange={(event) => {
            setTeacher(event.target.value);
            clearFieldError('teacher');
          }}
          placeholder="Ej. Prof. Roberto Méndez"
          maxLength={80}
          aria-invalid={Boolean(errors.teacher)}
          className={[
            'w-full min-w-0 min-h-[44px] rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900',
            'placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0 focus:outline-blue-700',
            errors.teacher ? 'border-red-500' : 'border-slate-300',
          ].join(' ')}
        />
      </FormField>

      <div className="space-y-3">
        <span className="block text-sm font-medium text-slate-800">
          Escala de calificación
        </span>
        <div
          role="group"
          aria-label="Seleccionar escala de calificación"
          className="flex flex-wrap sm:grid sm:grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl"
        >
          {PRESET_OPTIONS.map((option) => {
            const isActive = preset === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectPreset(option.id)}
                className={[
                  'flex-1 min-w-[92px] min-h-[44px] px-2.5 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer',
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

        <div className="grid grid-cols-2 gap-3">
          <FormField
            id="subject-min-grade"
            label="Mínima para aprobar"
            required
            error={errors.minPassingGrade}
          >
            <input
              id="subject-min-grade"
              type="number"
              inputMode="decimal"
              step="any"
              min="0.1"
              value={minPassingInput}
              onChange={(event) => {
                setMinPassingInput(event.target.value);
                setPreset('custom');
                clearFieldError('minPassingGrade');
              }}
              aria-invalid={Boolean(errors.minPassingGrade)}
              className={[
                'w-full min-w-0 min-h-[44px] rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm font-mono tabular-nums text-slate-900',
                'focus:outline-2 focus:outline-offset-0 focus:outline-blue-700',
                errors.minPassingGrade ? 'border-red-500' : 'border-slate-300',
              ].join(' ')}
            />
          </FormField>

          <FormField
            id="subject-max-grade"
            label="Calificación máxima"
            required
            error={errors.maxGrade}
          >
            <input
              id="subject-max-grade"
              type="number"
              inputMode="decimal"
              step="any"
              min="0.1"
              value={maxGradeInput}
              onChange={(event) => {
                const nextValue = event.target.value;
                setMaxGradeInput(nextValue);
                if (nextValue !== '100' && nextValue !== '10') {
                  setPreset('custom');
                }
                clearFieldError('maxGrade');
                clearFieldError('minPassingGrade');
              }}
              aria-invalid={Boolean(errors.maxGrade)}
              className={[
                'w-full min-w-0 min-h-[44px] rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm font-mono tabular-nums text-slate-900',
                'focus:outline-2 focus:outline-offset-0 focus:outline-blue-700',
                errors.maxGrade ? 'border-red-500' : 'border-slate-300',
              ].join(' ')}
            />
          </FormField>
        </div>
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-slate-800">
          Sistema de evaluación
        </span>
        <div
          role="group"
          aria-label="Seleccionar sistema de evaluación"
          className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl"
        >
          {SYSTEM_OPTIONS.map((option) => {
            const isActive = evaluationSystem === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setEvaluationSystem(option.id)}
                className={[
                  'min-h-[44px] px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer',
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

      <FormField
        id="subject-description-input"
        label="Descripción opcional"
        error={errors.additionalInfo}
        hint="Horario, aula, criterios generales o notas personales."
      >
        <textarea
          id="subject-description-input"
          rows={3}
          value={additionalInfo}
          onChange={(event) => {
            setAdditionalInfo(event.target.value);
            clearFieldError('additionalInfo');
          }}
          maxLength={300}
          placeholder="Ej. Lunes y miércoles 8:00 · Aula B-204"
          aria-invalid={Boolean(errors.additionalInfo)}
          className={[
            'w-full min-w-0 rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 resize-y',
            'placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0 focus:outline-blue-700',
            errors.additionalInfo ? 'border-red-500' : 'border-slate-300',
          ].join(' ')}
        />
      </FormField>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
