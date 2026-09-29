import type { ReactNode } from 'react'
import { Lock, PenLine } from 'lucide-react'
import type { StudentAccount, StudentDetails } from '../types'
import { INSTITUTIONS, STATES } from '../data/mock'
import { FIELD_META, fmtDate, inr, type Answers } from '../lib/rules'
import { Input, Label, Select, cx } from './ui'

export type DKey = keyof StudentDetails

/** Category options used at registration and on the profile. */
export const STUDENT_CATEGORIES = ['Scheduled Tribe (ST)', 'ST — Particularly Vulnerable Tribal Group (PVTG)', 'Other']

interface FieldDef { label: string; type?: 'text' | 'date' | 'select' | 'number' | 'email' | 'tel' | 'aadhaar'; options?: string[]; placeholder?: string; hint?: string; optional?: boolean }

export const FIELD_DEFS: Record<DKey, FieldDef> = {
  name: { label: 'Full name (as on ST certificate)', placeholder: 'e.g. Priya Oraon' },
  dob: { label: 'Date of birth', type: 'date' },
  gender: { label: 'Gender', type: 'select', options: ['', 'Female', 'Male', 'Other'] },
  mobile: { label: 'Mobile number', type: 'tel', placeholder: '10-digit mobile' },
  email: { label: 'Email', type: 'email', placeholder: 'name@example.in' },
  aadhaarLast4: { label: 'Aadhaar number', type: 'aadhaar', placeholder: 'XXXX XXXX XXXX', hint: 'Needed for Direct Benefit Transfer. Only the last 4 digits are stored.' },
  tribe: { label: 'Tribe / community', placeholder: 'e.g. Oraon' },
  guardian: { label: 'Parent / guardian name' },
  parentOccupation: { label: 'Parent occupation', type: 'select', options: ['', 'Agriculture', 'Daily wages', 'Salaried', 'Self-employed', 'Unemployed', 'Other'] },
  disability: { label: 'Disability', type: 'select', options: ['None', 'Locomotor', 'Visual', 'Hearing', 'Other'] },
  state: { label: 'State of domicile', type: 'select', options: ['', ...STATES, 'Other'] },
  district: { label: 'District' },
  pin: { label: 'PIN code', type: 'tel', placeholder: '6 digits' },
  address: { label: 'Permanent address' },
  qualification: { label: 'Highest qualification passed', placeholder: 'e.g. Class XII / B.Sc. Physics' },
  qualificationMarks: { label: 'Marks in last exam (%)', type: 'number' },
  currentCourse: { label: 'Current course', placeholder: 'e.g. B.Tech Civil Engineering' },
  courseLevel: { label: 'Course level', type: 'select', options: ['', ...(FIELD_META.educationLevel.options ?? [])] },
  institutionId: { label: 'Institution (registered on SANGAM Setu)', type: 'select', options: ['', ...INSTITUTIONS.map((i) => i.id)] },
  yearOfStudy: { label: 'Year of study', type: 'select', options: ['', '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'] },
  bankAccount: { label: 'Bank account number', type: 'tel', placeholder: '9–18 digits', hint: 'Must be in your own name and Aadhaar-seeded for DBT.' },
  ifsc: { label: 'IFSC', placeholder: 'e.g. SBIN0001234' },
  bankName: { label: 'Bank name' },
  aadhaarSeeded: { label: 'Is the account Aadhaar-seeded?', type: 'select', options: ['', 'Yes', 'No'] },
  income: { label: 'Annual family income (₹)', type: 'number', placeholder: 'e.g. 180000' },
  enrollmentNo: { label: 'Student ID / enrollment number', placeholder: 'As on your institute ID card', optional: true },
  category: { label: 'Category', type: 'select', options: ['', ...STUDENT_CATEGORIES], optional: true },
  semester: { label: 'Semester', type: 'select', options: ['', ...Array.from({ length: 10 }, (_, i) => `Semester ${i + 1}`)], optional: true },
}

export const SECTIONS: { title: string; keys: DKey[] }[] = [
  { title: 'Personal details', keys: ['name', 'dob', 'gender', 'category', 'aadhaarLast4', 'tribe', 'guardian', 'parentOccupation', 'disability'] },
  { title: 'Contact', keys: ['mobile', 'email'] },
  { title: 'Address', keys: ['state', 'district', 'pin', 'address'] },
  { title: 'Academic', keys: ['qualification', 'qualificationMarks', 'currentCourse', 'courseLevel', 'institutionId', 'enrollmentNo', 'yearOfStudy', 'semester'] },
  { title: 'Bank', keys: ['bankAccount', 'ifsc', 'bankName', 'aadhaarSeeded'] },
  { title: 'Family & income', keys: ['income'] },
]

export const instName = (id?: string) => INSTITUTIONS.find((i) => i.id === id)?.name ?? ''
export const maskAcct = (v?: string) => (v ? `XXXXXXXX${v.slice(-4)}` : '')
export const maskMobile = (v?: string) => (v && v.length >= 10 ? `+91 ${v.slice(0, 2)}XXX XX${v.slice(-3)}` : v ?? '')

/** Human-readable value for display (masked where sensitive). */
export function displayValue(k: DKey, v?: string): string {
  if (!v) return ''
  if (k === 'aadhaarLast4') return `XXXX XXXX ${v}`
  if (k === 'bankAccount') return maskAcct(v)
  if (k === 'mobile') return maskMobile(v)
  if (k === 'dob') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? fmtDate(v) : v
  if (k === 'institutionId') return instName(v)
  if (k === 'income') return inr(Number(v))
  if (k === 'qualificationMarks') return `${v}%`
  return v
}

/** Validate one field; returns an error message or ''. */
export function validateField(k: DKey, v: string | undefined): string {
  const x = (v ?? '').trim()
  const def = FIELD_DEFS[k]
  if (!x) return def.optional || k === 'disability' ? '' : `${def.label.replace(/ \(.*\)$/, '')} is required.`
  switch (k) {
    case 'name': return x.length < 3 ? 'Enter your full name.' : ''
    case 'dob': { const y = Number(x.slice(0, 4)); return y < 1960 || y > 2020 ? 'Check the date of birth.' : '' }
    case 'mobile': return /^\d{10}$/.test(x) ? '' : 'Enter a 10-digit mobile number without +91.'
    case 'email': return /^\S+@\S+\.\S+$/.test(x) ? '' : 'Check the email format, e.g. name@example.in'
    case 'aadhaarLast4': return /^\d{4}$/.test(x) ? '' : 'Enter your 12-digit Aadhaar number.'
    case 'pin': return /^\d{6}$/.test(x) ? '' : 'PIN code has 6 digits.'
    case 'qualificationMarks': { const n = Number(x); return isNaN(n) || n < 0 || n > 100 ? 'Enter a percentage between 0 and 100.' : '' }
    case 'bankAccount': return /^\d{9,18}$/.test(x) ? '' : 'Account number must be 9–18 digits.'
    case 'ifsc': return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(x.toUpperCase()) ? '' : 'Enter a valid IFSC, e.g. SBIN0001234.'
    case 'income': return /^\d+$/.test(x) && Number(x) > 0 ? '' : 'Enter the yearly amount in rupees (numbers only).'
    default: return ''
  }
}
export function validateKeys(keys: DKey[], d: Partial<StudentDetails>) {
  const e: Record<string, string> = {}
  keys.forEach((k) => { const m = validateField(k, d[k]); if (m) e[k] = m })
  return e
}

/** Rule-engine answers derived from a student's details plus any scheme-specific eligibility answers. */
export function answersFor(d: Partial<StudentDetails>, extra: Record<string, string> = {}): Answers {
  const inst = INSTITUTIONS.find((i) => i.id === d.institutionId)
  const instType = inst ? (/Top Class/.test(inst.type) ? 'Notified Top Class' : /Private/.test(inst.type) ? 'Private' : /Aided/.test(inst.type) ? 'Aided' : 'Government') : 'Government'
  return {
    category: 'ST', educationLevel: d.courseLevel || 'Undergraduate', income: Number(d.income) || 0, marks: Number(d.qualificationMarks) || 0,
    destination: extra.destination ?? 'Domestic', institutionType: extra.institutionType ?? instType,
    researchStatus: extra.researchStatus ?? (d.courseLevel === 'MPhil/PhD' ? 'Registered' : 'Not applicable'),
    studyLocation: extra.studyLocation ?? (inst && d.state && inst.state !== d.state ? 'Outside home state' : 'Within home state'),
    course: d.currentCourse ?? '',
  }
}

function VerifiedBox({ label, value, source }: { label: string; value: string; source: string }) {
  return (
    <div className="rounded-lg border border-leaf-500/25 bg-leaf-50/50 px-3 py-2.5">
      <p className="flex items-center justify-between gap-2 text-[12px] text-slate-500">{label}<span className="flex items-center gap-1 font-semibold text-leaf-700"><Lock size={11} />Verified</span></p>
      <p className="mt-0.5 text-[14.5px] font-semibold text-navy-950">{value}</p>
      <p className="text-[10.5px] text-slate-400">{source}</p>
    </div>
  )
}

/**
 * Renders a set of profile fields. Verified fields are locked; everything else is an input the student fills in.
 * Used at registration, on the profile page and in every application.
 */
export function DetailsForm({ keys, values, onChange, errors = {}, verified = {}, cols = 3, aadhaarRaw, onAadhaarRaw }: {
  keys: DKey[]; values: Partial<StudentDetails>; onChange: (k: DKey, v: string) => void; errors?: Record<string, string>
  verified?: StudentAccount['verified']; cols?: 2 | 3; aadhaarRaw?: string; onAadhaarRaw?: (v: string) => void
}) {
  return (
    <div className={cx('grid gap-3 sm:grid-cols-2', cols === 3 && 'lg:grid-cols-3')}>
      {keys.map((k) => {
        const def = FIELD_DEFS[k]
        const v = values[k] ?? ''
        if (verified[k] && v) return <VerifiedBox key={k} label={def.label} value={displayValue(k, v)} source={verified[k]!} />
        const id = `df-${k}`
        let input: ReactNode
        if (def.type === 'select') {
          input = k === 'institutionId'
            ? <select id={id} className={cx('h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15', errors[k] ? 'border-red-400' : 'border-navy-100')} value={v} onChange={(e) => onChange(k, e.target.value)}>
                <option value="">Select your institution</option>{INSTITUTIONS.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.state})</option>)}
              </select>
            : <Select id={id} options={def.options!} value={v} onChange={(e) => onChange(k, e.target.value)} className={errors[k] ? 'border-red-400' : ''} />
        } else if (def.type === 'aadhaar') {
          const raw = aadhaarRaw ?? ''
          input = <Input id={id} inputMode="numeric" autoComplete="off" placeholder={def.placeholder} value={raw.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ')}
            onChange={(e) => { const digits = e.target.value.replace(/\D/g, '').slice(0, 12); onAadhaarRaw?.(digits); onChange(k, digits.length === 12 && /^[2-9]/.test(digits) ? digits.slice(-4) : '') }} />
        } else {
          input = <Input id={id} type={def.type === 'tel' ? 'text' : def.type ?? 'text'} inputMode={def.type === 'tel' || def.type === 'number' ? 'numeric' : undefined} placeholder={def.placeholder} value={v}
            onChange={(e) => onChange(k, k === 'ifsc' ? e.target.value.toUpperCase() : e.target.value)} />
        }
        return (
          <div key={k}>
            <Label htmlFor={id}>{def.label}</Label>
            {input}
            {errors[k] ? <p role="alert" className="mt-1 text-xs font-medium text-red-600">{errors[k]}</p> : def.hint ? <p className="mt-1 text-[11.5px] text-slate-500">{def.hint}</p> : null}
            {k === 'aadhaarLast4' && v && !errors[k] && <p className="mt-1 flex items-center gap-1 text-[11.5px] text-leaf-700"><PenLine size={11} />Stored as XXXX XXXX {v}</p>}
          </div>
        )
      })}
    </div>
  )
}
