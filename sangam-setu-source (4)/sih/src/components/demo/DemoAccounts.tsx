import { FlaskConical } from 'lucide-react'
import { DEMO_CREDENTIALS } from '../../data/mock'
import type { Role } from '../../types'
import { Badge, Button, Card, cx } from '../ui'
import { DEMO_COPY, DEMO_ROLES, ROLE_VISUAL, useDemoLogin } from './demoConfig'

export function DemoAccountCard({ role }: { role: Role }) {
  const v = ROLE_VISUAL[role]
  const c = DEMO_CREDENTIALS[role]
  const copy = DEMO_COPY[role]
  const login = useDemoLogin()
  return (
    <Card className="relative flex flex-col overflow-hidden p-6">
      <span className={cx('absolute inset-x-0 top-0 h-1', v.bar)} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-xl', v.tile)}>{v.icon(22)}</div>
        <Badge color="amber"><FlaskConical size={12} aria-hidden />Demo account</Badge>
      </div>
      <h3 className="mt-4 font-display text-xl font-bold text-navy-950">{v.name} demo</h3>
      <p className="mt-0.5 text-[13px] font-medium text-slate-500">{copy.who}</p>
      <p className="mt-3 flex-1 text-[14px] leading-relaxed text-slate-600">{copy.body}</p>
      <dl className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-lg border border-dashed border-navy-100 bg-navy-50/50 px-3 py-2.5 text-[13px]">
        <dt className="text-slate-500">Email</dt><dd className="select-all font-semibold text-navy-950 [overflow-wrap:anywhere]">{c.email.split('@')[0]}@<wbr />{c.email.split('@')[1]}</dd>
        <dt className="text-slate-500">Password</dt><dd className="select-all font-semibold text-navy-950">{c.password}</dd>
      </dl>
      <Button className="mt-5 w-full" size="lg" variant={v.button} onClick={() => login(role)}>Login as {v.name}</Button>
      <p className="mt-2 text-center text-[12px] text-slate-500">Opens the {v.dashboard}</p>
    </Card>
  )
}

/** "Want to explore first?" — the three demo account cards. */
export function DemoAccountsSection({ id, className, headingLevel = 'h2' }: { id?: string; className?: string; headingLevel?: 'h2' | 'h3' }) {
  const H = headingLevel
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cx('scroll-mt-24', className)}>
      <div className="max-w-2xl">
        <H id={id ? `${id}-title` : undefined} className="font-display text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">Want to explore first?</H>
        <p className="mt-2 text-slate-600">Try Sangam Setu using a demo account.</p>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {DEMO_ROLES.map((r) => <DemoAccountCard key={r} role={r} />)}
      </div>
      <p className="mt-4 max-w-3xl text-[12.5px] leading-relaxed text-slate-500">
        Demo accounts use fictional people, institutions and amounts. Anything you change is kept in memory only and resets when you refresh the page.
        To sign in by hand instead, enter the demo email on the Login page and any 6-digit OTP.
      </p>
    </section>
  )
}
