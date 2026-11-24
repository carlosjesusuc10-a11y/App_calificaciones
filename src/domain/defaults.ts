import type {
  AcademicDatabase,
  AcademicSettings,
  CategoryTemplate,
  GradingScaleConfig,
} from '../types/academic';

export const CURRENT_SCHEMA_VERSION = 2;

export const SCALE_PRESETS: Record<'10' | '100', GradingScaleConfig> = {
  '10': {
    preset: '10',
    maxGrade: 10,
    minPassingGrade: 6,
  },
  '100': {
    preset: '100',
    maxGrade: 100,
    minPassingGrade: 70,
  },
};

export const DEFAULT_CATEGORY_TEMPLATES: CategoryTemplate[] = [
  { id: 'tpl-ada', name: 'ADA', isCustom: false },
  { id: 'tpl-proyecto', name: 'Proyecto', isCustom: false },
  { id: 'tpl-examen', name: 'Examen', isCustom: false },
  { id: 'tpl-tarea', name: 'Tarea', isCustom: false },
  { id: 'tpl-practica', name: 'Práctica', isCustom: false },
  { id: 'tpl-participacion', name: 'Participación', isCustom: false },
  { id: 'tpl-otro', name: 'Otro', isCustom: false },
];

export const DEFAULT_SETTINGS: AcademicSettings = {
  yellowZone: {
    belowPassingMarginPercent: 10,
    abovePassingRiskMarginPercent: 0,
  },
  defaultScale: {
    preset: '100',
    maxGrade: 100,
    minPassingGrade: 70,
  },
  defaultEvaluationSystem: 'points',
  categoryTemplates: DEFAULT_CATEGORY_TEMPLATES.map((template) => ({ ...template })),
};

export function createEmptyDatabase(): AcademicDatabase {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    navigationState: {
      activeCycleId: null,
      activeSemesterId: null,
    },
    entities: {
      cycles: {},
      semesters: {},
      subjects: {},
      categories: {},
      evaluations: {},
    },
    settings: {
      yellowZone: { ...DEFAULT_SETTINGS.yellowZone },
      defaultScale: { ...DEFAULT_SETTINGS.defaultScale },
      defaultEvaluationSystem: DEFAULT_SETTINGS.defaultEvaluationSystem,
      categoryTemplates: DEFAULT_SETTINGS.categoryTemplates.map((template) => ({ ...template })),
    },
  };
}
