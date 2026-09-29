# SANGAM Setu — Scholarship And NFST/NOS Gateway for Application Management (SIH Prototype)

> Not another scholarship portal. An intelligent management layer for the complete scholarship lifecycle.

Interactive prototype for the Ministry of Tribal Affairs problem statement (Smart Education). React + TypeScript + Vite + Tailwind + React Router + Framer Motion + Recharts + Lucide.

## Run
```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # standard build in dist/
npm run build:single   # one self-contained dist/index.html (open directly, works offline except web fonts)
```
State is in memory only — refresh or use **Demo script → Reset data** to start over.

## 5-minute demo path
Use the floating **Demo script** button (bottom-left); it switches role and navigates for you.
1. Landing → **Find My Scholarship** (or Explore Schemes → Apply Now). Applying always goes to **Sign in**, which asks whether to continue with the login saved on this device (OTP to the saved mobile) or use a new login / create an account; you then land in the application → answer (demo defaults) → NFST matches with "why it matched".
2. **Apply** → verified profile auto-filled → NFST-specific fields → documents: *Upload remaining (sample files)*.
3. AI cross-check flags **income mismatch** (₹2,40,000 form vs ₹3,20,000 certificate, 94%) → *Fix Information*. The PhD registration letter is read at **76%** — below the **90% confidence threshold** — so it is routed to a MoTA official instead of being auto-accepted → submit.
4. **My Applications** shows the tracker for the selected application → switch to **Institution** → *Verify* from the Overview (or Bulk Verification) → moves to State Scrutiny.
5. **MoTA Command Center** (KPIs, student complaints, low-confidence documents) → Scrutiny queue → officer review: *Approve* stays locked until the official opens and verifies the low-confidence document → *Approve / Request Correction / Further Review*.
5a. **Grievance** (student): menu-driven AI assistant — money not received, document unavailable, file too large, talk to an agent. Complaints it raises appear on the MoTA dashboard and in Admin → Grievances.
6. **Merit & Selection** → record committee approval → **Disbursement** → process via PFMS (prototype).
7. **Scheme Builder** → "Set income limit to ₹2,00,000" → live impact → Save → Eligibility Finder reflects it. *New scheme from template* → Publish → appears in Schemes.

## Create Account (`/register`)
**Login → Create Account → choose Student / Institute / Admin → role form → Email/OTP verification → saved → dashboard.**
- `/register` — "Create Your Account": three role cards. `/register/student`, `/register/institute`, `/register/admin` — the role form (Back returns to the cards).
- **Student** → email/OTP → Student Dashboard. Fields: name, email, mobile, password, student ID / enrollment no., institute, course, year/semester, date of birth, category, address (optional), consent. Optional eKYC (Aadhaar or DigiLocker) verifies name and DOB and stores only the last 4 Aadhaar digits.
- **Institute** → email/OTP → institute verification (code uniqueness, AISHE format, email domain, nodal officer, State Nodal Cell approval — prototype) → Institute Dashboard. A live preview uses the institution-profile card.
- **Admin** → email/OTP → Super Admin role assigned automatically (audit-logged) → Admin Dashboard.
- One config-driven flow renders every role: `src/pages/public/Register.tsx` (role configs) · `src/components/auth/RegistrationKit.tsx` (fields, password toggle, OTP, checklist, success) · `src/components/auth/registration.ts` (validation + form hook).
- Validation: required fields, email format, exactly 10-digit mobile/phone, password ≥ 8 chars with a letter and a number, confirmation must match, duplicate-account checks. OTP: any 6 digits. Passwords are validated but never stored.
- Sign back in: students with their mobile (OTP); institutes with official email, institution code or AISHE code; admins with official email or admin user ID. Unknown IDs are rejected with a link to Create Account.

## Demo accounts (OTP: any 6 digits)
| Role | Sign in with |
|---|---|
| Student | Mobile `9876500217` — Anjali Munda |
| Institute | Institution code `JH-U-0142`, AISHE `U-0442` or `nodal.scholarship@birt.example` — Dr. R. Tirkey, Birsa Institute of Research & Technology (has a live verification queue) |
| Admin | User ID `MOTA-SA-01` or `superadmin.demo@tribal.gov.in` — MoTA Super Admin |

The sign-in page shows the demo account for the selected role with a **Use demo account** button. Seeded in `src/data/mock.ts` (`DEMO_INSTITUTION_ACCOUNT`, `DEMO_ADMIN_ACCOUNT`, `DEMO_LOGINS`).

## Interactive demo guide & one-click demo accounts
**Homepage → "How Sangam Setu Works"** (header: *How It Works*; hero: *See how it works, step by step*; bottom: *See Sangam Setu in action → Start Interactive Demo*).
- 21 steps in five chapters — Get started (2), Student (9), Institute (3), Admin (6), Help & access (1). Every step describes a screen that exists and names its real route.
- Each step shows a simplified replica of the screen (sidebar built from the real portal `NAV`), with the relevant part highlighted, plus *Who uses it / What you do / What happens next*.
- Controls: Previous / Next, ← / → keys, *Step X of 21*, clickable progress segments, chapter tabs, *Skip Demo*. The end screen offers *Try Student / Institute / Admin Demo*, *Create Your Account* and *Restart Demo*.
- *Try it yourself* signs in to the matching demo account (for portal steps) and opens that exact page.
- Code: `src/components/demo/` — `ProductTour.tsx` (`ProductTour`, `TourChapters`, `TourProgress`, `TourNavigation`, `TourStepPanel`, `TourEnd`), `TourScreen.tsx` (`TourFrame`, `Spot`, mock primitives), `tourSteps.tsx` (step content — edit here when a feature changes).

**"Want to explore first?"** — on the homepage (header: *Demo*) and below the Create Account cards. One click signs in and opens the dashboard:

| Card | Email | Password | Opens |
|---|---|---|---|
| Student demo | `student.demo@sangamsetu.demo` | `Student@123` | Student Dashboard (Anjali Munda) |
| Institute demo | `institute.demo@sangamsetu.demo` | `Institute@123` | Institute Dashboard (Dr. R. Tirkey) |
| Admin demo | `admin.demo@sangamsetu.demo` | `Admin@123` | Admin Dashboard (MoTA Super Admin) |

- These are fictional, demo-only credentials (`DEMO_CREDENTIALS` in `src/data/mock.ts`). They sign in to the existing seeded demo accounts through `demoSignIn` in the store, which checks the pair and writes an audit-log entry. The `.demo` domain is not a real mail domain and the passwords work for nothing else.
- Login itself is unchanged (OTP). The demo emails are also accepted as the sign-in ID on the Login page — OTP: any 6 digits.
- Components: `DemoAccountCard`, `DemoAccountsSection` (`DemoAccounts.tsx`); `useDemoLogin`, `ROLE_VISUAL` (`demoConfig.tsx`). Create Account role cards are the reusable `RoleSelectCards` in `Register.tsx`.

## SetuSakha assistant (`src/components/SetuSakha.tsx`)
Rule-based, context-aware helper (no external AI call). It knows the current page and who is signed in: on Create Account / Sign in it covers account types, form fields, verification codes, passwords, AISHE codes and demo accounts; for institutes it covers verification and corrections; for admins scrutiny, AI confidence, Scheme Builder, disbursement and grievances; for students eligibility (computed from their own profile), live application status, documents, deadlines (from scheme data), payments and renewal. Links only point to pages the person can open (guests are sent to sign in first).
- A new student account starts **empty** — no demo data. The application form asks for everything not yet in the profile, and what you enter is saved to **My Profile** on submit. Accounts live in memory and disappear on page refresh.
- The pre-registered demo account is Anjali Munda (mobile 9876500217, Aadhaar ending 4821); the Demo script always uses it and the demo institution/admin.

## Renewal Application (student portal → Renewal Application)
1. Verify the previous application with email + password (demo: the profile email `anjali.m@example.in` and any 8+ character password — no real credentials are stored).
2. Previous application **NFST-2025-0001 (2025-26)** is found → *Start renewal* creates a **new linked record** (`NFST-REN-2026-0001`, 2026-27); the old one is never overwritten.
3. **Review Profile** — 13 permanent fields and 2 permanent documents are reused (✓ Retrieved from previous application).
4. **Update Current Information** — changeable fields show last year's value (2nd → 3rd year, CGPA 7.8 → 8.2, income ₹2,40,000 → ₹2,70,000); conditional questions for institution/course/bank changes; eligibility is re-checked against the scheme rules.
5. **Upload Documents** — list comes from `scheme.renewal` in `src/data/mock.ts`. Pipeline: file validation → classification → OCR → extraction → field matching → validity → confidence → decision (`src/lib/renewal.ts`). *Try wrong document* shows wrong-type detection.
6. **Document Verification** — auto-verified only if overall confidence ≥ 90%, correct type, mandatory fields present and **no critical mismatch**; otherwise human review (the demo bank passbook comes back at 89%).
7. **Verified Report** — downloadable HTML report (open → Print → Save as PDF). **Final Submission** → success screen.
Admin: Scrutiny queue has an *Application type* filter; a renewal shows previous-vs-current (changes highlighted), per-document Verify / Reject / Request new document, and a year-by-year history. Approving a renewal goes straight to Sanction.

## Routes
Public: `/ /schemes /eligibility /notifications /important-dates /faqs /downloads /grievance /login /register /register/{student,institute,admin}`
Student: `/student/{dashboard,profile,applications,apply/:schemeId,documents,disbursement,grievance,notifications,settings}` — `applications` includes scheme discovery and the per-application tracker; `documents` includes deficiencies; `disbursement` includes renewal. Old links (`schemes`, `status`, `deficiencies`, `renewal`, `application/:id`) redirect.
Institution: `/institution/{dashboard,students,profile}` — verification queue is on the Overview.
Admin: `/admin/{dashboard,applications,application/:id,selection,disbursement,scheme-builder,grievances,audit,roles}` (HashRouter, so URLs are `#/…`).

## Honest prototype boundaries
- All people, IDs, amounts and thresholds are **fictional example values**, not official MoTA rules. Identifiers are masked.
- Aadhaar, DigiLocker, PFMS, NSP, AISHE/UDISE are shown as **Prototype Integration / Integration Ready** — no live connection.
- eKYC: sign in or create an account with an **Aadhaar number** (OTP to the Aadhaar-linked mobile) or **DigiLocker** (sign in, then choose documents to share into the vault) — simulated in `src/components/EKyc.tsx`, no UIDAI/DigiLocker call.
- "AI" (classification, OCR, confidence scores, cross-document checks, anomaly flags, grievance assistant) is simulated deterministically. Documents below the 90% confidence threshold (`AI_CONF_THRESHOLD` in `src/lib/rules.ts`) always go to a MoTA official. It is advisory only: it never approves, rejects or labels anyone fraudulent; officers and the authorised committee decide.
- SMS/e-mail notifications are simulated; the audit log is in-memory.

## Structure
`src/store/AppStore.tsx` state & actions · `src/lib/rules.ts` rules engine · `src/data/mock.ts` seed data · `src/pages/{public,student,institution,admin}` · `src/components` shared UI, layouts, chatbot, accessibility, demo guide.
