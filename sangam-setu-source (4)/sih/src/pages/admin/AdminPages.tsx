import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Trophy, Scale, Gavel, Info, Wallet, Loader2, RefreshCw, Play, CheckCircle2, XCircle, Clock, MessageSquare, UserCheck, Lock, Search, Download, ShieldCheck, Check, X, KeyRound, Timer, EyeOff, FileLock2, ArrowRight,
} from 'lucide-react'
import { useStore, schemeById, ROLE_META, PERMISSIONS } from '../../store/AppStore'
import type { Application, AppStatus, Disbursement, Grievance, Role } from '../../types'
import { fmtDate, inr, now } from '../../lib/rules'
import { Badge, Button, Card, Empty, Input, Label, Modal, PageHeader, ProtoTag, Select, Stat, StatusPill, Table, Tabs, Textarea, cx } from '../../components/ui'

/* ============================ SELECTION ============================ */
const PRIORITY_PTS: Record<string, number> = { PVTG: 5, 'Person with disability': 5, 'Female applicant': 3, 'First-generation learner': 2 }
const MERIT = ['nfst', 'topclass', 'nos']
type Decision = 'Selected' | 'Waitlisted' | 'Not Selected'

export function Selection() {
  const s = useStore()
  const nav = useNavigate()
  const [schemeId, setSchemeId] = useState('nfst')
  const [wm, setWm] = useState(70)
  const [usePriority, setUsePriority] = useState(true)
  const [seats, setSeats] = useState(4)
  const [wait, setWait] = useState(2)
  const [override, setOverride] = useState<Record<string, Decision>>({})
  const [confirm, setConfirm] = useState(false)
  const scheme = schemeById(s.schemes, schemeId)!

  const pool = s.applications.filter((a) => a.schemeId === schemeId && a.submittedOn >= '2026' && (a.stage === 'Selection Committee' || (a.stage === 'Sanction' && a.status === 'Selected')))
  const incomeCap = Number(scheme.rules.find((r) => r.field === 'income')?.value ?? 600000)
  const ranked = useMemo(() => pool.map((a) => {
    const incomeScore = Math.max(0, 100 - (a.income / incomeCap) * 100)
    const base = (a.marks * wm + incomeScore * (100 - wm)) / 100
    const bonus = usePriority ? a.priority.reduce((t, p) => t + (PRIORITY_PTS[p] ?? 0), 0) : 0
    return { a, score: Math.round((base + bonus) * 10) / 10, base: Math.round(base * 10) / 10, bonus }
  }).sort((x, y) => y.score - x.score), [pool, wm, usePriority, incomeCap]) // eslint-disable-line
  const suggested = (i: number): Decision => i < seats ? 'Selected' : i < seats + wait ? 'Waitlisted' : 'Not Selected'
  const committed = (a: Application) => a.stage === 'Sanction' || ['Selected', 'Waitlisted', 'Not Selected'].includes(a.status)
  const decisionOf = (a: Application, i: number): Decision => override[a.id] ?? (committed(a) ? (a.status === 'In Progress' ? suggested(i) : a.status as Decision) : suggested(i))
  const pendingN = ranked.filter((r) => !committed(r.a)).length

  const approve = () => {
    ranked.forEach((r, i) => {
      const d = decisionOf(r.a, i)
      if (d === 'Selected') {
        s.advance(r.a.id, 'Sanction', 'Selected', 'Selected by NFST Selection Committee (committee approval recorded)')
        s.set((p) => p.disbursements.some((x) => x.applicationId === r.a.id) ? {} : ({ disbursements: [{ id: `DSB-${4600 + p.disbursements.length}`, applicationId: r.a.id, studentName: r.a.studentName, schemeId: r.a.schemeId, amount: r.a.amount, status: 'Pending', installment: 'Year 1 · Instalment 1' }, ...p.disbursements] }))
      } else s.updateApp(r.a.id, { status: d })
      if (r.a.studentId === s.demoStudentId) s.notify({ title: d === 'Selected' ? `You have been selected for ${scheme.short}` : d === 'Waitlisted' ? `You are on the ${scheme.short} waitlist` : `${scheme.short} selection result`, body: d === 'Selected' ? 'Your fellowship has been sanctioned. Disbursement will be processed through PFMS.' : 'You will be informed if a seat becomes available.', channel: ['in-app', 'sms', 'email'], kind: d === 'Selected' ? 'success' : 'info', audience: 'student' })
    })
    const sel = ranked.filter((r, i) => decisionOf(r.a, i) === 'Selected').length
    s.log('Selection list approved by committee', `${scheme.short}: ${sel} selected, ${ranked.filter((r, i) => decisionOf(r.a, i) === 'Waitlisted').length} waitlisted · weights marks ${wm}% / need ${100 - wm}% · priority ${usePriority ? 'on' : 'off'}`)
    s.toast(`Committee approval recorded — ${sel} sanctioned for ${scheme.short}`)
    setOverride({}); setConfirm(false)
  }

  return (
    <div>
      <PageHeader title="Merit & selection" sub="Rule-based ranking from configured parameters. The ranking is a recommendation — it does not select anyone by itself."
        actions={<Select aria-label="Scheme" className="!w-56" options={MERIT.map((id) => schemeById(s.schemes, id)!.short)} value={scheme.short} onChange={(e) => { setSchemeId(MERIT.find((id) => schemeById(s.schemes, id)!.short === e.target.value)!); setOverride({}) }} />} />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-saffron-400 bg-saffron-50 p-4 text-sm text-navy-950"><Gavel size={18} className="mt-0.5 shrink-0 text-saffron-700" /><p><b>Final selection requires authorized committee approval.</b> The Super Admin records the committee’s decision and can override any suggested status; overrides are recorded in the audit log.</p></div>

      <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
        <Card className="h-fit p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-navy-950"><Scale size={16} />Ranking parameters</h2>
          <Label htmlFor="wm">Academic score weight: {wm}%</Label>
          <input id="wm" type="range" min={0} max={100} step={5} value={wm} onChange={(e) => setWm(Number(e.target.value))} className="w-full accent-navy-900" />
          <p className="mb-4 text-[12px] text-slate-500">Financial need weight: {100 - wm}% (lower income → higher score, relative to {inr(incomeCap)} cap)</p>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-900"><input type="checkbox" className="accent-navy-900" checked={usePriority} onChange={(e) => setUsePriority(e.target.checked)} />Apply priority factors</label>
          <ul className="mb-4 space-y-1 text-[12.5px] text-slate-600">{Object.entries(PRIORITY_PTS).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="font-semibold">+{v}</span></li>)}</ul>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="se">Seats</Label><Input id="se" type="number" min={0} value={seats} onChange={(e) => setSeats(Math.max(0, Number(e.target.value)))} /></div>
            <div><Label htmlFor="wl">Waitlist</Label><Input id="wl" type="number" min={0} value={wait} onChange={(e) => setWait(Math.max(0, Number(e.target.value)))} /></div>
          </div>
          <p className="mt-4 flex gap-1.5 text-[11.5px] text-slate-500"><Info size={13} className="mt-0.5 shrink-0" />Parameters are example values. In production they come from the scheme guidelines configured in the Scheme Builder.</p>
        </Card>

        <Card>
          {ranked.length === 0 ? <div className="p-6"><Empty title="No applicants at Selection Committee" body="Applications appear here after State Scrutiny approves them." action={<Button variant="outline" onClick={() => nav('/admin/applications')}>Go to scrutiny queue</Button>} /></div> : (
            <>
              <Table head={['Rank', 'Student', 'Scheme', 'Academic score', 'Eligibility', 'Verification', 'Priority factors', 'Score', 'Status']}>
                {ranked.map((r, i) => {
                  const d = decisionOf(r.a, i)
                  const isC = committed(r.a) && !override[r.a.id]
                  return (
                    <motion.tr layout key={r.a.id} className={cx(r.a.id === s.demoAppId && 'bg-saffron-50/60')}>
                      <td className="px-4 py-3"><span className={cx('grid h-7 w-7 place-items-center rounded-full text-xs font-bold', i < seats ? 'bg-leaf-600 text-white' : 'bg-navy-50 text-navy-800')}>{i + 1}</span></td>
                      <td className="px-4 py-3"><p className="font-semibold text-navy-950">{r.a.studentName}</p><p className="text-xs text-slate-500">{r.a.course}</p></td>
                      <td className="px-4 py-3">{scheme.short}</td>
                      <td className="px-4 py-3 tabular-nums">{r.a.marks}%</td>
                      <td className="px-4 py-3"><Badge color="green"><Check size={11} />{scheme.rules.length}/{scheme.rules.length} rules</Badge></td>
                      <td className="px-4 py-3"><Badge color={r.a.flags.some((f) => !f.resolved) ? 'amber' : 'green'}>{r.a.flags.some((f) => !f.resolved) ? 'Cleared with remarks' : 'Scrutiny cleared'}</Badge></td>
                      <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{r.a.priority.length ? r.a.priority.map((p) => <Badge key={p} color="violet">{p}</Badge>) : <span className="text-xs text-slate-400">—</span>}</div></td>
                      <td className="px-4 py-3 tabular-nums"><b>{r.score}</b>{r.bonus > 0 && <span className="text-xs text-slate-500"> ({r.base}+{r.bonus})</span>}</td>
                      <td className="px-4 py-3">
                        <select aria-label={`Status for ${r.a.studentName}`} value={d} disabled={r.a.stage === 'Sanction'} onChange={(e) => setOverride((o) => ({ ...o, [r.a.id]: e.target.value as Decision }))}
                          className={cx('h-8 rounded-lg border px-2 text-[12.5px] font-semibold', d === 'Selected' ? 'border-leaf-500/40 bg-leaf-50 text-leaf-700' : d === 'Waitlisted' ? 'border-saffron-400 bg-saffron-50 text-saffron-700' : 'border-navy-100 bg-white text-slate-600')}>
                          {['Selected', 'Waitlisted', 'Not Selected'].map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <p className="mt-0.5 text-[10.5px] text-slate-400">{r.a.stage === 'Sanction' ? 'Approved · sanctioned' : isC && r.a.status !== 'In Progress' ? 'Approved' : override[r.a.id] ? 'Committee override' : 'Suggested'}</p>
                      </td>
                    </motion.tr>
                  )
                })}
              </Table>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 p-4">
                <p className="text-sm text-slate-600">{pendingN} awaiting committee decision · {Object.keys(override).length} override(s)</p>
                <Button variant="success" icon={<Gavel size={16} />} disabled={pendingN === 0 && Object.keys(override).length === 0} onClick={() => setConfirm(true)}>Record committee approval</Button>
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Record committee approval">
        <p className="text-sm text-slate-600">You are recording the decision of the authorised {scheme.short} Selection Committee (meeting dated {fmtDate('2026-09-27')}).</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {(['Selected', 'Waitlisted', 'Not Selected'] as Decision[]).map((d) => <div key={d} className="rounded-xl bg-navy-50 p-3"><p className="font-display text-xl font-bold">{ranked.filter((r, i) => decisionOf(r.a, i) === d).length}</p><p className="text-xs text-slate-500">{d}</p></div>)}
        </div>
        <p className="mt-3 text-[12.5px] text-slate-500">Selected applicants move to Sanction and a PFMS disbursement entry is created (prototype).</p>
        <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="success" onClick={approve}>Confirm approval</Button></div>
      </Modal>
    </div>
  )
}

/* ============================ DISBURSEMENT ============================ */
export function AdminDisbursement() {
  const s = useStore()
  const [tab, setTab] = useState<'all' | Disbursement['status']>('all')
  const [busy, setBusy] = useState<string[]>([])
  const list = s.disbursements.filter((d) => tab === 'all' || d.status === tab)
  const count = (st: Disbursement['status']) => s.disbursements.filter((d) => d.status === st).length
  const total = s.disbursements.filter((d) => d.status === 'Disbursed').reduce((t, d) => t + d.amount, 0)

  const process = (ids: string[]) => {
    setBusy((b) => [...b, ...ids])
    s.set((p) => ({ disbursements: p.disbursements.map((d) => ids.includes(d.id) ? { ...d, status: 'Processing' } : d) }))
    ids.forEach((id, k) => setTimeout(() => {
      const d = s.disbursements.find((x) => x.id === id)
      const fail = !!d && d.status !== 'Failed' && d.studentName.startsWith('Ravi') // one deterministic failure for demo realism
      s.set((p) => ({ disbursements: p.disbursements.map((x) => x.id === id ? { ...x, status: fail ? 'Failed' : 'Disbursed', date: now().slice(0, 10), reference: fail ? undefined : `PFMS-PROTO-${Math.floor(900000 + Math.random() * 99999)}` } : x) }))
      if (d) {
        const app = s.applications.find((a) => a.id === d.applicationId)
        if (!fail && app && app.stage === 'Sanction') s.advance(app.id, 'Disbursement', 'Disbursed', `${inr(d.amount)} credited · ${d.installment}`)
        if (!fail && app?.studentId === s.demoStudentId) s.notify({ title: 'Scholarship amount credited', body: `${inr(d.amount)} (${d.installment}) sent to your bank account XXXXXXXX3390.`, channel: ['in-app', 'sms'], kind: 'success', audience: 'student' })
        s.log(fail ? 'Disbursement failed' : 'Disbursement completed', fail ? `${d.id}: beneficiary account inactive (simulated PFMS response)` : `${d.id}: ${inr(d.amount)} · ${d.installment}`, d.applicationId)
      }
      setBusy((b) => b.filter((x) => x !== id))
      if (k === ids.length - 1) s.toast(fail ? 'Batch processed — 1 payment failed (account inactive)' : 'Payments processed via PFMS (prototype)', fail ? 'warning' : 'success')
    }, s.lowBandwidth ? 200 : 1400 + k * 250))
  }
  const pendingIds = s.disbursements.filter((d) => d.status === 'Pending').map((d) => d.id)

  return (
    <div>
      <PageHeader title="Disbursement" sub="Track sanctioned amounts from payment file to credit."
        actions={<><ProtoTag label="PFMS Integration – Prototype" /><Button icon={<Play size={15} />} disabled={!pendingIds.length} onClick={() => process(pendingIds)}>Process all pending ({pendingIds.length})</Button></>} />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Pending" value={count('Pending')} icon={<Clock size={18} />} tone="saffron" onClick={() => setTab('Pending')} />
        <Stat label="Processing" value={count('Processing')} icon={<Loader2 size={18} />} tone="navy" onClick={() => setTab('Processing')} />
        <Stat label="Disbursed" value={count('Disbursed')} icon={<CheckCircle2 size={18} />} tone="leaf" onClick={() => setTab('Disbursed')} />
        <Stat label="Failed" value={count('Failed')} icon={<XCircle size={18} />} tone="red" onClick={() => setTab('Failed')} />
        <Stat label="Amount credited" value={inr(total)} icon={<Wallet size={18} />} tone="violet" sub="This session's records" />
      </div>
      <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All' }, { id: 'Pending', label: 'Pending' }, { id: 'Processing', label: 'Processing' }, { id: 'Disbursed', label: 'Disbursed' }, { id: 'Failed', label: 'Failed' }]} /></div>
      <Card>
        {list.length === 0 ? <div className="p-6"><Empty title="No records" body="No disbursements with this status." /></div> : (
          <Table head={['Application', 'Student', 'Scheme', 'Amount', 'Instalment', 'Status', 'Date', 'Payment reference', '']}>
            {list.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 tabular-nums">{d.applicationId}</td>
                <td className="px-4 py-3 font-semibold text-navy-950">{d.studentName}</td>
                <td className="px-4 py-3">{schemeById(s.schemes, d.schemeId)?.short}</td>
                <td className="px-4 py-3 tabular-nums">{inr(d.amount)}</td>
                <td className="px-4 py-3 text-slate-600">{d.installment}</td>
                <td className="px-4 py-3">{d.status === 'Processing' ? <Badge color="navy"><Loader2 size={11} className="animate-spin" />Processing</Badge> : <StatusPill s={d.status} />}</td>
                <td className="px-4 py-3 text-slate-600">{fmtDate(d.date)}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-slate-600">{d.reference ?? (d.status === 'Failed' ? 'Account inactive' : '—')}</td>
                <td className="px-4 py-3">
                  {d.status === 'Pending' && <Button size="sm" variant="outline" disabled={busy.includes(d.id)} icon={<Play size={13} />} onClick={() => process([d.id])}>Process</Button>}
                  {d.status === 'Failed' && <Button size="sm" variant="outline" icon={<RefreshCw size={13} />} onClick={() => { s.log('Beneficiary account re-validated', `${d.id}: student updated bank details (simulated)`, d.applicationId); process([d.id]) }}>Retry</Button>}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <p className="mt-3 text-[12px] text-slate-500">No real payments are made. References are generated locally to illustrate the PFMS handshake.</p>
    </div>
  )
}

/* ============================ GRIEVANCES ============================ */
const OFFICERS = ['MoTA Super Admin', 'PFMS Cell – Jharkhand', 'Institution Nodal – BIRT', 'Helpdesk Tier-1', 'Helpdesk Tier-1 (R. Hembrom)', 'Technical Support – Platform Cell']
const G_STATUS: Grievance['status'][] = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed']

export function AdminGrievances() {
  const s = useStore()
  const [sel, setSel] = useState(s.grievances[0]?.id ?? '')
  const [reply, setReply] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open')
  const list = s.grievances.filter((g) => filter === 'all' || (filter === 'open' ? !['Resolved', 'Closed'].includes(g.status) : ['Resolved', 'Closed'].includes(g.status)))
  const g = s.grievances.find((x) => x.id === sel)
  const patch = (p: Partial<Grievance>, logMsg: string) => {
    if (!g) return
    s.set((st) => ({ grievances: st.grievances.map((x) => x.id === g.id ? { ...x, ...p } : x) }))
    s.log('Grievance updated', `${g.id}: ${logMsg}`, g.applicationId)
  }
  const respond = () => {
    if (!g || !reply.trim()) return
    patch({ thread: [...g.thread, { by: `${s.actorName} (${s.actorRole})`, text: reply.trim(), at: now() }], status: g.status === 'Open' || g.status === 'Assigned' ? 'In Progress' : g.status }, 'response sent')
    s.notify({ title: `Update on grievance ${g.id}`, body: reply.trim(), channel: ['in-app', 'sms'], kind: 'info', audience: 'student' })
    setReply(''); s.toast('Response sent — student notified')
  }

  return (
    <div>
      <PageHeader title="Grievance management" sub="Every ticket has an owner, a timeline and a response trail." />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="p-3">
          <div className="mb-2 px-1"><Tabs value={filter} onChange={setFilter} tabs={[{ id: 'open', label: 'Open' }, { id: 'closed', label: 'Resolved' }, { id: 'all', label: 'All' }]} /></div>
          <ul className="space-y-1">
            {list.length === 0 && <li className="p-4 text-sm text-slate-500">No tickets.</li>}
            {list.map((x) => (
              <li key={x.id}><button onClick={() => setSel(x.id)} className={cx('w-full rounded-lg p-3 text-left transition', sel === x.id ? 'bg-navy-50 ring-1 ring-navy-600/20' : 'hover:bg-paper')}>
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold tabular-nums text-slate-500">{x.id}</span><StatusPill s={x.status} /></div>
                <p className="mt-1 font-semibold text-navy-950">{x.subject}</p>
                <p className="text-xs text-slate-500">{x.category} · {fmtDate(x.createdOn)}</p>
                {(x.channel && x.channel !== 'Web form' || x.priority === 'High') && <div className="mt-1.5 flex gap-1">{x.channel && x.channel !== 'Web form' && <Badge color="violet">{x.channel}</Badge>}{x.priority === 'High' && <Badge color="red">High priority</Badge>}</div>}
              </button></li>
            ))}
          </ul>
        </Card>
        {!g ? <Empty title="Select a ticket" body="Choose a grievance on the left to view and respond." /> : (
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-semibold tabular-nums text-slate-500">{g.id} · {g.category}{g.channel ? ` · raised via ${g.channel}` : ''}</p><h2 className="font-display text-xl font-bold text-navy-950">{g.subject}</h2>{g.applicationId && <p className="text-sm text-slate-600">Linked application {g.applicationId}</p>}</div>
              <StatusPill s={g.status} />
            </div>
            <p className="mt-3 rounded-xl bg-paper p-3 text-sm text-slate-700">{g.description}</p>
            {g.attachment && <p className="mt-2 text-xs text-slate-500">Attachment: {g.attachment}</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div><Label htmlFor="as">Assigned officer</Label><Select id="as" options={['Unassigned', ...OFFICERS, ...(g.assignedTo && !OFFICERS.includes(g.assignedTo) ? [g.assignedTo] : [])]} value={g.assignedTo ?? 'Unassigned'} onChange={(e) => { patch({ assignedTo: e.target.value, status: g.status === 'Open' ? 'Assigned' : g.status }, `assigned to ${e.target.value}`); s.toast(`Assigned to ${e.target.value}`) }} /></div>
              <div><Label htmlFor="gs">Status</Label><Select id="gs" options={G_STATUS} value={g.status} onChange={(e) => { patch({ status: e.target.value as Grievance['status'] }, `status → ${e.target.value}`); s.toast(`Status changed to ${e.target.value}`) }} /></div>
            </div>
            <h3 className="mb-2 mt-5 flex items-center gap-1.5 text-sm font-semibold text-navy-900"><MessageSquare size={14} />Timeline</h3>
            <ol className="relative space-y-3 border-l-2 border-navy-100 pl-4">
              <li className="text-[13px]"><span className="absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full bg-navy-600" /><p className="font-semibold text-navy-950">Ticket raised</p><p className="text-slate-500">{fmtDate(g.createdOn)}</p></li>
              {g.thread.map((t, i) => <li key={i} className="text-[13px]"><span className="absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full bg-saffron-500" /><p className="font-semibold text-navy-950">{t.by}</p><p className="text-slate-700">{t.text}</p><p className="text-[11.5px] text-slate-500">{t.at}</p></li>)}
            </ol>
            {g.status !== 'Closed' && (
              <div className="mt-5">
                <Label htmlFor="rp">Respond to student</Label>
                <Textarea id="rp" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a clear, specific response" />
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={() => { patch({ status: 'Closed', thread: [...g.thread, { by: s.actorName, text: 'Ticket closed after resolution.', at: now() }] }, 'closed'); s.toast('Ticket closed') }}>Close ticket</Button>
                  <Button disabled={!reply.trim()} onClick={respond}>Send response</Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}

/* ============================ AUDIT LOG ============================ */
export function AuditLog() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('All roles')
  const roles = ['All roles', ...Array.from(new Set(s.audit.map((a) => a.role)))]
  const rows = s.audit.filter((a) => (role === 'All roles' || a.role === role) && (a.user + a.action + (a.applicationId ?? '') + a.details).toLowerCase().includes(q.toLowerCase()))
  const exportCsv = () => {
    const csv = ['User,Role,Action,Date/time,Application,Details', ...rows.map((r) => [r.user, r.role, r.action, r.at, r.applicationId ?? '', r.details].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const el = document.createElement('a'); el.href = url; el.download = 'audit-log-prototype.csv'; el.click(); URL.revokeObjectURL(url)
    s.toast('Audit log exported as CSV')
  }
  return (
    <div>
      <PageHeader title="Audit log" sub="Append-only record of every important action — who did what, when, on which application." actions={<Button variant="outline" icon={<Download size={15} />} onClick={exportCsv}>Export CSV</Button>} />
      <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><Input aria-label="Search audit log" className="pl-9" placeholder="Search user, action, application…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select aria-label="Filter by role" className="sm:w-60" options={roles} value={role} onChange={(e) => setRole(e.target.value)} />
      </Card>
      <Card>
        <Table head={['User', 'Action', 'Date/time', 'Application', 'Details']}>
          {rows.map((r, i) => (
            <motion.tr key={r.id} initial={i < 3 ? { backgroundColor: '#FEF6EE' } : false} animate={{ backgroundColor: '#FFFFFF' }} transition={{ duration: 1.5 }}>
              <td className="px-4 py-3"><p className="font-semibold text-navy-950">{r.user}</p><p className="text-xs text-slate-500">{r.role}</p></td>
              <td className="px-4 py-3 font-medium">{r.action}</td>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">{r.at}</td>
              <td className="px-4 py-3 tabular-nums">{r.applicationId ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{r.details}</td>
            </motion.tr>
          ))}
        </Table>
        {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No entries match.</p>}
      </Card>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-slate-500"><Lock size={13} />In production, entries are hash-chained and cannot be edited or deleted by any role.</p>
    </div>
  )
}

/* ============================ ROLES ============================ */
const CAPS: { label: string; path?: string; roles?: Role[] }[] = [
  { label: 'Apply & track own applications', roles: ['student'] },
  { label: 'Verify enrolled students', roles: ['institution'] },
  { label: 'Command center dashboard', path: '/admin/dashboard' },
  { label: 'Scrutiny queue & review', path: '/admin/applications' },
  { label: 'Merit & selection', path: '/admin/selection' },
  { label: 'Disbursement', path: '/admin/disbursement' },
  { label: 'Scheme Builder', path: '/admin/scheme-builder' },
  { label: 'Grievances', path: '/admin/grievances' },
  { label: 'Audit log', path: '/admin/audit' },
  { label: 'Roles & permissions', path: '/admin/roles' },
]

export function Roles() {
  const s = useStore()
  const nav = useNavigate()
  const roles = Object.keys(ROLE_META) as Role[]
  const has = (c: typeof CAPS[number], r: Role) => c.roles ? c.roles.includes(r) : (PERMISSIONS[c.path!] ?? []).includes(r)
  return (
    <div>
      <PageHeader title="Roles & permissions" sub="Three roles: students, institutions, and a Super Admin who holds every MoTA officer function — scrutiny, selection, disbursement, grievances, scheme configuration and audit." />
      <Card className="mb-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead><tr className="border-b border-navy-100 text-xs font-semibold text-slate-500"><th scope="col" className="px-4 py-3 text-left">Capability</th>{roles.map((r) => <th key={r} scope="col" className="px-2 py-3 text-center">{ROLE_META[r].label}</th>)}</tr></thead>
            <tbody className="divide-y divide-navy-50">
              {CAPS.map((c) => (
                <tr key={c.label}><td className="px-4 py-2.5 font-medium text-navy-950">{c.label}</td>
                  {roles.map((r) => <td key={r} className="px-2 py-2.5 text-center">{has(c, r) ? <Check size={16} className="mx-auto text-leaf-600" aria-label="Allowed" /> : <X size={16} className="mx-auto text-slate-300" aria-label="Not allowed" />}</td>)}
                </tr>
              ))}
              <tr className="bg-paper"><td className="px-4 py-3 text-xs text-slate-500">Try it</td>
                {roles.map((r) => <td key={r} className="px-2 py-3 text-center"><Button size="sm" variant={s.role === r ? 'primary' : 'outline'} onClick={() => { s.set(() => ({ role: r })); s.log('Role switched (demo)', `Now acting as ${ROLE_META[r].label}`); nav(ROLE_META[r].home) }}>{s.role === r ? 'Current' : 'Switch'}</Button></td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: <KeyRound size={18} />, t: 'Strong sign-in', b: 'OTP / MFA for the Super Admin; Aadhaar-based e-KYC would be integrated in production (not implemented).' },
          { icon: <Timer size={18} />, t: 'Session timeout', b: 'Idle sessions lock after 8 minutes. Try “Simulate timeout” in student settings.' },
          { icon: <EyeOff size={18} />, t: 'Data minimisation', b: 'Aadhaar, account and phone numbers are masked everywhere; only the institution and the Super Admin can open applicant records.' },
          { icon: <FileLock2 size={18} />, t: 'Secure documents', b: 'Documents encrypted at rest, watermarked on view, and every view is logged.' },
        ].map((x) => (
          <Card key={x.t} className="p-4"><div className="mb-2 grid h-9 w-9 place-items-center rounded-lg bg-navy-50 text-navy-800">{x.icon}</div><p className="font-semibold text-navy-950">{x.t}</p><p className="mt-1 text-[13px] text-slate-600">{x.b}</p></Card>
        ))}
      </div>
      <Card className="mt-5 flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center">
        <ShieldCheck size={20} className="text-leaf-600" />
        <p className="flex-1 text-sm text-slate-700">All demo data is fictional. No real Aadhaar, DigiLocker, PFMS or NSP connection is made — these are shown as <b>Prototype Integration</b>.</p>
        <Button size="sm" variant="ghost" onClick={() => nav('/admin/audit')}>View audit log <ArrowRight size={14} /></Button>
      </Card>
    </div>
  )
}

