import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Circle, FastForward, AlertTriangle, MessageSquareText, Building2, Sparkles, UserRound, Landmark, Users, BadgeCheck, IndianRupee, Send } from 'lucide-react'
import { schemeById, useStore } from '../../store/AppStore'
import { Badge, Button, Card, cx, Progress, ProtoTag, StatusPill } from '../../components/ui'
import { STAGES, type Application, type Stage } from '../../types'
import { fmtDate, inr } from '../../lib/rules'

export const STAGE_INFO: Record<Stage, { who: string; what: string; icon: typeof Check }> = {
  Draft: { who: 'Student', what: 'Application being prepared.', icon: UserRound },
  Submitted: { who: 'Student', what: 'Application and documents received by the platform.', icon: Send },
  'AI Document Check': { who: 'AI Assist (advisory)', what: 'Documents classified, read by OCR and cross-checked. Issues are flagged with an explanation — never auto-rejected.', icon: Sparkles },
  'Institution Verification': { who: 'Institution nodal officer', what: 'Your institution confirms enrolment, course, fee and attendance.', icon: Building2 },
  'State Scrutiny': { who: 'MoTA Super Admin', what: 'The Super Admin reviews the application with AI notes and approves or asks for a correction.', icon: Landmark },
  'Selection Committee': { who: 'MoTA Super Admin', what: 'Verified applications are ranked on configured merit rules; the Super Admin records the committee-approved final list.', icon: Users },
  Sanction: { who: 'Ministry of Tribal Affairs', what: 'The award is formally sanctioned and the payment file generated.', icon: BadgeCheck },
  Disbursement: { who: 'PFMS (prototype)', what: 'Amount is credited to your Aadhaar-seeded bank account.', icon: IndianRupee },
}

export function Timeline({ app, compact }: { app: Application; compact?: boolean }) {
  const s = useStore()
  const scheme = schemeById(s.schemes, app.schemeId)
  const flow = STAGES.filter((x) => !scheme || scheme.workflow.includes(x))
  const cur = flow.indexOf(app.stage)
  const done = app.status === 'Disbursed'
  return (
    <ol className="relative">
      {flow.map((st, i) => {
        const h = app.history.find((x) => x.stage === st)
        const state = done || i < cur ? 'done' : i === cur ? 'current' : 'todo'
        const blocked = state === 'current' && app.status === 'Correction Requested'
        const Info = STAGE_INFO[st]
        return (
          <motion.li key={st} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="relative flex gap-4 pb-6 last:pb-0">
            {i < flow.length - 1 && <span className={cx('absolute left-[17px] top-9 h-[calc(100%-28px)] w-0.5', state === 'done' ? 'bg-leaf-500' : 'bg-navy-100')} />}
            <span className={cx('relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2',
              state === 'done' ? 'border-leaf-600 bg-leaf-600 text-white' : blocked ? 'border-red-500 bg-red-50 text-red-600' : state === 'current' ? 'border-saffron-500 bg-saffron-50 text-saffron-700' : 'border-navy-100 bg-white text-slate-400')}>
              {state === 'done' ? <Check size={16} /> : state === 'current' ? (blocked ? <AlertTriangle size={16} /> : <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}><Circle size={12} fill="currentColor" /></motion.span>) : <Circle size={12} />}
            </span>
            <div className={cx('min-w-0 flex-1 rounded-xl', !compact && 'border border-navy-100 bg-white p-4', state === 'current' && !compact && 'border-saffron-400 shadow-card')}>
              <div className="flex flex-wrap items-center gap-2">
                <p className={cx('font-semibold', state === 'todo' ? 'text-slate-500' : 'text-navy-950')}>{st}</p>
                <Badge color={state === 'done' ? 'green' : blocked ? 'red' : state === 'current' ? 'amber' : 'gray'}>{state === 'done' ? 'Completed' : blocked ? 'Correction requested' : state === 'current' ? (app.status === 'Further Review' ? 'Further review' : 'In progress') : 'Pending'}</Badge>
                <span className="ml-auto text-xs tabular-nums text-slate-500">{h?.date ? fmtDate(h.date.slice(0, 10)) + (h.date.length > 10 ? ' · ' + h.date.slice(11) : '') : state === 'todo' ? 'Expected later' : '—'}</span>
              </div>
              {!compact && (
                <>
                  <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500"><Info.icon size={13} />{Info.who}</p>
                  <p className="mt-1 text-[13.5px] text-slate-600">{Info.what}</p>
                  {h?.note && <p className="mt-2 rounded-lg bg-navy-50 px-3 py-1.5 text-[12.5px] text-navy-900">{h.note}</p>}
                </>
              )}
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}

/** Old deep link — the tracker now lives inside My Applications. */
export function ApplicationDetail() {
  const { id } = useParams()
  return <Navigate to={`/student/applications?id=${id ?? ''}`} replace />
}

/** Tracker + details for the one application being viewed in My Applications. */
export function ApplicationPanel({ app }: { app: Application }) {
  const s = useStore()
  const nav = useNavigate()
  const scheme = schemeById(s.schemes, app.schemeId)!
  const flow = STAGES.filter((x) => scheme.workflow.includes(x))
  const cur = flow.indexOf(app.stage)
  const defs = s.deficiencies.filter((d) => d.applicationId === app.id)
  const pct = app.status === 'Disbursed' ? 100 : Math.round(((Math.max(cur, 0) + 1) / flow.length) * 100)
  const lowConf = app.flags.filter((f) => f.type === 'Low AI confidence')

  const simulateNext = () => {
    if (app.status === 'Disbursed') return
    const nxt = flow[cur + 1]
    if (!nxt) { s.setStatus(app.id, 'Disbursed'); s.notify({ title: 'Scholarship disbursed', body: `${inr(app.amount / 12)} credited (instalment 1).`, channel: ['in-app', 'sms'], kind: 'success', audience: 'student' }); s.toast('Marked as disbursed (simulation)'); return }
    s.advance(app.id, nxt, nxt === 'Sanction' ? 'Selected' : 'In Progress', 'Advanced using prototype simulation control')
    s.notify({ title: `Your application has moved to ${nxt}`, body: STAGE_INFO[nxt].what, channel: ['in-app', 'sms'], kind: 'info', audience: 'student' })
    s.log('Stage changed (simulation)', `${app.stage} → ${nxt}`, app.id, { user: 'Demo presenter', role: 'Prototype control' })
    s.toast(`Moved to ${nxt}`, 'info')
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs tabular-nums text-slate-500">{app.id} · submitted {fmtDate(app.submittedOn.slice(0, 10))}</p>
            <h2 className="font-display text-xl font-bold text-navy-950">{scheme.name}</h2>
            <p className="text-sm text-slate-600">{app.course}</p>
            {app.applicationType === 'renewal' && (
              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-violet-800"><Badge color="violet">Renewal {app.renewalYear}</Badge>Linked to previous application <b className="tabular-nums">{app.previousApplicationId}</b> (kept unchanged)
                <button className="font-semibold text-navy-700 hover:underline" onClick={() => nav('/student/renewal')}>Renewal details & report →</button></p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2"><StatusPill s={app.status} /><Button variant="outline" size="sm" icon={<FastForward size={14} />} onClick={simulateNext} disabled={app.status === 'Disbursed'}>Simulate next stage</Button></div>
        </div>
        <div className="mt-4 flex items-center gap-3"><Progress value={pct} /><span className="whitespace-nowrap text-sm font-semibold tabular-nums">Stage {Math.max(cur, 0) + 1} of {flow.length}</span></div>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-4 font-display text-lg font-bold">Application tracker</h3>
          <Timeline app={app} />
        </Card>
        <div className="space-y-4">
          {(defs.length > 0 || lowConf.length > 0) && (
            <Card className="p-5">
              <h3 className="mb-3 font-display font-bold">Deficiencies & document checks</h3>
              {defs.map((d) => (
                <div key={d.id} className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-navy-100 p-3">
                  <div><p className="text-sm font-semibold text-navy-950">{d.title}</p><p className="text-xs text-slate-500">{d.raisedBy}</p></div>
                  {d.status === 'Open' ? <Button size="sm" variant="saffron" onClick={() => nav('/student/documents')}>Resolve</Button> : <StatusPill s={d.status} />}
                </div>
              ))}
              {lowConf.map((f) => (
                <div key={f.id} className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-navy-100 p-3">
                  <div><p className="text-sm font-semibold text-navy-950">{scheme.documents.find((x) => x.key === f.docType)?.label}: read at {f.confidence}%</p><p className="text-xs text-slate-500">{f.resolved ? 'Verified manually by MoTA official' : 'With a MoTA official for manual verification — no action needed'}</p></div>
                  <StatusPill s={f.resolved ? 'Verified' : 'Routed to MoTA official'} />
                </div>
              ))}
            </Card>
          )}
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display font-bold"><Sparkles size={16} className="text-violet-600" />AI review notes</h3>
            {app.flags.length === 0 ? <p className="text-sm text-slate-600">No potential issues were found in your documents.</p> : app.flags.map((f) => (
              <div key={f.id} className="mb-2 rounded-lg bg-navy-50 p-3 text-[13px]">
                <div className="flex items-center gap-2"><b>{f.type}</b><Badge color={f.resolved ? 'green' : 'amber'}>{f.resolved ? 'Resolved' : 'Requires review'}</Badge><span className="ml-auto text-xs tabular-nums text-slate-500">{f.confidence}%</span></div>
                <p className="mt-1 text-slate-600">{f.explanation}</p>
              </div>
            ))}
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display font-bold"><MessageSquareText size={16} />Officer remarks</h3>
            {app.remarks.length === 0 ? <p className="text-sm text-slate-600">No remarks yet.</p> : app.remarks.map((r, i) => <div key={i} className="mb-2 text-[13px]"><p className="text-xs text-slate-500">{r.by} · {r.at}</p><p className="text-navy-950">{r.text}</p></div>)}
          </Card>
          <Card className="p-5 text-sm">
            <h3 className="mb-3 font-display font-bold">Award</h3>
            <p className="flex justify-between"><span className="text-slate-500">Annual value (prototype)</span><b className="tabular-nums">{inr(app.amount)}</b></p>
            <p className="mt-2 flex justify-between"><span className="text-slate-500">Payment channel</span><ProtoTag label="PFMS – Prototype" /></p>
            <Button variant="ghost" size="sm" className="mt-2 -ml-2" onClick={() => nav('/student/disbursement')}>Payments & renewal →</Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
