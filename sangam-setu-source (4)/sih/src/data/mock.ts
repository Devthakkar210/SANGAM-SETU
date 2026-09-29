import type { InstitutionAccount, AdminAccount,
  Application, AuditEntry, Disbursement, Grievance, Institution, Notification, Scheme, StudentProfile, Stage, AppStatus, Flag, StudentDetails } from '../types'

// NOTE: All names, IDs and numbers below are fictional prototype data.
// Thresholds and amounts are EXAMPLE VALUES configured for the demo, not official scheme rules.

export const PROTOTYPE_NOTE = 'Example value configured for this prototype — refer to the official MoTA notification for actual rules.'

export const SCHEMES: Scheme[] = [
  {
    id: 'prematric', code: 'PRE-MAT', name: 'Pre-Matric Scholarship for ST Students', short: 'Pre-Matric',
    description: 'Support for ST students in Classes IX and X so that financial pressure does not push them out of school before the matriculation stage.',
    level: 'Class IX – X', incomeLabel: 'Family income up to ₹2.5 lakh / year (example)',
    benefits: ['Monthly maintenance allowance (day scholar / hosteller rates)', 'Annual books and ad-hoc grant', 'Direct transfer to student bank account'],
    period: { opens: '2026-07-01', closes: '2026-10-31' },
    dates: [{ label: 'Portal opens', date: '2026-07-01' }, { label: 'Last date for students', date: '2026-10-31' }, { label: 'Institution verification ends', date: '2026-11-15' }],
    rules: [
      { id: 'r1', field: 'category', op: '=', value: 'ST' },
      { id: 'r2', field: 'educationLevel', op: 'in', value: ['Class 9-10'] },
      { id: 'r3', field: 'income', op: '<=', value: 250000 },
      { id: 'r4', field: 'destination', op: '=', value: 'Domestic' },
    ],
    documents: [
      { key: 'st_cert', label: 'ST Certificate', mandatory: true },
      { key: 'income_cert', label: 'Income Certificate', mandatory: true },
      { key: 'marksheet', label: 'Previous Class Marksheet', mandatory: true },
      { key: 'bonafide', label: 'School Bonafide Certificate', mandatory: true },
      { key: 'bank', label: 'Bank Passbook / Cancelled Cheque', mandatory: true },
    ],
    extraFields: [
      { key: 'school', label: 'School name', type: 'text', placeholder: 'e.g. Govt. High School, Khunti' },
      { key: 'class', label: 'Current class', type: 'select', options: ['Class IX', 'Class X'] },
      { key: 'hostel', label: 'Residence', type: 'select', options: ['Day scholar', 'Hosteller'] },
    ],
    workflow: ['Submitted', 'AI Document Check', 'Institution Verification', 'State Scrutiny', 'Sanction', 'Disbursement'],
    notifications: [{ trigger: 'On submission', channel: 'SMS + In-app' }, { trigger: 'On deficiency', channel: 'SMS + In-app' }],
    color: '#2F9E6E', renewable: true, years: 2, status: 'Live', budgetCr: 420,
  },
  {
    id: 'postmatric', code: 'POST-MAT', name: 'Post-Matric Scholarship for ST Students', short: 'Post-Matric',
    description: 'Financial assistance for ST students studying at post-matriculation and post-secondary levels, from Class XI up to postgraduate courses.',
    level: 'Class XI – Postgraduate', incomeLabel: 'Family income up to ₹2.5 lakh / year (example)',
    benefits: ['Compulsory non-refundable fees reimbursed', 'Maintenance allowance by course group', 'Renewable every academic year'],
    period: { opens: '2026-07-15', closes: '2026-11-30' },
    dates: [{ label: 'Portal opens', date: '2026-07-15' }, { label: 'Last date for students', date: '2026-11-30' }, { label: 'Institution verification ends', date: '2026-12-15' }],
    rules: [
      { id: 'r1', field: 'category', op: '=', value: 'ST' },
      { id: 'r2', field: 'educationLevel', op: 'in', value: ['Class 11-12', 'Undergraduate', 'Postgraduate'] },
      { id: 'r3', field: 'income', op: '<=', value: 250000 },
      { id: 'r4', field: 'destination', op: '=', value: 'Domestic' },
    ],
    documents: [
      { key: 'st_cert', label: 'ST Certificate', mandatory: true },
      { key: 'income_cert', label: 'Income Certificate', mandatory: true },
      { key: 'marksheet', label: 'Last Qualifying Marksheet', mandatory: true },
      { key: 'bonafide', label: 'Bonafide / Fee Receipt', mandatory: true },
      { key: 'bank', label: 'Bank Passbook / Cancelled Cheque', mandatory: true },
    ],
    extraFields: [
      { key: 'courseGroup', label: 'Course group', type: 'select', options: ['Group I (Professional)', 'Group II', 'Group III', 'Group IV'] },
      { key: 'year', label: 'Year of study', type: 'select', options: ['1st', '2nd', '3rd', '4th', '5th'] },
      { key: 'admissionDate', label: 'Date of admission', type: 'date' },
    ],
    workflow: ['Submitted', 'AI Document Check', 'Institution Verification', 'State Scrutiny', 'Sanction', 'Disbursement'],
    notifications: [{ trigger: 'On submission', channel: 'SMS + In-app' }, { trigger: 'On sanction', channel: 'SMS + Email' }],
    color: '#26397D', renewable: true, years: 5, status: 'Live', budgetCr: 2410,
  },
  {
    id: 'topclass', code: 'TOP-CLS', name: 'Top Class Education Scholarship for ST Students', short: 'Top Class',
    description: 'Full support for meritorious ST students admitted to notified institutions of excellence for undergraduate and postgraduate study.',
    level: 'Undergraduate / Postgraduate', incomeLabel: 'Family income up to ₹6 lakh / year (example)',
    benefits: ['Full tuition and non-refundable fees', 'Living expenses and books', 'Laptop / computer support (one-time)'],
    period: { opens: '2026-08-01', closes: '2026-10-31' },
    dates: [{ label: 'Portal opens', date: '2026-08-01' }, { label: 'Last date', date: '2026-10-31' }],
    rules: [
      { id: 'r1', field: 'category', op: '=', value: 'ST' },
      { id: 'r2', field: 'educationLevel', op: 'in', value: ['Undergraduate', 'Postgraduate'] },
      { id: 'r3', field: 'institutionType', op: '=', value: 'Notified Top Class' },
      { id: 'r4', field: 'income', op: '<=', value: 600000 },
    ],
    documents: [
      { key: 'st_cert', label: 'ST Certificate', mandatory: true },
      { key: 'income_cert', label: 'Income Certificate', mandatory: true },
      { key: 'admission_letter', label: 'Admission Letter', mandatory: true },
      { key: 'marksheet', label: 'Qualifying Marksheet', mandatory: true },
      { key: 'bank', label: 'Bank Passbook / Cancelled Cheque', mandatory: true },
    ],
    extraFields: [
      { key: 'rank', label: 'Entrance exam rank (if any)', type: 'number' },
      { key: 'admissionDate', label: 'Date of admission', type: 'date' },
    ],
    workflow: ['Submitted', 'AI Document Check', 'Institution Verification', 'State Scrutiny', 'Selection Committee', 'Sanction', 'Disbursement'],
    notifications: [{ trigger: 'On submission', channel: 'SMS + In-app' }],
    color: '#D9680F', renewable: true, years: 4, status: 'Live', budgetCr: 160,
  },
  {
    id: 'nfst', code: 'NFST', name: 'National Fellowship for ST Students', short: 'NFST',
    description: 'Fellowship for ST scholars pursuing MPhil / PhD in Indian universities and institutions, supporting up to five years of full-time research.',
    level: 'MPhil / PhD', incomeLabel: 'Family income up to ₹6 lakh / year (example)',
    benefits: ['Monthly fellowship at JRF rate, SRF from year 3 (as per applicable norms)', 'Annual contingency grant', 'HRA as per university norms', 'Renewable for up to 5 years on progress'],
    period: { opens: '2026-08-15', closes: '2026-10-15' },
    dates: [{ label: 'Applications open', date: '2026-08-15' }, { label: 'Last date for scholars', date: '2026-10-15' }, { label: 'Institution verification ends', date: '2026-10-30' }, { label: 'Selection list (expected)', date: '2026-12-10' }],
    rules: [
      { id: 'r1', field: 'category', op: '=', value: 'ST' },
      { id: 'r2', field: 'educationLevel', op: 'in', value: ['MPhil/PhD'] },
      { id: 'r3', field: 'researchStatus', op: '=', value: 'Registered' },
      { id: 'r4', field: 'income', op: '<=', value: 600000 },
      { id: 'r5', field: 'destination', op: '=', value: 'Domestic' },
    ],
    documents: [
      { key: 'st_cert', label: 'ST Certificate', mandatory: true },
      { key: 'income_cert', label: 'Income Certificate', mandatory: true },
      { key: 'marksheet', label: 'PG Marksheet', mandatory: true },
      { key: 'research_reg', label: 'PhD Registration Letter', mandatory: true },
      { key: 'bonafide', label: 'Bonafide Certificate', mandatory: true },
      { key: 'bank', label: 'Bank Passbook / Cancelled Cheque', mandatory: true },
    ],
    extraFields: [
      { key: 'topic', label: 'Research topic', type: 'text', placeholder: 'Title of your research' },
      { key: 'supervisor', label: 'Supervisor name', type: 'text', placeholder: 'Dr. …' },
      { key: 'regDate', label: 'PhD registration date', type: 'date' },
      { key: 'mode', label: 'Mode of research', type: 'select', options: ['Full-time', 'Part-time'] },
    ],
    workflow: ['Submitted', 'AI Document Check', 'Institution Verification', 'State Scrutiny', 'Selection Committee', 'Sanction', 'Disbursement'],
    notifications: [{ trigger: 'On submission', channel: 'SMS + Email + In-app' }, { trigger: 'On deficiency', channel: 'SMS + In-app' }, { trigger: 'Renewal window', channel: 'Email + In-app' }],
    color: '#6B4FC8', renewal: {
      reuse: ['st_cert', 'research_reg'],
      documents: [
        { key: 'marksheet', label: 'Current Year Marksheet / Coursework Grade Sheet', mandatory: true },
        { key: 'income_cert', label: 'Current Income Certificate (2026-27)', mandatory: true },
        { key: 'bonafide', label: 'Current Enrolment / Bonafide Certificate', mandatory: true },
        { key: 'progress_report', label: 'Annual Progress Report (supervisor signed)', mandatory: true },
        { key: 'bank', label: 'Current Bank Passbook / Cancelled Cheque', mandatory: true },
      ],
    },
    renewable: true, years: 5, status: 'Live', budgetCr: 130,
  },
  {
    id: 'nos', code: 'NOS', name: 'National Overseas Scholarship for ST Students', short: 'NOS',
    description: 'Support for ST students selected for Master’s, PhD and post-doctoral study at recognised universities abroad.',
    level: 'Postgraduate / PhD abroad', incomeLabel: 'Family income up to ₹6 lakh / year (example)',
    benefits: ['Tuition fee as charged by the university', 'Annual maintenance and contingency allowance', 'Visa fee and economy air passage'],
    period: { opens: '2026-06-01', closes: '2026-09-30' },
    dates: [{ label: 'Applications open', date: '2026-06-01' }, { label: 'Last date', date: '2026-09-30' }, { label: 'Selection committee', date: '2026-11-05' }],
    rules: [
      { id: 'r1', field: 'category', op: '=', value: 'ST' },
      { id: 'r2', field: 'educationLevel', op: 'in', value: ['Postgraduate', 'MPhil/PhD'] },
      { id: 'r3', field: 'destination', op: '=', value: 'Overseas' },
      { id: 'r4', field: 'income', op: '<=', value: 600000 },
      { id: 'r5', field: 'marks', op: '>=', value: 60 },
    ],
    documents: [
      { key: 'st_cert', label: 'ST Certificate', mandatory: true },
      { key: 'income_cert', label: 'Income Certificate', mandatory: true },
      { key: 'marksheet', label: 'Qualifying Degree Marksheet', mandatory: true },
      { key: 'admission_letter', label: 'Unconditional Offer Letter', mandatory: true },
      { key: 'passport', label: 'Passport', mandatory: true },
      { key: 'bank', label: 'Bank Document', mandatory: true },
    ],
    extraFields: [
      { key: 'university', label: 'Foreign university', type: 'text' },
      { key: 'country', label: 'Country', type: 'select', options: ['United Kingdom', 'United States', 'Australia', 'Germany', 'Canada', 'Other'] },
      { key: 'programme', label: 'Programme', type: 'select', options: ['Master’s', 'PhD', 'Post-doctoral'] },
    ],
    workflow: ['Submitted', 'AI Document Check', 'State Scrutiny', 'Selection Committee', 'Sanction', 'Disbursement'],
    notifications: [{ trigger: 'On submission', channel: 'Email + In-app' }],
    color: '#1C6B4A', renewable: false, status: 'Live', budgetCr: 6,
  },
]

export const INSTITUTIONS: Institution[] = [
  { id: 'inst1', name: 'Birsa Institute of Research & Technology', code: 'JH-U-0142', state: 'Jharkhand', type: 'State University', nodal: 'Dr. R. Tirkey' },
  { id: 'inst2', name: 'Satpura College of Science', code: 'MP-C-2231', state: 'Madhya Pradesh', type: 'Government College', nodal: 'Prof. S. Uikey' },
  { id: 'inst3', name: 'Narmada Valley University', code: 'GJ-U-0310', state: 'Gujarat', type: 'State University', nodal: 'Dr. K. Vasava' },
  { id: 'inst4', name: 'Konark Institute of Engineering', code: 'OD-C-1180', state: 'Odisha', type: 'Private (Affiliated)', nodal: 'Mr. P. Majhi' },
  { id: 'inst5', name: 'Aravalli Govt. Senior Secondary School', code: 'RJ-S-8812', state: 'Rajasthan', type: 'Government School', nodal: 'Mrs. L. Meena' },
  { id: 'inst6', name: 'Sahyadri College of Arts & Commerce', code: 'MH-C-4471', state: 'Maharashtra', type: 'Aided College', nodal: 'Dr. A. Pawara' },
  { id: 'inst7', name: 'Bastar Institute of Technology', code: 'CG-C-0907', state: 'Chhattisgarh', type: 'Notified Top Class', nodal: 'Dr. M. Netam' },
]

export const DEMO_STUDENT_ID = 'stu-001'
export const DEMO_INSTITUTION_ID = 'inst1'

export const DEMO_PROFILE: StudentProfile = {
  id: DEMO_STUDENT_ID,
  name: 'Anjali Munda',
  fields: [
    { section: 'Personal details', items: [
      { label: 'Full name', value: 'Anjali Munda', verified: true, source: 'ST Certificate' },
      { label: 'Date of birth', value: '14 Mar 1999', verified: true, source: 'Class X Marksheet' },
      { label: 'Gender', value: 'Female', verified: true, source: 'Self-declared' },
      { label: 'Aadhaar (masked)', value: 'XXXX XXXX 4821', verified: true, source: 'Prototype eKYC' },
    ] },
    { section: 'Contact', items: [
      { label: 'Mobile', value: '+91 98XXX XX217', verified: true, source: 'OTP' },
      { label: 'Email', value: 'anjali.m@example.in', verified: true, source: 'Email link' },
    ] },
    { section: 'ST certificate', items: [
      { label: 'Tribe', value: 'Munda', verified: true, source: 'DigiLocker (prototype)' },
      { label: 'Certificate no.', value: 'JH/RAN/ST/2019/00XX31', verified: true, source: 'DigiLocker (prototype)' },
      { label: 'Issuing authority', value: 'Circle Officer, Ranchi Sadar', verified: true },
    ] },
    { section: 'Academic', items: [
      { label: 'Highest qualification', value: 'M.Sc. Environmental Science (78.4%)', verified: true, source: 'Marksheet OCR' },
      { label: 'Current course', value: 'PhD, Environmental Science', verified: true, source: 'Institution' },
      { label: 'Institution', value: 'Birsa Institute of Research & Technology', verified: true, source: 'Institution' },
    ] },
    { section: 'Bank', items: [
      { label: 'Account (masked)', value: 'XXXXXXXX3390', verified: true, source: 'Penny-drop (prototype)' },
      { label: 'IFSC', value: 'SBIN0XXXX12', verified: true },
      { label: 'Aadhaar seeded', value: 'Yes', verified: true },
    ] },
    { section: 'Family & income', items: [
      { label: 'Annual family income', value: '₹2,40,000 (FY 2024-25)', verified: false, source: 'Last year certificate — needs renewal' },
      { label: 'Parent occupation', value: 'Agriculture', verified: true },
    ] },
    { section: 'Address', items: [
      { label: 'District / State', value: 'Ranchi, Jharkhand', verified: true, source: 'ST Certificate' },
      { label: 'PIN', value: '834XXX', verified: true },
    ] },
  ],
}

// --- Seeded applications for admin / institution views -----------------------
const NAMES: [string, 'F' | 'M'][] = [
  ['Ravi Oraon', 'M'], ['Sunita Bhil', 'F'], ['Arjun Gond', 'M'], ['Meera Santhal', 'F'], ['Kiran Meena', 'F'], ['Vikas Uikey', 'M'],
  ['Pooja Vasava', 'F'], ['Rahul Majhi', 'M'], ['Lakshmi Soren', 'F'], ['Deepak Netam', 'M'], ['Asha Pawara', 'F'], ['Sanjay Tirkey', 'M'],
  ['Neha Hansda', 'F'], ['Manoj Baiga', 'M'], ['Kavita Chaudhari', 'F'], ['Rohit Kujur', 'M'], ['Geeta Marandi', 'F'], ['Amit Dhurve', 'M'],
  ['Priyanka Gamit', 'F'], ['Sunil Ekka', 'M'], ['Rekha Korku', 'F'], ['Ajay Lakra', 'M'], ['Suman Tudu', 'F'], ['Nitin Warli', 'M'],
]

const seededStages: [Stage, AppStatus][] = [
  ['Institution Verification', 'In Progress'], ['State Scrutiny', 'In Progress'], ['State Scrutiny', 'In Progress'],
  ['Selection Committee', 'In Progress'], ['Sanction', 'Selected'], ['Disbursement', 'Disbursed'], ['State Scrutiny', 'Correction Requested'],
  ['Institution Verification', 'In Progress'], ['Selection Committee', 'Waitlisted'], ['State Scrutiny', 'Further Review'],
]

const flagPool: Flag[] = [
  { id: 'f', type: 'Duplicate bank details', severity: 'high', confidence: 91, explanation: 'The same bank account (masked XXXX7781) is linked to another application in this cycle. This can be legitimate (siblings sharing a parent account) but needs confirmation.' },
  { id: 'f', type: 'Name mismatch', severity: 'medium', confidence: 88, explanation: 'Name on the marksheet reads "Sunita Bheel" while the ST certificate reads "Sunita Bhil". Likely a transliteration variant — officer to confirm.' },
  { id: 'f', type: 'Expired certificate', severity: 'medium', confidence: 97, explanation: 'Income certificate validity ended on 31 Mar 2026, before the application date. A current certificate is required.' },
  { id: 'f', type: 'Duplicate application', severity: 'high', confidence: 86, explanation: 'An application with matching name, date of birth and parent name exists under Post-Matric in another state. Could be a migration case.' },
  { id: 'f', type: 'Document inconsistency', severity: 'low', confidence: 79, explanation: 'Admission date on bonafide certificate (12 Aug 2026) is after the fee receipt date (02 Aug 2026).' },
]

const schemeCycle = ['postmatric', 'postmatric', 'prematric', 'nfst', 'topclass', 'postmatric', 'nos', 'prematric', 'nfst', 'postmatric']
const courseFor: Record<string, string[]> = {
  prematric: ['Class IX', 'Class X'], postmatric: ['B.A.', 'B.Sc. Nursing', 'Class XII', 'B.Tech', 'M.Com'],
  topclass: ['B.Tech CSE', 'MBA'], nfst: ['PhD Sociology', 'PhD Chemistry'], nos: ['MSc Public Health (UK)', 'PhD Ecology (Australia)'],
}
const amountFor: Record<string, number> = { prematric: 5250, postmatric: 23400, topclass: 212000, nfst: 444000, nos: 1850000 }

export const SEED_APPS: Application[] = NAMES.map(([n, g], i) => {
  const schemeId = schemeCycle[i % schemeCycle.length]
  const inst = INSTITUTIONS[i % INSTITUTIONS.length]
  const [stage, status] = seededStages[i % seededStages.length]
  const flags: Flag[] = i % 3 === 0 ? [{ ...flagPool[(i / 3) % flagPool.length], id: `fl-${i}` }] : []
  // A few records where document reading confidence fell below the threshold -> routed to a MoTA official
  if (i % 8 === 2) flags.push({ id: `lc-${i}`, type: 'Low AI confidence', severity: 'medium', confidence: 71 + (i % 9), docType: i % 16 === 2 ? 'bonafide' : 'income_cert',
    explanation: `${i % 16 === 2 ? 'Bonafide certificate' : 'Income certificate'} was read with ${71 + (i % 9)}% confidence (threshold 90%). Seal and signature area is faded, so the AI did not accept it automatically. Routed to a MoTA official for manual verification.` })
  const day = String(1 + ((i * 3) % 27)).padStart(2, '0')
  const cls = courseFor[schemeId]
  return {
    id: `${SCHEMES.find((s) => s.id === schemeId)!.code}-2026-${String(10200 + i * 7)}`,
    studentId: `stu-${100 + i}`, studentName: n, schemeId, institutionId: inst.id, state: inst.state,
    course: cls[i % cls.length], income: 120000 + ((i * 37000) % 420000), marks: 58 + ((i * 7) % 38),
    stage, status, submittedOn: `2026-09-${day}`, flags,
    history: [{ stage: 'Submitted', date: `2026-09-${day}` }, { stage: 'AI Document Check', date: `2026-09-${day}` }],
    remarks: [], amount: amountFor[schemeId], gender: g,
    priority: [g === 'F' ? 'Female applicant' : '', i % 4 === 0 ? 'PVTG' : '', i % 5 === 0 ? 'First-generation learner' : ''].filter(Boolean),
  }
})

// A few more NFST applicants so the selection board has something to rank
export const EXTRA_NFST: Application[] = [
  ['Sarita Hembrom', 'F', 81.2, 'PhD Anthropology'], ['Mahesh Bhuriya', 'M', 74.5, 'PhD Physics'], ['Jyoti Kerketta', 'F', 69.8, 'PhD Economics'],
  ['Prakash Damor', 'M', 77.1, 'PhD Botany'], ['Rina Barla', 'F', 72.3, 'PhD History'], ['Tarun Minz', 'M', 66.4, 'PhD Linguistics'],
].map(([n, g, m, c], i) => ({
  id: `NFST-2026-${10390 + i * 11}`, studentId: `stu-3${i}`, studentName: n as string, schemeId: 'nfst', institutionId: INSTITUTIONS[(i + 2) % 7].id,
  state: INSTITUTIONS[(i + 2) % 7].state, course: c as string, income: 180000 + i * 52000, marks: m as number,
  stage: 'Selection Committee' as Stage, status: 'In Progress' as AppStatus, submittedOn: `2026-09-0${i + 2}`, flags: [],
  history: [], remarks: [], amount: 444000, gender: g as 'F' | 'M',
  priority: [g === 'F' ? 'Female applicant' : '', i === 1 || i === 5 ? 'PVTG' : '', i === 2 ? 'Person with disability' : ''].filter(Boolean),
}))

export const PAST_APP: Application = {
  id: 'POST-MAT-2023-08812', studentId: DEMO_STUDENT_ID, studentName: 'Anjali Munda', schemeId: 'postmatric', institutionId: 'inst1',
  state: 'Jharkhand', course: 'M.Sc. Environmental Science', income: 210000, marks: 78.4, stage: 'Disbursement', status: 'Disbursed',
  submittedOn: '2023-09-12', flags: [], history: STAGESFULL('2023'), remarks: [], amount: 23400, gender: 'F', priority: [],
}

function STAGESFULL(y: string) {
  return (['Submitted', 'AI Document Check', 'Institution Verification', 'State Scrutiny', 'Sanction', 'Disbursement'] as Stage[]).map((s, i) => ({ stage: s, date: `${y}-${String(9 + Math.floor(i / 2)).padStart(2, '0')}-${String(10 + i * 3).padStart(2, '0')}` }))
}

export const SEED_NOTIFICATIONS: Notification[] = [
  { id: 'n1', title: 'NFST applications are open', body: 'National Fellowship for ST Students 2026-27 is accepting applications until 15 Oct 2026. You may be eligible based on your profile.', at: '2026-09-25T10:00', read: false, channel: ['in-app', 'email'], kind: 'info', audience: 'student' },
  { id: 'n2', title: 'Income certificate needs renewal', body: 'Your income certificate on file is from FY 2024-25. Most schemes need a certificate issued in the current financial year.', at: '2026-09-24T16:20', read: false, channel: ['in-app', 'sms'], kind: 'action', audience: 'student' },
  { id: 'n3', title: 'Profile verified', body: 'Your ST certificate, bank account and academic details are verified and can be reused for any scheme.', at: '2026-09-20T09:12', read: true, channel: ['in-app'], kind: 'success', audience: 'student' },
  { id: 'n4', title: '14 applications awaiting verification', body: 'Students from your institution submitted applications that need institutional verification before 30 Oct.', at: '2026-09-26T09:00', read: false, channel: ['in-app', 'email'], kind: 'action', audience: 'institution' },
  { id: 'n5', title: 'Scrutiny backlog above threshold in 3 districts', body: 'Pending scrutiny older than 15 days crossed 500 in Bastar, Dahod and Mayurbhanj.', at: '2026-09-26T08:00', read: false, channel: ['in-app'], kind: 'warning', audience: 'admin' },
]

export const SEED_GRIEVANCES: Grievance[] = [
  { id: 'GRV-2026-0311', category: 'Payment not received', subject: 'Second instalment not credited', description: 'Sanction shows complete but amount not received in account.', applicationId: 'POST-MAT-2026-10235', status: 'In Progress', assignedTo: 'PFMS Cell – Jharkhand', createdOn: '2026-09-18', thread: [{ by: 'Student', text: 'Second instalment not credited after sanction.', at: '2026-09-18' }, { by: 'PFMS Cell – Jharkhand', text: 'Payment returned by bank due to inactive account. Please confirm account status.', at: '2026-09-20' }] },
  { id: 'GRV-2026-0298', category: 'Document issue', subject: 'Marksheet rejected as blurry', description: 'I uploaded a clear scan but it was marked unreadable.', status: 'Open', createdOn: '2026-09-22', thread: [{ by: 'Student', text: 'Uploaded a clear scan but it was marked unreadable.', at: '2026-09-22' }] },
  { id: 'GRV-2026-0287', category: 'Institution not verifying', subject: 'College has not verified for 3 weeks', description: 'Application stuck at institution verification.', applicationId: 'PRE-MAT-2026-10249', status: 'Assigned', assignedTo: 'MoTA Super Admin', createdOn: '2026-09-15', thread: [{ by: 'Student', text: 'Application stuck at institution verification.', at: '2026-09-15' }] },
]

export const SEED_AUDIT: AuditEntry[] = [
  { id: 'a1', user: 'System (AI Assist)', role: 'Automated', action: 'AI document check completed', applicationId: 'POST-MAT-2026-10200', details: '5 documents classified, 0 issues', at: '2026-09-26 09:14' },
  { id: 'a2', user: 'MoTA Super Admin', role: 'Super Admin', action: 'Correction requested', applicationId: 'POST-MAT-2026-10242', details: 'Income certificate expired', at: '2026-09-26 10:02' },
  { id: 'a3', user: 'Super Admin', role: 'Super Admin', action: 'Scheme configuration updated', details: 'Post-Matric: renewal notification added', at: '2026-09-25 17:40' },
  { id: 'a4', user: 'Dr. R. Tirkey', role: 'Institution', action: 'Bulk verification', details: '12 applications verified', at: '2026-09-25 15:21' },
]

export const SEED_DISBURSEMENTS: Disbursement[] = SEED_APPS.filter((a) => a.stage === 'Sanction' || a.stage === 'Disbursement')
  .map((a, i) => ({
    id: `DSB-${4400 + i}`, applicationId: a.id, studentName: a.studentName, schemeId: a.schemeId, amount: a.amount,
    status: (a.stage === 'Disbursement' ? 'Disbursed' : i % 3 === 0 ? 'Failed' : 'Pending') as Disbursement['status'],
    date: a.stage === 'Disbursement' ? '2026-09-21' : undefined, reference: a.stage === 'Disbursement' ? `PFMS-PROTO-${880120 + i}` : undefined,
    installment: 'Instalment 1 of 2',
  }))
  .concat([
    { id: 'DSB-4390', applicationId: 'POST-MAT-2023-08812', studentName: 'Anjali Munda', schemeId: 'postmatric', amount: 11700, status: 'Disbursed', date: '2023-12-18', reference: 'PFMS-PROTO-771203', installment: 'Instalment 1 of 2' },
    { id: 'DSB-4391', applicationId: 'POST-MAT-2023-08812', studentName: 'Anjali Munda', schemeId: 'postmatric', amount: 11700, status: 'Disbursed', date: '2024-03-22', reference: 'PFMS-PROTO-790551', installment: 'Instalment 2 of 2' },
  ])

export const MONTHLY = [
  { m: 'Apr', apps: 8200 }, { m: 'May', apps: 9100 }, { m: 'Jun', apps: 14800 }, { m: 'Jul', apps: 26400 },
  { m: 'Aug', apps: 38900 }, { m: 'Sep', apps: 51200 },
]

export const BY_STATE = [
  { state: 'Madhya Pradesh', apps: 28410 }, { state: 'Odisha', apps: 21950 }, { state: 'Jharkhand', apps: 19320 },
  { state: 'Rajasthan', apps: 17880 }, { state: 'Gujarat', apps: 16240 }, { state: 'Maharashtra', apps: 15100 },
  { state: 'Chhattisgarh', apps: 14770 }, { state: 'Others', apps: 14566 },
]

export const STATES = ['Jharkhand', 'Madhya Pradesh', 'Gujarat', 'Odisha', 'Rajasthan', 'Maharashtra', 'Chhattisgarh']

/* ---------- Renewal demo: Anjali's previous NFST fellowship year (2025-26) ---------- */
export const PREV_NFST_ID = 'NFST-2025-0001'
export const RENEWAL_ID = 'NFST-REN-2026-0001'
export const PREV_NFST: Application = {
  id: PREV_NFST_ID, studentId: DEMO_STUDENT_ID, studentName: 'Anjali Munda', schemeId: 'nfst', institutionId: 'inst1',
  state: 'Jharkhand', course: 'PhD, Environmental Science', income: 240000, marks: 78, stage: 'Disbursement', status: 'Disbursed',
  submittedOn: '2025-08-20', flags: [], history: [
    { stage: 'Submitted', date: '2025-08-20' }, { stage: 'AI Document Check', date: '2025-08-20', note: '6 documents read, no issues' },
    { stage: 'Institution Verification', date: '2025-08-28' }, { stage: 'State Scrutiny', date: '2025-09-15' },
    { stage: 'Selection Committee', date: '2025-10-30', note: 'Selected (JRF)' }, { stage: 'Sanction', date: '2025-11-04' }, { stage: 'Disbursement', date: '2025-11-20', note: 'Quarterly releases 2025-26' },
  ], remarks: [{ by: 'MoTA Super Admin', text: 'Selected for NFST 2025-26 (JRF). Renewal due annually.', at: '2025-11-04 12:10' }],
  amount: 444000, gender: 'F', priority: ['Female applicant', 'First-generation learner'], applicationType: 'new', previousApplicationId: null, renewalYear: null,
  extra: { topic: 'Traditional water harvesting practices in the Chotanagpur plateau', supervisor: 'Dr. P. Soren', regDate: '2024-07-18', mode: 'Full-time' },
}
/** What the previous (2025-26) application recorded for fields that can change each year. */
export const PREV_RENEWAL_VALUES = {
  academicYear: '2025-26', courseYear: '2nd Year', semester: '4th Semester', cgpa: '7.8', result: 'Passed', institution: 'Birsa Institute of Research & Technology',
  income: 240000, incomeSource: 'Agriculture', mobile: '+91 98XXX XX217', email: 'anjali.m@example.in', residence: 'Hostel', bank: 'XXXXXXXX3390 · SBIN0XXXX12',
  researchStage: 'Coursework completed', topic: 'Traditional water harvesting practices in the Chotanagpur plateau', supervisor: 'Dr. P. Soren',
}
/** Stable information reused as-is from the previous application / verified profile. */
export const STABLE_PROFILE: { label: string; value: string }[] = [
  { label: 'Full name', value: 'Anjali Munda' }, { label: 'Date of birth', value: '14 Mar 1999' }, { label: 'Gender', value: 'Female' },
  { label: 'Nationality', value: 'Indian' }, { label: 'Category', value: 'Scheduled Tribe' }, { label: 'Tribe / community', value: 'Munda' },
  { label: 'Domicile', value: 'Jharkhand' }, { label: 'State', value: 'Jharkhand' }, { label: 'District', value: 'Ranchi' },
  { label: 'Permanent address', value: 'Village XXXX, Ranchi, Jharkhand – 834XXX' }, { label: 'Parent / guardian', value: 'S. Munda (Father) · Agriculture' },
  { label: 'Disability', value: 'None declared' }, { label: 'Student / profile ID', value: 'STU-001' },
]

/* ---------- Student accounts ---------- */
/** The pre-registered demo account (fictional). New accounts start empty and fill their own details. */
export const DEMO_DETAILS: StudentDetails = {
  name: 'Anjali Munda', dob: '1999-03-14', gender: 'Female', mobile: '9876500217', email: 'anjali.m@example.in', aadhaarLast4: '4821',
  tribe: 'Munda', state: 'Jharkhand', district: 'Ranchi', pin: '834001', address: 'Village XXXX, Ranchi', guardian: 'S. Munda (Father)', parentOccupation: 'Agriculture', disability: 'None',
  qualification: 'M.Sc. Environmental Science', qualificationMarks: '78.4', currentCourse: 'PhD, Environmental Science', courseLevel: 'MPhil/PhD', institutionId: 'inst1', yearOfStudy: '2nd Year',
  bankAccount: '998877663390', ifsc: 'SBIN0XXXX12', bankName: 'State Bank of India', aadhaarSeeded: 'Yes', income: '240000',
  enrollmentNo: 'BIRT/PHD/2024/0217', category: 'Scheduled Tribe (ST)', semester: 'Semester 3',
}
export const DEMO_VERIFIED: Partial<Record<keyof StudentDetails, string>> = {
  name: 'ST Certificate', dob: 'Class X Marksheet', gender: 'Self-declared', mobile: 'OTP', email: 'Email link', aadhaarLast4: 'Prototype eKYC',
  tribe: 'DigiLocker (prototype)', state: 'ST Certificate', district: 'ST Certificate', qualification: 'Marksheet OCR', qualificationMarks: 'Marksheet OCR',
  currentCourse: 'Institution', courseLevel: 'Institution', institutionId: 'Institution', bankAccount: 'Penny-drop (prototype)', ifsc: 'Penny-drop (prototype)', aadhaarSeeded: 'NPCI (prototype)',
}

/* ---------- Demo institute & admin accounts (fictional) ---------- */
/** Demo institute login — linked to the seeded demo institution, so its verification queue has applications. */
export const DEMO_INSTITUTION_ACCOUNT: InstitutionAccount = {
  id: DEMO_INSTITUTION_ID, name: 'Birsa Institute of Research & Technology', type: 'State University', state: 'Jharkhand',
  code: 'JH-U-0142', aishe: 'U-0442', nodal: 'Dr. R. Tirkey', designation: 'Deputy Registrar (Academics)',
  email: 'nodal.scholarship@birt.example', phone: '0651234120', courses: ['UG', 'PG', 'MPhil/PhD'], schemes: ['postmatric', 'topclass', 'nfst'],
  createdAt: '2019-04-01', verifiedAt: '2019-04-03', reviewNotes: [], isDemo: true,
}
export const DEMO_ADMIN_ID = 'ADM-001'
export const DEMO_ADMIN_ACCOUNT: AdminAccount = {
  id: DEMO_ADMIN_ID, name: 'MoTA Super Admin', email: 'superadmin.demo@tribal.gov.in', mobile: '9811100001', userId: 'MOTA-SA-01', role: 'super_admin', createdAt: '2024-01-15', isDemo: true,
}
/** Sign-in details shown on the login page and by SetuSakha. OTP: any 6 digits. */
export const DEMO_LOGINS = {
  student: { id: '9876500217', label: 'Mobile 9876500217 (Anjali Munda)' },
  institution: { id: 'JH-U-0142', alt: 'nodal.scholarship@birt.example', label: 'Institution code JH-U-0142 or nodal.scholarship@birt.example (Dr. R. Tirkey)' },
  super_admin: { id: 'MOTA-SA-01', alt: 'superadmin.demo@tribal.gov.in', label: 'User ID MOTA-SA-01 or superadmin.demo@tribal.gov.in (MoTA Super Admin)' },
} as const

/* ---------- One-click demo credentials (fictional, demo-only) ---------- */
/**
 * Credentials shown on the "Try a demo account" cards. They sign in to the seeded demo accounts above.
 * The `.demo` domain is not a real mail domain, and these passwords only unlock the in-memory demo accounts —
 * they are never used for accounts created through Create Account. On the Login page, the demo email can be
 * typed as the sign-in ID (OTP: any 6 digits).
 */
export const DEMO_CREDENTIALS = {
  student: { role: 'student', email: 'student.demo@sangamsetu.demo', password: 'Student@123', accountId: DEMO_STUDENT_ID },
  institution: { role: 'institution', email: 'institute.demo@sangamsetu.demo', password: 'Institute@123', accountId: DEMO_INSTITUTION_ID },
  super_admin: { role: 'super_admin', email: 'admin.demo@sangamsetu.demo', password: 'Admin@123', accountId: DEMO_ADMIN_ID },
} as const

/** Is `raw` the demo sign-in email for this role? */
export const isDemoEmail = (role: keyof typeof DEMO_CREDENTIALS, raw: string) => raw.trim().toLowerCase() === DEMO_CREDENTIALS[role].email
