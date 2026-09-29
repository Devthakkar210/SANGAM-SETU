import { answersFor } from '../../components/DetailsForm'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X, Sparkles, UserCheck, ArrowLeft, RotateCcw, AlertTriangle, Info } from 'lucide-react'
import { useStore } from '../../store/AppStore'
import { AIBadge, Badge, Button, Card, cx, Input, Progress } from '../../components/ui'
import { evaluateScheme, inr, type Answers } from '../../lib/rules'

type Q = { key: keyof Answers; q: string; help?: string; options?: string[]; kind?: 'income' | 'marks' | 'text'; show?: (a: Answers) => boolean }

const QUESTIONS: Q[] = [
  { key: 'category', q: 'Are you from a Scheduled Tribe (ST) community?', help: 'You will need a valid ST certificate issued by a competent authority.', options: ['ST', 'Other'] },
  { key: 'educationLevel', q: 'What are you studying now, or about to start?', options: ['Class 9-10', 'Class 11-12', 'Undergraduate', 'Postgraduate', 'MPhil/PhD'] },
  { key: 'income', q: 'What is your family’s total annual income?', help: 'From all sources, as shown on your income certificate.', kind: 'income' },
  { key: 'institutionType', q: 'What type of institution are you in?', options: ['Government', 'Aided', 'Private', 'Notified Top Class', 'Foreign University'] },
  { key: 'course', q: 'Which course or programme?', kind: 'text' },
  { key: 'marks', q: 'What percentage did you score in your last qualifying exam?', kind: 'marks' },
  { key: 'studyLocation', q: 'Where are you studying?', options: ['Within home state', 'Outside home state', 'Abroad'] },
  { key: 'researchStatus', q: 'What is your research registration status?', help: 'Needed for fellowships such as NFST.', options: ['Registered', 'Applied', 'Not applicable'], show: (a) => ['Postgraduate', 'MPhil/PhD'].includes(a.educationLevel) },
]

const DEMO: Answers = { category: 'ST', educationLevel: 'MPhil/PhD', income: 240000, marks: 78, destination: 'Domestic', institutionType: 'Government', researchStatus: 'Registered', studyLocation: 'Within home state', course: 'PhD, Environmental Science' }

export default function Eligibility() {
  const store = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const focus = params.get('scheme')
  // signed-in students start from their own profile; visitors see the demo answers
  const mine = store.loggedIn && store.role === 'student' && !store.isDemoStudent ? answersFor(store.me.details) : DEMO
  const [a, setA] = useState<Answers>(mine)
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<'ask' | 'think' | 'done'>('ask')
  const qs = QUESTIONS.filter((q) => !q.show || q.show(a))
  const q = qs[Math.min(step, qs.length - 1)]

  const upd = (k: keyof Answers, v: string | number) => setA((p) => {
    const n = { ...p, [k]: v } as Answers
    if (k === 'studyLocation') n.destination = v === 'Abroad' ? 'Overseas' : 'Domestic'
    if (k === 'educationLevel' && !['Postgraduate', 'MPhil/PhD'].includes(String(v))) n.researchStatus = 'Not applicable'
    return n
  })
  const run = () => {
    setPhase('think')
    store.set(() => ({ eligibilityAnswers: a as unknown as Record<string, string | number> }))
    setTimeout(() => setPhase('done'), store.lowBandwidth ? 0 : 1700)
  }
  const next = () => (step < qs.length - 1 ? setStep(step + 1) : run())

  const results = useMemo(() => store.schemes.map((s) => evaluateScheme(s, a)).sort((x, y) => y.score - x.score), [store.schemes, a])
  const matches = results.filter((r) => r.verdict === 'match')
  const near = results.filter((r) => r.verdict === 'near')
  const no = results.filter((r) => r.verdict === 'no')

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2"><AIBadge label="Explainable matching" /></div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-navy-950">Find my scholarship</h1>
          <p className="mt-1 text-slate-600">Answer {qs.length} short questions. Each result shows exactly which rules matched.</p>
        </div>
        {phase === 'ask' && <Button variant="outline" icon={<UserCheck size={16} />} onClick={() => { setA(store.loggedIn && store.role === 'student' ? (store.isDemoStudent ? DEMO : answersFor(store.me.details)) : DEMO); run() }}>{store.loggedIn && store.role === 'student' ? 'Use my profile' : 'Use demo profile'}</Button>}
      </div>

      <AnimatePresence mode="wait">
        {phase === 'ask' && (
          <motion.div key={'q' + step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
            <Card className="p-6 sm:p-10">
              <div className="mb-8 flex items-center gap-4">
                <span className="text-sm font-semibold tabular-nums text-slate-500">{step + 1} of {qs.length}</span>
                <Progress value={((step + 1) / qs.length) * 100} />
              </div>
              <h2 className="font-display text-2xl font-bold text-navy-950 sm:text-[28px]">{q.q}</h2>
              {q.help && <p className="mt-2 text-slate-600">{q.help}</p>}
              <div className="mt-7">
                {q.options && (
                  <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label={q.q}>
                    {q.options.map((o) => {
                      const sel = String(a[q.key]) === o
                      return (
                        <button key={o} role="radio" aria-checked={sel} onClick={() => upd(q.key, o)}
                          className={cx('flex items-center justify-between rounded-xl border-2 px-4 py-3.5 text-left text-[15px] font-semibold transition', sel ? 'border-navy-900 bg-navy-50 text-navy-950' : 'border-navy-100 text-navy-800 hover:border-navy-600/40')}>
                          {o === 'ST' ? 'Yes, ST' : o === 'Other' ? 'No' : o}
                          <span className={cx('grid h-5 w-5 place-items-center rounded-full border-2', sel ? 'border-navy-900 bg-navy-900 text-white' : 'border-navy-100')}>{sel && <Check size={12} />}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
                {q.kind === 'income' && (
                  <div>
                    <p className="font-display text-4xl font-bold tabular-nums text-navy-950">{inr(a.income)}</p>
                    <label className="sr-only" htmlFor="inc">Annual family income</label>
                    <input id="inc" type="range" min={0} max={1000000} step={10000} value={a.income} onChange={(e) => upd('income', +e.target.value)} className="mt-4 w-full accent-saffron-500" />
                    <div className="mt-3 flex flex-wrap gap-2">{[150000, 240000, 450000, 800000].map((v) => <button key={v} onClick={() => upd('income', v)} className="rounded-full border border-navy-100 px-3 py-1 text-sm hover:bg-navy-50">{inr(v)}</button>)}</div>
                  </div>
                )}
                {q.kind === 'marks' && (
                  <div className="max-w-xs">
                    <label htmlFor="mk" className="sr-only">Percentage</label>
                    <div className="flex items-center gap-2"><Input id="mk" type="number" min={0} max={100} value={a.marks} onChange={(e) => upd('marks', Math.max(0, Math.min(100, +e.target.value)))} className="h-14 text-2xl font-bold" /><span className="text-2xl font-bold text-slate-400">%</span></div>
                  </div>
                )}
                {q.kind === 'text' && (
                  <div className="max-w-md"><label htmlFor="crs" className="sr-only">Course</label><Input id="crs" value={a.course} onChange={(e) => upd('course', e.target.value)} className="h-12 text-base" placeholder="e.g. B.Sc. Nursing" /></div>
                )}
              </div>
              <div className="mt-10 flex justify-between">
                <Button variant="ghost" icon={<ArrowLeft size={16} />} disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
                <Button variant={step === qs.length - 1 ? 'saffron' : 'primary'} size="lg" onClick={next}>{step === qs.length - 1 ? 'Show matching schemes' : 'Next'}</Button>
              </div>
            </Card>
          </motion.div>
        )}

        {phase === 'think' && (
          <motion.div key="think" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="p-10">
              <div className="flex items-center gap-3"><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}><Sparkles className="text-violet-600" /></motion.span><p className="font-display text-xl font-bold text-navy-950">Checking your answers against {store.schemes.length} scheme rule sets…</p></div>
              <ul className="mt-6 space-y-2">
                {store.schemes.map((s, i) => (
                  <motion.li key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.25 }} className="flex items-center gap-3 text-sm text-slate-700">
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.25 + 0.2 }} className="grid h-5 w-5 place-items-center rounded-full bg-navy-900 text-white"><Check size={11} /></motion.span>
                    {s.name} · {s.rules.length} rules evaluated
                  </motion.li>
                ))}
              </ul>
            </Card>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-bold text-navy-950">{matches.length ? `${matches.length} potentially matching scheme${matches.length > 1 ? 's' : ''}` : 'No full match yet'}</h2>
              <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={() => { setPhase('ask'); setStep(0) }}>Change answers</Button>
            </div>
            <div className="space-y-4">
              {matches.map((r, i) => (
                <motion.div key={r.scheme.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Card className={cx('overflow-hidden', focus === r.scheme.id && 'ring-2 ring-saffron-500')}>
                    <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.1fr]">
                      <div>
                        <div className="flex items-center gap-2"><Badge color="green">Potential match</Badge><Badge color="gray">{r.scheme.code}</Badge></div>
                        <h3 className="mt-3 font-display text-2xl font-bold text-navy-950">{r.scheme.name}</h3>
                        <p className="mt-2 text-[14.5px] text-slate-600">{r.scheme.description}</p>
                        <p className="mt-3 text-sm"><span className="text-slate-500">Main benefit: </span><span className="font-semibold text-navy-950">{r.scheme.benefits[0]}</span></p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          <Button variant="saffron" onClick={() => nav(`/login?next=${encodeURIComponent(`/student/apply/${r.scheme.id}`)}&scheme=${r.scheme.id}`)}>Start application</Button>
                          <Button variant="outline" onClick={() => nav('/schemes')}>View scheme</Button>
                        </div>
                      </div>
                      <div className="rounded-xl bg-leaf-50/60 p-5">
                        <p className="mb-3 text-[13px] font-semibold text-leaf-700">Why this matched</p>
                        <ul className="space-y-2.5">
                          {r.results.map((x, k) => (
                            <motion.li key={x.rule.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + k * 0.08 }} className="flex items-start gap-2.5 text-[14px] text-navy-950">
                              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-leaf-600 text-white"><Check size={12} /></span>{x.reason}
                            </motion.li>
                          ))}
                        </ul>
                        <p className="mt-4 border-t border-leaf-600/15 pt-3 text-xs text-slate-600">Indicative only. Final eligibility is confirmed after document and officer verification.</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
              {near.length > 0 && (
                <div className="pt-4">
                  <h3 className="mb-3 font-display text-lg font-bold text-navy-950">Almost eligible — one condition not met</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {near.map((r) => {
                      const miss = r.results.find((x) => !x.pass)!
                      return (
                        <Card key={r.scheme.id} className="p-5">
                          <div className="flex items-center justify-between"><p className="font-semibold text-navy-950">{r.scheme.name}</p><span className="text-sm font-bold tabular-nums text-saffron-700">{r.score}%</span></div>
                          <p className="mt-2 flex items-start gap-2 text-[13.5px] text-saffron-700"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{miss.reason}</p>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}
              {no.length > 0 && (
                <details className="rounded-xl border border-navy-100 bg-white p-5">
                  <summary className="cursor-pointer text-sm font-semibold text-navy-900">{no.length} scheme(s) not matching — see why</summary>
                  <ul className="mt-3 space-y-3">
                    {no.map((r) => (
                      <li key={r.scheme.id}><p className="text-sm font-semibold text-navy-950">{r.scheme.name}</p>
                        <ul className="mt-1 space-y-1">{r.results.filter((x) => !x.pass).map((x) => <li key={x.rule.id} className="flex gap-2 text-[13px] text-slate-600"><X size={14} className="mt-0.5 text-red-500" />{x.reason}</li>)}</ul>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <p className="flex items-start gap-2 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Rules come live from the scheme configuration. When an administrator changes a rule in the Scheme Builder, these results change too.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
