import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, RotateCcw, UserRound, MousePointerClick, CornerDownRight, SkipForward, Play, UserPlus } from 'lucide-react'
import { Button, cx } from '../ui'
import { CHAPTERS, TOUR_STEPS, type ChapterId, type TourStep } from './tourSteps'
import { TourFrame } from './TourScreen'
import { DEMO_ROLES, ROLE_VISUAL, useDemoLogin } from './demoConfig'

const N = TOUR_STEPS.length
const firstOf = (c: ChapterId) => TOUR_STEPS.findIndex((s) => s.chapter === c)

/* ---------------------------- building blocks ---------------------------- */

/** Chapter tabs — jump to the first step of a role's walkthrough. */
export function TourChapters({ current, onPick }: { current: ChapterId | null; onPick: (c: ChapterId) => void }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex gap-1 rounded-xl bg-navy-50 p-1" role="tablist" aria-label="Walkthrough sections">
        {CHAPTERS.map((c) => {
          const n = TOUR_STEPS.filter((s) => s.chapter === c.id).length
          const on = current === c.id
          return (
            <button key={c.id} role="tab" aria-selected={on} onClick={() => onPick(c.id)}
              className={cx('whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors', on ? 'bg-white text-navy-950 shadow-card' : 'text-slate-600 hover:text-navy-950')}>
              {c.label} <span className={cx('ml-0.5 text-[11px] font-medium', on ? 'text-saffron-700' : 'text-slate-400')}>{n}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** One segment per step; segments are also buttons for jumping around. */
export function TourProgress({ index, done, onJump }: { index: number; done: boolean; onJump: (i: number) => void }) {
  return (
    <div className="flex gap-[3px]" aria-label="Walkthrough progress">
      {TOUR_STEPS.map((s, k) => (
        <button key={s.id} onClick={() => onJump(k)} aria-label={`Go to step ${k + 1}: ${s.title}`} aria-current={!done && k === index ? 'step' : undefined}
          className="group flex h-4 flex-1 items-center">
          <span className={cx('h-1.5 w-full rounded-full transition-colors group-hover:h-2',
            done || k < index ? 'bg-leaf-500' : k === index ? 'bg-saffron-500' : 'bg-navy-100')} />
        </button>
      ))}
    </div>
  )
}

/** Previous / Next, with the step count between them. */
export function TourNavigation({ index, onPrev, onNext }: { index: number; onPrev: () => void; onNext: () => void }) {
  const last = index === N - 1
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={onPrev} disabled={index === 0} icon={<ArrowLeft size={16} />}>Previous</Button>
      <span className="flex-1 text-center text-[13px] font-semibold tabular-nums text-slate-500">{index + 1} / {N}</span>
      <Button variant={last ? 'saffron' : 'primary'} onClick={onNext}>{last ? 'Finish' : 'Next'}<ArrowRight size={16} /></Button>
    </div>
  )
}

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy-800">{icon}</span>
      <div><p className="text-[12px] font-semibold text-slate-500">{label}</p><p className="text-[14px] leading-relaxed text-navy-950">{children}</p></div>
    </div>
  )
}

/** Text for the current step: what it is, who uses it, what to do, what happens next, and "Try it yourself". */
export function TourStepPanel({ step, onTry }: { step: TourStep; onTry: () => void }) {
  return (
    <div className="space-y-4">
      <Detail icon={<UserRound size={15} />} label="Who uses it">{step.who}</Detail>
      <Detail icon={<MousePointerClick size={15} />} label="What you do">{step.action}</Detail>
      <Detail icon={<CornerDownRight size={15} />} label="What happens next">{step.result}</Detail>
      {step.tryIt && (
        <div className="rounded-xl border border-dashed border-navy-100 bg-navy-50/50 p-3">
          <Button variant="soft" className="w-full sm:w-auto" icon={<Play size={14} />} onClick={onTry}>Try it yourself</Button>
          <p className="mt-1.5 text-[12px] text-slate-500">{step.tryIt.label}{step.tryIt.role ? ` — signs you in to the ${ROLE_VISUAL[step.tryIt.role].name} demo account` : ''}.</p>
        </div>
      )}
    </div>
  )
}

/** Shown after the last step (or after Skip). */
export function TourEnd({ onRestart }: { onRestart: () => void }) {
  const login = useDemoLogin()
  const nav = useNavigate()
  return (
    <div className="relative overflow-hidden rounded-2xl bg-navy-950 px-6 py-12 text-center text-white sm:px-12">
      <div className="decor dot-grid absolute inset-0 opacity-20" style={{ filter: 'invert(1)' }} />
      <div className="relative mx-auto max-w-3xl">
        <h3 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to explore Sangam Setu?</h3>
        <p className="mt-3 text-navy-100">Open a demo account to use the screens you just saw, or create your own account.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {DEMO_ROLES.map((r) => (
            <Button key={r} size="lg" variant={ROLE_VISUAL[r].button} className={cx(r === 'institution' && 'border border-white/20 bg-white/10 hover:bg-white/15')} icon={ROLE_VISUAL[r].icon(18)} onClick={() => login(r)}><span className="whitespace-nowrap">Try {ROLE_VISUAL[r].name} Demo</span></Button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button size="lg" className="border border-white/20 bg-white/5 hover:bg-white/10" icon={<UserPlus size={18} />} onClick={() => nav('/register')}>Create Your Account</Button>
          <Button size="lg" variant="ghost" className="text-white hover:bg-white/10" icon={<RotateCcw size={16} />} onClick={onRestart}>Restart Demo</Button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------- the tour -------------------------------- */

/**
 * Step-by-step walkthrough of the whole platform. To restart it from step 1, remount it with a new `key`;
 * `autoFocus` moves keyboard focus to the tour heading on mount (used by the homepage CTAs).
 */
export function ProductTour({ id = 'how-it-works', autoFocus = false }: { id?: string; autoFocus?: boolean }) {
  const demoLogin = useDemoLogin()
  const nav = useNavigate()
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [ended, setEnded] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const step = TOUR_STEPS[index]
  const chapter = CHAPTERS.find((c) => c.id === step.chapter)!

  /** keep the top of the tour on screen after moving (matters on phones, where the buttons sit below the preview) */
  const keepInView = () => requestAnimationFrame(() => {
    const el = rootRef.current
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
  })
  const go = (i: number) => { if (i < 0 || i >= N) return; setDir(i >= index ? 1 : -1); setIndex(i); setEnded(false); keepInView() }
  const next = () => { if (index === N - 1) { setEnded(true); keepInView() } else go(index + 1) }
  const prev = () => go(index - 1)
  const restart = () => { setDir(-1); setIndex(0); setEnded(false); keepInView(); headingRef.current?.focus() }

  useEffect(() => { if (autoFocus) headingRef.current?.focus({ preventScroll: true }) }, [autoFocus])

  const onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, select, textarea')) return
    if (e.key === 'ArrowRight' && !ended) { e.preventDefault(); next() }
    if (e.key === 'ArrowLeft' && !ended) { e.preventDefault(); prev() }
  }
  const tryIt = () => { const t = step.tryIt; if (!t) return; if (t.role) demoLogin(t.role, t.to); else nav(t.to) }

  return (
    <section id={id} ref={rootRef} aria-labelledby={`${id}-title`} onKeyDown={onKey} className="scroll-mt-20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="font-display text-3xl font-bold tracking-tight text-navy-950 outline-none sm:text-4xl">How Sangam Setu Works</h2>
          <p className="mt-3 text-slate-600">A guided walk through the real screens — from creating an account, through the student, institute and admin journeys, to the payment reference. Use the arrow keys or the buttons to move.</p>
        </div>
        {!ended && <button onClick={() => { setEnded(true); keepInView() }} className="flex shrink-0 items-center gap-1.5 self-start text-sm font-semibold text-slate-500 hover:text-navy-900 lg:self-auto"><SkipForward size={15} />Skip Demo</button>}
      </div>

      <div className="mt-6 space-y-3">
        <TourChapters current={ended ? null : step.chapter} onPick={(c) => go(firstOf(c))} />
        <TourProgress index={index} done={ended} onJump={go} />
      </div>

      <div className="mt-6">
        {ended ? (
          <TourEnd onRestart={restart} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:gap-10">
            {/* step heading — above the preview on phones, top of the right column on desktop */}
            <div className="lg:col-start-2 lg:row-start-1" aria-live="polite">
              <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
                <span className="text-saffron-700">Step {index + 1} of {N}</span>
                <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11.5px] text-navy-800">{chapter.label}</span>
              </p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <h3 className="mt-2 font-display text-2xl font-bold leading-tight text-navy-950">{step.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{step.summary}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* the screen preview */}
            <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <motion.div key={step.id} custom={dir} initial={{ opacity: 0, x: 18 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 * dir }} transition={{ duration: 0.22 }}
                  inert aria-hidden>
                  <TourFrame portal={step.screen.portal} url={step.screen.url} active={step.screen.active} spotNav={step.screen.spotNav}>
                    {step.screen.scene()}
                  </TourFrame>
                </motion.div>
              </AnimatePresence>
              <p className="mt-2 text-[12px] text-slate-500">Simplified preview of the {step.screen.url === '/' ? 'site header and helpers' : 'real screen'}. The highlighted part is what this step is about.</p>
            </div>

            <div className="flex flex-col gap-6 lg:col-start-2 lg:row-start-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <TourStepPanel step={step} onTry={tryIt} />
                </motion.div>
              </AnimatePresence>
              <div className="mt-auto border-t border-navy-100 pt-4"><TourNavigation index={index} onPrev={prev} onNext={next} /></div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
