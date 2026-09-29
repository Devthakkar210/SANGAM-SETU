import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AppProvider, useStore } from './store/AppStore'
import { PublicLayout, PortalLayout } from './components/Layouts'
import { Chatbot, DemoGuide, SessionGuard } from './components/Widgets'
import { Toaster } from './components/ui'
import Landing from './pages/public/Landing'
import { SchemesPage } from './pages/public/Schemes'
import Eligibility from './pages/public/Eligibility'
import { NotificationsPublic, ImportantDates, FAQs, Downloads, GrievancePublic, Login } from './pages/public/Misc'
import { RegisterRoleSelect, RegisterFlow } from './pages/public/Register'
import * as S from './pages/student/StudentPages'
import ApplyWizard from './pages/student/ApplyWizard'
import { DocumentsPage } from './pages/student/Documents'
import { ApplicationDetail } from './pages/student/Tracker'
import * as I from './pages/institution/InstitutionPages'
import AdminDashboard from './pages/admin/Dashboard'
import { ApplicationsQueue, ApplicationReview } from './pages/admin/Scrutiny'
import SchemeBuilder from './pages/admin/SchemeBuilder'
import * as A from './pages/admin/AdminPages'

function Chrome() {
  const s = useStore()
  const loc = useLocation()
  useEffect(() => {
    const el = document.documentElement
    el.style.setProperty('--fs', String(s.fontScale))
    el.classList.toggle('hc', s.highContrast)
    el.classList.toggle('lowbw', s.lowBandwidth)
    el.lang = s.lang
  }, [s.fontScale, s.highContrast, s.lowBandwidth, s.lang])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [loc.pathname])
  const inPortal = /^\/(student|institution|admin)/.test(loc.pathname)
  return (
    <MotionConfig reducedMotion={s.lowBandwidth ? 'always' : 'user'}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/schemes" element={<SchemesPage />} />
          <Route path="/eligibility" element={<Eligibility />} />
          <Route path="/notifications" element={<NotificationsPublic />} />
          <Route path="/important-dates" element={<ImportantDates />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/grievance" element={<GrievancePublic />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterRoleSelect />} />
          <Route path="/register/:role" element={<RegisterFlow />} />
        </Route>
        <Route path="/student" element={<PortalLayout portal="student" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<S.Dashboard />} />
          <Route path="profile" element={<S.Profile />} />
          <Route path="schemes" element={<Navigate to="/student/applications?tab=explore" replace />} />
          <Route path="applications" element={<S.Applications />} />
          <Route path="application/:id" element={<ApplicationDetail />} />
          <Route path="apply/:schemeId" element={<ApplyWizard />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="deficiencies" element={<Navigate to="/student/documents" replace />} />
          <Route path="status" element={<Navigate to="/student/applications" replace />} />
          <Route path="disbursement" element={<S.StudentDisbursement />} />
          <Route path="renewal" element={<ApplyWizard mode="renewal" />} />
          <Route path="grievance" element={<S.StudentGrievance />} />
          <Route path="notifications" element={<S.StudentNotifications />} />
          <Route path="settings" element={<S.SettingsPage />} />
        </Route>
        <Route path="/institution" element={<PortalLayout portal="institution" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<I.InstDashboard />} />
          <Route path="verification" element={<Navigate to="/institution/dashboard" replace />} />
          <Route path="students" element={<I.InstStudents />} />
          <Route path="profile" element={<I.InstProfile />} />
        </Route>
        <Route path="/admin" element={<PortalLayout portal="admin" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="applications" element={<ApplicationsQueue />} />
          <Route path="application/:id" element={<ApplicationReview />} />
          <Route path="selection" element={<A.Selection />} />
          <Route path="disbursement" element={<A.AdminDisbursement />} />
          <Route path="scheme-builder" element={<SchemeBuilder />} />
          <Route path="grievances" element={<A.AdminGrievances />} />
          <Route path="audit" element={<A.AuditLog />} />
          <Route path="roles" element={<A.Roles />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {inPortal && <SessionGuard />}
      <Chatbot />
      <DemoGuide />
      <Toaster />
    </MotionConfig>
  )
}

export default function App() {
  return <AppProvider><HashRouter><Chrome /></HashRouter></AppProvider>
}
