import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store/AppStore'
import { NAV, type Portal } from '../Layouts'
import { Logo } from '../Widgets'
import { Badge, cx } from '../ui'

/*
 * A simplified, non-interactive replica of a real Sangam Setu screen, used by the product tour.
 * The sidebar comes from the real portal navigation (NAV), so menu names always match the app.
 * <Spot> draws the highlight ring and a short callout on the part of the screen the step is about.
 */

export type ScreenPortal = Portal | 'public'

const PUBLIC_LINKS = ['home', 'schemes', 'eligibility', 'notifications', 'faqs', 'grievance']

export function TourFrame({ portal, url, active, spotNav, children }: { portal: ScreenPortal; url: string; active?: string; spotNav?: boolean; children: ReactNode }) {
  const { t } = useStore()
  const items = portal === 'public' ? [] : NAV[portal]
  const activeItem = items.find((i) => i.to === active)
  return (
    <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-lift">
      {/* window bar with the real route */}
      <div className="flex items-center gap-2 border-b border-navy-100 bg-navy-50 px-3 py-2">
        <span className="flex gap-1" aria-hidden>{[0, 1, 2].map((k) => <span key={k} className="h-2.5 w-2.5 rounded-full bg-navy-100" />)}</span>
        <span className="min-w-0 flex-1 truncate rounded-md bg-white px-2.5 py-1 text-[11.5px] text-slate-500">sangam-setu / #{url}</span>
      </div>
      {portal === 'public' ? (
        <div className="bg-paper">
          <div className="flex items-center gap-3 border-b border-navy-100/70 bg-white px-4 py-2.5">
            <span className="inline-block origin-left scale-90"><Logo compact /></span>
            <div className="hidden flex-1 gap-1 md:flex">
              {PUBLIC_LINKS.map((k) => {
                const on = active === k
                return <span key={k} className={cx('rounded-md px-2 py-1 text-[11.5px] font-medium', on ? 'bg-navy-50 text-navy-950' : 'text-slate-500', on && spotNav && 'ring-2 ring-saffron-500')}>{t(k)}</span>
              })}
            </div>
            <span className="ml-auto rounded-md bg-navy-900 px-2.5 py-1 text-[11px] font-semibold text-white">{t('login')}</span>
          </div>
          <div className="min-h-[340px] p-4 sm:p-5">{children}</div>
        </div>
      ) : (
        <div className="flex bg-paper">
          <aside className="hidden w-44 shrink-0 bg-navy-950 p-2.5 sm:block" aria-hidden>
            <div className="mb-2 px-1.5 pt-1"><span className="inline-block origin-left scale-75"><Logo light compact /></span></div>
            <p className="mb-2 rounded-md bg-white/5 px-2 py-1 text-[10px] font-semibold text-saffron-400">{portal === 'student' ? 'Student Portal' : portal === 'institution' ? 'Institution Portal' : 'MoTA Administration'}</p>
            <ul className="space-y-0.5">
              {items.map((i) => {
                const on = i.to === active
                return (
                  <li key={i.to} className={cx('flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium [&_svg]:h-3.5 [&_svg]:w-3.5', on ? 'bg-white text-navy-950' : 'text-navy-100', on && spotNav && 'ring-2 ring-saffron-500 ring-offset-2 ring-offset-navy-950')}>
                    {i.icon}<span className="truncate">{t(i.k)}</span>
                  </li>
                )
              })}
            </ul>
          </aside>
          <div className="min-w-0 flex-1">
            {/* phones: the sidebar is hidden, so show where we are */}
            {activeItem && <div className="flex items-center gap-2 border-b border-navy-100 bg-white px-3 py-2 text-[11.5px] font-semibold text-navy-900 sm:hidden [&_svg]:h-3.5 [&_svg]:w-3.5">{activeItem.icon}{t(activeItem.k)}</div>}
            <div className="min-h-[340px] p-4 sm:p-5">{children}</div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Highlight ring + callout. Only one Spot per scene should be `on`. */
export function Spot({ on = true, note, children, className }: { on?: boolean; note?: string; children: ReactNode; className?: string }) {
  if (!on) return <div className={className}>{children}</div>
  return (
    <motion.div initial={{ scale: 0.985 }} animate={{ scale: 1 }} transition={{ duration: 0.35 }} className={cx('relative rounded-xl ring-2 ring-saffron-500 ring-offset-2 ring-offset-paper', className)}>
      {children}
      {note && (
        <span className="absolute -top-3 right-3 z-10 max-w-[80%] truncate rounded-full bg-saffron-500 px-2.5 py-0.5 text-[10.5px] font-bold text-navy-950 shadow-sm">{note}</span>
      )}
    </motion.div>
  )
}

/* ---------- small building blocks that echo the real components ---------- */

export const MkTitle = ({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) => (
  <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
    <div className="min-w-0"><p className="font-display text-[17px] font-bold leading-tight text-navy-950">{title}</p>{sub && <p className="mt-0.5 text-[11.5px] text-slate-500">{sub}</p>}</div>
    {action}
  </div>
)

export const MkCard = ({ title, children, className }: { title?: string; children: ReactNode; className?: string }) => (
  <div className={cx('rounded-xl border border-navy-100/80 bg-white p-3 shadow-card', className)}>
    {title && <p className="mb-2 text-[12px] font-bold text-navy-950">{title}</p>}
    {children}
  </div>
)

const STAT_TONE = { navy: 'text-navy-900', saffron: 'text-saffron-700', leaf: 'text-leaf-700', red: 'text-red-700', violet: 'text-violet-700' }
export const MkStat = ({ label, value, tone = 'navy' }: { label: string; value: string; tone?: keyof typeof STAT_TONE }) => (
  <div className="rounded-xl border border-navy-100/80 bg-white p-2.5 shadow-card">
    <p className="truncate text-[10.5px] text-slate-500">{label}</p>
    <p className={cx('mt-0.5 font-display text-lg font-extrabold tabular-nums leading-tight', STAT_TONE[tone])}>{value}</p>
  </div>
)

export const MkBtn = ({ children, v = 'primary' }: { children: ReactNode; v?: 'primary' | 'saffron' | 'outline' | 'success' | 'danger' | 'soft' }) => {
  const c = { primary: 'bg-navy-900 text-white', saffron: 'bg-saffron-500 text-navy-950', outline: 'border border-navy-100 bg-white text-navy-900', success: 'bg-leaf-600 text-white', danger: 'bg-red-600 text-white', soft: 'bg-navy-50 text-navy-800' }[v]
  return <span className={cx('inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md px-2.5 text-[11px] font-semibold', c)}>{children}</span>
}

export const MkRow = ({ left, sub, right }: { left: ReactNode; sub?: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center gap-2 border-b border-navy-50 py-1.5 last:border-0">
    <div className="min-w-0 flex-1"><p className="truncate text-[11.5px] font-semibold text-navy-950">{left}</p>{sub && <p className="truncate text-[10.5px] text-slate-500">{sub}</p>}</div>
    {right && <div className="shrink-0">{right}</div>}
  </div>
)

export const MkField = ({ label, value, locked }: { label: string; value: string; locked?: string }) => (
  <div className="min-w-0">
    <p className="text-[10.5px] text-slate-500">{label}</p>
    <div className="mt-0.5 flex items-center justify-between gap-2 rounded-md border border-navy-100 bg-white px-2 py-1.5 text-[11.5px] text-navy-950">
      <span className="truncate">{value}</span>{locked && <Badge color="green" className="!px-1.5 !text-[9.5px]">{locked}</Badge>}
    </div>
  </div>
)

export const MkBar = ({ value, tone = 'bg-saffron-500' }: { value: number; tone?: string }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-50"><div className={cx('h-full rounded-full', tone)} style={{ width: `${value}%` }} /></div>
)

/** A horizontal stage timeline like the real tracker. `at` = index of the current stage. */
export const MkStages = ({ stages, at }: { stages: string[]; at: number }) => (
  <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
    {stages.map((st, k) => (
      <li key={st} className="min-w-0">
        <div className={cx('h-1.5 rounded-full', k < at ? 'bg-leaf-500' : k === at ? 'bg-saffron-500' : 'bg-navy-100')} />
        <p className={cx('mt-1 truncate text-[9.5px] font-medium sm:text-[10px]', k === at ? 'text-navy-950' : 'text-slate-500')} title={st}>{st}</p>
      </li>
    ))}
  </ol>
)
