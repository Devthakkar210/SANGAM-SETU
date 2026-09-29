import { AnimatePresence, motion } from 'framer-motion'
import { Accessibility, Contrast, Type, Wifi, Headset, PlayCircle, RotateCcw, Check, Clock, Globe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DEMO_ADMIN_ID, DEMO_INSTITUTION_ID, DEMO_STUDENT_ID } from '../data/mock'
import { ROLE_META, useStore } from '../store/AppStore'
import type { Lang, Role } from '../types'
import { LANG_LABEL } from '../lib/i18n'
import { Button, Modal, cx } from './ui'
import { STAGES } from '../types'

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden>
        <rect width="40" height="40" rx="10" fill={light ? '#ffffff' : '#101E4A'} />
        <path d="M7 27 C13 13, 27 13, 33 27" fill="none" stroke="#F08A24" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M11 27v-4M15.5 27v-7.2M20 27v-8.4M24.5 27v-7.2M29 27v-4" stroke={light ? '#101E4A' : '#fff'} strokeWidth="2" strokeLinecap="round" />
        <path d="M6 29.5h28" stroke="#2F9E6E" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className="leading-none">
          <span className={cx('block font-display text-[17px] font-bold tracking-tight', light ? 'text-white' : 'text-navy-950')}>SANGAM Setu</span>
          <span className={cx('block max-w-[190px] text-[9.5px] font-medium leading-tight', light ? 'text-navy-100' : 'text-slate-500')}>Scholarship And NFST/NOS Gateway for Application Management</span>
        </span>
      )}
    </span>
  )
}

export function LangSelect({ dark }: { dark?: boolean }) {
  const { lang, set, t } = useStore()
  return (
    <label className={cx('flex items-center gap-1.5 rounded-lg px-2 text-sm', dark ? 'text-navy-100' : 'text-navy-800')}>
      <Globe size={16} aria-hidden /><span className="sr-only">{t('language')}</span>
      <select value={lang} onChange={(e) => set(() => ({ lang: e.target.value as Lang }))} className={cx('h-9 cursor-pointer bg-transparent font-medium outline-none', dark && '[&>option]:text-ink')}>
        {(Object.keys(LANG_LABEL) as Lang[]).map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
      </select>
    </label>
  )
}

export function A11yButton({ dark }: { dark?: boolean }) {
  const [open, setOpen] = useState(false)
  const s = useStore()
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Accessibility settings" className={cx('grid h-9 w-9 place-items-center rounded-lg', dark ? 'text-navy-100 hover:bg-white/10' : 'text-navy-800 hover:bg-navy-50')}><Accessibility size={18} /></button>
      <Modal open={open} onClose={() => setOpen(false)} title="Accessibility & access">
        <div className="space-y-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-900"><Type size={16} />Text size</p>
            <div className="flex gap-2">
              {[0.9, 1, 1.12, 1.25].map((f) => (
                <button key={f} onClick={() => s.set(() => ({ fontScale: f }))} className={cx('h-10 flex-1 rounded-lg border font-semibold', s.fontScale === f ? 'border-navy-900 bg-navy-900 text-white' : 'border-navy-100')} style={{ fontSize: 14 * f }}>A</button>
              ))}
            </div>
          </div>
          {[
            { k: 'highContrast' as const, icon: <Contrast size={16} />, t: 'High contrast', d: 'Stronger borders and text for low vision and bright outdoor light.' },
            { k: 'lowBandwidth' as const, icon: <Wifi size={16} />, t: 'Low-bandwidth mode', d: 'Turns off animations and decorative graphics. Useful on 2G/3G connections.' },
            { k: 'assisted' as const, icon: <Headset size={16} />, t: 'Assisted application (CSC mode)', d: 'For CSC operators or hostel wardens applying on behalf of a student, with consent captured.' },
          ].map((o) => (
            <label key={o.k} className="flex cursor-pointer items-start gap-3 rounded-lg border border-navy-100 p-3">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-navy-900" checked={s[o.k]} onChange={(e) => s.set(() => ({ [o.k]: e.target.checked }))} />
              <span><span className="flex items-center gap-2 text-sm font-semibold text-navy-900">{o.icon}{o.t}</span><span className="text-[13px] text-slate-600">{o.d}</span></span>
            </label>
          ))}
          <p className="text-xs text-slate-500">All controls are keyboard reachable. Press Tab to move, Enter to activate, Esc to close dialogs.</p>
        </div>
      </Modal>
    </>
  )
}

// Scholarship assistant — see SetuSakha.tsx
export { SetuSakha as Chatbot } from './SetuSakha'

// ---------------------------------------------------------------------------
// Demo script navigator — keeps the 5-minute SIH walkthrough one click away
export function DemoGuide() {
  const s = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const demoApp = s.applications.find((a) => a.id === s.demoAppId)
  const steps: { label: string; to: string; role: Role; done?: boolean; disabled?: boolean }[] = [
    { label: 'Landing page & story', to: '/', role: 'student' },
    { label: 'Find My Scholarship (eligibility)', to: '/eligibility', role: 'student', done: !!s.eligibilityAnswers },
    { label: 'Sign in & apply for NFST', to: '/login?next=%2Fstudent%2Fapply%2Fnfst&scheme=nfst', role: 'student', done: !!demoApp },
    { label: 'Application tracker', to: '/student/applications', role: 'student', disabled: !demoApp },
    { label: 'Institution verifies', to: '/institution/dashboard', role: 'institution', done: demoApp ? STAGES.indexOf(demoApp.stage) >= 3 : false },
    { label: 'MoTA Command Center', to: '/admin/dashboard', role: 'super_admin' },
    { label: 'Scrutiny queue', to: '/admin/applications', role: 'super_admin' },
    { label: 'Officer review (AI panel)', to: demoApp ? `/admin/application/${demoApp.id}` : '/admin/applications', role: 'super_admin', done: demoApp ? STAGES.indexOf(demoApp.stage) >= 4 : false },
    { label: 'No-code Scheme Builder', to: '/admin/scheme-builder', role: 'super_admin' },
    { label: 'Student renewal application', to: '/student/renewal', role: 'student', done: s.applications.some((a) => a.applicationType === 'renewal') },
    { label: 'Renewal review (previous vs current)', to: '/admin/applications', role: 'super_admin' },
  ]
  if (s.lowBandwidth && !open) { /* keep available */ }
  return (
    <div className="fixed bottom-5 left-5 z-[60]">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="mb-3 w-[min(90vw,320px)] rounded-2xl border border-navy-100 bg-white p-3 shadow-lift">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="font-display text-sm font-bold text-navy-950">SIH demo script</p>
              <button onClick={s.reset} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-navy-900"><RotateCcw size={12} />Reset data</button>
            </div>
            <ol className="space-y-1">
              {steps.map((st, i) => {
                const active = loc.pathname === st.to.split('?')[0]
                return (
                  <li key={st.label}>
                    <button disabled={st.disabled} onClick={() => { if (st.role === 'student' && !s.isDemoStudent) s.switchStudent(DEMO_STUDENT_ID); s.set((p) => ({ role: st.role, institutionAccountId: st.role === 'institution' ? DEMO_INSTITUTION_ID : p.institutionAccountId, adminAccountId: st.role === 'super_admin' ? DEMO_ADMIN_ID : p.adminAccountId, loggedIn: st.to.startsWith('/login') ? p.loggedIn : st.to === '/' || st.to === '/eligibility' ? p.loggedIn : true })); nav(st.to); if (window.innerWidth < 640) setOpen(false) }}
                      className={cx('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition disabled:opacity-40', active ? 'bg-navy-50 font-semibold text-navy-950' : 'text-slate-700 hover:bg-navy-50')}>
                      <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold', st.done ? 'bg-leaf-500 text-white' : active ? 'bg-saffron-500 text-navy-950' : 'bg-navy-100 text-navy-800')}>{st.done ? <Check size={11} /> : i + 1}</span>
                      <span className="flex-1">{st.label}</span>
                      <span className="text-[10px] text-slate-400">{ROLE_META[st.role].label}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen((o) => !o)} className="flex h-11 items-center gap-2 rounded-full border border-navy-100 bg-white px-4 text-[13px] font-semibold text-navy-900 shadow-lift hover:bg-navy-50" aria-expanded={open}>
        <PlayCircle size={17} className="text-saffron-600" />Demo script
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Session timeout — idle 8 minutes in a portal, or simulate from settings
export function SessionGuard() {
  const s = useStore()
  const nav = useNavigate()
  const [warn, setWarn] = useState(false)
  const [left, setLeft] = useState(60)
  useEffect(() => {
    let timer: number
    const reset = () => { window.clearTimeout(timer); timer = window.setTimeout(() => setWarn(true), 8 * 60 * 1000) }
    const sim = () => setWarn(true)
    ;['mousemove', 'keydown', 'click'].forEach((e) => window.addEventListener(e, reset))
    window.addEventListener('simulate-timeout', sim)
    reset()
    return () => { window.clearTimeout(timer); ['mousemove', 'keydown', 'click'].forEach((e) => window.removeEventListener(e, reset)); window.removeEventListener('simulate-timeout', sim) }
  }, [])
  useEffect(() => {
    if (!warn) { setLeft(60); return }
    const i = window.setInterval(() => setLeft((l) => {
      if (l <= 1) { window.clearInterval(i); setWarn(false); s.signOut(); nav('/login'); s.toast('Session expired. Please sign in again.', 'info'); return 60 }
      return l - 1
    }), 1000)
    return () => window.clearInterval(i)
  }, [warn]) // eslint-disable-line
  return (
    <Modal open={warn} onClose={() => setWarn(false)} title="Session about to expire">
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 text-saffron-600" />
        <p className="text-sm text-slate-700">For the security of applicant data you will be signed out in <b className="tabular-nums">{left}s</b> due to inactivity. Unsaved form data is kept as a draft.</p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={() => { setWarn(false); s.signOut(); nav('/login') }}>Sign out now</Button>
        <Button onClick={() => { setWarn(false); s.toast('Session extended', 'success') }}>Stay signed in</Button>
      </div>
    </Modal>
  )
}
