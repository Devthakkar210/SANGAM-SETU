import type { Lang } from '../types'

type Dict = Record<string, string>

const en: Dict = {
  home: 'Home', schemes: 'Schemes', eligibility: 'Eligibility', notifications: 'Notifications', faqs: 'FAQs', grievance: 'Grievance', login: 'Login', register: 'Register',
  heroTitle: 'One Platform. Every Opportunity. Smarter Scholarships.',
  heroSub: 'An intelligent scholarship and fellowship management platform helping ST students discover, apply, verify and track opportunities from eligibility to disbursement.',
  findMy: 'Find My Scholarship', explore: 'Explore Schemes', finalCta: 'From Eligibility to Opportunity.',
  dashboard: 'Dashboard', profile: 'My Profile', applications: 'My Applications', documents: 'Documents & Deficiencies', overview: 'Overview', renewalApp: 'Renewal Application', instProfile: 'Institution Profile', deficiencies: 'Deficiencies', status: 'Track Status',
  disbursement: 'Disbursement', disbRenew: 'Disbursement & Renewal', renewal: 'Renewal', settings: 'Settings', checkElig: 'Check Eligibility', applyNow: 'Apply Now',
  importantDates: 'Important Dates', downloads: 'Downloads', students: 'Students', verification: 'Verification Queue', commandCenter: 'Command Center',
  scrutiny: 'Scrutiny Queue', selection: 'Merit & Selection', builder: 'Scheme Builder', audit: 'Audit Log', roles: 'Roles & Access', grievances: 'Grievances',
  welcome: 'Welcome back', pendingActions: 'Pending actions', deadlines: 'Upcoming deadlines', language: 'Language',
  howItWorks: 'How It Works', demo: 'Demo', createAccount: 'Create Account',
}

const hi: Dict = {
  home: 'होम', schemes: 'योजनाएँ', eligibility: 'पात्रता', notifications: 'सूचनाएँ', faqs: 'सामान्य प्रश्न', grievance: 'शिकायत', login: 'लॉगिन', register: 'पंजीकरण',
  heroTitle: 'एक मंच। हर अवसर। स्मार्ट छात्रवृत्ति।',
  heroSub: 'एक बुद्धिमान छात्रवृत्ति और फ़ेलोशिप प्रबंधन मंच, जो अनुसूचित जनजाति के छात्रों को पात्रता से लेकर भुगतान तक अवसर खोजने, आवेदन करने, सत्यापित करने और ट्रैक करने में मदद करता है।',
  findMy: 'मेरी छात्रवृत्ति खोजें', explore: 'योजनाएँ देखें', finalCta: 'पात्रता से अवसर तक।',
  dashboard: 'डैशबोर्ड', profile: 'मेरी प्रोफ़ाइल', applications: 'मेरे आवेदन', documents: 'दस्तावेज़ और कमियाँ', overview: 'अवलोकन', renewalApp: 'नवीनीकरण आवेदन', instProfile: 'संस्थान प्रोफ़ाइल', deficiencies: 'कमियाँ', status: 'स्थिति देखें',
  disbursement: 'भुगतान', disbRenew: 'भुगतान और नवीनीकरण', renewal: 'नवीनीकरण', settings: 'सेटिंग्स', checkElig: 'पात्रता जाँचें', applyNow: 'अभी आवेदन करें',
  importantDates: 'महत्वपूर्ण तिथियाँ', downloads: 'डाउनलोड', students: 'छात्र', verification: 'सत्यापन कतार', commandCenter: 'कमांड सेंटर',
  scrutiny: 'जाँच कतार', selection: 'मेरिट और चयन', builder: 'योजना निर्माता', audit: 'ऑडिट लॉग', roles: 'भूमिकाएँ और पहुँच', grievances: 'शिकायतें',
  welcome: 'फिर से स्वागत है', pendingActions: 'लंबित कार्य', deadlines: 'आगामी समय-सीमा', language: 'भाषा',
  howItWorks: 'यह कैसे काम करता है', demo: 'डेमो', createAccount: 'खाता बनाएँ',
}

const gu: Dict = {
  home: 'હોમ', schemes: 'યોજનાઓ', eligibility: 'પાત્રતા', notifications: 'સૂચનાઓ', faqs: 'વારંવાર પૂછાતા પ્રશ્નો', grievance: 'ફરિયાદ', login: 'લૉગિન', register: 'નોંધણી',
  heroTitle: 'એક પ્લેટફોર્મ. દરેક તક. સ્માર્ટ શિષ્યવૃત્તિ.',
  heroSub: 'એક બુદ્ધિશાળી શિષ્યવૃત્તિ અને ફેલોશિપ વ્યવસ્થાપન પ્લેટફોર્મ, જે અનુસૂચિત જનજાતિના વિદ્યાર્થીઓને પાત્રતાથી ચુકવણી સુધી તકો શોધવા, અરજી કરવા, ચકાસવા અને ટ્રૅક કરવામાં મદદ કરે છે.',
  findMy: 'મારી શિષ્યવૃત્તિ શોધો', explore: 'યોજનાઓ જુઓ', finalCta: 'પાત્રતાથી તક સુધી.',
  dashboard: 'ડેશબોર્ડ', profile: 'મારી પ્રોફાઇલ', applications: 'મારી અરજીઓ', documents: 'દસ્તાવેજો અને ખામીઓ', overview: 'ઝાંખી', renewalApp: 'નવીકરણ અરજી', instProfile: 'સંસ્થા પ્રોફાઇલ', deficiencies: 'ખામીઓ', status: 'સ્થિતિ જુઓ',
  disbursement: 'ચુકવણી', disbRenew: 'ચુકવણી અને નવીકરણ', renewal: 'નવીકરણ', settings: 'સેટિંગ્સ', checkElig: 'પાત્રતા તપાસો', applyNow: 'હમણાં અરજી કરો',
  importantDates: 'મહત્વની તારીખો', downloads: 'ડાઉનલોડ', students: 'વિદ્યાર્થીઓ', verification: 'ચકાસણી કતાર', commandCenter: 'કમાન્ડ સેન્ટર',
  scrutiny: 'ચકાસણી કતાર', selection: 'મેરિટ અને પસંદગી', builder: 'યોજના બિલ્ડર', audit: 'ઑડિટ લૉગ', roles: 'ભૂમિકાઓ અને ઍક્સેસ', grievances: 'ફરિયાદો',
  welcome: 'ફરી સ્વાગત છે', pendingActions: 'બાકી કાર્યો', deadlines: 'આગામી સમયમર્યાદા', language: 'ભાષા',
  howItWorks: 'તે કેવી રીતે કામ કરે છે', demo: 'ડેમો', createAccount: 'ખાતું બનાવો',
}

export const DICTS: Record<Lang, Dict> = { en, hi, gu }
export const LANG_LABEL: Record<Lang, string> = { en: 'English', hi: 'हिन्दी', gu: 'ગુજરાતી' }
