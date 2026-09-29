import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Upload, FileCheck2, ScanText, Sparkles, CheckCircle2, AlertTriangle, Loader2, FileSearch, Eye, ShieldCheck, Layers, ImageOff, CalendarX2, FileX2, FileQuestion, Files, GitCompareArrows, Lock } from 'lucide-react'
import { useStore } from '../../store/AppStore'
import { AI_CONF_THRESHOLD, now } from '../../lib/rules'
import { AIBadge, Badge, Button, Card, cx, Empty, Input, Label, Modal, PageHeader, StatusPill } from '../../components/ui'
import type { Deficiency, DocType, DocumentRec } from '../../types'

export const SAMPLE_EXTRACT: Record<DocType, { file: string; fields: Record<string, string>; conf: number }> = {
  st_cert: { file: 'ST_Certificate.pdf', conf: 98, fields: { Name: 'Anjali Munda', Tribe: 'Munda', 'Certificate no.': 'JH/RAN/ST/2019/00XX31', 'Issued by': 'Circle Officer, Ranchi Sadar' } },
  income_cert: { file: 'Income_Certificate_2025-26.pdf', conf: 94, fields: { Name: 'Anjali Munda', 'Annual family income': '₹3,20,000', 'Financial year': '2025-26', 'Issued by': 'Circle Officer, Ranchi Sadar', 'Valid till': '31 Mar 2027' } },
  marksheet: { file: 'Marksheet.pdf', conf: 96, fields: { Name: 'Anjali Munda', Result: 'First Division', Percentage: '78.4%' } },
  bonafide: { file: 'Bonafide_BIRT_Sep2026.pdf', conf: 95, fields: { Name: 'Anjali Munda', Institution: 'Birsa Institute of Research & Technology', Course: 'PhD (Full-time), Environmental Science', 'Issued on': '02 Sep 2026' } },
  bank: { file: 'Passbook.jpg', conf: 97, fields: { 'Account holder': 'Anjali Munda', Account: 'XXXXXXXX3390', IFSC: 'SBIN0XXXX12' } },
  progress_report: { file: 'Annual_Progress_Report_2025-26.pdf', conf: 93, fields: { Scholar: 'Anjali Munda', Period: '2025-26', Supervisor: 'Dr. P. Soren', Assessment: 'Satisfactory' } },
  research_reg: { file: 'PhD_Registration_Letter.pdf', conf: 93, fields: { Scholar: 'Anjali Munda', Programme: 'PhD, Environmental Science', 'Registration date': '18 Jul 2025', Supervisor: 'Dr. P. Soren' } },
  admission_letter: { file: 'Admission_Letter.pdf', conf: 92, fields: { Name: 'Anjali Munda', Programme: 'As per letter', 'Date of admission': '01 Aug 2026' } },
  passport: { file: 'Passport_front.jpg', conf: 90, fields: { Name: 'Anjali Munda', 'Passport no.': 'XXXXX4471', 'Valid till': '2034' } },
}

/** Sample documents that come back with low reading confidence on first upload (demo). */
export const LOW_CONF: Partial<Record<DocType, { conf: number; reason: string }>> = {
  research_reg: { conf: 76, reason: 'The university seal and registrar signature are partly faded, so the registration date could not be read reliably' },
}

/** Confidence bar with the auto-accept threshold marked. */
export function ConfMeter({ value, small }: { value: number; small?: boolean }) {
  const low = value < AI_CONF_THRESHOLD
  return (
    <div className={cx('flex items-center gap-2', small ? 'text-[11px]' : 'text-xs')}>
      <div className={cx('relative h-1.5 overflow-visible rounded-full bg-navy-50', small ? 'w-16' : 'w-24')} aria-hidden>
        <div className={cx('h-full rounded-full', low ? 'bg-red-500' : 'bg-leaf-500')} style={{ width: `${value}%` }} />
        <span className="absolute -top-1 h-3.5 w-0.5 bg-navy-900" style={{ left: `${AI_CONF_THRESHOLD}%` }} title={`Threshold ${AI_CONF_THRESHOLD}%`} />
      </div>
      <span className={cx('font-semibold tabular-nums', low ? 'text-red-600' : 'text-leaf-700')}>{value}%</span>
      {!small && <span className="text-slate-500">{low ? `below ${AI_CONF_THRESHOLD}% → MoTA official` : 'auto-accepted'}</span>}
    </div>
  )
}

export const PIPE_STAGES = [
  { t: 'Uploading securely', icon: Upload },
  { t: 'Classifying document type', icon: FileSearch },
  { t: 'Checking image quality', icon: Eye },
  { t: 'Reading text (OCR)', icon: ScanText },
  { t: 'Extracting fields', icon: Sparkles },
]

export type Problem = 'none' | 'blurry' | 'expired' | 'unreadable' | 'wrong' | 'missing' | 'inconsistent'
export const PROBLEMS: Record<Exclude<Problem, 'none'>, { t: string; icon: typeof ImageOff; stage: number; msg: string; fix: string; conf: number }> = {
  blurry: { t: 'Blurry document', icon: ImageOff, stage: 2, conf: 62, msg: 'The image is out of focus — sharpness score 0.31 (needs 0.6). The certificate number and seal cannot be read reliably.', fix: 'Retake the photo in good light, hold the phone steady and keep the whole page in frame.' },
  expired: { t: 'Expired document', icon: CalendarX2, stage: 4, conf: 97, msg: 'This income certificate was valid until 31 Mar 2025. The scheme needs a certificate valid on the application date.', fix: 'Upload a certificate issued for the current financial year.' },
  unreadable: { t: 'Unreadable text', icon: ScanText, stage: 3, conf: 48, msg: 'OCR could read only 22% of the text. Parts of the page appear to be covered or faded.', fix: 'Scan the original document, not a photocopy of a photocopy.' },
  wrong: { t: 'Wrong document type', icon: FileX2, stage: 1, conf: 95, msg: 'This looks like a caste certificate from another category, not an ST certificate. The document classifier matched “OBC Certificate” at 95%.', fix: 'Upload the ST certificate issued by the competent authority.' },
  missing: { t: 'Missing page', icon: Files, stage: 3, conf: 90, msg: 'The marksheet shows “Page 1 of 2”, but only one page was uploaded. Subject-wise marks are on page 2.', fix: 'Upload both pages as one PDF, or add the second page.' },
  inconsistent: { t: 'Inconsistent information', icon: GitCompareArrows, stage: 4, conf: 86, msg: 'Name on this document reads “Anjli Munda”, which differs from your verified profile “Anjali Munda”.', fix: 'If this is a spelling variant, keep it and explain; otherwise get a corrected document.' },
}

export function ScanPreview({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md border border-navy-100 bg-white p-2 shadow-sm" aria-hidden>
      <div className="mb-1.5 h-2 w-8 rounded bg-navy-900/80" />
      {[...Array(7)].map((_, k) => <div key={k} className="mb-1 h-1 rounded bg-slate-200" style={{ width: `${45 + ((k * 29) % 50)}%` }} />)}
      <div className="absolute bottom-2 right-2 h-4 w-4 rounded-full border border-saffron-500/60" />
      {active && <motion.div className="scan-line absolute left-0 right-0 h-8" animate={{ top: ['-30%', '100%'] }} transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }} />}
      <span className="sr-only">{label}</span>
    </div>
  )
}

/** Runs the simulated AI pipeline for one document and reports the outcome. */
export function useScan() {
  const { lowBandwidth } = useStore()
  const [stage, setStage] = useState(-1)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const run = (stopAt = PIPE_STAGES.length, done: () => void) => {
    timers.current.forEach(clearTimeout)
    const step = lowBandwidth ? 60 : 480
    for (let i = 0; i <= stopAt; i++) timers.current.push(window.setTimeout(() => { setStage(i); if (i === stopAt) done() }, i * step))
  }
  return { stage, run, setStage }
}

export function DocRow({ doc, required, onUpload, busyStage, reused }: { doc?: DocumentRec; required: { key: DocType; label: string; mandatory: boolean }; onUpload: (file?: File) => void; busyStage: number; reused?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const processing = busyStage >= 0 && busyStage < PIPE_STAGES.length
  const status = processing ? 'Processing' : doc?.status ?? 'Not uploaded'
  return (
    <div className={cx('rounded-xl border p-4 transition-colors', status === 'Needs attention' ? 'border-saffron-400 bg-saffron-50/40' : status === 'Verified by AI' ? 'border-leaf-500/30 bg-white' : 'border-navy-100 bg-white')}>
      <div className="flex gap-4">
        <ScanPreview active={processing} label={required.label} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-navy-950">{required.label}</p>
            {required.mandatory && <span className="text-xs text-slate-500">Mandatory</span>}
            {reused && <Badge color="green"><Lock size={11} />From verified profile</Badge>}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{doc?.fileName ?? 'PDF, JPG or PNG · up to 2 MB'}</p>
          {processing ? (
            <ol className="mt-2.5 space-y-1">
              {PIPE_STAGES.map((p, i) => (
                <li key={p.t} className={cx('flex items-center gap-2 text-[13px]', i < busyStage ? 'text-leaf-700' : i === busyStage ? 'font-semibold text-navy-950' : 'text-slate-400')}>
                  {i < busyStage ? <CheckCircle2 size={14} /> : i === busyStage ? <Loader2 size={14} className="animate-spin" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />}
                  {p.t}{i === 1 && i < busyStage && <span className="font-normal text-slate-500">— {required.label}</span>}
                </li>
              ))}
            </ol>
          ) : doc && doc.status !== 'Not uploaded' ? (
            <div className="mt-2">
              <div className="flex flex-wrap items-center gap-2"><StatusPill s={doc.confidence && doc.confidence < AI_CONF_THRESHOLD ? 'Routed to MoTA official' : doc.status} />{doc.confidence && <ConfMeter value={doc.confidence} />}</div>
              {doc.issue && <p className="mt-2 flex gap-1.5 text-[13px] text-saffron-700"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{doc.issue}</p>}
              <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-0.5 text-[12.5px] sm:grid-cols-2">
                {Object.entries(doc.extracted).map(([k, v]) => <div key={k} className="flex gap-1.5"><dt className="text-slate-500">{k}:</dt><dd className="truncate font-medium text-navy-950">{v}</dd></div>)}
              </dl>
            </div>
          ) : null}
        </div>
        {!processing && !reused && (
          <div className="shrink-0">
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} aria-label={`Upload ${required.label}`} />
            <Button size="sm" variant={doc && doc.status !== 'Not uploaded' ? 'outline' : 'primary'} icon={<Upload size={14} />} onClick={() => onUpload()}>{doc && doc.status !== 'Not uploaded' ? 'Replace' : 'Upload'}</Button>
            <button onClick={() => inputRef.current?.click()} className="mt-1 block w-full text-center text-[11px] text-slate-500 underline">choose own file</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function ResolveModal({ d, onClose }: { d: Deficiency | null; onClose: () => void }) {
  const s = useStore()
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<'info' | 'doc'>('doc')
  const [val, setVal] = useState('')
  const [scan, setScan] = useState<'idle' | 'run' | 'ok'>('idle')
  const close = () => { setStep(0); setScan('idle'); setVal(''); onClose() }
  if (!d) return null
  const app = s.applications.find((a) => a.id === d.applicationId)
  const doScan = () => { setScan('run'); setTimeout(() => setScan('ok'), s.lowBandwidth ? 50 : 1800) }
  const resubmit = () => {
    s.resolveDeficiency(d.id)
    if (app) {
      if (app.status === 'Correction Requested') s.updateApp(app.id, { status: 'In Progress', history: app.history.map((h) => h.stage === app.stage ? { ...h, note: `Correction submitted by applicant on ${now()} — back with officer` } : h) })
      s.setFlags(app.id, (f) => f.map((x) => x.type === 'Low AI confidence' ? x : { ...x, resolved: true }))
    }
    s.notify({ title: 'Correction submitted', body: `Deficiency ${d.id} resolved. Your application is back with the officer.`, channel: ['in-app', 'sms'], kind: 'success', audience: 'student' })
    s.notify({ title: `Correction received · ${d.applicationId}`, body: d.title, channel: ['in-app'], kind: 'info', audience: 'admin' })
    s.log('Deficiency resolved', `${d.id}: ${mode === 'doc' ? 'document replaced' : 'information corrected'}`, d.applicationId, { user: s.actorName, role: 'Student' })
    s.toast('Correction resubmitted — no need to restart your application')
    close()
  }
  const steps = ['Understand the issue', 'Choose a fix', mode === 'doc' ? 'Replace document' : 'Correct information', 'Resubmit']
  return (
    <Modal open={!!d} onClose={close} title="Resolve deficiency" wide>
      <ol className="mb-5 flex gap-2">{steps.map((x, i) => <li key={x} className={cx('flex-1 rounded-full py-1 text-center text-[11px] font-semibold', i <= step ? 'bg-navy-900 text-white' : 'bg-navy-50 text-slate-500')}>{i + 1}. {x}</li>)}</ol>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
          {step === 0 && (
            <div>
              <p className="font-display text-lg font-bold text-navy-950">{d.title}</p>
              <p className="mt-2 text-[14.5px] text-slate-700">{d.reason}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">Raised by</dt><dd className="font-semibold">{d.raisedBy}</dd></div><div><dt className="text-xs text-slate-500">Application</dt><dd className="font-semibold tabular-nums">{d.applicationId}</dd></div></dl>
              <p className="mt-4 rounded-lg bg-leaf-50 px-3 py-2 text-sm text-leaf-700">Only this item needs fixing. Everything else in your application stays as it is.</p>
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[{ m: 'doc' as const, t: 'Replace the document', dsc: 'Upload a corrected or current document.', i: Upload }, { m: 'info' as const, t: 'Correct the information', dsc: 'Edit the value in your form to match your document.', i: FileCheck2 }].map((o) => (
                <button key={o.m} onClick={() => setMode(o.m)} className={cx('rounded-xl border-2 p-4 text-left', mode === o.m ? 'border-navy-900 bg-navy-50' : 'border-navy-100')}>
                  <o.i size={20} className="text-saffron-600" /><p className="mt-2 font-semibold text-navy-950">{o.t}</p><p className="text-sm text-slate-600">{o.dsc}</p>
                </button>
              ))}
            </div>
          )}
          {step === 2 && mode === 'doc' && (
            <div className="flex gap-4">
              <ScanPreview active={scan === 'run'} label="replacement" />
              <div className="flex-1">
                {scan === 'idle' && <Button icon={<Upload size={16} />} onClick={doScan}>Upload replacement (sample)</Button>}
                {scan === 'run' && <p className="flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" />Classifying, reading and cross-checking…</p>}
                {scan === 'ok' && <div className="rounded-lg bg-leaf-50 p-3 text-sm text-leaf-700"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={16} />New document reads correctly</p><p className="mt-1 text-slate-700">Valid till 31 Mar 2027 · details consistent with your application</p><div className="mt-2"><ConfMeter value={95} /></div></div>}
              </div>
            </div>
          )}
          {step === 2 && mode === 'info' && (
            <div className="max-w-sm"><Label htmlFor="fixv">{d.field ?? 'Corrected value'}</Label><Input id="fixv" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Enter corrected value" /><p className="mt-1.5 text-xs text-slate-500">It will be re-checked against your documents.</p></div>
          )}
          {step === 3 && (
            <div className="rounded-xl bg-navy-50 p-4 text-sm"><p className="font-semibold text-navy-950">Ready to resubmit</p><p className="mt-1 text-slate-600">Your correction goes straight back to {d.raisedBy.split('(')[0].trim()}. You’ll be notified by SMS.</p></div>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="mt-6 flex justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        {step < 3 ? <Button disabled={step === 2 && ((mode === 'doc' && scan !== 'ok') || (mode === 'info' && !val.trim()))} onClick={() => setStep(step + 1)}>Continue</Button>
          : <Button variant="saffron" onClick={resubmit}>Resolve Deficiency & resubmit</Button>}
      </div>
    </Modal>
  )
}

/** Documents & Deficiencies — one place for everything about your papers. */
export function DocumentsPage() {
  const s = useStore()
  const [lab, setLab] = useState<Problem>('none')
  const [result, setResult] = useState<Exclude<Problem, 'none'> | null>(null)
  const [sel, setSel] = useState<Deficiency | null>(null)
  const scan = useScan()
  const vault = Object.values(s.vault)
  const mineIds = new Set(s.applications.filter((a) => a.studentId === s.demoStudentId).map((a) => a.id).concat(s.isDemoStudent ? [s.demoAppId ?? 'NFST-2026-10482'] : []))
  const defs = s.deficiencies.filter((d) => mineIds.has(d.applicationId))
  const openDefs = defs.filter((d) => d.status === 'Open')
  // Documents inside submitted applications that were routed to an official because of low confidence
  const routed = s.applications.filter((a) => mineIds.has(a.id)).flatMap((a) => a.flags.filter((f) => f.type === 'Low AI confidence').map((f) => ({ a, f })))

  const runLab = (p: Exclude<Problem, 'none'>) => {
    setLab(p); setResult(null)
    scan.run(PROBLEMS[p].stage, () => setResult(p))
  }

  return (
    <div>
      <PageHeader title="Documents & Deficiencies" sub="Your document vault, AI reading confidence, and anything that needs fixing — in one place. Officers make every final decision."
        actions={<><AIBadge label="AI-assisted review" />{openDefs.length > 0 && <Badge color="red">{openDefs.length} to resolve</Badge>}</>} />

      {/* How confidence routing works */}
      <Card className="mb-5 grid gap-4 p-5 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</p><p className="font-semibold text-navy-950">AI reads your document</p><p className="text-[13px] text-slate-600">Every field gets a reading-confidence score.</p></div>
        <span className="hidden text-2xl text-slate-300 md:block">→</span>
        <div className="rounded-xl bg-leaf-50 p-3"><p className="font-semibold text-leaf-700">{AI_CONF_THRESHOLD}% or higher</p><p className="text-[13px] text-slate-700">Accepted by AI pre-check, then verified as usual by your institution and officer.</p></div>
        <span className="hidden text-2xl text-slate-300 md:block">/</span>
        <div className="rounded-xl bg-red-50 p-3"><p className="font-semibold text-red-700">Below {AI_CONF_THRESHOLD}%</p><p className="text-[13px] text-slate-700">Never auto-accepted. Sent to a <b>MoTA official</b> for manual verification — you don’t need to do anything.</p></div>
      </Card>

      {/* Deficiencies */}
      <Card className="mb-5 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy-950"><AlertTriangle size={18} className={openDefs.length ? 'text-saffron-600' : 'text-leaf-600'} />Deficiencies</h2>
          <p className="text-[13px] text-slate-500">Fix only the item flagged — you never restart the application.</p>
        </div>
        {defs.length === 0 && routed.length === 0 ? <Empty title="No deficiencies" body="When an AI check or an officer finds something to correct, it appears here with clear steps." /> : (
          <ul className="space-y-2.5">
            {defs.map((d) => (
              <li key={d.id} className={cx('flex flex-wrap items-start gap-3 rounded-xl border p-4', d.status === 'Open' ? 'border-saffron-400 bg-saffron-50/40' : 'border-navy-100')}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-navy-950">{d.title}</p><StatusPill s={d.status} /></div>
                  <p className="mt-1 text-[13.5px] text-slate-700">{d.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">{d.id} · {d.applicationId} · raised by {d.raisedBy} · {d.raisedOn}</p>
                </div>
                {d.status === 'Open' && <Button variant="saffron" onClick={() => setSel(d)}>Resolve Deficiency</Button>}
              </li>
            ))}
            {routed.map(({ a, f }) => (
              <li key={a.id + f.id} className={cx('flex flex-wrap items-start gap-3 rounded-xl border p-4', f.resolved ? 'border-leaf-500/30 bg-leaf-50/40' : 'border-navy-100 bg-navy-50/50')}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-navy-950">Low reading confidence · {s.schemes.find((x) => x.id === a.schemeId)?.documents.find((x) => x.key === f.docType)?.label ?? 'Document'}</p><StatusPill s={f.resolved ? 'Verified by MoTA official' : 'Routed to MoTA official'} /></div>
                  <p className="mt-1 text-[13.5px] text-slate-700">{f.resolved ? `Manually verified${f.resolvedBy ? ' by ' + f.resolvedBy : ''}. No further action.` : 'A MoTA official is checking this document manually. No action is needed from you — you may replace it with a clearer scan to speed things up.'}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500"><span>{a.id}</span><ConfMeter value={f.confidence} small /></div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold"><ShieldCheck size={18} className="text-leaf-600" />Document vault</h2>
          <p className="mb-4 text-sm text-slate-600">Encrypted at rest (prototype) · reused across schemes · visible only to your institution and assigned officers.</p>
          <div className="space-y-3">
            {vault.map((d) => (
              <div key={d.id} className="flex items-start gap-3 rounded-lg border border-navy-100 p-3">
                <FileCheck2 className="mt-0.5 text-leaf-600" size={20} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-navy-950">{d.label}</p><StatusPill s={d.status} /></div>
                  <p className="truncate text-xs text-slate-500">{d.fileName}</p>
                  {d.confidence && <div className="mt-1"><ConfMeter value={d.confidence} /></div>}
                  <p className="mt-1 text-[12.5px] text-slate-600">{Object.entries(d.extracted).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold"><Layers size={18} className="text-violet-600" />Document quality check</h2>
          <p className="mb-4 text-sm text-slate-600">See how the AI explains common problems — and when it hands a document to a MoTA official instead. Pick a scenario to simulate.</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PROBLEMS) as Exclude<Problem, 'none'>[]).map((p) => {
              const P = PROBLEMS[p]
              return (
                <button key={p} onClick={() => runLab(p)} className={cx('flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] font-semibold', lab === p ? 'border-navy-900 bg-navy-50 text-navy-950' : 'border-navy-100 text-navy-800 hover:bg-navy-50')}>
                  <P.icon size={16} className="shrink-0 text-saffron-600" /><span className="flex-1">{P.t}</span>{P.conf < AI_CONF_THRESHOLD && <span className="h-2 w-2 rounded-full bg-red-500" title="Low confidence" />}
                </button>
              )
            })}
          </div>
          <AnimatePresence mode="wait">
            {lab !== 'none' && (
              <motion.div key={lab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 rounded-xl border border-navy-100 p-4">
                <div className="flex gap-4">
                  <ScanPreview active={!result} label="sample" />
                  <ol className="flex-1 space-y-1">
                    {PIPE_STAGES.map((st, i) => {
                      const failedHere = result && i === PROBLEMS[lab].stage
                      const done = scan.stage > i || (result && i < PROBLEMS[lab].stage)
                      return (
                        <li key={st.t} className={cx('flex items-center gap-2 text-[13px]', failedHere ? 'font-semibold text-saffron-700' : done ? 'text-leaf-700' : scan.stage === i ? 'font-semibold text-navy-950' : 'text-slate-400')}>
                          {failedHere ? <AlertTriangle size={14} /> : done ? <CheckCircle2 size={14} /> : scan.stage === i ? <Loader2 size={14} className="animate-spin" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />}{st.t}
                        </li>
                      )
                    })}
                  </ol>
                </div>
                {result && (() => {
                  const P = PROBLEMS[result]
                  const low = P.conf < AI_CONF_THRESHOLD
                  return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cx('mt-4 rounded-lg p-4', low ? 'bg-red-50' : 'bg-saffron-50')}>
                      <div className="flex flex-wrap items-center justify-between gap-2"><p className={cx('flex items-center gap-2 font-semibold', low ? 'text-red-700' : 'text-saffron-700')}><AlertTriangle size={16} />{low ? 'Low confidence' : 'Potential issue'}: {P.t}</p><ConfMeter value={P.conf} small /></div>
                      <p className="mt-2 text-[13.5px] text-navy-950">{P.msg}</p>
                      {low
                        ? <p className="mt-2 rounded-md bg-white/70 px-3 py-2 text-[13px] text-slate-700"><b>Routed to a MoTA official.</b> Because the AI is less than {AI_CONF_THRESHOLD}% sure, it will not accept or reject this itself — a person verifies it. Tip: {P.fix}</p>
                        : <p className="mt-2 text-[13px] text-slate-700"><b>How to fix:</b> {P.fix}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => { s.toast('Upload a replacement from your application’s document step', 'info') }}>Replace document</Button>
                        {low ? <Badge color="navy">Queued for MoTA official automatically</Badge> : <Button size="sm" variant="outline" onClick={() => s.toast('Sent for officer review with your note', 'info')}>Send for officer review</Button>}
                      </div>
                    </motion.div>
                  )
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
      <ResolveModal d={sel} onClose={() => setSel(null)} />
    </div>
  )
}
