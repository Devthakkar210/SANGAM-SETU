import { useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CalendarDays, ChevronDown, Download, FileText, ShieldCheck, Lock, Fingerprint, Search, CheckCircle2, UserPlus, Smartphone } from 'lucide-react'
import { ROLE_META, useStore } from '../../store/AppStore'
import { Badge, Button, Card, cx, Input, Label, PageHeader, ProtoTag, Select, StatusPill, Tabs, Textarea } from '../../components/ui'
import { fmtDate, today } from '../../lib/rules'
import type { Role } from '../../types'
import { EKyc, digiLockerIncomeDoc, type EKycResult } from '../../components/EKyc'
import { displayValue, maskMobile } from '../../components/DetailsForm'
import { DEMO_CREDENTIALS, DEMO_LOGINS, isDemoEmail } from '../../data/mock'

const Wrap = ({ children }: { children: ReactNode }) => <div className="mx-auto max-w-5xl px-4 py-12">{children}</div>

export function NotificationsPublic() {
  const { schemes } = useStore()
  const items = [
    { d: '2026-09-25', t: 'NFST 2026-27: online applications open', tag: 'NFST' },
    { d: '2026-09-20', t: 'Revised timeline for institution verification — Post-Matric (prototype notice)', tag: 'Post-Matric' },
    { d: '2026-09-12', t: 'Guidelines for AI-assisted document review and officer responsibilities', tag: 'Circular' },
    { d: '2026-08-15', t: 'Top Class Education: list of notified institutions updated', tag: 'Top Class' },
    { d: '2026-06-01', t: 'National Overseas Scholarship 2026-27 notification', tag: 'NOS' },
    ...schemes.filter((s) => s.status === 'Draft').map((s) => ({ d: today(), t: `${s.name} — configured, pending publication`, tag: 'New scheme' })),
  ]
  return (
    <Wrap>
      <PageHeader title="Notices & notifications" sub="Official-style notices for the current cycle. Prototype content." />
      <Card className="divide-y divide-navy-50">
        {items.map((n) => (
          <div key={n.t} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center">
            <span className="w-28 shrink-0 text-sm tabular-nums text-slate-500">{fmtDate(n.d)}</span>
            <p className="flex-1 font-medium text-navy-950"><Bell size={15} className="mr-2 inline text-saffron-600" />{n.t}</p>
            <Badge color="navy">{n.tag}</Badge>
          </div>
        ))}
      </Card>
    </Wrap>
  )
}

export function ImportantDates() {
  const { schemes } = useStore()
  const all = schemes.flatMap((s) => s.dates.map((d) => ({ ...d, scheme: s.short, color: s.color }))).sort((a, b) => a.date.localeCompare(b.date))
  return (
    <Wrap>
      <PageHeader title="Important dates" sub="All deadlines across schemes, in date order. Past dates are dimmed." />
      <ol className="relative border-l-2 border-navy-100 pl-6">
        {all.map((d, i) => {
          const past = d.date < today()
          return (
            <li key={i} className={cx('relative pb-6', past && 'opacity-50')}>
              <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white" style={{ background: d.color }} />
              <p className="text-sm font-semibold tabular-nums text-slate-500">{fmtDate(d.date)}</p>
              <p className="font-semibold text-navy-950">{d.label} <span className="font-normal text-slate-500">· {d.scheme}</span></p>
            </li>
          )
        })}
      </ol>
    </Wrap>
  )
}

const FAQ = [
  ['Can one application be used for several schemes?', 'Your verified profile is reused. Each scheme still has its own short application, but details like your ST certificate, bank account and marks are filled in and already verified.'],
  ['Does the AI approve or reject my application?', 'No. The AI reads documents and highlights potential issues with an explanation. An authorised officer makes every decision, and each action is recorded in an audit log.'],
  ['What happens if my document has a problem?', 'You get a deficiency notice that says exactly what is wrong. You fix only that field or replace only that document — you do not restart the application.'],
  ['What does State Scrutiny mean?', 'An officer of the State Tribal Welfare Department checks your application after your institution confirms your enrolment.'],
  ['I don’t have internet at home. Can someone apply for me?', 'Yes. Common Service Centres and hostel wardens can use assisted mode, which records your consent and the operator’s details.'],
  ['Is my data safe?', 'Documents are visible only to roles that need them — your institution and the MoTA Super Admin. Aadhaar is always shown masked. This prototype uses fictional data only.'],
  ['How do I renew my fellowship?', 'When the renewal window opens you upload your progress report. Your institution verifies it and the officer approves the next year.'],
]
export function FAQs() {
  const [o, setO] = useState<number | null>(0)
  return (
    <Wrap>
      <PageHeader title="Frequently asked questions" />
      <div className="space-y-2">
        {FAQ.map(([q, a], i) => (
          <Card key={q}>
            <button className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={o === i} onClick={() => setO(o === i ? null : i)}>
              <span className="font-semibold text-navy-950">{q}</span><ChevronDown size={18} className={cx('shrink-0 transition', o === i && 'rotate-180')} />
            </button>
            <AnimatePresence initial={false}>{o === i && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-5 pb-5 text-[15px] leading-relaxed text-slate-600">{a}</motion.p>}</AnimatePresence>
          </Card>
        ))}
      </div>
    </Wrap>
  )
}

export function Downloads() {
  const { toast } = useStore()
  const files = [
    ['Scheme guidelines — NFST (sample)', 'PDF · 420 KB'], ['Scheme guidelines — Post-Matric (sample)', 'PDF · 610 KB'], ['Income certificate format', 'PDF · 90 KB'],
    ['Bonafide certificate format', 'PDF · 75 KB'], ['Institution verification SOP', 'PDF · 1.1 MB'], ['Grievance redressal process', 'PDF · 140 KB'],
  ]
  return (
    <Wrap>
      <PageHeader title="Downloads" sub="Formats and guidelines. Files are placeholders in this prototype." />
      <div className="grid gap-3 sm:grid-cols-2">
        {files.map(([t, m]) => (
          <Card key={t} className="flex items-center gap-4 p-4">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-navy-50 text-navy-800"><FileText size={20} /></div>
            <div className="flex-1"><p className="font-semibold text-navy-950">{t}</p><p className="text-xs text-slate-500">{m}</p></div>
            <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={() => toast(`Download started: ${t} (sample)`, 'info')}>Download</Button>
          </Card>
        ))}
      </div>
    </Wrap>
  )
}

export function GrievanceForm({ onDone }: { onDone?: (id: string) => void }) {
  const s = useStore()
  const [f, setF] = useState({ category: 'Document issue', subject: '', description: '', applicationId: s.demoAppId ?? '', attachment: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const submit = () => {
    const e: Record<string, string> = {}
    if (f.subject.trim().length < 5) e.subject = 'Add a short subject (at least 5 characters).'
    if (f.description.trim().length < 15) e.description = 'Describe the problem in a sentence or two so the officer can act.'
    setErr(e)
    if (Object.keys(e).length) return
    const id = `GRV-2026-0${Math.floor(320 + Math.random() * 600)}`
    s.set((p) => ({ grievances: [{ id, ...f, status: 'Open', channel: 'Web form', studentId: p.loggedIn && p.role === 'student' ? p.studentId : undefined, createdOn: today(), thread: [{ by: p.loggedIn && p.role === 'student' ? s.actorName : 'Student', text: f.description, at: today() }] }, ...p.grievances] }))
    s.notify({ title: `Grievance ${id} registered`, body: 'We will assign an officer within 2 working days (prototype SLA).', channel: ['in-app', 'sms'], kind: 'info', audience: 'student' })
    s.notify({ title: `New grievance ${id}`, body: f.subject, channel: ['in-app'], kind: 'action', audience: 'admin' })
    s.log('Grievance created', `${id}: ${f.subject}`, f.applicationId || undefined, { user: 'Anjali Munda', role: 'Student' })
    s.toast(`Grievance registered — ticket ${id}`)
    setF({ ...f, subject: '', description: '', attachment: '' })
    onDone?.(id)
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div><Label htmlFor="g-cat">Category</Label><Select id="g-cat" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={['Document issue', 'Payment not received', 'Institution not verifying', 'Eligibility query', 'Technical problem', 'Other']} /></div>
      <div><Label htmlFor="g-app" hint="(optional)">Application ID</Label><Input id="g-app" value={f.applicationId} onChange={(e) => setF({ ...f, applicationId: e.target.value })} placeholder="e.g. NFST-2026-10482" /></div>
      <div className="sm:col-span-2"><Label htmlFor="g-sub">Subject</Label><Input id="g-sub" value={f.subject} error={err.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
      <div className="sm:col-span-2"><Label htmlFor="g-desc">Description</Label><Textarea id="g-desc" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} aria-invalid={!!err.description} />{err.description && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{err.description}</p>}</div>
      <div className="sm:col-span-2"><Label htmlFor="g-att" hint="(optional, image or PDF)">Attachment</Label><input id="g-att" type="file" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-4 file:py-2 file:font-semibold file:text-navy-900" onChange={(e) => setF({ ...f, attachment: e.target.files?.[0]?.name ?? '' })} /></div>
      <div className="sm:col-span-2"><Button onClick={submit}>Submit grievance</Button></div>
    </div>
  )
}

export function GrievancePublic() {
  const { grievances } = useStore()
  const [q, setQ] = useState('')
  const [created, setCreated] = useState<string | null>(null)
  const found = grievances.find((g) => g.id.toLowerCase() === q.trim().toLowerCase())
  return (
    <Wrap>
      <PageHeader title="Grievance redressal" sub="Raise a complaint and track it with your ticket ID. Every ticket has an assigned officer and a timeline." />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Raise a grievance</h2>
          {created && <p className="mb-4 flex items-center gap-2 rounded-lg bg-leaf-50 px-3 py-2 text-sm text-leaf-700"><CheckCircle2 size={16} />Ticket <b>{created}</b> created. Save this ID to track it.</p>}
          <GrievanceForm onDone={(id) => { setCreated(id); setQ(id) }} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Track a ticket</h2>
          <div className="flex gap-2"><label htmlFor="tq" className="sr-only">Ticket ID</label><Input id="tq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="GRV-2026-0311" /><Button variant="outline" aria-label="Search"><Search size={16} /></Button></div>
          {found ? (
            <div className="mt-5 space-y-2 text-sm">
              <div className="flex items-center justify-between"><b>{found.id}</b><StatusPill s={found.status} /></div>
              <p className="text-slate-600">{found.subject}</p>
              <p><span className="text-slate-500">Assigned to:</span> {found.assignedTo ?? 'Awaiting assignment'}</p>
              <ol className="mt-3 space-y-2 border-l-2 border-navy-100 pl-4">{found.thread.map((t, i) => <li key={i}><p className="text-xs text-slate-500">{t.by} · {t.at}</p><p>{t.text}</p></li>)}</ol>
            </div>
          ) : <p className="mt-4 text-sm text-slate-500">Try GRV-2026-0311</p>}
        </Card>
      </div>
    </Wrap>
  )
}

const LOGIN_ROLES: Role[] = ['student', 'institution', 'super_admin']
export function Login() {
  const s = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const scheme = s.schemes.find((x) => x.id === params.get('scheme'))
  const hasExisting = !!(s.remembered || s.loggedIn)
  const [mode, setMode] = useState<'choose' | 'existing' | 'new'>(hasExisting ? 'choose' : 'new')
  const [role, setRole] = useState<Role>('student')
  const [otpSent, setOtpSent] = useState(false)
  const [id, setId] = useState('')
  const [otp, setOtp] = useState('')
  const [err, setErr] = useState('')
  const [method, setMethod] = useState<'otp' | 'ekyc'>('otp')
  const reset = (m: typeof mode) => { setMode(m); setOtpSent(false); setOtp(''); setErr('') }

  /** Registered institution / admin account matching the official user ID typed (email, institution code or AISHE code). */
  const orgAccount = (r: Role, raw: string) => {
    const q = raw.trim().toLowerCase()
    if (!q) return undefined
    // the demo email on the homepage demo cards also works as a sign-in ID
    if (r === 'institution') return s.institutionAccounts.find((a) => [a.email, a.code, a.aishe, a.id].some((x) => x.toLowerCase() === q) || (a.id === DEMO_CREDENTIALS.institution.accountId && isDemoEmail('institution', q)))
    if (r === 'super_admin') return s.adminAccounts.find((a) => [a.email, a.id, a.mobile, a.userId ?? ''].some((x) => x && x.toLowerCase() === q) || (a.id === DEMO_CREDENTIALS.super_admin.accountId && isDemoEmail('super_admin', q)))
    return undefined
  }
  const finish = (r: Role, how: string, studentId?: string, keepOrg = false) => {
    const acc = r === 'student' ? s.students.find((a) => a.id === (studentId ?? s.remembered?.studentId ?? s.studentId)) : undefined
    if (acc) s.switchStudent(acc.id)
    const org = keepOrg ? undefined : orgAccount(r, id)
    const orgName = org ? ('nodal' in org ? org.nodal : org.name) : undefined
    const who = acc?.details.name ?? orgName ?? (keepOrg ? s.actorName : ROLE_META[r].user)
    s.set((p) => ({ role: r, loggedIn: true,
      ...(keepOrg ? {} : r === 'institution' ? { institutionAccountId: org?.id ?? null } : r === 'super_admin' ? { adminAccountId: org?.id ?? null } : {}),
      remembered: acc ? { name: who, mobile: maskMobile(acc.details.mobile), lastAt: '2026-09-29 ' + new Date().toTimeString().slice(0, 5), studentId: acc.id } : p.remembered }))
    s.log('Signed in', `${how} · Role: ${ROLE_META[r].label}${next ? ` · continuing to ${next}` : ''}`, undefined, { user: who, role: ROLE_META[r].label })
    s.toast(`Welcome, ${who}`)
    nav(next && (r === 'student' ? next.startsWith('/student') : !next.startsWith('/student')) ? next : ROLE_META[r].home)
  }
  const sendOrVerify = (r: Role, how: string) => {
    const digits = id.replace(/\D/g, '')
    const demoStudent = r === 'student' && isDemoEmail('student', id) ? s.students.find((a) => a.id === DEMO_CREDENTIALS.student.accountId) : undefined
    const acc = mode === 'new' && r === 'student' ? demoStudent ?? s.students.find((a) => a.details.mobile === digits) : undefined
    if (mode === 'new' && r === 'student' && !otpSent) {
      if (!demoStudent && !/^\d{10}$/.test(digits)) { setErr('Enter a 10-digit mobile number.'); return }
      if (!acc) { setErr('No student account is registered with this mobile number. Create an account first.'); return }
    }
    if (mode === 'new' && r !== 'student' && !otpSent) {
      if (!id.trim()) { setErr(r === 'institution' ? 'Enter your official email, institution code or AISHE code.' : 'Enter your official email or admin user ID.'); return }
      if (!orgAccount(r, id)) { setErr(`No ${r === 'institution' ? 'institute' : 'admin'} account matches “${id.trim()}”. Check the ID, create an account, or use the demo account.`); return }
    }
    if (!otpSent) { setOtpSent(true); setErr(''); s.toast('OTP sent (prototype — enter any 6 digits)', 'info'); return }
    if (!/^\d{6}$/.test(otp)) { setErr('Enter the 6-digit OTP. In this prototype any 6 digits work.'); return }
    finish(r, how, acc?.id)
  }

  const context = scheme ? (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-saffron-400 bg-saffron-50 p-4">
      <FileText size={18} className="mt-0.5 shrink-0 text-saffron-700" />
      <div className="text-sm"><p className="font-semibold text-navy-950">Sign in to apply for {scheme.name}</p><p className="text-slate-600">After signing in you’ll go straight to the application, with your verified profile pre-filled.</p></div>
    </div>
  ) : null

  const OtpBox = (
    <div className="mt-4"><Label htmlFor="otp">One-time password</Label><Input id="otp" inputMode="numeric" maxLength={6} value={otp} error={err} onChange={(e) => { setOtp(e.target.value); setErr('') }} placeholder="6 digits" autoFocus /></div>
  )
  const privacy = (
    <div className="mt-6 rounded-lg bg-navy-50 p-4 text-xs leading-relaxed text-slate-600">
      <p className="mb-1 flex items-center gap-1.5 font-semibold text-navy-900"><Lock size={13} />Privacy notice</p>
      Your data is used only to process scholarship applications under MoTA schemes. Access is role-based and logged. Sessions end automatically after inactivity. This prototype stores nothing permanently.
    </div>
  )

  if (mode !== 'new') {
    const acc = s.remembered ?? { name: 'Anjali Munda', mobile: '+91 XXXXX X0217', lastAt: '' }
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-navy-950">Sign in</h1>
        <p className="mb-6 mt-2 text-slate-600">{s.loggedIn ? 'You are already signed in on this device.' : 'We found a login saved on this device.'} How would you like to continue?</p>
        {context}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className={cx('flex flex-col p-6', mode === 'existing' && 'ring-2 ring-navy-900')}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Continue with existing login</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-navy-900 font-bold text-white">{acc.name.split(' ').map((w) => w[0]).join('')}</span>
              <div><p className="font-semibold text-navy-950">{acc.name}</p><p className="text-sm text-slate-500">{acc.mobile}</p></div>
            </div>
            <p className="mt-3 text-[13px] text-slate-600">{s.loggedIn ? <Badge color="green">Signed in now</Badge> : <>Last signed in {fmtDate(acc.lastAt.slice(0, 10))}{acc.lastAt.length > 10 ? ` · ${acc.lastAt.slice(11)}` : ''}</>}</p>
            <div className="mt-auto pt-5">
              {s.loggedIn ? (
                <Button className="w-full" size="lg" onClick={() => finish(s.role === 'student' ? 'student' : s.role, 'Continued existing session', undefined, true)}>Continue as {acc.name.split(' ')[0]}</Button>
              ) : mode === 'existing' ? (
                <>
                  <p className="text-[13px] text-slate-600">We sent an OTP to {acc.mobile}.</p>
                  {OtpBox}
                  <Button className="mt-4 w-full" size="lg" onClick={() => sendOrVerify('student', 'Existing login (saved on device)')}>Verify & continue</Button>
                </>
              ) : (
                <Button className="w-full" size="lg" onClick={() => { setMode('existing'); setOtpSent(true); s.toast(`OTP sent to ${acc.mobile} (prototype — enter any 6 digits)`, 'info') }}>Continue as {acc.name.split(' ')[0]}</Button>
              )}
              <button onClick={() => { s.set(() => ({ remembered: null, loggedIn: false })); s.toast('Saved login removed from this device', 'info'); reset('new') }} className="mt-3 w-full text-center text-xs font-semibold text-slate-500 hover:text-navy-900">Not you? Remove this account from the device</button>
            </div>
          </Card>
          <Card className="flex flex-col p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Use a new login</p>
            <div className="mt-4 grid h-12 w-12 place-items-center rounded-full border-2 border-dashed border-navy-100 text-navy-700"><UserPlus size={20} /></div>
            <p className="mt-3 text-[13px] text-slate-600">Sign in with a different mobile number or official user ID — for example another student, an institution, or the MoTA Super Admin.</p>
            <div className="mt-auto space-y-2 pt-5">
              <Button className="w-full" size="lg" variant="outline" onClick={() => { if (s.loggedIn) { s.signOut(); s.log('Signed out', 'Switching to a new login') } reset('new') }}>Sign in with another account</Button>
              <Button className="w-full" variant="outline" icon={<Fingerprint size={16} />} onClick={() => { if (s.loggedIn) { s.signOut(); s.log('Signed out', 'Switching to eKYC login') } reset('new'); setRole('student'); setMethod('ekyc') }}>Sign in with eKYC (Aadhaar / DigiLocker)</Button>
              <Button className="w-full" variant="ghost" icon={<UserPlus size={16} />} onClick={() => nav(`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`)}>Create Account</Button>
            </div>
          </Card>
        </div>
        {privacy}
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy-950">Sign in</h1>
        <p className="mt-2 text-slate-600">Choose how you use SANGAM Setu. Each role sees only the data it is authorised for.</p>
        <div className="mt-6">{context}</div>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Role">
          {LOGIN_ROLES.map((r) => (
            <button key={r} role="radio" aria-checked={role === r} onClick={() => { setRole(r); setOtpSent(false); setErr('') }} className={cx('rounded-xl border-2 p-3 text-left', role === r ? 'border-navy-900 bg-navy-50' : 'border-navy-100 bg-white hover:border-navy-600/30')}>
              <p className="text-sm font-semibold text-navy-950">{ROLE_META[r].label}</p><p className="truncate text-[11px] text-slate-500">{ROLE_META[r].org}</p>
            </button>
          ))}
        </div>
        {hasExisting && <button onClick={() => reset('choose')} className="mt-4 text-sm font-semibold text-navy-700 hover:underline">← Back to saved login</button>}
      </div>
      <Card className="p-6 sm:p-8">
        {role === 'student' && (
          <div className="mb-5"><Tabs value={method} onChange={(m) => { setMethod(m); setOtpSent(false); setErr('') }} tabs={[
            { id: 'otp', label: <span className="flex items-center gap-1.5"><Smartphone size={14} />Mobile OTP</span> },
            { id: 'ekyc', label: <span className="flex items-center gap-1.5"><Fingerprint size={14} />eKYC · Aadhaar / DigiLocker</span> },
          ]} /></div>
        )}
        {role === 'student' && method === 'ekyc' ? (
          <>
            <EKyc purpose="login" actionLabel="Continue" resolve={(q) => {
              const raw = q.raw.trim().toLowerCase()
              const acc = s.students.find((a) => q.method === 'aadhaar' ? a.details.aadhaarLast4 === raw.slice(-4) : [a.details.mobile, a.details.email?.toLowerCase(), a.details.email?.split('@')[0].toLowerCase()].includes(raw) || (raw.length === 12 && a.details.aadhaarLast4 === raw.slice(-4)))
              return acc ? { id: acc.id, name: acc.details.name ?? '', dob: displayValue('dob', acc.details.dob), gender: acc.details.gender ?? '', mobile: maskMobile(acc.details.mobile), address: [acc.details.district, acc.details.state].filter(Boolean).join(', ') } : null
            }} onVerified={(r: EKycResult) => { finish('student', `eKYC via ${r.method === 'aadhaar' ? 'Aadhaar OTP' : 'DigiLocker'} (${r.maskedId})`, r.accountId); if (r.method === 'digilocker' && r.docs.includes('income_cert')) s.set((p) => (p.vault.income_cert ? {} : { vault: { ...p.vault, income_cert: digiLockerIncomeDoc(r.name, p.students.find((a) => a.id === r.accountId)?.details.income) } })) }} />
            <p className="mt-3 text-center text-[11.5px] text-slate-500">Demo account: any Aadhaar number ending in 4821, or DigiLocker ID “anjali.m”.</p>
          </>
        ) : (
          <>
            <Label htmlFor="lid">{role === 'student' ? 'Mobile number' : 'Official user ID'}</Label>
            <Input id="lid" value={id} error={!otpSent ? err : undefined} placeholder={role === 'student' ? '10-digit mobile number' : 'e.g. MOTA-SA-01'} onChange={(e) => { setId(e.target.value); setErr('') }} />
            {role !== 'student' && !otpSent && <p className="mt-1 text-[11.5px] text-slate-500">{role === 'institution' ? 'Use your official email, institution code or AISHE code.' : 'Use your official email or admin user ID.'}{err.startsWith('No ') && <> <button className="font-semibold text-saffron-700 hover:underline" onClick={() => nav(`/register/${role === 'institution' ? 'institute' : 'admin'}`)}>Create an account →</button></>}</p>}
            {!otpSent && <DemoLogin role={role} onUse={(v) => { setId(v); setErr('') }} />}
            {role === 'student' && !otpSent && <p className="mt-1 text-[11.5px] text-slate-500">Use the mobile you registered with. {err.startsWith('No student account') && <button className="font-semibold text-saffron-700 hover:underline" onClick={() => nav(`/register/student${next ? `?next=${encodeURIComponent(next)}` : ''}`)}>Create a student account →</button>}</p>}
            {otpSent && OtpBox}
            <Button className="mt-5 w-full" size="lg" onClick={() => sendOrVerify(role, 'New login')}>{otpSent ? 'Verify & sign in' : 'Send OTP'}</Button>
            {role === 'student' && <button onClick={() => { setMethod('ekyc'); setErr('') }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-navy-100 py-2.5 text-sm text-slate-600 hover:bg-navy-50"><Fingerprint size={16} />Use eKYC instead — Aadhaar number or DigiLocker</button>}
          </>
        )}
        {privacy}
        <p className="mt-4 text-center text-sm">New to SANGAM Setu? <button onClick={() => nav(`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`)} className="font-semibold text-saffron-700">Create Account</button></p>
      </Card>
    </div>
  )
}

/** Demo credentials for the selected role, with a one-click fill. OTP: any 6 digits. */
function DemoLogin({ role, onUse }: { role: Role; onUse: (id: string) => void }) {
  const d = DEMO_LOGINS[role]
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-navy-100 bg-navy-50/50 px-3 py-2">
      <p className="min-w-0 flex-1 text-[12px] text-slate-600"><span className="font-semibold text-navy-900">Demo {ROLE_META[role].label.toLowerCase()} account:</span> {d.label}. OTP: any 6 digits.</p>
      <Button size="sm" variant="soft" onClick={() => onUse(d.id)}>Use demo account</Button>
    </div>
  )
}
