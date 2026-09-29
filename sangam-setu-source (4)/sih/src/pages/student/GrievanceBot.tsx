import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Send, RotateCcw, UserRound, Headset, Ticket, FileArchive } from 'lucide-react'
import { useStore, schemeById } from '../../store/AppStore'
import { DEMO_STUDENT_ID } from '../../data/mock'
import { AI_CONF_THRESHOLD, inr, now, today } from '../../lib/rules'
import type { DocType, Grievance } from '../../types'
import { Badge, Button, cx } from '../../components/ui'

type Opt = { label: string; go: Node; payload?: string }
type Msg = { id: number; from: 'bot' | 'user' | 'agent'; body: ReactNode; options?: Opt[]; ticket?: string }
type Node = 'menu' | 'money' | 'moneyTicket' | 'bank' | 'bankTicket' | 'docMissing' | 'doc' | 'dlfetch' | 'docTicket' | 'size' | 'compress' | 'sizeTicket' | 'agent' | 'track' | 'thanks'

const MAX_MB = 2
const DOCS: { key: DocType; label: string; where: string; time: string; alt: string; dl: boolean }[] = [
  { key: 'income_cert', label: 'Income certificate', where: 'Issued by the Circle Officer / Tehsildar. Apply online on your state e-District portal or at the nearest CSC.', time: 'Usually 7–15 working days', alt: 'You can submit the application now with last year’s certificate and upload the current one when issued — the officer will see it is pending (example policy).', dl: true },
  { key: 'st_cert', label: 'ST certificate', where: 'Issued by the competent revenue authority (SDM / Circle Officer) of your home district.', time: 'Usually 15–30 working days', alt: 'An acknowledgement slip of your ST certificate application can be uploaded meanwhile; the officer decides whether to accept it provisionally.', dl: true },
  { key: 'bonafide', label: 'Bonafide certificate', where: 'Ask your institution’s scholarship nodal officer — they can also issue it digitally on this platform.', time: 'Usually 1–3 working days', alt: 'Your institution can confirm enrolment directly during verification, which may replace the certificate.', dl: false },
  { key: 'marksheet', label: 'Marksheet', where: 'Issued by your board or university examination cell.', time: 'Duplicate copies: 7–20 days', alt: 'A provisional or online marksheet from the university portal is usually accepted.', dl: true },
  { key: 'bank', label: 'Bank passbook', where: 'Any branch of your bank can print the first page; a cancelled cheque also works.', time: 'Same day', alt: 'A bank statement showing your name, account number and IFSC is accepted.', dl: false },
  { key: 'research_reg', label: 'PhD registration letter', where: 'Issued by your university’s research / PhD cell.', time: 'Usually 3–7 working days', alt: 'A letter from your supervisor with the registration number can be uploaded meanwhile.', dl: false },
]

export function GrievanceBot({ startTopic }: { startTopic?: string | null }) {
  const s = useStore()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [typing, setTyping] = useState(false)
  const [agentMode, setAgentMode] = useState<string | null>(null)
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const idRef = useRef(0)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: s.lowBandwidth ? 'auto' : 'smooth', block: 'nearest' }) }, [msgs, typing, s.lowBandwidth])

  const push = (m: Omit<Msg, 'id'>) => setMsgs((p) => [...p, { ...m, id: ++idRef.current }])
  const later = (fn: () => void, ms = 700) => { setTyping(true); timers.current.push(window.setTimeout(() => { setTyping(false); fn() }, s.lowBandwidth ? 50 : ms)) }

  const mine = s.applications.filter((a) => a.studentId === s.demoStudentId)
  const pays = s.disbursements.filter((d) => mine.some((a) => a.id === d.applicationId))
  const myName = s.me.details.name ?? 'Student'
  const first = myName.split(' ')[0]
  const myGrievances = s.grievances.filter((g) => (g.studentId ?? DEMO_STUDENT_ID) === s.studentId)
  const maskedAcct = s.me.details.bankAccount ? `XXXXXXXX${s.me.details.bankAccount.slice(-4)}` : 'not added yet'

  const createTicket = (g: Pick<Grievance, 'category' | 'subject' | 'description'> & Partial<Grievance>) => {
    const id = `GRV-2026-0${400 + s.grievances.length + Math.floor(Math.random() * 9)}`
    const ticket: Grievance = { status: 'Open', channel: 'AI assistant', priority: 'Normal', ...g, id, studentId: s.studentId, createdOn: today(), thread: [{ by: `${myName} (via AI assistant)`, text: g.description, at: now() }, ...(g.thread ?? [])] }
    s.set((p) => ({ grievances: [ticket, ...p.grievances] }))
    s.notify({ title: `New complaint ${id}: ${g.category}`, body: `${g.subject} · raised via AI assistant`, channel: ['in-app', 'email'], kind: 'action', audience: 'admin' })
    s.notify({ title: `Complaint ${id} registered`, body: `${g.subject}. You can track it under Grievances.`, channel: ['in-app', 'sms'], kind: 'info', audience: 'student' })
    s.log('Grievance raised', `${id} · ${g.category} · via AI assistant`, g.applicationId, { user: myName, role: 'Student' })
    s.toast(`Complaint ${id} raised — visible to the MoTA team`)
    return id
  }

  const main: Opt = { label: 'Main menu', go: 'menu' }
  const ticketMsg = (id: string, who: string, eta: string): ReactNode => (
    <>I’ve raised complaint <b>{id}</b> and assigned it to <b>{who}</b>. It is now visible on the MoTA grievance dashboard. Expected first response: <b>{eta}</b>. You’ll get an SMS on every update.</>
  )

  const run = (go: Node, payload?: string, file?: File) => {
    switch (go) {
      case 'menu':
        return later(() => push({ from: 'bot', body: <>Hi {first}, I’m <b>SetuSakha</b>, your grievance assistant. Choose what you need help with — I’ll check your records and either solve it or raise a complaint for you.</>, options: [
          { label: 'Money not received', go: 'money' }, { label: 'A document is unavailable', go: 'docMissing' },
          { label: 'Can’t upload — file too large', go: 'size' }, { label: 'Talk to an agent', go: 'agent' }, { label: 'Track my complaints', go: 'track' },
        ] }), 400)

      case 'money': {
        const lines = mine.filter((a) => a.submittedOn).map((a) => {
          const sc = schemeById(s.schemes, a.schemeId)
          const p = pays.filter((d) => d.applicationId === a.id)
          const failed = p.find((d) => d.status === 'Failed')
          const pending = p.find((d) => d.status === 'Pending' || d.status === 'Processing')
          const paid = p.filter((d) => d.status === 'Disbursed')
          const status = failed ? `⚠ ${failed.installment} failed at PFMS — beneficiary account could not be credited.`
            : pending ? `${pending.installment} (${inr(pending.amount)}) is ${pending.status.toLowerCase()} at PFMS. Credits usually take 3–5 working days after processing.`
              : paid.length ? `${paid.length} instalment(s) credited: ${paid.map((d) => `${inr(d.amount)} on ${d.date} (ref ${d.reference})`).join('; ')}.`
                : `No payment yet — the application is at “${a.stage}”. Payment starts only after sanction.`
          return <li key={a.id}><b>{sc?.short} · {a.id}</b><br />{status}</li>
        })
        return later(() => push({ from: 'bot', body: <><p>I checked your payment records:</p><ul className="mt-1.5 list-disc space-y-1.5 pl-4">{lines}</ul><p className="mt-2">Bank account on file: {maskedAcct}.</p></>, options: [
          { label: 'Credited but not in my bank', go: 'moneyTicket', payload: 'credited' }, { label: 'Payment is delayed / failed', go: 'moneyTicket', payload: 'delayed' },
          { label: 'Update my bank details', go: 'bank' }, { label: 'That answers it', go: 'thanks' }, main,
        ] }), 1200)
      }
      case 'moneyTicket': {
        const app = mine.find((a) => a.id === s.demoAppId) ?? mine[0]
        const id = createTicket({ category: 'Payment not received', subject: payload === 'credited' ? 'Payment shown as credited but not received in bank' : 'Scholarship payment delayed or failed', description: payload === 'credited' ? `The portal shows the instalment as credited but the amount has not reached my bank account ${maskedAcct}.` : 'My scholarship payment has not been received / shows as pending or failed.', applicationId: app?.id, assignedTo: 'PFMS Cell – Jharkhand', status: 'Assigned', priority: pays.some((d) => d.status === 'Failed') ? 'High' : 'Normal' })
        return later(() => push({ from: 'bot', body: ticketMsg(id, 'PFMS Cell – Jharkhand', '3 working days'), ticket: id, options: [{ label: 'Talk to an agent', go: 'agent' }, main] }), 900)
      }
      case 'bank':
        return later(() => push({ from: 'bot', body: <>Your bank details are part of your <b>verified profile</b>, so they’re locked to prevent fraud. To change them you need: a new passbook or cancelled cheque, Aadhaar seeding of the new account (NPCI mapping), and a penny-drop check (prototype). An officer approves the change before the next payment.</>, options: [{ label: 'Raise bank update request', go: 'bankTicket' }, main] }))
      case 'bankTicket': {
        const id = createTicket({ category: 'Bank details', subject: 'Request to update bank account for scholarship', description: 'I want to change the bank account linked to my scholarship. I will upload the new passbook.', assignedTo: 'MoTA Super Admin', status: 'Assigned' })
        return later(() => push({ from: 'bot', body: ticketMsg(id, 'MoTA Super Admin', '2 working days'), ticket: id, options: [main] }))
      }

      case 'docMissing':
        return later(() => push({ from: 'bot', body: 'Which document can’t you get right now?', options: [...DOCS.map((d) => ({ label: d.label, go: 'doc' as Node, payload: d.key })), main] }), 500)
      case 'doc': {
        const d = DOCS.find((x) => x.key === payload)!
        return later(() => push({ from: 'bot', body: <><p><b>{d.label}</b></p><p className="mt-1"><b>Where to get it:</b> {d.where}</p><p className="mt-1"><b>Typical time:</b> {d.time}</p><p className="mt-1"><b>Meanwhile:</b> {d.alt}</p></>, options: [
          ...(d.dl ? [{ label: 'Fetch from DigiLocker (prototype)', go: 'dlfetch' as Node, payload: d.key }] : []),
          { label: 'Request more time (raise complaint)', go: 'docTicket', payload: d.key }, { label: 'That helps', go: 'thanks' }, main,
        ] }), 1000)
      }
      case 'dlfetch': {
        const d = DOCS.find((x) => x.key === payload)!
        const inVault = !!s.vault[d.key]
        if (!inVault && d.key === 'income_cert') s.set((p) => ({ vault: { ...p.vault, income_cert: { id: 'd-inc', type: 'income_cert', label: 'Income Certificate', fileName: 'Income_Certificate_2025-26_DigiLocker.pdf', status: 'Verified by AI', confidence: 94, extracted: { Name: myName, 'Annual family income': s.me.details.income && !s.isDemoStudent ? inr(Number(s.me.details.income)) : '₹3,20,000', 'Financial year': '2025-26', 'Valid till': '31 Mar 2027' } } } }))
        const found = inVault || d.key === 'income_cert'
        return later(() => push({ from: 'bot', body: found
          ? <>{inVault ? <>Your <b>{d.label}</b> is already in your document vault (verified).</> : <>Found your <b>{d.label}</b> in DigiLocker (simulated) and added it to your vault. Read confidence 94% — above the {AI_CONF_THRESHOLD}% threshold, so no manual check is needed.</>} You can use it in any application.</>
          : <>I couldn’t find a {d.label} in your DigiLocker (simulated). It has to be issued by the authority first.</>, options: [main] }), 1600)
      }
      case 'docTicket': {
        const d = DOCS.find((x) => x.key === payload)!
        const app = mine.find((a) => a.id === s.demoAppId)
        const id = createTicket({ category: 'Document issue', subject: `${d.label} unavailable — request for extension`, description: `I am unable to obtain my ${d.label.toLowerCase()} before the deadline. ${d.time}. Requesting extra time to submit it.`, applicationId: app?.id, assignedTo: 'MoTA Super Admin', status: 'Assigned' })
        return later(() => push({ from: 'bot', body: ticketMsg(id, 'MoTA Super Admin', '2 working days'), ticket: id, options: [main] }))
      }

      case 'size':
        return later(() => push({ from: 'bot', body: <><p>Each file can be up to <b>{MAX_MB} MB</b> (PDF, JPG or PNG). Phone photos are often 4–8 MB.</p><ul className="mt-1.5 list-disc space-y-1 pl-4"><li>Scan at 150–200 DPI instead of 600.</li><li>Save as PDF or JPG, not HEIC.</li><li>Crop to the page edges.</li></ul><p className="mt-1.5">I can compress it for you right here — the AI then re-checks that it’s still readable.</p></>, options: [
          { label: 'Compress my file', go: 'compress', payload: 'pick' }, { label: 'Try with a sample 4.8 MB scan', go: 'compress', payload: 'sample' },
          { label: 'Still failing — raise complaint', go: 'sizeTicket' }, main,
        ] }))
      case 'compress': {
        if (payload === 'pick' && !file) { fileRef.current?.click(); return }
        const name = file?.name ?? 'Income_Certificate_photo.jpg'
        const mb = file ? file.size / 1024 / 1024 : 4.8
        if (mb <= MAX_MB) return later(() => push({ from: 'bot', body: <><b>{name}</b> is {mb.toFixed(2)} MB — already within the {MAX_MB} MB limit. If upload still fails, the format may be unsupported (e.g. HEIC) or the file may be password-protected. Try exporting it as PDF.</>, options: [{ label: 'Still failing — raise complaint', go: 'sizeTicket' }, main] }), 900)
        const out = Math.max(0.35, Math.min(1.4, mb * 0.17))
        return later(() => push({ from: 'bot', body: <><p>Compressed <b>{name}</b>: {mb.toFixed(1)} MB → <b>{out.toFixed(2)} MB</b> ✓</p><p className="mt-1">Readability check after compression: 93% confidence (threshold {AI_CONF_THRESHOLD}%) — text and seal still clear.</p></>, options: [{ label: 'Save to my vault', go: 'thanks', payload: 'saved' }, main] }), 1800)
      }
      case 'sizeTicket': {
        const id = createTicket({ category: 'Technical issue', subject: 'Unable to upload document — file size / format', description: `Document upload fails even after reducing size below ${MAX_MB} MB.`, assignedTo: 'Technical Support – Platform Cell', status: 'Assigned' })
        return later(() => push({ from: 'bot', body: ticketMsg(id, 'Technical Support – Platform Cell', '1 working day'), ticket: id, options: [main] }))
      }

      case 'agent': {
        const id = createTicket({ category: 'Talk to an agent', subject: 'Student requested a helpdesk agent', description: 'Requested live assistance through the AI grievance assistant.', assignedTo: 'Helpdesk Tier-1 (R. Hembrom)', status: 'In Progress', channel: 'Helpdesk agent' })
        later(() => push({ from: 'bot', body: <>Connecting you to a helpdesk agent… Your chat is linked to ticket <b>{id}</b> so nothing is lost.</>, ticket: id }), 500)
        timers.current.push(window.setTimeout(() => { setAgentMode(id); push({ from: 'agent', body: `Namaste ${first}, I’m R. Hembrom from the MoTA scholarship helpdesk (simulated agent). I can see your applications and payments. How can I help?` }) }, s.lowBandwidth ? 100 : 2400))
        return
      }
      case 'track': {
        const list = myGrievances.slice(0, 5)
        return later(() => push({ from: 'bot', body: list.length ? <><p>Your recent complaints:</p><ul className="mt-1.5 space-y-1">{list.map((g) => <li key={g.id}><b>{g.id}</b> · {g.subject} — <i>{g.status}</i>{g.assignedTo ? ` (${g.assignedTo})` : ''}</li>)}</ul></> : 'You have no complaints yet.', options: [main] }))
      }
      case 'thanks':
        if (payload === 'saved') s.toast('Compressed file saved to your document vault (sample)')
        return later(() => push({ from: 'bot', body: payload === 'saved' ? 'Saved. You can now attach it from the Documents step of any application.' : 'Glad I could help! Anything else?', options: [main] }), 500)
    }
  }

  const choose = (o: Opt) => {
    setMsgs((p) => p.map((m) => ({ ...m, options: undefined })))
    push({ from: 'user', body: o.label })
    run(o.go, o.payload)
  }
  const restart = () => { timers.current.forEach(clearTimeout); setMsgs([]); setAgentMode(null); setTyping(false); run('menu') }

  const sendAgent = () => {
    const t = text.trim()
    if (!t || !agentMode) return
    push({ from: 'user', body: t }); setText('')
    s.set((p) => ({ grievances: p.grievances.map((g) => g.id === agentMode ? { ...g, thread: [...g.thread, { by: myName, text: t, at: now() }] } : g) }))
    timers.current.push(window.setTimeout(() => {
      const reply = /money|payment|paisa|amount|credit/i.test(t) ? 'I’ve checked with the PFMS cell — I’ve flagged your payment for priority reconciliation on this ticket. You’ll get an SMS within 3 working days.'
        : /document|certificate|upload/i.test(t) ? 'Understood. I’ve asked the MoTA Super Admin to allow extra time for this document; it’s noted on your ticket.'
          : 'Thank you, I’ve noted this on your ticket. A resolution officer will call you on +91 XXXXX X0217 within 24 hours.'
      push({ from: 'agent', body: reply })
      s.set((p) => ({ grievances: p.grievances.map((g) => g.id === agentMode ? { ...g, thread: [...g.thread, { by: 'R. Hembrom (Helpdesk agent)', text: reply, at: now() }] } : g) }))
    }, s.lowBandwidth ? 80 : 1300))
  }

  // Start the conversation (optionally jump straight to a topic)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    run('menu')
    if (startTopic === 'money') timers.current.push(window.setTimeout(() => choose({ label: 'Money not received', go: 'money' }), 600))
  }, []) // eslint-disable-line

  return (
    <div className="flex h-[620px] flex-col overflow-hidden rounded-xl border border-navy-100 bg-white shadow-card">
      <div className="flex items-center gap-3 bg-gradient-to-r from-navy-950 to-navy-800 px-4 py-3 text-white">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-saffron-500 text-navy-950">{agentMode ? <Headset size={18} /> : <Bot size={18} />}</div>
        <div className="flex-1"><p className="font-display font-bold">{agentMode ? 'Helpdesk agent · R. Hembrom' : 'SetuSakha · Grievance assistant'}</p><p className="text-[11px] text-white/70">{agentMode ? `Linked to ${agentMode} · simulated live chat` : 'AI-assisted · menu driven · raises complaints to MoTA'}</p></div>
        <button onClick={restart} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-white/80 hover:bg-white/10" aria-label="Restart conversation"><RotateCcw size={13} />Restart</button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-paper p-4" aria-live="polite">
        <AnimatePresence initial={false}>
          {msgs.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cx('flex gap-2', m.from === 'user' && 'justify-end')}>
              {m.from !== 'user' && <span className={cx('mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full', m.from === 'agent' ? 'bg-leaf-600 text-white' : 'bg-navy-900 text-white')}>{m.from === 'agent' ? <Headset size={14} /> : <Bot size={14} />}</span>}
              <div className={cx('max-w-[85%]', m.from === 'user' && 'order-first')}>
                <div className={cx('rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed', m.from === 'user' ? 'rounded-br-sm bg-navy-900 text-white' : m.from === 'agent' ? 'rounded-bl-sm border border-leaf-500/30 bg-leaf-50 text-navy-950' : 'rounded-bl-sm border border-navy-100 bg-white text-navy-950')}>
                  {m.body}
                  {m.ticket && <div className="mt-2"><Badge color="amber"><Ticket size={11} />{m.ticket}</Badge></div>}
                </div>
                {m.options && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.options.map((o) => <button key={o.label} onClick={() => choose(o)} className="rounded-full border border-navy-600/25 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-navy-800 transition hover:border-navy-900 hover:bg-navy-50">{o.label}</button>)}
                  </div>
                )}
              </div>
              {m.from === 'user' && <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-saffron-100 text-saffron-700"><UserRound size={14} /></span>}
            </motion.div>
          ))}
        </AnimatePresence>
        {typing && <div className="flex items-center gap-2 pl-9 text-xs text-slate-500"><span className="flex gap-1">{[0, 1, 2].map((i) => <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} />)}</span>SetuSakha is checking…</div>}
        <div ref={endRef} />
      </div>
      <input ref={fileRef} type="file" className="hidden" aria-label="Choose a file to compress" onChange={(e) => { const f = e.target.files?.[0]; if (f) { push({ from: 'user', body: <span className="flex items-center gap-1.5"><FileArchive size={14} />{f.name}</span> }); run('compress', 'file', f) } e.target.value = '' }} />
      {agentMode ? (
        <div className="flex gap-2 border-t border-navy-100 p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendAgent()} placeholder="Type your message to the agent…" aria-label="Message to agent"
            className="h-10 flex-1 rounded-lg border border-navy-100 px-3 text-sm outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15" />
          <Button onClick={sendAgent} disabled={!text.trim()} icon={<Send size={15} />}>Send</Button>
        </div>
      ) : <p className="border-t border-navy-100 px-4 py-2.5 text-[11.5px] text-slate-500">Choose an option above. Complaints raised here go straight to the MoTA grievance dashboard.</p>}
    </div>
  )
}
