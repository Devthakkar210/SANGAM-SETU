import type { DocType, RenewalDoc, RenewalData, VerificationSignal } from '../types'
import { AI_CONF_THRESHOLD, inr, verificationDecision } from './rules'

export const ACCEPTED_EXT = ['pdf', 'jpg', 'jpeg', 'png']
export const MAX_FILE_MB = 2

export const TYPE_LABEL: Record<DocType, string> = {
  marksheet: 'Academic Marksheet', income_cert: 'Income Certificate', bonafide: 'Bonafide / Enrolment Certificate', bank: 'Bank Passbook / Cheque',
  progress_report: 'Research Progress Report', st_cert: 'ST Certificate', research_reg: 'PhD Registration Letter', admission_letter: 'Admission Letter', passport: 'Passport',
}
const KEYWORDS: Partial<Record<DocType, RegExp>> = {
  marksheet: /mark|grade|result|transcript|semester/i, income_cert: /income/i, bonafide: /bonafide|enrol|study[_ -]?cert/i,
  bank: /bank|passbook|cheque|check/i, progress_report: /progress|annual[_ -]?report/i, st_cert: /caste|tribe|st[_ -]?cert/i,
  research_reg: /registration|phd[_ -]?reg/i, admission_letter: /admission|offer/i, passport: /passport/i,
}
export const SAMPLE_FILE: Partial<Record<DocType, string>> = {
  marksheet: 'Marksheet_PhD_Year2_2025-26.pdf', income_cert: 'Income_Certificate_2026-27.pdf', bonafide: 'Bonafide_Certificate_2026-27.pdf',
  progress_report: 'Annual_Progress_Report_2025-26.pdf', bank: 'Bank_Passbook_photo.jpg',
}

/** Step 1 of the pipeline: file validation (type & size). */
export function validateFile(name: string, sizeBytes: number): string | null {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (!ACCEPTED_EXT.includes(ext)) return `“${name}” is a .${ext || '?'} file. Supported: PDF, JPG, JPEG, PNG.`
  if (sizeBytes > MAX_FILE_MB * 1024 * 1024) return `“${name}” is ${(sizeBytes / 1048576).toFixed(1)} MB. The limit is ${MAX_FILE_MB} MB — SetuSakha (Grievance) can compress it for you.`
  return null
}

/** Step 2: document classification. In the prototype the type is inferred from the file name / demo choice. */
export function classify(expected: DocType, fileName: string): { detected: DocType; conf: number } {
  const own = KEYWORDS[expected]
  if (own?.test(fileName)) return { detected: expected, conf: 98 }
  const other = (Object.keys(KEYWORDS) as DocType[]).find((k) => k !== expected && KEYWORDS[k]!.test(fileName))
  if (other) return { detected: other, conf: 95 }
  return { detected: expected, conf: 92 }
}

export interface RenewalContext {
  name: string
  institution: string
  academicYear: string
  cgpa: string
  income: number
  supervisor: string
  bankChanged: boolean
}

const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)

/**
 * Steps 3–8: OCR, field extraction, field matching against the renewal form, validity checks, confidence calculation
 * and the verification decision. Overall confidence combines several signals — OCR alone never decides.
 */
export function verifyRenewalDoc(doc: RenewalDoc, fileName: string, ctx: RenewalContext): RenewalDoc {
  const attempts = doc.attempts + 1
  const cls = classify(doc.key, fileName)
  if (cls.detected !== doc.key) {
    return { ...doc, attempts, fileName, detected: TYPE_LABEL[cls.detected], status: 'REJECTED', overall: undefined, critical: ['Wrong document type'],
      signals: [{ label: 'Document classification', score: cls.conf }, { label: `Matches “${TYPE_LABEL[doc.key]}”`, score: 0, critical: true }],
      reason: `Expected ${doc.label}, but the AI detected ${TYPE_LABEL[cls.detected]}.`, fields: undefined }
  }
  const retry = attempts > 1
  const s: VerificationSignal[] = [{ label: 'Document classification', score: cls.conf }]
  const critical: string[] = []
  let fields: Record<string, string> = {}
  let weakReason = ''
  const push = (label: string, score: number, isCritical = false, msg?: string) => { s.push({ label, score, critical: isCritical }); if (isCritical && msg) critical.push(msg) }

  switch (doc.key) {
    case 'marksheet': {
      fields = { Name: ctx.name, Institution: 'Birsa Institute of Research & Technology', 'Academic year': '2025-26 (Year 2)', CGPA: '8.2', Result: 'Passed' }
      push('OCR quality', 96); push('Field extraction', 95); push('Name match', 98)
      const instOk = ctx.institution === fields.Institution
      push('Institution match', instOk ? 97 : 35, !instOk, `Institution on marksheet (${fields.Institution}) differs from current institution in the form (${ctx.institution})`)
      push('Academic year match', 100)
      const cgOk = Math.abs(Number(ctx.cgpa) - 8.2) < 0.05
      push('CGPA matches form', cgOk ? 100 : 40, !cgOk, `CGPA on marksheet (8.2) differs from the form (${ctx.cgpa})`)
      push('Required fields complete', 100)
      break
    }
    case 'income_cert': {
      fields = { Name: ctx.name, 'Annual family income': inr(270000), 'Financial year': '2025-26', 'Issued on': '12 Apr 2026', 'Valid till': '31 Mar 2027' }
      push('OCR quality', 95); push('Field extraction', 94); push('Name match', 99)
      const incOk = ctx.income === 270000
      push('Income matches form', incOk ? 98 : 38, !incOk, `Income on certificate (${inr(270000)}) differs from the form (${inr(ctx.income)})`)
      push('Document validity', 100); push('Required fields complete', 100)
      break
    }
    case 'bonafide': {
      fields = { Name: ctx.name, Institution: 'Birsa Institute of Research & Technology', Course: 'PhD (Full-time), Year 3', Session: ctx.academicYear, 'Issued on': '05 Sep 2026' }
      push('OCR quality', 97); push('Field extraction', 96); push('Name match', 99)
      const instOk = ctx.institution === fields.Institution
      push('Institution match', instOk ? 98 : 30, !instOk, `Bonafide is from ${fields.Institution}, but the form says ${ctx.institution}`)
      push('Session / academic year', 100); push('Document validity', 100)
      break
    }
    case 'progress_report': {
      fields = { Scholar: ctx.name, Period: '2025-26', Supervisor: 'Dr. P. Soren', Assessment: 'Satisfactory', 'Supervisor signature': 'Detected' }
      push('OCR quality', 94); push('Field extraction', 92); push('Name match', 98)
      const supOk = ctx.supervisor.trim().toLowerCase() === 'dr. p. soren'
      push('Supervisor match', supOk ? 97 : 45, !supOk, `Supervisor on report (Dr. P. Soren) differs from the form (${ctx.supervisor})`)
      push('Signature detected', 93); push('Required fields complete', 100)
      break
    }
    case 'bank': {
      fields = { 'Account holder': retry ? ctx.name : 'Anjali M… (partly covered by stamp)', Account: 'XXXXXXXX3390', IFSC: 'SBIN0XXXX12', Bank: 'State Bank of India' }
      push('OCR quality', retry ? 95 : 72); push('Field extraction', retry ? 96 : 84); push('Account holder name match', retry ? 97 : 82)
      push('Account matches profile', ctx.bankChanged ? 92 : 100); push('Required fields complete', 100)
      if (!retry) weakReason = 'The account holder name is partly covered by a bank stamp, so the AI could not confirm it reliably.'
      break
    }
    default: {
      fields = { Name: ctx.name }
      push('OCR quality', 94); push('Name match', 97); push('Required fields complete', 100)
    }
  }
  const overall = avg(s.map((x) => x.score))
  const fieldsOk = Object.values(fields).every(Boolean)
  const decision = verificationDecision({ overall, typeOk: true, fieldsOk, critical })
  const reason = decision === 'VERIFIED' ? undefined
    : critical.length ? `Critical mismatch: ${critical.join('; ')}.`
      : weakReason || `Overall confidence ${overall}% is below the ${AI_CONF_THRESHOLD}% automatic-verification threshold.`
  return { ...doc, attempts, fileName, detected: TYPE_LABEL[doc.key], status: decision, overall, signals: s, critical, reason, fields }
}

/** Summary counts used by the report, the dashboard and the admin view. */
export function summarise(docs: RenewalDoc[]) {
  const auto = docs.filter((d) => d.status === 'VERIFIED' || d.status === 'FINAL_VERIFIED').length
  const review = docs.filter((d) => d.status === 'HUMAN_REVIEW').length
  const deficiencies = docs.filter((d) => d.status === 'DEFICIENCY' || d.status === 'REJECTED').length
  return { required: docs.length, auto, review, deficiencies, overall: (review || deficiencies ? 'PENDING HUMAN REVIEW' : 'PASSED') as 'PASSED' | 'PENDING HUMAN REVIEW' }
}

const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/** Printable, self-contained HTML report (open in a browser → Print → Save as PDF). */
export function buildRenewalReportHtml(o: { applicationId: string; previousId: string; studentId: string; renewalYear: string; previousYear: string; schemeName: string; schemeCode: string; data: RenewalData; generatedAt: string }) {
  const sum = summarise(o.data.docs)
  const f = (label: string) => o.data.fields.find((x) => x.label === label)?.current ?? '—'
  const st = (label: string) => o.data.stable.find((x) => x.label === label)?.value ?? '—'
  const row = (k: string, v: string) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`
  const docsRows = o.data.docs.map((d) => `<tr><td>${esc(d.label)}</td><td class="n">${d.overall != null ? d.overall + '%' : '—'}</td><td><span class="pill ${d.status === 'VERIFIED' || d.status === 'FINAL_VERIFIED' ? 'ok' : d.status === 'HUMAN_REVIEW' ? 'rev' : 'bad'}">${d.status.replace('_', ' ')}</span></td></tr>`).join('')
  const changed = o.data.fields.filter((x) => x.previous !== x.current).map((x) => `<tr><td>${esc(x.label)}</td><td>${esc(x.previous)}</td><td><b>${esc(x.current)}</b></td></tr>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>Renewal Verification Report · ${esc(o.applicationId)}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;color:#0A1433;max-width:820px;margin:32px auto;padding:0 24px}h1{font-size:22px;margin:0}h2{font-size:15px;margin:24px 0 8px;color:#34499A;text-transform:uppercase;letter-spacing:.04em}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #E4E8F5;vertical-align:top}th{width:38%;color:#475569;font-weight:600}.n{text-align:right}
.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #F08A24;padding-bottom:12px}.muted{color:#64748B;font-size:12px}.pill{padding:2px 8px;border-radius:99px;font-size:12px;font-weight:600}
.ok{background:#E8F5EE;color:#1F7A52}.rev{background:#FEF3E6;color:#B45309}.bad{background:#FDECEC;color:#B91C1C}.overall{margin-top:16px;padding:14px;border-radius:10px;font-weight:700;font-size:16px}
@media print{body{margin:0}}</style></head><body>
<div class="head"><div><div class="muted">SANGAM Setu · Scholarship And NFST/NOS Gateway for Application Management</div><h1>Renewal Verification Report</h1></div><div class="muted">Generated ${esc(o.generatedAt)}<br>Prototype — fictional data</div></div>
<h2>Applicant</h2><table>${row('Name', st('Full name'))}${row('Student ID', o.studentId)}${row('Renewal application ID', o.applicationId)}${row('Previous application ID', o.previousId)}${row('Renewal year', o.renewalYear)}</table>
<h2>Scholarship</h2><table>${row('Scholarship', o.schemeName)}${row('Code', o.schemeCode)}${row('Previous scholarship year', o.previousYear)}${row('Current renewal year', o.renewalYear)}</table>
<h2>Profile summary (reused)</h2><table>${['Date of birth', 'Gender', 'State', 'District', 'Category', 'Domicile'].map((k) => row(k, st(k))).join('')}</table>
<h2>Current academic information</h2><table>${row('Course', 'PhD, Environmental Science')}${row('Current year', f('Current course year'))}${row('Semester', f('Current semester'))}${row('Institution', f('Current institution'))}${row('Current CGPA', f('Current CGPA'))}${row('Previous year result', f('Previous year result'))}</table>
<h2>Financial information</h2><table>${row('Current family income', f('Annual family income'))}${row('Income year', 'FY 2025-26 (certificate valid till 31 Mar 2027)')}</table>
${changed ? `<h2>Changed since previous application</h2><table><tr><th>Field</th><th>Previous</th><th>Current</th></tr>${changed}</table>` : ''}
<h2>Document verification</h2><table><tr><th>Document</th><th class="n">Confidence</th><th>Status</th></tr>${docsRows}</table>
<p class="muted">Automatic verification requires overall confidence ≥ ${AI_CONF_THRESHOLD}%, the correct document type, all mandatory fields and no critical mismatch. Everything else is reviewed by a MoTA official.</p>
<h2>Overall status</h2><table>${row('Required documents', String(sum.required))}${row('Automatically verified', String(sum.auto))}${row('Human review', String(sum.review))}${row('Deficiencies', String(sum.deficiencies))}</table>
<div class="overall ${sum.overall === 'PASSED' ? 'ok' : 'rev'}">OVERALL VERIFICATION: ${sum.overall === 'PASSED' ? '✓ PASSED' : '⚠ PENDING HUMAN REVIEW'}</div>
</body></html>`
}

export function downloadFile(name: string, content: string, type = 'text/html') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}
