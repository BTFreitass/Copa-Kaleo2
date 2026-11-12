import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Loader2, X } from 'lucide-react';
import type { TeamSnapshot } from '@copa/shared';
import { cn, initials } from '../utils/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const variants: Record<Variant, string> = {
  primary: 'bg-gradient-brand text-snow shadow-lg shadow-purple-900/30 hover:brightness-110',
  secondary: 'bg-gray-800 text-gray-100 hover:bg-gray-700 border border-gray-700',
  ghost: 'text-gray-300 hover:bg-gray-800 hover:text-white',
  danger: 'bg-red-600 text-snow hover:bg-red-500',
  success: 'bg-emerald-600 text-snow hover:bg-emerald-500',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  xl: 'h-20 px-6 text-lg gap-3',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...props },
  refButton,
) {
  return (
    <button
      ref={refButton}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function Card({ className, children, as: Tag = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article' }) {
  return <Tag className={cn('rounded-2xl border border-gray-800 bg-gray-900/70 backdrop-blur', className)}>{children}</Tag>;
}

export function Badge({ children, tone = 'gray', className }: { children: ReactNode; tone?: 'gray' | 'red' | 'green' | 'blue' | 'purple' | 'yellow'; className?: string }) {
  const tones = {
    gray: 'bg-gray-800 text-gray-300',
    red: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    blue: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30',
    purple: 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30',
    yellow: 'bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>;
}

export function LiveDot() {
  return (
    <span className="relative flex size-2.5">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
    </span>
  );
}

const fieldClass =
  'w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, r) {
  return <input ref={r} className={cn(fieldClass, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, r) {
  return <textarea ref={r} className={cn(fieldClass, 'min-h-28', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, r) {
  return <select ref={r} className={cn(fieldClass, 'appearance-none', className)} {...props} />;
});

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      {children}
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-gray-800 bg-gray-900 p-6 shadow-2xl animate-pop sm:rounded-3xl',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-md',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="text-lg font-bold text-white">{title}</h2>}
          <button onClick={onClose} className="ml-auto rounded-full p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-900 p-1 ring-1 ring-gray-800">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition',
            value === t.id ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-gray-200',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-gray-800/70', className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-6 animate-spin text-purple-400', className)} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-800 px-6 py-12 text-center">
      {icon && <div className="text-gray-600 [&>svg]:size-10">{icon}</div>}
      <p className="font-semibold text-gray-200">{title}</p>
      {description && <p className="max-w-sm text-sm text-gray-500">{description}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, icon, actions }: { title: string; subtitle?: string; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        {icon && <div className="rounded-2xl bg-gradient-brand p-2.5 text-snow [&>svg]:size-6">{icon}</div>}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'size-7 text-[10px]', md: 'size-9 text-xs', lg: 'size-16 text-lg' }[size];
  if (src) return <img src={src} alt={name} className={cn('rounded-full object-cover ring-2 ring-gray-800', s)} />;
  return <span className={cn('inline-flex items-center justify-center rounded-full bg-gradient-brand font-bold text-snow', s)}>{initials(name) || '?'}</span>;
}

export function TeamCrest({ team, size = 'md' }: { team: Pick<TeamSnapshot, 'name' | 'shortName' | 'logoUrl' | 'primaryColor'> | null; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }) {
  const s = { xs: 'size-5 text-[8px]', sm: 'size-7 text-[9px]', md: 'size-10 text-xs', lg: 'size-16 text-base', xl: 'size-28 text-2xl' }[size];
  if (!team) return <span className={cn('inline-flex items-center justify-center rounded-full border border-dashed border-gray-700 text-gray-600', s)}>?</span>;
  if (team.logoUrl) return <img src={team.logoUrl} alt={team.name} className={cn('rounded-full bg-gray-800 object-cover', s)} />;
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full font-black text-snow shadow-inner', s)} style={{ background: team.primaryColor }}>
      {team.shortName.slice(0, 3)}
    </span>
  );
}

interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}

const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto animate-pop rounded-xl px-4 py-3 text-sm font-semibold shadow-2xl',
              t.tone === 'success' && 'bg-emerald-600 text-snow',
              t.tone === 'error' && 'bg-red-600 text-snow',
              t.tone === 'info' && 'bg-gray-800 text-white ring-1 ring-gray-700',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export function Stat({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 [&>svg]:size-4">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
    </div>
  );
}
