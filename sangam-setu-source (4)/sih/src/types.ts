// Domain model for the prototype. Mirrors the tables a production backend would hold.

export type Role =
  | 'student'
  | 'institution'
  | 'super_admin'

export type Lang = 'en' | 'hi' | 'gu'

export interface User {
  id: string
  name: string
  role: Role
  org: string
}

export type RuleField =
  | 'category'
  | 'educationLevel'
  | 'income'
  | 'marks'
  | 'destination'
  | 'institutionType'
  | 'researchStatus'
  | 'studyLocation'

export type RuleOp = '=' | '!=' | '<=' | '>=' | 'in'

export interface EligibilityRule {
  id: string
  field: RuleField
  op: RuleOp
  value: string | number | string[]
}

export interface DocRequirement {
  key: DocType
  label: string
  mandatory: boolean
}

export type DocType = 'st_cert' | 'income_cert' | 'marksheet' | 'bonafide' | 'bank' | 'research_reg' | 'admission_letter' | 'passport' | 'progress_report'

export interface SchemeField {
  key: string
  label: string
  type: 'text' | 'date' | 'select' | 'number'
  options?: string[]
  placeholder?: string
}

export interface Scheme {
  id: string
  code: string
  name: string
  short: string
  description: string
  level: string
  incomeLabel: string
  benefits: string[]
  period: { opens: string; closes: string }
  dates: { label: string; date: string }[]
  rules: EligibilityRule[]
  documents: DocRequirement[]
  extraFields: SchemeField[]
  workflow: string[]
  notifications: { trigger: string; channel: string }[]
  color: string
  renewable: boolean
  years?: number
  status: 'Live' | 'Draft'
  budgetCr: number
  /** Renewal configuration: which documents must be fresh each year and which permanent ones are reused */
  renewal?: { documents: DocRequirement[]; reuse: DocType[] }
}

export type Stage =
  | 'Draft'
  | 'Submitted'
  | 'AI Document Check'
  | 'Institution Verification'
  | 'State Scrutiny'
  | 'Selection Committee'
  | 'Sanction'
  | 'Disbursement'

export const STAGES: Stage[] = [
  'Submitted',
  'AI Document Check',
  'Institution Verification',
  'State Scrutiny',
  'Selection Committee',
  'Sanction',
  'Disbursement',
]

export type AppStatus =
  | 'Draft'
  | 'In Progress'
  | 'Correction Requested'
  | 'Further Review'
  | 'Selected'
  | 'Waitlisted'
  | 'Not Selected'
  | 'Disbursed'

export interface Flag {
  id: string
  type: 'Low AI confidence' | 'Income mismatch' | 'Name mismatch' | 'Duplicate application' | 'Duplicate bank details' | 'Expired certificate' | 'Document inconsistency' | 'Blurry document'
  severity: 'low' | 'medium' | 'high'
  explanation: string
  confidence: number
  resolved?: boolean
  docType?: DocType
  resolvedBy?: string
}

export interface TimelineEntry {
  stage: Stage
  date?: string
  note?: string
}

export interface Application {
  id: string
  studentId: string
  studentName: string
  schemeId: string
  institutionId: string
  state: string
  course: string
  income: number
  marks: number
  stage: Stage
  status: AppStatus
  submittedOn: string
  flags: Flag[]
  history: TimelineEntry[]
  remarks: { by: string; text: string; at: string }[]
  amount: number
  gender: 'F' | 'M'
  priority: string[]
  extra?: Record<string, string>
  /** 'new' (default when missing) or 'renewal' — a renewal is always a separate record linked to the previous one */
  applicationType?: 'new' | 'renewal'
  previousApplicationId?: string | null
  renewalYear?: string | null
  renewal?: RenewalData
}

/** Status of one renewal document through AI verification and human review. */
export type RenewalDocStatus = 'NOT_UPLOADED' | 'UPLOADED' | 'PROCESSING' | 'VERIFIED' | 'HUMAN_REVIEW' | 'DEFICIENCY' | 'REJECTED' | 'RESUBMITTED' | 'FINAL_VERIFIED'

export interface VerificationSignal { label: string; score: number; critical?: boolean }

export interface RenewalDoc {
  key: DocType
  label: string
  status: RenewalDocStatus
  fileName?: string
  attempts: number
  detected?: string
  /** overall verification confidence computed from all signals */
  overall?: number
  signals?: VerificationSignal[]
  /** critical mismatches — any one sends the document to human review */
  critical?: string[]
  reason?: string
  fields?: Record<string, string>
  previous?: string
  reviewedBy?: string
  reviewNote?: string
}

export interface RenewalField { label: string; previous: string; current: string; group: string }

export interface RenewalData {
  /** stable information reused from the previous application */
  stable: { label: string; value: string }[]
  /** changeable information: previous vs current */
  fields: RenewalField[]
  reusedDocs: { key: DocType; label: string; from: string }[]
  docs: RenewalDoc[]
  report?: { generatedAt: string; overall: 'PASSED' | 'PENDING HUMAN REVIEW'; required: number; auto: number; review: number; deficiencies: number }
}

export interface DocumentRec {
  id: string
  type: DocType
  label: string
  fileName: string
  status: 'Not uploaded' | 'Processing' | 'Verified by AI' | 'Needs attention' | 'Officer review'
  extracted: Record<string, string>
  confidence?: number
  issue?: string
  issuedOn?: string
  validTill?: string
}

export interface Deficiency {
  id: string
  applicationId: string
  title: string
  reason: string
  field?: string
  docType?: DocType
  raisedBy: string
  raisedOn: string
  status: 'Open' | 'Resolved' | 'With officer'
}

export interface Notification {
  id: string
  title: string
  body: string
  at: string
  read: boolean
  channel: ('in-app' | 'sms' | 'email')[]
  kind: 'info' | 'action' | 'success' | 'warning'
  audience: 'student' | 'institution' | 'admin'
  /** which student account a student notification belongs to */
  studentId?: string
}

export interface Grievance {
  id: string
  category: string
  subject: string
  description: string
  applicationId?: string
  status: 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed'
  assignedTo?: string
  createdOn: string
  attachment?: string
  channel?: 'Web form' | 'AI assistant' | 'Helpdesk agent'
  priority?: 'Normal' | 'High'
  studentId?: string
  thread: { by: string; text: string; at: string }[]
}

export interface AuditEntry {
  id: string
  user: string
  role: string
  action: string
  applicationId?: string
  details: string
  at: string
}

export interface Disbursement {
  id: string
  applicationId: string
  studentName: string
  schemeId: string
  amount: number
  status: 'Pending' | 'Processing' | 'Disbursed' | 'Failed'
  date?: string
  reference?: string
  installment: string
}

export interface Institution {
  id: string
  name: string
  code: string
  state: string
  type: string
  nodal: string
}

export interface StudentProfile {
  id: string
  name: string
  fields: { section: string; items: { label: string; value: string; verified: boolean; source?: string }[] }[]
}

/** In-progress renewal (kept in memory so the student can leave and come back). */
export interface RenewalDraft {
  step: number
  form: Record<string, string>
  confirmed: Record<string, boolean>
  docs: RenewalDoc[]
  reportDownloaded?: boolean
  savedAt: string
}

/** Everything a student account knows about the student. Filled at registration and while applying. */
export interface StudentDetails {
  name: string; dob: string; gender: string; mobile: string; email: string; aadhaarLast4: string
  tribe: string; state: string; district: string; pin: string; address: string; guardian: string; parentOccupation: string; disability: string
  qualification: string; qualificationMarks: string; currentCourse: string; courseLevel: string; institutionId: string; yearOfStudy: string
  bankAccount: string; ifsc: string; bankName: string; aadhaarSeeded: string
  income: string
  /** captured at account creation */
  enrollmentNo: string; category: string; semester: string
}
export interface StudentAccount {
  id: string
  details: Partial<StudentDetails>
  /** field → how it was verified (e.g. "Aadhaar eKYC", "Institution"). Fields not listed are self-declared. */
  verified: Partial<Record<keyof StudentDetails, string>>
  kyc?: { method: 'aadhaar' | 'digilocker'; maskedId: string }
  createdAt: string
  isDemo?: boolean
  vault: Partial<Record<DocType, DocumentRec>>
}

/** An institution registered through Create Account (in memory). The seeded demo institution lives in INSTITUTIONS. */
export interface InstitutionAccount {
  id: string
  name: string; type: string; state: string; code: string; aishe: string
  nodal: string; designation: string; email: string; phone: string
  courses: string[]; schemes: string[]
  createdAt: string
  /** set once the (prototype) institute verification step has passed */
  verifiedAt?: string
  /** checks that passed with a note for the State Nodal Cell */
  reviewNotes?: string[]
  /** pre-registered demo account */
  isDemo?: boolean
}

/** An administrator registered through Create Account (in memory). */
export interface AdminAccount {
  id: string
  name: string; email: string; mobile: string
  role: Role
  createdAt: string
  /** official user ID used to sign in (in addition to email) */
  userId?: string
  isDemo?: boolean
}
