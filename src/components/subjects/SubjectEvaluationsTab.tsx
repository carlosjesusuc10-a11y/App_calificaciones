import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAcademicStore } from '../../hooks/useAcademicStore';
import {
  selectCategoriesBySubject,
  selectEvaluationsBySubject,
} from '../../state/selectors';
import type { EntityId, Evaluation, Subject, SubjectCategory } from '../../types/academic';
import { CategoryForm } from '../forms/CategoryForm';
import { EvaluationForm, type EvaluationFormValues } from '../forms/EvaluationForm';
import { QuickGradeForm } from '../forms/QuickGradeForm';
import { AdaptiveSheet } from '../layout/AdaptiveSheet';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { SurfaceCard } from '../ui/SurfaceCard';

interface SubjectEvaluationsTabProps {
  subject: Subject;
}

type EvalModalState =
  | { mode: 'closed' }
  | { mode: 'create-evaluation'; defaultCategoryId?: EntityId }
  | { mode: 'edit-evaluation'; evaluation: Evaluation }
  | { mode: 'quick-grade'; evaluation: Evaluation }
  | { mode: 'delete-evaluation'; evaluation: Evaluation }
  | { mode: 'manage-categories' }
  | { mode: 'create-category' }
  | { mode: 'edit-category'; category: SubjectCategory };

function roundTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function SubjectEvaluationsTab({ subject }: SubjectEvaluationsTabProps) {
  const { database, dispatch } = useAcademicStore();
  const [modalState, setModalState] = useState<EvalModalState>({ mode: 'closed' });

  const categories = useMemo(
    () => selectCategoriesBySubject(database, subject.id),
    [database, subject.id],
  );

  const evaluations = useMemo(
    () => selectEvaluationsBySubject(database, subject.id),
    [database, subject.id],
  );

  const closeModal = () => setModalState({ mode: 'closed' });

  const groupedByCategory = useMemo(() => {
    const map = new Map<EntityId, Evaluation[]>();
    for (const evaluation of evaluations) {
      const list = map.get(evaluation.categoryId) ?? [];
      list.push(evaluation);
      map.set(evaluation.categoryId, list);
    }

    return categories
      .map((category) => {
        const items = map.get(category.id) ?? [];
        const obtained = items.reduce(
          (sum, item) =>
            item.status === 'graded' && item.obtainedScore !== null
              ? sum + item.obtainedScore
              : sum,
          0,
        );
        const gradedMax = items.reduce(
          (sum, item) => (item.status === 'graded' ? sum + item.maxScore : sum),
          0,
        );
        const totalMax = items.reduce((sum, item) => sum + item.maxScore, 0);

        return {
          category,
          items,
          obtained: roundTwo(obtained),
          gradedMax: roundTwo(gradedMax),
          totalMax: roundTwo(totalMax),
        };
      })
      .filter((group) => group.items.length > 0);
  }, [categories, evaluations]);

  const gradedCount = evaluations.filter((item) => item.status === 'graded').length;
  const pendingCount = evaluations.length - gradedCount;
  const isPercentageSystem = subject.evaluationSystem === 'percentage';
  const totalConfiguredWeight = useMemo(
    () =>
      roundTwo(
        categories.reduce(
          (sum, cat) =>
            sum + (typeof cat.weightPercentage === 'number' ? cat.weightPercentage : 0),
          0,
        ),
      ),
    [categories],
  );

  const handleInlineCreateCategory = (name: string) => {
    dispatch({
      type: 'CREATE_CATEGORY',
      payload: { subjectId: subject.id, name },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-600 font-mono tabular-nums">
          {evaluations.length}{' '}
          {evaluations.length === 1 ? 'evaluación' : 'evaluaciones'} · {gradedCount}{' '}
          {gradedCount === 1 ? 'calificada' : 'calificadas'} · {pendingCount}{' '}
          {pendingCount === 1 ? 'pendiente' : 'pendientes'}
        </p>

        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:flex sm:items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => setModalState({ mode: 'manage-categories' })}
            className="w-full sm:w-auto"
          >
            <FolderKanban className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
            <span>Categorías ({categories.length})</span>
          </Button>
          <Button
            size="lg"
            onClick={() => setModalState({ mode: 'create-evaluation' })}
            className="w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>Nueva evaluación</span>
          </Button>
        </div>
      </div>

      {evaluations.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-6 h-6" aria-hidden="true" />}
          title="Aún no hay evaluaciones registradas"
          description="Registra tus ADAs, proyectos, exámenes, tareas o prácticas. Puedes guardarlas como pendientes y calificarlas rápido con un toque."
          action={
            <Button
              size="lg"
              onClick={() => setModalState({ mode: 'create-evaluation' })}
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
              <span>Agregar primera evaluación</span>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {groupedByCategory.map(({ category, items, obtained, totalMax }) => (
            <SurfaceCard key={category.id}>
              <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h3 className="text-base font-semibold text-slate-900 truncate">
                      {category.name}
                    </h3>
                    {isPercentageSystem &&
                    typeof category.weightPercentage === 'number' &&
                    category.weightPercentage > 0 ? (
                      <span className="text-xs font-mono font-semibold text-blue-700 tabular-nums shrink-0">
                        Peso {category.weightPercentage}%
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                    {items.length} {items.length === 1 ? 'actividad' : 'actividades'} · Subtotal{' '}
                    {obtained} / {totalMax}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  onClick={() =>
                    setModalState({
                      mode: 'create-evaluation',
                      defaultCategoryId: category.id,
                    })
                  }
                  aria-label={`Agregar evaluación en ${category.name}`}
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Agregar</span>
                </Button>
              </div>

              <ul className="divide-y divide-slate-100">
                {items.map((evaluation) => {
                  const isGraded =
                    evaluation.status === 'graded' && evaluation.obtainedScore !== null;

                  return (
                    <li
                      key={evaluation.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className="text-sm font-medium text-slate-900 break-words">
                            {evaluation.name}
                          </span>
                          {isGraded ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>Calificada</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 shrink-0">
                              <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>Pendiente</span>
                            </span>
                          )}
                        </div>

                        {evaluation.date || evaluation.notes ? (
                          <p className="text-xs text-slate-500 line-clamp-2 sm:truncate">
                            {[evaluation.date, evaluation.notes].filter(Boolean).join(' · ')}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              setModalState({ mode: 'quick-grade', evaluation })
                            }
                            aria-label={`Calificar ${evaluation.name}`}
                            className="min-h-[44px] px-3 rounded-xl font-mono tabular-nums text-sm font-semibold text-slate-900 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {isGraded ? evaluation.obtainedScore : '—'} / {evaluation.maxScore}
                          </button>

                          {isGraded ? (
                            <Button
                              variant="ghost"
                              onClick={() =>
                                dispatch({
                                  type: 'MARK_EVALUATION_PENDING',
                                  payload: { id: evaluation.id },
                                })
                              }
                              aria-label={`Marcar ${evaluation.name} como pendiente`}
                              className="px-2.5 sm:px-4"
                            >
                              Pendiente
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() =>
                                setModalState({ mode: 'quick-grade', evaluation })
                              }
                              className="px-3 sm:px-4"
                            >
                              Calificar
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setModalState({ mode: 'edit-evaluation', evaluation })
                            }
                            aria-label={`Editar ${evaluation.name}`}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setModalState({ mode: 'delete-evaluation', evaluation })
                            }
                            aria-label={`Eliminar ${evaluation.name}`}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SurfaceCard>
          ))}
        </div>
      )}

      {/* Crear evaluación */}
      <AdaptiveSheet
        open={modalState.mode === 'create-evaluation'}
        onClose={closeModal}
        title="Nueva evaluación"
        description={subject.name}
      >
        {modalState.mode === 'create-evaluation' ? (
          <EvaluationForm
            categories={categories}
            initialValues={{
              categoryId: modalState.defaultCategoryId ?? categories[0]?.id ?? '',
              name: '',
              maxScore: 10,
              obtainedScore: null,
              status: 'graded',
              date: '',
              notes: '',
            }}
            submitLabel="Guardar evaluación"
            onCreateCategory={handleInlineCreateCategory}
            onSubmit={(values: EvaluationFormValues) => {
              dispatch({
                type: 'CREATE_EVALUATION',
                payload: {
                  subjectId: subject.id,
                  ...values,
                },
              });
              closeModal();
            }}
            onCancel={closeModal}
          />
        ) : null}
      </AdaptiveSheet>

      {/* Editar evaluación */}
      <AdaptiveSheet
        open={modalState.mode === 'edit-evaluation'}
        onClose={closeModal}
        title="Editar evaluación"
        description={subject.name}
      >
        {modalState.mode === 'edit-evaluation' ? (
          <EvaluationForm
            categories={categories}
            initialValues={{
              categoryId: modalState.evaluation.categoryId,
              name: modalState.evaluation.name,
              maxScore: modalState.evaluation.maxScore,
              obtainedScore: modalState.evaluation.obtainedScore,
              status: modalState.evaluation.status,
              date: modalState.evaluation.date,
              notes: modalState.evaluation.notes,
            }}
            submitLabel="Guardar cambios"
            onCreateCategory={handleInlineCreateCategory}
            onSubmit={(values: EvaluationFormValues) => {
              dispatch({
                type: 'UPDATE_EVALUATION',
                payload: {
                  id: modalState.evaluation.id,
                  ...values,
                },
              });
              closeModal();
            }}
            onCancel={closeModal}
          />
        ) : null}
      </AdaptiveSheet>

      {/* Calificación rápida móvil */}
      <AdaptiveSheet
        open={modalState.mode === 'quick-grade'}
        onClose={closeModal}
        title={
          modalState.mode === 'quick-grade'
            ? modalState.evaluation.name
            : 'Calificar'
        }
        description={
          modalState.mode === 'quick-grade'
            ? `Introduce la calificación obtenida sobre ${modalState.evaluation.maxScore}`
            : undefined
        }
      >
        {modalState.mode === 'quick-grade' ? (
          <QuickGradeForm
            evaluation={modalState.evaluation}
            onSubmit={(score) => {
              dispatch({
                type: 'GRADE_EVALUATION',
                payload: { id: modalState.evaluation.id, obtainedScore: score },
              });
              closeModal();
            }}
            onCancel={closeModal}
          />
        ) : null}
      </AdaptiveSheet>

      {/* Confirmar eliminación de evaluación */}
      <AdaptiveSheet
        open={modalState.mode === 'delete-evaluation'}
        onClose={closeModal}
        title="Eliminar evaluación"
        description={
          modalState.mode === 'delete-evaluation'
            ? `¿Confirmas eliminar "${modalState.evaluation.name}"?`
            : undefined
        }
        footer={
          modalState.mode === 'delete-evaluation' ? (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <Button variant="secondary" onClick={closeModal} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="lg"
                onClick={() => {
                  dispatch({
                    type: 'DELETE_EVALUATION',
                    payload: { id: modalState.evaluation.id },
                  });
                  closeModal();
                }}
                className="w-full sm:w-auto"
              >
                Eliminar evaluación
              </Button>
            </div>
          ) : null
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Esta evaluación se borrará permanentemente y se recalculará el promedio de la materia.
        </p>
      </AdaptiveSheet>

      {/* Gestor de categorías */}
      <AdaptiveSheet
        open={modalState.mode === 'manage-categories'}
        onClose={closeModal}
        title="Categorías de la materia"
        description={
          isPercentageSystem
            ? 'Administra categorías y asigna el porcentaje de ponderación de cada una (ej. ADAs 30%, Proyecto 20%, Examen 50%).'
            : 'Administra las categorías predeterminadas o crea nuevas categorías personalizadas.'
        }
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <Button variant="ghost" onClick={closeModal} className="w-full sm:w-auto">
              Cerrar
            </Button>
            <Button
              size="lg"
              onClick={() => setModalState({ mode: 'create-category' })}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Nueva categoría</span>
            </Button>
          </div>
        }
      >
        {isPercentageSystem ? (
          <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600">
              {totalConfiguredWeight > 0
                ? 'Ponderación por categorías activa'
                : 'Sin porcentajes asignados (cálculo directo sobre 100)'}
            </span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              Total asignado: {totalConfiguredWeight}% / 100%
            </span>
          </div>
        ) : null}

        <ul className="divide-y divide-slate-100">
          {categories.map((category) => {
            const usageCount = evaluations.filter(
              (item) => item.categoryId === category.id,
            ).length;
            const canDelete = categories.length > 1 && !category.isDefaultFallback;

            return (
              <li
                key={category.id}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {category.name}
                    </p>
                    {isPercentageSystem &&
                    typeof category.weightPercentage === 'number' &&
                    category.weightPercentage > 0 ? (
                      <span className="text-xs font-mono font-semibold text-blue-700 tabular-nums shrink-0">
                        {category.weightPercentage}%
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500 font-mono tabular-nums">
                    {usageCount} {usageCount === 1 ? 'evaluación' : 'evaluaciones'}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalState({ mode: 'edit-category', category })}
                    aria-label={`Editar categoría ${category.name}`}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                  </button>

                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: 'DELETE_CATEGORY',
                          payload: { id: category.id },
                        })
                      }
                      aria-label={`Eliminar categoría ${category.name}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </AdaptiveSheet>

      {/* Crear categoría personalizada */}
      <AdaptiveSheet
        open={modalState.mode === 'create-category'}
        onClose={() => setModalState({ mode: 'manage-categories' })}
        title="Nueva categoría"
        description={subject.name}
      >
        {modalState.mode === 'create-category' ? (
          <CategoryForm
            showWeightField={isPercentageSystem}
            existingOtherWeightsTotal={totalConfiguredWeight}
            existingNamesInSubject={categories.map((category) => category.name)}
            submitLabel="Crear categoría"
            onSubmit={(name, weightPercentage) => {
              dispatch({
                type: 'CREATE_CATEGORY',
                payload: { subjectId: subject.id, name, weightPercentage },
              });
              setModalState({ mode: 'manage-categories' });
            }}
            onCancel={() => setModalState({ mode: 'manage-categories' })}
          />
        ) : null}
      </AdaptiveSheet>

      {/* Editar categoría */}
      <AdaptiveSheet
        open={modalState.mode === 'edit-category'}
        onClose={() => setModalState({ mode: 'manage-categories' })}
        title={isPercentageSystem ? 'Editar categoría' : 'Renombrar categoría'}
      >
        {modalState.mode === 'edit-category' ? (
          <CategoryForm
            initialName={modalState.category.name}
            initialWeightPercentage={modalState.category.weightPercentage}
            showWeightField={isPercentageSystem}
            existingOtherWeightsTotal={roundTwo(
              categories
                .filter((category) => category.id !== modalState.category.id)
                .reduce(
                  (sum, cat) =>
                    sum + (typeof cat.weightPercentage === 'number' ? cat.weightPercentage : 0),
                  0,
                ),
            )}
            existingNamesInSubject={categories
              .filter((category) => category.id !== modalState.category.id)
              .map((category) => category.name)}
            submitLabel="Guardar cambios"
            onSubmit={(name, weightPercentage) => {
              dispatch({
                type: 'UPDATE_CATEGORY',
                payload: { id: modalState.category.id, name, weightPercentage },
              });
              setModalState({ mode: 'manage-categories' });
            }}
            onCancel={() => setModalState({ mode: 'manage-categories' })}
          />
        ) : null}
      </AdaptiveSheet>
    </div>
  );
}
