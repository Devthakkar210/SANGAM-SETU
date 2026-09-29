import { useState, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Menu, X, Bell, LayoutDashboard, UserCheck, BookOpen, FileText, ScanSearch, AlertCircle, Route, Wallet, RefreshCw, MessageSquareWarning,
  Settings, Users, ShieldCheck, Building2, BarChart3, ListChecks, Trophy, Blocks, ScrollText, KeyRound, LogOut, ChevronDown, Lock,
} from 'lucide-react'
import { PERMISSIONS, ROLE_META, useStore } from '../store/AppStore'
import type { Role } from '../types'
import { A11yButton, LangSelect, Logo } from './Widgets'
import { Button, cx } from './ui'
import { HOME_SECTIONS } from './demo/demoConfig'

export function PublicLayout() {
  const { t, lowBandwidth } = useStore()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  /** "How It Works" and "Demo" are sections of the homepage; Landing scrolls to them */
  const sections = [{ id: HOME_SECTIONS.tour, k: 'howItWorks' }, { id: HOME_SECTIONS.demo, k: 'demo' }]
  const goSection = (id: string) => {
    const menuWasOpen = open
    setOpen(false)
    // on phones the menu collapses first and shifts the page; scrolling during that animation lands in the
    // wrong place, so wait for it to finish
    const go = () => {
      if (loc.pathname !== '/') nav('/', { state: { section: id } })
      else document.getElementById(id)?.scrollIntoView({ behavior: lowBandwidth ? 'auto' : 'smooth', block: 'start' })
    }
    if (menuWasOpen) window.setTimeout(go, 300)
    else go()
  }
  const linkCls = 'rounded-lg px-3 py-2 text-sm font-medium transition'
  const links = [
    { to: '/', k: 'home' }, { to: '/schemes', k: 'schemes' }, { to: '/eligibility', k: 'eligibility' },
    { to: '/notifications', k: 'notifications' }, { to: '/faqs', k: 'faqs' }, { to: '/grievance', k: 'grievance' },
  ]
  return (
    <div className="min-h-screen bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <div className="bg-navy-950 text-[11.5px] text-navy-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
          <span>Ministry of Tribal Affairs · Government of India <span className="text-saffron-400">— SIH prototype, not an official portal</span></span>
          <span className="hidden sm:inline">Smart Education</span>
        </div>
      </div>
      <header className="sticky top-0 z-50 border-b border-navy-100/70 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4" aria-label="Main">
          <Link to="/" aria-label="SANGAM Setu home"><Logo /></Link>
          <div className="ml-4 hidden flex-1 items-center gap-0.5 xl:flex">
            {links.map((l, k) => (
              <span key={l.to} className="contents">
                <NavLink to={l.to} end className={({ isActive }) => cx(linkCls, isActive ? 'bg-navy-50 text-navy-950' : 'text-slate-600 hover:text-navy-950')}>{t(l.k)}</NavLink>
                {k === 0 && sections.map((x) => <button key={x.id} onClick={() => goSection(x.id)} className={cx(linkCls, 'text-slate-600 hover:text-navy-950')}>{t(x.k)}</button>)}
              </span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <div className="hidden sm:block"><LangSelect /></div>
            <A11yButton />
            <Link to="/login" className="hidden sm:block"><Button size="sm" variant="outline">{t('login')}</Button></Link>
            <Link to="/register" className="hidden sm:block"><Button size="sm">{t('createAccount')}</Button></Link>
            <button className="grid h-9 w-9 place-items-center rounded-lg xl:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>{open ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </nav>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-navy-100 bg-white xl:hidden">
              <div className="flex flex-col p-3">
                {links.map((l, k) => (
                  <span key={l.to} className="contents">
                    <NavLink to={l.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy-900 hover:bg-navy-50">{t(l.k)}</NavLink>
                    {k === 0 && sections.map((x) => <button key={x.id} onClick={() => goSection(x.id)} className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-navy-900 hover:bg-navy-50">{t(x.k)}</button>)}
                  </span>
                ))}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-navy-50 pt-3"><LangSelect /><div className="flex gap-2"><Link to="/login" onClick={() => setOpen(false)}><Button size="sm" variant="outline">{t('login')}</Button></Link><Link to="/register" onClick={() => setOpen(false)}><Button size="sm">{t('createAccount')}</Button></Link></div></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <main id="main">
        <AnimatePresence mode="wait">
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-20 bg-navy-950 text-navy-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div><Logo light /><p className="mt-4 text-sm leading-relaxed">A configurable workflow and decision-support layer for ST scholarships and fellowships. Built for Smart India Hackathon.</p></div>
        <FooterCol title="Students" items={[['/eligibility', 'Find my scholarship'], ['/schemes', 'All schemes'], ['/important-dates', 'Important dates'], ['/downloads', 'Downloads']]} />
        <FooterCol title="Help" items={[['/faqs', 'FAQs'], ['/grievance', 'Raise a grievance'], ['/notifications', 'Notices'], ['/register', 'Register']]} />
        <div className="text-sm">
          <p className="font-semibold text-white">Data & privacy</p>
          <p className="mt-3 leading-relaxed">Prototype uses fictional data only. No live Aadhaar, DigiLocker, PFMS or NSP connection — all integrations are shown as “Integration Ready”.</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-navy-100/70">SIH prototype · Ministry of Tribal Affairs problem statement · Theme: Smart Education</div>
    </footer>
  )
}
function FooterCol({ title, items }: { title: string; items: [string, string][] }) {
  return <div className="text-sm"><p className="font-semibold text-white">{title}</p><ul className="mt-3 space-y-2">{items.map(([to, l]) => <li key={to}><Link className="hover:text-white" to={to}>{l}</Link></li>)}</ul></div>
}

// ---------------------------------------------------------------------------

export type Portal = 'student' | 'institution' | 'admin'
export const NAV: Record<Portal, { to: string; k: string; icon: ReactNode }[]> = {
  student: [
    { to: '/student/dashboard', k: 'dashboard', icon: <LayoutDashboard size={18} /> },
    { to: '/student/profile', k: 'profile', icon: <UserCheck size={18} /> },
    { to: '/student/applications', k: 'applications', icon: <FileText size={18} /> },
    { to: '/student/renewal', k: 'renewalApp', icon: <RefreshCw size={18} /> },
    { to: '/student/documents', k: 'documents', icon: <ScanSearch size={18} /> },
    { to: '/student/disbursement', k: 'disbRenew', icon: <Wallet size={18} /> },
    { to: '/student/grievance', k: 'grievance', icon: <MessageSquareWarning size={18} /> },
    { to: '/student/settings', k: 'settings', icon: <Settings size={18} /> },
  ],
  institution: [
    { to: '/institution/dashboard', k: 'overview', icon: <LayoutDashboard size={18} /> },
    { to: '/institution/students', k: 'students', icon: <Users size={18} /> },
    { to: '/institution/profile', k: 'instProfile', icon: <Building2 size={18} /> },
  ],
  admin: [
    { to: '/admin/dashboard', k: 'commandCenter', icon: <BarChart3 size={18} /> },
    { to: '/admin/applications', k: 'scrutiny', icon: <ListChecks size={18} /> },
    { to: '/admin/selection', k: 'selection', icon: <Trophy size={18} /> },
    { to: '/admin/disbursement', k: 'disbursement', icon: <Wallet size={18} /> },
    { to: '/admin/scheme-builder', k: 'builder', icon: <Blocks size={18} /> },
    { to: '/admin/grievances', k: 'grievances', icon: <MessageSquareWarning size={18} /> },
    { to: '/admin/audit', k: 'audit', icon: <ScrollText size={18} /> },
    { to: '/admin/roles', k: 'roles', icon: <KeyRound size={18} /> },
  ],
}
const ADMIN_ROLES: Role[] = ['super_admin']
const portalOf = (r: Role): Portal => r === 'student' ? 'student' : r === 'institution' ? 'institution' : 'admin'
const permKey = (path: string) => Object.keys(PERMISSIONS).find((k) => path === k || path.startsWith(k + '/'))

export function PortalLayout({ portal }: { portal: Portal }) {
  const s = useStore()
  const loc = useLocation()
  const nav = useNavigate()
  const [mobile, setMobile] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const allowedPortal = portalOf(s.role) === portal
  const pk = portal === 'admin' ? permKey(loc.pathname) : undefined
  const allowedPage = !pk || PERMISSIONS[pk].includes(s.role)
  const audience = portal === 'admin' ? 'admin' : portal
  const unread = (audience === 'student' ? s.studentNotes : s.notifications.filter((n) => n.audience === audience)).filter((n) => !n.read).length
  const items = NAV[portal].filter((i) => portal !== 'admin' || !PERMISSIONS[i.to] || PERMISSIONS[i.to].includes(s.role))
  const meta = ROLE_META[s.role]
  const displayUser = s.actorName

  const switchRole = (r: Role) => { s.set(() => ({ role: r })); setRoleOpen(false); s.toast(`Signed in as ${ROLE_META[r].label}`, 'info'); if (portalOf(r) !== portal) nav(ROLE_META[r].home) }

  // Portals need a signed-in session; otherwise go to the login page and come back here afterwards
  if (!s.loggedIn) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />

  const Side = (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5"><Link to="/"><Logo light /></Link></div>
      <div className="mx-3 mb-3 rounded-lg bg-white/5 px-3 py-2 text-[11px] font-semibold text-saffron-400">{portal === 'student' ? 'Student Portal' : portal === 'institution' ? 'Institution Portal' : 'MoTA Administration'}</div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Portal">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} onClick={() => setMobile(false)} className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition', isActive || (i.to !== '/student/dashboard' && loc.pathname.startsWith(i.to)) ? 'bg-white text-navy-950' : 'text-navy-100 hover:bg-white/10 hover:text-white')}>
            {i.icon}<span className="flex-1">{s.t(i.k)}</span>
            {i.k === 'notifications' && unread > 0 && <span className="rounded-full bg-saffron-500 px-1.5 text-[10px] font-bold text-navy-950">{unread}</span>}
            {i.k === 'documents' && s.deficiencies.some((d) => d.applicationId === s.demoAppId && d.status === 'Open') && <span className="h-2 w-2 rounded-full bg-saffron-500" />}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-lg border border-white/10 p-3 text-[11px] leading-relaxed text-navy-100">
        <p className="flex items-center gap-1.5 font-semibold text-white"><Lock size={12} />Secure session</p>
        Role-based access · every action is audit-logged · auto sign-out on inactivity
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-paper">
      <a href="#portal-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-navy-950 lg:block">{Side}</aside>
      <AnimatePresence>
        {mobile && (
          <motion.div className="fixed inset-0 z-[65] bg-navy-950/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobile(false)}>
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="h-full w-64 bg-navy-950" onClick={(e) => e.stopPropagation()}>{Side}</motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b border-navy-100/70 bg-white/90 px-4 backdrop-blur">
          <button className="grid h-9 w-9 place-items-center rounded-lg lg:hidden" onClick={() => setMobile(true)} aria-label="Open navigation"><Menu size={20} /></button>
          {s.assisted && <span className="hidden rounded-full bg-saffron-50 px-3 py-1 text-xs font-semibold text-saffron-700 md:inline">Assisted mode · CSC operator</span>}
          <div className="ml-auto flex items-center gap-1">
            <div className="hidden md:block"><LangSelect /></div>
            <A11yButton />
            <Link to={portal === 'student' ? '/student/notifications' : portal === 'institution' ? '/institution/dashboard' : '/admin/grievances'} className="relative grid h-9 w-9 place-items-center rounded-lg text-navy-800 hover:bg-navy-50" aria-label={`${unread} unread notifications`}>
              <Bell size={18} />{unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-saffron-500" />}
            </Link>
            <div className="relative">
              <button onClick={() => setRoleOpen(!roleOpen)} className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-navy-50" aria-haspopup="menu" aria-expanded={roleOpen}>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">{displayUser.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                <span className="hidden text-left sm:block"><span className="block text-[13px] font-semibold leading-tight text-navy-950">{displayUser}</span><span className="block text-[11px] text-slate-500">{meta.label}</span></span>
                <ChevronDown size={14} />
              </button>
              <AnimatePresence>
                {roleOpen && (
                  <motion.div role="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 mt-2 w-72 rounded-xl border border-navy-100 bg-white p-2 shadow-lift">
                    <p className="px-2 pb-1 pt-1 text-[11px] font-semibold text-slate-500">Switch role (prototype)</p>
                    {(['student', 'institution', ...ADMIN_ROLES] as Role[]).map((r) => (
                      <button role="menuitem" key={r} onClick={() => switchRole(r)} className={cx('flex w-full flex-col rounded-lg px-2 py-1.5 text-left hover:bg-navy-50', s.role === r && 'bg-navy-50')}>
                        <span className="text-[13px] font-semibold text-navy-950">{ROLE_META[r].label}</span>
                        <span className="text-[11px] text-slate-500">{ROLE_META[r].user}</span>
                      </button>
                    ))}
                    <div className="my-1 border-t border-navy-50" />
                    <button onClick={() => { setRoleOpen(false); s.signOut(); s.log('Signed out', 'User ended the session'); nav('/login') }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-slate-600 hover:bg-navy-50"><LogOut size={14} />Sign out</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
        <main id="portal-main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-8">
          {!allowedPortal || !allowedPage ? (
            <AccessDenied portal={portal} onSwitch={switchRole} path={loc.pathname} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <Outlet />
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  )
}

function AccessDenied({ portal, onSwitch, path }: { portal: Portal; onSwitch: (r: Role) => void; path: string }) {
  const s = useStore()
  const pk = permKey(path)
  const candidates: Role[] = portal === 'student' ? ['student'] : portal === 'institution' ? ['institution'] : (pk ? PERMISSIONS[pk] : ADMIN_ROLES)
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-card">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-saffron-50 text-saffron-700"><Lock /></div>
      <h1 className="mt-4 font-display text-xl font-bold text-navy-950">This area needs a different role</h1>
      <p className="mt-2 text-sm text-slate-600">You are signed in as <b>{ROLE_META[s.role].label}</b>. Role-based access keeps applicant data visible only to authorised users. In the prototype you can switch role below.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {candidates.map((r) => <Button key={r} variant={r === candidates[0] ? 'primary' : 'outline'} size="sm" onClick={() => onSwitch(r)}>Continue as {ROLE_META[r].label}</Button>)}
      </div>
    </div>
  )
}
