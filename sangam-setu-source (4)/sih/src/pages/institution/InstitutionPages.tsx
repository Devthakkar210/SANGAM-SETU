import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, ClipboardCheck, AlertTriangle, FileStack, CheckCircle2, Undo2, Eye, Sparkles, ListChecks, Building2, ShieldCheck, Search, Clock, BadgeCheck, Mail, Phone, KeyRound,
} from 'lucide-react'
import { useStore, schemeById } from '../../store/AppStore'
import { INSTITUTIONS, DEMO_INSTITUTION_ID } from '../../data/mock'
import { fmtDate, inr } from '../../lib/rules'
import type { Application } from '../../types'
import { Badge, Button, Card, Empty, Input, Label, Modal, PageHeader, ProtoTag, Select, Stat, StatusPill, Table, Tabs, Textarea, cx, AIBadge } from '../../components/ui'
import { Timeline } from '../student/Tracker'
import { InstitutionCard } from '../../components/InstitutionCard'

const demoInst = INSTITUTIONS.find((i) => i.id === DEMO_INSTITUTION_ID)!

/** The institution that is signed in: a registered account, or the seeded demo institution. */
function useInst() {
  const { myInstitution: m } = useStore()
  return m ? { id: m.id, name: m.name, code: m.code, state: m.state, type: m.type, nodal: m.nodal } : demoInst
}

function useInstApps() {
  const s = useStore()
  const inst = useInst()
  return useMemo(() => s.applications.filter((a) => a.institutionId === inst.id && a.submittedOn >= '2026'), [s.applications, inst.id])
}

const isPending = (a: Application) => a.stage === 'Institution Verification' && a.status === 'In Progress'
const openFlags = (a: Application) => a.flags.filter((f) => !f.resolved)

/** Shared verify/return actions so dashboard and table behave identically. */
function useInstActions() {
  const s = useStore()
  const inst = useInst()
  const verify = (a: Application, quiet = false) => {
    s.advance(a.id, 'State Scrutiny', 'In Progress', `Verified by ${inst.nodal} (Institution nodal officer): enrolment, bonafide and fee details confirmed.`)
    s.set((p) => ({ applications: p.applications.map((x) => x.id === a.id ? { ...x, history: x.history.map((h) => h.stage === 'Institution Verification' && !h.date ? { ...h, date: x.submittedOn } : h) } : x) }))
    if (a.studentId === s.demoStudentId) {
      s.notify({ title: 'Institution verification completed', body: `${inst.name} verified your application ${a.id}.`, channel: ['in-app', 'sms'], kind: 'success', audience: 'student' })
      s.notify({ title: 'Your application has moved to State Scrutiny', body: `${a.id} is now with the State Tribal Welfare Department for scrutiny.`, channel: ['in-app', 'email'], kind: 'info', audience: 'student' })
    }
    s.notify({ title: 'Application ready for scrutiny', body: `${a.id} · ${a.studentName} verified by institution`, channel: ['in-app'], kind: 'action', audience: 'admin' })
    s.log('Institution verification completed', `Enrolment and bonafide confirmed by ${inst.nodal}`, a.id)
    if (!quiet) s.toast(`${a.id} verified and forwarded to State Scrutiny`)
  }
  const returnFor = (a: Application, title: string, reason: string) => {
    s.raiseDeficiency({ applicationId: a.id, title, reason, raisedBy: `${inst.nodal} (Institution)`, docType: /bonafide/i.test(title) ? 'bonafide' : /fee|marks/i.test(title) ? 'marksheet' : undefined })
    s.setStatus(a.id, 'Correction Requested')
    if (a.studentId === s.demoStudentId) s.notify({ title: 'Your institution requested a correction', body: `${title}: ${reason}`, channel: ['in-app', 'sms', 'email'], kind: 'action', audience: 'student' })
    s.log('Returned for correction', `${title} — ${reason}`, a.id)
    s.toast(`${a.id} returned to student for correction`, 'warning')
  }
  return { verify, returnFor }
}

/* ------------------------------------------------------------------ */
export function InstDashboard() {
  const s = useStore()
  const nav = useNavigate()
  const inst = useInst()
  const apps = useInstApps()
  const pending = apps.filter(isPending)
  const verified = apps.filter((a) => ['State Scrutiny', 'Selection Committee', 'Sanction', 'Disbursement'].includes(a.stage) && a.status !== 'Correction Requested')
  const defs = apps.filter((a) => a.status === 'Correction Requested')
  const flagged = pending.filter((a) => openFlags(a).length)
  const demo = apps.find((a) => a.id === s.demoAppId)
  const notes = s.notifications.filter((n) => n.audience === 'institution').slice(0, 4)
  const total = apps.length || 1
  const toQueue = () => document.getElementById('verify')?.scrollIntoView({ behavior: s.lowBandwidth ? 'auto' : 'smooth', block: 'start' })

  return (
    <div>
      <PageHeader title="Overview" sub={<>{inst.name} · {inst.code} · Nodal officer {inst.nodal}</>}
        actions={<><ProtoTag label="AISHE / UDISE — Integration Ready" /><Button onClick={toQueue} icon={<ClipboardCheck size={16} />}>Go to verification</Button></>} />

      {demo && isPending(demo) && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-5 flex flex-col gap-3 border-saffron-400 bg-saffron-50/60 p-4 sm:flex-row sm:items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-saffron-500 text-navy-950"><Clock size={18} /></div>
            <div className="flex-1">
              <p className="font-semibold text-navy-950">New: {demo.studentName} submitted {schemeById(s.schemes, demo.schemeId)?.short} application {demo.id}</p>
              <p className="text-sm text-slate-600">Profile, documents and AI pre-check are attached. Confirm enrolment to forward it to State Scrutiny.</p>
            </div>
            <Button variant="saffron" onClick={toQueue}>Review now</Button>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Pending verification" value={pending.length} icon={<Clock size={18} />} tone="saffron" onClick={toQueue} />
        <Stat label="Verified this cycle" value={verified.length} icon={<CheckCircle2 size={18} />} tone="leaf" />
        <Stat label="Returned / deficiencies" value={defs.length} icon={<Undo2 size={18} />} tone="red" />
        <Stat label="Total applications" value={apps.length} icon={<FileStack size={18} />} />
        <Stat label="AI flags to look at" value={flagged.length} icon={<Sparkles size={18} />} tone="violet" sub="Advisory only" />
      </div>

      <div id="verify" className="mt-6 scroll-mt-20"><Verification embedded /></div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg font-bold text-navy-950">Verification progress</h2>
          {[['Verified', verified.length, 'bg-leaf-500'], ['Pending', pending.length, 'bg-saffron-500'], ['Returned', defs.length, 'bg-red-500']].map(([l, n, c]) => (
            <div key={l as string} className="mb-3">
              <div className="mb-1 flex justify-between text-sm"><span className="text-slate-600">{l}</span><span className="font-semibold tabular-nums">{n as number}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-navy-50"><motion.div className={cx('h-full rounded-full', c as string)} initial={{ width: 0 }} animate={{ width: `${((n as number) / total) * 100}%` }} /></div>
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg font-bold text-navy-950">Recent notifications</h2>
          <ul className="space-y-2">
            {notes.length === 0 && <li className="text-sm text-slate-500">No notifications yet.</li>}
            {notes.map((n) => <li key={n.id} className="rounded-lg bg-navy-50 px-3 py-2 text-[13px]"><p className="font-semibold text-navy-950">{n.title}</p><p className="text-slate-600">{n.body}</p></li>)}
          </ul>
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
const RETURN_REASONS = ['Bonafide certificate outdated', 'Fee receipt missing', 'Enrolment details do not match', 'Marks / semester details incorrect', 'Other']

export function Verification({ embedded }: { embedded?: boolean } = {}) {
  const s = useStore()
  const apps = useInstApps()
  const { verify, returnFor } = useInstActions()
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [sel, setSel] = useState<string[]>([])
  const [detail, setDetail] = useState<Application | null>(null)
  const [ret, setRet] = useState<Application | null>(null)
  const [bulk, setBulk] = useState(false)
  const [reason, setReason] = useState(RETURN_REASONS[0])
  const [note, setNote] = useState('')

  const rows = (tab === 'pending' ? apps.filter(isPending) : apps).slice().sort((a, b) => (a.id === s.demoAppId ? -1 : b.id === s.demoAppId ? 1 : 0))
  const selectable = rows.filter(isPending)
  const toggle = (id: string) => setSel((x) => x.includes(id) ? x.filter((y) => y !== id) : [...x, id])
  const bulkApps = apps.filter((a) => sel.includes(a.id) && isPending(a))
  const bulkClean = bulkApps.filter((a) => !openFlags(a).some((f) => f.severity === 'high'))
  const bulkHeld = bulkApps.filter((a) => openFlags(a).some((f) => f.severity === 'high'))

  const doBulk = () => {
    bulkClean.forEach((a) => verify(a, true))
    s.log('Bulk verification', `${bulkClean.length} applications verified in bulk; ${bulkHeld.length} held for individual review (high-severity AI flag)`)
    s.toast(`${bulkClean.length} applications verified${bulkHeld.length ? ` · ${bulkHeld.length} held for individual review` : ''}`)
    setSel([]); setBulk(false)
  }

  return (
    <div>
      {embedded ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="font-display text-xl font-bold text-navy-950">Student verification</h2><p className="text-sm text-slate-600">Confirm that each applicant is genuinely enrolled. AI flags are advisory — you make the decision.</p></div>
          <Button variant="saffron" icon={<ListChecks size={16} />} disabled={!sel.length} onClick={() => setBulk(true)}>Bulk Verification{sel.length ? ` (${sel.length})` : ''}</Button>
        </div>
      ) : <PageHeader title="Student verification" sub="Confirm that each applicant is genuinely enrolled. AI flags are advisory and explain what to look at — you make the decision."
        actions={<Button variant="saffron" icon={<ListChecks size={16} />} disabled={!sel.length} onClick={() => setBulk(true)}>Bulk Verification{sel.length ? ` (${sel.length})` : ''}</Button>} />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={(v) => { setTab(v); setSel([]) }} tabs={[{ id: 'pending', label: `Pending (${apps.filter(isPending).length})` }, { id: 'all', label: `All (${apps.length})` }]} />
        <p className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck size={14} className="text-leaf-600" />You can only see applicants of your institution (role-based access)</p>
      </div>

      <Card>
        {rows.length === 0 ? <div className="p-6"><Empty title="Queue is empty" body="Every application from your institution has been actioned." action={<Button variant="outline" onClick={() => setTab('all')}>View all applications</Button>} /></div> : (
          <Table head={['', 'Student', 'Application ID', 'Scheme', 'Documents', 'AI Flag', 'Status', 'Action']}>
            {rows.map((a) => {
              const sc = schemeById(s.schemes, a.schemeId)
              const fl = openFlags(a)
              const pend = isPending(a)
              return (
                <tr key={a.id} className={cx('transition-colors', a.id === s.demoAppId && 'bg-saffron-50/50')}>
                  <td className="px-4 py-3">{pend && <input type="checkbox" aria-label={`Select ${a.studentName}`} checked={sel.includes(a.id)} onChange={() => toggle(a.id)} className="h-4 w-4 accent-navy-900" />}</td>
                  <td className="px-4 py-3"><p className="font-semibold text-navy-950">{a.studentName}</p><p className="text-xs text-slate-500">{a.course}</p></td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{a.id}</td>
                  <td className="px-4 py-3">{sc?.short}</td>
                  <td className="px-4 py-3"><Badge color="green">{sc?.documents.length ?? 0}/{sc?.documents.length ?? 0} uploaded</Badge></td>
                  <td className="px-4 py-3">{fl.length ? <button onClick={() => setDetail(a)} className="text-left"><Badge color={fl[0].severity === 'high' ? 'red' : 'amber'}><AlertTriangle size={12} />{fl[0].type}</Badge></button>
                    : a.flags.length ? <Badge color="green">Resolved by applicant</Badge> : <Badge color="gray">None</Badge>}</td>
                  <td className="px-4 py-3"><StatusPill s={pend ? 'Pending verification' : a.status === 'Correction Requested' ? 'Correction Requested' : 'Verified'} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {pend && <Button size="sm" variant="success" icon={<CheckCircle2 size={14} />} onClick={() => verify(a)}>Verify</Button>}
                      {pend && <Button size="sm" variant="outline" icon={<Undo2 size={14} />} onClick={() => { setRet(a); setNote('') }}>Return</Button>}
                      <Button size="sm" variant="ghost" icon={<Eye size={14} />} onClick={() => setDetail(a)} aria-label={`View details of ${a.studentName}`}>Details</Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
        {tab === 'pending' && selectable.length > 0 && (
          <div className="flex items-center gap-3 border-t border-navy-100 px-4 py-3 text-sm">
            <button className="font-semibold text-navy-800 hover:underline" onClick={() => setSel(sel.length === selectable.length ? [] : selectable.map((a) => a.id))}>{sel.length === selectable.length ? 'Clear selection' : 'Select all pending'}</button>
            <span className="text-slate-500">{sel.length} selected</span>
          </div>
        )}
      </Card>

      {/* Details */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.studentName} · ${detail.id}` : ''} wide>
        {detail && (() => {
          const a = s.applications.find((x) => x.id === detail.id) ?? detail
          const sc = schemeById(s.schemes, a.schemeId)
          return (
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-navy-900">Applicant</h3>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-navy-50 p-4 text-[13px]">
                  {[['Scheme', sc?.short], ['Course', a.course], ['State', a.state], ['Marks', `${a.marks}%`], ['Declared income', inr(a.income)], ['Submitted', fmtDate(a.submittedOn.slice(0, 10))]].map(([k, v]) => <div key={k}><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-navy-950">{v}</dd></div>)}
                </dl>
                <h3 className="mb-2 mt-4 text-sm font-semibold text-navy-900">Documents</h3>
                <ul className="space-y-1.5">{sc?.documents.map((d) => <li key={d.key} className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-[13px]"><span>{d.label}</span><Badge color="green"><BadgeCheck size={12} />Read by AI</Badge></li>)}</ul>
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-900">AI pre-check <AIBadge label="Advisory" /></h3>
                {a.flags.length === 0 ? <p className="rounded-xl bg-leaf-50 p-3 text-[13px] text-leaf-700">No potential issues detected across documents.</p> :
                  a.flags.map((f) => (
                    <div key={f.id} className={cx('mb-2 rounded-xl border p-3 text-[13px]', f.resolved ? 'border-leaf-500/30 bg-leaf-50' : 'border-saffron-400 bg-saffron-50')}>
                      <p className="font-semibold text-navy-950">{f.resolved ? 'Resolved: ' : 'Potential issue: '}{f.type} <span className="font-normal text-slate-500">· confidence {f.confidence}%</span></p>
                      <p className="mt-1 text-slate-700">{f.explanation}</p>
                    </div>
                  ))}
                <h3 className="mb-2 mt-4 text-sm font-semibold text-navy-900">Progress</h3>
                <Timeline app={a} compact />
              </div>
              {isPending(a) && (
                <div className="flex justify-end gap-2 md:col-span-2">
                  <Button variant="outline" icon={<Undo2 size={14} />} onClick={() => { setDetail(null); setRet(a) }}>Return for correction</Button>
                  <Button variant="success" icon={<CheckCircle2 size={14} />} onClick={() => { verify(a); setDetail(null) }}>Verify enrolment</Button>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

      {/* Return */}
      <Modal open={!!ret} onClose={() => setRet(null)} title="Return for correction">
        {ret && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">The student will see exactly this reason and can fix only this item — the rest of the application stays intact.</p>
            <div><Label htmlFor="rr">Reason</Label><Select id="rr" options={RETURN_REASONS} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            <div><Label htmlFor="rn" hint="(shown to student)">Details</Label><Textarea id="rn" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please upload the bonafide certificate issued for session 2026-27." /></div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRet(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => { returnFor(ret, reason, note || 'Please update this item and resubmit.'); setRet(null) }}>Send back to student</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk */}
      <Modal open={bulk} onClose={() => setBulk(false)} title="Bulk Verification">
        <p className="text-sm text-slate-600">You are confirming enrolment for <b>{bulkClean.length}</b> applicant{bulkClean.length === 1 ? '' : 's'}.</p>
        {bulkHeld.length > 0 && (
          <div className="mt-3 rounded-xl border border-saffron-400 bg-saffron-50 p-3 text-[13px] text-navy-900">
            <p className="font-semibold">{bulkHeld.length} held for individual review</p>
            <p>These have a high-severity AI flag ({bulkHeld.map((a) => a.studentName).join(', ')}). Bulk actions skip them so a person looks at each one.</p>
          </div>
        )}
        <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-[13px]">{bulkClean.map((a) => <li key={a.id} className="flex justify-between rounded bg-navy-50 px-3 py-1.5"><span>{a.studentName}</span><span className="tabular-nums text-slate-500">{a.id}</span></li>)}</ul>
        <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setBulk(false)}>Cancel</Button><Button variant="success" disabled={!bulkClean.length} onClick={doBulk}>Verify {bulkClean.length}</Button></div>
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------------ */
export function InstStudents() {
  const s = useStore()
  const apps = useInstApps()
  const [q, setQ] = useState('')
  const [scheme, setScheme] = useState('All schemes')
  const list = apps.filter((a) => (scheme === 'All schemes' || schemeById(s.schemes, a.schemeId)?.short === scheme) && (a.studentName + a.id + a.course).toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <PageHeader title="Students" sub="All ST scholarship applicants enrolled at your institution this cycle." />
      <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><Input aria-label="Search students" className="pl-9" placeholder="Search by name, application ID or course" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select aria-label="Filter by scheme" className="sm:w-56" options={['All schemes', ...s.schemes.map((x) => x.short)]} value={scheme} onChange={(e) => setScheme(e.target.value)} />
      </Card>
      <Card>
        {list.length === 0 ? <div className="p-6"><Empty title="No students match" body="Try a different search or scheme filter." /></div> : (
          <Table head={['Student', 'Application', 'Scheme', 'Course', 'Stage', 'Status', 'Amount']}>
            {list.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-semibold text-navy-950">{a.studentName}</td>
                <td className="px-4 py-3 tabular-nums">{a.id}</td>
                <td className="px-4 py-3">{schemeById(s.schemes, a.schemeId)?.short}</td>
                <td className="px-4 py-3">{a.course}</td>
                <td className="px-4 py-3">{a.stage}</td>
                <td className="px-4 py-3"><StatusPill s={a.status} /></td>
                <td className="px-4 py-3 tabular-nums">{inr(a.amount)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

export function InstProfile() {
  const s = useStore()
  const inst = useInst()
  const m = s.myInstitution
  const schemeNames = (ids: string[]) => ids.map((id) => s.schemes.find((x) => x.id === id)?.short ?? id).join(', ')
  const rows: [string, string][] = m
    ? [['Institution code', m.code], ['AISHE code (masked)', `${m.aishe.slice(0, 3)}XX${m.aishe.slice(-2)}`], ['Nodal officer', m.nodal], ['Designation', m.designation], ['Official e-mail', m.email], ['Phone', `${m.phone.slice(0, 2)}XXXX${m.phone.slice(-4)}`], ['Courses mapped', m.courses.join(' · ')], ['Schemes participating', schemeNames(m.schemes)]]
    : [['Institution code', inst.code], ['AISHE code (masked)', 'U-0XX42'], ['Nodal officer', inst.nodal], ['Designation', 'Deputy Registrar (Academics)'], ['Official e-mail', 'nodal.scholarship@birt.example'], ['Phone', '0651-XXXX-120'], ['Courses mapped', 'UG · PG · MPhil/PhD'], ['Schemes participating', s.schemes.filter((x) => x.status === 'Live' && x.id !== 'prematric' && x.id !== 'nos').map((x) => x.short).join(', ')]]
  return (
    <div>
      <PageHeader title="Institution profile" sub="Registered institution details used to route applications for verification." />
      <div className="grid gap-5 lg:grid-cols-3">
        <InstitutionCard className="lg:col-span-2" name={inst.name} type={inst.type} state={inst.state} badge={m?.verifiedAt ? 'Registered · Verified' : 'Registered'} rows={rows} />
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-navy-950">Access & security</h2>
          <ul className="space-y-3 text-[13px] text-slate-700">
            <li className="flex gap-2"><KeyRound size={16} className="shrink-0 text-navy-700" />Two-factor sign-in for nodal officer (prototype)</li>
            <li className="flex gap-2"><ShieldCheck size={16} className="shrink-0 text-leaf-600" />Sees only applicants enrolled at this institution</li>
            <li className="flex gap-2"><Mail size={16} className="shrink-0 text-navy-700" />Every verification is written to the audit log</li>
            <li className="flex gap-2"><Phone size={16} className="shrink-0 text-navy-700" />Students notified by SMS on every action</li>
            <li className="flex gap-2"><Users size={16} className="shrink-0 text-navy-700" />Delegate access to 2 deputy verifiers</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2"><ProtoTag label="AISHE — Integration Ready" /><ProtoTag label="UDISE+ — Integration Ready" /></div>
          <Button className="mt-4 w-full" variant="outline" onClick={() => { s.log('Institution profile update requested', 'Nodal officer contact change submitted for state approval'); s.toast('Change request sent to the State Nodal Cell for approval', 'info') }}>Request profile change</Button>
        </Card>
      </div>
    </div>
  )
}
