import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, CheckCircle2, FileText, Gift, IndianRupee, GraduationCap, Info, ChevronDown } from 'lucide-react'
import { useStore } from '../../store/AppStore'
import { Badge, Button, cx, PageHeader } from '../../components/ui'
import { fmtDate, ruleText } from '../../lib/rules'
import { PROTOTYPE_NOTE } from '../../data/mock'
import type { Scheme } from '../../types'

export function SchemeCard({ s, defaultOpen = false }: { s: Scheme; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const store = useStore()
  const nav = useNavigate()
  const inPortal = useLocation().pathname.startsWith('/student')
  const openNow = s.period.opens <= '2026-09-27' && s.period.closes >= '2026-09-27'
  return (
    <article className="overflow-hidden rounded-xl border border-navy-100 bg-white shadow-card">
      <div className="flex">
        <div className="w-1.5 shrink-0" style={{ background: s.color }} />
        <div className="flex-1 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="gray">{s.code}</Badge>
            {openNow ? <Badge color="green">Open until {fmtDate(s.period.closes)}</Badge> : <Badge color="amber">{s.period.opens > '2026-09-27' ? `Opens ${fmtDate(s.period.opens)}` : 'Closed'}</Badge>}
            {s.status === 'Draft' && <Badge color="violet">Configured in Scheme Builder</Badge>}
          </div>
          <h3 className="mt-3 font-display text-xl font-bold text-navy-950">{s.name}</h3>
          <p className="mt-1.5 max-w-3xl text-[14.5px] leading-relaxed text-slate-600">{s.description}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="flex gap-2"><GraduationCap size={16} className="mt-0.5 text-slate-400" /><div><dt className="text-xs text-slate-500">Education level</dt><dd className="font-semibold text-navy-950">{s.level}</dd></div></div>
            <div className="flex gap-2"><IndianRupee size={16} className="mt-0.5 text-slate-400" /><div><dt className="text-xs text-slate-500">Income requirement</dt><dd className="font-semibold text-navy-950">{s.incomeLabel}</dd></div></div>
            <div className="flex gap-2"><CalendarDays size={16} className="mt-0.5 text-slate-400" /><div><dt className="text-xs text-slate-500">Application period</dt><dd className="font-semibold text-navy-950">{fmtDate(s.period.opens)} – {fmtDate(s.period.closes)}</dd></div></div>
          </dl>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-5 grid gap-6 border-t border-navy-50 pt-5 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-navy-900"><CheckCircle2 size={15} />Eligibility (rule engine)</p>
                    <ul className="space-y-1.5 text-[13.5px] text-slate-700">{s.rules.map((r) => <li key={r.id} className="flex gap-1.5"><span className="text-leaf-600">•</span>{ruleText(r)}</li>)}</ul>
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-navy-900"><Gift size={15} />Benefits</p>
                    <ul className="space-y-1.5 text-[13.5px] text-slate-700">{s.benefits.map((b) => <li key={b} className="flex gap-1.5"><span className="text-saffron-600">•</span>{b}</li>)}</ul>
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-navy-900"><FileText size={15} />Required documents</p>
                    <ul className="space-y-1.5 text-[13.5px] text-slate-700">{s.documents.map((d) => <li key={d.key} className="flex gap-1.5"><span className="text-navy-600">•</span>{d.label}{!d.mandatory && <span className="text-slate-400">(optional)</span>}</li>)}</ul>
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-navy-900"><CalendarDays size={15} />Important dates</p>
                    <ul className="space-y-1.5 text-[13.5px] text-slate-700">{s.dates.map((d) => <li key={d.label} className="flex justify-between gap-2"><span>{d.label}</span><span className="font-semibold tabular-nums text-navy-950">{fmtDate(d.date)}</span></li>)}</ul>
                  </div>
                </div>
                <p className="mt-5 flex items-start gap-1.5 rounded-lg bg-saffron-50 px-3 py-2 text-xs text-saffron-700"><Info size={14} className="mt-0.5 shrink-0" />{PROTOTYPE_NOTE}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => nav(`/eligibility?scheme=${s.id}`)}>{store.t('checkElig')}</Button>
            <Button size="sm" onClick={() => inPortal && store.loggedIn ? nav(`/student/apply/${s.id}`) : nav(`/login?next=${encodeURIComponent(`/student/apply/${s.id}`)}&scheme=${s.id}`)}>{store.t('applyNow')}</Button>
            <button onClick={() => setOpen(!open)} aria-expanded={open} className="ml-auto flex items-center gap-1 text-[13px] font-semibold text-navy-800">
              {open ? 'Hide details' : 'Eligibility, benefits & documents'}<ChevronDown size={15} className={cx('transition', open && 'rotate-180')} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export function SchemesPage() {
  const { schemes } = useStore()
  const [f, setF] = useState('All')
  const filters = ['All', 'School', 'College', 'Research', 'Overseas']
  const match = (s: Scheme) => f === 'All' || (f === 'School' && s.id === 'prematric') || (f === 'College' && ['postmatric', 'topclass'].includes(s.id)) || (f === 'Research' && s.id === 'nfst') || (f === 'Overseas' && s.id === 'nos') || (!['prematric', 'postmatric', 'topclass', 'nfst', 'nos'].includes(s.id))
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <PageHeader title="Scholarship & fellowship schemes" sub="Every ST scheme below runs on the same configurable engine: its rules, documents and workflow are data, not code." />
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter schemes">
        {filters.map((x) => <button key={x} onClick={() => setF(x)} aria-pressed={f === x} className={cx('rounded-full border px-4 py-1.5 text-sm font-medium', f === x ? 'border-navy-900 bg-navy-900 text-white' : 'border-navy-100 bg-white text-navy-800 hover:bg-navy-50')}>{x}</button>)}
      </div>
      <div className="space-y-4">{schemes.filter(match).map((s, i) => <SchemeCard key={s.id} s={s} defaultOpen={i === 0 && f === 'All'} />)}</div>
    </div>
  )
}
