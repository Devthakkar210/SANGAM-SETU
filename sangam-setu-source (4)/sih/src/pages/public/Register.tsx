import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { GraduationCap, Building2, ShieldCheck, Loader2, Fingerprint, CheckCircle2, BadgeCheck, KeyRound } from 'lucide-react'
import { useStore, ROLE_META, type Store } from '../../store/AppStore'
import { INSTITUTIONS, STATES } from '../../data/mock'
import { Badge, Button, Card, cx } from '../../components/ui'
import { EKyc, digiLockerIncomeDoc, type EKycResult } from '../../components/EKyc'
import { STUDENT_CATEGORIES, displayValue, instName, maskMobile } from '../../components/DetailsForm'
import { InstitutionCard } from '../../components/InstitutionCard'
import { BackButton, OtpVerification, ProcessChecklist, RegistrationFields, StepIndicator, SuccessPanel, type CheckItem } from '../../components/auth/RegistrationKit'
import { maskPhone, useRegistrationForm, type RegField, type RegSection, type RegValues } from '../../components/auth/registration'
import { today } from '../../lib/rules'
import { DemoAccountsSection } from '../../components/demo/DemoAccounts'

type RegRole = 'student' | 'institute' | 'admin'

/* ------------------------------------------------------------------ */
/* Shared field definitions                                            */
/* ------------------------------------------------------------------ */

const NAME_RE = /^[A-Za-z][A-Za-z .'-]{2,}$/
const personName = (label: string): RegField => ({ key: 'name', label, required: true, autoComplete: 'name', placeholder: 'e.g. Priya Oraon', validate: (v) => (NAME_RE.test(v) ? '' : 'Use letters only (spaces, full stops and hyphens are fine), at least 3 characters.') })
const emailField = (label = 'Email'): RegField => ({ key: 'email', label, type: 'email', required: true, autoComplete: 'email', placeholder: 'name@example.in' })
const mobileField = (label = 'Mobile number'): RegField => ({ key: 'mobile', label, type: 'tel', required: true, placeholder: '10-digit mobile number', hint: 'Without +91 or a leading 0.' })
const passwordSection = (extra: RegField[] = []): RegSection => ({
  title: 'Set a password',
  fields: [
    { key: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Create a password' },
    { key: 'confirmPassword', label: 'Confirm password', type: 'password', required: true, matches: 'password', placeholder: 'Re-enter the password' },
    ...extra,
  ],
})
const upper = (v: string) => v.toUpperCase().replace(/\s+/g, '')

const YEAR_SEMESTER = Array.from({ length: 5 }, (_, y) => [2 * y + 1, 2 * y + 2].map((sem) => ({ value: `${y + 1}|${sem}`, label: `${['1st', '2nd', '3rd', '4th', '5th'][y]} Year · Semester ${sem}` }))).flat()
const INSTITUTION_TYPES = ['Central University', 'State University', 'Deemed University', 'Government College', 'Aided College', 'Private (Affiliated)', 'Notified Top Class', 'Government School', 'Other']
const COURSE_LEVELS = ['School (Class IX–X)', 'Higher Secondary (XI–XII)', 'Diploma', 'UG', 'PG', 'MPhil/PhD']
const FREE_MAIL = /@(gmail|yahoo|outlook|hotmail|rediffmail|ymail|icloud|proton(mail)?)\./i

function checkDob(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Enter a valid date.'
  if (v > today()) return 'Date of birth cannot be in the future.'
  const age = (Date.parse(today()) - Date.parse(v)) / (365.25 * 864e5)
  return age < 10 || age > 70 ? 'Check the date of birth — the student should be between 10 and 70 years old.' : ''
}

const val = (v: RegValues, k: string) => (Array.isArray(v[k]) ? (v[k] as string[]).join(', ') : ((v[k] as string) ?? '').trim())
const list = (v: RegValues, k: string) => (Array.isArray(v[k]) ? (v[k] as string[]) : [])
/** "Meera" for "Meera Oraon"; keep the full name when it starts with a title ("Dr. S. Hembrom"). */
const greet = (name: string) => (/^(dr|prof|mr|mrs|ms|shri|smt|sri)\.?\s/i.test(name) ? name : name.split(' ')[0])
const signedInAt = () => `${today()} ${new Date().toTimeString().slice(0, 5)}`

/* ------------------------------------------------------------------ */
/* Role configuration — every role uses the same flow component        */
/* ------------------------------------------------------------------ */

interface FlowCtx { s: Store; next: string | null; meta: { kyc?: EKycResult } }
interface Created { name: string; home: string; title: string; body: ReactNode; details: [string, string][] }

interface RoleFlow {
  id: RegRole
  label: string
  icon: ReactNode
  accent: { tile: string; bar: string; button: 'primary' | 'saffron' | 'success' }
  description: string
  formTitle: string
  formSub: string
  steps: string[]
  submitLabel: string
  sections: (s: Store) => RegSection[]
  initial?: RegValues
  /** checks against accounts that already exist (runs on submit) */
  duplicates: (v: RegValues, s: Store) => Record<string, string>
  /** optional extra step between email verification and saving the account */
  afterOtp?: (v: RegValues, s: Store) => { icon: ReactNode; title: string; sub: ReactNode; doneTitle: string; continueLabel: string; items: CheckItem[] }
  /** save to the role's store ("DB") and sign in */
  create: (v: RegValues, ctx: FlowCtx, checks: CheckItem[]) => Created
  /** side panel next to the form (lg screens) */
  aside?: (v: RegValues, s: Store) => ReactNode
  /** extra content below the fields */
  Extras?: (p: { values: RegValues; meta: FlowCtx['meta']; setMeta: (m: FlowCtx['meta']) => void; onNeedFields: (e: Record<string, string>) => void }) => ReactNode
}

const STUDENT: RoleFlow = {
  id: 'student',
  label: 'Student',
  icon: <GraduationCap size={24} />,
  accent: { tile: 'bg-saffron-50 text-saffron-700', bar: 'bg-saffron-500', button: 'saffron' },
  description: 'Find scholarships you are eligible for, apply once with a verified profile and track every application to disbursement.',
  formTitle: 'Student registration',
  formSub: 'Enter your own details as they appear on your institute records. Bank and family details are asked once when you apply.',
  steps: ['Account type', 'Your details', 'Verify email', 'Done'],
  submitLabel: 'Create student account',
  sections: () => [
    { title: 'Account details', fields: [
      { ...personName('Full name'), wide: true, hint: 'As on your ST certificate.' },
      emailField(), mobileField(),
      { key: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Create a password' },
      { key: 'confirmPassword', label: 'Confirm password', type: 'password', required: true, matches: 'password', placeholder: 'Re-enter the password' },
    ] },
    { title: 'Academic details', fields: [
      { key: 'enrollmentNo', label: 'Student ID / Enrollment number', required: true, placeholder: 'As on your institute ID card', transform: (v) => v.toUpperCase(), validate: (v) => (/^[A-Z0-9][A-Z0-9/\-. ]{2,29}$/i.test(v) ? '' : 'Use 3–30 letters, numbers, / or -.') },
      { key: 'institutionId', label: 'Institute', type: 'select', required: true, placeholder: 'Select your institute', options: INSTITUTIONS.map((i) => ({ value: i.id, label: `${i.name} (${i.state})` })), hint: 'Only institutes registered on SANGAM Setu can verify applications.' },
      { key: 'course', label: 'Course / Program', required: true, placeholder: 'e.g. B.Tech Civil Engineering' },
      { key: 'yearSem', label: 'Year / Semester', type: 'select', required: true, placeholder: 'Select year and semester', options: YEAR_SEMESTER },
    ] },
    { title: 'Personal details', fields: [
      { key: 'dob', label: 'Date of birth', type: 'date', required: true, validate: checkDob },
      { key: 'category', label: 'Category', type: 'select', required: true, placeholder: 'Select category', options: STUDENT_CATEGORIES },
      { key: 'address', label: 'Address', type: 'textarea', wide: true, placeholder: 'House / village, post office, district, state, PIN', hint: 'Optional now — you can add it later from My Profile or when you apply.' },
      { key: 'consent', label: 'I consent to my information being used to verify eligibility and process scholarships under MoTA schemes.', type: 'checkbox', required: true, wide: true },
    ] },
  ],
  duplicates: (v, s) => {
    const e: Record<string, string> = {}
    if (s.students.some((a) => a.details.mobile === val(v, 'mobile'))) e.mobile = 'An account already exists with this mobile number. Sign in instead.'
    if (s.students.some((a) => a.details.email?.toLowerCase() === val(v, 'email').toLowerCase())) e.email = 'An account already exists with this email. Sign in instead.'
    return e
  },
  Extras: ({ values, meta, setMeta, onNeedFields }) => <StudentEKyc values={values} kyc={meta.kyc} onChange={(kyc) => setMeta({ ...meta, kyc })} onNeedFields={onNeedFields} />,
  create: (v, { s, next, meta }) => {
    const [year, sem] = val(v, 'yearSem').split('|')
    const name = val(v, 'name')
    const details: Record<string, string> = {
      name, email: val(v, 'email'), mobile: val(v, 'mobile'), dob: val(v, 'dob'), category: val(v, 'category'),
      enrollmentNo: val(v, 'enrollmentNo'), institutionId: val(v, 'institutionId'), currentCourse: val(v, 'course'),
      yearOfStudy: `${['1st', '2nd', '3rd', '4th', '5th'][Number(year) - 1]} Year`, semester: `Semester ${sem}`, disability: 'None',
      state: INSTITUTIONS.find((i) => i.id === val(v, 'institutionId'))?.state ?? '',
    }
    if (val(v, 'address')) details.address = val(v, 'address')
    const verified: Record<string, string> = { email: 'Email OTP', mobile: 'OTP' }
    const kyc = meta.kyc
    if (kyc) {
      const how = kyc.method === 'aadhaar' ? 'Aadhaar eKYC' : 'DigiLocker eKYC'
      Object.assign(verified, { name: how, dob: how, aadhaarLast4: how })
      details.aadhaarLast4 = kyc.maskedId.replace(/\D/g, '').slice(-4) || ''
    }
    const vault = kyc?.method === 'digilocker' && kyc.docs.includes('income_cert') ? { income_cert: digiLockerIncomeDoc(name) } : {}
    const id = s.createStudent(details, verified, kyc ? { method: kyc.method, maskedId: kyc.maskedId } : undefined, vault)
    s.switchStudent(id)
    s.set(() => ({ role: 'student', loggedIn: true, remembered: { name, mobile: maskMobile(details.mobile), lastAt: signedInAt(), studentId: id } }))
    s.log('Account created', `New student account ${id} · email verified by OTP${kyc ? ` · identity verified via ${kyc.method === 'aadhaar' ? 'Aadhaar' : 'DigiLocker'} (${kyc.maskedId})` : ''}`, undefined, { user: name, role: 'Student' })
    s.notify({ title: 'Welcome to SANGAM Setu', body: 'Your account is ready. Check your eligibility, then apply — the application asks for the remaining details once and saves them to your profile.', channel: ['in-app', 'sms', 'email'], kind: 'success', audience: 'student', studentId: id })
    return {
      name, home: next && next.startsWith('/student') ? next : ROLE_META.student.home,
      title: 'Student account created',
      body: <>Welcome, {greet(name)}! Your email is verified and your profile is saved.</>,
      details: [['Profile ID', id], ['Enrollment no.', details.enrollmentNo], ['Institute', instName(details.institutionId)], ['Course', `${details.currentCourse} · ${details.yearOfStudy}, ${details.semester}`]],
    }
  },
}

const INSTITUTE: RoleFlow = {
  id: 'institute',
  label: 'Institute',
  icon: <Building2 size={24} />,
  accent: { tile: 'bg-navy-900 text-white', bar: 'bg-navy-900', button: 'primary' },
  description: 'Register your institution and nodal officer to verify enrolment, bonafide and fee details for scholarship applicants.',
  formTitle: 'Institute registration',
  formSub: 'Registered by the institution’s nodal officer. These details route student applications to you for verification.',
  steps: ['Account type', 'Institution details', 'Verify email', 'Institute verification', 'Done'],
  submitLabel: 'Register institute',
  initial: { courses: [], schemes: [] },
  sections: (s) => [
    { title: 'Institution details', fields: [
      { key: 'instName', label: 'Institution name', required: true, wide: true, placeholder: 'e.g. Birsa Institute of Research & Technology', validate: (v) => (v.length < 5 ? 'Enter the full registered name of the institution.' : '') },
      { key: 'instType', label: 'Institution type', type: 'select', required: true, placeholder: 'Select type', options: INSTITUTION_TYPES },
      { key: 'state', label: 'State', type: 'select', required: true, placeholder: 'Select state', options: [...STATES, 'Other'] },
      { key: 'code', label: 'Institution code', required: true, placeholder: 'e.g. JH-U-0142', transform: upper, hint: 'Code issued by the State Tribal Welfare Department.', validate: (v) => (/^[A-Z0-9][A-Z0-9-]{3,14}$/.test(v) ? '' : 'Use 4–15 capital letters, numbers or hyphens, e.g. JH-U-0142.') },
      { key: 'aishe', label: 'AISHE code', required: true, placeholder: 'e.g. C-12345', transform: upper, hint: 'U- university, C- college, S- standalone institution.', validate: (v) => (/^[UCS]-\d{4,6}$/.test(v) ? '' : 'AISHE code looks like U-0123, C-12345 or S-1234.') },
    ] },
    { title: 'Nodal officer', description: 'The person who will sign in and verify applications.', fields: [
      { ...personName('Nodal officer name'), placeholder: 'e.g. Dr. R. Tirkey' },
      { key: 'designation', label: 'Nodal officer designation', required: true, placeholder: 'e.g. Deputy Registrar (Academics)' },
      { ...emailField('Official email'), placeholder: 'nodal.scholarship@institute.ac.in', hint: 'Use the institution’s domain where possible.' },
      { ...mobileField('Official phone number'), placeholder: '10-digit number', hint: 'Mobile, or landline with STD code — 10 digits.' },
    ] },
    { title: 'Courses & schemes', fields: [
      { key: 'courses', label: 'Courses mapped', type: 'chips', required: true, wide: true, options: COURSE_LEVELS },
      { key: 'schemes', label: 'Schemes participating', type: 'chips', required: true, wide: true, options: s.schemes.filter((x) => x.status === 'Live').map((x) => ({ value: x.id, label: x.short })) },
    ] },
    passwordSection([{ key: 'declare', label: 'I confirm I am the authorised nodal officer of this institution and the details above are correct.', type: 'checkbox', required: true, wide: true }]),
  ],
  duplicates: (v, s) => {
    const e: Record<string, string> = {}
    const code = val(v, 'code'), aishe = val(v, 'aishe'), email = val(v, 'email').toLowerCase()
    if (INSTITUTIONS.some((i) => i.code === code) || s.institutionAccounts.some((i) => i.code === code)) e.code = 'An institution with this code is already registered. Ask your nodal officer to sign in.'
    if (s.institutionAccounts.some((i) => i.aishe === aishe)) e.aishe = 'This AISHE code is already registered.'
    if (s.institutionAccounts.some((i) => i.email.toLowerCase() === email)) e.email = 'This official email is already used by another institution.'
    return e
  },
  afterOtp: (v) => {
    const email = val(v, 'email')
    const domain = email.split('@')[1] ?? ''
    return {
      icon: <BadgeCheck size={22} />, title: 'Verifying your institute', doneTitle: 'Institute verified',
      sub: 'We check the institution’s identifiers and nodal officer before it can receive student applications.',
      continueLabel: 'Complete registration',
      items: [
        { label: 'Institution code', detail: `${val(v, 'code')} is unique on SANGAM Setu.` },
        { label: 'AISHE code', detail: `${val(v, 'aishe')} format is valid. AISHE lookup: Integration Ready (prototype).` },
        FREE_MAIL.test(email)
          ? { label: 'Official email', warn: `${domain} is a personal email domain. The State Nodal Cell will confirm the nodal officer by phone.` }
          : { label: 'Official email', detail: `Verified by OTP · domain ${domain}.` },
        { label: 'Nodal officer', detail: `${val(v, 'name')}, ${val(v, 'designation')} · ${maskPhone(val(v, 'mobile'))}` },
        { label: 'Courses & schemes', detail: `${list(v, 'courses').length} course level(s) · ${list(v, 'schemes').length} scheme(s) mapped.` },
        { label: 'State Nodal Cell approval', detail: 'Approved automatically in this prototype. In production the State Nodal Cell approves new institutions.' },
      ],
    }
  },
  aside: (v, s) => (
    <div className="space-y-3">
      <p className="text-[13px] font-semibold text-slate-500">Your institution profile will look like this</p>
      <InstitutionCard name={val(v, 'instName')} type={val(v, 'instType')} state={val(v, 'state')} badge="Preview" badgeColor="gray" rows={[
        ['Institution code', val(v, 'code')], ['AISHE code', val(v, 'aishe')], ['Nodal officer', val(v, 'name')], ['Designation', val(v, 'designation')],
        ['Official e-mail', val(v, 'email')], ['Phone', val(v, 'mobile')], ['Courses mapped', list(v, 'courses').join(' · ')],
        ['Schemes participating', list(v, 'schemes').map((id) => s.schemes.find((x) => x.id === id)?.short ?? id).join(', ')],
      ]} />
    </div>
  ),
  create: (v, { s }, checks) => {
    const name = val(v, 'name')
    const acc = {
      name: val(v, 'instName'), type: val(v, 'instType'), state: val(v, 'state'), code: val(v, 'code'), aishe: val(v, 'aishe'),
      nodal: name, designation: val(v, 'designation'), email: val(v, 'email'), phone: val(v, 'mobile'),
      courses: list(v, 'courses'), schemes: list(v, 'schemes'), verifiedAt: today(), reviewNotes: checks.filter((c) => c.warn).map((c) => c.warn!),
    }
    const id = s.createInstitution(acc)
    s.set(() => ({ role: 'institution', loggedIn: true, institutionAccountId: id }))
    s.log('Institution registered', `${acc.name} (${acc.code}, AISHE ${acc.aishe}) · nodal officer ${name} · email verified by OTP · institute verification passed`, undefined, { user: name, role: 'Institution' })
    s.notify({ title: 'Institution registered', body: `${acc.name} can now receive and verify scholarship applications.`, channel: ['in-app', 'email'], kind: 'success', audience: 'institution' })
    s.notify({ title: 'New institution registered', body: `${acc.name} · ${acc.state}${acc.reviewNotes.length ? ' · needs State Nodal Cell phone confirmation' : ''}`, channel: ['in-app'], kind: acc.reviewNotes.length ? 'action' : 'info', audience: 'admin' })
    return {
      name, home: ROLE_META.institution.home, title: 'Institute registered',
      body: <>{acc.name} is verified. {greet(name)}, you can now verify applications from your students.</>,
      details: [['Institute ID', id], ['Institution code', acc.code], ['AISHE code', acc.aishe], ['Status', acc.reviewNotes.length ? 'Verified · phone confirmation pending' : 'Verified']],
    }
  },
}

const ADMIN: RoleFlow = {
  id: 'admin',
  label: 'Admin',
  icon: <ShieldCheck size={24} />,
  accent: { tile: 'bg-leaf-50 text-leaf-700', bar: 'bg-leaf-600', button: 'success' },
  description: 'For MoTA officials who run scrutiny, merit selection, disbursement, scheme configuration and grievance redressal.',
  formTitle: 'Admin registration',
  formSub: 'For Ministry of Tribal Affairs officials. The Admin role is assigned automatically once your email is verified.',
  steps: ['Account type', 'Your details', 'Verify email', 'Assign role', 'Done'],
  submitLabel: 'Create admin account',
  sections: () => [
    { title: 'Account details', fields: [{ ...personName('Full name'), wide: true }, { ...emailField('Official email'), placeholder: 'name@tribal.gov.in' }, mobileField()] },
    passwordSection(),
  ],
  duplicates: (v, s) => {
    const e: Record<string, string> = {}
    if (s.adminAccounts.some((a) => a.email.toLowerCase() === val(v, 'email').toLowerCase())) e.email = 'An admin account already exists with this email. Sign in instead.'
    return e
  },
  afterOtp: () => ({
    icon: <KeyRound size={22} />, title: 'Assigning the Admin role', doneTitle: 'Admin role assigned',
    sub: 'Your account gets the MoTA Super Admin role and its permissions.', continueLabel: 'Open admin dashboard',
    items: [
      { label: 'Official email verified', detail: 'Confirmed by one-time code.' },
      { label: 'Admin account created', detail: 'Two-factor sign-in enabled (prototype).' },
      { label: `Role assigned: ${ROLE_META.super_admin.label}`, detail: ROLE_META.super_admin.org },
      { label: 'Access granted', detail: 'Command Center, Scrutiny, Merit & Selection, Disbursement, Scheme Builder, Grievances, Audit Log, Roles & Access.' },
    ],
  }),
  create: (v, { s }) => {
    const name = val(v, 'name')
    const id = s.createAdmin({ name, email: val(v, 'email'), mobile: val(v, 'mobile'), role: 'super_admin' })
    s.set(() => ({ role: 'super_admin', loggedIn: true, adminAccountId: id }))
    s.log('Account created', `New admin account ${id} · email verified by OTP`, undefined, { user: name, role: ROLE_META.super_admin.label })
    s.log('Role assigned', `${ROLE_META.super_admin.label} role assigned automatically to ${name} (${id})`, undefined, { user: 'System', role: 'System' })
    return {
      name, home: ROLE_META.super_admin.home, title: 'Admin account created',
      body: <>Welcome, {greet(name)}. You now have the {ROLE_META.super_admin.label} role.</>,
      details: [['Admin ID', id], ['Role', ROLE_META.super_admin.label], ['Email', val(v, 'email')], ['Mobile', maskPhone(val(v, 'mobile'))]],
    }
  },
}

const ROLE_FLOWS: Record<RegRole, RoleFlow> = { student: STUDENT, institute: INSTITUTE, admin: ADMIN }

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

const withNext = (path: string, next: string | null) => `${path}${next ? `?next=${encodeURIComponent(next)}` : ''}`

/** /register — choose the type of account before seeing a form. */
/** The three account-type cards (Student / Institute / Admin). Reusable wherever a role has to be picked. */
export function RoleSelectCards({ onPick }: { onPick: (role: RegRole) => void }) {
  return (
    // phones: stacked cards · tablets: one row per role · desktop: three columns
    <div className="grid gap-5 lg:grid-cols-3" role="list">
      {(Object.values(ROLE_FLOWS)).map((r) => (
        <Card key={r.id} role="listitem" className="relative flex flex-col overflow-hidden p-6 transition hover:shadow-lift sm:flex-row sm:items-center sm:gap-5 lg:flex-col lg:items-stretch lg:gap-0">
          <span className={cx('absolute inset-x-0 top-0 h-1', r.accent.bar)} aria-hidden />
          <div className={cx('grid h-14 w-14 shrink-0 place-items-center rounded-xl', r.accent.tile)}>{r.icon}</div>
          <div className="mt-5 flex-1 sm:mt-0 lg:mt-5">
            <h2 className="font-display text-xl font-bold text-navy-950">{r.label}</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">{r.description}</p>
          </div>
          <Button className="mt-6 w-full shrink-0 sm:mt-0 sm:w-auto lg:mt-6 lg:w-full" size="lg" variant={r.accent.button} onClick={() => onPick(r.id)}>Create as {r.label}</Button>
        </Card>
      ))}
    </div>
  )
}

export function RegisterRoleSelect() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">Create Your Account</h1>
        <p className="mt-2 text-slate-600">Choose the type of account you need. Each account sees only the information it is authorised for.</p>
      </div>
      <div className="mt-8"><RoleSelectCards onPick={(id) => nav(withNext(`/register/${id}`, id === 'student' ? next : null))} /></div>
      <p className="mt-8 text-center text-sm text-slate-600">Already have an account? <button onClick={() => nav(withNext('/login', next))} className="font-semibold text-saffron-700 hover:underline">Sign in</button></p>
      <DemoAccountsSection id="register-demo-accounts" className="mt-14 border-t border-navy-100 pt-12" />
    </div>
  )
}

type Stage = 'form' | 'otp' | 'check' | 'done'

/** /register/:role — one flow for every role; fields and extra steps come from ROLE_FLOWS. */
export function RegisterFlow() {
  const { role: param } = useParams()
  const key = (param === 'institution' ? 'institute' : param) as RegRole
  const flow = ROLE_FLOWS[key]
  // remount per role so state never leaks between forms
  return flow ? <RoleFlowView key={flow.id} flow={flow} /> : <Navigate to="/register" replace />
}

function RoleFlowView({ flow }: { flow: RoleFlow }) {
  const s = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const sections = flow.sections(s)
  const form = useRegistrationForm(sections, flow.initial)
  const [stage, setStage] = useState<Stage>('form')
  const [submitting, setSubmitting] = useState(false)
  const [meta, setMeta] = useState<FlowCtx['meta']>({})
  const [created, setCreated] = useState<Created | null>(null)
  const check = flow.afterOtp?.(form.values, s)

  useEffect(() => { window.scrollTo({ top: 0, behavior: s.lowBandwidth ? 'auto' : 'smooth' }) }, [stage, s.lowBandwidth])

  const stepIndex = stage === 'form' ? 1 : stage === 'otp' ? 2 : stage === 'check' ? 3 : flow.steps.length - 1
  const back = () => nav(withNext('/register', next))

  const focusFirst = (e: Record<string, string>) => {
    const first = sections.flatMap((x) => x.fields).find((f) => e[f.key])
    const el = first && document.getElementById(`reg-${first.key}`)
    if (el) { el.scrollIntoView({ behavior: s.lowBandwidth ? 'auto' : 'smooth', block: 'center' }); el.focus({ preventScroll: true }) }
  }

  const submit = () => {
    if (submitting) return
    const e = form.validate()
    if (Object.keys(e).length) {
      s.toast(`Please fix ${Object.keys(e).length} highlighted field${Object.keys(e).length > 1 ? 's' : ''}`, 'error')
      focusFirst(e)
      return
    }
    setSubmitting(true)
    window.setTimeout(() => {
      const dup = flow.duplicates(form.values, s)
      setSubmitting(false)
      if (Object.keys(dup).length) { form.setErrors(dup); s.toast(Object.values(dup)[0], 'error'); focusFirst(dup); return }
      setStage('otp')
      s.toast('Verification code sent (prototype — enter any 6 digits)', 'info')
    }, 900)
  }

  const save = (checks: CheckItem[] = []) => {
    const c = flow.create(form.values, { s, next, meta }, checks)
    setCreated(c)
    setStage('done')
    s.toast(`${c.title} — welcome, ${greet(c.name)}!`)
  }

  const onOtpVerified = () => {
    s.toast('Email verified')
    if (check) setStage('check')
    else save()
  }

  return (
    <div className={cx('mx-auto px-4 py-10 sm:py-12', stage === 'form' && flow.aside ? 'max-w-6xl' : 'max-w-3xl')}>
      <div className="mb-6 flex flex-col gap-4">
        {stage === 'form' && <div><BackButton onClick={back} /></div>}
        <StepIndicator steps={flow.steps} current={stepIndex} />
      </div>

      {stage === 'form' && (
        <div className={cx('grid gap-6', flow.aside && 'lg:grid-cols-[minmax(0,1fr)_360px]')}>
          <Card className="p-5 sm:p-8">
            <div className="mb-6 flex items-start gap-3 border-b border-navy-50 pb-6">
              <div className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-xl', flow.accent.tile)}>{flow.icon}</div>
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold tracking-tight text-navy-950">{flow.formTitle}</h1>
                <p className="mt-1 text-sm text-slate-600">{flow.formSub}</p>
              </div>
            </div>
            <form id="registration-form" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
              <p className="mb-5 text-[12.5px] text-slate-500">Fields marked <span className="font-semibold text-red-600">*</span> are required.</p>
              <RegistrationFields sections={sections} values={form.values} errors={form.errors} onChange={form.setField} onBlur={form.blurField} />
            </form>
            {/* Extras sit outside the <form> so their own buttons never submit it */}
            {flow.Extras && <div className="mt-6">{flow.Extras({ values: form.values, meta, setMeta, onNeedFields: (e) => { form.setErrors((x) => ({ ...x, ...e })); focusFirst(e) } })}</div>}
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-navy-50 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <BackButton onClick={back}>Back</BackButton>
              <Button type="submit" form="registration-form" size="lg" variant={flow.accent.button === 'saffron' ? 'primary' : flow.accent.button} disabled={submitting} aria-busy={submitting} className="w-full sm:w-auto"
                icon={submitting ? <Loader2 size={16} className="animate-spin" /> : undefined}>
                {submitting ? 'Creating account…' : flow.submitLabel}
              </Button>
            </div>
            <p className="mt-5 text-center text-sm text-slate-600">Already registered? <button onClick={() => nav(withNext('/login', next))} className="font-semibold text-saffron-700 hover:underline">Sign in</button></p>
          </Card>
          {flow.aside && <aside className="hidden lg:block"><div className="sticky top-24">{flow.aside(form.values, s)}</div></aside>}
        </div>
      )}

      {stage === 'otp' && (
        <Card className="p-6 sm:p-10">
          <OtpVerification email={val(form.values, 'email')} mobile={val(form.values, 'mobile')} onBack={() => setStage('form')} onVerified={onOtpVerified}
            onResend={() => s.toast('A new code was sent (prototype — enter any 6 digits)', 'info')} />
        </Card>
      )}

      {stage === 'check' && check && (
        <Card className="p-6 sm:p-10">
          <ProcessChecklist {...check} onDone={() => save(check.items)} />
        </Card>
      )}

      {stage === 'done' && created && (
        <Card className="p-6 sm:p-10">
          <SuccessPanel title={created.title} body={created.body} details={created.details} ctaLabel="Go to dashboard" onContinue={() => nav(created.home, { replace: true })} />
        </Card>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Student: optional eKYC (kept from the previous registration page)   */
/* ------------------------------------------------------------------ */

function StudentEKyc({ values, kyc, onChange, onNeedFields }: { values: RegValues; kyc?: EKycResult; onChange: (k?: EKycResult) => void; onNeedFields: (e: Record<string, string>) => void }) {
  const [open, setOpen] = useState(false)
  const name = val(values, 'name'), dob = val(values, 'dob')
  // details changed after verifying → the eKYC match no longer applies
  useEffect(() => { if (kyc && (kyc.name !== name || kyc.dob !== displayValue('dob', dob))) onChange(undefined) }, [name, dob]) // eslint-disable-line
  const start = () => {
    const e: Record<string, string> = {}
    if (!name) e.name = 'Enter your full name before verifying with eKYC.'
    if (!dob) e.dob = 'Enter your date of birth before verifying with eKYC.'
    if (Object.keys(e).length) { onNeedFields(e); return }
    setOpen(true)
  }
  return (
    <div className="rounded-xl border border-navy-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy-950"><Fingerprint size={15} />Verify identity with eKYC <Badge color="gray">Optional · recommended</Badge></p>
          <p className="mt-0.5 text-[12.5px] text-slate-600">Confirms your name and date of birth with Aadhaar or DigiLocker, so they don’t need document checks later.</p>
        </div>
        {!open && !kyc && <Button type="button" size="sm" variant="outline" onClick={start}>Verify now</Button>}
      </div>
      {kyc ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-leaf-700"><CheckCircle2 size={16} />Verified via {kyc.method === 'aadhaar' ? 'Aadhaar' : 'DigiLocker'} ({kyc.maskedId})
          <button type="button" className="text-xs font-semibold text-slate-500 hover:text-navy-900" onClick={() => { onChange(undefined); setOpen(true) }}>Redo</button></p>
      ) : open && (
        <div className="mt-4">
          <EKyc purpose="register" actionLabel="Use these verified details" identity={{ name, dob: displayValue('dob', dob), gender: 'Not provided', mobile: maskMobile(val(values, 'mobile')), address: val(values, 'address') || '—' }}
            onVerified={(r) => { onChange(r); setOpen(false) }} />
        </div>
      )}
    </div>
  )
}
