import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Building2, ShieldCheck } from 'lucide-react'
import { DEMO_CREDENTIALS } from '../../data/mock'
import { useStore } from '../../store/AppStore'
import type { Role } from '../../types'

/** Homepage sections the header links to (PublicLayout → Landing). */
export const HOME_SECTIONS = { tour: 'how-it-works', demo: 'demo-accounts' } as const

/** Same icons and accents as the Create Account role cards, so a role looks the same everywhere. */
export const ROLE_VISUAL: Record<Role, { name: string; icon: (size?: number) => ReactNode; tile: string; bar: string; button: 'primary' | 'saffron' | 'success'; dashboard: string }> = {
  student: { name: 'Student', icon: (n = 24) => <GraduationCap size={n} />, tile: 'bg-saffron-50 text-saffron-700', bar: 'bg-saffron-500', button: 'saffron', dashboard: 'Student Dashboard' },
  institution: { name: 'Institute', icon: (n = 24) => <Building2 size={n} />, tile: 'bg-navy-900 text-white', bar: 'bg-navy-900', button: 'primary', dashboard: 'Institute Dashboard' },
  super_admin: { name: 'Admin', icon: (n = 24) => <ShieldCheck size={n} />, tile: 'bg-leaf-50 text-leaf-700', bar: 'bg-leaf-600', button: 'success', dashboard: 'Admin Dashboard' },
}

export const DEMO_ROLES: Role[] = ['student', 'institution', 'super_admin']

export const DEMO_COPY: Record<Role, { who: string; body: string }> = {
  student: { who: 'Anjali Munda · PhD scholar', body: 'Check eligibility, apply for the NFST fellowship, fix flagged documents, track the application and renew last year’s fellowship.' },
  institution: { who: 'Dr. R. Tirkey · Nodal officer', body: 'Work through a live verification queue: verify enrolment, return an application for correction or verify in bulk.' },
  super_admin: { who: 'MoTA Super Admin', body: 'Run scrutiny with the AI review panel, record selection, process disbursement, configure schemes and answer grievances.' },
}

/**
 * Signs in to the demo account for a role using its demo credentials, then opens `to` (default: the role's dashboard).
 * Used by the demo cards, the end of the product tour and the tour's "Try it yourself" buttons.
 */
export function useDemoLogin() {
  const s = useStore()
  const nav = useNavigate()
  return (role: Role, to?: string) => {
    const c = DEMO_CREDENTIALS[role]
    const home = s.demoSignIn(role, c.email, c.password)
    if (!home) { s.toast('The demo account could not be opened. Reset the demo data and try again.', 'error'); return }
    s.toast(`Signed in to the ${ROLE_VISUAL[role].name} demo account`, 'success')
    nav(to ?? home)
  }
}

