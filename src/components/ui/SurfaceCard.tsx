import type { ReactNode } from 'react';

interface SurfaceCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'compact' | 'normal' | 'spacious';
}

const PADDING_CLASSES = {
  compact: 'p-3.5 sm:p-4',
  normal: 'p-4 sm:p-6',
  spacious: 'p-5 sm:p-8',
};

export function SurfaceCard({
  children,
  className = '',
  padding = 'normal',
}: SurfaceCardProps) {
  return (
    <section
      className={[
        'bg-white border border-slate-200 rounded-2xl',
        PADDING_CLASSES[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  );
}
