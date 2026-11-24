import { useState, type FormEvent } from 'react';
import { validateCategoryInput } from '../../domain/validation';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';

interface CategoryFormProps {
  initialName?: string;
  initialWeightPercentage?: number;
  showWeightField?: boolean;
  existingOtherWeightsTotal?: number;
  existingNamesInSubject: string[];
  submitLabel: string;
  onSubmit: (name: string, weightPercentage?: number) => void;
  onCancel: () => void;
}

export function CategoryForm({
  initialName = '',
  initialWeightPercentage,
  showWeightField = false,
  existingOtherWeightsTotal = 0,
  existingNamesInSubject,
  submitLabel,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const [name, setName] = useState(initialName);
  const [weightInput, setWeightInput] = useState(
    typeof initialWeightPercentage === 'number' && initialWeightPercentage > 0
      ? String(initialWeightPercentage)
      : '',
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableWeight = Math.max(
    0,
    Math.round((100 - existingOtherWeightsTotal) * 100) / 100,
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const trimmedWeight = weightInput.trim();
    const parsedWeight =
      showWeightField && trimmedWeight !== '' ? Number(trimmedWeight) : undefined;

    const result = validateCategoryInput(
      name,
      existingNamesInSubject,
      showWeightField
        ? {
            weightPercentage: parsedWeight,
            existingOtherWeightsTotal,
          }
        : undefined,
    );

    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }
    onSubmit(name.trim(), parsedWeight);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <FormField
        id="category-name-input"
        label="Nombre de la categoría"
        required
        error={errors.name}
        hint="Ejemplo: Laboratorio, Exposición, Quiz o Portafolio"
      >
        <input
          id="category-name-input"
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (errors.name) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.name;
                return next;
              });
            }
          }}
          placeholder="Ej. Laboratorio"
          autoFocus
          maxLength={40}
          aria-invalid={Boolean(errors.name)}
          className={[
            'w-full min-w-0 min-h-[44px] rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900',
            'placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0 focus:outline-blue-700',
            errors.name ? 'border-red-500' : 'border-slate-300',
          ].join(' ')}
        />
      </FormField>

      {showWeightField ? (
        <FormField
          id="category-weight-input"
          label="Porcentaje en la materia (%)"
          error={errors.weightPercentage}
          hint={`Opcional. Disponible: ${availableWeight}% de 100% (ej. ADAs 30%, Examen 50%).`}
        >
          <input
            id="category-weight-input"
            type="number"
            inputMode="decimal"
            step="any"
            min="0.1"
            max="100"
            value={weightInput}
            onChange={(event) => {
              setWeightInput(event.target.value);
              if (errors.weightPercentage) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.weightPercentage;
                  return next;
                });
              }
            }}
            placeholder="Ej. 30"
            aria-invalid={Boolean(errors.weightPercentage)}
            className={[
              'w-full min-w-0 min-h-[44px] rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm font-mono tabular-nums text-slate-900',
              'placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0 focus:outline-blue-700',
              errors.weightPercentage ? 'border-red-500' : 'border-slate-300',
            ].join(' ')}
          />
        </FormField>
      ) : null}

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
