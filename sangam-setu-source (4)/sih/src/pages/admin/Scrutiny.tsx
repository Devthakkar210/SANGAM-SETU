import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Search, Sparkles, AlertTriangle, CheckCircle2, FileText, ArrowLeft, ShieldCheck, Undo2, SearchCheck, MessageSquare, History, Eye, ScanText, GitCompare, Copy, UserRound, Lock, Check, X, ChevronRight,
} from 'lucide-react'
import { useStore, schemeById } from '../../store/AppStore'
import { INSTITUTIONS, STATES } from '../../data/mock'
import type { Application, DocType, Flag, Stage } from '../../types'
import { ConfMeter, SAMPLE_EXTRACT, ScanPreview } from '../student/Documents'
import { RenewalAdminPanel } from '../student/Renewal'
import { Timeline } from '../student/Tracker'
import { AI_CONF_THRESHOLD, evaluateScheme, fmtDate, inr, type Answers } from '../../lib/rules'
import { AIBadge, Badge, Button, Card, Empty, Input, Label, Modal, PageHeader, Select, StatusPill, Table, Tabs, Textarea, cx } from '../../components/ui'

const inQueue = (a: Application) => ['State Scrutiny'].includes(a.stage) || a.status === 'Further Review'
const openFlags = (a: Application) => a.flags.filter((f) => !f.resolved)
const lowConf = (a: Application) => a.flags.filter((f) => f.type === 'Low AI confidence' && !f.resolved)
const risk = (a: Application) => openFlags(a).some((f) => f.severity === 'high') ? 'high' : openFlags(a).length ? 'medium' : a.flags.length ? 'resolved' : 'clean'

export function ApplicationsQueue() {
  const s = useStore()
  const nav = useNavigate()
  const [tab, setTab] = useState<'queue' | 'all'>('queue')
  const [q, setQ] = useState('')
  const [scheme, setScheme] = useState('All schemes')
  const [state, setState] = useState('All states')
  const [onlyFlag, setOnlyFlag] = useState(false)
  const [onlyLow, setOnlyLow] = useState(false)
  const [type, setType] = useState('All types')

  const rows = s.applications
    .filter((a) => a.submittedOn >= '2026' && (tab === 'all' || inQueue(a)))
    .filter((a) => (scheme === 'All schemes' || schemeById(s.schemes, a.schemeId)?.short === scheme) && (state === 'All states' || a.state === state) && (!onlyFlag || openFlags(a).length > 0) && (!onlyLow || lowConf(a).length > 0) && (type === 'All types' || (type === 'Renewal') === (a.applicationType === 'renewal')))
    .filter((a) => (a.studentName + a.id).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.id === s.demoAppId ? -1 : b.id === s.demoAppId ? 1 : 0))
  const queueN = s.applications.filter((a) => a.submittedOn >= '2026' && inQueue(a)).length

  return (
    <div>
      <PageHeader title="Scrutiny queue" sub="Applications verified by institutions, waiting for state-level scrutiny. AI pre-checks are attached to every record so officers start from the likely issues."
        actions={<Badge color="violet"><Sparkles size={12} />AI assists — officers decide</Badge>} />
      {(() => { const n = s.applications.filter((a) => a.submittedOn >= '2026' && lowConf(a).length).length; return n > 0 && (
        <Card className="mb-4 flex flex-wrap items-center gap-3 border-red-300 bg-red-50/60 p-4">
          <AlertTriangle size={18} className="text-red-600" />
          <p className="flex-1 text-sm text-navy-950"><b>{n} application{n > 1 ? 's' : ''}</b> with documents read below {AI_CONF_THRESHOLD}% confidence. The AI did not accept these — a MoTA official must verify each document manually.</p>
          <Button size="sm" variant="outline" onClick={() => { setOnlyLow(true); setTab('all') }}>Show them</Button>
        </Card>) })()}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'queue', label: `My queue (${queueN})` }, { id: 'all', label: 'All applications' }]} />
      </div>
      <Card className="mb-4 grid gap-3 p-4 md:grid-cols-[1fr_170px_170px_150px_auto]">
        <div className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><Input aria-label="Search applications" className="pl-9" placeholder="Search name or application ID" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select aria-label="Scheme" options={['All schemes', ...s.schemes.map((x) => x.short)]} value={scheme} onChange={(e) => setScheme(e.target.value)} />
        <Select aria-label="State" options={['All states', ...STATES]} value={state} onChange={(e) => setState(e.target.value)} />
        <Select aria-label="Application type" options={['All types', 'New', 'Renewal']} value={type} onChange={(e) => setType(e.target.value)} />
        <div className="flex flex-col justify-center gap-1">
          <label className="flex items-center gap-2 text-sm font-medium text-navy-900"><input type="checkbox" className="h-4 w-4 accent-navy-900" checked={onlyFlag} onChange={(e) => setOnlyFlag(e.target.checked)} />Only AI-flagged</label>
          <label className="flex items-center gap-2 text-sm font-medium text-navy-900"><input type="checkbox" className="h-4 w-4 accent-navy-900" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />Low confidence (&lt;{AI_CONF_THRESHOLD}%)</label>
        </div>
      </Card>
      <Card>
        {rows.length === 0 ? <div className="p-6"><Empty title="Nothing here" body="No applications match. Clear filters or switch to All applications." /></div> : (
          <Table head={['Applicant', 'Application ID', 'Scheme', 'State', 'Stage', 'AI pre-check', 'Status', '']}>
            {rows.map((a) => {
              const r = risk(a)
              return (
                <tr key={a.id} onClick={() => nav(`/admin/application/${a.id}`)} className={cx('cursor-pointer transition-colors hover:bg-navy-50/60', a.id === s.demoAppId && 'bg-saffron-50/60')}>
                  <td className="px-4 py-3"><p className="font-semibold text-navy-950">{a.studentName} {a.id === s.demoAppId && <Badge color="amber" className="ml-1">Demo</Badge>}{a.applicationType === 'renewal' && <Badge color="violet" className="ml-1">Renewal {a.renewalYear}</Badge>}</p><p className="text-xs text-slate-500">{a.course}</p></td>
                  <td className="px-4 py-3 tabular-nums">{a.id}</td>
                  <td className="px-4 py-3">{schemeById(s.schemes, a.schemeId)?.short}</td>
                  <td className="px-4 py-3">{a.state}</td>
                  <td className="px-4 py-3">{a.stage}</td>
                  <td className="px-4 py-3">{lowConf(a).length ? <Badge color="red"><AlertTriangle size={12} />Low confidence ({lowConf(a)[0].confidence}%) → Official</Badge> : r === 'high' ? <Badge color="red"><AlertTriangle size={12} />Potential anomaly</Badge> : r === 'medium' ? <Badge color="amber"><AlertTriangle size={12} />Requires review</Badge> : r === 'resolved' ? <Badge color="navy">Flag resolved by applicant</Badge> : <Badge color="green">Clean</Badge>}</td>
                  <td className="px-4 py-3"><StatusPill s={a.status} /></td>
                  <td className="px-4 py-3"><Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); nav(`/admin/application/${a.id}`) }}>Review <ChevronRight size={14} /></Button></td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
function docsFor(a: Application, docs: DocType[]) {
  const isDemo = a.studentName === 'Anjali Munda'
  return docs.map((k) => {
    const base = SAMPLE_EXTRACT[k]
    const fields = { ...base.fields }
    Object.keys(fields).forEach((f) => { if (/^(Name|Scholar|Account holder)$/.test(f)) fields[f] = a.studentName })
    if (!isDemo) {
      if (fields.Institution) fields.Institution = INSTITUTIONS.find((i) => i.id === a.institutionId)?.name ?? ''
      if (fields.Course) fields.Course = a.course
      if (fields.Percentage) fields.Percentage = `${a.marks}%`
      if (fields.Programme) fields.Programme = a.course
      if (fields['Annual family income']) fields['Annual family income'] = inr(a.income)
    }
    const nm = a.flags.find((f) => f.type === 'Name mismatch' && !f.resolved)
    if (nm && k === 'marksheet') fields.Name = a.studentName.replace('Bhil', 'Bheel')
    const ex = a.flags.find((f) => f.type === 'Expired certificate')
    if (ex && k === 'income_cert') fields['Valid till'] = '31 Mar 2026'
    const lc = a.flags.find((f) => f.type === 'Low AI confidence' && f.docType === k)
    return { key: k, fields, conf: lc ? lc.confidence : base.conf - (nm && k === 'marksheet' ? 5 : 0), expired: !!ex && k === 'income_cert', lc }
  })
}

function nextStage(workflow: string[], cur: Stage): Stage | null {
  const i = workflow.indexOf(cur)
  return i >= 0 && i < workflow.length - 1 ? workflow[i + 1] as Stage : null
}

export function ApplicationReview() {
  const { id = '' } = useParams()
  const s = useStore()
  const nav = useNavigate()
  const a = s.applications.find((x) => x.id === id)
  const logged = useRef('')
  const [remark, setRemark] = useState('')
  const [modal, setModal] = useState<null | 'approve' | 'correct' | 'review'>(null)
  const [note, setNote] = useState('')
  const [defTitle, setDefTitle] = useState('')
  const [docView, setDocView] = useState<DocType | null>(null)
  const [side, setSide] = useState<'remarks' | 'audit' | 'timeline'>('remarks')

  useEffect(() => {
    if (a && logged.current !== a.id) { logged.current = a.id; s.log('Officer reviewed application', 'Opened full record with AI review panel', a.id) }
  }, [a?.id]) // eslint-disable-line

  const scheme = a ? schemeById(s.schemes, a.schemeId) : undefined
  const docs = useMemo(() => {
    if (!a || !scheme) return []
    if (a.renewal) return a.renewal.docs.map((d) => ({ key: d.key, fields: d.fields ?? {}, conf: d.overall ?? 0, expired: false, lc: a.flags.find((f) => f.type === 'Low AI confidence' && f.docType === d.key) }))
    return docsFor(a, scheme.documents.map((d) => d.key))
  }, [a, scheme])
  // renewal applications use the scheme's renewal document list
  const docList = a?.renewal ? a.renewal.docs.map((d) => ({ key: d.key, label: d.label, mandatory: true })) : scheme?.documents ?? []
  if (!a || !scheme) return <Empty title="Application not found" body="It may have been removed when demo data was reset." action={<Button onClick={() => nav('/admin/applications')}>Back to queue</Button>} />

  const inst = INSTITUTIONS.find((i) => i.id === a.institutionId)
  const flags = a.flags
  const isDemo = a.id === s.demoAppId
  const incomeCert = docs.find((d) => d.key === 'income_cert')
  const incomeFlag = flags.find((f) => f.type === 'Income mismatch')
  const certIncome = incomeFlag && !incomeFlag.resolved ? 320000 : a.income
  const conf = Math.round(docs.reduce((t, d) => t + d.conf, 0) / Math.max(docs.length, 1) - openFlags(a).length * 4)
  // renewals were selected last year, so scrutiny approval goes straight to sanction
  const nxt = a.applicationType === 'renewal' && a.stage === 'State Scrutiny' ? 'Sanction' as Stage : nextStage(scheme.workflow, a.stage)
  const canAct = a.stage === 'State Scrutiny' && a.status !== 'Correction Requested'
  const pendingLow = lowConf(a)
  const role = s.role
  const readOnly = false

  const ans: Answers = {
    category: 'ST', educationLevel: /PhD|MPhil/.test(a.course) ? 'MPhil/PhD' : /Class I?X|Class X$/.test(a.course) ? 'Class 9-10' : /^M|MBA/.test(a.course) ? 'Postgraduate' : 'Undergraduate',
    income: a.income, marks: a.marks, destination: scheme.id === 'nos' ? 'Overseas' : 'Domestic', institutionType: scheme.id === 'topclass' ? 'Notified Top Class' : scheme.id === 'nos' ? 'Foreign University' : 'Government',
    researchStatus: scheme.id === 'nfst' ? 'Registered' : 'Not applicable', studyLocation: scheme.id === 'nos' ? 'Abroad' : 'Within home state', course: a.course,
  }
  const ev = evaluateScheme(scheme, ans)

  const consistency: { label: string; ok: boolean | 'warn'; detail: string }[] = [
    { label: 'Reading confidence', ok: pendingLow.length ? 'warn' : true, detail: pendingLow.length ? `${pendingLow.length} document(s) below ${AI_CONF_THRESHOLD}% — manual check` : `All documents at or above ${AI_CONF_THRESHOLD}%` },
    { label: 'Name across documents', ok: flags.some((f) => f.type === 'Name mismatch' && !f.resolved) ? 'warn' : true, detail: flags.some((f) => f.type === 'Name mismatch' && !f.resolved) ? 'Spelling variant on marksheet' : `"${a.studentName}" on all ${docs.length} documents` },
    { label: 'Income: form vs certificate', ok: incomeFlag && !incomeFlag.resolved ? 'warn' : true, detail: incomeFlag && !incomeFlag.resolved ? `Form ${inr(a.income)} · Certificate ${inr(certIncome)}` : `${inr(a.income)} on both${incomeFlag ? ' (corrected by applicant)' : ''}` },
    { label: 'Certificate validity', ok: flags.some((f) => f.type === 'Expired certificate' && !f.resolved) ? 'warn' : true, detail: flags.some((f) => f.type === 'Expired certificate' && !f.resolved) ? 'Income certificate expired 31 Mar 2026' : 'All certificates valid on application date' },
    { label: 'Dates & enrolment', ok: flags.some((f) => f.type === 'Document inconsistency' && !f.resolved) ? 'warn' : true, detail: flags.some((f) => f.type === 'Document inconsistency' && !f.resolved) ? 'Admission date after fee receipt' : 'Bonafide matches institution & course' },
  ]
  const anomaly: { label: string; hit: Flag | undefined; clear: string }[] = [
    { label: 'Duplicate application', hit: flags.find((f) => f.type === 'Duplicate application' && !f.resolved), clear: 'No matching applicant in any scheme this cycle' },
    { label: 'Duplicate bank details', hit: flags.find((f) => f.type === 'Duplicate bank details' && !f.resolved), clear: 'Account not linked to other applications' },
    { label: 'Name mismatch', hit: flags.find((f) => f.type === 'Name mismatch' && !f.resolved), clear: 'Names consistent' },
    { label: 'Expired certificate', hit: flags.find((f) => f.type === 'Expired certificate' && !f.resolved), clear: 'All certificates in validity' },
    { label: 'Income mismatch', hit: flags.find((f) => f.type === 'Income mismatch' && !f.resolved), clear: incomeFlag ? 'Mismatch corrected by applicant before submission' : 'Income consistent' },
    { label: 'Document inconsistency', hit: flags.find((f) => f.type === 'Document inconsistency' && !f.resolved), clear: 'No conflicting dates or values' },
  ]

  const approve = () => {
    if (!nxt) return
    s.advance(a.id, nxt, 'In Progress', `Scrutiny cleared by ${s.actorName}${note ? ': ' + note : ''}`)
    s.set((p) => ({ applications: p.applications.map((x) => x.id === a.id ? { ...x, flags: x.flags.map((f) => ({ ...f, resolved: true })), renewal: x.renewal ? { ...x.renewal, docs: x.renewal.docs.map((d) => d.status === 'VERIFIED' || d.status === 'HUMAN_REVIEW' ? { ...d, status: 'FINAL_VERIFIED' as const } : d) } : x.renewal } : x) }))
    if (note) s.addRemark(a.id, note)
    if (nxt === 'Sanction') s.set((p) => ({ disbursements: [{ id: `DSB-${4500 + p.disbursements.length}`, applicationId: a.id, studentName: a.studentName, schemeId: a.schemeId, amount: a.amount, status: 'Pending', installment: a.applicationType === 'renewal' ? `${a.renewalYear} · Quarter 1` : 'Instalment 1 of 2' }, ...p.disbursements] }))
    if (a.studentId === s.demoStudentId) s.notify({ title: `Your application has moved to ${nxt}`, body: `${a.id} cleared State Scrutiny.${nxt === 'Selection Committee' ? ' Final selection is made by the authorised committee.' : ''}`, channel: ['in-app', 'sms', 'email'], kind: 'success', audience: 'student' })
    s.log('Application approved at scrutiny', `Forwarded to ${nxt}. AI flags reviewed by officer.${note ? ' Remark: ' + note : ''}`, a.id)
    s.toast(`Approved — ${a.id} forwarded to ${nxt}`)
    setModal(null); setNote('')
  }
  const correct = () => {
    const title = defTitle || 'Correction required'
    s.raiseDeficiency({ applicationId: a.id, title, reason: note || 'Please correct this item and resubmit.', raisedBy: `${s.actorName} (${s.actorRole})`, docType: /income/i.test(title) ? 'income_cert' : /mark|name/i.test(title) ? 'marksheet' : /bank/i.test(title) ? 'bank' : undefined })
    s.setStatus(a.id, 'Correction Requested')
    if (a.studentId === s.demoStudentId) s.notify({ title: /income/i.test(title) ? 'Your income certificate requires correction' : 'Correction requested on your application', body: `${title}: ${note || 'Please correct and resubmit.'} Only this item needs action.`, channel: ['in-app', 'sms', 'email'], kind: 'action', audience: 'student' })
    s.log('Deficiency created', `${title} — ${note || 'no details'}`, a.id)
    s.toast('Correction requested — student notified by SMS & in-app', 'warning')
    setModal(null); setNote('')
  }
  const review = () => {
    s.setStatus(a.id, 'Further Review')
    s.addRemark(a.id, `Sent for further review: ${note || 'Needs a second-level check.'}`)
    s.log('Sent for further review', note || 'Held for second-level review / field verification', a.id)
    if (a.studentId === s.demoStudentId) s.notify({ title: 'Your application is under additional review', body: `${a.id} is under additional review by MoTA. No action needed from you.`, channel: ['in-app'], kind: 'info', audience: 'student' })
    s.toast('Marked for further review — held in the Super Admin queue', 'info')
    setModal(null); setNote('')
  }
  const acceptFlag = (f: Flag) => {
    s.setFlags(a.id, (fl) => fl.map((x) => x.id === f.id ? { ...x, resolved: true } : x))
    s.log('AI flag reviewed', `${f.type} marked acceptable by officer`, a.id)
    s.toast(`${f.type}: marked as reviewed by you`)
  }
  const verifyDoc = (f: Flag) => {
    s.setFlags(a.id, (fl) => fl.map((x) => x.id === f.id ? { ...x, resolved: true, resolvedBy: `${s.actorName} (${s.actorRole})` } : x))
    if (a.renewal && f.docType) s.set((p) => ({ applications: p.applications.map((x) => x.id === a.id && x.renewal ? { ...x, renewal: { ...x.renewal, docs: x.renewal.docs.map((d) => d.key === f.docType ? { ...d, status: 'FINAL_VERIFIED' as const, reviewedBy: `${s.actorName} (${s.actorRole})` } : d) } } : x) }))
    const lbl = docList.find((x) => x.key === f.docType)?.label ?? 'Document'
    s.log('Document manually verified by MoTA official', `${lbl}: AI read at ${f.confidence}% (below ${AI_CONF_THRESHOLD}%) — checked against original and accepted`, a.id)
    if (a.studentId === s.demoStudentId) s.notify({ title: `${lbl} verified by a MoTA official`, body: `The document that the AI could not read confidently has been checked manually and accepted.`, channel: ['in-app', 'sms'], kind: 'success', audience: 'student' })
    s.toast(`${lbl} manually verified`)
  }
  const openModal = (m: 'approve' | 'correct' | 'review') => { setNote(''); setDefTitle(openFlags(a)[0]?.type ?? 'Income mismatch'); setModal(m) }
  const appAudit = s.audit.filter((e) => e.applicationId === a.id)

  return (
    <div>
      <button onClick={() => nav('/admin/applications')} className="mb-3 flex items-center gap-1 text-sm font-semibold text-navy-700 hover:underline"><ArrowLeft size={15} />Scrutiny queue</button>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2"><Badge color="gray">{scheme.code}</Badge><span className="tabular-nums text-sm text-slate-500">{a.id}</span><StatusPill s={a.status} /><Badge color="navy">{a.stage}</Badge></div>
          <h1 className="mt-1.5 font-display text-2xl font-bold text-navy-950">{a.studentName}</h1>
          <p className="text-sm text-slate-600">{a.course} · {inst?.name}</p>
        </div>
        <p className="flex items-center gap-1.5 rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-800"><Lock size={13} />Access logged · you are viewing as {s.actorRole}</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[250px_1fr_340px]">
        {/* LEFT */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-navy-900 font-bold text-white">{a.studentName.split(' ').map((w) => w[0]).join('')}</div>
              <div><p className="font-semibold text-navy-950">{a.studentName}</p><p className="text-xs text-slate-500">Student ID {a.studentId.toUpperCase()}</p></div></div>
            <dl className="mt-4 space-y-2 text-[13px]">
              {[['Gender', a.gender === 'F' ? 'Female' : 'Male'], ['State', a.state], ['Aadhaar', 'XXXX XXXX 4471 (masked)'], ['Mobile', '+91 XXXXX X0217'], ['Institution', inst?.name ?? '—']].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium text-navy-950">{v}</dd></div>)}
            </dl>
            {a.priority.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{a.priority.map((p) => <Badge key={p} color="violet">{p}</Badge>)}</div>}
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-navy-900">Documents ({docs.length})</h2>
            <ul className="space-y-2">
              {docs.map((d) => {
                const lbl = docList.find((x) => x.key === d.key)?.label
                const warn = (d.lc && !d.lc.resolved) || d.expired || (d.key === 'income_cert' && incomeFlag && !incomeFlag.resolved) || (d.key === 'marksheet' && flags.some((f) => f.type === 'Name mismatch' && !f.resolved))
                return (
                  <li key={d.key}>
                    <button onClick={() => setDocView(d.key)} className="flex w-full items-center gap-2.5 rounded-lg border border-navy-100 px-3 py-2 text-left text-[13px] hover:border-navy-600/30 hover:bg-navy-50">
                      <FileText size={16} className={warn ? 'text-saffron-600' : 'text-navy-700'} />
                      <span className="flex-1 font-medium text-navy-950">{lbl}</span>
                      {warn ? <AlertTriangle size={14} className="text-saffron-600" /> : <CheckCircle2 size={14} className="text-leaf-600" />}
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-slate-500"><ShieldCheck size={13} />Encrypted at rest · watermarked on view (prototype)</p>
          </Card>
        </div>

        {/* CENTER */}
        <div className="space-y-4">
          {a.applicationType === 'renewal' && <RenewalAdminPanel app={a} />}
          <Card className="p-5">
            <h2 className="mb-3 font-display text-base font-bold text-navy-950">Application information</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Section title="Academic">{[['Course', a.course], ['Marks (last exam)', `${a.marks}%`], ['Institution', inst?.name ?? ''], ['Institution type', inst?.type ?? '']]}</Section>
              <Section title="Financial">{[['Declared family income', inr(a.income)], ['Scholarship amount', inr(a.amount) + ' / yr'], ['Bank account', 'XXXXXXXX' + (3390 + a.id.length)], ['IFSC', 'SBIN0XXXX12']]}</Section>
              {a.extra && Object.keys(a.extra).length > 0 && <Section title={`${scheme.short}-specific details`}>{scheme.extraFields.map((f) => [f.label, a.extra?.[f.key] || '—'] as [string, string])}</Section>}
              <Section title="Submission">{[['Submitted on', fmtDate(a.submittedOn.slice(0, 10))], ['Channel', isDemo && s.assisted ? 'CSC assisted' : 'Online (self)'], ['Profile', 'Verified profile reused'], ['Scheme workflow', `${scheme.workflow.length} stages`]]}</Section>
            </div>
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-base font-bold text-navy-950">Eligibility against configured rules</h2><Badge color={ev.verdict === 'match' ? 'green' : 'amber'}>{ev.results.filter((r) => r.pass).length}/{ev.results.length} rules met</Badge></div>
            <ul className="space-y-1.5">{ev.results.map((r) => (
              <li key={r.rule.id} className="flex items-start gap-2 text-[13px]">{r.pass ? <Check size={16} className="mt-0.5 shrink-0 text-leaf-600" /> : <X size={16} className="mt-0.5 shrink-0 text-red-600" />}<span className="text-slate-700">{r.reason}</span></li>
            ))}</ul>
            <p className="mt-3 text-[11.5px] text-slate-500">Rules come from the Scheme Builder — changing a threshold there changes this check immediately.</p>
          </Card>

          {/* Actions */}
          <Card className="p-5">
            <h2 className="mb-1 font-display text-base font-bold text-navy-950">Officer decision</h2>
            <p className="mb-4 text-[13px] text-slate-600">AI findings are advisory. Your decision is recorded against your name in the audit log.</p>
            {pendingLow.length > 0 && !readOnly && <p className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[13px] text-red-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{pendingLow.length} document{pendingLow.length > 1 ? 's were' : ' was'} read below {AI_CONF_THRESHOLD}% confidence. Verify {pendingLow.length > 1 ? 'them' : 'it'} manually in the AI panel before approving.</p>}
            {readOnly ? <p className="rounded-lg bg-navy-50 p-3 text-sm text-navy-900">Selection Committee has read-only access to scrutiny records. Use the Selection board to rank applicants.</p>
              : !canAct ? <p className="rounded-lg bg-navy-50 p-3 text-sm text-navy-900">{a.status === 'Correction Requested' ? 'Waiting for the student to resolve the requested correction. The application returns here once resubmitted.' : a.stage === 'Institution Verification' || a.stage === 'Submitted' || a.stage === 'AI Document Check' ? 'This application is still with the institution for verification. Scrutiny actions unlock once the institution verifies.' : `This application has cleared scrutiny and is at ${a.stage}.`}</p>
                : (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="success" icon={<CheckCircle2 size={16} />} disabled={pendingLow.length > 0} title={pendingLow.length ? 'Verify low-confidence documents first' : undefined} onClick={() => openModal('approve')}>Approve</Button>
                    <Button variant="outline" icon={<Undo2 size={16} />} onClick={() => openModal('correct')}>Request Correction</Button>
                    <Button variant="outline" icon={<SearchCheck size={16} />} onClick={() => openModal('review')}>Send for Further Review</Button>
                  </div>
                )}
          </Card>

          <Card className="p-5">
            <Tabs value={side} onChange={setSide} tabs={[{ id: 'remarks', label: <span className="flex items-center gap-1.5"><MessageSquare size={13} />Officer Remarks ({a.remarks.length})</span> }, { id: 'audit', label: <span className="flex items-center gap-1.5"><History size={13} />Audit log ({appAudit.length})</span> }, { id: 'timeline', label: 'Timeline' }]} />
            <div className="mt-4">
              {side === 'remarks' && (
                <div>
                  <ul className="mb-3 space-y-2">
                    {a.remarks.length === 0 && <li className="text-sm text-slate-500">No remarks yet.</li>}
                    {a.remarks.map((r, i) => <li key={i} className="rounded-lg bg-navy-50 px-3 py-2 text-[13px]"><p className="text-navy-950">{r.text}</p><p className="mt-0.5 text-[11.5px] text-slate-500">{r.by} · {r.at}</p></li>)}
                  </ul>
                  {!readOnly && <div className="flex gap-2"><Input aria-label="Add officer remark" placeholder="Add a remark (visible to officers only)" value={remark} onChange={(e) => setRemark(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && remark.trim()) { s.addRemark(a.id, remark.trim()); s.log('Officer remark added', remark.trim(), a.id); setRemark('') } }} />
                    <Button disabled={!remark.trim()} onClick={() => { s.addRemark(a.id, remark.trim()); s.log('Officer remark added', remark.trim(), a.id); setRemark(''); s.toast('Remark added') }}>Add</Button></div>}
                </div>
              )}
              {side === 'audit' && (
                <ul className="space-y-2">{appAudit.map((e) => <li key={e.id} className="flex gap-3 text-[13px]"><span className="w-28 shrink-0 tabular-nums text-slate-500">{e.at}</span><div><p className="font-semibold text-navy-950">{e.action}</p><p className="text-slate-600">{e.user} ({e.role}) — {e.details}</p></div></li>)}</ul>
              )}
              {side === 'timeline' && <Timeline app={a} compact />}
            </div>
          </Card>
        </div>

        {/* RIGHT: AI panel */}
        <div className="xl:sticky xl:top-20 xl:self-start">
          <Card className="overflow-hidden border-violet-500/20">
            <div className="bg-gradient-to-br from-navy-950 to-navy-800 p-4 text-white">
              <div className="flex items-center justify-between"><p className="flex items-center gap-2 font-display font-bold"><Sparkles size={16} className="text-saffron-400" />AI Review Panel</p><span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]">Decision support</span></div>
              <div className="mt-4 flex items-end gap-3">
                <div className="relative h-16 w-16">
                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90"><circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="3" />
                    <motion.circle cx="18" cy="18" r="15.5" fill="none" stroke="#F6A457" strokeWidth="3" strokeLinecap="round" strokeDasharray="97.4" initial={{ strokeDashoffset: 97.4 }} animate={{ strokeDashoffset: 97.4 * (1 - conf / 100) }} transition={{ duration: 1 }} /></svg>
                  <span className="absolute inset-0 grid place-items-center text-sm font-bold">{conf}%</span>
                </div>
                <div className="text-[13px]"><p className="font-semibold">Overall extraction confidence</p><p className="text-white/70">{openFlags(a).length ? `${openFlags(a).length} item(s) require review` : 'No open items'}</p></div>
              </div>
            </div>
            <div className="divide-y divide-navy-50">
              <PanelSection icon={<FileText size={14} />} title="Document match">
                <p className="mb-2 text-[11.5px] text-slate-500">Auto-accept threshold {AI_CONF_THRESHOLD}% (black marker). Lower scores need manual verification.</p>
                <ul className="space-y-2">{docs.map((d) => (
                  <li key={d.key} className={cx('rounded-lg text-[12.5px]', d.lc && !d.lc.resolved && 'bg-red-50 p-2')}>
                    <div className="flex items-center justify-between gap-2"><span className="text-slate-700">{docList.find((x) => x.key === d.key)?.label}</span><ConfMeter value={d.conf} small /></div>
                    {d.lc && (d.lc.resolved
                      ? <p className="mt-1 flex items-center gap-1 text-[11.5px] font-semibold text-leaf-700"><CheckCircle2 size={12} />Verified manually{d.lc.resolvedBy ? ` by ${d.lc.resolvedBy}` : ''}</p>
                      : <div className="mt-1.5 flex items-center justify-between gap-2"><span className="text-[11.5px] font-semibold text-red-700">Routed to MoTA official</span>{!readOnly && <button onClick={() => setDocView(d.key)} className="rounded-md bg-white px-2 py-1 text-[11.5px] font-semibold text-navy-800 ring-1 ring-navy-100 hover:bg-navy-50">Open & verify</button>}</div>)}
                  </li>
                ))}</ul>
              </PanelSection>
              <PanelSection icon={<ScanText size={14} />} title="OCR results">
                {incomeCert ? (
                  <div className="rounded-lg bg-navy-50 p-2.5 text-[12.5px]">
                    <p className="mb-1 font-semibold text-navy-900">Income certificate</p>
                    {Object.entries(incomeCert.fields).map(([k, v]) => <div key={k} className="flex justify-between gap-2"><span className="text-slate-500">{k}</span><span className="text-right font-medium text-navy-950">{k === 'Annual family income' && isDemo ? inr(certIncome) : v}</span></div>)}
                  </div>
                ) : <p className="text-[12.5px] text-slate-500">Open any document on the left to see its extracted text.</p>}
              </PanelSection>
              <PanelSection icon={<GitCompare size={14} />} title="Cross-document consistency">
                <ul className="space-y-2">{consistency.map((c) => (
                  <li key={c.label} className="flex gap-2 text-[12.5px]">{c.ok === true ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-leaf-600" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0 text-saffron-600" />}<div><p className="font-semibold text-navy-950">{c.label}</p><p className="text-slate-600">{c.detail}</p></div></li>
                ))}</ul>
              </PanelSection>
              <PanelSection icon={<AlertTriangle size={14} />} title={`Potential issues (${flags.length})`}>
                {flags.length === 0 ? <p className="text-[12.5px] text-leaf-700">No potential issues detected.</p> : flags.map((f) => (
                  <div key={f.id} className={cx('mb-2 rounded-lg border p-2.5 text-[12.5px]', f.resolved ? 'border-leaf-500/30 bg-leaf-50' : f.severity === 'high' ? 'border-red-300 bg-red-50' : 'border-saffron-400 bg-saffron-50')}>
                    <div className="flex items-center justify-between gap-2"><p className="font-semibold text-navy-950">{f.resolved ? 'Reviewed' : f.type === 'Low AI confidence' ? 'Manual verification needed' : f.severity === 'high' ? 'Potential Anomaly' : 'Requires Review'} · {f.type}</p><span className="tabular-nums text-slate-500">{f.confidence}%</span></div>
                    <p className="mt-1 text-slate-700">{f.explanation}</p>
                    {!f.resolved && !readOnly && (f.type === 'Low AI confidence'
                      ? <button onClick={() => f.docType && setDocView(f.docType)} className="mt-2 text-[12px] font-semibold text-navy-800 hover:underline">Open document & verify manually</button>
                      : <button onClick={() => acceptFlag(f)} className="mt-2 text-[12px] font-semibold text-navy-800 hover:underline">Mark as reviewed — acceptable</button>)}
                  </div>
                ))}
              </PanelSection>
              <PanelSection icon={<Copy size={14} />} title="Duplicate & anomaly checks">
                <ul className="space-y-1.5">{anomaly.map((x) => (
                  <li key={x.label} className="flex items-start gap-2 text-[12.5px]">{x.hit ? <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-600" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-leaf-600" />}<div><span className="font-medium text-navy-950">{x.label}</span><span className="text-slate-500"> — {x.hit ? 'Potential anomaly, see above' : x.clear}</span></div></li>
                ))}</ul>
              </PanelSection>
              <div className="flex items-start gap-2 bg-violet-50 p-4 text-[12px] text-violet-900"><UserRound size={15} className="mt-0.5 shrink-0" />AI never approves, rejects or labels anyone as fraudulent. It highlights what to check and why; the authorised officer decides.</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Doc viewer */}
      <Modal open={!!docView} onClose={() => setDocView(null)} title={docView ? docList.find((d) => d.key === docView)?.label ?? '' : ''}>
        {docView && (() => {
          const d = docs.find((x) => x.key === docView)!
          return (
            <div className="flex gap-4">
              <ScanPreview active={false} label="" />
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2"><AIBadge label="OCR extraction" /><span className="text-xs text-slate-500">{d.conf}% confidence</span></div>
                <dl className="space-y-1.5 text-[13px]">{Object.entries(d.fields).map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-navy-50 pb-1"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium text-navy-950">{k === 'Annual family income' && isDemo ? inr(certIncome) : v}</dd></div>)}</dl>
                {d.lc && !d.lc.resolved && (
                  <div className="mt-3 rounded-lg bg-red-50 p-3 text-[12.5px] text-red-900">
                    <p className="font-semibold">AI read this at {d.conf}% — below the {AI_CONF_THRESHOLD}% threshold</p>
                    <p className="mt-0.5">Compare the extracted values with the original image. If they are correct, verify the document; otherwise request a correction.</p>
                    {!readOnly && <div className="mt-2 flex gap-2"><Button size="sm" variant="success" icon={<CheckCircle2 size={14} />} onClick={() => { verifyDoc(d.lc!); setDocView(null) }}>Verify document</Button><Button size="sm" variant="outline" onClick={() => { setDocView(null); setDefTitle('Other'); setNote(`Please upload a clearer scan of your ${docList.find((x) => x.key === d.key)?.label}. The seal/signature could not be read.`); setModal('correct') }}>Request clearer copy</Button></div>}
                  </div>
                )}
                <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-slate-500"><Eye size={12} />Viewing logged to audit trail</p>
              </div>
            </div>
          )
        })()}
      </Modal>

      <Modal open={modal === 'approve'} onClose={() => setModal(null)} title="Approve at State Scrutiny">
        <p className="text-sm text-slate-600">The application will move to <b>{nxt}</b>. {openFlags(a).length > 0 && <>You are confirming you reviewed <b>{openFlags(a).length} open AI flag(s)</b>.</>}</p>
        <div className="mt-3"><Label htmlFor="ap">Remark {openFlags(a).length > 0 ? '(required when flags are open)' : '(optional)'}</Label><Textarea id="ap" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Income certificate checked with issuing authority; value within threshold." /></div>
        <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button variant="success" disabled={openFlags(a).length > 0 && !note.trim()} onClick={approve}>Approve & forward</Button></div>
      </Modal>
      <Modal open={modal === 'correct'} onClose={() => setModal(null)} title="Request Correction">
        <p className="text-sm text-slate-600">Creates a specific deficiency. The student fixes only this item — no need to restart.</p>
        <div className="mt-3 space-y-3">
          <div><Label htmlFor="dt">Deficiency</Label><Select id="dt" options={['Income mismatch', 'Name mismatch', 'Expired certificate', 'Bank details need confirmation', 'Document inconsistency', 'Other']} value={defTitle} onChange={(e) => setDefTitle(e.target.value)} /></div>
          <div><Label htmlFor="dn">Message to student</Label><Textarea id="dn" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain what to fix in plain language" /></div>
        </div>
        <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button variant="danger" onClick={correct}>Send to student</Button></div>
      </Modal>
      <Modal open={modal === 'review'} onClose={() => setModal(null)} title="Send for Further Review">
        <p className="text-sm text-slate-600">Holds the application for a second-level check or field verification. The student is told it is under additional review.</p>
        <div className="mt-3"><Label htmlFor="rv">Reason</Label><Textarea id="rv" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Possible migration case — verify with Odisha records." /></div>
        <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button onClick={review}>Escalate</Button></div>
      </Modal>
    </div>
  )
}

function Section({ title, children }: { title: string; children: [string, string][] }) {
  return (
    <div className="rounded-xl border border-navy-100 p-3.5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <dl className="space-y-1.5 text-[13px]">{children.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium text-navy-950">{v}</dd></div>)}</dl>
    </div>
  )
}
function PanelSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <div className="p-4"><p className="mb-2.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-slate-500">{icon}{title}</p>{children}</div>
}
