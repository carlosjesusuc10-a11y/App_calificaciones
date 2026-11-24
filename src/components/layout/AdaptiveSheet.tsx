import { useEffect, useId, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface AdaptiveSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AdaptiveSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: AdaptiveSheetProps) {
  const titleId = useId();
  const [viewportMaxHeight, setViewportMaxHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const updateViewportHeight = () => {
      const vv = window.visualViewport;
      const availableHeight = vv ? vv.height : window.innerHeight;
      setViewportMaxHeight(Math.max(260, Math.floor(availableHeight * 0.9)));
    };

    updateViewportHeight();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    window.visualViewport?.addEventListener('resize', updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        style={viewportMaxHeight ? { maxHeight: `${viewportMaxHeight}px` } : undefined}
        className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl max-h-[88dvh] flex flex-col overflow-hidden"
      >
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        <div className="px-4 sm:px-6 pt-2.5 sm:pt-5 pb-3.5 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm text-slate-600 leading-snug">{description}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div
          className={[
            'px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto overscroll-contain scroll-pb-6 flex-1 min-h-0',
            !footer ? 'pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </div>

        {footer ? (
          <div className="px-4 sm:px-6 pt-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] sm:py-4 border-t border-slate-100 bg-slate-50/80 sm:rounded-b-2xl shrink-0">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
