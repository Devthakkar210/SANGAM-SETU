import type { ReactNode } from 'react'
import { GraduationCap, Building2, ShieldCheck, Lock, Check, PlayCircle, Sparkles, MessageSquareWarning, Globe, Accessibility, Bot, Plus, Search } from 'lucide-react'
import type { Role } from '../../types'
import { STAGES } from '../../types'
import { AIBadge, Badge, ProtoTag, cx } from '../ui'
import { MkBar, MkBtn, MkCard, MkField, MkRow, MkStages, MkStat, MkTitle, Spot, type ScreenPortal } from './TourScreen'

/*
 * Product tour content. Every step describes a screen that exists in this app and links to its real route.
 * Scenes are simplified replicas; values are the fictional seed data from src/data/mock.ts where possible.
 */

export type ChapterId = 'start' | 'student' | 'institute' | 'admin' | 'help'

export const CHAPTERS: { id: ChapterId; label: string }[] = [
  { id: 'start', label: 'Get started' },
  { id: 'student', label: 'Student' },
  { id: 'institute', label: 'Institute' },
  { id: 'admin', label: 'Admin' },
  { id: 'help', label: 'Help & access' },
]

export interface TourStep {
  id: string
  chapter: ChapterId
  title: string
  summary: string
  who: string
  action: string
  result: string
  screen: { portal: ScreenPortal; url: string; active?: string; spotNav?: boolean; scene: () => ReactNode }
  /** "Try it yourself": role → sign in to that demo account first; no role → public page */
  tryIt?: { label: string; to: string; role?: Role }
}

const SHORT_STAGES = STAGES.map((s) => s.replace('AI Document Check', 'AI check').replace('Institution Verification', 'Institution').replace('State Scrutiny', 'Scrutiny').replace('Selection Committee', 'Selection'))
const tick = <Check size={11} className="text-leaf-600" aria-hidden />

export const TOUR_STEPS: TourStep[] = [
  /* ------------------------------ Get started ------------------------------ */
  {
    id: 'create', chapter: 'start', title: 'Create an account',
    summary: 'One Create Account page serves all three kinds of user. Each account only sees the information it is authorised for.',
    who: 'Students, institute nodal officers and MoTA officials',
    action: 'Choose Student, Institute or Admin, fill in the form for that role and confirm your email with a one-time password.',
    result: 'The account is saved and you land on your own dashboard. Institutes pass verification checks first; admins are given the Super Admin role, which is audit-logged.',
    screen: {
      portal: 'public', url: '/register', scene: () => (
        <>
          <MkTitle title="Create Your Account" sub="Choose the type of account you need." />
          <div className="grid gap-2.5 sm:grid-cols-3">
            {[
              { n: 'Student', d: 'Apply once with a verified profile and track to disbursement.', i: <GraduationCap size={16} />, tile: 'bg-saffron-50 text-saffron-700', bar: 'bg-saffron-500', b: 'saffron' as const },
              { n: 'Institute', d: 'Register your institution and nodal officer to verify applicants.', i: <Building2 size={16} />, tile: 'bg-navy-900 text-white', bar: 'bg-navy-900', b: 'primary' as const },
              { n: 'Admin', d: 'For MoTA officials who run scrutiny, selection and payments.', i: <ShieldCheck size={16} />, tile: 'bg-leaf-50 text-leaf-700', bar: 'bg-leaf-600', b: 'success' as const },
            ].map((r) => (
              <Spot key={r.n} note={r.n === 'Student' ? 'Pick your role' : undefined} on={r.n === 'Student'}>
                <div className="relative h-full overflow-hidden rounded-xl border border-navy-100/80 bg-white p-3 shadow-card">
                  <span className={cx('absolute inset-x-0 top-0 h-1', r.bar)} />
                  <span className={cx('grid h-8 w-8 place-items-center rounded-lg', r.tile)}>{r.i}</span>
                  <p className="mt-2 font-display text-[13px] font-bold text-navy-950">{r.n}</p>
                  <p className="mt-1 text-[10.5px] leading-snug text-slate-600">{r.d}</p>
                  <div className="mt-2.5"><MkBtn v={r.b}>Create as {r.n}</MkBtn></div>
                </div>
              </Spot>
            ))}
          </div>
          <MkCard className="mt-3" title="Then: sign in any time">
            <div className="grid gap-2 text-[11px] text-slate-600 sm:grid-cols-3">
              <p><b className="text-navy-950">Student</b> — mobile OTP, or eKYC with Aadhaar / DigiLocker</p>
              <p><b className="text-navy-950">Institute</b> — official email, institution code or AISHE code</p>
              <p><b className="text-navy-950">Admin</b> — official email or admin user ID</p>
            </div>
          </MkCard>
        </>
      ),
    },
    tryIt: { label: 'Open Create Account', to: '/register' },
  },
  {
    id: 'eligibility', chapter: 'start', title: 'Find a scholarship that fits',
    summary: 'The Eligibility Finder matches a student against the rules of every live scheme — no account needed.',
    who: 'Anyone, before or after signing up',
    action: 'Answer a few questions about category, education level, income and marks.',
    result: 'Matching schemes are listed with the reason for each match, and a Start application button that leads to sign-in.',
    screen: {
      portal: 'public', url: '/eligibility', active: 'eligibility', spotNav: false, scene: () => (
        <>
          <MkTitle title="Find my scholarship" sub="Answers: ST · MPhil/PhD · family income ₹2,40,000" />
          <Spot note="Why it matched">
            <MkCard>
              <div className="flex items-center justify-between gap-2"><p className="text-[12.5px] font-bold text-navy-950">National Fellowship for ST Students</p><Badge color="green">Eligible</Badge></div>
              <ul className="mt-2 grid gap-1 text-[11px] text-slate-600 sm:grid-cols-2">
                {['Category is Scheduled Tribe', 'Education level is MPhil/PhD', 'Family income within the limit', 'Registered for research'].map((r) => <li key={r} className="flex items-center gap-1.5">{tick}{r}</li>)}
              </ul>
              <div className="mt-2.5 flex gap-2"><MkBtn>Start application</MkBtn><MkBtn v="outline">View scheme</MkBtn></div>
            </MkCard>
          </Spot>
          <MkCard className="mt-3">
            <MkRow left="Post-Matric Scholarship for ST Students" sub="Not a match: education level is above post-matric" right={<Badge color="gray">Not eligible</Badge>} />
            <MkRow left="National Overseas Scholarship" sub="Needs an overseas admission" right={<Badge color="amber">Check</Badge>} />
          </MkCard>
        </>
      ),
    },
    tryIt: { label: 'Open the Eligibility Finder', to: '/eligibility' },
  },

  /* -------------------------------- Student -------------------------------- */
  {
    id: 'student-dashboard', chapter: 'student', title: 'Student dashboard',
    summary: 'The home screen after signing in: the current application, anything that needs action, and schemes the profile matches.',
    who: 'Students',
    action: 'Open the tracker, resolve a deficiency, or start the application the dashboard suggests.',
    result: 'Each card jumps straight to the right page, so the student never has to hunt for the next step.',
    screen: {
      portal: 'student', url: '/student/dashboard', active: '/student/dashboard', scene: () => (
        <>
          <MkTitle title="Welcome back, Anjali" sub="PhD, Environmental Science · Birsa Institute of Research & Technology" />
          <Spot note="Suggested for you">
            <div className="rounded-xl bg-navy-950 p-3.5 text-white">
              <div className="flex items-center gap-2"><Badge color="violet">Profile match</Badge></div>
              <p className="mt-2 font-display text-[14px] font-bold">You may be eligible for the National Fellowship for ST Students</p>
              <div className="mt-2.5"><MkBtn v="saffron">Start NFST application</MkBtn></div>
            </div>
          </Spot>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MkStat label="Active applications" value="0" /><MkStat label="Pending actions" value="0" tone="leaf" /><MkStat label="Documents verified" value="3/3" tone="leaf" /><MkStat label="Unread notifications" value="2" tone="violet" />
          </div>
        </>
      ),
    },
    tryIt: { label: 'Open the Student Dashboard', to: '/student/dashboard', role: 'student' },
  },
  {
    id: 'student-profile', chapter: 'student', title: 'A verified profile, reused',
    summary: 'My Profile shows every detail and how it was verified — by eKYC, the institute, or OCR on a document.',
    who: 'Students',
    action: 'Check the profile and edit any self-declared field. Verified fields are locked.',
    result: 'Every new application is pre-filled from this profile, so the same details are never typed twice.',
    screen: {
      portal: 'student', url: '/student/profile', active: '/student/profile', scene: () => (
        <>
          <MkTitle title="My Profile" sub="Profile 100% complete" />
          <Spot note="Verified once, reused everywhere">
            <MkCard title="Personal details">
              <div className="grid gap-2 sm:grid-cols-2">
                <MkField label="Full name" value="Anjali Munda" locked="Verified" />
                <MkField label="Date of birth" value="14 Mar 1999" locked="Verified" />
                <MkField label="Tribe" value="Munda" locked="Verified" />
                <MkField label="Aadhaar" value="XXXX XXXX 4821" locked="Verified" />
              </div>
            </MkCard>
          </Spot>
          <MkCard className="mt-3" title="Academic details">
            <div className="grid gap-2 sm:grid-cols-2"><MkField label="Current course" value="PhD, Environmental Science" locked="Institution" /><MkField label="Year of study" value="2nd Year" /></div>
          </MkCard>
        </>
      ),
    },
    tryIt: { label: 'Open My Profile', to: '/student/profile', role: 'student' },
  },
  {
    id: 'apply', chapter: 'student', title: 'Apply with a guided form',
    summary: 'The application checks eligibility against the scheme’s rules first, then asks only for what the profile does not already hold.',
    who: 'Students',
    action: 'Confirm the pre-filled details, answer the scheme-specific questions and add documents. Save a draft at any point.',
    result: 'A review page shows the whole application before you submit it.',
    screen: {
      portal: 'student', url: '/student/apply/nfst', active: '/student/applications', scene: () => (
        <>
          <MkTitle title="Apply · National Fellowship for ST Students" action={<MkBtn v="outline">Save draft</MkBtn>} />
          <ol className="mb-3 flex flex-wrap gap-1.5 text-[10.5px]">
            {['Eligibility', 'Personal', 'Academic & family', 'Bank & income', 'Documents', 'Review'].map((st, k) => (
              <li key={st} className={cx('rounded-full px-2 py-0.5 font-semibold', k < 2 ? 'bg-leaf-50 text-leaf-700' : k === 2 ? 'bg-saffron-500 text-navy-950' : 'bg-navy-50 text-slate-500')}>{k + 1}. {st}</li>
            ))}
          </ol>
          <Spot note="Pre-filled from your profile">
            <MkCard title="Academic & family details">
              <div className="grid gap-2 sm:grid-cols-2">
                <MkField label="Qualifying degree" value="M.Sc. Environmental Science" locked="Verified" />
                <MkField label="Marks" value="78.4%" locked="OCR" />
                <MkField label="PhD registration date" value="Add date" />
                <MkField label="Research supervisor" value="Add name" />
              </div>
            </MkCard>
          </Spot>
          <div className="mt-3 flex justify-end gap-2"><MkBtn v="outline">Back</MkBtn><MkBtn>Continue</MkBtn></div>
        </>
      ),
    },
    tryIt: { label: 'Start an NFST application', to: '/student/apply/nfst', role: 'student' },
  },
  {
    id: 'ai-check', chapter: 'student', title: 'Documents are checked on upload',
    summary: 'Each document is read by OCR and cross-checked against the form, with a confidence score and a plain-language reason for every flag.',
    who: 'Students (and later the reviewing official)',
    action: 'Upload documents. If a mismatch is flagged, use Fix Information or Replace Document before submitting.',
    result: 'Anything below the 90% confidence threshold goes to a MoTA official instead of being accepted automatically. The AI never approves or rejects.',
    screen: {
      portal: 'student', url: '/student/apply/nfst', active: '/student/applications', scene: () => (
        <>
          <MkTitle title="Documents for NFST" action={<AIBadge label="AI-assisted review" />} />
          <MkCard>
            <MkRow left="ST Certificate" sub="Read at 98% confidence" right={<Badge color="green">Verified by AI</Badge>} />
            <MkRow left="PhD registration letter" sub="Read at 76% — below the 90% threshold" right={<Badge color="amber">Officer review</Badge>} />
          </MkCard>
          <Spot className="mt-3" note="Mismatch explained">
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-[12px] font-bold text-red-800">Income mismatch · 94% confidence</p>
              <p className="mt-1 text-[11px] text-red-800/90">The form says ₹2,40,000 but the income certificate shows ₹3,20,000.</p>
              <div className="mt-2 flex flex-wrap gap-2"><MkBtn>Fix Information</MkBtn><MkBtn v="outline">Replace Document</MkBtn></div>
            </div>
          </Spot>
        </>
      ),
    },
    tryIt: { label: 'Try the document check', to: '/student/apply/nfst', role: 'student' },
  },
  {
    id: 'tracker', chapter: 'student', title: 'Track every stage',
    summary: 'My Applications shows each application with a stage-by-stage tracker, dates and remarks from officials.',
    who: 'Students',
    action: 'Select an application to open its tracker, or switch to Explore schemes to start a new one.',
    result: 'The student always knows who has the application now and what happens next.',
    screen: {
      portal: 'student', url: '/student/applications', active: '/student/applications', scene: () => (
        <>
          <MkTitle title="My Applications" action={<MkBtn><Plus size={11} />New application</MkBtn>} />
          <div className="mb-3 flex gap-1 text-[11px]"><span className="rounded-md bg-white px-2 py-1 font-semibold text-navy-950 shadow-card">My applications</span><span className="px-2 py-1 text-slate-500">Explore schemes</span></div>
          <Spot note="Where it is now">
            <MkCard>
              <div className="mb-2.5 flex items-center justify-between gap-2"><p className="text-[12.5px] font-bold text-navy-950">NFST · 2026-27</p><Badge color="navy">In Progress</Badge></div>
              <MkStages stages={SHORT_STAGES} at={2} />
              <p className="mt-2.5 text-[11px] text-slate-600">With <b>Birsa Institute of Research & Technology</b> for enrolment verification.</p>
            </MkCard>
          </Spot>
        </>
      ),
    },
    tryIt: { label: 'Open My Applications', to: '/student/applications', role: 'student' },
  },
  {
    id: 'deficiency', chapter: 'student', title: 'Fix a deficiency, not the whole form',
    summary: 'Documents & Deficiencies keeps the document vault and any corrections an institute or official has asked for.',
    who: 'Students',
    action: 'When a correction is requested, open it, replace the one document or field, and resubmit.',
    result: 'The application continues from where it stopped — no fresh application needed.',
    screen: {
      portal: 'student', url: '/student/documents', active: '/student/documents', scene: () => (
        <>
          <MkTitle title="Documents & Deficiencies" />
          <Spot note="Only this needs fixing">
            <div className="rounded-xl border border-saffron-400 bg-saffron-50 p-3">
              <p className="text-[12px] font-bold text-navy-950">Income certificate expired</p>
              <p className="mt-0.5 text-[11px] text-slate-600">Raised by MoTA Super Admin · The certificate validity has ended.</p>
              <div className="mt-2"><MkBtn>Resolve Deficiency</MkBtn></div>
            </div>
          </Spot>
          <MkCard className="mt-3" title="Document vault">
            <MkRow left="ST_Certificate_DigiLocker.pdf" sub="ST Certificate" right={<Badge color="green">Verified by AI</Badge>} />
            <MkRow left="MSc_Final_Marksheet.pdf" sub="PG Marksheet" right={<Badge color="green">Verified by AI</Badge>} />
            <MkRow left="SBI_Passbook_front.jpg" sub="Bank Passbook" right={<Badge color="green">Verified by AI</Badge>} />
          </MkCard>
        </>
      ),
    },
    tryIt: { label: 'Open Documents & Deficiencies', to: '/student/documents', role: 'student' },
  },
  {
    id: 'renewal', chapter: 'student', title: 'Renew without starting over',
    summary: 'Renewal finds last year’s application and reuses the permanent details and documents. Only what changed is asked for.',
    who: 'Students with an ongoing scholarship or fellowship',
    action: 'Verify the previous application, review the reused profile, update this year’s details and upload the renewal documents.',
    result: 'A new, linked renewal record is created (the old one is kept) with a downloadable verification report.',
    screen: {
      portal: 'student', url: '/student/renewal', active: '/student/renewal', scene: () => (
        <>
          <MkTitle title="Renew Your Scholarship" sub="NFST-2025-0001 (2025-26) → NFST-REN-2026-0001 (2026-27)" />
          <div className="grid gap-3 sm:grid-cols-2">
            <MkCard title="Permanent information reused">
              <p className="flex items-center gap-1.5 text-[11px] text-leaf-700">{tick}13 fields retrieved from previous application</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-leaf-700">{tick}2 permanent documents reused</p>
            </MkCard>
            <Spot note="Only what changed">
              <MkCard title="Update current information">
                <MkRow left="Year of study" sub="Last year: 2nd Year" right={<span className="text-[11px] font-semibold text-navy-950">3rd Year</span>} />
                <MkRow left="CGPA" sub="Last year: 7.8" right={<span className="text-[11px] font-semibold text-navy-950">8.2</span>} />
                <MkRow left="Family income" sub="Last year: ₹2,40,000" right={<span className="text-[11px] font-semibold text-navy-950">₹2,70,000</span>} />
              </MkCard>
            </Spot>
          </div>
        </>
      ),
    },
    tryIt: { label: 'Open Renewal Application', to: '/student/renewal', role: 'student' },
  },
  {
    id: 'disbursement', chapter: 'student', title: 'See every payment',
    summary: 'Disbursement & Renewal lists each instalment with its date, status and payment reference.',
    who: 'Students',
    action: 'Check the payment history or download a statement.',
    result: 'A missing payment can be raised as a grievance straight from here.',
    screen: {
      portal: 'student', url: '/student/disbursement', active: '/student/disbursement', scene: () => (
        <>
          <MkTitle title="Disbursement & Renewal" action={<ProtoTag label="PFMS Integration – Prototype" />} />
          <Spot note="Payment reference for each instalment">
            <MkCard title="Payment history">
              {['Q1', 'Q2', 'Q3', 'Q4'].map((q, k) => (
                <MkRow key={q} left={`2025-26 · ${q} · ₹1,11,000`} sub={`Ref PFMS-PROTO-8${31204 + k * 977}`} right={<Badge color="green">Disbursed</Badge>} />
              ))}
            </MkCard>
          </Spot>
        </>
      ),
    },
    tryIt: { label: 'Open Disbursement', to: '/student/disbursement', role: 'student' },
  },
  {
    id: 'grievance', chapter: 'student', title: 'Get help with a grievance',
    summary: 'A menu-driven assistant handles common problems — money not received, a document unavailable, a file too large — or hands over to an agent.',
    who: 'Students',
    action: 'Pick the problem, follow the guided answers, or write a detailed grievance.',
    result: 'The complaint gets a ticket and appears on the MoTA dashboard and in Admin → Grievances.',
    screen: {
      portal: 'student', url: '/student/grievance', active: '/student/grievance', scene: () => (
        <>
          <MkTitle title="Grievance" action={<MkBtn v="outline">Write a detailed grievance</MkBtn>} />
          <MkCard>
            <div className="max-w-[85%] rounded-lg rounded-tl-sm bg-navy-50 px-2.5 py-2 text-[11.5px] text-navy-950">What do you need help with?</div>
            <Spot className="mt-2.5" note="Choose your problem">
              <div className="flex flex-wrap gap-1.5 p-1.5">
                {['Money not received', 'Document unavailable', 'File too large', 'Talk to an agent'].map((o) => <span key={o} className="rounded-full border border-navy-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-navy-900">{o}</span>)}
              </div>
            </Spot>
          </MkCard>
          <MkCard className="mt-3" title="My complaints">
            <MkRow left="Fellowship Q1 not credited" sub="Ticket raised through the assistant" right={<Badge color="amber">Assigned</Badge>} />
          </MkCard>
        </>
      ),
    },
    tryIt: { label: 'Open the grievance assistant', to: '/student/grievance', role: 'student' },
  },

  /* ------------------------------- Institute ------------------------------- */
  {
    id: 'inst-overview', chapter: 'institute', title: 'Institute overview',
    summary: 'The nodal officer’s home screen: verification numbers for the cycle and the queue of applications waiting for them.',
    who: 'Institute nodal officers',
    action: 'Scan the counts, then pick an application from the verification queue on the same page.',
    result: 'AI flags are shown next to each application as advice, so the officer knows what to look at first.',
    screen: {
      portal: 'institution', url: '/institution/dashboard', active: '/institution/dashboard', scene: () => (
        <>
          <MkTitle title="Overview" sub="Birsa Institute of Research & Technology · Dr. R. Tirkey" />
          <Spot note="What needs you">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MkStat label="Pending verification" value="6" tone="saffron" /><MkStat label="Verified this cycle" value="18" tone="leaf" /><MkStat label="Returned / deficiencies" value="2" tone="red" /><MkStat label="AI flags to look at" value="3" tone="violet" />
            </div>
          </Spot>
          <MkCard className="mt-3" title="Verification progress">
            <MkBar value={72} tone="bg-leaf-500" />
            <p className="mt-1.5 text-[10.5px] text-slate-500">Values in this preview are illustrative.</p>
          </MkCard>
        </>
      ),
    },
    tryIt: { label: 'Open the Institute Dashboard', to: '/institution/dashboard', role: 'institution' },
  },
  {
    id: 'inst-verify', chapter: 'institute', title: 'Verify enrolment',
    summary: 'The officer confirms the student is enrolled as stated, or returns the application with a reason.',
    who: 'Institute nodal officers',
    action: 'Open an application and choose Verify enrolment, or Return for correction with a note. Clean applications can be verified in bulk.',
    result: 'Verified applications move on to State Scrutiny. Returned ones reach the student as a deficiency to fix.',
    screen: {
      portal: 'institution', url: '/institution/dashboard', active: '/institution/dashboard', scene: () => (
        <>
          <MkTitle title="Student verification" action={<MkBtn v="outline">Bulk Verification</MkBtn>} />
          <MkCard>
            <MkRow left="Anjali Munda · NFST" sub="PhD, Environmental Science · 2nd Year" right={<AIBadge label="1 flag" />} />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <MkField label="Enrollment number" value="BIRT/PHD/2024/0217" />
              <MkField label="Course level" value="MPhil/PhD" />
            </div>
            <Spot className="mt-3" note="Your decision">
              <div className="flex flex-wrap gap-2 p-2"><MkBtn v="success">Verify enrolment</MkBtn><MkBtn v="outline">Return for correction</MkBtn></div>
            </Spot>
          </MkCard>
        </>
      ),
    },
    tryIt: { label: 'Verify an application', to: '/institution/dashboard', role: 'institution' },
  },
  {
    id: 'inst-students', chapter: 'institute', title: 'Students and institution profile',
    summary: 'Students lists every applicant from the institute, with search and a scheme filter. Institution Profile holds the codes and nodal officer.',
    who: 'Institute nodal officers',
    action: 'Search for a student to see their applications, or request a change to the institution profile.',
    result: 'Profile changes go through a request rather than a direct edit, so verified institution details stay reliable.',
    screen: {
      portal: 'institution', url: '/institution/students', active: '/institution/students', scene: () => (
        <>
          <MkTitle title="Students" />
          <Spot note="Search & filter">
            <div className="flex flex-wrap gap-2 p-1.5">
              <span className="flex min-w-[140px] flex-1 items-center gap-1.5 rounded-md border border-navy-100 bg-white px-2 py-1.5 text-[11px] text-slate-400"><Search size={12} />Search students</span>
              <span className="rounded-md border border-navy-100 bg-white px-2 py-1.5 text-[11px] text-navy-900">All schemes</span>
            </div>
          </Spot>
          <MkCard className="mt-3">
            <MkRow left="Anjali Munda" sub="NFST · PhD, Environmental Science" right={<MkBtn v="soft">Details</MkBtn>} />
            <MkRow left="Fictional student" sub="Post-Matric · B.Tech" right={<MkBtn v="soft">Details</MkBtn>} />
          </MkCard>
          <div className="mt-3 flex flex-wrap gap-2"><ProtoTag label="AISHE — Integration Ready" /><ProtoTag label="UDISE+ — Integration Ready" /></div>
        </>
      ),
    },
    tryIt: { label: 'Open Students', to: '/institution/students', role: 'institution' },
  },

  /* --------------------------------- Admin --------------------------------- */
  {
    id: 'command-center', chapter: 'admin', title: 'MoTA Command Center',
    summary: 'The admin dashboard: KPIs, the application pipeline, charts by scheme and state, pending workload, student complaints and low-confidence documents.',
    who: 'MoTA Super Admin',
    action: 'Filter by scheme, state, institution or application type, then jump into the queue that needs attention.',
    result: 'Complaints and low-confidence documents link straight to the item to handle.',
    screen: {
      portal: 'admin', url: '/admin/dashboard', active: '/admin/dashboard', scene: () => (
        <>
          <MkTitle title="MoTA Command Center" action={<MkBtn v="outline">Export</MkBtn>} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MkStat label="Applications" value="1.48L" /><MkStat label="Pending scrutiny" value="2,310" tone="saffron" /><MkStat label="Selected" value="41,902" tone="leaf" /><MkStat label="Open complaints" value="86" tone="red" />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <MkCard title="Application pipeline"><MkStages stages={SHORT_STAGES.slice(0, 5)} at={3} /></MkCard>
            <Spot note="Needs an official">
              <MkCard title="Low-confidence documents">
                <MkRow left="PhD registration letter" sub="76% · NFST" right={<Badge color="red">Review</Badge>} />
              </MkCard>
            </Spot>
          </div>
          <p className="mt-2 text-[10.5px] text-slate-500">Values in this preview are illustrative.</p>
        </>
      ),
    },
    tryIt: { label: 'Open the Admin Dashboard', to: '/admin/dashboard', role: 'super_admin' },
  },
  {
    id: 'scrutiny', chapter: 'admin', title: 'Scrutiny queue',
    summary: 'Every application waiting for a MoTA decision, with its AI flags visible in the list.',
    who: 'MoTA Super Admin',
    action: 'Search, or filter by scheme, state and application type (new or renewal), then open an application.',
    result: 'The officer review page opens with the full application and the AI panel.',
    screen: {
      portal: 'admin', url: '/admin/applications', active: '/admin/applications', scene: () => (
        <>
          <MkTitle title="Scrutiny queue" />
          <Spot note="Filter the queue">
            <div className="flex flex-wrap gap-1.5 p-1.5 text-[11px]">
              {['Scheme: NFST', 'State: All', 'Application type: All'].map((f) => <span key={f} className="rounded-md border border-navy-100 bg-white px-2 py-1 text-navy-900">{f}</span>)}
            </div>
          </Spot>
          <MkCard className="mt-3">
            <MkRow left="Anjali Munda · NFST" sub="State Scrutiny · Jharkhand" right={<Badge color="red">2 flags</Badge>} />
            <MkRow left="Renewal · NFST-REN-2026-0001" sub="Previous vs current available" right={<Badge color="violet">Renewal</Badge>} />
            <MkRow left="Fictional applicant · Post-Matric" sub="State Scrutiny · Odisha" right={<Badge color="green">No flags</Badge>} />
          </MkCard>
        </>
      ),
    },
    tryIt: { label: 'Open the Scrutiny queue', to: '/admin/applications', role: 'super_admin' },
  },
  {
    id: 'review', chapter: 'admin', title: 'Officer review with the AI panel',
    summary: 'One page with the application, OCR results, cross-document consistency, duplicate and anomaly checks, and eligibility against the scheme rules.',
    who: 'MoTA Super Admin',
    action: 'Open and verify any low-confidence document, add remarks, then Approve, Request Correction or Send for Further Review.',
    result: 'Approve stays locked until every low-confidence document is verified. The decision is recorded in the audit log.',
    screen: {
      portal: 'admin', url: '/admin/application/…', active: '/admin/applications', scene: () => (
        <>
          <MkTitle title="Anjali Munda · NFST" action={<AIBadge label="AI-assisted review" />} />
          <div className="grid gap-3 sm:grid-cols-2">
            <MkCard title="Cross-document consistency">
              <MkRow left="Income mismatch" sub="Form ₹2,40,000 · Certificate ₹3,20,000" right={<Badge color="red">94%</Badge>} />
              <MkRow left="PhD registration letter" sub="Read at 76%" right={<MkBtn v="soft">Verify document</MkBtn>} />
            </MkCard>
            <Spot note="Locked until documents are verified">
              <MkCard title="Officer decision">
                <div className="flex flex-wrap gap-1.5">
                  <span className="opacity-50"><MkBtn v="success"><Lock size={10} />Approve</MkBtn></span>
                  <MkBtn v="outline">Request Correction</MkBtn><MkBtn v="outline">Send for Further Review</MkBtn>
                </div>
              </MkCard>
            </Spot>
          </div>
        </>
      ),
    },
    tryIt: { label: 'Review an application', to: '/admin/applications', role: 'super_admin' },
  },
  {
    id: 'selection', chapter: 'admin', title: 'Selection and disbursement',
    summary: 'Merit & Selection ranks approved applicants for the committee. Disbursement sends sanctioned amounts for payment.',
    who: 'MoTA Super Admin',
    action: 'Record the committee approval, then Process payments in Disbursement and Retry any that failed.',
    result: 'Students see the status and payment reference on their own Disbursement page.',
    screen: {
      portal: 'admin', url: '/admin/selection', active: '/admin/selection', scene: () => (
        <>
          <MkTitle title="Merit & selection" action={<MkBtn v="success">Record committee approval</MkBtn>} />
          <Spot note="Committee decides">
            <MkCard>
              {[['1', 'Fictional applicant A', 'Selected', 'green'], ['2', 'Anjali Munda', 'Selected', 'green'], ['3', 'Fictional applicant B', 'Waitlisted', 'amber']].map(([r, n, st, c]) => (
                <MkRow key={r} left={`#${r} · ${n}`} sub="NFST · merit rank" right={<Badge color={c}>{st}</Badge>} />
              ))}
            </MkCard>
          </Spot>
          <MkCard className="mt-3" title="Disbursement">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] text-slate-600">Sanctioned, ready to pay</span><div className="flex gap-1.5"><MkBtn>Process</MkBtn><MkBtn v="outline">Retry</MkBtn></div></div>
          </MkCard>
        </>
      ),
    },
    tryIt: { label: 'Open Merit & Selection', to: '/admin/selection', role: 'super_admin' },
  },
  {
    id: 'builder', chapter: 'admin', title: 'No-code Scheme Builder',
    summary: 'Schemes are configured, not coded: eligibility rules, required documents, form fields, workflow stages and notifications.',
    who: 'MoTA Super Admin',
    action: 'Edit a rule (for example set the income limit to ₹2,00,000), check the live impact, then Save — or create a new scheme from a template and Publish it.',
    result: 'The Eligibility Finder and scheme catalogue use the new rules straight away.',
    screen: {
      portal: 'admin', url: '/admin/scheme-builder', active: '/admin/scheme-builder', scene: () => (
        <>
          <MkTitle title="No-code Scheme Builder" action={<div className="flex gap-1.5"><MkBtn v="outline">New scheme from template</MkBtn><MkBtn>Save</MkBtn></div>} />
          <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
            <MkCard title="Eligibility rules">
              {[['Category', '=', 'ST'], ['Education level', '=', 'MPhil/PhD'], ['Income', '<=', '₹2,00,000']].map(([f, o, v]) => (
                <div key={f} className="mb-1.5 flex gap-1.5 text-[11px]">
                  <span className="flex-1 truncate rounded-md border border-navy-100 bg-white px-2 py-1">{f}</span><span className="rounded-md border border-navy-100 bg-white px-2 py-1">{o}</span><span className={cx('flex-1 truncate rounded-md border bg-white px-2 py-1', f === 'Income' ? 'border-saffron-500 font-semibold' : 'border-navy-100')}>{v}</span>
                </div>
              ))}
            </MkCard>
            <Spot note="Before you save">
              <MkCard title="Live impact">
                <p className="flex items-center gap-1.5 text-[11px] text-slate-600"><Sparkles size={12} className="text-violet-600" />Fewer current applicants would qualify under the new limit.</p>
                <div className="mt-2"><MkBar value={62} tone="bg-violet-500" /></div>
              </MkCard>
            </Spot>
          </div>
        </>
      ),
    },
    tryIt: { label: 'Open the Scheme Builder', to: '/admin/scheme-builder', role: 'super_admin' },
  },
  {
    id: 'governance', chapter: 'admin', title: 'Grievances, audit log and roles',
    summary: 'Grievances collects every student complaint as a ticket. The audit log records who did what and when. Roles & Access shows what each role may open.',
    who: 'MoTA Super Admin',
    action: 'Respond to or close a ticket, search or export the audit log as CSV, and review the permission matrix.',
    result: 'Every sign-in, decision and change made anywhere in the app — including in this demo — appears in the audit log.',
    screen: {
      portal: 'admin', url: '/admin/grievances', active: '/admin/grievances', scene: () => (
        <>
          <MkTitle title="Grievance management" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Spot note="Answer the student">
              <MkCard>
                <MkRow left={<span className="flex items-center gap-1.5"><MessageSquareWarning size={12} className="text-saffron-600" />Fellowship Q1 not credited</span>} sub="Raised through the AI assistant" right={<Badge color="amber">Assigned</Badge>} />
                <div className="mt-2 flex gap-1.5"><MkBtn>Send response</MkBtn><MkBtn v="outline">Close ticket</MkBtn></div>
              </MkCard>
            </Spot>
            <MkCard title="Audit log">
              <MkRow left="Signed in" sub="MoTA Super Admin · Demo account" />
              <MkRow left="Correction requested" sub="Income certificate expired" />
              <div className="mt-1.5"><MkBtn v="outline">Export CSV</MkBtn></div>
            </MkCard>
          </div>
        </>
      ),
    },
    tryIt: { label: 'Open Grievances', to: '/admin/grievances', role: 'super_admin' },
  },

  /* ----------------------------- Help & access ----------------------------- */
  {
    id: 'help', chapter: 'help', title: 'Help, language and accessibility',
    summary: 'Every page has the SetuSakha assistant, a language switch and accessibility settings.',
    who: 'Everyone',
    action: 'Ask SetuSakha (bottom right) about the page you are on. Switch between English, हिन्दी and ગુજરાતી in the header. Open the accessibility button for text size, high contrast, low-bandwidth mode or assisted (CSC) mode.',
    result: 'SetuSakha answers from the current page and your own data, and only links to pages you can open.',
    screen: {
      portal: 'public', url: '/', active: 'home', scene: () => (
        <div className="relative min-h-[300px]">
          <div className="grid gap-3 sm:grid-cols-2">
            <MkCard title="Header controls">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-navy-900">
                <span className="flex items-center gap-1 rounded-md border border-navy-100 px-2 py-1"><Globe size={12} />English · हिन्दी · ગુજરાતી</span>
                <span className="flex items-center gap-1 rounded-md border border-navy-100 px-2 py-1"><Accessibility size={12} />Accessibility</span>
              </div>
            </MkCard>
            <MkCard title="Accessibility & access">
              {['Text size', 'High contrast', 'Low-bandwidth mode', 'Assisted application (CSC mode)'].map((o) => <p key={o} className="flex items-center gap-1.5 py-0.5 text-[11px] text-slate-600">{tick}{o}</p>)}
            </MkCard>
          </div>
          <div className="mt-4 flex justify-end">
            <Spot note="Ask about this page">
              <span className="flex h-10 items-center gap-2 rounded-full bg-navy-900 pl-3 pr-4 text-[12px] font-semibold text-white"><Bot size={15} />Ask SetuSakha</span>
            </Spot>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500"><PlayCircle size={12} className="shrink-0 text-saffron-600" aria-hidden />For presenters, the floating Demo script (bottom left) switches role and page for a live demo, and can reset the data.</p>
        </div>
      ),
    },
  },
]
