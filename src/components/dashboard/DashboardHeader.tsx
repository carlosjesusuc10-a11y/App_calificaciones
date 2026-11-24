import { CalendarRange, ChevronDown, Plus, Settings } from 'lucide-react';
import { Button } from '../ui/Button';

interface DashboardHeaderProps {
  cycleName: string | null;
  semesterName: string | null;
  canSwitchContext: boolean;
  onSwitchContext: () => void;
  onAddSubject: () => void;
  onOpenSemesters: () => void;
  onOpenSettings: () => void;
}

export function DashboardHeader({
  cycleName,
  semesterName,
  canSwitchContext,
  onSwitchContext,
  onAddSubject,
  onOpenSemesters,
  onOpenSettings,
}: DashboardHeaderProps) {
  const contextLabel = cycleName
    ? semesterName
      ? `${cycleName} · ${semesterName}`
      : `${cycleName} · Sin semestre`
    : 'Sin ciclo escolar activo';

  return (
    <header className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          {canSwitchContext ? (
            <button
              type="button"
              onClick={onSwitchContext}
              className="inline-flex items-center gap-1.5 max-w-full min-h-[44px] -ml-2 px-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-100 active:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <span className="truncate font-medium">{contextLabel}</span>
              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            </button>
          ) : (
            <p className="text-sm text-slate-600 truncate">{contextLabel}</p>
          )}

          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            Resumen del semestre
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5">
            <Button variant="secondary" onClick={onOpenSemesters} className="min-w-0 px-2.5 sm:px-4 text-xs sm:text-sm">
              <CalendarRange className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
              <span className="truncate">Semestres</span>
            </Button>
            <Button variant="secondary" onClick={onOpenSettings} className="min-w-0 px-2.5 sm:px-4 text-xs sm:text-sm">
              <Settings className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
              <span className="truncate">Configuración</span>
            </Button>
          </div>

          <Button size="lg" onClick={onAddSubject} className="w-full sm:w-auto">
            <Plus className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>Agregar materia</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
