import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { MessageSquareWarning, ScanSearch, FileStack, Hourglass, BadgeCheck, AlertTriangle, Trophy, ListOrdered, Wallet, Filter, RotateCcw, Activity, ArrowRight, Sparkles, Download } from 'lucide-react'
import { useStore, schemeById } from '../../store/AppStore'
import { BY_STATE, MONTHLY, STATES, INSTITUTIONS, SEED_APPS, EXTRA_NFST, PAST_APP } from '../../data/mock'
import type { Application } from '../../types'
import { Badge, Button, Card, PageHeader, ProtoTag, Select, StatusPill, cx } from '../../components/ui'
import { AI_CONF_THRESHOLD, fmtDate } from '../../lib/rules'

const C = { navy: '#101E4A', indigo: '#34499A', saffron: '#F08A24', leaf: '#2F9E6E', violet: '#6B4FC8', red: '#DC2626', slate: '#94A3B8' }

// National snapshot — PROTOTYPE VALUES. Live applications in this browser session are added on top.
const BASE_PIPE: [string, number][] = [
  ['Submitted / AI check', 9820], ['Institution Verification', 21430], ['State Scrutiny', 18760], ['Selection Committee', 6240], ['Sanction', 14880], ['Disbursement', 77106],
]
const BASE = { deficiencies: 7412, selected: 5180, waitlisted: 1060 }
const SCHEME_SHARE: Record<string, number> = { postmatric: 0.712, prematric: 0.231, topclass: 0.036, nfst: 0.017, nos: 0.004 }
const CATEGORY = ['All categories', 'PVTG', 'Female applicant', 'First-generation learner', 'Person with disability']
const CAT_SHARE: Record<string, number> = { PVTG: 0.11, 'Female applicant': 0.52, 'First-generation learner': 0.38, 'Person with disability': 0.03 }
const STATUSES = ['All statuses', 'In Progress', 'Correction Requested', 'Further Review', 'Selected', 'Waitlisted', 'Disbursed']
const MONTHS = ['All of 2026-27', ...MONTHLY.map((m) => m.m)]

const stageKey = (a: Application) => a.stage === 'Submitted' || a.stage === 'AI Document Check' ? 'Submitted / AI check' : a.stage
function liveCounts(apps: Application[]) {
  const pipe: Record<string, number> = {}
  apps.forEach((a) => { pipe[stageKey(a)] = (pipe[stageKey(a)] ?? 0) + 1 })
  return {
    pipe, total: apps.length,
    pending: apps.filter((a) => a.stage === 'State Scrutiny' && a.status !== 'Correction Requested').length,
    verified: apps.filter((a) => ['Selection Committee', 'Sanction', 'Disbursement'].includes(a.stage)).length,
    deficiencies: apps.filter((a) => a.status === 'Correction Requested').length,
    selected: apps.filter((a) => a.status === 'Selected').length,
    waitlisted: apps.filter((a) => a.status === 'Waitlisted').length,
    disbursed: apps.filter((a) => a.status === 'Disbursed').length,
  }
}
const SEEDED = [PAST_APP, ...SEED_APPS, ...EXTRA_NFST]

export default function AdminDashboard() {
  const s = useStore()
  const nav = useNavigate()
  const [f, setF] = useState({ state: 'All states', scheme: 'All schemes', inst: 'All institutions', status: 'All statuses', month: MONTHS[0], cat: CATEGORY[0], type: 'All types' })
  const up = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))
  const active = Object.values(f).filter((v) => !/^All/.test(v)).length

  const schemeObj = s.schemes.find((x) => x.short === f.scheme)
  const instObj = INSTITUTIONS.find((i) => i.name === f.inst)
  const totalState = BY_STATE.reduce((a, b) => a + b.apps, 0)
  const monthRow = MONTHLY.find((m) => m.m === f.month)
  const monthTotal = MONTHLY.reduce((a, b) => a + b.apps, 0)

  const stateF = f.state === 'All states' ? 1 : (BY_STATE.find((b) => b.state === f.state)?.apps ?? 0) / totalState
  const schemeF = !schemeObj ? 1 : SCHEME_SHARE[schemeObj.id] ?? 0
  const instF = instObj ? 0.0042 : 1
  const catF = f.cat === CATEGORY[0] ? 1 : CAT_SHARE[f.cat]
  const monthF = monthRow ? monthRow.apps / monthTotal : 1
  const RENEWAL_SHARE = 0.34 // share of renewals in the national snapshot (prototype value)
  const typeF = f.type === 'All types' ? 1 : f.type === 'Renewal' ? RENEWAL_SHARE : 1 - RENEWAL_SHARE
  const factor = stateF * schemeF * instF * catF * monthF * typeF

  const match = (a: Application) =>
    (f.state === 'All states' || a.state === f.state) && (!schemeObj || a.schemeId === schemeObj.id) && (!instObj || a.institutionId === instObj.id)
    && (f.cat === CATEGORY[0] || a.priority.includes(f.cat)) && a.submittedOn >= '2026'
    && (f.type === 'All types' || (f.type === 'Renewal') === (a.applicationType === 'renewal'))
  const live = useMemo(() => s.applications.filter(match), [s.applications, f]) // eslint-disable-line
  const statusLive = live.filter((a) => f.status === 'All statuses' || a.status === f.status)
  const L = liveCounts(live)
  const L0 = liveCounts(SEEDED.filter(match))
  const scale = (n: number) => Math.round(n * factor)

  const pipe = BASE_PIPE.map(([k, v]) => ({ stage: k.replace('Verification', 'Verif.'), full: k, value: scale(v) + (L.pipe[k] ?? 0) }))
  const kpi = [
    { label: 'Total Applications', v: pipe.reduce((a, b) => a + b.value, 0), d: L.total - L0.total, icon: <FileStack size={18} />, tone: 'navy', to: '/admin/applications' },
    { label: 'Pending Scrutiny', v: scale(18760) + L.pending, d: L.pending - L0.pending, icon: <Hourglass size={18} />, tone: 'saffron', to: '/admin/applications' },
    { label: 'Verified', v: scale(98226) + L.verified, d: L.verified - L0.verified, icon: <BadgeCheck size={18} />, tone: 'leaf', to: '/admin/applications' },
    { label: 'Deficiencies', v: scale(BASE.deficiencies) + L.deficiencies, d: L.deficiencies - L0.deficiencies, icon: <AlertTriangle size={18} />, tone: 'red', to: '/admin/applications' },
    { label: 'Selected', v: scale(BASE.selected) + L.selected, d: L.selected - L0.selected, icon: <Trophy size={18} />, tone: 'violet', to: '/admin/selection' },
    { label: 'Waitlisted', v: scale(BASE.waitlisted) + L.waitlisted, d: L.waitlisted - L0.waitlisted, icon: <ListOrdered size={18} />, tone: 'saffron', to: '/admin/selection' },
    { label: 'Disbursed', v: scale(77106) + L.disbursed, d: L.disbursed - L0.disbursed, icon: <Wallet size={18} />, tone: 'leaf', to: '/admin/disbursement' },
  ]
  const toneCls: Record<string, string> = { navy: 'bg-navy-50 text-navy-800', saffron: 'bg-saffron-50 text-saffron-700', leaf: 'bg-leaf-50 text-leaf-700', red: 'bg-red-50 text-red-600', violet: 'bg-violet-50 text-violet-700' }

  const byState = BY_STATE.map((b) => ({ state: b.state.replace('Madhya Pradesh', 'MP').replace('Chhattisgarh', 'CG').replace('Maharashtra', 'MH'), full: b.state, apps: Math.round(b.apps * schemeF * instF * catF * monthF) }))
  const byScheme = s.schemes.map((x) => ({ name: x.short, apps: Math.round(totalState * (SCHEME_SHARE[x.id] ?? 0) * stateF * instF * catF * monthF) + live.filter((a) => a.schemeId === x.id).length, color: x.color, id: x.id }))
  const monthly = MONTHLY.map((m) => ({ ...m, apps: Math.round(m.apps * stateF * schemeF * instF * catF), highlight: !monthRow || m.m === f.month }))
  const flagged = live.filter((a) => a.flags.some((fl) => !fl.resolved)).length
  const verif = [
    { name: 'AI pre-check clean', value: scale(104200) + live.filter((a) => !a.flags.length).length, color: C.leaf },
    { name: 'Resolved by student', value: scale(21630) + live.filter((a) => a.flags.length && a.flags.every((x) => x.resolved)).length, color: C.indigo },
    { name: 'Needs officer review', value: scale(12580) + flagged, color: C.saffron },
    { name: 'Awaiting documents', value: scale(9826), color: C.slate },
  ]
  const workload = [
    { who: 'Institutions', pending: scale(21430) + (L.pipe['Institution Verification'] ?? 0), sla: 7 },
    { who: 'Scrutiny (Super Admin)', pending: scale(18760) + L.pending, sla: 10 },
    { who: 'Selection', pending: scale(6240) + (L.pipe['Selection Committee'] ?? 0), sla: 21 },
    { who: 'Sanction / PFMS', pending: scale(14880) + (L.pipe['Sanction'] ?? 0), sla: 5 },
  ]
  const selection = ['topclass', 'nfst', 'nos'].map((id) => {
    const share = SCHEME_SHARE[id] * stateF * instF * catF * monthF * (schemeObj && schemeObj.id !== id ? 0 : 1)
    const pool = Math.round(totalState * share * 0.9)
    const sel = Math.round(pool * (id === 'nfst' ? 0.28 : id === 'nos' ? 0.12 : 0.55))
    const wl = Math.round(pool * 0.08)
    return { name: schemeById(s.schemes, id)?.short ?? id, Selected: sel + live.filter((a) => a.schemeId === id && a.status === 'Selected').length, Waitlisted: wl + live.filter((a) => a.schemeId === id && a.status === 'Waitlisted').length, 'Not selected': Math.max(pool - sel - wl, 0) }
  })

  const demo = s.applications.find((a) => a.id === s.demoAppId)
  const lowAll = live.flatMap((a) => a.flags.filter((x) => x.type === 'Low AI confidence').map((x) => ({ a, f: x })))
  const lowPending = lowAll.filter((x) => !x.f.resolved)
  const lowDone = lowAll.length - lowPending.length
  const openG = s.grievances.filter((g) => !['Resolved', 'Closed'].includes(g.status))
  const gByCat = s.grievances.reduce<Record<string, number>>((m, g) => ({ ...m, [g.category]: (m[g.category] ?? 0) + 1 }), {})
  const feed = s.audit.slice(0, 6)

  return (
    <div>
      <PageHeader title="MoTA Command Center" sub="National view across all ST scholarship & fellowship schemes on one platform. Snapshot figures are prototype values; actions taken in this demo update them live."
        actions={<><ProtoTag label="Prototype data" /><Button variant="outline" icon={<Download size={16} />} onClick={() => { s.log('Report exported', `Dashboard snapshot with ${active} filter(s)`); s.toast('Report prepared (prototype) — PDF & CSV would download here', 'info') }}>Export</Button></>} />

      {/* Filters */}
      <Card className="mb-5 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900"><Filter size={15} />Filters {active > 0 && <Badge color="amber">{active} active</Badge>}
          {active > 0 && <button className="ml-auto flex items-center gap-1 text-[13px] font-semibold text-navy-700 hover:underline" onClick={() => setF({ state: 'All states', scheme: 'All schemes', inst: 'All institutions', status: 'All statuses', month: MONTHS[0], cat: CATEGORY[0], type: 'All types' })}><RotateCcw size={13} />Clear</button>}
        </div>
        <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Select aria-label="State" options={['All states', ...STATES]} value={f.state} onChange={(e) => up('state', e.target.value)} />
          <Select aria-label="Scheme" options={['All schemes', ...s.schemes.map((x) => x.short)]} value={f.scheme} onChange={(e) => up('scheme', e.target.value)} />
          <Select aria-label="Institution" options={['All institutions', ...INSTITUTIONS.map((i) => i.name)]} value={f.inst} onChange={(e) => up('inst', e.target.value)} />
          <Select aria-label="Application status" options={STATUSES} value={f.status} onChange={(e) => up('status', e.target.value)} />
          <Select aria-label="Date" options={MONTHS} value={f.month} onChange={(e) => up('month', e.target.value)} />
          <Select aria-label="Category" options={CATEGORY} value={f.cat} onChange={(e) => up('cat', e.target.value)} />
          <Select aria-label="Application type" options={['All types', 'New', 'Renewal']} value={f.type} onChange={(e) => up('type', e.target.value)} />
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {kpi.map((k, i) => (
          <motion.button key={k.label} onClick={() => nav(k.to)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-navy-100/80 bg-white p-4 text-left shadow-card transition hover:border-navy-600/30">
            <div className={cx('mb-3 grid h-9 w-9 place-items-center rounded-lg', toneCls[k.tone])}>{k.icon}</div>
            <p className="text-[12.5px] font-medium text-slate-500">{k.label}</p>
            <motion.p key={k.v} initial={{ scale: 1.08, color: '#F08A24' }} animate={{ scale: 1, color: '#0A1433' }} transition={{ duration: 0.8 }} className="font-display text-xl font-bold tabular-nums">{k.v.toLocaleString('en-IN')}</motion.p>
            {k.d !== 0 ? <Badge color={k.d > 0 ? 'green' : 'amber'} className="mt-1">{k.d > 0 ? '+' : ''}{k.d} this session</Badge> : <span className="mt-1 block text-[11px] text-slate-400">No change this session</span>}
          </motion.button>
        ))}
      </div>

      {(() => {
        const totalV = kpi[0].v
        const liveRen = live.filter((a) => a.applicationType === 'renewal')
        const renV = f.type === 'New' ? 0 : Math.round((totalV - live.length) * (f.type === 'Renewal' ? 1 : RENEWAL_SHARE)) + liveRen.length
        const newV = f.type === 'Renewal' ? 0 : totalV - renV
        const humanV = scale(3180) + live.reduce((n, a) => n + a.flags.filter((x) => x.type === 'Low AI confidence' && !x.resolved).length, 0)
        return (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[['Applications', totalV, 'text-navy-950', ''], ['Renewals', renV, 'text-violet-700', liveRen.length ? `${liveRen.length} in this session` : ''], ['New applications', newV, 'text-navy-800', ''], ['Human document review', humanV, 'text-saffron-700', `AI confidence below ${AI_CONF_THRESHOLD}%`]].map(([l, v, c, sub]) => (
              <button key={l as string} onClick={() => l === 'Renewals' ? up('type', 'Renewal') : l === 'New applications' ? up('type', 'New') : nav('/admin/applications')} className="rounded-xl border border-navy-100/80 bg-white px-4 py-3 text-left shadow-card hover:border-navy-600/30">
                <p className="text-[12px] font-medium text-slate-500">{l}</p>
                <p className={cx('font-display text-xl font-bold tabular-nums', c as string)}>{(v as number).toLocaleString('en-IN')}</p>
                {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
              </button>
            ))}
          </div>
        )
      })()}

      {demo && (
        <Card className="mt-5 flex flex-col gap-3 border-navy-600/20 bg-navy-50/60 p-4 sm:flex-row sm:items-center">
          <Activity size={20} className="shrink-0 text-saffron-600" />
          <div className="flex-1 text-sm"><span className="font-semibold text-navy-950">Tracking demo application {demo.id}</span> <span className="text-slate-600">· {demo.studentName} · currently at <b>{demo.stage}</b></span> <StatusPill s={demo.status} /></div>
          <Button size="sm" variant="outline" onClick={() => nav(`/admin/application/${demo.id}`)}>Open review <ArrowRight size={14} /></Button>
        </Card>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="flex items-center gap-2 font-display text-base font-bold text-navy-950"><MessageSquareWarning size={17} className="text-saffron-600" />Student complaints</h2><p className="text-xs text-slate-500">All grievances from students — including those raised through the AI assistant</p></div>
            <div className="flex gap-1.5"><Badge color="red">{openG.length} open</Badge><Badge color="violet">{s.grievances.filter((g) => g.channel === 'AI assistant' || g.channel === 'Helpdesk agent').length} via AI assistant</Badge></div>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">{Object.entries(gByCat).map(([k, v]) => <span key={k} className="rounded-full bg-navy-50 px-2.5 py-1 text-[11.5px] font-semibold text-navy-800">{k} · {v}</span>)}</div>
          <ul className="divide-y divide-navy-50">
            {s.grievances.slice(0, 5).map((g) => (
              <li key={g.id}><button onClick={() => nav('/admin/grievances')} className="flex w-full flex-wrap items-center gap-2 py-2.5 text-left text-[13px] hover:bg-navy-50/50">
                <span className="w-28 shrink-0 tabular-nums text-slate-500">{g.id}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-navy-950">{g.subject}</span>
                {g.priority === 'High' && <Badge color="red">High</Badge>}
                {g.channel && g.channel !== 'Web form' && <Badge color="violet">{g.channel}</Badge>}
                <StatusPill s={g.status} />
              </button></li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" className="mt-1" onClick={() => nav('/admin/grievances')}>Manage all complaints <ArrowRight size={14} /></Button>
        </Card>
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-navy-950"><ScanSearch size={17} className="text-red-600" />Low-confidence documents</h2>
          <p className="mb-3 text-xs text-slate-500">AI reading confidence below {AI_CONF_THRESHOLD}% — never auto-accepted, routed to MoTA officials</p>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-red-50 p-3"><p className="font-display text-2xl font-bold tabular-nums text-red-700">{(scale(3180) + lowPending.length).toLocaleString('en-IN')}</p><p className="text-[11.5px] text-slate-600">Awaiting manual verification</p></div>
            <div className="rounded-xl bg-leaf-50 p-3"><p className="font-display text-2xl font-bold tabular-nums text-leaf-700">{(scale(11240) + lowDone).toLocaleString('en-IN')}</p><p className="text-[11.5px] text-slate-600">Verified by officials</p></div>
          </div>
          <ul className="space-y-1.5">
            {lowPending.slice(0, 4).map(({ a, f }) => (
              <li key={a.id + f.id}><button onClick={() => nav(`/admin/application/${a.id}`)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-navy-100 px-3 py-2 text-left text-[12.5px] hover:bg-navy-50">
                <span className="min-w-0 truncate"><b className="text-navy-950">{a.studentName}</b> · {schemeById(s.schemes, a.schemeId)?.documents.find((d) => d.key === f.docType)?.label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-red-600">{f.confidence}%</span>
              </button></li>
            ))}
            {lowPending.length === 0 && <li className="text-[13px] text-slate-500">No low-confidence documents in this session’s records.</li>}
          </ul>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <ChartCard title="Application pipeline" sub="Where applications are right now" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pipe} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} stroke="#E4E8F5" />
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} width={52} />
              <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ''} />
              <Bar dataKey="value" name="Applications" radius={[6, 6, 0, 0]}>
                {pipe.map((p) => <Cell key={p.full} fill={p.full === 'State Scrutiny' ? C.saffron : p.full === 'Disbursement' ? C.leaf : C.indigo} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Verification status" sub="AI-assisted; officers decide">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={verif} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>{verif.map((v) => <Cell key={v.name} fill={v.color} />)}</Pie>
              <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Applications by state">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byState} layout="vertical" margin={{ left: 4 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="state" tick={{ fontSize: 11 }} width={78} />
              <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ''} />
              <Bar dataKey="apps" name="Applications" radius={[0, 6, 6, 0]}>{byState.map((b) => <Cell key={b.full} fill={f.state === 'All states' || f.state === b.full ? C.navy : '#CBD2E6'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Applications by scheme" sub="Same engine, different rules">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byScheme}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={48} />
              <YAxis tick={{ fontSize: 11 }} width={52} />
              <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
              <Bar dataKey="apps" name="Applications" radius={[6, 6, 0, 0]}>{byScheme.map((b) => <Cell key={b.id} fill={b.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly applications" sub="FY 2026-27">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={monthly}>
              <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.saffron} stopOpacity={0.35} /><stop offset="100%" stopColor={C.saffron} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#E4E8F5" />
              <XAxis dataKey="m" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={52} />
              <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
              <Area type="monotone" dataKey="apps" name="Applications" stroke={C.saffron} strokeWidth={2.5} fill="url(#ga)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pending workload" sub="Queue size and target turnaround (days)">
          <div className="space-y-4 pt-2">
            {workload.map((w) => {
              const max = Math.max(...workload.map((x) => x.pending), 1)
              return (
                <div key={w.who}>
                  <div className="mb-1 flex justify-between text-[13px]"><span className="font-medium text-navy-900">{w.who}</span><span className="tabular-nums text-slate-600">{w.pending.toLocaleString('en-IN')} · SLA {w.sla}d</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-navy-50"><motion.div className="h-full rounded-full bg-navy-700" initial={{ width: 0 }} animate={{ width: `${(w.pending / max) * 100}%` }} /></div>
                </div>
              )
            })}
            <p className="flex items-start gap-1.5 rounded-lg bg-violet-50 p-2.5 text-[12px] text-violet-800"><Sparkles size={14} className="mt-0.5 shrink-0" />AI pre-checks resolve most document issues before they reach an officer, shrinking the scrutiny queue.</p>
          </div>
        </ChartCard>
        <ChartCard title="Selection statistics" sub="Merit-based schemes">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={selection} layout="vertical" margin={{ left: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Selected" stackId="a" fill={C.leaf} />
              <Bar dataKey="Waitlisted" stackId="a" fill={C.saffron} />
              <Bar dataKey="Not selected" stackId="a" fill="#CBD2E6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Live activity" sub="From the audit log">
          <ul className="space-y-2.5">
            {feed.map((e) => (
              <li key={e.id} className="flex gap-2.5 text-[13px]">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-saffron-500" />
                <div className="min-w-0"><p className="font-semibold text-navy-950">{e.action}</p><p className="truncate text-slate-500">{e.user} · {e.applicationId ?? e.details}</p></div>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => nav('/admin/audit')}>Full audit log <ArrowRight size={14} /></Button>
        </ChartCard>
      </div>

      <Card className="mt-5">
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <div><h2 className="font-display text-lg font-bold text-navy-950">Applications in this session</h2><p className="text-xs text-slate-500">Individual records matching the filters ({statusLive.length})</p></div>
          <Button size="sm" variant="outline" onClick={() => nav('/admin/applications')}>Scrutiny queue</Button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <tbody className="divide-y divide-navy-50">
              {statusLive.slice(0, 40).map((a) => (
                <tr key={a.id} className={cx('cursor-pointer hover:bg-navy-50/60', a.id === s.demoAppId && 'bg-saffron-50/60')} onClick={() => nav(`/admin/application/${a.id}`)}>
                  <td className="px-5 py-2.5 font-semibold text-navy-950">{a.studentName}</td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-600">{a.id}</td>
                  <td className="px-3 py-2.5">{schemeById(s.schemes, a.schemeId)?.short}</td>
                  <td className="px-3 py-2.5 text-slate-600">{a.state}</td>
                  <td className="px-3 py-2.5">{a.stage}</td>
                  <td className="px-3 py-2.5"><StatusPill s={a.status} /></td>
                  <td className="px-3 py-2.5 text-slate-500">{fmtDate(a.submittedOn.slice(0, 10))}</td>
                </tr>
              ))}
              {statusLive.length === 0 && <tr><td className="px-5 py-8 text-center text-slate-500">No applications match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function ChartCard({ title, sub, children, className }: { title: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cx('p-5', className)}>
      <div className="mb-3"><h2 className="font-display text-base font-bold text-navy-950">{title}</h2>{sub && <p className="text-xs text-slate-500">{sub}</p>}</div>
      {children}
    </Card>
  )
}
