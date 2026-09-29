import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  UserRound, ListChecks, ScanSearch, Building2, Stamp, IndianRupee, Search, FileEdit, Trophy, BadgeCheck, RefreshCw,
  Layers, Sparkles, Users, Zap, GraduationCap, Frown, Blocks, Languages, Eye, Shuffle, Route, BarChart3, UserCheck, FileStack, Wrench, ArrowDown, Check, PlayCircle,
} from 'lucide-react'
import { useStore } from '../../store/AppStore'
import { Button, Counter, cx } from '../../components/ui'
import { ProductTour } from '../../components/demo/ProductTour'
import { DemoAccountsSection } from '../../components/demo/DemoAccounts'
import { HOME_SECTIONS } from '../../components/demo/demoConfig'

const PIPE = [
  { icon: UserRound, t: 'Student', d: 'Anjali, PhD scholar · Ranchi' },
  { icon: ListChecks, t: 'Eligibility', d: '5 of 5 NFST rules matched' },
  { icon: ScanSearch, t: 'AI Verification', d: '6 documents read · 1 mismatch sent to student' },
  { icon: Building2, t: 'Institution', d: 'Enrolment confirmed by nodal officer' },
  { icon: Stamp, t: 'Super Admin', d: 'Scrutinised & approved by MoTA, with remarks' },
  { icon: IndianRupee, t: 'Scholarship', d: 'Fellowship credited · ref PFMS-PROTO-8801' },
]

function HeroPipeline() {
  const { lowBandwidth } = useStore()
  const [i, setI] = useState(lowBandwidth ? PIPE.length - 1 : 0)
  useEffect(() => {
    if (lowBandwidth) return
    const t = setInterval(() => setI((x) => (x + 1) % (PIPE.length + 1)), 1500)
    return () => clearInterval(t)
  }, [lowBandwidth])
  const active = Math.min(i, PIPE.length - 1)
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6" aria-label="Animated application journey">
      <div className="mb-4 flex items-center justify-between text-xs text-navy-100">
        <span className="font-semibold text-white">NFST-2026-10482</span>
        <span className="rounded-full bg-leaf-500/20 px-2 py-0.5 font-semibold text-leaf-100">Live journey</span>
      </div>
      <ol className="relative space-y-1">
        <span className="absolute bottom-5 left-[19px] top-5 w-px bg-white/15" aria-hidden />
        <motion.span className="absolute bottom-5 left-[19px] top-5 w-px origin-top bg-saffron-400" aria-hidden
          animate={{ scaleY: active / (PIPE.length - 1) }} transition={{ duration: 0.5 }} />
        {PIPE.map((p, k) => {
          const done = k < active, on = k === active
          return (
            <li key={p.t} className="relative flex items-center gap-4 rounded-xl px-0 py-2">
              <motion.span animate={{ scale: on ? 1.08 : 1 }} className={cx('relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors',
                done ? 'border-leaf-500 bg-leaf-500 text-white' : on ? 'border-saffron-400 bg-saffron-500 text-navy-950' : 'border-white/20 bg-navy-900 text-navy-100')}>
                {done ? <Check size={18} /> : <p.icon size={18} />}
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className={cx('text-[15px] font-semibold', on || done ? 'text-white' : 'text-navy-100/60')}>{p.t}</p>
                <AnimatePresence mode="wait">
                  {(on || done) && <motion.p key={p.d} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={cx('truncate text-[13px]', on ? 'text-saffron-400' : 'text-navy-100/70')}>{p.d}</motion.p>}
                </AnimatePresence>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="mt-4 border-t border-white/10 pt-3 text-[11.5px] text-navy-100/80">AI flags and explains. The MoTA Super Admin decides.</p>
    </div>
  )
}

const STORY = [
  { icon: Frown, t: 'A student with a real need', d: 'A first-generation ST learner qualifies for support, but doesn’t know which scheme fits, what papers matter, or who to ask.' },
  { icon: Shuffle, t: 'Fragmented portals', d: 'Five schemes, five sets of forms. The same certificates are uploaded again and again, and one small error means starting over.' },
  { icon: Layers, t: 'One unified platform', d: 'Every ST scheme runs on one configurable engine. One verified profile is reused across all of them.' },
  { icon: Sparkles, t: 'AI assistance', d: 'OCR reads each document, cross-checks it against the form, and explains every issue in plain language before submission.' },
  { icon: Users, t: 'Human verification', d: 'Institutions confirm enrolment and officers take every decision. AI never approves or rejects.' },
  { icon: Zap, t: 'Faster resolution', d: 'A deficiency is fixed field-by-field, not by re-applying. Grievances carry a ticket, an owner and a timeline.' },
  { icon: GraduationCap, t: 'Scholarship received', d: 'Sanction and disbursement are tracked to the payment reference, and renewal opens automatically next year.' },
]

function StoryVisual({ i }: { i: number }) {
  const S = STORY[i]
  return (
    <div className="relative h-full min-h-[340px] overflow-hidden rounded-2xl bg-navy-950 p-8 text-white">
      <div className="decor dot-grid absolute inset-0 opacity-20" style={{ filter: 'invert(1)' }} />
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }} className="relative flex h-full flex-col">
          <span className="text-sm font-semibold text-saffron-400">{String(i + 1).padStart(2, '0')} / 07</span>
          <div className="my-auto py-8">
            {i === 1 ? (
              <div className="relative h-40">
                {['Portal A', 'Portal B', 'State site', 'Paper form', 'Email'].map((p, k) => (
                  <motion.div key={p} initial={{ rotate: 0 }} animate={{ rotate: (k - 2) * 7, x: (k - 2) * 38, y: (k % 2) * 18 }} className="absolute left-1/2 top-6 w-32 -translate-x-1/2 rounded-lg border border-white/20 bg-navy-800 px-3 py-2 text-xs">{p}<div className="mt-2 h-1.5 w-3/4 rounded bg-white/15" /><div className="mt-1 h-1.5 w-1/2 rounded bg-white/15" /></motion.div>
                ))}
              </div>
            ) : i === 2 ? (
              <div className="mx-auto w-56 rounded-xl border border-saffron-400/50 bg-navy-800 p-4">
                <p className="text-xs text-saffron-400">SANGAM Setu</p>
                {['Pre-Matric', 'Post-Matric', 'Top Class', 'NFST', 'NOS'].map((x, k) => <motion.div key={x} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.07 }} className="mt-2 flex items-center gap-2 rounded bg-white/5 px-2 py-1.5 text-xs"><Check size={12} className="text-leaf-500" />{x}</motion.div>)}
              </div>
            ) : i === 3 ? (
              <div className="relative mx-auto h-44 w-36 overflow-hidden rounded-lg bg-white p-3">
                {[...Array(8)].map((_, k) => <div key={k} className="mb-2 h-1.5 rounded bg-slate-200" style={{ width: `${50 + ((k * 23) % 45)}%` }} />)}
                <div className="absolute bottom-3 left-3 right-3 rounded bg-saffron-100 px-2 py-1 text-[10px] font-semibold text-saffron-700">Income ≠ form value</div>
                <motion.div className="scan-line absolute left-0 right-0 h-10" animate={{ top: ['-20%', '100%'] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }} />
              </div>
            ) : (
              <S.icon size={88} strokeWidth={1.3} className="mx-auto text-saffron-400" />
            )}
          </div>
          <p className="font-display text-2xl font-bold">{S.t}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const LIFECYCLE = [
  { icon: Search, t: 'Discover' }, { icon: ListChecks, t: 'Check Eligibility' }, { icon: FileEdit, t: 'Apply' }, { icon: ScanSearch, t: 'AI Verification' },
  { icon: Building2, t: 'Institution Verification' }, { icon: Stamp, t: 'Super Admin Scrutiny' }, { icon: Trophy, t: 'Selection' }, { icon: BadgeCheck, t: 'Sanction' },
  { icon: IndianRupee, t: 'Disbursement' }, { icon: RefreshCw, t: 'Renewal' },
]

const DIFFS = [
  { icon: Layers, t: 'Unified multi-scheme platform' }, { icon: ScanSearch, t: 'AI-assisted document scrutiny' }, { icon: Eye, t: 'Explainable AI — every flag has a reason' },
  { icon: UserCheck, t: 'Reusable verified student profile' }, { icon: FileEdit, t: 'Scheme-specific dynamic forms' }, { icon: FileStack, t: 'Dynamic document checklist' },
  { icon: Wrench, t: 'Field-level deficiency resolution' }, { icon: Building2, t: 'Institution verification' }, { icon: Route, t: 'End-to-end lifecycle tracking' },
  { icon: BarChart3, t: 'Administrative analytics' }, { icon: Blocks, t: 'No-code scheme & rule engine' }, { icon: Users, t: 'Human-in-the-loop decisions' },
  { icon: Languages, t: 'Multilingual, accessible, low-bandwidth' },
]

export default function Landing() {
  const { t, lowBandwidth } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [tourStart, setTourStart] = useState(0)
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: lowBandwidth ? 'auto' : 'smooth', block: 'start' })
  const startTour = () => { setTourStart((n) => n + 1); scrollTo(HOME_SECTIONS.tour) }
  // header links ("How It Works", "Demo") arrive with the section in router state
  useEffect(() => {
    const section = (loc.state as { section?: string } | null)?.section
    if (!section) return
    // clear the state inside the timer: clearing it first would re-run this effect and cancel the scroll
    const id = window.setTimeout(() => {
      if (section === HOME_SECTIONS.tour) setTourStart((n) => n + 1)
      scrollTo(section)
      nav('/', { replace: true, state: null })
    }, 60)
    return () => window.clearTimeout(id)
  }, [loc.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const [beat, setBeat] = useState(0)
  const lifeRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: lifeRef, offset: ['start 80%', 'end 60%'] })
  const lineW = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="decor absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-navy-700/40 blur-3xl" />
        <div className="decor absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-saffron-500 via-white/60 to-leaf-500" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 lg:grid-cols-[1.15fr_1fr] lg:pt-20">
          <div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[13px] text-navy-100">
              <span className="h-1.5 w-1.5 rounded-full bg-saffron-400" />SANGAM Setu · For ST students · Ministry of Tribal Affairs
            </motion.p>
            <p className="-mt-2 mb-5 text-[12.5px] font-medium tracking-wide text-saffron-400"><b>S</b>cholarship <b>A</b>nd <b>N</b>FST/NOS <b>G</b>ateway for <b>A</b>pplication <b>M</b>anagement</p>
            <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="font-display text-[40px] font-extrabold leading-[1.02] tracking-[-0.025em] sm:text-6xl lg:text-[68px]">
              {t('heroTitle')}
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-6 max-w-xl text-[17px] leading-relaxed text-navy-100">{t('heroSub')}</motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 flex flex-wrap gap-3">
              <Button variant="saffron" size="lg" onClick={() => nav('/eligibility')}>{t('findMy')}</Button>
              <Button size="lg" className="border border-white/20 bg-white/5 hover:bg-white/10" onClick={() => nav('/schemes')}>{t('explore')}</Button>
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10" onClick={() => nav('/login')}>{t('login')}</Button>
            </motion.div>
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} onClick={startTour}
              className="mt-5 inline-flex items-center gap-2 rounded-lg py-1 text-[15px] font-semibold text-saffron-400 hover:text-saffron-100">
              <PlayCircle size={18} aria-hidden />See how it works, step by step
            </motion.button>
          </div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}><HeroPipeline /></motion.div>
        </div>
      </section>

      {/* INTERACTIVE DEMO GUIDE */}
      <div className="border-b border-navy-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <ProductTour key={tourStart} id={HOME_SECTIONS.tour} autoFocus={tourStart > 0} />
        </div>
      </div>

      {/* DEMO ACCOUNTS */}
      <div className="mx-auto max-w-7xl px-4 pt-20">
        <DemoAccountsSection id={HOME_SECTIONS.demo} />
      </div>

      {/* POSITIONING */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-navy-950 sm:text-4xl">Not another scholarship portal. An intelligent management layer for the whole lifecycle.</h2>
            <p className="mt-4 max-w-md text-slate-600">Portals collect forms. SANGAM Setu runs the process around them — rules, verification, scrutiny, selection, payment and renewal — for every ST scheme on one configurable engine.</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-navy-100 bg-white">
            <div className="grid grid-cols-[1.1fr_1fr_1fr] border-b border-navy-100 bg-navy-50 text-[13px] font-semibold">
              <div className="p-3 text-slate-500">Capability</div><div className="p-3 text-slate-500">Typical portal</div><div className="p-3 text-navy-950">SANGAM Setu</div>
            </div>
            {[
              ['Schemes', 'One portal per scheme', 'All schemes, one rule engine'],
              ['Documents', 'Uploaded, then checked weeks later', 'Read and cross-checked on upload'],
              ['Errors', 'Rejection, re-apply', 'Guided fix of one field or file'],
              ['Profile', 'Re-entered every time', 'Verified once, reused'],
              ['Decisions', 'Opaque', 'Explained flags, officer decides, audit-logged'],
              ['New scheme', 'Months of development', 'Configured in the scheme builder'],
            ].map(([a, b, c]) => (
              <div key={a} className="grid grid-cols-[1.1fr_1fr_1fr] border-b border-navy-50 text-[13.5px] last:border-0">
                <div className="p-3 font-semibold text-navy-900">{a}</div><div className="p-3 text-slate-500">{b}</div><div className="flex gap-1.5 p-3 text-navy-950"><Check size={15} className="mt-0.5 shrink-0 text-leaf-600" />{c}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCROLL STORY */}
      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-2">
          <div className="lg:sticky lg:top-24 lg:h-[440px]"><StoryVisual i={beat} /></div>
          <ol className="space-y-4 lg:py-10">
            {STORY.map((s, k) => (
              <motion.li key={s.t} onViewportEnter={() => setBeat(k)} viewport={{ margin: '-45% 0px -45% 0px' }}
                className={cx('rounded-xl border p-6 transition-colors lg:min-h-[180px]', beat === k ? 'border-navy-900 bg-navy-50/60' : 'border-navy-100 bg-white')}>
                <div className="flex items-center gap-3">
                  <span className={cx('grid h-9 w-9 place-items-center rounded-lg', beat === k ? 'bg-saffron-500 text-navy-950' : 'bg-navy-50 text-navy-800')}><s.icon size={18} /></span>
                  <h3 className="font-display text-xl font-bold text-navy-950">{s.t}</h3>
                </div>
                <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-slate-600">{s.d}</p>
                {k < STORY.length - 1 && <ArrowDown size={16} className="mt-3 text-slate-300" aria-hidden />}
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* LIFECYCLE */}
      <section ref={lifeRef} className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">Ten stages, one continuous record</h2>
        <p className="mt-3 max-w-xl text-slate-600">The same application moves from discovery to renewal without being re-entered. Every stage has an owner and a date.</p>
        <div className="relative mt-12">
          <div className="absolute left-0 right-0 top-6 hidden h-0.5 bg-navy-100 lg:block" />
          <motion.div style={{ width: lineW }} className="absolute left-0 top-6 hidden h-0.5 bg-saffron-500 lg:block" />
          <ol className="grid grid-cols-2 gap-6 sm:grid-cols-5 lg:grid-cols-10">
            {LIFECYCLE.map((l, k) => (
              <li key={l.t} className="relative">
                <div className="relative z-10 grid h-12 w-12 place-items-center rounded-full border-2 border-navy-900 bg-white text-navy-900"><l.icon size={20} /></div>
                <p className="mt-3 text-xs font-semibold text-saffron-700">{k + 1}</p>
                <p className="text-sm font-semibold leading-snug text-navy-950">{l.t}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-navy-950 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { v: 5, l: 'Scholarship schemes managed on one engine' },
              { v: 148236, l: 'Applications processed this cycle' },
              { v: 12480, l: 'Institutions connected for verification' },
              { v: 112904, l: 'Students supported to date' },
            ].map((s) => (
              <div key={s.l} className="border-l-2 border-saffron-500 pl-5">
                <p className="font-display text-4xl font-extrabold tabular-nums sm:text-5xl"><Counter to={s.v} /></p>
                <p className="mt-2 max-w-[220px] text-sm text-navy-100">{s.l}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-xs text-navy-100/70">Illustrative prototype values for demonstration.</p>
        </div>
      </section>

      {/* DIFFERENTIATORS */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="font-display text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">What makes it different</h2>
        <ul className="mt-10 grid gap-x-10 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFS.map((d) => (
            <li key={d.t} className="flex items-center gap-3 border-b border-navy-100 py-4">
              <d.icon size={20} className="shrink-0 text-saffron-600" /><span className="text-[15px] font-medium text-navy-950">{d.t}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* DEMO CTA */}
      <section className="mx-auto mb-6 max-w-7xl px-4">
        <div className="flex flex-col gap-5 rounded-3xl border border-navy-100 bg-white px-8 py-10 shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-12">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">See Sangam Setu in action</h2>
            <p className="mt-2 max-w-lg text-slate-600">Walk through the student, institute and admin journeys in about five minutes.</p>
          </div>
          <Button size="lg" icon={<PlayCircle size={18} />} className="shrink-0" onClick={startTour}>Start Interactive Demo</Button>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="relative overflow-hidden rounded-3xl bg-saffron-500 px-8 py-14 sm:px-14">
          <div className="decor absolute -right-16 -top-16 h-64 w-64 rounded-full border-[28px] border-navy-950/10" />
          <h2 className="relative max-w-2xl font-display text-4xl font-extrabold leading-tight tracking-tight text-navy-950 sm:text-5xl">{t('finalCta')}</h2>
          <p className="relative mt-3 max-w-lg text-navy-900">Answer a few questions and see which schemes may fit you, with the reason for each match.</p>
          <div className="relative mt-7 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => nav('/eligibility')}>{t('findMy')}</Button>
            <Button size="lg" variant="outline" className="border-navy-950/20 bg-transparent" onClick={() => nav('/register')}>Create verified profile</Button>
          </div>
        </div>
      </section>
    </div>
  )
}
