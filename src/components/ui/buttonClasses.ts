import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary:
    'border border-exec-500 bg-exec-500 text-ink-950 hover:border-exec-400 hover:bg-exec-400',
  secondary:
    'border border-ink-500 bg-raised text-fg shadow-raised hover:border-ink-400 hover:bg-ink-850',
  ghost: 'text-fg-muted hover:text-fg hover:bg-ink-750/80',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] whitespace-nowrap',
  md: 'h-10 px-4 text-sm whitespace-nowrap',
  /* Calls to action: wrap on small screens rather than overflow. */
  lg: 'min-h-12 rounded-lg px-5 py-2.5 text-center text-[16px] leading-snug',
};

export function buttonClasses(
  variant: ButtonVariant = 'secondary',
  size: ButtonSize = 'md',
  extra?: string,
) {
  return cn(base, variants[variant], sizes[size], extra);
}
