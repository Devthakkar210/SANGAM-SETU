import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FileText, AlertCircle, ScanSearch, Bell, CalendarClock, Wallet, ArrowRight, Lock, ShieldCheck, CheckCircle2, Sparkles, Upload, Pencil, Loader2,
  RefreshCw, Check, MessageSquare, Plus, Mail, Smartphone, Clock, RotateCcw, Download, CircleDot, Info,
} from 'lucide-react'
import { schemeById, useStore } from '../../store/AppStore'
import { DetailsForm, FIELD_DEFS, SECTIONS, displayValue, instName, validateKeys, type DKey } from '../../components/DetailsForm'
import type { StudentAccount } from '../../types'
import { DEMO_STUDENT_ID } from '../../data/mock'

/** Share of profile fields filled in. */
export function profileCompletion(a: StudentAccount) {
  const keys = SECTIONS.flatMap((x) => x.keys)
  return Math.round((keys.filter((k) => a.details[k]).length / keys.length) * 100)
}
import { AIBadge, Badge, Button, Card, cx, Empty, Input, Label, Modal, PageHeader, Progress, ProtoTag, Stat, StatusPill, Table, Tabs } from '../../components/ui'
import { fmtDate, inr, now } from '../../lib/rules'
import { STAGES, type Deficiency } from '../../types'
import { SchemeCard } from '../public/Schemes'
import { ApplicationPanel } from './Tracker'
import { GrievanceBot } from './GrievanceBot'
import { ProgressItems, renewalProgress } from './Renewal'
import { GrievanceForm } from '../public/Misc'
import { LangSelect } from '../../components/Widgets'

const useMine = () => {
  const s = useStore()
  return s.applications.filter((a) => a.studentId === s.demoStudentId)
}

export function Dashboard() {
  const s = useStore()
  const nav = useNavigate()
  const mine = useMine()
  const demo = mine.find((a) => a.id === s.demoAppId)
  const active = mine.filter((a) => a.status !== 'Disbursed')
  const openDefs = s.deficiencies.filter((d) => mine.some((a) => a.id === d.applicationId) && d.status === 'Open')
  const unread = s.studentNotes.filter((n) => !n.read)
  const pct = demo ? Math.round(((STAGES.indexOf(demo.stage) + 1) / STAGES.length) * 100) : 0
  const vaultCount = Object.keys(s.vault).length
  return (
    <div>
      <PageHeader title={`${s.t('welcome')}, ${(s.me.details.name ?? '').split(' ')[0]}`} sub={[s.me.details.currentCourse, instName(s.me.details.institutionId), `Profile ${profileCompletion(s.me)}% complete`].filter(Boolean).join(' · ')} />
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden">
          {demo ? (
            <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-xs text-slate-500">Current application</p><p className="font-display text-xl font-bold text-navy-950">{schemeById(s.schemes, demo.schemeId)?.name}</p></div>
                <StatusPill s={demo.status} />
              </div>
              <div className="mt-4 flex items-center gap-3"><Progress value={pct} /><span className="text-sm font-semibold tabular-nums">{pct}%</span></div>
              <p className="mt-3 text-sm text-slate-600">Now at <b className="text-navy-950">{demo.stage}</b>. {demo.status === 'Correction Requested' ? 'The officer has asked for a correction — resolve it to continue.' : 'No action needed from you right now.'}</p>
              <div className="mt-5 flex gap-2"><Button onClick={() => nav(`/student/applications?id=${demo.id}`)}>Open tracker</Button>{openDefs.length > 0 && <Button variant="saffron" onClick={() => nav('/student/documents')}>Resolve deficiency</Button>}</div>
            </div>
          ) : s.draft ? (
            <div className="p-6">
              <p className="text-xs text-slate-500">Draft saved {s.draft.savedAt}</p>
              <p className="font-display text-xl font-bold text-navy-950">{schemeById(s.schemes, s.draft.schemeId)?.name}</p>
              <p className="mt-2 text-sm text-slate-600">Step {s.draft.step + 1} of 7 completed. Continue where you left off.</p>
              <Button className="mt-4" onClick={() => nav(`/student/apply/${s.draft!.schemeId}`)}>Continue application</Button>
            </div>
          ) : !s.isDemoStudent ? (
            <div className="relative bg-navy-950 p-6 text-white">
              <p className="font-display text-2xl font-bold">Find a scholarship that fits you</p>
              <p className="mt-2 max-w-lg text-sm text-navy-100">Answer a few questions and the eligibility finder checks every ST scheme’s rules for you. When you apply, the form asks for your details once and saves them to your profile.</p>
              <div className="mt-5 flex flex-wrap gap-2"><Button variant="saffron" onClick={() => nav('/eligibility')}>{s.t('checkElig')}</Button><Button className="border border-white/20 bg-white/5" onClick={() => nav('/student/applications?tab=explore')}>Explore schemes</Button></div>
            </div>
          ) : (
            <div className="relative bg-navy-950 p-6 text-white">
              <div className="flex items-center gap-2"><AIBadge label="Profile match" /></div>
              <p className="mt-3 font-display text-2xl font-bold">You may be eligible for the National Fellowship for ST Students</p>
              <p className="mt-2 max-w-lg text-sm text-navy-100">All 5 configured rules match your verified profile. Applications close 15 Oct 2026. Most of the form is already filled from your profile.</p>
              <div className="mt-5 flex flex-wrap gap-2"><Button variant="saffron" onClick={() => nav('/student/apply/nfst')}>Start NFST application</Button><Button className="border border-white/20 bg-white/5" onClick={() => nav('/eligibility')}>See why</Button></div>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display font-bold"><CalendarClock size={17} />{s.t('deadlines')}</h2>
          <ul className="space-y-3 text-sm">
            {[['NFST last date', '2026-10-15'], ['Pre-Matric last date', '2026-10-31'], ['Post-Matric last date', '2026-11-30'], ['Income certificate renewal', '2026-10-10']].map(([l, d]) => (
              <li key={l} className="flex items-center justify-between"><span>{l}</span><span className="font-semibold tabular-nums text-navy-950">{fmtDate(d)}</span></li>
            ))}
          </ul>
        </Card>
      </div>

      {(() => {
        const rp = renewalProgress(s)
        if (!rp) return null
        return (
          <Card className="mt-5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><RefreshCw size={13} />Renewal status</p>
                <p className="mt-1 font-display text-lg font-bold text-navy-950">National Fellowship for ST Students</p>
                <p className="text-sm text-slate-600">Current year: <b>2026-27</b>{rp.app ? <> · <span className="tabular-nums">{rp.app.id}</span></> : <> · renewing NFST-2025-0001</>}</p>
              </div>
              <div className="flex items-center gap-2"><Badge color={rp.status === 'Approved' ? 'green' : rp.status === 'Action required' ? 'red' : rp.status === 'Due for renewal' ? 'violet' : 'amber'}>{rp.status}</Badge>
                <Button size="sm" variant={rp.app ? 'outline' : 'saffron'} onClick={() => nav('/student/renewal')}>{rp.app ? 'View renewal' : rp.draft ? 'Continue renewal' : 'Start renewal'}</Button></div>
            </div>
            <div className="mt-4 grid gap-5 md:grid-cols-[1fr_1.3fr] md:items-start">
              <div><div className="flex items-center gap-3"><Progress value={rp.pct} /><span className="text-sm font-semibold tabular-nums">{rp.pct}%</span></div>
                <p className="mt-2 text-[12.5px] text-slate-500">Permanent details are reused from last year — only changeable information and current documents are needed.</p></div>
              <ProgressItems items={rp.items} />
            </div>
          </Card>
        )
      })()}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active applications" value={active.length} icon={<FileText size={18} />} onClick={() => nav('/student/applications')} />
        <Stat label={s.t('pendingActions')} value={openDefs.length} icon={<AlertCircle size={18} />} tone={openDefs.length ? 'saffron' : 'leaf'} sub={openDefs.length ? 'Deficiency to resolve' : 'Nothing pending'} onClick={() => nav('/student/documents')} />
        <Stat label="Documents verified" value={`${vaultCount}/${vaultCount + (demo ? 0 : 3)}`} icon={<ScanSearch size={18} />} tone="leaf" sub="Reusable across schemes" onClick={() => nav('/student/documents')} />
        <Stat label="Unread notifications" value={unread.length} icon={<Bell size={18} />} tone="violet" onClick={() => nav('/student/notifications')} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display font-bold">Recent notifications</h2><Button variant="ghost" size="sm" onClick={() => nav('/student/notifications')}>View all</Button></div>
          <ul className="divide-y divide-navy-50">
            {s.studentNotes.slice(0, 4).map((n) => (
              <li key={n.id} className="flex gap-3 py-2.5">
                <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-navy-100' : 'bg-saffron-500')} />
                <div className="min-w-0"><p className="text-sm font-semibold text-navy-950">{n.title}</p><p className="truncate text-xs text-slate-500">{n.body}</p></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-display font-bold"><Wallet size={17} />Disbursement</h2><Button variant="ghost" size="sm" onClick={() => nav('/student/disbursement')}>Details</Button></div>
          <p className="text-sm text-slate-600">Last credit: <b className="text-navy-950">{inr(11700)}</b> on 22 Mar 2024 · Post-Matric 2023-24</p>
          <p className="mt-2 text-sm text-slate-600">Next expected: {demo ? 'after sanction of your NFST fellowship' : 'no active award'}</p>
          <div className="mt-3"><ProtoTag label="PFMS Integration – Prototype" /></div>
        </Card>
      </div>
    </div>
  )
}

export function Profile() {
  const s = useStore()
  const me = s.me
  const [edit, setEdit] = useState<DKey[] | null>(null)
  const [vals, setVals] = useState<Partial<Record<DKey, string>>>({})
  const [err, setErr] = useState<Record<string, string>>({})
  const [aadhaarRaw, setAadhaarRaw] = useState('')
  const all = SECTIONS.flatMap((x) => x.keys)
  const verifiedN = all.filter((k) => me.verified[k] && me.details[k]).length
  const pct = profileCompletion(me)
  const apps = s.applications.filter((a) => a.studentId === me.id).length
  const open = (keys: DKey[]) => { setVals(Object.fromEntries(keys.map((k) => [k, me.details[k] ?? '']))); setErr({}); setAadhaarRaw(''); setEdit(keys) }
  const save = () => {
    if (!edit) return
    const e = validateKeys(edit.filter((k) => vals[k] !== undefined && (vals[k] ?? '') !== ''), vals)
    setErr(e)
    if (Object.keys(e).length) return
    const patch = Object.fromEntries(edit.filter((k) => vals[k]).map((k) => [k, vals[k]!]))
    s.updateStudent(patch)
    s.log('Profile updated', `${Object.keys(patch).length} field(s) updated by the student`, undefined)
    s.toast('Profile saved')
    setEdit(null)
  }
  const initials = (me.details.name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <div>
      <PageHeader title="My profile" sub="Filled once and reused for every scheme. Verified fields are locked; self-declared fields are checked when you apply." actions={<Badge color={verifiedN ? 'green' : 'gray'}><ShieldCheck size={13} />{verifiedN} verified · {pct}% complete</Badge>} />
      <Card className="mb-5 flex flex-wrap items-center gap-5 p-5">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-navy-900 font-display text-xl font-bold text-white">{initials}</div>
        <div className="flex-1"><p className="font-display text-xl font-bold text-navy-950">{me.details.name}</p><p className="text-sm text-slate-600">Profile ID {me.id} · {apps ? `used in ${apps} application${apps > 1 ? 's' : ''}` : 'no applications yet'}{me.kyc ? ` · eKYC ${me.kyc.maskedId}` : ' · identity not yet verified with eKYC'}</p></div>
        <div className="w-full max-w-xs"><div className="mb-1 flex justify-between text-xs"><span>Profile completion</span><span className="font-semibold">{pct}%</span></div><Progress value={pct} color="bg-leaf-500" /></div>
      </Card>
      {pct < 100 && <Card className="mb-5 flex items-start gap-3 border-saffron-400 bg-saffron-50/60 p-4 text-sm"><AlertCircle size={18} className="mt-0.5 shrink-0 text-saffron-600" /><p>Some details are still missing. You can fill them here, or the application form will ask for them when you apply.</p></Card>}
      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map((sec) => {
          const editable = sec.keys.filter((k) => !(me.verified[k] && me.details[k]))
          return (
            <Card key={sec.title} className="p-5">
              <div className="mb-3 flex items-center justify-between"><h2 className="font-display font-bold text-navy-950">{sec.title}</h2>{editable.length > 0 && <Button size="sm" variant="ghost" onClick={() => open(editable)}>Edit</Button>}</div>
              <dl className="divide-y divide-navy-50">
                {sec.keys.map((k) => {
                  const v = me.details[k]
                  return (
                    <div key={k} className="flex items-start justify-between gap-3 py-2.5">
                      <div><dt className="text-xs text-slate-500">{FIELD_DEFS[k].label}</dt><dd className={cx('text-[14.5px] font-semibold', v ? 'text-navy-950' : 'text-slate-400')}>{v ? displayValue(k, v) : 'Not provided yet'}</dd></div>
                      {v && me.verified[k] ? <span className="text-right text-[11px]"><Badge color="green"><Lock size={10} />Verified</Badge><span className="mt-0.5 block text-slate-400">{me.verified[k]}</span></span>
                        : v ? <Badge color="gray">Self-declared</Badge> : <Badge color="amber">Missing</Badge>}
                    </div>
                  )
                })}
              </dl>
            </Card>
          )
        })}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Update details" wide>
        {edit && (
          <div>
            <DetailsForm keys={edit} values={vals} onChange={(k, v) => { setVals((x) => ({ ...x, [k]: v })); setErr((x) => ({ ...x, [k]: '' })) }} errors={err} cols={2} aadhaarRaw={aadhaarRaw} onAadhaarRaw={setAadhaarRaw} />
            <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save}>Save</Button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
/** My Applications — your applications with the tracker for the one being viewed, plus scheme discovery. */
export function Applications() {
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const mine = useMine().slice().sort((a, b) => (a.id === s.demoAppId ? -1 : b.id === s.demoAppId ? 1 : b.submittedOn.localeCompare(a.submittedOn)))
  const tab = params.get('tab') === 'explore' ? 'explore' : 'mine'
  const selId = params.get('id') ?? mine[0]?.id
  const sel = mine.find((a) => a.id === selId) ?? mine[0]
  const live = s.schemes.filter((x) => x.status === 'Live')
  const appliedTo = new Set(mine.filter((a) => a.submittedOn >= '2026').map((a) => a.schemeId))
  const openDefCount = (id: string) => s.deficiencies.filter((d) => d.applicationId === id && d.status === 'Open').length

  return (
    <div>
      <PageHeader title={s.t('applications')} sub="Track each application stage by stage, and explore schemes you can apply for — all in one place." actions={<Button onClick={() => setParams({ tab: 'explore' })} icon={<Plus size={15} />}>New application</Button>} />
      <div className="mb-5"><Tabs value={tab} onChange={(v) => setParams(v === 'explore' ? { tab: 'explore' } : sel ? { id: sel.id } : {})} tabs={[{ id: 'mine', label: `My applications (${mine.length})` }, { id: 'explore', label: `Explore schemes (${live.length})` }]} /></div>

      {tab === 'mine' ? (
        mine.length === 0 && !s.draft ? <Empty title="No applications yet" body="Check which schemes you’re eligible for and start your first application." action={<Button onClick={() => setParams({ tab: 'explore' })}>Explore schemes</Button>} /> : (
          <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
            <div className="space-y-2.5">
              {s.draft && (
                <Card className="border-dashed p-4">
                  <Badge color="amber">Draft</Badge>
                  <p className="mt-2 text-sm font-semibold text-navy-950">{schemeById(s.schemes, s.draft.schemeId)?.name}</p>
                  <p className="text-xs text-slate-500">Step {s.draft.step + 1} of 7 · autosaved {s.draft.savedAt}</p>
                  <Button size="sm" className="mt-3" onClick={() => nav(`/student/apply/${s.draft!.schemeId}`)}>Continue</Button>
                </Card>
              )}
              {mine.map((a) => {
                const on = a.id === sel?.id
                const n = openDefCount(a.id)
                return (
                  <button key={a.id} onClick={() => setParams({ id: a.id })} aria-current={on ? 'true' : undefined}
                    className={cx('w-full rounded-xl border bg-white p-4 text-left shadow-card transition', on ? 'border-navy-900 ring-2 ring-navy-900/10' : 'border-navy-100 hover:border-navy-600/30')}>
                    <div className="flex items-center justify-between gap-2"><span className="text-[11px] tabular-nums text-slate-500">{a.id}</span><StatusPill s={a.status} /></div>
                    <p className="mt-1 flex items-center gap-1.5 font-display font-bold text-navy-950">{schemeById(s.schemes, a.schemeId)?.short}{a.applicationType === 'renewal' && <Badge color="violet"><RefreshCw size={10} />Renewal {a.renewalYear}</Badge>}</p>
                    <p className="text-xs text-slate-500">{a.stage} · {fmtDate(a.submittedOn.slice(0, 10))}</p>
                    {n > 0 && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-saffron-700"><AlertCircle size={13} />{n} deficiency to resolve</p>}
                  </button>
                )
              })}
            </div>
            <div className="min-w-0">{sel ? <ApplicationPanel key={sel.id} app={sel} /> : <Empty title="Select an application" body="Choose an application on the left to see its tracker." />}</div>
          </div>
        )
      ) : (
        <div>
          <Card className="mb-4 flex flex-wrap items-center gap-3 bg-navy-950 p-5 text-white">
            <Sparkles size={20} className="text-saffron-400" />
            <p className="flex-1 text-sm">Not sure which scheme fits? The eligibility finder checks your verified profile against every scheme’s rules and explains why.</p>
            <Button variant="saffron" onClick={() => nav('/eligibility')}>{s.t('checkElig')}</Button>
          </Card>
          <div className="space-y-4">
            {live.map((sc) => (
              <div key={sc.id} className="relative">
                {appliedTo.has(sc.id) && <Badge color="green" className="absolute right-4 top-4 z-10"><Check size={11} />Applied this cycle</Badge>}
                <SchemeCard s={sc} defaultOpen={sc.id === 'nfst' && !appliedTo.has('nfst')} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
const NFST_RATES = [
  { y: 'Year 1–2', level: 'JRF', month: 37000 }, { y: 'Year 3–5', level: 'SRF', month: 42000 },
]

/** Disbursement & renewal — money received, what is coming, and how to keep the award running. */
export function StudentDisbursement() {
  const s = useStore()
  const nav = useNavigate()
  const mine = useMine()
  const list = s.disbursements.filter((d) => mine.some((a) => a.id === d.applicationId))
  const total = list.filter((d) => d.status === 'Disbursed').reduce((a, b) => a + b.amount, 0)
  const nfst = mine.find((a) => a.schemeId === 'nfst' && ['Sanction', 'Disbursement'].includes(a.stage)) ?? mine.find((a) => a.schemeId === 'nfst')
  const awarded = !!nfst && ['Sanction', 'Disbursement'].includes(nfst.stage)
  const next = list.find((d) => d.status === 'Pending' || d.status === 'Processing')
  const failed = list.filter((d) => d.status === 'Failed')


  const exportCsv = () => {
    const csv = ['Instalment,Application,Amount,Status,Date,Reference', ...list.map((d) => [d.installment, d.applicationId, d.amount, d.status, d.date ?? '', d.reference ?? ''].join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const el = document.createElement('a'); el.href = url; el.download = 'my-scholarship-payments.csv'; el.click(); URL.revokeObjectURL(url)
    s.toast('Payment statement downloaded')
  }

  return (
    <div>
      <PageHeader title="Disbursement & renewal" sub="Money you’ve received, what’s coming next, how payments reach you, and how to keep your fellowship running."
        actions={<><ProtoTag label="PFMS Integration – Prototype" /><Button variant="outline" size="sm" icon={<Download size={14} />} onClick={exportCsv}>Statement</Button></>} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total received" value={inr(total)} icon={<Wallet size={18} />} tone="leaf" sub={`${list.filter((d) => d.status === 'Disbursed').length} instalments credited`} />
        <Stat label="Next payment" value={next ? inr(next.amount) : '—'} icon={<Clock size={18} />} tone="saffron" sub={next ? `${next.installment} · ${next.status}` : awarded ? 'Next quarter’s release' : 'Starts after sanction'} />
        <Stat label="Bank account" value="XX3390" icon={<ShieldCheck size={18} />} sub="SBI · Aadhaar-seeded · DBT active" />
        <Stat label="Failed payments" value={failed.length} icon={<AlertCircle size={18} />} tone={failed.length ? 'red' : 'leaf'} sub={failed.length ? 'Action needed — see below' : 'None'} />
      </div>

      {failed.length > 0 && (
        <Card className="mb-5 flex flex-wrap items-center gap-3 border-red-300 bg-red-50 p-4">
          <AlertCircle className="text-red-600" />
          <p className="flex-1 text-sm text-navy-950"><b>{failed[0].installment}</b> of {inr(failed[0].amount)} could not be credited. The most common reasons are an inactive account or Aadhaar not mapped at NPCI.</p>
          <Button size="sm" variant="danger" onClick={() => nav('/student/grievance?topic=money')}>Get help</Button>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4"><h2 className="font-display text-lg font-bold">Payment history</h2><span className="text-xs text-slate-500">Every instalment with its PFMS reference</span></div>
          {list.length === 0 ? <div className="p-5"><Empty title="No payments yet" body="Payments appear here once an application is sanctioned." /></div> : (
            <Table head={['Instalment', 'Scheme', 'Amount', 'Status', 'Date', 'Payment reference']}>
              {list.map((d) => <tr key={d.id}><td className="px-4 py-3">{d.installment}<p className="text-[11px] tabular-nums text-slate-500">{d.applicationId}</p></td><td className="px-4 py-3">{schemeById(s.schemes, d.schemeId)?.short}</td><td className="px-4 py-3 font-semibold tabular-nums">{inr(d.amount)}</td><td className="px-4 py-3"><StatusPill s={d.status} /></td><td className="px-4 py-3">{fmtDate(d.date)}</td><td className="px-4 py-3 font-mono text-[12px]">{d.reference ?? '—'}</td></tr>)}
            </Table>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg font-bold">How your payment reaches you</h2>
          <ol className="space-y-3">
            {[['Sanction', 'After selection, the ministry sanctions your annual amount.'], ['Payment file', 'A PFMS payment file is generated for your instalment.'], ['Direct Benefit Transfer', 'Money goes straight to your Aadhaar-seeded account — no middlemen.'], ['Confirmation', 'You get an SMS with the amount and payment reference.']].map(([t, d], i) => (
              <li key={t} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">{i + 1}</span><div><p className="text-sm font-semibold text-navy-950">{t}</p><p className="text-[13px] text-slate-600">{d}</p></div></li>
            ))}
          </ol>
          <div className="mt-5 rounded-xl bg-navy-50 p-4 text-[13px]">
            <p className="mb-1.5 font-semibold text-navy-950">If a payment doesn’t arrive</p>
            <ul className="list-disc space-y-1 pl-4 text-slate-700"><li>Wait 3–5 working days after “Disbursed”.</li><li>Check your account is active and Aadhaar-mapped (NPCI).</li><li>Make sure the account is in your own name.</li></ul>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => nav('/student/grievance?topic=money')}>Ask the grievance assistant</Button>
          </div>
        </Card>
      </div>

      {/* Award details */}
      <Card className="mt-5 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-bold">NFST fellowship — what you receive</h2><Badge color="gray">Example values · as per applicable norms</Badge></div>
        <div className="grid gap-4 md:grid-cols-4">
          {NFST_RATES.map((r) => <div key={r.y} className="rounded-xl border border-navy-100 p-4"><p className="text-xs text-slate-500">{r.y} · {r.level}</p><p className="font-display text-xl font-bold tabular-nums text-navy-950">{inr(r.month)}<span className="text-sm font-normal text-slate-500"> / month</span></p></div>)}
          <div className="rounded-xl border border-navy-100 p-4"><p className="text-xs text-slate-500">Contingency grant</p><p className="font-display text-xl font-bold text-navy-950">Annual</p><p className="text-[12px] text-slate-500">For books, equipment, field work</p></div>
          <div className="rounded-xl border border-navy-100 p-4"><p className="text-xs text-slate-500">HRA</p><p className="font-display text-xl font-bold text-navy-950">As per norms</p><p className="text-[12px] text-slate-500">If not in university hostel</p></div>
        </div>
        <p className="mt-3 text-[12.5px] text-slate-600">Fellowship is released in quarterly instalments. {awarded ? 'Your award is sanctioned.' : `Your application ${nfst ? `(${nfst.id}) is at ${nfst.stage}` : 'is not submitted yet'} — payments start after sanction.`}</p>
      </Card>

      {/* Renewal */}
      <Card className="mt-5 p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="flex items-center gap-2 font-display text-lg font-bold"><RefreshCw size={17} />Fellowship renewal (Years 1–5)</h2><p className="text-sm text-slate-600">NFST continues for up to five years. Each year: submit progress, institution verifies, officer approves. Next window: 1–31 Jul 2027 (example).</p></div>
          {!awarded && <Badge color="amber">Preview — unlocks after sanction</Badge>}
        </div>
        {(() => {
          const rp = renewalProgress(s)
          if (!rp) return <p className="rounded-xl bg-navy-50 p-4 text-sm text-slate-600">Renewal becomes available once you are awarded a renewable scholarship such as NFST.</p>
          const tiles = [
            { y: 1, yr: '2025-26', st: 'Awarded', c: 'green' },
            { y: 2, yr: '2026-27', st: rp.status === 'Due for renewal' ? 'Renewal open' : rp.status, c: rp.status === 'Approved' ? 'green' : rp.status === 'Action required' ? 'red' : 'amber' },
            { y: 3, yr: '2027-28', st: 'Upcoming', c: 'gray' }, { y: 4, yr: '2028-29', st: 'Upcoming', c: 'gray' }, { y: 5, yr: '2029-30', st: 'Upcoming', c: 'gray' },
          ]
          return (
            <>
              <ol className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {tiles.map((t) => (
                  <li key={t.y} className={cx('rounded-xl border-2 p-3', t.y === 2 ? 'border-navy-900' : 'border-navy-100', t.c === 'gray' && 'opacity-60')}>
                    <p className="font-display text-lg font-bold text-navy-950">Year {t.y}</p>
                    <p className="text-[11px] text-slate-500">{t.yr} · {t.y <= 2 ? 'JRF rate' : 'SRF rate'}</p>
                    <Badge className="mt-2" color={t.c}>{t.st}</Badge>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap items-center gap-4 rounded-xl bg-navy-50/60 p-4">
                <div className="min-w-[220px] flex-1"><p className="font-semibold text-navy-950">Year 2 renewal · 2026-27</p><div className="mt-2 flex items-center gap-3"><Progress value={rp.pct} /><span className="text-sm font-semibold tabular-nums">{rp.pct}%</span></div></div>
                <Button onClick={() => nav('/student/renewal')} icon={<RefreshCw size={15} />}>{rp.app ? 'View renewal application' : rp.draft ? 'Continue renewal application' : 'Start renewal application'}</Button>
              </div>
            </>
          )
        })()}
        <div className="mt-5 grid gap-3 text-[13px] md:grid-cols-3">
          <div className="rounded-xl bg-navy-50 p-3"><p className="font-semibold text-navy-950">What you need</p><p className="text-slate-600">Annual progress report signed by your supervisor, current income certificate, attendance/continuation certificate.</p></div>
          <div className="rounded-xl bg-navy-50 p-3"><p className="font-semibold text-navy-950">JRF → SRF upgrade</p><p className="text-slate-600">From Year 3, on satisfactory assessment by a committee at your institution.</p></div>
          <div className="rounded-xl bg-navy-50 p-3"><p className="font-semibold text-navy-950">Miss the window?</p><p className="text-slate-600">Payments pause until renewal is approved; arrears are released afterwards (example policy).</p></div>
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function StudentGrievance() {
  const s = useStore()
  const [params] = useSearchParams()
  const [open, setOpen] = useState(false)
  const mine = s.grievances.filter((g) => (g.studentId ?? DEMO_STUDENT_ID) === s.studentId)
  return (
    <div>
      <PageHeader title="Grievances" sub="Get instant help from the AI assistant, or raise a complaint that goes straight to the MoTA grievance team."
        actions={<Button variant="outline" onClick={() => setOpen(true)} icon={<MessageSquare size={15} />}>Write a detailed grievance</Button>} />
      <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <GrievanceBot startTopic={params.get('topic')} />
        <div>
          <h2 className="mb-3 font-display text-lg font-bold text-navy-950">My complaints ({mine.length})</h2>
          <div className="max-h-[590px] space-y-3 overflow-y-auto pr-1">
            {mine.map((g) => (
              <Card key={g.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold tabular-nums text-navy-950">{g.id}</p><StatusPill s={g.status} />{g.channel === 'AI assistant' && <Badge color="violet"><Sparkles size={11} />via AI assistant</Badge>}{g.channel === 'Helpdesk agent' && <Badge color="green">Agent chat</Badge>}<span className="ml-auto text-xs text-slate-500">{fmtDate(g.createdOn)}</span></div>
                <p className="mt-1.5 font-semibold text-navy-950">{g.subject}</p>
                <p className="text-xs text-slate-500">{g.category} · {g.assignedTo ?? 'Awaiting assignment'}</p>
                <ol className="mt-2 space-y-1.5 border-l-2 border-navy-100 pl-3 text-[13px]">{g.thread.slice(-2).map((t, i) => <li key={i}><p className="text-[11px] text-slate-500">{t.by} · {t.at}</p><p>{t.text}</p></li>)}</ol>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="New grievance" wide><GrievanceForm onDone={() => setOpen(false)} /></Modal>
    </div>
  )
}

export function StudentNotifications() {
  const s = useStore()
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const list = s.studentNotes.filter((n) => tab === 'all' || !n.read)
  const chIcon = { 'in-app': <Bell size={12} />, sms: <Smartphone size={12} />, email: <Mail size={12} /> }
  return (
    <div>
      <PageHeader title="Notifications" actions={<Button variant="outline" size="sm" onClick={() => { s.markRead('student'); s.toast('All marked as read') }}>Mark all read</Button>} />
      <div className="mb-4"><Tabs tabs={[{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }]} value={tab} onChange={setTab} /></div>
      <Card className="divide-y divide-navy-50">
        {list.length === 0 && <p className="p-6 text-sm text-slate-500">You’re all caught up.</p>}
        {list.map((n) => (
          <button key={n.id} onClick={() => s.set((p) => ({ notifications: p.notifications.map((x) => x.id === n.id ? { ...x, read: true } : x) }))} className="flex w-full gap-4 p-4 text-left hover:bg-navy-50/50">
            <span className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', n.read ? 'bg-navy-100' : n.kind === 'action' ? 'bg-saffron-500' : n.kind === 'success' ? 'bg-leaf-500' : 'bg-navy-600')} />
            <div className="min-w-0 flex-1">
              <p className={cx('text-[14.5px]', n.read ? 'text-slate-700' : 'font-semibold text-navy-950')}>{n.title}</p>
              <p className="text-sm text-slate-600">{n.body}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">{n.at.replace('T', ' ')}{n.channel.map((c) => <span key={c} className="inline-flex items-center gap-1 rounded bg-navy-50 px-1.5 py-0.5">{chIcon[c]}{c === 'in-app' ? 'In-app' : c === 'sms' ? 'SMS delivered' : 'Email delivered'}</span>)}</div>
            </div>
          </button>
        ))}
      </Card>
    </div>
  )
}

export function SettingsPage() {
  const s = useStore()
  const [ch, setCh] = useState({ sms: true, email: true, app: true })
  return (
    <div>
      <PageHeader title="Settings" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h2 className="font-display font-bold">Language & accessibility</h2>
          <div className="flex items-center justify-between"><span className="text-sm">Interface language</span><LangSelect /></div>
          {([['highContrast', 'High contrast'], ['lowBandwidth', 'Low-bandwidth mode'], ['assisted', 'Assisted application (CSC mode)']] as const).map(([k, l]) => (
            <label key={k} className="flex items-center justify-between text-sm"><span>{l}</span><input type="checkbox" className="h-4 w-4 accent-navy-900" checked={s[k]} onChange={(e) => s.set(() => ({ [k]: e.target.checked }))} /></label>
          ))}
          <div className="flex items-center justify-between text-sm"><span>Text size</span><div className="flex gap-1">{[0.9, 1, 1.12, 1.25].map((f) => <button key={f} onClick={() => s.set(() => ({ fontScale: f }))} className={cx('h-8 w-8 rounded-md border font-semibold', s.fontScale === f ? 'border-navy-900 bg-navy-900 text-white' : 'border-navy-100')}>A</button>)}</div></div>
        </Card>
        <Card className="space-y-4 p-5">
          <h2 className="font-display font-bold">Notification channels</h2>
          {([['app', 'In-app', Bell], ['sms', 'SMS', Smartphone], ['email', 'Email', Mail]] as const).map(([k, l, I]) => (
            <label key={k} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><I size={15} />{l}</span><input type="checkbox" className="h-4 w-4 accent-navy-900" checked={ch[k]} onChange={(e) => { setCh({ ...ch, [k]: e.target.checked }); s.toast(`${l} notifications ${e.target.checked ? 'on' : 'off'}`, 'info') }} /></label>
          ))}
          <p className="text-xs text-slate-500">SMS and email delivery are simulated in the prototype.</p>
        </Card>
        <Card className="space-y-3 p-5">
          <h2 className="font-display font-bold">Security & privacy</h2>
          <p className="text-sm text-slate-600">Sessions end after 8 minutes of inactivity. Your data is visible only to your institution and assigned officers; every access is logged.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" icon={<Clock size={14} />} onClick={() => window.dispatchEvent(new Event('simulate-timeout'))}>Simulate session timeout</Button>
            <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={() => s.toast('Your data export is being prepared (sample)', 'info')}>Download my data</Button>
          </div>
        </Card>
        <Card className="space-y-3 p-5">
          <h2 className="font-display font-bold">Prototype</h2>
          <p className="flex items-start gap-2 text-sm text-slate-600"><Info size={15} className="mt-0.5 shrink-0" />All data is fictional and kept in memory. Reset to replay the SIH demo from the start.</p>
          <Button variant="outline" size="sm" icon={<RotateCcw size={14} />} onClick={s.reset}>Reset demo data</Button>
        </Card>
      </div>
    </div>
  )
}

