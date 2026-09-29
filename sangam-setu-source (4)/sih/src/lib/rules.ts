import type { EligibilityRule, RuleField, Scheme } from '../types'

export interface Answers {
  category: string
  educationLevel: string
  income: number
  marks: number
  destination: string
  institutionType: string
  researchStatus: string
  studyLocation: string
  course: string
}

export const FIELD_META: Record<RuleField, { label: string; kind: 'enum' | 'number'; options?: string[]; unit?: string }> = {
  category: { label: 'Category', kind: 'enum', options: ['ST', 'Other'] },
  educationLevel: { label: 'Education level', kind: 'enum', options: ['Class 9-10', 'Class 11-12', 'Undergraduate', 'Postgraduate', 'MPhil/PhD'] },
  income: { label: 'Annual family income', kind: 'number', unit: '₹' },
  marks: { label: 'Marks in last exam', kind: 'number', unit: '%' },
  destination: { label: 'Study destination', kind: 'enum', options: ['Domestic', 'Overseas'] },
  institutionType: { label: 'Institution type', kind: 'enum', options: ['Government', 'Aided', 'Private', 'Notified Top Class', 'Foreign University'] },
  researchStatus: { label: 'Research status', kind: 'enum', options: ['Registered', 'Applied', 'Not applicable'] },
  studyLocation: { label: 'Study location', kind: 'enum', options: ['Within home state', 'Outside home state', 'Abroad'] },
}

export const inr = (n: number) => '₹' + n.toLocaleString('en-IN')

export function ruleText(r: EligibilityRule) {
  const m = FIELD_META[r.field]
  const v = Array.isArray(r.value) ? r.value.join(' / ') : m.kind === 'number' && m.unit === '₹' ? inr(Number(r.value)) : `${r.value}${m.unit === '%' ? '%' : ''}`
  const op = r.op === 'in' ? 'is one of' : r.op === '=' ? 'is' : r.op === '!=' ? 'is not' : r.op === '<=' ? 'at most' : 'at least'
  return `${m.label} ${op} ${v}`
}

export interface RuleResult { rule: EligibilityRule; pass: boolean; reason: string }

export function evalRule(r: EligibilityRule, a: Answers): RuleResult {
  const actual = (a as unknown as Record<string, string | number>)[r.field]
  let pass = false
  switch (r.op) {
    case '=': pass = String(actual) === String(r.value); break
    case '!=': pass = String(actual) !== String(r.value); break
    case '<=': pass = Number(actual) <= Number(r.value); break
    case '>=': pass = Number(actual) >= Number(r.value); break
    case 'in': pass = (r.value as string[]).includes(String(actual)); break
  }
  const m = FIELD_META[r.field]
  const shown = m.unit === '₹' ? inr(Number(actual)) : `${actual}${m.unit === '%' ? '%' : ''}`
  let reason = ''
  if (r.field === 'income') reason = pass ? `Income ${shown} is within the configured threshold of ${inr(Number(r.value))}` : `Income ${shown} is above the configured threshold of ${inr(Number(r.value))}`
  else if (r.field === 'category') reason = pass ? 'ST category confirmed' : 'Scheme is reserved for ST students'
  else if (r.field === 'marks') reason = pass ? `Marks ${shown} meet the minimum of ${r.value}%` : `Marks ${shown} are below the minimum of ${r.value}%`
  else reason = pass ? `${m.label} (${shown}) matches` : `${m.label} is ${shown}; scheme needs ${Array.isArray(r.value) ? r.value.join(' / ') : r.value}`
  return { rule: r, pass, reason }
}

export function evaluateScheme(s: Scheme, a: Answers) {
  const results = s.rules.map((r) => evalRule(r, a))
  const passed = results.filter((r) => r.pass).length
  const score = s.rules.length ? Math.round((passed / s.rules.length) * 100) : 0
  const verdict: 'match' | 'near' | 'no' = passed === results.length ? 'match' : results.length - passed === 1 && results.find((r) => !r.pass)!.rule.field !== 'category' ? 'near' : 'no'
  return { scheme: s, results, score, verdict }
}

export const fmtDate = (d?: string) => {
  if (!d) return '—'
  const dt = new Date(d.length <= 10 ? d + 'T00:00' : d)
  if (isNaN(+dt)) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const now = () => {
  // Pinned to the prototype's demo date so timelines read consistently
  const d = new Date()
  const t = d.toTimeString().slice(0, 5)
  return `2026-09-27 ${t}`
}
export const today = () => '2026-09-27'
export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Automatic-verification threshold (prototype): documents are auto-verified only at or above this overall confidence,
 * with the correct document type, mandatory fields present and no critical mismatch. Anything else goes to human review
 * by a MoTA official. Used for both new and renewal applications.
 */
export const AI_CONF_THRESHOLD = 90

/** Decision rule shared by the verification engine. Confidence alone never decides — critical checks can override it. */
export function verificationDecision(o: { overall: number; typeOk: boolean; fieldsOk: boolean; critical: string[] }): 'VERIFIED' | 'HUMAN_REVIEW' | 'REJECTED' {
  if (!o.typeOk) return 'REJECTED'
  if (o.overall >= AI_CONF_THRESHOLD && o.fieldsOk && o.critical.length === 0) return 'VERIFIED'
  return 'HUMAN_REVIEW'
}
