import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  RefreshCw, Check, CheckCircle2, AlertTriangle, XCircle, Upload, FileText, Lock, Mail, KeyRound, LifeBuoy, ArrowRight, ArrowLeft, ShieldCheck,
  Sparkles, Download, FileCheck2, Loader2, History, Eye, Undo2, PartyPopper, CircleDot, Circle, Info,
} from 'lucide-react'
import { useStore, schemeById } from '../../store/AppStore'
import { INSTITUTIONS, PREV_NFST_ID, PREV_RENEWAL_VALUES, RENEWAL_ID, STABLE_PROFILE } from '../../data/mock'
import type { Application, DocType, Flag, RenewalData, RenewalDoc, RenewalDocStatus, RenewalDraft, RenewalField } from '../../types'
import { AI_CONF_THRESHOLD, evaluateScheme, inr, now } from '../../lib/rules'
import { SAMPLE_FILE, buildRenewalReportHtml, downloadFile, summarise, verifyRenewalDoc, validateFile, type RenewalContext } from '../../lib/renewal'
import { ConfMeter, ScanPreview } from './Documents'
import { Badge, Button, Card, Input, Label, Modal, PageHeader, Progress, ProtoTag, Select, Textarea, cx } from '../../components/ui'

export const RENEWAL_STEPS = ['Verify Previous Application', 'Review Profile', 'Update Current Information', 'Upload Documents', 'Document Verification', 'Verified Report', 'Final Submission']
const RENEWAL_YEAR = '2026-27'
const DEMO_EMAIL = 'anjali.m@example.in'

/* ------------------------------------------------------------------ */
/* Status pill + signal list (shared with the admin review)            */
/* ------------------------------------------------------------------ */
const STATUS_META: Record<RenewalDocStatus, { label: string; cls: string }> = {
  NOT_UPLOADED: { label: 'Not uploaded', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  UPLOADED: { label: 'Uploaded', cls: 'bg-navy-50 text-navy-800 ring-navy-100' },
  PROCESSING: { label: 'Processing', cls: 'bg-navy-50 text-navy-800 ring-navy-100' },
  VERIFIED: { label: 'AI verified', cls: 'bg-leaf-50 text-leaf-700 ring-leaf-500/30' },
  HUMAN_REVIEW: { label: 'Manual verification', cls: 'bg-saffron-50 text-saffron-700 ring-saffron-400/60' },
  DEFICIENCY: { label: 'Action required', cls: 'bg-red-50 text-red-700 ring-red-200' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-50 text-red-700 ring-red-200' },
  RESUBMITTED: { label: 'Resubmitted', cls: 'bg-violet-50 text-violet-700 ring-violet-200' },
  FINAL_VERIFIED: { label: 'Final verified', cls: 'bg-leaf-600 text-white ring-leaf-600' },
}
export function RenewalStatusPill({ s }: { s: RenewalDocStatus }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', STATUS_META[s].cls)}>{STATUS_META[s].label}</span>
}
export function SignalList({ doc }: { doc: RenewalDoc }) {
  if (!doc.signals) return null
  return (
    <ul className="space-y-1.5">
      {doc.signals.map((g) => (
        <li key={g.label} className="flex items-center gap-2 text-[12.5px]">
          {g.critical ? <XCircle size={14} className="shrink-0 text-red-600" /> : g.score >= AI_CONF_THRESHOLD ? <CheckCircle2 size={14} className="shrink-0 text-leaf-600" /> : <AlertTriangle size={14} className="shrink-0 text-saffron-600" />}
          <span className="flex-1 text-slate-700">{g.label}</span>
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-navy-50" aria-hidden><span className={cx('block h-full rounded-full', g.critical ? 'bg-red-500' : g.score >= AI_CONF_THRESHOLD ? 'bg-leaf-500' : 'bg-saffron-500')} style={{ width: `${g.score}%` }} /></span>
          <span className="w-10 text-right font-semibold tabular-nums">{g.score}%</span>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Form model                                                          */
/* ------------------------------------------------------------------ */
const P = PREV_RENEWAL_VALUES
const DEFAULT_FORM: Record<string, string> = {
  academicYear: '2026-27', courseYear: '3rd Year', semester: '5th Semester', cgpa: '8.2', result: 'Passed', courseStatus: 'Continuing', attendance: '86', backlogs: '0',
  changedInstitution: 'No', newInstitution: '', instReason: '', changedCourse: 'No', newCourse: '', courseReason: '',
  researchStage: 'Pre-synopsis seminar completed', topic: P.topic, supervisor: P.supervisor,
  income: '270000', incomeSource: 'Agriculture',
  enrolled: 'Yes', receiving: 'Yes', otherScholarship: 'No', otherName: '', completedYear: 'Yes',
  mobile: P.mobile, email: P.email, residence: 'Hostel', bankSame: 'Yes', newAccount: '', newIfsc: '',
}
function ctxOf(form: Record<string, string>): RenewalContext {
  return { name: 'Anjali Munda', institution: form.changedInstitution === 'Yes' && form.newInstitution ? form.newInstitution : P.institution, academicYear: form.academicYear, cgpa: form.cgpa, income: Number(form.income) || 0, supervisor: form.supervisor, bankChanged: form.bankSame === 'No' }
}
function fieldsOf(form: Record<string, string>): RenewalField[] {
  const inst = ctxOf(form).institution
  const F = (group: string, label: string, previous: string, current: string): RenewalField => ({ group, label, previous, current })
  return [
    F('Academic', 'Academic year', P.academicYear, form.academicYear),
    F('Academic', 'Current course year', P.courseYear, form.courseYear),
    F('Academic', 'Current semester', P.semester, form.semester),
    F('Academic', 'Current CGPA', P.cgpa, form.cgpa),
    F('Academic', 'Previous year result', P.result, form.result),
    F('Academic', 'Course status', 'Continuing', form.courseStatus),
    F('Academic', 'Current institution', P.institution, inst),
    F('Academic', 'Course', 'PhD, Environmental Science', form.changedCourse === 'Yes' && form.newCourse ? form.newCourse : 'PhD, Environmental Science'),
    F('Research', 'Research stage', P.researchStage, form.researchStage),
    F('Research', 'Supervisor', P.supervisor, form.supervisor),
    F('Financial', 'Annual family income', inr(P.income), inr(Number(form.income) || 0)),
    F('Financial', 'Income source', P.incomeSource, form.incomeSource),
    F('Continuation', 'Receiving another scholarship', 'No', form.otherScholarship === 'Yes' ? `Yes — ${form.otherName}` : 'No'),
    F('Contact', 'Mobile', P.mobile, form.mobile),
    F('Contact', 'Email', P.email, form.email),
    F('Contact', 'Hostel / day scholar', P.residence, form.residence),
    F('Contact', 'Bank account', P.bank, form.bankSame === 'Yes' ? P.bank : `XXXXXX${form.newAccount.slice(-4)} · ${form.newIfsc}`),
  ]
}
function freshDocs(docsCfg: { key: DocType; label: string }[]): RenewalDoc[] {
  const prev: Partial<Record<DocType, string>> = { marksheet: '2025-26 Marksheet (Year 1)', income_cert: 'Income Certificate 2024-25', bonafide: 'Bonafide Certificate 2025-26', progress_report: 'Registration & synopsis (2025-26)', bank: 'SBI Passbook (XXXX3390)' }
  return docsCfg.map((d) => ({ key: d.key, label: d.label, status: 'NOT_UPLOADED', attempts: 0, previous: prev[d.key] }))
}
function dataOf(form: Record<string, string>, docs: RenewalDoc[], reuse: { key: DocType; label: string }[], withReport = false): RenewalData {
  const sum = summarise(docs)
  return {
    stable: STABLE_PROFILE, fields: fieldsOf(form), reusedDocs: reuse.map((r) => ({ ...r, from: PREV_NFST_ID })), docs,
    report: withReport ? { generatedAt: now(), overall: sum.overall, required: sum.required, auto: sum.auto, review: sum.review, deficiencies: sum.deficiencies } : undefined,
  }
}
const reportHtml = (appId: string, schemeName: string, schemeCode: string, data: RenewalData) =>
  buildRenewalReportHtml({ applicationId: appId, previousId: PREV_NFST_ID, studentId: 'STU-001', renewalYear: RENEWAL_YEAR, previousYear: P.academicYear, schemeName, schemeCode, data, generatedAt: now() })

/* ------------------------------------------------------------------ */
/* Processing hook: validation → classification → OCR → AI verification */
/* ------------------------------------------------------------------ */
type Prog = { cls: number; ocr: number; ai: number }
function useProcessor(getDoc: (k: DocType) => RenewalDoc | undefined, setDoc: (k: DocType, d: RenewalDoc) => void, ctx: RenewalContext, onDone?: (d: RenewalDoc) => void) {
  const s = useStore()
  const [prog, setProg] = useState<Partial<Record<DocType, Prog>>>({})
  const [errs, setErrs] = useState<Partial<Record<DocType, string>>>({})
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearInterval), [])
  const start = (key: DocType, fileName: string, size: number) => {
    const doc = getDoc(key)
    if (!doc) return
    const bad = validateFile(fileName, size)
    if (bad) { setErrs((e) => ({ ...e, [key]: bad })); return }
    setErrs((e) => ({ ...e, [key]: undefined }))
    const resub = doc.attempts > 0
    setDoc(key, { ...doc, status: resub ? 'RESUBMITTED' : 'PROCESSING', fileName })
    let t = 0
    const total = s.lowBandwidth ? 3 : 24
    const id = window.setInterval(() => {
      t++
      const f = t / total
      setProg((p) => ({ ...p, [key]: { cls: Math.min(100, Math.round(f * 300)), ocr: Math.min(100, Math.max(0, Math.round((f - 0.25) * 250))), ai: Math.min(100, Math.max(0, Math.round((f - 0.5) * 200))) } }))
      if (t >= total) {
        clearInterval(id)
        const res = verifyRenewalDoc(getDoc(key) ?? doc, fileName, ctx)
        setDoc(key, res)
        setProg((p) => ({ ...p, [key]: undefined }))
        s.log(res.status === 'VERIFIED' ? 'Renewal document auto-verified' : res.status === 'REJECTED' ? 'Wrong document detected' : 'Renewal document sent to human review',
          `${res.label}: ${res.status === 'REJECTED' ? `detected ${res.detected}` : `${res.overall}% overall confidence`}${res.reason ? ` — ${res.reason}` : ''}`, undefined, { user: 'System (AI Assist)', role: 'Automated' })
        onDone?.(res)
      }
    }, 110)
    timers.current.push(id)
  }
  return { prog, errs, start }
}

/* ------------------------------------------------------------------ */
/* Document card (upload + processing + result)                        */
/* ------------------------------------------------------------------ */
function RenewalDocCard({ doc, prog, err, onFile, onSample, onWrong, onRemove, locked }: {
  doc: RenewalDoc; prog?: Prog; err?: string; onFile: (f: File) => void; onSample: () => void; onWrong?: () => void; onRemove: () => void; locked?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const busy = !!prog || doc.status === 'PROCESSING' || (doc.status === 'RESUBMITTED' && !doc.overall)
  const canUpload = !locked && !busy
  return (
    <Card className={cx('p-4', doc.status === 'REJECTED' || doc.status === 'DEFICIENCY' ? 'border-red-300' : doc.status === 'HUMAN_REVIEW' ? 'border-saffron-400' : doc.status === 'VERIFIED' || doc.status === 'FINAL_VERIFIED' ? 'border-leaf-500/30' : '')}>
      <div className="flex flex-wrap items-start gap-3">
        <FileText size={20} className="mt-0.5 shrink-0 text-navy-700" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-navy-950">{doc.label}</p><RenewalStatusPill s={busy ? (doc.attempts > 0 ? 'RESUBMITTED' : 'PROCESSING') : doc.status} /></div>
          <p className="text-xs font-medium text-saffron-700">↻ Required for renewal — a current document is needed</p>
          {doc.previous && <p className="mt-0.5 text-xs text-slate-500">Previous document: <span className="text-leaf-700">✓ {doc.previous}</span></p>}
          {doc.fileName && <p className="mt-0.5 truncate text-xs text-slate-500">Uploaded: {doc.fileName}</p>}
        </div>
        {canUpload && (
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant={doc.status === 'NOT_UPLOADED' ? 'primary' : 'outline'} icon={<Upload size={14} />} onClick={() => ref.current?.click()}>{doc.status === 'NOT_UPLOADED' ? 'Upload' : 'Upload again'}</Button>
            <Button size="sm" variant="ghost" onClick={onSample}>Use sample</Button>
            {onWrong && doc.status === 'NOT_UPLOADED' && <Button size="sm" variant="ghost" className="text-red-700" onClick={onWrong}>Try wrong document</Button>}
          </div>
        )}
        <input ref={ref} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" aria-label={`Upload ${doc.label}`} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      </div>
      <p className="mt-1 pl-8 text-[11px] text-slate-400">Supported: PDF, JPG, JPEG, PNG · max 2 MB</p>
      {err && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[12.5px] text-red-700">File validation failed — {err}</p>}

      {busy && (
        <div className="mt-3 flex gap-4 rounded-xl bg-navy-50/60 p-3">
          <ScanPreview active label="renewal" />
          <div className="flex-1 space-y-2.5 text-[12.5px]">
            <p className="flex items-center gap-2 font-semibold text-navy-900"><Loader2 size={14} className="animate-spin" />Processing document…</p>
            {([['Document classification', prog?.cls ?? 5], ['OCR', prog?.ocr ?? 0], ['AI verification', prog?.ai ?? 0]] as [string, number][]).map(([l, v]) => (
              <div key={l}><div className="mb-1 flex justify-between"><span className="text-slate-600">{l}</span><span className="tabular-nums">{v}%</span></div><Progress value={v} color={v >= 100 ? 'bg-leaf-500' : 'bg-navy-700'} /></div>
            ))}
          </div>
        </div>
      )}

      {!busy && doc.status === 'REJECTED' && doc.critical?.includes('Wrong document type') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 font-bold text-red-700"><XCircle size={17} />Wrong Document</p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-[13px]"><div><dt className="text-xs text-slate-500">Expected</dt><dd className="font-semibold text-navy-950">{doc.label}</dd></div><div><dt className="text-xs text-slate-500">Detected</dt><dd className="font-semibold text-red-700">{doc.detected}</dd></div></dl>
          <p className="mt-2 text-[13px] text-slate-700">Please upload the correct document. This file cannot pass verification.</p>
          {!locked && <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={onRemove}>Remove document</Button><Button size="sm" icon={<Upload size={14} />} onClick={() => ref.current?.click()}>Upload again</Button><Button size="sm" variant="ghost" onClick={onSample}>Use correct sample</Button></div>}
        </motion.div>
      )}
      {!busy && doc.overall != null && doc.status !== 'REJECTED' && (
        <div className="mt-3 flex flex-wrap items-center gap-3 pl-8 text-[12.5px]">
          <ConfMeter value={doc.overall} small />
          {doc.status === 'VERIFIED' || doc.status === 'FINAL_VERIFIED' ? <span className="font-semibold text-leaf-700">✓ AI Verified — {doc.overall}%</span> : doc.status === 'HUMAN_REVIEW' ? <span className="font-semibold text-saffron-700">⚠ Manual Verification — {doc.overall}%</span> : null}
        </div>
      )}
      {!busy && doc.status === 'DEFICIENCY' && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800"><b>! Action Required:</b> {doc.reviewNote ?? 'The verification team asked for a new copy of this document.'}</p>}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Stepper                                                             */
/* ------------------------------------------------------------------ */
function Stepper({ current }: { current: number }) {
  return (
    <Card className="mb-5 overflow-x-auto p-4">
      <ol className="flex min-w-[760px] items-center gap-1">
        {RENEWAL_STEPS.map((t, i) => (
          <li key={t} className="flex flex-1 items-center gap-2">
            <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold', i < current ? 'bg-leaf-600 text-white' : i === current ? 'bg-navy-900 text-white ring-4 ring-navy-900/10' : 'bg-navy-50 text-slate-500')}>{i < current ? <Check size={15} /> : i + 1}</span>
            <span className={cx('text-[12px] leading-tight', i === current ? 'font-bold text-navy-950' : i < current ? 'font-semibold text-leaf-700' : 'text-slate-500')}>{t}</span>
            {i < RENEWAL_STEPS.length - 1 && <span className={cx('mx-1 h-0.5 min-w-[12px] flex-1 rounded', i < current ? 'bg-leaf-500' : 'bg-navy-100')} />}
          </li>
        ))}
      </ol>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Small field helpers                                                 */
/* ------------------------------------------------------------------ */
function Retrieved({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[12.5px] font-semibold text-navy-900">{label}</p>
      <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-leaf-500/30 bg-leaf-50/50 px-3 text-sm text-navy-950">
        <span className="truncate">{value}</span><CheckCircle2 size={16} className="shrink-0 text-leaf-600" aria-label="Retrieved from previous application" />
      </div>
    </div>
  )
}
function UpdField({ id, label, previous, value, onChange, options, type = 'text', error, hint, same }: { id: string; label: string; previous: string; value: string; onChange: (v: string) => void; options?: string[]; type?: string; error?: string; hint?: string; same?: boolean }) {
  const changed = same === undefined ? previous !== value : !same
  return (
    <div className={cx('rounded-xl border p-3', changed ? 'border-saffron-400 bg-saffron-50/40' : 'border-navy-100 bg-white')}>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {changed ? <Badge color="amber">Updated</Badge> : <Badge color="gray">↻ Confirm current information</Badge>}
      </div>
      <p className="mb-1.5 text-[11.5px] text-slate-500">Previous: <b className="text-navy-900">{previous}</b></p>
      {options ? <Select id={id} options={options} value={value} onChange={(e) => onChange(e.target.value)} /> : <Input id={id} type={type} value={value} error={error} onChange={(e) => onChange(e.target.value)} />}
      {hint && <p className="mt-1 text-[11.5px] text-slate-500">{hint}</p>}
    </div>
  )
}
function YesNo({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="rounded-xl border border-navy-100 p-3">
      <legend className="px-1 text-[12.5px] font-semibold text-navy-900">{label}</legend>
      <div className="flex gap-4">{['No', 'Yes'].map((o) => (
        <label key={o} className="flex items-center gap-1.5 text-sm"><input type="radio" name={id} className="accent-navy-900" checked={value === o} onChange={() => onChange(o)} />{o}</label>
      ))}</div>
    </fieldset>
  )
}

/* ------------------------------------------------------------------ */
/* Progress summary (dashboard + status page)                          */
/* ------------------------------------------------------------------ */
export function renewalProgress(s: ReturnType<typeof useStore>) {
  // renewal only exists for a student who holds a previous renewable award
  if (!s.applications.some((a) => a.id === PREV_NFST_ID && a.studentId === s.studentId)) return null
  const app = s.applications.find((a) => a.applicationType === 'renewal' && a.previousApplicationId === PREV_NFST_ID)
  const draft = s.renewalDraft
  const docs = app?.renewal?.docs ?? draft?.docs ?? []
  const uploaded = docs.length > 0 && docs.every((d) => d.status !== 'NOT_UPLOADED' && d.status !== 'REJECTED')
  const verified = docs.filter((d) => d.status === 'VERIFIED' || d.status === 'FINAL_VERIFIED').length
  const review = docs.filter((d) => d.status === 'HUMAN_REVIEW').length
  const action = docs.filter((d) => d.status === 'DEFICIENCY' || d.status === 'REJECTED').length
  const approved = !!app && ['Sanction', 'Disbursement'].includes(app.stage)
  const step = app ? 7 : draft?.step ?? (s.renewalAuth ? 1 : 0)
  const items: { t: string; state: 'done' | 'now' | 'todo' | 'warn' }[] = [
    { t: 'Previous application verified', state: step >= 1 ? 'done' : 'now' },
    { t: 'Profile information reviewed', state: step >= 2 ? 'done' : step === 1 ? 'now' : 'todo' },
    { t: 'Current information submitted', state: step >= 3 ? 'done' : step === 2 ? 'now' : 'todo' },
    { t: 'Documents uploaded', state: uploaded ? 'done' : step === 3 ? 'now' : 'todo' },
    { t: `${verified}/${docs.length || 5} documents verified`, state: docs.length && verified === docs.length ? 'done' : verified ? 'now' : 'todo' },
    ...(review ? [{ t: `${review} document${review > 1 ? 's' : ''} under manual review`, state: 'warn' as const }] : []),
    ...(action ? [{ t: `${action} document${action > 1 ? 's need' : ' needs'} your action`, state: 'warn' as const }] : []),
    { t: 'Final approval', state: approved ? 'done' : app ? 'now' : 'todo' },
  ]
  const pct = approved ? 100 : Math.round(Math.min(95, (Math.min(step, 7) / 7) * 70 + (docs.length ? (verified / docs.length) * 25 : 0)))
  const status = !app ? (draft ? 'Draft in progress' : 'Due for renewal') : approved ? 'Approved' : action ? 'Action required' : 'Under verification'
  return { app, draft, items, pct, status }
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */
export function RenewalApplication() {
  const s = useStore()
  const nav = useNavigate()
  const prev = s.applications.find((a) => a.id === PREV_NFST_ID && a.studentId === s.studentId)
  const scheme = schemeById(s.schemes, 'nfst')!
  const submitted = s.applications.find((a) => a.applicationType === 'renewal' && a.previousApplicationId === PREV_NFST_ID)
  const [justSubmitted, setJustSubmitted] = useState<string | null>(null)

  if (!prev) return (
    <div>
      <PageHeader title="Renewal Application" sub="Renew a scholarship you already receive, without filling the whole application again." />
      <Card className="mx-auto max-w-xl p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-navy-50 text-navy-700"><RefreshCw size={24} /></div>
        <h2 className="mt-4 font-display text-xl font-bold text-navy-950">No scholarship to renew yet</h2>
        <p className="mt-2 text-sm text-slate-600">Renewal is available once you have been awarded a renewable scholarship (for example NFST, Post-Matric or Top Class) on this account. Apply for a new scholarship first.</p>
        <div className="mt-5 flex justify-center gap-2"><Button onClick={() => nav('/student/applications?tab=explore')}>Explore schemes</Button><Button variant="outline" onClick={() => nav('/eligibility')}>Check eligibility</Button></div>
      </Card>
    </div>
  )
  if (justSubmitted && submitted) return <SuccessScreen app={submitted} />
  if (!s.renewalAuth) return <Gate onVerified={() => s.set(() => ({ renewalAuth: true }))} submittedId={submitted?.id} />
  if (submitted && !s.renewalDraft) return <SubmittedStatus app={submitted} />
  if (!s.renewalDraft) return <FoundCard prev={prev} onStart={() => {
    const cfg = scheme.renewal?.documents ?? scheme.documents
    s.set(() => ({ renewalDraft: { step: 1, form: { ...DEFAULT_FORM }, confirmed: {}, docs: freshDocs(cfg), savedAt: now() } }))
    s.log('Renewal started', `Renewal ${RENEWAL_YEAR} created from ${PREV_NFST_ID} — stable information reused`, PREV_NFST_ID, { user: 'Anjali Munda', role: 'Student' })
  }} />
  return <Wizard prevApp={prev} onSubmitted={(id) => { setJustSubmitted(id); nav('/student/renewal') }} />
}

/* ---------- Step 1: verify previous application ---------- */
function Gate({ onVerified, submittedId }: { onVerified: () => void; submittedId?: string }) {
  const s = useStore()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [fails, setFails] = useState(0)
  const [busy, setBusy] = useState(false)
  const submit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErr('Enter the email address used in your previous application.'); return }
    if (pw.length < 8) { setErr('Enter your password (at least 8 characters).'); return }
    setBusy(true)
    window.setTimeout(() => {
      setBusy(false)
      if (email.trim().toLowerCase() !== DEMO_EMAIL) { setFails((f) => f + 1); setErr('No previous scholarship application matches these details.'); return }
      s.log('Previous application verified for renewal', `${PREV_NFST_ID} matched by email (password verified, prototype)`, PREV_NFST_ID, { user: 'Anjali Munda', role: 'Student' })
      onVerified()
    }, s.lowBandwidth ? 50 : 700)
  }
  return (
    <div>
      <PageHeader title="Renewal Application" sub="Renew your scholarship without filling the whole application again." actions={<ProtoTag label="Prototype authentication" />} />
      <Stepper current={0} />
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold text-navy-950">Renew Your Scholarship</h2>
          <p className="mt-1 text-slate-600">To continue with your renewal application, verify your previous scholarship application.</p>
          {submittedId && <p className="mt-3 rounded-lg bg-navy-50 px-3 py-2 text-[13px] text-navy-900">You already submitted renewal <b>{submittedId}</b>. Verify to see its status.</p>}
          <div className="mt-5 space-y-4">
            <div><Label htmlFor="rn-e">Previous Application Email</Label>
              <div className="relative"><Mail size={16} className="absolute left-3 top-3 text-slate-400" /><Input id="rn-e" type="email" autoComplete="email" className="pl-9" value={email} onChange={(e) => { setEmail(e.target.value); setErr('') }} placeholder="name@example.in" /></div></div>
            <div><Label htmlFor="rn-p">Password</Label>
              <div className="relative"><KeyRound size={16} className="absolute left-3 top-3 text-slate-400" /><Input id="rn-p" type="password" autoComplete="current-password" className="pl-9" value={pw} onChange={(e) => { setPw(e.target.value); setErr('') }} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="••••••••" /></div></div>
            {err && <p role="alert" className="text-sm font-medium text-red-600">{err}</p>}
            <Button className="w-full" size="lg" disabled={busy} onClick={submit} icon={busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}>{busy ? 'Checking…' : 'CONTINUE'}</Button>
            <p className="text-center text-[12px] text-slate-500">Demo: use the email on your verified profile and any password of 8+ characters. <button className="font-semibold text-navy-700 hover:underline" onClick={() => { setEmail(DEMO_EMAIL); setPw('demo-renewal'); setErr('') }}>Fill demo account</button></p>
          </div>
          <div className={cx('mt-6 flex items-center justify-between gap-3 rounded-xl border p-3 text-sm', fails >= 2 ? 'border-saffron-400 bg-saffron-50' : 'border-navy-100')}>
            <span className="text-slate-700">Don't remember your previous application?</span>
            <Button size="sm" variant="outline" icon={<LifeBuoy size={14} />} onClick={() => nav('/student/grievance')}>Contact Support</Button>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="mb-3 font-display text-lg font-bold">How renewal works</h3>
          <ul className="space-y-3 text-[13.5px] text-slate-700">
            <li className="flex gap-2.5"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-leaf-600" /><span><b>Permanent information is reused</b> — name, date of birth, category, domicile and similar details come from your previous application.</span></li>
            <li className="flex gap-2.5"><RefreshCw size={17} className="mt-0.5 shrink-0 text-saffron-600" /><span><b>Changeable information is reviewed</b> — course year, CGPA, income and contact details are shown with last year’s value for you to update.</span></li>
            <li className="flex gap-2.5"><FileCheck2 size={17} className="mt-0.5 shrink-0 text-navy-700" /><span><b>Current documents are verified again</b> — AI auto-verifies at {AI_CONF_THRESHOLD}%+ confidence; anything uncertain goes to a MoTA official.</span></li>
            <li className="flex gap-2.5"><History size={17} className="mt-0.5 shrink-0 text-violet-600" /><span><b>Your history is kept</b> — the renewal is a new application linked to last year’s, never an overwrite.</span></li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function FoundCard({ prev, onStart }: { prev: Application; onStart: () => void }) {
  const s = useStore()
  return (
    <div>
      <PageHeader title="Renewal Application" sub="Renew your scholarship without filling the whole application again." />
      <Stepper current={1} />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="mx-auto max-w-2xl p-6 sm:p-8">
          <p className="flex items-center gap-2 font-display text-xl font-bold text-leaf-700"><CheckCircle2 size={22} />Previous application found</p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <div><dt className="text-xs text-slate-500">Scholarship</dt><dd className="font-semibold text-navy-950">{schemeById(s.schemes, prev.schemeId)?.name}</dd></div>
            <div><dt className="text-xs text-slate-500">Previous Application ID</dt><dd className="font-semibold tabular-nums text-navy-950">{prev.id}</dd></div>
            <div><dt className="text-xs text-slate-500">Last Application</dt><dd className="font-semibold text-navy-950">{P.academicYear}</dd></div>
          </dl>
          <div className="mt-5 rounded-xl bg-navy-50 p-4 text-sm text-slate-700">Status last year: <b className="text-leaf-700">Selected · {prev.status}</b>. Renewing for <b>{RENEWAL_YEAR}</b> creates a new application linked to {prev.id}.</div>
          <p className="mt-4 text-slate-700">You can now start your renewal application.</p>
          <Button className="mt-5 w-full sm:w-auto" size="lg" variant="saffron" icon={<RefreshCw size={16} />} onClick={onStart}>START RENEWAL</Button>
        </Card>
      </motion.div>
    </div>
  )
}

/* ---------- Steps 2–7 ---------- */
function Wizard({ prevApp, onSubmitted }: { prevApp: Application; onSubmitted: (id: string) => void }) {
  const s = useStore()
  const nav = useNavigate()
  const draft = s.renewalDraft!
  const scheme = schemeById(s.schemes, 'nfst')!
  const reuse = (scheme.renewal?.reuse ?? ['st_cert']).map((k) => ({ key: k, label: scheme.documents.find((d) => d.key === k)?.label ?? k }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [declared, setDeclared] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  const upd = (p: Partial<RenewalDraft>) => s.set((st) => (st.renewalDraft ? { renewalDraft: { ...st.renewalDraft, ...p, savedAt: now() } } : {}))
  const setForm = (k: string, v: string) => { s.set((st) => (st.renewalDraft ? { renewalDraft: { ...st.renewalDraft, form: { ...st.renewalDraft.form, [k]: v }, savedAt: now() } } : {})); setErrors((e) => ({ ...e, [k]: '' })) }
  const f = draft.form
  const ctx = ctxOf(f)
  const docsRef = useRef(draft.docs)
  docsRef.current = draft.docs
  const setDoc = (k: DocType, d: RenewalDoc) => s.set((st) => (st.renewalDraft ? { renewalDraft: { ...st.renewalDraft, docs: st.renewalDraft.docs.map((x) => (x.key === k ? d : x)), savedAt: now() } } : {}))
  const proc = useProcessor((k) => docsRef.current.find((d) => d.key === k), setDoc, ctx)

  const go = (step: number) => { upd({ step }); topRef.current?.scrollIntoView({ behavior: s.lowBandwidth ? 'auto' : 'smooth', block: 'start' }) }

  const validateCurrent = () => {
    const e: Record<string, string> = {}
    const cg = Number(f.cgpa)
    if (!f.cgpa || isNaN(cg) || cg < 0 || cg > 10) e.cgpa = 'Enter CGPA between 0 and 10.'
    if (!/^\d+$/.test(f.income) || Number(f.income) <= 0) e.income = 'Enter annual family income in rupees (numbers only).'
    if (f.attendance && (isNaN(Number(f.attendance)) || Number(f.attendance) > 100)) e.attendance = 'Attendance must be 0–100.'
    if (f.changedInstitution === 'Yes' && !f.newInstitution) e.newInstitution = 'Select your new institution.'
    if (f.changedInstitution === 'Yes' && f.instReason.trim().length < 5) e.instReason = 'Tell us briefly why you changed institution.'
    if (f.changedCourse === 'Yes' && !f.newCourse.trim()) e.newCourse = 'Enter your new course.'
    if (f.changedCourse === 'Yes' && f.courseReason.trim().length < 5) e.courseReason = 'Tell us briefly why you changed course.'
    if (f.enrolled === 'No') e.enrolled = 'Renewal requires continued enrolment. If you have paused or left your course, please contact support.'
    if (f.otherScholarship === 'Yes' && !f.otherName.trim()) e.otherName = 'Name the other scholarship.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Check the email format.'
    if (f.mobile !== P.mobile && !/^\d{10}$/.test(f.mobile)) e.mobile = 'Enter a 10-digit mobile number, or keep your previous one.'
    if (f.bankSame === 'No' && !/^\d{9,18}$/.test(f.newAccount)) e.newAccount = 'Enter the new account number (9–18 digits).'
    if (f.bankSame === 'No' && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(f.newIfsc)) e.newIfsc = 'Enter a valid IFSC, e.g. SBIN0001234.'
    if (!draft.confirmed.current) e.confirmCurrent = 'Please confirm the current information is accurate.'
    setErrors(e)
    return Object.keys(e).length === 0
  }
  const recheckDocs = () => {
    // information changed after documents were verified → re-run matching so the report never goes stale
    const redo = draft.docs.map((d) => d.fileName && ['VERIFIED', 'HUMAN_REVIEW'].includes(d.status) ? verifyRenewalDoc({ ...d, attempts: d.attempts - 1 }, d.fileName, ctx) : d)
    if (JSON.stringify(redo.map((d) => [d.status, d.overall])) !== JSON.stringify(draft.docs.map((d) => [d.status, d.overall]))) {
      upd({ docs: redo }); s.toast('Your documents were re-checked against the updated information', 'info')
    }
  }

  const step = draft.step
  const docs = draft.docs
  const allProcessed = docs.every((d) => ['VERIFIED', 'HUMAN_REVIEW', 'FINAL_VERIFIED'].includes(d.status))
  const anyBusy = docs.some((d) => d.status === 'PROCESSING' || d.status === 'RESUBMITTED')
  const sum = summarise(docs)
  const data = dataOf(f, docs, reuse, true)
  const elig = evaluateScheme(scheme, { category: 'ST', educationLevel: 'MPhil/PhD', income: Number(f.income) || 0, marks: Math.round((Number(f.cgpa) || 0) * 10), destination: 'Domestic', institutionType: 'Government', researchStatus: 'Registered', studyLocation: 'Within home state', course: 'PhD' })

  const next = () => {
    if (step === 1 && !draft.confirmed.profile) { setErrors({ confirmProfile: 'Please confirm your retrieved details are correct.' }); return }
    if (step === 2) { if (!validateCurrent()) { s.toast('Please fix the highlighted fields', 'error'); return } recheckDocs() }
    if (step === 3 && !docs.every((d) => d.status !== 'NOT_UPLOADED' && d.status !== 'REJECTED')) { s.toast('Upload the correct version of every required document', 'error'); return }
    if (step === 3 && anyBusy) { s.toast('Wait for processing to finish', 'info'); return }
    if (step === 4 && !allProcessed) { s.toast('Every document must be verified or with human review before the report', 'error'); return }
    go(step + 1)
  }

  const downloadReport = (id = 'DRAFT') => {
    downloadFile(`Renewal-Verification-Report-${id}.html`, reportHtml(id, scheme.name, scheme.code, data))
    upd({ reportDownloaded: true })
    s.log('Renewal verification report downloaded', `${id} · overall ${sum.overall}`, undefined, { user: 'Anjali Munda', role: 'Student' })
  }

  const submit = () => {
    if (!declared) { setErrors({ declaration: 'Please confirm the declaration.' }); return }
    const id = s.applications.some((a) => a.id === RENEWAL_ID) ? `${RENEWAL_ID}-${s.applications.length}` : RENEWAL_ID
    const t = now()
    const reviewDocs = docs.filter((d) => d.status === 'HUMAN_REVIEW')
    const flags: Flag[] = reviewDocs.map((d) => ({
      id: `rn-${d.key}`, type: 'Low AI confidence', severity: d.critical?.length ? 'high' : 'medium', confidence: d.overall ?? 0, docType: d.key,
      explanation: `${d.label}: overall verification confidence ${d.overall}% (auto-verify needs ≥ ${AI_CONF_THRESHOLD}% and no critical mismatch). ${d.reason ?? ''} Routed to a MoTA official for manual verification.`,
    }))
    const inst = INSTITUTIONS.find((i) => i.name === ctx.institution)
    const app: Application = {
      id, studentId: prevApp.studentId, studentName: prevApp.studentName, schemeId: prevApp.schemeId, institutionId: inst?.id ?? prevApp.institutionId, state: prevApp.state,
      course: f.changedCourse === 'Yes' && f.newCourse ? f.newCourse : prevApp.course, income: Number(f.income), marks: Math.round(Number(f.cgpa) * 10),
      stage: 'State Scrutiny', status: 'In Progress', submittedOn: t, flags,
      history: [
        { stage: 'Submitted', date: t, note: `Renewal ${RENEWAL_YEAR} of ${PREV_NFST_ID}` },
        { stage: 'AI Document Check', date: t, note: `${docs.length} renewal documents: ${sum.auto} auto-verified${sum.review ? `, ${sum.review} sent to human review` : ''}` },
        { stage: 'Institution Verification', date: t, note: 'Renewal: enrolment confirmed from the AI-verified current bonafide certificate' },
        { stage: 'State Scrutiny', note: 'With MoTA Super Admin' },
      ],
      remarks: [], amount: 504000, gender: prevApp.gender, priority: prevApp.priority,
      extra: { ...(prevApp.extra ?? {}), topic: f.topic, supervisor: f.supervisor },
      applicationType: 'renewal', previousApplicationId: PREV_NFST_ID, renewalYear: RENEWAL_YEAR, renewal: data,
    }
    s.set((st) => ({ applications: [app, ...st.applications], renewalDraft: null }))
    s.notify({ title: 'Renewal application submitted', body: `${id} for ${scheme.short} ${RENEWAL_YEAR}. ${sum.review ? `${sum.review} document(s) are with a MoTA official for manual verification.` : 'All documents were verified automatically.'}`, channel: ['in-app', 'sms', 'email'], kind: 'success', audience: 'student' })
    s.notify({ title: `Renewal received · ${id}`, body: `Anjali Munda · ${scheme.short} ${RENEWAL_YEAR} · ${sum.review} document(s) for human review`, channel: ['in-app'], kind: 'action', audience: 'admin' })
    const who = { user: 'Anjali Munda', role: 'Student' }
    s.log('Renewal application submitted', `${RENEWAL_YEAR} renewal linked to ${PREV_NFST_ID}; ${fieldsOf(f).filter((x) => x.previous !== x.current).length} field(s) updated`, id, who)
    s.log('Documents uploaded', `${docs.length} renewal documents; ${reuse.length} permanent documents reused from ${PREV_NFST_ID}`, id, who)
    s.log('AI verification completed', `${sum.auto} auto-verified (≥ ${AI_CONF_THRESHOLD}%), ${sum.review} human review`, id, { user: 'System (AI Assist)', role: 'Automated' })
    reviewDocs.forEach((d) => s.log('Sent to human review', `${d.label} · ${d.overall}% · ${d.reason ?? ''}`, id, { user: 'System (AI Assist)', role: 'Automated' }))
    s.toast('Renewal application submitted')
    onSubmitted(id)
  }

  const groups: { title: string; icon: ReactNode; body: ReactNode }[] = [
    { title: 'Academic information', icon: <FileText size={16} />, body: (
      <div className="grid gap-3 md:grid-cols-2">
        <UpdField id="ay" label="Current academic year" previous={P.academicYear} value={f.academicYear} onChange={(v) => setForm('academicYear', v)} options={['2026-27', '2025-26']} hint="✓ This information is expected to change during renewal." />
        <UpdField id="cy" label="Current course year" previous={P.courseYear} value={f.courseYear} onChange={(v) => setForm('courseYear', v)} options={['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']} />
        <UpdField id="sem" label="Current semester" previous={P.semester} value={f.semester} onChange={(v) => setForm('semester', v)} options={['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester', '9th Semester', '10th Semester']} />
        <UpdField id="cg" label="Current CGPA" previous={P.cgpa} value={f.cgpa} onChange={(v) => setForm('cgpa', v)} type="number" error={errors.cgpa} hint="You’ll upload the current marksheet in step 4 — it must match." />
        <UpdField id="res" label="Previous year's result" previous={P.result} value={f.result} onChange={(v) => setForm('result', v)} options={['Passed', 'Promoted', 'Passed with backlog', 'Result awaited']} />
        <UpdField id="cs" label="Current course status" previous="Continuing" value={f.courseStatus} onChange={(v) => setForm('courseStatus', v)} options={['Continuing', 'Completed', 'On approved leave', 'Discontinued']} />
        <UpdField id="att" label="Attendance (%)" previous="88" value={f.attendance} onChange={(v) => setForm('attendance', v)} type="number" error={errors.attendance} />
        <UpdField id="bl" label="Backlogs" previous="0" value={f.backlogs} onChange={(v) => setForm('backlogs', v)} type="number" />
        <div className="space-y-3 md:col-span-2">
          <YesNo id="chi" label="Have you changed your institution?" value={f.changedInstitution} onChange={(v) => setForm('changedInstitution', v)} />
          {f.changedInstitution === 'Yes' ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid gap-3 rounded-xl bg-navy-50/60 p-3 md:grid-cols-2">
              <Retrieved label="Previous institution" value={P.institution} />
              <div><Label htmlFor="ni">New institution</Label><Select id="ni" options={['', ...INSTITUTIONS.filter((i) => i.name !== P.institution).map((i) => i.name)]} value={f.newInstitution} onChange={(e) => setForm('newInstitution', e.target.value)} />{errors.newInstitution && <p className="mt-1 text-xs text-red-600">{errors.newInstitution}</p>}</div>
              <div className="md:col-span-2"><Label htmlFor="ir">Reason for change</Label><Textarea id="ir" rows={2} value={f.instReason} onChange={(e) => setForm('instReason', e.target.value)} />{errors.instReason && <p className="mt-1 text-xs text-red-600">{errors.instReason}</p>}</div>
            </motion.div>
          ) : <Retrieved label="Current institution (unchanged)" value={P.institution} />}
          <YesNo id="chc" label="Have you changed your course?" value={f.changedCourse} onChange={(v) => setForm('changedCourse', v)} />
          {f.changedCourse === 'Yes' && (
            <div className="grid gap-3 rounded-xl bg-navy-50/60 p-3 md:grid-cols-2">
              <Retrieved label="Previous course" value="PhD, Environmental Science" />
              <div><Label htmlFor="nc">New course</Label><Input id="nc" value={f.newCourse} error={errors.newCourse} onChange={(e) => setForm('newCourse', e.target.value)} /></div>
              <div className="md:col-span-2"><Label htmlFor="cr">Reason for change</Label><Textarea id="cr" rows={2} value={f.courseReason} onChange={(e) => setForm('courseReason', e.target.value)} />{errors.courseReason && <p className="mt-1 text-xs text-red-600">{errors.courseReason}</p>}</div>
            </div>
          )}
        </div>
      </div>
    ) },
    { title: 'Research (NFST)', icon: <Sparkles size={16} />, body: (
      <div className="grid gap-3 md:grid-cols-2">
        <UpdField id="rs" label="Current research stage" previous={P.researchStage} value={f.researchStage} onChange={(v) => setForm('researchStage', v)} options={['Coursework completed', 'Pre-synopsis seminar completed', 'Data collection', 'Thesis writing', 'Thesis submitted']} />
        <UpdField id="sv" label="Supervisor" previous={P.supervisor} value={f.supervisor} onChange={(v) => setForm('supervisor', v)} hint="Must match the supervisor on your progress report." />
        <div className="md:col-span-2"><UpdField id="tp" label="Research topic" previous={P.topic} value={f.topic} onChange={(v) => setForm('topic', v)} /></div>
      </div>
    ) },
    { title: 'Financial information', icon: <FileText size={16} />, body: (
      <div className="grid gap-3 md:grid-cols-2">
        <UpdField id="inc" label="Current annual family income (₹)" previous={inr(P.income)} same={Number(f.income) === P.income} value={f.income} onChange={(v) => setForm('income', v.replace(/\D/g, ''))} error={errors.income} hint={f.income ? `= ${inr(Number(f.income))} · must match your current income certificate` : undefined} />
        <UpdField id="is" label="Main income source" previous={P.incomeSource} value={f.incomeSource} onChange={(v) => setForm('incomeSource', v)} options={['Agriculture', 'Daily wages', 'Salaried', 'Self-employed', 'Pension', 'Other']} />
      </div>
    ) },
    { title: 'Scholarship continuation', icon: <RefreshCw size={16} />, body: (
      <div className="grid gap-3 md:grid-cols-2">
        <YesNo id="en" label="Are you still enrolled?" value={f.enrolled} onChange={(v) => setForm('enrolled', v)} />
        <YesNo id="cp" label="Have you completed the previous academic year?" value={f.completedYear} onChange={(v) => setForm('completedYear', v)} />
        <YesNo id="rc" label="Are you currently receiving this scholarship?" value={f.receiving} onChange={(v) => setForm('receiving', v)} />
        <YesNo id="os" label="Have you received another scholarship?" value={f.otherScholarship} onChange={(v) => setForm('otherScholarship', v)} />
        {errors.enrolled && <p role="alert" className="rounded-lg bg-red-50 p-3 text-[13px] text-red-800 md:col-span-2">{errors.enrolled}</p>}
        {f.otherScholarship === 'Yes' && <div className="md:col-span-2"><Label htmlFor="on">Name of the other scholarship</Label><Input id="on" value={f.otherName} error={errors.otherName} onChange={(e) => setForm('otherName', e.target.value)} /><p className="mt-1 text-[11.5px] text-saffron-700">Receiving two fellowships for the same period may not be allowed — the Super Admin will review it.</p></div>}
      </div>
    ) },
    { title: 'Contact & bank', icon: <Mail size={16} />, body: (
      <div className="grid gap-3 md:grid-cols-2">
        <UpdField id="mo" label="Current mobile" previous={P.mobile} value={f.mobile} onChange={(v) => setForm('mobile', v)} error={errors.mobile} />
        <UpdField id="em" label="Current email" previous={P.email} value={f.email} onChange={(v) => setForm('email', v)} error={errors.email} />
        <UpdField id="rsd" label="Hostel / day scholar" previous={P.residence} value={f.residence} onChange={(v) => setForm('residence', v)} options={['Hostel', 'Day scholar']} />
        <YesNo id="bs" label="Is your bank account the same as last year?" value={f.bankSame === 'Yes' ? 'Yes' : 'No'} onChange={(v) => setForm('bankSame', v)} />
        {f.bankSame === 'No' && (
          <div className="grid gap-3 rounded-xl bg-navy-50/60 p-3 md:col-span-2 md:grid-cols-2">
            <Retrieved label="Previous account" value={P.bank} />
            <div><Label htmlFor="na">New account number</Label><Input id="na" inputMode="numeric" value={f.newAccount} error={errors.newAccount} onChange={(e) => setForm('newAccount', e.target.value.replace(/\D/g, ''))} /></div>
            <div><Label htmlFor="nf">IFSC</Label><Input id="nf" value={f.newIfsc} error={errors.newIfsc} onChange={(e) => setForm('newIfsc', e.target.value.toUpperCase())} /></div>
          </div>
        )}
      </div>
    ) },
  ]

  return (
    <div ref={topRef} className="scroll-mt-20">
      <PageHeader title="Renewal Application" sub={<>{scheme.name} · {RENEWAL_YEAR} · renewing <b className="tabular-nums">{PREV_NFST_ID}</b></>}
        actions={<><Badge color="gray">Autosaved {draft.savedAt.slice(11, 16)}</Badge><Button size="sm" variant="ghost" onClick={() => { s.toast('Renewal saved — continue any time from your dashboard', 'info'); nav('/student/dashboard') }}>Save & exit</Button></>} />
      <Stepper current={step} />

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2 }}>
          {/* Step 2: review profile */}
          {step === 1 && (
            <div className="space-y-5">
              <Card className="flex items-start gap-3 border-leaf-500/30 bg-leaf-50/60 p-4"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-leaf-600" /><p className="text-sm text-navy-950"><b>We've reused information from your previous application.</b> Please review it. Fields that may need updating come in the next step — you won't type any of this again.</p></Card>
              <Card className="p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-bold">Personal & permanent information</h2><Badge color="green">✓ Retrieved from previous application · {STABLE_PROFILE.length} fields</Badge></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{STABLE_PROFILE.map((x) => <Retrieved key={x.label} label={x.label} value={x.value} />)}</div>
                <p className="mt-4 text-[12.5px] text-slate-500">Something wrong here? Permanent details can only be corrected by the MoTA Super Admin. <button className="font-semibold text-navy-700 hover:underline" onClick={() => { s.log('Correction requested (permanent field)', 'Student flagged a permanent profile field during renewal', PREV_NFST_ID, { user: 'Anjali Munda', role: 'Student' }); s.toast('Correction request sent to the MoTA Super Admin', 'info') }}>Request a correction</button></p>
              </Card>
              <Card className="p-5">
                <h2 className="mb-3 font-display text-lg font-bold">Permanent documents reused</h2>
                <ul className="grid gap-2 sm:grid-cols-2">{reuse.map((r) => <li key={r.key} className="flex items-center gap-2 rounded-lg border border-leaf-500/30 bg-leaf-50/50 px-3 py-2 text-sm"><FileCheck2 size={16} className="text-leaf-600" /><span className="flex-1">{r.label}</span><span className="text-xs text-slate-500">verified in {PREV_NFST_ID}</span></li>)}</ul>
                <p className="mt-2 text-[12px] text-slate-500">These don’t change year to year, so the scheme configuration allows them to be reused. Everything else is verified again.</p>
              </Card>
              <label className="flex items-start gap-2 rounded-xl border border-navy-100 bg-white p-4 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-navy-900" checked={!!draft.confirmed.profile} onChange={(e) => { upd({ confirmed: { ...draft.confirmed, profile: e.target.checked } }); setErrors({}) }} />I have reviewed my retrieved details and they are correct.</label>
              {errors.confirmProfile && <p role="alert" className="text-sm text-red-600">{errors.confirmProfile}</p>}
            </div>
          )}

          {/* Step 3: update current info */}
          {step === 2 && (
            <div className="space-y-5">
              <Card className="flex items-start gap-3 border-saffron-400 bg-saffron-50/60 p-4"><RefreshCw size={20} className="mt-0.5 shrink-0 text-saffron-600" /><p className="text-sm text-navy-950"><b>↻ Update required.</b> These details can change every year. Last year’s value is shown for each — change what’s different and confirm the rest. Changed fields are highlighted.</p></Card>
              {groups.map((g) => (
                <Card key={g.title} className="p-5"><h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">{g.icon}{g.title}</h2>{g.body}</Card>
              ))}
              <Card className={cx('flex flex-wrap items-center gap-3 p-4', elig.verdict === 'match' ? 'border-leaf-500/30' : 'border-saffron-400')}>
                {elig.verdict === 'match' ? <CheckCircle2 className="text-leaf-600" /> : <AlertTriangle className="text-saffron-600" />}
                <p className="flex-1 text-sm">{elig.verdict === 'match' ? <>Still eligible for {scheme.short}: meets all {elig.results.length} configured rules with the updated information.</> : <>With the updated information you may not meet: {elig.results.filter((r) => !r.pass).map((r) => r.reason).join('; ')}. You can still submit — the Super Admin decides.</>}</p>
              </Card>
              <label className="flex items-start gap-2 rounded-xl border border-navy-100 bg-white p-4 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-navy-900" checked={!!draft.confirmed.current} onChange={(e) => { upd({ confirmed: { ...draft.confirmed, current: e.target.checked } }); setErrors((x) => ({ ...x, confirmCurrent: '' })) }} />I confirm this is my current information for {RENEWAL_YEAR}.</label>
              {errors.confirmCurrent && <p role="alert" className="text-sm text-red-600">{errors.confirmCurrent}</p>}
            </div>
          )}

          {/* Step 4: upload */}
          {step === 3 && (
            <div className="space-y-4">
              <Card className="flex flex-wrap items-center gap-3 p-4">
                <Info size={18} className="text-navy-700" />
                <p className="flex-1 text-sm text-slate-700">Document list comes from the {scheme.short} renewal configuration. Old documents are shown for reference but are <b>not</b> treated as verified for this year.</p>
                <Button size="sm" variant="soft" disabled={anyBusy} onClick={() => docs.filter((d) => d.status === 'NOT_UPLOADED' || d.status === 'REJECTED').forEach((d, i) => window.setTimeout(() => proc.start(d.key, SAMPLE_FILE[d.key] ?? `${d.key}.pdf`, 400000), i * 250))}>Upload all samples</Button>
              </Card>
              {docs.map((d) => (
                <RenewalDocCard key={d.key} doc={d} prog={proc.prog[d.key]} err={proc.errs[d.key]}
                  onFile={(file) => proc.start(d.key, file.name, file.size)} onSample={() => proc.start(d.key, SAMPLE_FILE[d.key] ?? `${d.key}.pdf`, 400000)}
                  onWrong={d.key === 'marksheet' ? () => proc.start(d.key, 'Income_Certificate_2026-27.pdf', 380000) : undefined}
                  onRemove={() => setDoc(d.key, { ...d, status: 'NOT_UPLOADED', fileName: undefined, detected: undefined, signals: undefined, critical: undefined, reason: undefined, overall: undefined })} />
              ))}
              <Card className="p-4"><p className="mb-2 text-sm font-semibold text-navy-900">Reused permanent documents</p><div className="flex flex-wrap gap-2">{reuse.map((r) => <Badge key={r.key} color="green"><Check size={11} />{r.label} · from {PREV_NFST_ID}</Badge>)}</div></Card>
            </div>
          )}

          {/* Step 5: verification details */}
          {step === 4 && (
            <div className="space-y-4">
              <Card className="grid gap-3 p-4 sm:grid-cols-4">
                {[['Required', sum.required, 'text-navy-950'], ['Auto-verified', sum.auto, 'text-leaf-700'], ['Human review', sum.review, 'text-saffron-700'], ['Deficiencies', sum.deficiencies, 'text-red-600']].map(([l, v, c]) => (
                  <div key={l as string} className="rounded-xl bg-navy-50/60 p-3"><p className="text-xs text-slate-500">{l}</p><p className={cx('font-display text-2xl font-bold tabular-nums', c as string)}>{v as number}</p></div>
                ))}
              </Card>
              {docs.map((d) => (
                <Card key={d.key} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-display text-lg font-bold text-navy-950">{d.label}</p><p className="text-sm text-slate-600">Detected document: <b className={d.detected ? 'text-leaf-700' : ''}>{d.detected ? `✓ ${d.detected}` : '—'}</b></p></div>
                    <RenewalStatusPill s={d.status} />
                  </div>
                  <div className="mt-4 grid gap-5 md:grid-cols-2">
                    <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Verification signals</p><SignalList doc={d} /></div>
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Extracted fields</p>
                      <dl className="space-y-1 text-[12.5px]">{Object.entries(d.fields ?? {}).map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-navy-50 pb-1"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium text-navy-950">{v}</dd></div>)}</dl>
                    </div>
                  </div>
                  {d.status === 'VERIFIED' ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-leaf-50 p-4">
                      <p className="flex items-center gap-2 font-bold text-leaf-700"><CheckCircle2 size={18} />DOCUMENT VERIFIED</p>
                      <div className="text-right text-sm"><p className="text-slate-600">Verification confidence <b className="text-navy-950">{d.overall}%</b></p><p className="text-slate-600">Status: <b>Automatically Verified</b></p></div>
                    </div>
                  ) : d.status === 'HUMAN_REVIEW' ? (
                    <div className="mt-4 rounded-xl bg-saffron-50 p-4 text-sm">
                      <p className="flex items-center gap-2 font-bold text-saffron-700"><AlertTriangle size={18} />MANUAL VERIFICATION REQUIRED</p>
                      <p className="mt-1">Verification confidence: <b>{d.overall}%</b></p>
                      <p className="mt-1"><b>Reason:</b> {d.reason}</p>
                      <p className="mt-2 text-slate-700">Your document has been forwarded to the verification team. You do not need to upload it again unless requested.</p>
                      <Button size="sm" variant="outline" className="mt-3" icon={<Upload size={14} />} onClick={() => go(3)}>Upload a clearer copy (optional)</Button>
                    </div>
                  ) : null}
                </Card>
              ))}
              <p className="text-[12px] text-slate-500">Rule: auto-verified only when overall confidence ≥ {AI_CONF_THRESHOLD}%, the document type is correct, mandatory fields are present and there is no critical mismatch. Low confidence is never an automatic rejection.</p>
            </div>
          )}

          {/* Step 6: report */}
          {step === 5 && (
            <ReportView data={data} appId="(assigned on submission)" schemeName={scheme.name} schemeCode={scheme.code}
              action={<Button icon={<Download size={16} />} onClick={() => downloadReport()}>DOWNLOAD RENEWAL VERIFICATION REPORT</Button>} />
          )}

          {/* Step 7: final */}
          {step === 6 && (
            <Card className="mx-auto max-w-2xl p-6 sm:p-8">
              <h2 className="font-display text-2xl font-bold text-navy-950">Review your renewal application</h2>
              <ul className="mt-5 space-y-2.5">
                {([
                  ['Previous information retrieved', true], ['Current information updated', !!draft.confirmed.current], ['Required documents uploaded', docs.every((d) => d.fileName)],
                  ['Document verification completed', allProcessed], [sum.deficiencies ? `${sum.deficiencies} unresolved deficiency` : 'No unresolved deficiencies', sum.deficiencies === 0],
                ] as [string, boolean][]).map(([t, ok]) => <li key={t} className={cx('flex items-center gap-2 text-sm', ok ? 'text-navy-950' : 'text-red-700')}>{ok ? <CheckCircle2 size={17} className="text-leaf-600" /> : <XCircle size={17} />}{t}</li>)}
                {sum.review > 0 && <li className="flex items-center gap-2 text-sm text-saffron-700"><AlertTriangle size={17} />{sum.review} document(s) will be verified manually by a MoTA official after submission</li>}
              </ul>
              <div className="mt-6 rounded-xl bg-navy-50 p-4">
                <p className="mb-2 text-sm font-semibold text-navy-950">Declaration</p>
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-navy-900" checked={declared} onChange={(e) => { setDeclared(e.target.checked); setErrors({}) }} />I confirm that the information provided is accurate and current.</label>
                {errors.declaration && <p role="alert" className="mt-1 text-xs text-red-600">{errors.declaration}</p>}
              </div>
              <Button className="mt-6 w-full" size="lg" variant="saffron" disabled={!allProcessed || sum.deficiencies > 0} onClick={submit}>SUBMIT RENEWAL APPLICATION</Button>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} disabled={step <= 1} onClick={() => go(step - 1)}>Back</Button>
        {step < 6 && <Button onClick={next} disabled={step === 3 && anyBusy}>Next: {RENEWAL_STEPS[step + 1]} <ArrowRight size={16} /></Button>}
      </div>
    </div>
  )
}

/* ---------- Report view (step 6, status page, admin) ---------- */
export function ReportView({ data, appId, schemeName, schemeCode, action }: { data: RenewalData; appId: string; schemeName: string; schemeCode: string; action?: ReactNode }) {
  const sum = summarise(data.docs)
  const st = (k: string) => data.stable.find((x) => x.label === k)?.value ?? '—'
  const cur = (k: string) => data.fields.find((x) => x.label === k)?.current ?? '—'
  const Sec = ({ t, rows }: { t: string; rows: [string, string][] }) => (
    <div className="rounded-xl border border-navy-100 p-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t}</p>
      <dl className="space-y-1.5 text-[13px]">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium text-navy-950">{v}</dd></div>)}</dl></div>
  )
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-2 border-saffron-500 pb-4">
        <div><p className="text-xs text-slate-500">SANGAM Setu</p><h2 className="font-display text-2xl font-bold text-navy-950">Renewal Verification Report</h2></div>
        {action}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Sec t="Applicant" rows={[['Name', st('Full name')], ['Student ID', 'STU-001'], ['Application ID', appId], ['Previous application ID', PREV_NFST_ID], ['Renewal year', RENEWAL_YEAR]]} />
        <Sec t="Scholarship" rows={[['Scholarship', schemeName], ['Code', schemeCode], ['Previous scholarship year', P.academicYear], ['Current renewal year', RENEWAL_YEAR]]} />
        <Sec t="Profile summary" rows={['Date of birth', 'Gender', 'State', 'District', 'Category', 'Domicile'].map((k) => [k, st(k)] as [string, string])} />
        <Sec t="Current academic information" rows={[['Course', cur('Course')], ['Current year', cur('Current course year')], ['Semester', cur('Current semester')], ['Institution', cur('Current institution')], ['Current CGPA', cur('Current CGPA')]]} />
        <Sec t="Financial information" rows={[['Current family income', cur('Annual family income')], ['Income year', 'FY 2025-26 (valid till 31 Mar 2027)']]} />
        <Sec t="Overall status" rows={[['Required documents', String(sum.required)], ['Automatically verified', String(sum.auto)], ['Human review', String(sum.review)], ['Deficiencies', String(sum.deficiencies)]]} />
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-navy-100">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2">Document</th><th className="px-4 py-2 text-right">Confidence</th><th className="px-4 py-2">Status</th></tr></thead>
          <tbody className="divide-y divide-navy-50">{data.docs.map((d) => <tr key={d.key}><td className="px-4 py-2.5">{d.label}</td><td className="px-4 py-2.5 text-right font-semibold tabular-nums">{d.overall != null ? `${d.overall}%` : '—'}</td><td className="px-4 py-2.5"><RenewalStatusPill s={d.status} /></td></tr>)}</tbody>
        </table>
      </div>
      <div className={cx('mt-4 flex items-center gap-2 rounded-xl p-4 font-display text-lg font-bold', sum.overall === 'PASSED' ? 'bg-leaf-50 text-leaf-700' : 'bg-saffron-50 text-saffron-700')}>
        {sum.overall === 'PASSED' ? <CheckCircle2 /> : <AlertTriangle />}OVERALL VERIFICATION: {sum.overall === 'PASSED' ? '✓ PASSED' : '⚠ PENDING HUMAN REVIEW'}
      </div>
    </Card>
  )
}

/* ---------- Success & status ---------- */
function SuccessScreen({ app }: { app: Application }) {
  const s = useStore()
  const nav = useNavigate()
  const scheme = schemeById(s.schemes, app.schemeId)!
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <Card className="mx-auto max-w-2xl p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-leaf-50 text-leaf-600"><PartyPopper size={30} /></div>
        <h1 className="mt-4 font-display text-2xl font-bold text-navy-950">RENEWAL APPLICATION SUBMITTED</h1>
        <p className="mt-2 text-slate-600">Your scholarship renewal application has been successfully submitted.</p>
        <dl className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-4 text-left text-sm">
          <div className="col-span-2"><dt className="text-xs text-slate-500">Scholarship</dt><dd className="font-semibold">{scheme.name}</dd></div>
          <div><dt className="text-xs text-slate-500">Renewal Year</dt><dd className="font-semibold">{app.renewalYear}</dd></div>
          <div><dt className="text-xs text-slate-500">Status</dt><dd className="font-semibold">Submitted</dd></div>
          <div className="col-span-2"><dt className="text-xs text-slate-500">Renewal Application ID</dt><dd className="font-semibold tabular-nums">{app.id}</dd></div>
        </dl>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button onClick={() => nav(`/student/applications?id=${app.id}`)}>VIEW APPLICATION</Button>
          <Button variant="outline" icon={<Download size={15} />} onClick={() => { downloadFile(`Renewal-Verification-Report-${app.id}.html`, reportHtml(app.id, scheme.name, scheme.code, app.renewal!)); s.toast('Verified report downloaded') }}>DOWNLOAD VERIFIED REPORT</Button>
          <Button variant="ghost" onClick={() => nav('/student/dashboard')}>GO TO DASHBOARD</Button>
        </div>
      </Card>
    </motion.div>
  )
}

function SubmittedStatus({ app }: { app: Application }) {
  const s = useStore()
  const nav = useNavigate()
  const scheme = schemeById(s.schemes, app.schemeId)!
  const pr = renewalProgress(s) ?? { pct: 0, status: 'Under verification', items: [] }
  const docs = app.renewal?.docs ?? []
  const appRef = useRef(app)
  appRef.current = app
  const setDoc = (k: DocType, d: RenewalDoc) => s.set((st) => ({ applications: st.applications.map((a) => a.id === app.id && a.renewal ? { ...a, renewal: { ...a.renewal, docs: a.renewal.docs.map((x) => (x.key === k ? d : x)) } } : a) }))
  const renewalData = app.renewal!
  // rebuild the matching context from the submitted record
  const form: RenewalContext = { name: 'Anjali Munda', institution: renewalData.fields.find((x) => x.label === 'Current institution')?.current ?? P.institution, academicYear: renewalData.fields.find((x) => x.label === 'Academic year')?.current ?? RENEWAL_YEAR, cgpa: renewalData.fields.find((x) => x.label === 'Current CGPA')?.current ?? '8.2', income: app.income, supervisor: renewalData.fields.find((x) => x.label === 'Supervisor')?.current ?? P.supervisor, bankChanged: false }
  const proc = useProcessor((k) => appRef.current.renewal?.docs.find((d) => d.key === k), setDoc, form, (res) => {
    // resubmission after a deficiency / rejection: sync flags, deficiencies and status
    s.setFlags(app.id, (fl) => {
      const rest = fl.filter((x) => x.docType !== res.key)
      return res.status === 'HUMAN_REVIEW' ? [...rest, { id: `rn-${res.key}-${res.attempts}`, type: 'Low AI confidence', severity: res.critical?.length ? 'high' : 'medium', confidence: res.overall ?? 0, docType: res.key, explanation: `${res.label} (resubmitted): ${res.overall}% — ${res.reason ?? ''} Routed to a MoTA official.` }] : rest
    })
    s.deficiencies.filter((d) => d.applicationId === app.id && d.status === 'Open' && d.docType === res.key).forEach((d) => s.resolveDeficiency(d.id))
    const still = (appRef.current.renewal?.docs ?? []).some((d) => d.key !== res.key && (d.status === 'DEFICIENCY' || d.status === 'REJECTED'))
    if (!still && res.status !== 'REJECTED') s.updateApp(app.id, { status: 'In Progress' })
    s.log('Renewal document resubmitted', `${res.label}: ${res.status}${res.overall != null ? ` (${res.overall}%)` : ''}`, app.id, { user: 'Anjali Munda', role: 'Student' })
    s.notify({ title: `Renewal document resubmitted · ${app.id}`, body: `${res.label}: ${res.status.replace('_', ' ')}`, channel: ['in-app'], kind: 'info', audience: 'admin' })
    if (res.status !== 'REJECTED') s.toast(res.status === 'VERIFIED' ? 'Resubmitted document auto-verified' : 'Resubmitted — with a MoTA official for review')
  })
  const needAction = docs.filter((d) => d.status === 'DEFICIENCY' || d.status === 'REJECTED')
  return (
    <div>
      <PageHeader title="Renewal Application" sub={<>{scheme.name} · {app.renewalYear} · <span className="tabular-nums">{app.id}</span> (renewal of {app.previousApplicationId})</>}
        actions={<><Button variant="outline" size="sm" icon={<Download size={14} />} onClick={() => downloadFile(`Renewal-Verification-Report-${app.id}.html`, reportHtml(app.id, scheme.name, scheme.code, renewalData))}>Verified report</Button><Button size="sm" onClick={() => nav(`/student/applications?id=${app.id}`)}>Open tracker</Button></>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Renewal status</h2><Badge color={pr.status === 'Approved' ? 'green' : pr.status === 'Action required' ? 'red' : 'amber'}>{pr.status}</Badge></div>
          <div className="mb-4 flex items-center gap-3"><Progress value={pr.pct} /><span className="text-sm font-semibold tabular-nums">{pr.pct}%</span></div>
          <ProgressItems items={pr.items} />
          <p className="mt-4 text-[12.5px] text-slate-500">Previous application {app.previousApplicationId} is kept unchanged; this renewal is a separate record.</p>
        </Card>
        <div className="space-y-3">
          {needAction.length > 0 && <Card className="flex items-start gap-3 border-red-300 bg-red-50 p-4"><AlertTriangle className="shrink-0 text-red-600" /><p className="text-sm text-navy-950"><b>! Action Required.</b> The verification team asked for {needAction.map((d) => d.label).join(', ')}. Upload a new copy below — nothing else needs to change.</p></Card>}
          {docs.map((d) => (
            <RenewalDocCard key={d.key} doc={d} prog={proc.prog[d.key]} err={proc.errs[d.key]} locked={!(d.status === 'DEFICIENCY' || d.status === 'REJECTED')}
              onFile={(file) => proc.start(d.key, file.name, file.size)} onSample={() => proc.start(d.key, SAMPLE_FILE[d.key] ?? `${d.key}.pdf`, 400000)} onRemove={() => undefined} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProgressItems({ items }: { items: { t: string; state: 'done' | 'now' | 'todo' | 'warn' }[] }) {
  return (
    <ul className="space-y-2">{items.map((it) => (
      <li key={it.t} className={cx('flex items-center gap-2 text-sm', it.state === 'done' ? 'text-navy-950' : it.state === 'warn' ? 'font-semibold text-saffron-700' : it.state === 'now' ? 'font-semibold text-navy-900' : 'text-slate-400')}>
        {it.state === 'done' ? <CheckCircle2 size={16} className="text-leaf-600" /> : it.state === 'warn' ? <ArrowRight size={16} /> : it.state === 'now' ? <CircleDot size={16} className="text-saffron-600" /> : <Circle size={16} />}{it.t}
      </li>
    ))}</ul>
  )
}

/* ------------------------------------------------------------------ */
/* Admin: renewal detail inside the existing Scrutiny review           */
/* ------------------------------------------------------------------ */
export function RenewalAdminPanel({ app }: { app: Application }) {
  const s = useStore()
  const nav = useNavigate()
  const r = app.renewal
  const [view, setView] = useState<RenewalDoc | null>(null)
  const [act, setAct] = useState<{ doc: RenewalDoc; kind: 'reject' | 'request' } | null>(null)
  const [note, setNote] = useState('')
  if (!r) return null
  const prev = s.applications.find((a) => a.id === app.previousApplicationId)
  const changed = r.fields.filter((x) => x.previous !== x.current)
  const setDoc = (k: DocType, p: Partial<RenewalDoc>) => s.set((st) => ({ applications: st.applications.map((a) => a.id === app.id && a.renewal ? { ...a, renewal: { ...a.renewal, docs: a.renewal.docs.map((x) => (x.key === k ? { ...x, ...p } : x)) } } : a) }))
  const who = `${s.actorName} (${s.actorRole})`
  const verify = (d: RenewalDoc) => {
    setDoc(d.key, { status: 'FINAL_VERIFIED', reviewedBy: who })
    s.setFlags(app.id, (fl) => fl.map((x) => x.docType === d.key ? { ...x, resolved: true, resolvedBy: who } : x))
    s.log('Renewal document verified by MoTA official', `${d.label}: AI ${d.overall}% — checked against original and accepted`, app.id)
    s.notify({ title: `${d.label} verified`, body: `A MoTA official manually verified your renewal document (${app.id}).`, channel: ['in-app', 'sms'], kind: 'success', audience: 'student' })
    s.toast(`${d.label} verified`)
  }
  const doAct = () => {
    if (!act) return
    const { doc: d, kind } = act
    const msg = note.trim() || (kind === 'reject' ? 'This document cannot be accepted. Please upload the correct current document.' : 'Please upload a clearer, complete copy of this document.')
    setDoc(d.key, { status: kind === 'reject' ? 'REJECTED' : 'DEFICIENCY', reviewedBy: who, reviewNote: msg, critical: kind === 'reject' ? [...(d.critical ?? []).filter((c) => c !== 'Wrong document type'), 'Rejected by official'] : d.critical })
    s.raiseDeficiency({ applicationId: app.id, title: `${d.label} — ${kind === 'reject' ? 'rejected' : 'new document requested'}`, reason: msg, raisedBy: who, docType: d.key })
    s.setStatus(app.id, 'Correction Requested')
    s.notify({ title: kind === 'reject' ? `Renewal document rejected: ${d.label}` : `New document requested: ${d.label}`, body: `${msg} Open Renewal Application to upload it — nothing else needs to change.`, channel: ['in-app', 'sms', 'email'], kind: 'action', audience: 'student' })
    s.log(kind === 'reject' ? 'Renewal document rejected' : 'New renewal document requested', `${d.label}: ${msg}`, app.id)
    s.toast(kind === 'reject' ? 'Document rejected — student notified' : 'New document requested — student notified', 'warning')
    setAct(null); setNote('')
  }
  const trail = [
    ...(prev ? [{ at: prev.submittedOn.slice(0, 10), t: `${P.academicYear} · Original application ${prev.id}`, d: `Status: Selected · ${prev.status}` }] : []),
    { at: app.submittedOn.slice(0, 10), t: `${app.renewalYear} · Renewal application ${app.id}`, d: `Status: ${app.status}` },
    ...s.audit.filter((e) => e.applicationId === app.id || (e.applicationId === app.previousApplicationId && /renewal/i.test(e.action))).slice().reverse().map((e) => ({ at: e.at, t: e.action, d: `${e.user} — ${e.details}` })),
  ]
  return (
    <div className="space-y-4">
      <Card className="border-violet-500/30 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2"><Badge color="violet"><RefreshCw size={11} />RENEWAL APPLICATION</Badge><span className="text-xs text-slate-500">Linked record — previous year is not overwritten</span></div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Current application</dt><dd className="font-semibold tabular-nums">{app.id}</dd></div>
          <div><dt className="text-xs text-slate-500">Previous application</dt><dd><button className="font-semibold tabular-nums text-navy-700 hover:underline" onClick={() => nav(`/admin/application/${app.previousApplicationId}`)}>{app.previousApplicationId}</button></dd></div>
          <div><dt className="text-xs text-slate-500">Renewal year</dt><dd className="font-semibold">{app.renewalYear}</dd></div>
        </dl>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-base font-bold text-navy-950">Previous vs current</h2><Badge color="amber">{changed.length} changed</Badge></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-[13px]">
          <thead className="text-left text-xs text-slate-500"><tr><th className="py-2 pr-3">Field</th><th className="py-2 pr-3">Previous ({P.academicYear})</th><th className="py-2">Current ({app.renewalYear})</th></tr></thead>
          <tbody className="divide-y divide-navy-50">{r.fields.map((x) => {
            const ch = x.previous !== x.current
            return <tr key={x.label} className={ch ? 'bg-saffron-50/70' : ''}><td className="py-2 pr-3 text-slate-600">{x.label}</td><td className="py-2 pr-3">{x.previous}</td><td className={cx('py-2', ch && 'font-semibold text-navy-950')}>{x.current}{ch && <span className="ml-1.5 text-[11px] font-bold text-saffron-700">CHANGED</span>}</td></tr>
          })}</tbody>
        </table></div>
        <p className="mt-2 text-[11.5px] text-slate-500">{r.stable.length} permanent fields reused unchanged · {r.reusedDocs.length} permanent documents reused ({r.reusedDocs.map((d) => d.label).join(', ')})</p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-display text-base font-bold text-navy-950">Renewal documents</h2>
        <div className="space-y-3">{r.docs.map((d) => (
          <div key={d.key} className={cx('rounded-xl border p-4', d.status === 'HUMAN_REVIEW' ? 'border-saffron-400 bg-saffron-50/40' : 'border-navy-100')}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-navy-950">{d.label}</p>
              <div className="flex items-center gap-2">{d.overall != null && <ConfMeter value={d.overall} small />}<RenewalStatusPill s={d.status} /></div>
            </div>
            {d.status === 'HUMAN_REVIEW' && (
              <div className="mt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-saffron-700">Human review required</p>
                <p className="mt-1 text-[13px] text-slate-700"><b>AI confidence:</b> {d.overall}% · <b>AI reason:</b> {d.reason}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-white p-3 text-[12.5px] ring-1 ring-navy-100">{Object.entries(d.fields ?? {}).map(([k, v]) => <div key={k}><dt className="text-slate-500">{k}</dt><dd className="font-medium text-navy-950">{v}</dd></div>)}</dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" icon={<Eye size={14} />} onClick={() => setView(d)}>View original document</Button>
                  <Button size="sm" variant="success" icon={<CheckCircle2 size={14} />} onClick={() => verify(d)}>Verify</Button>
                  <Button size="sm" variant="danger" icon={<XCircle size={14} />} onClick={() => { setAct({ doc: d, kind: 'reject' }); setNote('') }}>Reject</Button>
                  <Button size="sm" variant="outline" icon={<Undo2 size={14} />} onClick={() => { setAct({ doc: d, kind: 'request' }); setNote('') }}>Request new document</Button>
                </div>
              </div>
            )}
            {d.reviewedBy && d.status !== 'HUMAN_REVIEW' && <p className="mt-1.5 text-[12px] text-slate-500">Reviewed by {d.reviewedBy}{d.reviewNote ? ` — “${d.reviewNote}”` : ''}</p>}
            {(d.status === 'VERIFIED' || d.status === 'FINAL_VERIFIED') && !d.reviewedBy && <p className="mt-1.5 text-[12px] text-leaf-700">Automatically verified by AI (≥ {AI_CONF_THRESHOLD}%, no critical mismatch) · <button className="font-semibold hover:underline" onClick={() => setView(d)}>view</button></p>}
          </div>
        ))}</div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-navy-950"><History size={16} />Year-by-year history</h2>
        <ol className="relative space-y-3 border-l-2 border-navy-100 pl-4">{trail.map((e, i) => (
          <li key={i} className="text-[13px]"><span className="absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full bg-navy-600" /><p className="text-[11.5px] tabular-nums text-slate-500">{e.at}</p><p className="font-semibold text-navy-950">{e.t}</p><p className="text-slate-600">{e.d}</p></li>
        ))}</ol>
      </Card>

      <Modal open={!!view} onClose={() => setView(null)} title={view ? `${view.label} — original` : ''}>
        {view && (
          <div className="flex gap-4">
            <ScanPreview active={false} label="" />
            <div className="flex-1 text-[13px]">
              <p className="mb-2 text-xs text-slate-500">{view.fileName}</p>
              <SignalList doc={view} />
              <p className="mt-3 text-[11.5px] text-slate-500">Viewing logged to the audit trail.</p>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!act} onClose={() => setAct(null)} title={act?.kind === 'reject' ? 'Reject document' : 'Request new document'}>
        {act && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{act.doc.label} · AI {act.doc.overall}%. The student is asked to upload only this document again.</p>
            <div><Label htmlFor="rn-note">Message to student</Label><Textarea id="rn-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={act.kind === 'reject' ? 'Why it cannot be accepted' : 'e.g. Upload a scan where the account holder name is fully visible'} /></div>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setAct(null)}>Cancel</Button><Button variant={act.kind === 'reject' ? 'danger' : 'primary'} onClick={doAct}>{act.kind === 'reject' ? 'Reject & notify' : 'Request & notify'}</Button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

