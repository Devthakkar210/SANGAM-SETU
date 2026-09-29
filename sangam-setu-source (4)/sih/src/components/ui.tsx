import { AnimatePresence, motion, useInView, animate } from 'framer-motion'
import { X, CheckCircle2, Info, AlertTriangle, XCircle, Sparkles, Plug } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type HTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { useStore } from '../store/AppStore'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type BtnVariant = 'primary' | 'saffron' | 'ghost' | 'outline' | 'danger' | 'success' | 'soft'
export function Button({ variant = 'primary', size = 'md', className, children, icon, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode }) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-navy-900 text-white hover:bg-navy-800 shadow-sm',
    saffron: 'bg-saffron-500 text-navy-950 hover:bg-saffron-400 shadow-sm',
    ghost: 'text-navy-800 hover:bg-navy-50',
    outline: 'border border-navy-100 bg-white text-navy-900 hover:border-navy-600/40 hover:bg-navy-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-leaf-600 text-white hover:bg-leaf-700',
    soft: 'bg-navy-50 text-navy-800 hover:bg-navy-100',
  }
  const s = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-[15px]' }[size]
  return (
    <button className={cx('inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed', v[variant], s, className)} {...rest}>
      {icon}{children}
    </button>
  )
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-xl border border-navy-100/80 bg-white shadow-card', className)} {...rest}>{children}</div>
}

const tone: Record<string, string> = {
  green: 'bg-leaf-50 text-leaf-700 ring-leaf-600/20',
  amber: 'bg-saffron-50 text-saffron-700 ring-saffron-500/25',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  navy: 'bg-navy-50 text-navy-800 ring-navy-600/20',
  gray: 'bg-slate-100 text-slate-600 ring-slate-400/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-500/20',
}
export function Badge({ children, color = 'navy', className }: { children: ReactNode; color?: keyof typeof tone | string; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', tone[color] ?? tone.navy, className)}>{children}</span>
}

export function statusColor(s: string) {
  if (/Disbursed|Verified|Selected|Resolved|Closed|Approved|Live|Completed|Credited/.test(s)) return 'green'
  if (/Correction|Needs|Failed|Not Selected|Open|high/.test(s)) return 'red'
  if (/Waitlisted|Further|Pending|Processing|Review|medium|Assigned|Draft|Routed/.test(s)) return 'amber'
  return 'navy'
}
export const StatusPill = ({ s }: { s: string }) => <Badge color={statusColor(s)}>{s}</Badge>

export function AIBadge({ label = 'AI-assisted' }: { label?: string }) {
  return <Badge color="violet"><Sparkles size={12} aria-hidden />{label}</Badge>
}
export function ProtoTag({ label = 'Prototype Integration' }: { label?: string }) {
  return <Badge color="gray"><Plug size={12} aria-hidden />{label}</Badge>
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy-950 sm:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm text-slate-600">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={title}
            className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-lift sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
            initial={{ y: 30, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onMouseDown={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-navy-100 bg-white px-5 py-4">
              <h2 className="font-display text-lg font-bold text-navy-950">{title}</h2>
              <button onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-slate-500 hover:bg-navy-50"><X size={18} /></button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-navy-900">{children}{hint && <span className="ml-1 font-normal text-slate-500">{hint}</span>}</label>
}
export function Input({ className, error, ...rest }: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <>
      <input aria-invalid={!!error} className={cx('h-10 w-full rounded-lg border bg-white px-3 text-sm text-ink outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15', error ? 'border-red-400' : 'border-navy-100', className)} {...rest} />
      {error && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </>
  )
}
export function Select({ className, options, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }) {
  return (
    <select className={cx('h-10 w-full rounded-lg border border-navy-100 bg-white px-3 text-sm text-ink outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15', className)} {...rest}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  )
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx('w-full rounded-lg border border-navy-100 bg-white p-3 text-sm outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15', props.className)} />
}

export function Counter({ to, prefix = '', suffix = '', decimals = 0 }: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const { lowBandwidth } = useStore()
  const [v, setV] = useState(lowBandwidth ? to : 0)
  useEffect(() => {
    if (!inView || lowBandwidth) { if (lowBandwidth) setV(to); return }
    const c = animate(0, to, { duration: 1.6, ease: 'easeOut', onUpdate: setV })
    return () => c.stop()
  }, [inView, to, lowBandwidth])
  return <span ref={ref}>{prefix}{v.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}{suffix}</span>
}

export function Progress({ value, color = 'bg-saffron-500', className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-navy-50', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className={cx('h-full rounded-full', color)} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.6 }} />
    </div>
  )
}

export function Stat({ label, value, icon, tone: t = 'navy', sub, onClick }: { label: string; value: ReactNode; icon?: ReactNode; tone?: 'navy' | 'saffron' | 'leaf' | 'red' | 'violet'; sub?: ReactNode; onClick?: () => void }) {
  const ic = { navy: 'bg-navy-50 text-navy-800', saffron: 'bg-saffron-50 text-saffron-700', leaf: 'bg-leaf-50 text-leaf-700', red: 'bg-red-50 text-red-600', violet: 'bg-violet-50 text-violet-700' }[t]
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp onClick={onClick} className={cx('flex w-full items-start gap-3 rounded-xl border border-navy-100/80 bg-white p-4 text-left shadow-card', onClick && 'transition hover:border-navy-600/30')}>
      {icon && <div className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-lg', ic)}>{icon}</div>}
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-slate-500">{label}</div>
        <div className="font-display text-2xl font-bold tabular-nums text-navy-950">{value}</div>
        {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
      </div>
    </Comp>
  )
}

export function Toaster() {
  const { toasts } = useStore()
  const icon = { success: <CheckCircle2 className="text-leaf-500" size={18} />, info: <Info className="text-navy-600" size={18} />, warning: <AlertTriangle className="text-saffron-500" size={18} />, error: <XCircle className="text-red-500" size={18} /> }
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 top-4 z-[90] flex w-[min(92vw,380px)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-950 shadow-lift">
            <span className="mt-0.5">{icon[t.kind]}</span><span>{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-navy-100 bg-white p-10 text-center">
      <p className="font-display text-lg font-bold text-navy-950">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead><tr className="border-b border-navy-100 text-xs font-semibold text-slate-500">{head.map((h) => <th key={h} scope="col" className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-navy-50">{children}</tbody>
      </table>
    </div>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  const pillId = useId()
  return (
    <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-lg bg-navy-50 p-1">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cx('relative rounded-md px-3 py-1.5 text-[13px] font-semibold transition', value === t.id ? 'text-navy-950' : 'text-slate-500 hover:text-navy-800')}>
          {value === t.id && <motion.span layoutId={`tabpill-${pillId}`} className="absolute inset-0 rounded-md bg-white shadow-sm" />}
          <span className="relative">{t.label}</span>
        </button>
      ))}
    </div>
  )
}
