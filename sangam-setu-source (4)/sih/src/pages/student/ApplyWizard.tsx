import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check, Lock, ArrowLeft, ArrowRight, Save, Eye, Sparkles, AlertTriangle, CheckCircle2, Pencil, Upload, UserCheck, Send, Loader2, Headset, PartyPopper, GitCompareArrows, Info,
} from 'lucide-react'
import { useStore, schemeById, type Draft } from '../../store/AppStore'
import { FIELD_META } from '../../lib/rules'
import { DetailsForm, answersFor, displayValue, instName, maskAcct, validateKeys, type DKey } from '../../components/DetailsForm'
import { INSTITUTIONS } from '../../data/mock'
import { AIBadge, Badge, Button, Card, cx, Input, Label, Modal, Select } from '../../components/ui'
import { AI_CONF_THRESHOLD, evaluateScheme, inr, now, type Answers } from '../../lib/rules'
import { DocRow, LOW_CONF, PIPE_STAGES, SAMPLE_EXTRACT } from './Documents'
import { RenewalApplication } from './Renewal'
import type { Application, DocType, DocumentRec, Flag, Scheme } from '../../types'

const STEPS = ['Personal', 'Academic', 'Eligibility', 'Bank', 'Documents', 'Review', 'Submit']
const CERT_INCOME = 320000

const PERSONAL: DKey[] = ['name', 'dob', 'gender', 'mobile', 'email', 'aadhaarLast4', 'tribe', 'guardian', 'parentOccupation', 'disability', 'state', 'district', 'pin', 'address']
const ACADEMIC: DKey[] = ['qualification', 'qualificationMarks', 'currentCourse', 'courseLevel', 'institutionId', 'yearOfStudy']
const BANK: DKey[] = ['bankAccount', 'ifsc', 'bankName', 'aadhaarSeeded']
/** Rule fields the profile can't answer by itself; asked only if the scheme's rules use them. */
const RULE_QUESTIONS = ['destination', 'institutionType', 'researchStatus', 'studyLocation'] as const

function Verified({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-leaf-500/25 bg-leaf-50/50 px-3 py-2.5">
      <p className="flex items-center justify-between text-[12px] text-slate-500">{label}<span className="flex items-center gap-1 font-semibold text-leaf-700"><Lock size={11} />Verified</span></p>
      <p className="mt-0.5 text-[14.5px] font-semibold text-navy-950">{value}</p>
    </div>
  )
}

const NFST_PREFILL = { topic: 'Traditional water harvesting practices in the Chotanagpur plateau', supervisor: 'Dr. P. Soren', regDate: '2025-07-18', mode: 'Full-time' }

/** One entry point for both flows: mode 'new' is the 7-step application, mode 'renewal' is the renewal workflow (shares the document pipeline, confidence rules and UI kit). */
export default function ApplyWizard({ mode = 'new' }: { mode?: 'new' | 'renewal' } = {}) {
  return mode === 'renewal' ? <RenewalApplication /> : <NewApplication />
}
function NewApplication() {
  const { schemeId = 'nfst' } = useParams()
  const s = useStore()
  const scheme = schemeById(s.schemes, schemeId)
  if (!scheme) return <p className="text-slate-600">This scheme is not available. It may have been unpublished in the Scheme Builder.</p>
  return <Wizard key={schemeId} schemeId={schemeId} scheme={scheme} />
}

function Wizard({ schemeId, scheme }: { schemeId: string; scheme: Scheme }) {
  const s = useStore()
  const nav = useNavigate()
  const me = s.me
  const isDemo = !!me.isDemo
  const appId = useMemo(() => scheme ? `${scheme.code}-2026-${schemeId === 'nfst' && isDemo ? '10482' : Math.floor(10500 + Math.random() * 9000)}` : '', [schemeId]) // eslint-disable-line

  const fresh = (): Draft => ({
    schemeId, step: 0, income: Number(me.details.income) || 0,
    extra: schemeId === 'nfst' && isDemo ? { ...NFST_PREFILL } : Object.fromEntries((scheme.extraFields).map((f) => [f.key, f.type === 'select' ? f.options![0] : ''])),
    docs: {}, mismatch: 'none', details: {}, answers: {},
  })
  const [d, setD] = useState<Draft>(() => (s.draft && s.draft.schemeId === schemeId ? s.draft : fresh()))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState(false)
  const [stages, setStages] = useState<Record<string, number>>({})
  const [cross, setCross] = useState<'idle' | 'running' | 'done'>(d.mismatch !== 'none' ? 'done' : 'idle')
  const [savedFlash, setSavedFlash] = useState(false)
  const [consent, setConsent] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Autosave to store on every change
  useEffect(() => {
    if (d.step >= 6) { s.set(() => ({ draft: null })); return }
    const t = setTimeout(() => { s.set(() => ({ draft: { ...d, savedAt: now().slice(11) } })); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1200) }, 500)
    return () => clearTimeout(t)
  }, [d]) // eslint-disable-line


  const vaultFor = (k: DocType) => s.vault[k]
  const docOf = (k: DocType): DocumentRec | undefined => d.docs[k] ?? vaultFor(k)
  const requiredDocs = scheme.documents
  const allDocsIn = requiredDocs.every((r) => { const x = docOf(r.key); return x && x.status !== 'Not uploaded' && x.status !== 'Processing' })
  const anyBusy = Object.values(stages).some((v) => v >= 0 && v < PIPE_STAGES.length)
  const hasIncomeDoc = requiredDocs.some((r) => r.key === 'income_cert')

  // everything we know about the student: saved profile + what they typed in this application
  const det = { ...me.details, ...(d.details ?? {}) } as Record<DKey, string>
  const [aadhaarRaw, setAadhaarRaw] = useState('')
  const setDet = (k: DKey, v: string) => { setD((p) => ({ ...p, details: { ...(p.details ?? {}), [k]: v }, ...(k === 'income' ? { income: Number(v) || 0 } : {}) })); setErrors((e) => ({ ...e, [k]: '' })) }
  const ruleQs = RULE_QUESTIONS.filter((f) => scheme.rules.some((r) => r.field === f))
  const answers: Answers = { ...answersFor({ ...det, income: String(d.income) }, d.answers ?? {}) }
  const elig = evaluateScheme(scheme, answers)
  const firstName = (det.name ?? '').split(' ')[0]

  const upd = (patch: Partial<Draft>) => setD((p) => ({ ...p, ...patch }))

  const scanCount = useRef<Record<string, number>>({})
  const startScan = (key: DocType, replaceIncome?: number) => {
    const attempt = (scanCount.current[key] = (scanCount.current[key] ?? 0) + 1)
    const step = s.lowBandwidth ? 60 : 460
    setStages((p) => ({ ...p, [key]: 0 }))
    for (let i = 1; i <= PIPE_STAGES.length; i++) {
      timers.current.push(window.setTimeout(() => {
        setStages((p) => ({ ...p, [key]: i }))
        if (i === PIPE_STAGES.length) {
          const sample = SAMPLE_EXTRACT[key]
          const fields = { ...sample.fields }
          if (!isDemo) {
            // sample documents read back the applicant's own details (prototype OCR)
            Object.keys(fields).forEach((f) => { if (/^(Name|Scholar|Account holder)$/.test(f)) fields[f] = det.name ?? '' })
            if (fields.Tribe) fields.Tribe = det.tribe ?? ''
            if (fields.Institution) fields.Institution = instName(det.institutionId)
            if (fields.Course) fields.Course = det.currentCourse ?? ''
            if (fields.Programme) fields.Programme = det.currentCourse ?? ''
            if (fields.Degree) fields.Degree = det.qualification ?? ''
            if (fields.Percentage) fields.Percentage = `${det.qualificationMarks ?? ''}%`
            if (fields.Account) fields.Account = maskAcct(det.bankAccount)
            if (fields.IFSC) fields.IFSC = det.ifsc ?? ''
            if (fields['Certificate no.']) fields['Certificate no.'] = `${(det.state ?? 'XX').slice(0, 2).toUpperCase()}/ST/XXXX${(det.aadhaarLast4 ?? '00').slice(-2)}`
            if (fields['Annual family income']) fields['Annual family income'] = inr(d.income)
          }
          if (key === 'income_cert' && replaceIncome) fields['Annual family income'] = inr(replaceIncome)
          const label = requiredDocs.find((r) => r.key === key)!.label
          const lc = attempt === 1 && !replaceIncome ? LOW_CONF[key] : undefined
          setD((p) => ({ ...p, docs: { ...p.docs, [key]: { id: key, type: key, label, fileName: replaceIncome ? 'Income_Certificate_revised.pdf' : attempt > 1 ? sample.file.replace('.pdf', '_clear_scan.pdf') : sample.file,
            status: lc ? 'Officer review' : 'Verified by AI', confidence: lc ? lc.conf : sample.conf, extracted: fields,
            issue: lc ? `${lc.reason}. Confidence is below ${AI_CONF_THRESHOLD}%, so the AI will not accept it on its own — it will be verified manually by a MoTA official. You can continue, or replace it with a clearer scan.` : undefined } } }))
        }
      }, i * step))
    }
  }
  const uploadAll = () => requiredDocs.filter((r) => !docOf(r.key)).forEach((r, i) => timers.current.push(window.setTimeout(() => startScan(r.key), i * 250)))

  const certIncome = () => {
    const v = d.docs.income_cert?.extracted['Annual family income']
    return v ? Number(v.replace(/[^\d]/g, '')) : isDemo ? CERT_INCOME : d.income
  }

  const runCross = () => {
    setCross('running')
    timers.current.push(window.setTimeout(() => {
      setCross('done')
      if (hasIncomeDoc && certIncome() !== d.income) {
        upd({ mismatch: 'detected', docs: { ...d.docs, income_cert: { ...d.docs.income_cert!, status: 'Needs attention', issue: 'Income on certificate differs from the income entered in the application.' } } })
        if (!s.deficiencies.some((x) => x.applicationId === appId && x.status === 'Open')) {
          s.raiseDeficiency({ applicationId: appId, title: 'Income mismatch detected', reason: `Application says ${inr(d.income)}; the uploaded income certificate says ${inr(certIncome())}.`, field: 'Annual family income', docType: 'income_cert', raisedBy: 'AI-assisted pre-check (before submission)' })
          s.notify({ title: 'Your income certificate requires attention', body: 'The income on the certificate does not match your application. Fix one field — no need to restart.', channel: ['in-app', 'sms'], kind: 'action', audience: 'student' })
        }
      }
    }, s.lowBandwidth ? 50 : 1800))
  }
  useEffect(() => { if (d.step === 4 && allDocsIn && !anyBusy && cross === 'idle') runCross() }, [d.step, allDocsIn, anyBusy]) // eslint-disable-line

  const closeDeficiency = (how: string) => {
    s.deficiencies.filter((x) => x.applicationId === appId && x.status === 'Open').forEach((x) => s.resolveDeficiency(x.id))
    s.toast(how)
  }
  const fixInfo = () => {
    upd({ income: certIncome(), mismatch: 'fixed', docs: { ...d.docs, income_cert: { ...d.docs.income_cert!, status: 'Verified by AI', issue: undefined } } })
    closeDeficiency(`Income updated to ${inr(certIncome())} to match the certificate. Deficiency resolved.`)
  }
  const replaceDoc = () => {
    upd({ mismatch: 'replaced' })
    startScan('income_cert', d.income)
    closeDeficiency('Revised certificate uploaded and re-checked. Deficiency resolved.')
  }
  const sendOfficer = () => {
    upd({ mismatch: 'officer', docs: { ...d.docs, income_cert: { ...d.docs.income_cert!, status: 'Officer review', issue: 'Sent to the MoTA Super Admin with the applicant’s explanation.' } } })
    s.deficiencies.filter((x) => x.applicationId === appId && x.status === 'Open').forEach((x) => s.set((p) => ({ deficiencies: p.deficiencies.map((y) => y.id === x.id ? { ...y, status: 'With officer' } : y) })))
    s.toast('Marked for officer review. You can continue.', 'info')
  }

  const validate = (step: number) => {
    const e: Record<string, string> = {}
    if (step === 0) Object.assign(e, validateKeys(PERSONAL.filter((k) => !me.verified[k] || !det[k]), det))
    if (step === 1) {
      Object.assign(e, validateKeys([...ACADEMIC.filter((k) => !me.verified[k] || !det[k]), 'income'], { ...det, income: String(d.income || '') }))
      scheme.extraFields.forEach((f) => { if (!String(d.extra[f.key] ?? '').trim()) e[f.key] = `${f.label} is required for ${scheme.short}.` })
    }
    if (step === 3) {
      Object.assign(e, validateKeys(BANK.filter((k) => !me.verified[k] || !det[k]), det))
      if (!d.income || d.income < 1000) e.income = 'Enter annual family income.'
    }
    if (step === 4) {
      if (!allDocsIn) e.docs = 'Upload all mandatory documents to continue.'
      else if (d.mismatch === 'detected') e.docs = 'Resolve the flagged income mismatch, or send it for officer review, to continue.'
      else if (cross !== 'done') e.docs = 'Wait for the cross-document check to finish.'
    }
    if (step === 5 && !consent) e.consent = 'Confirm the declaration to submit.'
    setErrors(e)
    return Object.keys(e).length === 0
  }
  const go = (n: number) => { if (n > d.step && !validate(d.step)) return; setErrors({}); upd({ step: n }) }

  const submit = () => {
    if (!validate(5)) return
    const flags: Flag[] = d.mismatch !== 'none' ? [{
      id: 'fl-demo', type: 'Income mismatch', severity: d.mismatch === 'officer' ? 'medium' : 'low', confidence: 94, resolved: d.mismatch !== 'officer',
      explanation: d.mismatch === 'fixed' ? `Application originally said ₹2,40,000; certificate says ${inr(CERT_INCOME)}. Applicant corrected the form to match the certificate before submission. Income remains within the configured threshold.`
        : d.mismatch === 'replaced' ? 'Applicant replaced the income certificate with a revised one matching the application value (₹2,40,000). Officer may verify issuing authority.'
          : `Application says ${inr(d.income)} but certificate says ${inr(certIncome())}. Applicant chose officer review instead of editing.`,
    }] : []
    const lowDocs = requiredDocs.map((r) => docOf(r.key)).filter((x): x is DocumentRec => !!x && (x.confidence ?? 100) < AI_CONF_THRESHOLD)
    lowDocs.forEach((x) => flags.push({
      id: `lc-${x.type}`, type: 'Low AI confidence', severity: 'medium', confidence: x.confidence ?? 0, docType: x.type,
      explanation: `${x.label} was read with ${x.confidence}% confidence, below the ${AI_CONF_THRESHOLD}% threshold. ${LOW_CONF[x.type]?.reason ?? 'Parts of the document could not be read reliably'}. The AI did not accept it automatically — routed to a MoTA official for manual verification. No action needed from the applicant.`,
    }))
    const app: Application = {
      id: appId, studentId: s.demoStudentId, studentName: det.name, schemeId, institutionId: det.institutionId || 'inst1', state: det.state || 'Jharkhand', course: det.currentCourse || '',
      income: d.income, marks: Number(det.qualificationMarks) || 0, stage: 'Institution Verification', status: 'In Progress', submittedOn: now(), flags,
      history: [{ stage: 'Submitted', date: now() }, { stage: 'AI Document Check', date: now(), note: `${requiredDocs.length} documents read${d.mismatch !== 'none' ? ', 1 income flag ' + (flags[0].resolved ? 'resolved by applicant' : 'sent to officer') : ''}${lowDocs.length ? `, ${lowDocs.length} low-confidence document routed to MoTA official` : ''}${flags.length ? '' : ', no issues'}` }, { stage: 'Institution Verification', date: now() }],
      remarks: [], amount: schemeId === 'nfst' ? 444000 : schemeId === 'topclass' ? 200000 : schemeId === 'nos' ? 1500000 : 23400, gender: det.gender === 'Male' ? 'M' : 'F',
      priority: [...(det.gender === 'Female' ? ['Female applicant'] : []), ...(det.disability && det.disability !== 'None' ? ['Person with disability'] : []), ...(isDemo ? ['First-generation learner'] : [])], extra: d.extra,
    }
    // what the student typed is saved to their profile, so the next application is pre-filled
    s.updateStudent({ ...(d.details ?? {}), income: String(d.income) })
    s.set((p) => ({ applications: [app, ...p.applications.filter((a) => a.id !== appId)], demoAppId: isDemo ? appId : p.demoAppId, draft: null }))
    s.notify({ title: 'Your application has been submitted', body: `${scheme.short} application ${appId} submitted. It is now with your institution for verification.`, channel: ['in-app', 'sms', 'email'], kind: 'success', audience: 'student' })
    s.notify({ title: 'New application awaiting verification', body: `${appId} · ${det.name} · ${scheme.short}`, channel: ['in-app', 'email'], kind: 'action', audience: 'institution' })
    s.log('Application submitted', `${scheme.short} · ${requiredDocs.length} documents · AI pre-check ${flags.length ? 'with 1 flag' : 'clean'}`, appId, { user: det.name, role: s.assisted ? 'Student (via CSC operator)' : 'Student' })
    s.log('AI document check completed', `Classification, OCR and cross-document check. ${flags.length ? 'Income mismatch: ' + (flags[0].resolved ? 'resolved' : 'open for officer') : 'No issues'}`, appId, { user: 'System (AI Assist)', role: 'Automated' })
    if (lowDocs.length) {
      s.notify({ title: 'Low-confidence document routed for manual verification', body: `${appId} · ${lowDocs.map((x) => `${x.label} (${x.confidence}%)`).join(', ')}`, channel: ['in-app'], kind: 'action', audience: 'admin' })
      s.log('Routed to MoTA official', `${lowDocs.map((x) => `${x.label} ${x.confidence}%`).join(', ')} below ${AI_CONF_THRESHOLD}% threshold`, appId, { user: 'System (AI Assist)', role: 'Automated' })
    }
    upd({ step: 6 })
    s.toast('Application submitted')
  }

  const known = [...PERSONAL, ...ACADEMIC, ...BANK].filter((k) => me.details[k])
  const prefilledCount = known.length
  const missingCount = [...PERSONAL, ...ACADEMIC, ...BANK].length - prefilledCount

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2"><Badge color="gray">{scheme.code}</Badge><span className="text-xs tabular-nums text-slate-500">Application {appId}</span></div>
          <h1 className="mt-2 font-display text-2xl font-bold text-navy-950 sm:text-[28px]">{scheme.name}</h1>
        </div>
        {d.step < 6 && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500" aria-live="polite">
              {savedFlash ? <><Loader2 size={12} className="animate-spin" />Saving…</> : <><CheckCircle2 size={12} className="text-leaf-600" />Autosaved {s.draft?.savedAt ?? ''}</>}
            </span>
            <Button variant="outline" size="sm" icon={<Eye size={14} />} onClick={() => setPreview(true)}>Preview</Button>
            <Button variant="outline" size="sm" icon={<Save size={14} />} onClick={() => { s.set(() => ({ draft: { ...d, savedAt: now().slice(11) } })); s.toast('Draft saved. You can continue later from My Applications.') }}>Save draft</Button>
          </div>
        )}
      </div>

      {/* Stepper */}
      <Card className="mb-5 p-4">
        <ol className="flex items-center gap-1 overflow-x-auto">
          {STEPS.map((st, i) => (
            <li key={st} className="flex flex-1 items-center gap-2">
              <button onClick={() => i < d.step && d.step < 6 && go(i)} disabled={i > d.step || d.step === 6} className="flex items-center gap-2 disabled:cursor-default" aria-current={i === d.step ? 'step' : undefined}>
                <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition', i < d.step ? 'bg-leaf-600 text-white' : i === d.step ? 'bg-navy-900 text-white ring-4 ring-navy-100' : 'bg-navy-50 text-slate-500')}>{i < d.step ? <Check size={14} /> : i + 1}</span>
                <span className={cx('hidden whitespace-nowrap text-[13px] font-semibold md:inline', i === d.step ? 'text-navy-950' : 'text-slate-500')}>{st}</span>
              </button>
              {i < STEPS.length - 1 && <span className={cx('h-0.5 min-w-[12px] flex-1 rounded', i < d.step ? 'bg-leaf-500' : 'bg-navy-50')} />}
            </li>
          ))}
        </ol>
      </Card>

      {d.step < 3 && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-leaf-500/25 bg-leaf-50 px-4 py-3 text-sm text-leaf-700">
          <UserCheck size={18} className="shrink-0" />{missingCount === 0
            ? <span><b>Reusing your profile.</b> {prefilledCount} fields are already filled in — you only add what {scheme.short} needs.</span>
            : <span><b>{prefilledCount ? `${prefilledCount} fields come from your profile. ` : ''}Please fill in the remaining {missingCount} details.</b> They’re saved to your profile when you submit, so you won’t type them again.</span>}
        </div>
      )}
      {s.assisted && d.step === 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-saffron-400/40 bg-saffron-50 px-4 py-3 text-sm text-saffron-700"><Headset size={18} />Assisted application · CSC operator ID CSC-JH-20931 · student consent captured by OTP (prototype)</div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={d.step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
          {d.step === 0 && (
            <Card className="p-6">
              <h2 className="mb-1 font-display text-lg font-bold">Personal details{firstName ? ` · ${firstName}` : ''}</h2>
              <p className="mb-4 text-sm text-slate-600">Verified fields are locked. Anything else can be filled or corrected here.</p>
              <DetailsForm keys={PERSONAL} values={det} onChange={setDet} errors={errors} verified={me.verified} aadhaarRaw={aadhaarRaw} onAadhaarRaw={setAadhaarRaw} />
              <p className="mt-4 rounded-lg bg-navy-50 px-3 py-2 text-[12.5px] text-slate-600">Category: <b>Scheduled Tribe (ST)</b> — confirmed later from your ST certificate.</p>
            </Card>
          )}

          {d.step === 1 && (
            <Card className="p-6">
              <h2 className="mb-4 font-display text-lg font-bold">Academic & family details</h2>
              <DetailsForm keys={ACADEMIC} values={det} onChange={setDet} errors={errors} verified={me.verified} />
              <div className="mt-4 max-w-sm">
                <DetailsForm keys={['income']} values={{ ...det, income: d.income ? String(d.income) : '' }} onChange={setDet} errors={errors} cols={2} />
              </div>
              {ruleQs.length > 0 && (
                <div className="mt-6 rounded-xl border border-navy-100 p-5">
                  <p className="mb-3 text-sm font-semibold text-navy-900">A few questions {scheme.short}'s eligibility rules need</p>
                  <div className="grid gap-4 sm:grid-cols-2">{ruleQs.map((f) => (
                    <div key={f}><Label htmlFor={`rq-${f}`}>{FIELD_META[f].label}</Label>
                      <Select id={`rq-${f}`} options={FIELD_META[f].options!} value={(d.answers ?? {})[f] ?? String((answers as unknown as Record<string, string>)[f] ?? '')} onChange={(e) => upd({ answers: { ...(d.answers ?? {}), [f]: e.target.value } })} /></div>
                  ))}</div>
                </div>
              )}
              <div className="mt-6 rounded-xl border border-dashed border-violet-500/40 bg-violet-50/40 p-5">
                <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-violet-700"><Sparkles size={15} />Fields specific to {scheme.short} — configured in the Scheme Builder</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {scheme.extraFields.map((f) => (
                    <div key={f.key}>
                      <Label htmlFor={f.key}>{f.label}</Label>
                      {f.type === 'select' ? <Select id={f.key} options={f.options!} value={d.extra[f.key]} onChange={(e) => upd({ extra: { ...d.extra, [f.key]: e.target.value } })} />
                        : <Input id={f.key} type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'} placeholder={f.placeholder} value={d.extra[f.key] ?? ''} error={errors[f.key]} onChange={(e) => upd({ extra: { ...d.extra, [f.key]: e.target.value } })} />}
                    </div>
                  ))}
                  {scheme.extraFields.length === 0 && <p className="text-sm text-slate-500">This scheme needs no extra fields.</p>}
                </div>
              </div>
            </Card>
          )}

          {d.step === 2 && (
            <Card className="p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-bold">Eligibility check</h2><AIBadge label="Rule engine" /></div>
              <div className="grid gap-5 md:grid-cols-[1fr_220px]">
                <ul className="space-y-2.5">
                  {elig.results.map((r, k) => (
                    <motion.li key={r.rule.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.1 }} className={cx('flex items-start gap-3 rounded-lg border px-4 py-3 text-[14.5px]', r.pass ? 'border-leaf-500/25 bg-leaf-50/50' : 'border-saffron-400/50 bg-saffron-50')}>
                      <span className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-white', r.pass ? 'bg-leaf-600' : 'bg-saffron-500')}>{r.pass ? <Check size={12} /> : '!'}</span>{r.reason}
                    </motion.li>
                  ))}
                </ul>
                <div className="rounded-xl bg-navy-950 p-5 text-center text-white">
                  <p className="text-xs text-navy-100">Rules matched</p>
                  <p className="font-display text-5xl font-extrabold tabular-nums">{elig.results.filter((r) => r.pass).length}<span className="text-2xl text-navy-100">/{elig.results.length}</span></p>
                  <p className="mt-2 text-xs text-navy-100">{elig.verdict === 'match' ? 'You appear eligible. Confirmed after verification.' : 'One or more rules not met. You may still apply; an officer will decide.'}</p>
                </div>
              </div>
            </Card>
          )}

          {d.step === 3 && (
            <Card className="p-6">
              <h2 className="mb-4 font-display text-lg font-bold">Bank & income details</h2>
              <DetailsForm keys={BANK} values={det} onChange={setDet} errors={errors} verified={me.verified} />
              <div className="mt-6 max-w-sm">
                <Label htmlFor="inc" hint="(needs current-year certificate)">Annual family income (₹)</Label>
                <Input id="inc" type="number" value={d.income} error={errors.income} onChange={(e) => upd({ income: +e.target.value, mismatch: d.mismatch === 'detected' ? 'detected' : d.mismatch })} />
                <p className="mt-1.5 text-xs text-slate-500">{me.details.income ? `Pre-filled from your profile (${inr(Number(me.details.income))}). Update it if your income has changed.` : 'As entered in the previous step. It must match your income certificate.'}</p>
              </div>
              <p className="mt-5 flex items-center gap-2 text-xs text-slate-500"><Info size={13} />Bank account validated by penny-drop and Aadhaar seeding — PFMS/NPCI integration shown as prototype.</p>
            </Card>
          )}

          {d.step === 4 && (
            <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
              <Card className="p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div><h2 className="font-display text-lg font-bold">Documents for {scheme.short}</h2><p className="text-sm text-slate-600">Checklist generated from the scheme configuration.</p></div>
                  <Button size="sm" variant="saffron" icon={<Upload size={14} />} onClick={uploadAll} disabled={requiredDocs.every((r) => docOf(r.key)) || anyBusy}>Upload remaining (sample files)</Button>
                </div>
                <div className="space-y-3">
                  {requiredDocs.map((r) => (
                    <DocRow key={r.key} required={r} doc={docOf(r.key)} reused={!d.docs[r.key] && !!vaultFor(r.key)} busyStage={stages[r.key] ?? -1} onUpload={() => { setCross('idle'); startScan(r.key) }} />
                  ))}
                </div>
              </Card>

              <div className="space-y-4">
                <Card className="p-4 text-[13px]">
                  <p className="mb-1 flex items-center gap-2 font-semibold text-navy-950"><Info size={15} className="text-navy-700" />Confidence rule</p>
                  <p className="text-slate-600">Documents read at <b className="text-leaf-700">{AI_CONF_THRESHOLD}%+</b> confidence pass the AI pre-check. Anything lower is <b className="text-red-700">sent to a MoTA official</b> for manual verification — it never blocks you and is never auto-rejected.</p>
                </Card>
                <Card className="p-5">
                  <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 font-display font-bold"><GitCompareArrows size={17} className="text-violet-600" />Cross-document check</h3><AIBadge /></div>
                  {cross === 'idle' && <p className="text-sm text-slate-600">Runs automatically once all documents are read. It compares every document with each other and with your form.</p>}
                  {cross === 'running' && (
                    <ul className="space-y-2">
                      {['Name across 6 documents', 'Date of birth', 'Institution & course', 'Research registration date', 'Annual family income', 'Bank account holder'].map((c, i) => (
                        <motion.li key={c} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.25 }} className="flex items-center gap-2 text-sm text-slate-700"><Loader2 size={14} className="animate-spin text-violet-600" />Comparing {c.toLowerCase()}…</motion.li>
                      ))}
                    </ul>
                  )}
                  {cross === 'done' && (
                    <ul className="divide-y divide-navy-50 text-sm">
                      {[
                        ['Name', det.name, 'All documents', true],
                        ['Institution', instName(det.institutionId), 'Bonafide ↔ profile', true],
                        ...(schemeId === 'nfst' && isDemo ? [['PhD registration', '18 Jul 2025', 'Letter ↔ form', d.extra.regDate === '2025-07-18']] : []),
                        ...(hasIncomeDoc ? [['Annual income', `Form ${inr(d.income)} · Cert. ${inr(certIncome())}`, 'Certificate ↔ form', certIncome() === d.income]] : []),
                        ['Bank holder', det.name, 'Passbook ↔ profile', true],
                      ].map(([k, v, src, ok]) => (
                        <li key={k as string} className="flex items-start gap-2 py-2">
                          {ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-leaf-600" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-saffron-600" />}
                          <div className="flex-1"><p className="font-semibold text-navy-950">{k}</p><p className="text-xs text-slate-500">{src}</p></div>
                          <span className={cx('text-right text-[13px]', ok ? 'text-slate-700' : 'font-semibold text-saffron-700')}>{v}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <AnimatePresence>
                  {cross === 'done' && d.mismatch === 'detected' && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
                      <Card className="border-saffron-400 p-5 ring-4 ring-saffron-100">
                        <div className="flex items-start justify-between gap-2">
                          <p className="flex items-center gap-2 font-display text-lg font-bold text-saffron-700"><AlertTriangle size={19} />Potential mismatch detected</p>
                          <span className="rounded-full bg-navy-950 px-2.5 py-1 text-xs font-bold text-white">AI Confidence: 94%</span>
                        </div>
                        <p className="mt-2 text-[14.5px] text-navy-950">Income mentioned in the application differs from the uploaded income certificate.</p>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-white p-3 ring-1 ring-navy-100"><p className="text-xs text-slate-500">Income certificate</p><p className="font-display text-xl font-bold tabular-nums text-navy-950">{inr(certIncome())}</p><p className="text-[11px] text-slate-500">OCR · FY 2025-26</p></div>
                          <div className="rounded-lg bg-white p-3 ring-1 ring-saffron-400"><p className="text-xs text-slate-500">Application</p><p className="font-display text-xl font-bold tabular-nums text-saffron-700">{inr(d.income)}</p><p className="text-[11px] text-slate-500">Entered in step 4</p></div>
                        </div>
                        <p className="mt-3 text-xs text-slate-600">Why flagged: values differ by {inr(Math.abs(certIncome() - d.income))}. The certificate is the current-year document; the form value came from last year’s profile. Both values are within the configured threshold, so this does not change eligibility — but the record must be consistent.</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" icon={<Pencil size={14} />} onClick={fixInfo}>Fix Information</Button>
                          <Button size="sm" variant="outline" icon={<Upload size={14} />} onClick={replaceDoc}>Replace Document</Button>
                          <Button size="sm" variant="ghost" icon={<Send size={14} />} onClick={sendOfficer}>Send for Officer Review</Button>
                        </div>
                        <p className="mt-3 border-t border-navy-50 pt-3 text-[11.5px] text-slate-500">AI does not approve or reject applications. It highlights potential issues; an authorised officer takes the decision.</p>
                      </Card>
                    </motion.div>
                  )}
                  {cross === 'done' && d.mismatch !== 'detected' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="border-leaf-500/30 bg-leaf-50/60 p-5">
                        <p className="flex items-center gap-2 font-semibold text-leaf-700"><CheckCircle2 size={18} />{d.mismatch === 'officer' ? 'Ready — one item marked for officer review' : d.mismatch === 'none' ? 'All documents are consistent' : 'Mismatch resolved — records are consistent'}</p>
                        <p className="mt-1 text-sm text-slate-700">{d.mismatch === 'fixed' ? `Income updated to ${inr(d.income)}. Still within the configured threshold.` : d.mismatch === 'replaced' ? 'Revised certificate matches the application.' : d.mismatch === 'officer' ? 'The scrutiny officer will see your explanation and both values.' : 'No potential issues found.'}</p>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {d.step === 5 && (
            <Card className="p-6">
              <h2 className="mb-4 font-display text-lg font-bold">Review your application</h2>
              <ReviewSummary d={d} det={det} schemeName={scheme.name} docs={requiredDocs.map((r) => ({ label: r.label, status: docOf(r.key)?.status ?? '—' }))} extraFields={scheme.extraFields} />
              <label className="mt-6 flex items-start gap-3 rounded-lg bg-navy-50 p-4 text-sm">
                <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErrors({}) }} className="mt-0.5 h-4 w-4 accent-navy-900" />
                I declare that the information given is true. I understand that AI-assisted checks are advisory and that an authorised officer will decide on my application.
              </label>
              {errors.consent && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{errors.consent}</p>}
            </Card>
          )}

          {d.step === 6 && (
            <Card className="relative overflow-hidden p-10 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-leaf-600 text-white"><Check size={40} /></motion.div>
              <h2 className="mt-5 font-display text-3xl font-bold text-navy-950">Application submitted</h2>
              <p className="mx-auto mt-2 max-w-md text-slate-600">Application <b className="tabular-nums">{appId}</b> passed the AI pre-check and is now with <b>Birsa Institute of Research & Technology</b> for verification. You’ll get an SMS at every stage.</p>
              <div className="mt-4 flex justify-center gap-2"><Badge color="green">SMS sent (simulated)</Badge><Badge color="green">Email sent (simulated)</Badge></div>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button size="lg" onClick={() => nav(`/student/application/${appId}`)}>Track application</Button>
                <Button size="lg" variant="outline" onClick={() => nav('/student/dashboard')}>Go to dashboard</Button>
              </div>
              <PartyPopper className="decor absolute right-8 top-8 text-saffron-400" size={36} />
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {d.step < 6 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" icon={<ArrowLeft size={16} />} disabled={d.step === 0} onClick={() => go(d.step - 1)}>Back</Button>
          <div className="flex items-center gap-3">
            {errors.docs && <p role="alert" className="text-sm font-medium text-red-600">{errors.docs}</p>}
            {d.step < 5 ? <Button size="lg" onClick={() => go(d.step + 1)}>Next: {STEPS[d.step + 1]}<ArrowRight size={16} /></Button>
              : <Button size="lg" variant="saffron" icon={<Send size={16} />} onClick={submit}>Submit application</Button>}
          </div>
        </div>
      )}

      <Modal open={preview} onClose={() => setPreview(false)} title="Application preview" wide>
        <ReviewSummary d={d} det={det} schemeName={scheme.name} docs={requiredDocs.map((r) => ({ label: r.label, status: docOf(r.key)?.status ?? 'Not uploaded' }))} extraFields={scheme.extraFields} />
      </Modal>
    </div>
  )
}

function ReviewSummary({ d, det, schemeName, docs, extraFields }: { d: Draft; det: Record<string, string>; schemeName: string; docs: { label: string; status: string }[]; extraFields: { key: string; label: string }[] }) {
  const rows: [string, string][] = [
    ['Scheme', schemeName], ['Name', det.name ?? '—'], ['Date of birth', displayValue('dob', det.dob) || '—'], ['Course', det.currentCourse || '—'], ['Institution', instName(det.institutionId) || '—'],
    ['Annual family income', inr(d.income)], ['Bank account', `${maskAcct(det.bankAccount)} · ${det.ifsc ?? ''}`],
    ...extraFields.map((f) => [f.label, d.extra[f.key] || '—'] as [string, string]),
  ]
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <dl className="divide-y divide-navy-50 text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold text-navy-950">{v}</dd></div>)}</dl>
      <ul className="space-y-2 text-sm">{docs.map((x) => <li key={x.label} className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2"><span>{x.label}</span><Badge color={x.status === 'Verified by AI' ? 'green' : x.status === 'Officer review' ? 'amber' : 'gray'}>{x.status}</Badge></li>)}</ul>
    </div>
  )
}
