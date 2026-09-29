import { useRef, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Fingerprint, FolderLock, Loader2, CheckCircle2, ShieldCheck, UserRound, FileCheck2, ArrowLeft } from 'lucide-react'
import { useStore } from '../store/AppStore'
import type { DocumentRec } from '../types'
import { Badge, Button, Input, Label, ProtoTag, Tabs, cx } from './ui'

export type EKycMethod = 'aadhaar' | 'digilocker'
export interface EKycResult {
  method: EKycMethod
  name: string
  maskedId: string
  mobile: string
  dob: string
  gender: string
  address: string
  docs: string[]
  /** the account this eKYC resolved to (login) */
  accountId?: string
}
/** Income certificate fetched from DigiLocker (prototype) — added to the account's vault by the caller. */
export const digiLockerIncomeDoc = (name: string, income?: string): DocumentRec => ({ id: 'd-inc', type: 'income_cert', label: 'Income Certificate', fileName: 'Income_Certificate_2025-26_DigiLocker.pdf', status: 'Verified by AI', confidence: 96,
  extracted: { Name: name, 'Annual family income': income ? `₹${Number(income).toLocaleString('en-IN')}` : '₹3,20,000', 'Financial year': '2025-26', 'Valid till': '31 Mar 2027' } })
export interface EKycIdentity { id?: string; name: string; dob: string; gender: string; mobile: string; address: string }

type Step = 'input' | 'otp' | 'consent' | 'fetching' | 'done'

const DL_DOCS = [
  { key: 'aadhaar', label: 'Aadhaar (masked)', required: true },
  { key: 'st_cert', label: 'ST certificate', required: false },
  { key: 'income_cert', label: 'Income certificate 2025-26', required: false },
  { key: 'marksheet', label: 'PG marksheet', required: false },
]

/** Simulated eKYC — no real UIDAI / DigiLocker call is made. At sign-up it confirms the details the student typed; at sign-in it finds the linked account. */

/**
 * eKYC with Aadhaar number (OTP to Aadhaar-linked mobile) or DigiLocker (sign in + consent to share documents).
 * Used on the Sign-in page and while creating an account.
 */
export function EKyc({ purpose, onVerified, actionLabel, identity, resolve }: { purpose: 'login' | 'register'; onVerified: (r: EKycResult) => void; actionLabel: string; identity?: EKycIdentity; resolve?: (q: { method: EKycMethod; raw: string }) => EKycIdentity | null }) {
  const s = useStore()
  const [method, setMethod] = useState<EKycMethod>('aadhaar')
  const [step, setStep] = useState<Step>('input')
  const [aadhaar, setAadhaar] = useState('')
  const [dlId, setDlId] = useState('')
  const [consent, setConsent] = useState(false)
  const [otp, setOtp] = useState('')
  const [docs, setDocs] = useState<string[]>(DL_DOCS.map((d) => d.key))
  const [err, setErr] = useState('')
  const [result, setResult] = useState<EKycResult | null>(null)
  const timer = useRef<number>(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const digits = aadhaar.replace(/\D/g, '')
  const masked = method === 'aadhaar' ? `XXXX XXXX ${digits.slice(-4) || '0000'}` : dlId.includes('@') || /\D/.test(dlId) ? dlId.replace(/^(.{2}).*(.{2})$/, '$1•••$2') : `XXXXXX${dlId.slice(-4)}`
  const switchMethod = (m: EKycMethod) => { setMethod(m); setStep('input'); setOtp(''); setErr(''); setConsent(false); setResult(null) }
  const fmtAadhaar = (v: string) => v.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ')

  const start = () => {
    if (method === 'aadhaar') {
      if (!/^[2-9]\d{11}$/.test(digits)) { setErr('Enter a valid 12-digit Aadhaar number (it cannot start with 0 or 1).'); return }
    } else if (dlId.trim().length < 4) { setErr('Enter your DigiLocker username, registered mobile or Aadhaar number.'); return }
    if (!consent) { setErr(method === 'aadhaar' ? 'Please give consent for Aadhaar authentication.' : 'Please agree to sign in to DigiLocker.'); return }
    setErr(''); setStep('otp')
    s.toast(`OTP sent to ${method === 'aadhaar' ? 'your Aadhaar-linked' : 'your DigiLocker-registered'} mobile (prototype — any 6 digits)`, 'info')
  }
  const fetchKyc = () => {
    const who = identity ?? resolve?.({ method, raw: method === 'aadhaar' ? digits : dlId })
    if (!who) {
      setStep('input'); setOtp('')
      setErr(`No SANGAM Setu account is linked to this ${method === 'aadhaar' ? 'Aadhaar number' : 'DigiLocker account'}. Create an account first.`)
      return
    }
    const KYC = { name: who.name, mobile: who.mobile, dob: who.dob, gender: who.gender, address: who.address }
    setStep('fetching')
    timer.current = window.setTimeout(() => {
      const r: EKycResult = { method, ...KYC, maskedId: masked, docs: method === 'digilocker' ? docs : ['aadhaar'], accountId: who.id }
      s.log('eKYC completed', `${method === 'aadhaar' ? 'Aadhaar OTP' : 'DigiLocker'} · ${masked}${method === 'digilocker' ? ` · ${docs.length} document(s) shared` : ''} · ${purpose} (prototype)`, undefined, { user: KYC.name, role: 'Student' })
      setResult(r); setStep('done')
    }, s.lowBandwidth ? 100 : 1500)
  }
  const verifyOtp = () => {
    if (!/^\d{6}$/.test(otp)) { setErr('Enter the 6-digit OTP. In this prototype any 6 digits work.'); return }
    setErr('')
    if (method === 'digilocker') setStep('consent'); else fetchKyc()
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Tabs value={method} onChange={switchMethod} tabs={[
          { id: 'aadhaar', label: <span className="flex items-center gap-1.5"><Fingerprint size={14} />Aadhaar number</span> },
          { id: 'digilocker', label: <span className="flex items-center gap-1.5"><FolderLock size={14} />DigiLocker</span> },
        ]} />
        <ProtoTag label="eKYC – Prototype" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={method + step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {step === 'input' && (
            <div className="space-y-3">
              {method === 'aadhaar' ? (
                <div>
                  <Label htmlFor="ek-a">Aadhaar number</Label>
                  <Input id="ek-a" inputMode="numeric" autoComplete="off" placeholder="XXXX XXXX XXXX" value={fmtAadhaar(aadhaar)} onChange={(e) => { setAadhaar(e.target.value); setErr('') }} />
                  <p className="mt-1 text-[11.5px] text-slate-500">An OTP will be sent to the mobile linked with this Aadhaar. We store only the last 4 digits.</p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="ek-d">DigiLocker username / mobile / Aadhaar</Label>
                  <Input id="ek-d" autoComplete="off" placeholder="e.g. anjali.m or 10-digit mobile" value={dlId} onChange={(e) => { setDlId(e.target.value); setErr('') }} />
                  <p className="mt-1 text-[11.5px] text-slate-500">You’ll choose which DigiLocker documents to share. Shared documents go straight into your vault as verified.</p>
                </div>
              )}
              <label className="flex items-start gap-2 text-[13px] text-slate-700">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-navy-900" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErr('') }} />
                {method === 'aadhaar'
                  ? 'I consent to SANGAM Setu authenticating my identity with UIDAI using Aadhaar OTP, only to verify my identity for MoTA scholarships.'
                  : 'I agree to sign in to DigiLocker and share the documents I select with SANGAM Setu for scholarship verification.'}
              </label>
              {err && <p role="alert" className="text-xs font-medium text-red-600">{err}</p>}
              <Button className="w-full" size="lg" onClick={start} icon={method === 'aadhaar' ? <Fingerprint size={16} /> : <FolderLock size={16} />}>{method === 'aadhaar' ? 'Send Aadhaar OTP' : 'Continue to DigiLocker'}</Button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-3">
              <p className="text-[13px] text-slate-600">Enter the OTP sent to your registered mobile for {method === 'aadhaar' ? `Aadhaar ${masked}` : `DigiLocker account ${masked}`}.</p>
              <div><Label htmlFor="ek-o">One-time password</Label><Input id="ek-o" inputMode="numeric" maxLength={6} autoFocus value={otp} error={err} onChange={(e) => { setOtp(e.target.value); setErr('') }} placeholder="6 digits" /></div>
              <Button className="w-full" size="lg" onClick={verifyOtp}>Verify OTP</Button>
              <button onClick={() => { setStep('input'); setOtp('') }} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-navy-900"><ArrowLeft size={12} />Change {method === 'aadhaar' ? 'Aadhaar number' : 'DigiLocker ID'}</button>
            </div>
          )}

          {step === 'consent' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-navy-100 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-950"><FolderLock size={15} className="text-navy-700" />Share from DigiLocker with SANGAM Setu</p>
                <ul className="space-y-2">
                  {DL_DOCS.map((d) => (
                    <li key={d.key}><label className="flex items-center gap-2 text-[13px]">
                      <input type="checkbox" className="h-4 w-4 accent-navy-900" disabled={d.required} checked={docs.includes(d.key)} onChange={(e) => setDocs((x) => e.target.checked ? [...x, d.key] : x.filter((y) => y !== d.key))} />
                      <span className="flex-1">{d.label}</span>{d.required && <Badge color="gray">Required</Badge>}
                    </label></li>
                  ))}
                </ul>
                <p className="mt-3 text-[11.5px] text-slate-500">Access is valid for 30 days and can be revoked from DigiLocker at any time.</p>
              </div>
              <Button className="w-full" size="lg" onClick={fetchKyc}>Allow & fetch</Button>
            </div>
          )}

          {step === 'fetching' && (
            <div className="flex flex-col items-center gap-3 py-8 text-sm text-slate-600">
              <Loader2 className="animate-spin text-navy-700" size={28} />
              {method === 'aadhaar' ? 'Authenticating with UIDAI and fetching eKYC details…' : 'Fetching documents from DigiLocker…'}
            </div>
          )}

          {step === 'done' && result && (
            <div className="space-y-3">
              <div className="rounded-xl border border-leaf-500/30 bg-leaf-50 p-4">
                <p className="flex items-center gap-2 font-semibold text-leaf-700"><CheckCircle2 size={17} />eKYC successful · {result.method === 'aadhaar' ? 'Aadhaar' : 'DigiLocker'}</p>
                <div className="mt-3 flex gap-3">
                  <span className="grid h-14 w-12 shrink-0 place-items-center rounded-md bg-white text-slate-400 ring-1 ring-navy-100"><UserRound size={22} /></span>
                  <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-[12.5px]">
                    {[['Name', result.name], [result.method === 'aadhaar' ? 'Aadhaar' : 'DigiLocker', result.maskedId], ['Date of birth', result.dob], ['Gender', result.gender], ['Mobile', result.mobile], ['Address', result.address]].map(([k, v]) => (
                      <div key={k}><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-navy-950">{v}</dd></div>
                    ))}
                  </dl>
                </div>
                {result.method === 'digilocker' && (
                  <div className="mt-3 flex flex-wrap gap-1.5">{result.docs.map((k) => <Badge key={k} color="green"><FileCheck2 size={11} />{DL_DOCS.find((d) => d.key === k)?.label}</Badge>)}</div>
                )}
              </div>
              <p className={cx('flex items-start gap-1.5 text-[11.5px] text-slate-500')}><ShieldCheck size={13} className="mt-0.5 shrink-0" />{purpose === 'register' ? 'Your name, date of birth and gender are now verified and will be locked in your profile.' : 'Identity matched to your SANGAM Setu account.'} Prototype: no real UIDAI or DigiLocker call.</p>
              <Button className="w-full" size="lg" variant="success" onClick={() => onVerified(result)}>{actionLabel}</Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
