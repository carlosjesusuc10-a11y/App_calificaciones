import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 sm:py-10 px-4 sm:px-6 bg-white border border-slate-200 rounded-2xl">
      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h2 className="text-base font-semibold text-slate-900 text-balance">{title}</h2>
      <p className="mt-2 text-sm text-slate-600 max-w-md leading-relaxed">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
