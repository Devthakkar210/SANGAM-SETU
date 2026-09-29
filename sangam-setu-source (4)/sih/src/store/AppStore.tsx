import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type {
  Application, AuditEntry, Deficiency, Disbursement, DocumentRec, Grievance, Lang, Notification, Role, Scheme, Stage, AppStatus, Flag, RenewalDraft, StudentAccount, StudentDetails, InstitutionAccount, AdminAccount } from '../types'
import {
  SCHEMES, SEED_APPS, EXTRA_NFST, PAST_APP, PREV_NFST, SEED_NOTIFICATIONS, SEED_GRIEVANCES, SEED_AUDIT, SEED_DISBURSEMENTS, DEMO_STUDENT_ID, DEMO_DETAILS, DEMO_VERIFIED, DEMO_INSTITUTION_ACCOUNT, DEMO_ADMIN_ACCOUNT, DEMO_CREDENTIALS, DEMO_INSTITUTION_ID, DEMO_ADMIN_ID,
} from '../data/mock'
import { DICTS } from '../lib/i18n'
import { now, uid } from '../lib/rules'

export const ROLE_META: Record<Role, { label: string; user: string; org: string; home: string }> = {
  student: { label: 'Student', user: 'Anjali Munda', org: 'PhD Scholar · Birsa Institute of Research & Technology', home: '/student/dashboard' },
  institution: { label: 'Institution', user: 'Dr. R. Tirkey', org: 'Nodal Officer · Birsa Institute of Research & Technology', home: '/institution/dashboard' },
  super_admin: { label: 'Super Admin', user: 'MoTA Super Admin', org: 'Ministry of Tribal Affairs · scrutiny, selection, disbursement & configuration', home: '/admin/dashboard' },
}

// Which admin areas each role can open. All officer functions sit with the Super Admin. Drives sidebar + route guard.
export const PERMISSIONS: Record<string, Role[]> = {
  '/admin/dashboard': ['super_admin'],
  '/admin/applications': ['super_admin'],
  '/admin/application': ['super_admin'],
  '/admin/selection': ['super_admin'],
  '/admin/disbursement': ['super_admin'],
  '/admin/scheme-builder': ['super_admin'],
  '/admin/grievances': ['super_admin'],
  '/admin/audit': ['super_admin'],
  '/admin/roles': ['super_admin'],
}

export interface Toast { id: string; text: string; kind: 'success' | 'info' | 'warning' | 'error' }

export interface Draft {
  schemeId: string
  step: number
  income: number
  extra: Record<string, string>
  docs: Record<string, DocumentRec>
  mismatch: 'none' | 'detected' | 'fixed' | 'replaced' | 'officer'
  savedAt?: string
  /** details the student typed in this application (saved to their profile on submit) */
  details?: Record<string, string>
  /** answers to scheme rules that the profile doesn't cover (e.g. study destination) */
  answers?: Record<string, string>
}

const initialDocs = (): Record<string, DocumentRec> => ({
  st_cert: { id: 'd1', type: 'st_cert', label: 'ST Certificate', fileName: 'ST_Certificate_DigiLocker.pdf', status: 'Verified by AI', confidence: 98, extracted: { Name: 'Anjali Munda', Tribe: 'Munda', 'Certificate no.': 'JH/RAN/ST/2019/00XX31', 'Issued by': 'Circle Officer, Ranchi Sadar' }, issuedOn: '2019-06-11' },
  marksheet: { id: 'd2', type: 'marksheet', label: 'PG Marksheet', fileName: 'MSc_Final_Marksheet.pdf', status: 'Verified by AI', confidence: 96, extracted: { Name: 'Anjali Munda', Degree: 'M.Sc. Environmental Science', Percentage: '78.4%', Year: '2023' } },
  bank: { id: 'd3', type: 'bank', label: 'Bank Passbook', fileName: 'SBI_Passbook_front.jpg', status: 'Verified by AI', confidence: 97, extracted: { 'Account holder': 'Anjali Munda', Account: 'XXXXXXXX3390', IFSC: 'SBIN0XXXX12' } },
})

interface State {
  lang: Lang
  fontScale: number
  highContrast: boolean
  lowBandwidth: boolean
  assisted: boolean
  role: Role
  /** Is someone signed in right now? */
  loggedIn: boolean
  /** A previous login remembered on this device (demo: Anjali Munda) */
  remembered: { name: string; mobile: string; lastAt: string; studentId?: string } | null
  /** registered student accounts (in memory) and the one currently signed in */
  students: StudentAccount[]
  studentId: string
  /** institution / administrator accounts (seeded demo accounts + ones created via Create Account) and the signed-in one */
  institutionAccounts: InstitutionAccount[]
  institutionAccountId: string | null
  adminAccounts: AdminAccount[]
  adminAccountId: string | null
  /** previous application verified on the Renewal page this session */
  renewalAuth: boolean
  renewalDraft: RenewalDraft | null
  schemes: Scheme[]
  applications: Application[]
  vault: Record<string, DocumentRec>
  deficiencies: Deficiency[]
  notifications: Notification[]
  grievances: Grievance[]
  audit: AuditEntry[]
  disbursements: Disbursement[]
  draft: Draft | null
  demoAppId: string | null
  eligibilityAnswers: Record<string, string | number> | null
}

const initial = (): State => ({
  lang: 'en', fontScale: 1, highContrast: false, lowBandwidth: false, assisted: false, role: 'student', loggedIn: false,
  remembered: { name: 'Anjali Munda', mobile: '+91 XXXXX X0217', lastAt: '2026-09-26 18:42', studentId: DEMO_STUDENT_ID },
  students: [{ id: DEMO_STUDENT_ID, details: DEMO_DETAILS, verified: DEMO_VERIFIED, kyc: { method: 'aadhaar', maskedId: 'XXXX XXXX 4821' }, createdAt: '2019-06-01', isDemo: true, vault: initialDocs() }],
  studentId: DEMO_STUDENT_ID,
  institutionAccounts: [DEMO_INSTITUTION_ACCOUNT], institutionAccountId: DEMO_INSTITUTION_ACCOUNT.id, adminAccounts: [DEMO_ADMIN_ACCOUNT], adminAccountId: DEMO_ADMIN_ACCOUNT.id,
  renewalAuth: false, renewalDraft: null,
  schemes: SCHEMES,
  applications: [PAST_APP, PREV_NFST, ...SEED_APPS, ...EXTRA_NFST],
  vault: initialDocs(),
  deficiencies: [
    { id: 'DEF-0142', applicationId: 'POST-MAT-2026-10242', title: 'Income certificate expired', reason: 'The certificate validity ended on 31 Mar 2026.', docType: 'income_cert', raisedBy: 'MoTA Super Admin (Super Admin)', raisedOn: '2026-09-26', status: 'Open' },
  ],
  notifications: SEED_NOTIFICATIONS,
  grievances: SEED_GRIEVANCES,
  audit: SEED_AUDIT,
  disbursements: [
    // Anjali's NFST 2025-26 fellowship (previous year of the renewal demo) — quarterly releases
    ...(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q, i) => ({ id: `DSB-39${i}0`, applicationId: 'NFST-2025-0001', studentName: 'Anjali Munda', schemeId: 'nfst', amount: 111000, status: 'Disbursed' as const, installment: `2025-26 · ${q}`, date: ['2025-11-20', '2026-01-18', '2026-04-16', '2026-07-15'][i], reference: `PFMS-PROTO-8${31204 + i * 977}` })),
    ...SEED_DISBURSEMENTS,
  ],
  draft: null,
  demoAppId: null,
  eligibilityAnswers: null,
})

/** Display name of whoever is signed in (registered institution/admin accounts use their own names). */
function nameFor(p: State) {
  if (p.role === 'student') return p.students.find((x) => x.id === p.studentId)?.details.name ?? 'Student'
  if (p.role === 'institution') return p.institutionAccounts.find((x) => x.id === p.institutionAccountId)?.nodal ?? ROLE_META.institution.user
  return p.adminAccounts.find((x) => x.id === p.adminAccountId)?.name ?? ROLE_META[p.role].user
}

function useStoreValue() {
  const [s, setS] = useState<State>(initial)
  const [toasts, setToasts] = useState<Toast[]>([])

  const set = useCallback((fn: (s: State) => Partial<State>) => setS((p) => ({ ...p, ...fn(p) })), [])

  const toast = useCallback((text: string, kind: Toast['kind'] = 'success') => {
    const id = uid('t')
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  const t = useCallback((k: string) => DICTS[s.lang][k] ?? DICTS.en[k] ?? k, [s.lang])

  const me = s.students.find((x) => x.id === s.studentId) ?? s.students[0]
  const myInstitution = s.institutionAccounts.find((x) => x.id === s.institutionAccountId) ?? null
  const myAdmin = s.adminAccounts.find((x) => x.id === s.adminAccountId) ?? null
  const actorName = nameFor(s)
  const actorRole = ROLE_META[s.role].label

  const log = useCallback((action: string, details: string, applicationId?: string, who?: { user: string; role: string }) => {
    set((p) => ({ audit: [{ id: uid('a'), user: who?.user ?? nameFor(p), role: who?.role ?? ROLE_META[p.role].label, action, details, applicationId, at: now() }, ...p.audit] }))
  }, [set])

  const notify = useCallback((n: Omit<Notification, 'id' | 'at' | 'read'>) => {
    set((p) => ({ notifications: [{ ...n, studentId: n.audience === 'student' ? n.studentId ?? p.studentId : undefined, id: uid('n'), at: now().replace(' ', 'T'), read: false }, ...p.notifications] }))
  }, [set])

  const advance = useCallback((appId: string, stage: Stage, status: AppStatus = 'In Progress', note?: string) => {
    set((p) => ({
      applications: p.applications.map((a) => a.id === appId ? {
        ...a, stage, status,
        history: [...a.history.filter((h) => h.stage !== stage), { stage, date: now(), note }],
      } : a),
    }))
  }, [set])

  const setStatus = useCallback((appId: string, status: AppStatus) => {
    set((p) => ({ applications: p.applications.map((a) => a.id === appId ? { ...a, status } : a) }))
  }, [set])

  const addRemark = useCallback((appId: string, text: string) => {
    set((p) => ({ applications: p.applications.map((a) => a.id === appId ? { ...a, remarks: [...a.remarks, { by: `${ROLE_META[p.role].user} (${ROLE_META[p.role].label})`, text, at: now() }] } : a) }))
  }, [set])

  const updateApp = useCallback((appId: string, patch: Partial<Application>) => {
    set((p) => ({ applications: p.applications.map((a) => a.id === appId ? { ...a, ...patch } : a) }))
  }, [set])

  const setFlags = useCallback((appId: string, fn: (f: Flag[]) => Flag[]) => {
    set((p) => ({ applications: p.applications.map((a) => a.id === appId ? { ...a, flags: fn(a.flags) } : a) }))
  }, [set])

  const raiseDeficiency = useCallback((d: Omit<Deficiency, 'id' | 'raisedOn' | 'status'> & { status?: Deficiency['status'] }) => {
    const id = `DEF-${Math.floor(1000 + Math.random() * 8999)}`
    set((p) => ({ deficiencies: [{ status: 'Open', ...d, id, raisedOn: now() }, ...p.deficiencies] }))
    return id
  }, [set])

  const resolveDeficiency = useCallback((id: string) => {
    set((p) => ({ deficiencies: p.deficiencies.map((d) => d.id === id ? { ...d, status: 'Resolved' } : d) }))
  }, [set])

  const markRead = useCallback((audience: Notification['audience']) => {
    set((p) => ({ notifications: p.notifications.map((n) => n.audience === audience && (audience !== 'student' || (n.studentId ?? DEMO_STUDENT_ID) === p.studentId) ? { ...n, read: true } : n) }))
  }, [set])

  const reset = useCallback(() => { setS(initial()); toast('Demo data reset', 'info') }, [toast])
  const signOut = useCallback(() => { setS((p) => ({ ...p, loggedIn: false, renewalAuth: false })) }, [])

  /** Sign a student account in: park the current student's vault on their account and load the next one's. */
  const switchStudent = useCallback((id: string) => {
    setS((p) => {
      if (p.studentId === id) return p
      const students = p.students.map((a) => (a.id === p.studentId ? { ...a, vault: p.vault } : a))
      const next = students.find((a) => a.id === id)
      if (!next) return p
      return { ...p, students, studentId: id, vault: { ...next.vault } as Record<string, DocumentRec>, draft: null, renewalDraft: null, renewalAuth: false, eligibilityAnswers: null }
    })
  }, [])
  /** Create a new student account (starts with only what the student typed — nothing from the demo account). */
  const createStudent = useCallback((details: Partial<StudentDetails>, verified: StudentAccount['verified'] = {}, kyc?: StudentAccount['kyc'], vault: StudentAccount['vault'] = {}) => {
    const id = `STU-${String(100 + Math.floor(Math.random() * 900))}`
    setS((p) => ({ ...p, students: [...p.students, { id, details, verified, kyc, createdAt: now(), vault }] }))
    return id
  }, [])
  /** Save details into the signed-in account (e.g. what the student typed while applying). */
  const updateStudent = useCallback((details: Partial<StudentDetails>, verified?: StudentAccount['verified']) => {
    setS((p) => ({ ...p, students: p.students.map((a) => (a.id === p.studentId ? { ...a, details: { ...a.details, ...details }, verified: { ...a.verified, ...(verified ?? {}) } } : a)) }))
  }, [])

  /** Save a registered institution (Institute DB) and return its id. */
  const createInstitution = useCallback((acc: Omit<InstitutionAccount, 'id' | 'createdAt'>) => {
    const id = `INST-${String(100 + Math.floor(Math.random() * 900))}`
    setS((p) => ({ ...p, institutionAccounts: [...p.institutionAccounts, { ...acc, id, createdAt: now() }] }))
    return id
  }, [])
  /** Save a registered administrator (Admin DB) and return its id. */
  const createAdmin = useCallback((acc: Omit<AdminAccount, 'id' | 'createdAt'>) => {
    const id = `ADM-${String(100 + Math.floor(Math.random() * 900))}`
    setS((p) => ({ ...p, adminAccounts: [...p.adminAccounts, { ...acc, id, createdAt: now() }] }))
    return id
  }, [])

  /**
   * One-click demo sign-in. Checks the demo credentials for the role, signs in to the matching seeded account
   * and returns the role's dashboard path (or null if the credentials don't match a demo account).
   */
  const demoSignIn = useCallback((role: Role, email: string, password: string) => {
    const c = DEMO_CREDENTIALS[role]
    if (!c || c.email !== email.trim().toLowerCase() || c.password !== password) return null
    if (role === 'student') switchStudent(DEMO_STUDENT_ID)
    const who = role === 'student' ? DEMO_DETAILS.name : role === 'institution' ? DEMO_INSTITUTION_ACCOUNT.nodal : DEMO_ADMIN_ACCOUNT.name
    const stamp = now()
    setS((p) => ({
      ...p, role, loggedIn: true,
      institutionAccountId: role === 'institution' ? DEMO_INSTITUTION_ID : p.institutionAccountId,
      adminAccountId: role === 'super_admin' ? DEMO_ADMIN_ID : p.adminAccountId,
      remembered: role === 'student' ? { name: who, mobile: '+91 XXXXX X0217', lastAt: stamp, studentId: DEMO_STUDENT_ID } : p.remembered,
      audit: [{ id: uid('a'), user: who, role: ROLE_META[role].label, action: 'Signed in', details: `Demo account (${c.email}) · Role: ${ROLE_META[role].label}`, at: stamp }, ...p.audit],
    }))
    return ROLE_META[role].home
  }, [switchStudent])

  return {
    ...s, set, toasts, toast, t, log, notify, advance, setStatus, addRemark, updateApp, setFlags,
    raiseDeficiency, resolveDeficiency, markRead, reset, signOut, actorName, actorRole,
    switchStudent, createStudent, updateStudent, createInstitution, createAdmin, demoSignIn, myInstitution, myAdmin, me, isDemoStudent: !!me.isDemo,
    /** student notifications belonging to the signed-in student */
    studentNotes: s.notifications.filter((n) => n.audience === 'student' && (n.studentId ?? DEMO_STUDENT_ID) === s.studentId),
    /** id of the signed-in student account (name kept for compatibility) */
    demoStudentId: s.studentId,
    initialDocs,
  }
}

export type Store = ReturnType<typeof useStoreValue>
const Ctx = createContext<Store | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const v = useStoreValue()
  const value = useMemo(() => v, [v])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStore outside provider')
  return c
}

export const schemeById = (schemes: Scheme[], id: string) => schemes.find((s) => s.id === id)
