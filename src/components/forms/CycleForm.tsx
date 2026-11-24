import { useState, type FormEvent } from 'react';
import { validateCycleInput } from '../../domain/validation';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';

interface CycleFormProps {
  initialName?: string;
  existingNames: string[];
  submitLabel: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function CycleForm({
  initialName = '',
  existingNames,
  submitLabel,
  onSubmit,
  onCancel,
}: CycleFormProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateCycleInput(name, existingNames);
    if (!result.isValid) {
      setError(result.errors.name);
      return;
    }
    onSubmit(name.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <FormField
        id="cycle-name-input"
        label="Nombre del ciclo escolar"
        required
        error={error}
        hint="Ejemplo: 2026-2027 o Ciclo Otoño 2026"
      >
        <input
          id="cycle-name-input"
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) {
              setError(undefined);
            }
          }}
          placeholder="Ej. 2026-2027"
          autoFocus
          maxLength={60}
          aria-invalid={Boolean(error)}
          className={[
            'w-full min-w-0 min-h-[44px] rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900',
            'placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0 focus:outline-blue-700',
            error ? 'border-red-500' : 'border-slate-300',
          ].join(' ')}
        />
      </FormField>

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
