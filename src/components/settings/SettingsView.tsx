import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FolderKanban,
  HardDrive,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Upload,
} from 'lucide-react';
import { createEmptyDatabase, SCALE_PRESETS } from '../../domain/defaults';
import { useAcademicStore } from '../../hooks/useAcademicStore';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { selectEntityCounts } from '../../state/selectors';
import {
  getBackupFilename,
  hasExistingAcademicData,
  serializeAcademicBackup,
  validateAndParseAcademicBackup,
  type ParsedBackupPreview,
} from '../../storage/backup';
import type { EvaluationSystem, GradingScalePreset } from '../../types/academic';
import { AdaptiveSheet } from '../layout/AdaptiveSheet';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { SurfaceCard } from '../ui/SurfaceCard';

interface SettingsViewProps {
  onAfterDataReplaced: () => void;
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

function formatDateTime(isoString: string | null): string {
  if (!isoString) {
    return 'Fecha no disponible';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function SettingsView({ onAfterDataReplaced }: SettingsViewProps) {
  const { database, dispatch } = useAcademicStore();
  const { isInstalled, isInstallable, isIOS } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const counts = useMemo(() => selectEntityCounts(database), [database]);

  // Estado del formulario de preferencias
  const [preset, setPreset] = useState<GradingScalePreset>(database.settings.defaultScale.preset);
  const [maxGradeInput, setMaxGradeInput] = useState(
    String(database.settings.defaultScale.maxGrade),
  );
  const [minPassingInput, setMinPassingInput] = useState(
    String(database.settings.defaultScale.minPassingGrade),
  );
  const [evaluationSystem, setEvaluationSystem] = useState<EvaluationSystem>(
    database.settings.defaultEvaluationSystem,
  );
  const [belowMarginInput, setBelowMarginInput] = useState(
    String(database.settings.yellowZone.belowPassingMarginPercent),
  );
  const [aboveMarginInput, setAboveMarginInput] = useState(
    String(database.settings.yellowZone.abovePassingRiskMarginPercent),
  );
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Estado de respaldo JSON (exportar / importar)
  const [backupMessage, setBackupMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [pendingImport, setPendingImport] = useState<ParsedBackupPreview | null>(null);
  const [isResetSheetOpen, setIsResetSheetOpen] = useState(false);

  const syncFormFromDatabase = (nextDb: typeof database) => {
    setPreset(nextDb.settings.defaultScale.preset);
    setMaxGradeInput(String(nextDb.settings.defaultScale.maxGrade));
    setMinPassingInput(String(nextDb.settings.defaultScale.minPassingGrade));
    setEvaluationSystem(nextDb.settings.defaultEvaluationSystem);
    setBelowMarginInput(String(nextDb.settings.yellowZone.belowPassingMarginPercent));
    setAboveMarginInput(String(nextDb.settings.yellowZone.abovePassingRiskMarginPercent));
    setSettingsError(null);
    setSettingsSaved(false);
  };

  const handleSelectPreset = (nextPreset: GradingScalePreset) => {
    setPreset(nextPreset);
    setSettingsSaved(false);
    setSettingsError(null);

    if (nextPreset === '100' || nextPreset === '10') {
      const cfg = SCALE_PRESETS[nextPreset];
      setMaxGradeInput(String(cfg.maxGrade));
      setMinPassingInput(String(cfg.minPassingGrade));
    }
  };

  const handleSavePreferences = (event: FormEvent) => {
    event.preventDefault();
    const maxGrade = Number(maxGradeInput);
    const minPassingGrade = Number(minPassingInput);
    const belowMargin = Number(belowMarginInput);
    const aboveMargin = Number(aboveMarginInput);

    if (!Number.isFinite(maxGrade) || maxGrade <= 0) {
      setSettingsError('La calificación máxima predeterminada debe ser mayor a 0.');
      return;
    }
    if (!Number.isFinite(minPassingGrade) || minPassingGrade <= 0 || minPassingGrade > maxGrade) {
      setSettingsError('La calificación mínima debe ser mayor a 0 y menor o igual a la máxima.');
      return;
    }
    if (
      !Number.isFinite(belowMargin) ||
      belowMargin < 0 ||
      belowMargin > 50 ||
      !Number.isFinite(aboveMargin) ||
      aboveMargin < 0 ||
      aboveMargin > 50
    ) {
      setSettingsError('Los márgenes de zona amarilla deben estar entre 0% y 50%.');
      return;
    }

    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        defaultScale: {
          preset,
          maxGrade,
          minPassingGrade,
        },
        defaultEvaluationSystem: evaluationSystem,
        yellowZone: {
          belowPassingMarginPercent: belowMargin,
          abovePassingRiskMarginPercent: aboveMargin,
        },
      },
    });
    setSettingsError(null);
    setSettingsSaved(true);
  };

  const handleExportJson = () => {
    try {
      const serialized = serializeAcademicBackup(database);
      const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = getBackupFilename();
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setBackupMessage({
        type: 'success',
        text: 'Respaldo JSON generado y descargado correctamente con todos tus datos locales.',
      });
    } catch {
      setBackupMessage({
        type: 'error',
        text: 'No se pudo generar el archivo de respaldo JSON en este navegador.',
      });
    }
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setBackupMessage(null);

    try {
      const rawContent = await file.text();
      const validation = validateAndParseAcademicBackup(rawContent);

      if (!validation.ok) {
        setBackupMessage({
          type: 'error',
          text: `${validation.error} Tus datos actuales no fueron modificados.`,
        });
        return;
      }

      if (hasExistingAcademicData(database)) {
        setPendingImport(validation.preview);
        return;
      }

      dispatch({ type: 'IMPORT_DATABASE', payload: validation.preview.database });
      syncFormFromDatabase(validation.preview.database);
      onAfterDataReplaced();
      setBackupMessage({
        type: 'success',
        text: `Datos importados correctamente (${validation.preview.counts.subjects} materias y ${validation.preview.counts.evaluations} evaluaciones).`,
      });
    } catch {
      setBackupMessage({
        type: 'error',
        text: 'No se pudo leer el archivo seleccionado. Tus datos actuales se mantienen intactos.',
      });
    }
  };

  const handleConfirmOverwriteImport = () => {
    if (!pendingImport) {
      return;
    }
    const targetPreview = pendingImport;
    dispatch({ type: 'IMPORT_DATABASE', payload: targetPreview.database });
    syncFormFromDatabase(targetPreview.database);
    onAfterDataReplaced();
    setPendingImport(null);
    setBackupMessage({
      type: 'success',
      text: `Respaldo importado correctamente (${targetPreview.counts.cycles} ciclos, ${targetPreview.counts.subjects} materias, ${targetPreview.counts.evaluations} evaluaciones).`,
    });
  };

  const handleConfirmReset = () => {
    dispatch({ type: 'RESET_DATABASE' });
    syncFormFromDatabase(createEmptyDatabase());
    onAfterDataReplaced();
    setIsResetSheetOpen(false);
    setBackupMessage({
      type: 'success',
      text: 'El almacenamiento local se restableció a los valores iniciales.',
    });
  };

  // Vista previa en tiempo real de la zona amarilla con los valores actuales del formulario
  const previewMax = Number(maxGradeInput) > 0 ? Number(maxGradeInput) : 100;
  const previewMin = Math.min(
    previewMax,
    Number(minPassingInput) > 0 ? Number(minPassingInput) : Math.min(previewMax, 70),
  );
  const previewBelow = Number.isFinite(Number(belowMarginInput)) ? Math.max(0, Number(belowMarginInput)) : 0;
  const previewAbove = Number.isFinite(Number(aboveMarginInput)) ? Math.max(0, Number(aboveMarginInput)) : 0;
  const yellowStart = Math.max(0, Math.round((previewMin - (previewMax * previewBelow) / 100) * 10) / 10);
  const greenStart = Math.min(previewMax, Math.round((previewMin + (previewMax * previewAbove) / 100) * 10) / 10);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Configuración y respaldo
        </h1>
        <p className="text-sm text-slate-600">
          Administra tus preferencias académicas, verifica el almacenamiento local en este dispositivo y exporta o importa respaldos en JSON.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* 1. Exportar e Importar datos (JSON) */}
        <SurfaceCard>
          <div className="flex items-center gap-2.5 text-slate-900 pb-3 border-b border-slate-100">
            <HardDrive className="w-5 h-5 text-slate-600" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold">Respaldo de datos (JSON)</h2>
              <p className="text-xs text-slate-500">
                Guarda una copia completa o restaura datos desde un archivo exportado.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pb-4 border-b border-slate-100">
              <div>
                <p className="text-xs text-slate-500">Ciclos</p>
                <p className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                  {counts.cycles}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Semestres</p>
                <p className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                  {counts.semesters}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Materias</p>
                <p className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                  {counts.subjects}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Evaluaciones</p>
                <p className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                  {counts.evaluations}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Guardado automáticamente de forma local en este navegador. Última modificación:{' '}
              <span className="font-medium text-slate-700">{formatDateTime(database.updatedAt)}</span>.
            </p>

            {backupMessage ? (
              <div
                role={backupMessage.type === 'error' ? 'alert' : 'status'}
                className={[
                  'p-3.5 rounded-xl border text-sm flex items-start gap-2.5',
                  backupMessage.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900',
                ].join(' ')}
              >
                {backupMessage.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <span>{backupMessage.text}</span>
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button size="lg" fullWidth onClick={handleExportJson}>
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Exportar datos (JSON)</span>
              </Button>

              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
                <span>Importar datos</span>
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                aria-label="Seleccionar archivo JSON para importar"
                className="hidden"
              />
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Al importar se valida la estructura y todas las referencias antes de modificar tus datos. Si ocurre algún error, tu información actual permanece intacta.
            </p>
          </div>
        </SurfaceCard>

        {/* 2. Preferencias académicas y Zona amarilla */}
        <SurfaceCard>
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 text-slate-900">
              <SlidersHorizontal className="w-5 h-5 text-slate-600" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold">Preferencias académicas</h2>
                <p className="text-xs text-slate-500">
                  Escala predeterminada para nuevas materias y umbrales de estado.
                </p>
              </div>
            </div>
            {settingsSaved ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 shrink-0">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>Guardado</span>
              </span>
            ) : null}
          </div>

          <form onSubmit={handleSavePreferences} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-slate-800">
                Escala predeterminada
              </span>
              <div className="flex flex-wrap sm:grid sm:grid-cols-3 gap-2">
                {PRESET_OPTIONS.map((option) => {
                  const active = preset === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectPreset(option.id)}
                      className={[
                        'flex-1 min-w-[96px] min-h-[44px] px-2.5 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap',
                        active
                          ? 'bg-blue-50 border-blue-700 text-blue-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Calificación mínima" id="pref-min-grade">
                <input
                  id="pref-min-grade"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0.1"
                  value={minPassingInput}
                  onChange={(e) => {
                    setMinPassingInput(e.target.value);
                    setPreset('custom');
                    setSettingsSaved(false);
                  }}
                  className="w-full min-w-0 min-h-[44px] px-3 rounded-xl border border-slate-200 text-base sm:text-sm font-mono tabular-nums text-slate-900 focus:outline-2 focus:outline-blue-700"
                />
              </FormField>

              <FormField label="Calificación máxima" id="pref-max-grade">
                <input
                  id="pref-max-grade"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="1"
                  value={maxGradeInput}
                  onChange={(e) => {
                    setMaxGradeInput(e.target.value);
                    setPreset('custom');
                    setSettingsSaved(false);
                  }}
                  className="w-full min-w-0 min-h-[44px] px-3 rounded-xl border border-slate-200 text-base sm:text-sm font-mono tabular-nums text-slate-900 focus:outline-2 focus:outline-blue-700"
                />
              </FormField>
            </div>

            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-slate-800">
                Sistema de evaluación predeterminado
              </span>
              <div className="grid grid-cols-2 gap-2">
                {SYSTEM_OPTIONS.map((option) => {
                  const active = evaluationSystem === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setEvaluationSystem(option.id);
                        setSettingsSaved(false);
                      }}
                      className={[
                        'min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-colors cursor-pointer',
                        active
                          ? 'bg-blue-50 border-blue-700 text-blue-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Zona amarilla (en riesgo)</p>
                <p className="text-xs text-slate-500">
                  Porcentaje de margen respecto al mínimo aprobatorio de cada materia.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Debajo del mínimo (%)" id="pref-yellow-below">
                  <input
                    id="pref-yellow-below"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="0"
                    max="50"
                    value={belowMarginInput}
                    onChange={(e) => {
                      setBelowMarginInput(e.target.value);
                      setSettingsSaved(false);
                    }}
                    className="w-full min-w-0 min-h-[44px] px-3 rounded-xl border border-slate-200 text-base sm:text-sm font-mono tabular-nums text-slate-900 focus:outline-2 focus:outline-blue-700"
                  />
                </FormField>

                <FormField label="Sobre el mínimo (%)" id="pref-yellow-above">
                  <input
                    id="pref-yellow-above"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="0"
                    max="50"
                    value={aboveMarginInput}
                    onChange={(e) => {
                      setAboveMarginInput(e.target.value);
                      setSettingsSaved(false);
                    }}
                    className="w-full min-w-0 min-h-[44px] px-3 rounded-xl border border-slate-200 text-base sm:text-sm font-mono tabular-nums text-slate-900 focus:outline-2 focus:outline-blue-700"
                  />
                </FormField>
              </div>

              <p className="text-xs text-slate-600 font-mono tabular-nums">
                Ejemplo con escala {previewMax} (mín. {previewMin}): Rojo &lt; {yellowStart} · Amarillo {yellowStart}–{greenStart} · Verde ≥ {greenStart}
              </p>
            </div>

            {settingsError ? (
              <p role="alert" className="text-sm text-red-700">
                {settingsError}
              </p>
            ) : null}

            <Button type="submit" size="lg" fullWidth>
              Guardar preferencias
            </Button>
          </form>
        </SurfaceCard>

        {/* 3. Aplicación instalada y modo sin conexión (PWA) */}
        <SurfaceCard className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-900">
                <Smartphone className="w-4 h-4 text-slate-500" aria-hidden="true" />
                <h2 className="text-base font-semibold">Aplicación en dispositivo (PWA)</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {isInstalled
                  ? 'Aplicación instalada en modo independiente y lista para funcionar sin conexión con tus datos locales.'
                  : 'Instala Mi Control Académico en tu pantalla de inicio para abrirla como aplicación y consultar o registrar calificaciones sin conexión.'}
              </p>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                Estado de red: {isOnline ? 'En línea' : 'Sin conexión (modo local activo)'}
              </p>
            </div>

            {isInstalled ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 shrink-0">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>Instalada</span>
              </span>
            ) : isInstallable || isIOS ? (
              <div className="shrink-0">
                <PWAInstallButton />
              </div>
            ) : (
              <p className="text-xs text-slate-500 sm:text-right max-w-xs">
                Puedes instalarla desde el menú de tu navegador usando «Instalar aplicación» o «Agregar a pantalla de inicio».
              </p>
            )}
          </div>
        </SurfaceCard>

        {/* 4. Plantillas de categorías y Restablecimiento */}
        <SurfaceCard className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-900">
                <FolderKanban className="w-4 h-4 text-slate-500" aria-hidden="true" />
                <h2 className="text-base font-semibold">Plantillas de categorías y reinicio</h2>
              </div>
              <p className="text-sm text-slate-600">
                {database.settings.categoryTemplates.map((template) => template.name).join(' · ')}
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={() => setIsResetSheetOpen(true)}
              className="shrink-0"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Restablecer datos locales</span>
            </Button>
          </div>
        </SurfaceCard>
      </div>

      {/* Confirmación antes de sobrescribir datos existentes al importar */}
      <AdaptiveSheet
        open={Boolean(pendingImport)}
        onClose={() => setPendingImport(null)}
        title="Confirmar importación de respaldo"
        description="Ya existen datos guardados en este dispositivo. Si continúas, se reemplazarán por el contenido del archivo."
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <Button
              variant="secondary"
              onClick={() => setPendingImport(null)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={handleConfirmOverwriteImport}
              className="w-full sm:w-auto"
            >
              Sobrescribir e importar
            </Button>
          </div>
        }
      >
        {pendingImport ? (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="leading-relaxed">
                Esta acción sobrescribirá tus ciclos, semestres, materias, evaluaciones y preferencias actuales.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Datos actuales
                </p>
                <p className="font-mono text-xs text-slate-700 tabular-nums">
                  {counts.cycles} ciclos · {counts.semesters} semestres
                </p>
                <p className="font-mono text-xs text-slate-700 tabular-nums">
                  {counts.subjects} materias · {counts.evaluations} evaluaciones
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Archivo a importar
                </p>
                <p className="font-mono text-xs text-slate-900 tabular-nums">
                  {pendingImport.counts.cycles} ciclos · {pendingImport.counts.semesters} semestres
                </p>
                <p className="font-mono text-xs text-slate-900 tabular-nums">
                  {pendingImport.counts.subjects} materias · {pendingImport.counts.evaluations} evaluaciones
                </p>
                {pendingImport.exportedAt ? (
                  <p className="text-xs text-slate-500">
                    Exportado: {formatDateTime(pendingImport.exportedAt)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </AdaptiveSheet>

      {/* Confirmación de restablecimiento local */}
      <AdaptiveSheet
        open={isResetSheetOpen}
        onClose={() => setIsResetSheetOpen(false)}
        title="Restablecer almacenamiento local"
        description="Esta acción restaura los valores predeterminados y limpia todos los datos locales guardados."
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <Button
              variant="secondary"
              onClick={() => setIsResetSheetOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={handleConfirmReset}
              className="w-full sm:w-auto"
            >
              Confirmar restablecimiento
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Se eliminarán tus ciclos, semestres, materias y calificaciones guardadas en este navegador. Exporta un respaldo JSON antes si deseas conservar una copia.
        </p>
      </AdaptiveSheet>
    </div>
  );
}
