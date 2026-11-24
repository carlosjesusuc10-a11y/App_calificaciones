import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-700 text-white hover:bg-blue-800 active:bg-blue-900 shadow-sm shadow-blue-900/10',
  secondary:
    'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 active:bg-slate-100',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200',
  danger:
    'bg-red-700 text-white hover:bg-red-800 active:bg-red-900',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'min-h-[44px] px-4 py-2 text-sm',
  lg: 'min-h-[48px] px-6 py-3 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap shrink-0',
        'transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700',
        'disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
