import { Building2 } from 'lucide-react'
import { Badge, Card, cx } from './ui'

/**
 * Institution information card (icon tile, name, type · state, details grid).
 * Used on the Institution profile and as the live preview while an institute registers.
 */
export function InstitutionCard({ name, type, state, badge, badgeColor = 'green', rows, className, placeholder = '—' }: {
  name: string; type?: string; state?: string; badge?: string; badgeColor?: string
  rows: [string, string | undefined][]; className?: string; placeholder?: string
}) {
  const meta = [type, state].filter(Boolean).join(' · ')
  return (
    <Card className={cx('p-5', className)}>
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-900 text-white"><Building2 size={22} /></div>
        <div className="min-w-0">
          <p className={cx('break-words font-display text-lg font-bold', name ? 'text-navy-950' : 'text-slate-400')}>{name || 'Institution name'}</p>
          <p className="text-sm text-slate-500">{meta || 'Type · State'}</p>
        </div>
        {badge && <Badge color={badgeColor} className="ml-auto">{badge}</Badge>}
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0"><dt className="text-xs text-slate-500">{k}</dt><dd className={cx('break-words font-semibold', v ? 'text-navy-950' : 'text-slate-400')}>{v || placeholder}</dd></div>
        ))}
      </dl>
    </Card>
  )
}
