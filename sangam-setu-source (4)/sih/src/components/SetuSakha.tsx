import { AnimatePresence, motion } from 'framer-motion'
import { Bot, ChevronRight, RotateCcw, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore, type Store } from '../store/AppStore'
import { DEMO_LOGINS } from '../data/mock'
import { AI_CONF_THRESHOLD, evaluateScheme, fmtDate, today } from '../lib/rules'
import { answersFor } from './DetailsForm'
import { STAGES } from '../types'
import { Button, cx } from './ui'

type Who = 'guest' | 'student' | 'institution' | 'admin'
interface Ctx { s: Store; path: string; who: Who }
interface Link { to: string; label: string }
interface Reply { text: string; links?: Link[] }
interface Msg extends Reply { id: number; from: 'bot' | 'me' }

const whoOf = (s: Store): Who => (!s.loggedIn ? 'guest' : s.role === 'student' ? 'student' : s.role === 'institution' ? 'institution' : 'admin')
const portalOf = (to: string): Who | null => (to.startsWith('/student') ? 'student' : to.startsWith('/institution') ? 'institution' : to.startsWith('/admin') ? 'admin' : null)

/** Only offer links the person can actually open; guests are sent to sign in first. */
function resolveLinks(c: Ctx, links: Link[] = []): Link[] {
  return links.flatMap((l) => {
    const p = portalOf(l.to)
    if (!p || p === c.who) return [l]
    if (c.who === 'guest') return [{ to: `/login?next=${encodeURIComponent(l.to)}`, label: `Sign in · ${l.label}` }]
    return []
  })
}

const upcomingDeadlines = (s: Store) =>
  s.schemes.filter((x) => x.status === 'Live').map((x) => ({ x, d: x.dates.find((d) => /^last date/i.test(d.label)) }))
    .filter((v) => v.d && v.d.date >= today()).sort((a, b) => a.d!.date.localeCompare(b.d!.date))

/* ------------------------------------------------------------------ */
/* Intents — checked in order, most specific first                     */
/* ------------------------------------------------------------------ */

interface Intent { test: RegExp; answer: (c: Ctx) => Reply }

const INTENTS: Intent[] = [
  { test: /^(hi+|hello|hey|namaste|namaskar|good (morning|afternoon|evening))\b/, answer: (c) => ({ text: `${greeting(c)} What would you like to know?` }) },
  { test: /\b(thanks|thank you|thx|dhanyavaad|dhanyavad|shukriya)\b/, answer: () => ({ text: 'You’re welcome! Ask me anything else about schemes, accounts or applications.' }) },

  // ---- accounts & sign-in ----
  { test: /\b(demo|test|sample|dummy)\b.*\b(account|login|user|credential|id)s?\b|\bcredentials?\b|\bdemo\b/, answer: () => ({
    text: `Demo accounts (the one-time code can be any 6 digits):\n• Student — ${DEMO_LOGINS.student.label}\n• Institute — ${DEMO_LOGINS.institution.label}\n• Admin — ${DEMO_LOGINS.super_admin.label}\nOn the sign-in page, choose the role and press “Use demo account”.`,
    links: [{ to: '/login', label: 'Go to sign in' }] }) },
  { test: /\baishe\b|institution code|institute code/, answer: () => ({
    text: 'The AISHE code has a letter, a hyphen and digits: U- for universities (e.g. U-0123), C- for colleges (e.g. C-12345) and S- for standalone institutions (e.g. S-1234). The institution code is issued by the State Tribal Welfare Department, e.g. JH-U-0142. Both must be unique — if yours is already registered, ask your nodal officer to sign in.' }) },
  { test: /\b(otp|one[- ]time|verification code|code)\b|did ?n.?t (get|receive)|not (getting|received)|no (email|sms)/, answer: () => ({
    text: 'This prototype doesn’t send real emails or SMS — enter any 6 digits as the verification code. If you mistyped your email or mobile, choose “Edit details” on the verification step; your other answers are kept. “Resend code” becomes available after 30 seconds.' }) },
  { test: /pass ?word|passcode/, answer: () => ({
    text: 'Passwords need at least 8 characters with at least one letter and one number; the strength bar shows how strong it is. Use the eye button to show or hide it, and type it again in “Confirm password” exactly. In this prototype passwords are checked but not stored — signing in uses a one-time code.' }) },
  { test: /(which|what|kind of|type of) (account|role|option)|account types?|should i (choose|pick|select)|difference between/, answer: () => ({
    text: 'Choose the account that matches you:\n• Student — to find and apply for scholarships and track them.\n• Institute — for a college or university nodal officer who verifies students’ enrolment and documents.\n• Admin — for Ministry of Tribal Affairs officials who run scrutiny, selection and payments.',
    links: [{ to: '/register', label: 'Create an account' }] }) },
  { test: /(register|registration|sign ?up|create|new|open|make).*(institut|college|university|school|nodal)|(institut|college|university|nodal).*(register|registration|sign ?up|account)/, answer: () => ({
    text: 'To register an institute: Create Account → Institute. Enter the institution name, type, state, institution code and AISHE code; the nodal officer’s name, designation, official email and 10-digit phone; the courses and schemes you handle; and a password. Then verify the email code, and the institute verification checks run before your dashboard opens.',
    links: [{ to: '/register/institute', label: 'Register an institute' }] }) },
  { test: /(register|registration|sign ?up|create|new|open|make).*(admin|officer|official|mota)|(admin|officer).*(register|registration|sign ?up|account)/, answer: () => ({
    text: 'For MoTA officials: Create Account → Admin. Enter your full name, official email, 10-digit mobile and a password, then verify the email code. The Admin (Super Admin) role is assigned automatically and the admin dashboard opens.',
    links: [{ to: '/register/admin', label: 'Create an admin account' }] }) },
  { test: /(register|registration|sign ?up|create (an |my )?account|new account|open (an )?account|join)/, answer: (c) => {
    if (c.path.startsWith('/register/student')) return { text: 'You’re on the student form. Fill in every field marked * — name, email, 10-digit mobile, password, student ID / enrollment number, institute, course, year / semester, date of birth and category — then tick the consent box. Address is optional. After the email code, your dashboard opens.' }
    return { text: 'Choose Login → Create Account, pick Student, Institute or Admin, fill in the form, and verify your email with the 6-digit code. Institutes also go through a quick verification step; admins get their role automatically.', links: [{ to: '/register', label: 'Create an account' }] }
  } },
  { test: /\b(log ?in|sign ?in|signin|login|log on|can.?t (log|sign)|forgot|locked out)\b/, answer: (c) => ({
    text: `On the sign-in page choose your role. Students sign in with their registered mobile number; institutes with their official email, institution code or AISHE code; admins with their official email or admin user ID. You then enter the one-time code (any 6 digits in this prototype). No account yet? Use Create Account${c.who === 'guest' ? '' : ' after signing out'}.`,
    links: [{ to: '/login', label: 'Go to sign in' }, { to: '/register', label: 'Create an account' }] }) },

  // ---- money before dates, so "when will I get my money" isn't read as a deadline ----
  { test: /\b(money|payment|paid|pay|disburs\w*|credit\w*|instal+ments?|pfms|amount|stipend)\b/, answer: (c) => c.who === 'admin'
    ? { text: 'Sanctioned applications move to Disbursement, where you process PFMS batches (prototype). Each instalment gets a reference number and the student is notified.', links: [{ to: '/admin/disbursement', label: 'Open disbursement' }] }
    : { text: 'After sanction, the amount is paid to the student’s own Aadhaar-seeded bank account through PFMS. Each instalment and its reference number appear on the Disbursement page. If money shows as sent but hasn’t arrived, raise a grievance with the application ID.', links: [{ to: '/student/disbursement', label: 'View disbursement' }] } },
  { test: /\brenew\w*/, answer: () => ({ text: 'Renewable schemes (like NFST) are renewed each year. Start a Renewal Application: your previous details are reused, you update what changed and upload the new documents, and your institution verifies before the officer approves the next year.', links: [{ to: '/student/renewal', label: 'Start renewal' }] }) },

  // ---- institution / admin work ----
  { test: /\b(return|send back|reject)\b.*\b(correction|student|application)\b|\bcorrection\b/, answer: (c) => c.who === 'institution'
    ? { text: 'Open the application from the Overview queue, choose “Return for correction”, pick the reason (e.g. bonafide missing) and add a note. The student is told exactly what to fix and the application comes back to you after they resubmit.', links: [{ to: '/institution/dashboard', label: 'Open verification queue' }] }
    : c.who === 'admin'
      ? { text: 'In the officer review, choose “Request Correction” and describe what’s wrong. The student fixes only that item and the application returns to your scrutiny queue.', links: [{ to: '/admin/applications', label: 'Open scrutiny queue' }] }
      : { text: 'If your institution or an officer asks for a correction, you’ll get a deficiency notice saying exactly what’s wrong. Fix only that field or document and resubmit — you don’t restart the application.', links: [{ to: '/student/documents', label: 'Open Documents & Deficiencies' }] } },
  { test: /\b(verify|verification|verifying|bonafide|enrolment|enrollment)\b/, answer: (c) => {
    if (c.who === 'institution') {
      const pending = c.s.applications.filter((a) => a.institutionId === (c.s.myInstitution?.id ?? '') && a.stage === 'Institution Verification' && a.status === 'In Progress').length
      return { text: `${pending ? `You have ${pending} application${pending > 1 ? 's' : ''} waiting.` : 'Nothing is waiting right now.'} In the Overview queue, open an application, check enrolment, bonafide and fee details (AI flags are shown with reasons), then choose Verify to send it to State Scrutiny, or Return for correction. Bulk verification is on the Students page.`, links: [{ to: '/institution/dashboard', label: 'Open verification queue' }] }
    }
    if (c.who === 'admin') return { text: 'Institutions verify enrolment first; then applications reach your scrutiny queue. Open one to see documents, AI notes and history, and choose Approve, Request Correction or Further Review. Low-confidence documents must be opened and verified before Approve unlocks.', links: [{ to: '/admin/applications', label: 'Open scrutiny queue' }] }
    return { text: 'After you submit, your institution confirms your enrolment and bonafide details, then a State officer does scrutiny. You’re notified at each step and can follow it in your tracker.', links: [{ to: '/student/applications', label: 'Open my applications' }] }
  } },
  { test: /\b(ai|a\.i\.|confidence|automatic\w*|ocr|flag\w*)\b/, answer: () => ({
    text: `The AI reads documents and flags possible issues with a reason, but it never approves or rejects anyone. A document is auto-accepted only at ${AI_CONF_THRESHOLD}% confidence or above with the right type and no critical mismatch; anything lower goes to a MoTA official to check by hand.` }) },
  { test: /scheme builder|new scheme|(change|edit|set|update).*(rule|limit|threshold|criteria)|income limit|publish/, answer: (c) => ({
    text: 'Scheme Builder lets an admin change rules without code — e.g. “Set income limit to ₹2,00,000” — and shows the live impact on applicants before you save. You can also start a new scheme from a template and publish it.',
    links: c.who === 'admin' ? [{ to: '/admin/scheme-builder', label: 'Open Scheme Builder' }] : [] }) },
  { test: /\b(profile|my details|update (my )?(details|information|contact))\b/, answer: (c) => c.who === 'institution'
    ? { text: 'Your institution profile shows the codes, nodal officer and schemes. Changes go to the State Nodal Cell for approval — use “Request profile change”.', links: [{ to: '/institution/profile', label: 'Open institution profile' }] }
    : { text: 'My Profile holds your details once and reuses them in every application. Verified fields are locked; the rest you can edit any time.', links: [{ to: '/student/profile', label: 'Open My Profile' }] } },

  // ---- student journey ----
  { test: /\b(status|track\w*|progress|stage)\b|where is my|what happened to my/, answer: (c) => {
    if (c.who === 'admin') return { text: 'Every application is in the Scrutiny queue — search by application ID or student name, and filter by scheme, stage or application type. Opening one shows its full timeline.', links: [{ to: '/admin/applications', label: 'Open scrutiny queue' }] }
    if (c.who === 'institution') return { text: 'Your students’ applications and their current stage are on the Students page; ones waiting for you are in the Overview queue.', links: [{ to: '/institution/students', label: 'Open students' }] }
    if (c.who !== 'student') return { text: 'Students can see each application’s stage in My Applications — the tracker shows every step from submission to disbursement.', links: [{ to: '/student/applications', label: 'Open my applications' }] }
    const mine = c.s.applications.filter((a) => a.studentId === c.s.studentId && a.submittedOn >= '2026').sort((a, b) => b.submittedOn.localeCompare(a.submittedOn))
    const a = mine.find((x) => x.id === c.s.demoAppId) ?? mine[0]
    if (!a) return { text: 'You don’t have an application in this cycle yet. Check which schemes you match, then apply.', links: [{ to: '/eligibility', label: 'Find my scholarship' }] }
    return { text: `Application ${a.id} is at “${a.stage}” (step ${STAGES.indexOf(a.stage) + 1} of ${STAGES.length}) · status: ${a.status}.${mine.length > 1 ? ` You have ${mine.length} applications this cycle.` : ''}`, links: [{ to: `/student/application/${a.id}`, label: 'Open tracker' }] }
  } },
  { test: /\b(defici\w*|mismatch|fix|wrong|incorrect)\b/, answer: () => ({ text: 'Open Documents & Deficiencies, choose the issue and follow the steps — correct the field or replace only that document, then resubmit. You never restart the whole application.', links: [{ to: '/student/documents', label: 'Open Documents & Deficiencies' }] }) },
  { test: /\b(documents?|papers?|upload\w*|certificates?|file size|pdf)\b/, answer: () => ({
    text: 'It depends on the scheme. Most need an ST certificate, a current income certificate, the last marksheet, a bonafide certificate and a bank passbook; NFST also needs the PhD registration letter. Documents already in your verified profile or DigiLocker are reused automatically.',
    links: [{ to: '/student/documents', label: 'Go to my documents' }, { to: '/schemes', label: 'See each scheme' }] }) },
  { test: /\b(eligib\w*|qualify|which scholarships?|scholarships? (for me|can i)|am i able|match\w*)\b/, answer: (c) => {
    if (c.who !== 'student') return { text: 'The Eligibility Finder asks a few questions (education level, family income, marks…) and shows which schemes you match, explaining every rule. It takes about a minute and needs no account.', links: [{ to: '/eligibility', label: 'Open eligibility finder' }] }
    const d = c.s.me.details
    if (!d.courseLevel || !d.income) return { text: 'Your profile doesn’t have your course level and family income yet, so I can’t match schemes from it. The Eligibility Finder asks for them and shows each rule that matched.', links: [{ to: '/eligibility', label: 'Open eligibility finder' }, { to: '/student/profile', label: 'Complete my profile' }] }
    const res = c.s.schemes.filter((x) => x.status === 'Live').map((x) => evaluateScheme(x, answersFor(d)))
    const match = res.filter((r) => r.verdict === 'match').map((r) => r.scheme.short)
    // "near" only when the missing rule is something the student could change — not their level of study
    const near = res.filter((r) => r.verdict === 'near' && !r.results.some((x) => !x.pass && x.rule.field === 'educationLevel')).map((r) => r.scheme.short)
    return { text: match.length ? `From your profile you match: ${match.join(', ')}.${near.length ? ` Almost a match (one rule short): ${near.join(', ')}.` : ''} The finder explains every rule.` : `From your profile you don’t fully match a live scheme yet.${near.length ? ` You’re one rule short for ${near.join(', ')}.` : ''}`, links: [{ to: '/eligibility', label: 'See the reasons' }, { to: '/student/applications?tab=explore', label: 'Browse schemes' }] }
  } },
  { test: /\b(scrutiny|state officer|state level)\b/, answer: () => ({ text: 'State Scrutiny comes after your institution verifies you: a MoTA officer checks the application and documents, with AI review notes as guidance. The officer — not the AI — decides to approve or ask for a correction.' }) },
  { test: /\b(deadline|last date|closing|closes?|due|when (does|do|is|are).*(close|end|open)|apply by|how long)\b/, answer: (c) => {
    const list = upcomingDeadlines(c.s)
    return list.length
      ? { text: `Upcoming last dates:\n${list.map((v) => `• ${v.x.short} — ${fmtDate(v.d!.date)}`).join('\n')}`, links: [{ to: '/important-dates', label: 'See all dates' }] }
      : { text: 'No application windows are open right now.', links: [{ to: '/important-dates', label: 'See all dates' }] }
  } },
  { test: /\b(schemes?|scholarships?|fellowships?)\b/, answer: (c) => ({ text: `There are ${c.s.schemes.filter((x) => x.status === 'Live').length} live schemes: ${c.s.schemes.filter((x) => x.status === 'Live').map((x) => x.short).join(', ')}. Each page lists who can apply, the benefits and the documents needed.`, links: [{ to: '/schemes', label: 'Explore schemes' }] }) },

  // ---- help ----
  { test: /\b(griev\w*|complain\w*|problem|issue|agent|human|person|talk to|help ?desk|support|not working)\b/, answer: (c) => c.who === 'admin'
    ? { text: 'Student grievances, including ones raised through this assistant, are in Admin → Grievances with their status and assigned officer.', links: [{ to: '/admin/grievances', label: 'Open grievances' }] }
    : { text: 'Raise a grievance with a category and optional attachment — you get a ticket ID and can track who is handling it. Signed-in students can also use the guided assistant on the Grievance page to reach an agent.', links: c.who === 'student' ? [{ to: '/student/grievance', label: 'Raise a grievance' }] : [{ to: '/grievance', label: 'Raise a grievance' }] } },
  { test: /\b(hindi|gujarati|language|bhasha)\b/, answer: () => ({ text: 'Use the language menu (globe icon) at the top of the page to switch between English, हिन्दी and ગુજરાતી.' }) },
  { test: /\b(font|text size|contrast|accessib\w*|low bandwidth|slow internet|csc|assisted)\b/, answer: () => ({ text: 'Open the accessibility button (person icon) at the top for bigger text, high contrast, low-bandwidth mode, or assisted mode for CSC operators applying on a student’s behalf.' }) },
]

function greeting(c: Ctx) {
  if (c.path.startsWith('/register')) return 'Namaste! I’m SetuSakha. I can help you choose an account type and fill in the registration form.'
  if (c.path.startsWith('/login')) return 'Namaste! I’m SetuSakha. I can help you sign in or find the demo accounts.'
  if (c.who === 'institution') return `Namaste, ${c.s.actorName}! I can help with verifying applications, corrections and your institution profile.`
  if (c.who === 'admin') return `Namaste, ${c.s.actorName}! I can help with scrutiny, AI review notes, scheme rules, disbursement and grievances.`
  if (c.who === 'student') return `Namaste, ${c.s.actorName.split(' ')[0]}! Ask me about your eligibility, documents, application status, payments or renewal.`
  return 'Namaste! I’m SetuSakha, the scholarship assistant. Ask me about schemes, eligibility, documents, deadlines or creating an account.'
}

function fallback(c: Ctx): Reply {
  const topics = c.path.startsWith('/register') || c.path.startsWith('/login') ? 'account types, the registration form, verification codes, passwords and demo accounts'
    : c.who === 'institution' ? 'verifying applications, returning them for correction, AI flags and your institution profile'
      : c.who === 'admin' ? 'scrutiny, AI confidence, scheme rules, disbursement and grievances'
        : 'eligibility, documents, deficiencies, deadlines, application status, payments, renewal, grievances and creating an account'
  return { text: `I didn’t quite get that. I can help with ${topics}. Try rephrasing, or tap a suggestion below.` }
}

function suggestionsFor(c: Ctx): string[] {
  if (c.path.startsWith('/register') || c.path.startsWith('/login')) return ['Which account type should I choose?', 'I didn’t get the verification code', 'What are the password rules?', 'Is there a demo account?', 'How do I register an institute?']
  if (c.who === 'institution') return ['How do I verify an application?', 'How do I return an application for correction?', 'What does low AI confidence mean?', 'How do I update our profile?']
  if (c.who === 'admin') return ['How does State Scrutiny work?', 'What does low AI confidence mean?', 'How do I change a scheme rule?', 'Where are student grievances?', 'How are payments made?']
  if (c.who === 'student') return ['What scholarships am I eligible for?', 'Where is my application?', 'What documents do I need?', 'How do I fix a deficiency?', 'When will I get my money?']
  return ['Which scholarships am I eligible for?', 'What documents do I need?', 'When is the application deadline?', 'How do I create an account?', 'Is there a demo account?']
}

function answerQuestion(q: string, c: Ctx): Reply {
  const x = q.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()
  const hit = INTENTS.find((i) => i.test.test(x))
  const r = hit ? hit.answer(c) : fallback(c)
  return { ...r, links: resolveLinks(c, r.links) }
}

/* ------------------------------------------------------------------ */

export function SetuSakha() {
  const s = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [typing, setTyping] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timers = useRef<number[]>([])
  const nextId = useRef(1)
  const ctx: Ctx = { s, path: loc.pathname, who: whoOf(s) }

  // scroll only the message list — never the page behind it
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight }, [msgs, typing, open])
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const ask = (q: string) => {
    const text = q.trim().slice(0, 300)
    if (!text || typing) return
    const reply = answerQuestion(text, ctx)
    setMsgs((m) => [...m, { id: nextId.current++, from: 'me', text }])
    setInput('')
    setTyping(true)
    timers.current.push(window.setTimeout(() => { setTyping(false); setMsgs((m) => [...m, { id: nextId.current++, from: 'bot', ...reply }]) }, s.lowBandwidth ? 0 : 500))
  }
  const go = (to: string) => { setOpen(false); nav(to) }

  return (
    <>
      <button onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close scholarship assistant' : 'Open scholarship assistant'} aria-expanded={open}
        className="fixed bottom-5 right-5 z-[60] flex h-14 items-center gap-2 rounded-full bg-navy-900 pl-4 pr-5 text-sm font-semibold text-white shadow-lift hover:bg-navy-800">
        {open ? <X size={20} /> : <Bot size={20} />}<span className="hidden sm:inline">{open ? 'Close' : 'Ask SetuSakha'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-3 z-[60] flex h-[min(580px,calc(100vh-8rem))] w-[min(calc(100vw-1.5rem),390px)] flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-lift sm:right-5"
            role="dialog" aria-label="Scholarship assistant">
            <div className="flex items-center gap-3 bg-navy-900 px-4 py-3 text-white">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-saffron-500 text-navy-950"><Bot size={18} /></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">SetuSakha</p><p className="text-[11px] text-navy-100">Scholarship assistant · answers are guidance, not decisions</p></div>
              {msgs.length > 0 && <button onClick={() => setMsgs([])} aria-label="Clear conversation" title="Clear conversation" className="grid h-8 w-8 place-items-center rounded-lg text-navy-100 hover:bg-white/10"><RotateCcw size={15} /></button>}
              <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-navy-100 hover:bg-white/10"><X size={16} /></button>
            </div>
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-paper p-3" aria-live="polite">
              <Bubble m={{ id: 0, from: 'bot', text: greeting(ctx) }} onLink={go} />
              {msgs.map((m) => <Bubble key={m.id} m={m} onLink={go} />)}
              {typing && <div className="flex w-14 items-center justify-center gap-1 rounded-2xl bg-white px-3 py-3 shadow-sm" aria-label="SetuSakha is typing">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 120}ms` }} />)}</div>}
            </div>
            <div className="flex gap-1.5 overflow-x-auto border-t border-navy-50 px-3 py-2">
              {suggestionsFor(ctx).map((q) => <button key={q} onClick={() => ask(q)} disabled={typing} className="shrink-0 rounded-full border border-navy-100 px-3 py-1 text-xs text-navy-800 hover:bg-navy-50 disabled:opacity-50">{q}</button>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); ask(input) }} className="flex gap-2 border-t border-navy-100 p-3">
              <label htmlFor="chat-in" className="sr-only">Type your question</label>
              <input ref={inputRef} id="chat-in" value={input} maxLength={300} onChange={(e) => setInput(e.target.value)} placeholder="Type your question…" autoComplete="off" className="h-10 min-w-0 flex-1 rounded-lg border border-navy-100 px-3 text-sm outline-none focus:border-navy-600" />
              <Button type="submit" aria-label="Send" className="w-10 shrink-0 px-0" disabled={!input.trim() || typing}><Send size={16} /></Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Bubble({ m, onLink }: { m: Msg; onLink: (to: string) => void }) {
  return (
    <div className={cx('max-w-[88%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed', m.from === 'me' ? 'ml-auto bg-navy-900 text-white' : 'bg-white text-ink shadow-sm')} data-from={m.from}>
      {m.text}
      {m.links?.map((l) => <button key={l.to} onClick={() => onLink(l.to)} className="mt-2 flex items-center gap-1 text-left text-[13px] font-semibold text-saffron-700 hover:underline">{l.label}<ChevronRight size={14} className="shrink-0" /></button>)}
    </div>
  )
}
