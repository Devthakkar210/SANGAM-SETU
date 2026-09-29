import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff, Loader2, AlertTriangle, MailCheck } from 'lucide-react'
import { Button, Card, Input, Label, cx } from '../ui'
import { maskPhone, normalisePhone, optLabel, optValue, str, type RegField, type RegOption, type RegSection, type RegValues } from './registration'

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export function FieldLabel({ htmlFor, children, required }: { htmlFor?: string; children: ReactNode; required?: boolean }) {
  return (
    <Label htmlFor={htmlFor}>
      {children}{required && <span className="ml-0.5 text-red-600" aria-hidden>*</span>}
      {required && <span className="sr-only"> (required)</span>}
    </Label>
  )
}

export function PasswordInput({ id, value, onChange, onBlur, error, placeholder, autoComplete }: { id: string; value: string; onChange: (v: string) => void; onBlur?: () => void; error?: string; placeholder?: string; autoComplete?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} value={value} placeholder={placeholder} autoComplete={autoComplete} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
          className={cx('h-10 w-full rounded-lg border bg-white pl-3 pr-11 text-sm text-ink outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15', error ? 'border-red-400' : 'border-navy-100')} />
        <button type="button" onClick={() => setShow((x) => !x)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} aria-controls={id}
          className="absolute right-1 top-1 grid h-8 w-9 place-items-center rounded-md text-slate-500 hover:bg-navy-50 hover:text-navy-900">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return <p className="mt-1 text-[11.5px] text-slate-500">At least 8 characters, with a letter and a number.</p>
  const score = [value.length >= 8, /[A-Za-z]/.test(value) && /\d/.test(value), /[^A-Za-z0-9]/.test(value) || value.length >= 12, /[a-z]/.test(value) && /[A-Z]/.test(value)].filter(Boolean).length
  const label = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score]
  const color = score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-saffron-500' : 'bg-leaf-500'
  return (
    <div className="mt-1.5 flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={cx('h-1 flex-1 rounded-full', i < score ? color : 'bg-navy-50')} />)}</div>
      <span className="w-16 text-right text-[11px] font-semibold text-slate-500">{label}</span>
    </div>
  )
}

export function ChipSelect({ id, options, value, onChange, error, label }: { id: string; options: RegOption[]; value: string[]; onChange: (v: string[]) => void; error?: string; label: string }) {
  return (
    <div>
      <div id={id} role="group" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const v = optValue(o)
          const on = value.includes(v)
          return (
            <button type="button" key={v} aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== v) : [...value, v])}
              className={cx('inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition', on ? 'border-navy-900 bg-navy-50 text-navy-950' : error ? 'border-red-300 bg-white text-slate-600' : 'border-navy-100 bg-white text-slate-600 hover:border-navy-600/30')}>
              {on && <Check size={13} />}{optLabel(o)}
            </button>
          )
        })}
      </div>
      {error && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

/** Renders a single configured field. */
export function RegFieldInput({ f, value, error, onChange, onBlur, idPrefix = 'reg' }: { f: RegField; value: RegValues[string] | undefined; error?: string; onChange: (v: string | string[]) => void; onBlur?: () => void; idPrefix?: string }) {
  const id = `${idPrefix}-${f.key}`
  const v = str(value)
  const hint = !error && f.hint ? <p className="mt-1 text-[11.5px] text-slate-500">{f.hint}</p> : null
  const errEl = error ? <p role="alert" className="mt-1 text-xs font-medium text-red-600">{error}</p> : null
  const field = (() => {
    switch (f.type) {
      case 'password':
        return <><PasswordInput id={id} value={v} onChange={onChange} onBlur={onBlur} error={error} placeholder={f.placeholder} autoComplete={f.autoComplete ?? (f.matches ? 'new-password' : 'new-password')} />{!f.matches && !error && <PasswordStrength value={v} />}</>
      case 'select':
        return <>
          <select id={id} value={v} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} aria-invalid={!!error}
            className={cx('h-10 w-full rounded-lg border bg-white px-3 text-sm text-ink outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15', error ? 'border-red-400' : 'border-navy-100', !v && 'text-slate-400')}>
            <option value="">{f.placeholder ?? 'Select'}</option>
            {f.options?.map((o) => <option key={optValue(o)} value={optValue(o)} className="text-ink">{optLabel(o)}</option>)}
          </select>{errEl}{hint}</>
      case 'textarea':
        return <>
          <textarea id={id} rows={3} value={v} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} aria-invalid={!!error}
            className={cx('w-full rounded-lg border bg-white p-3 text-sm outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15', error ? 'border-red-400' : 'border-navy-100')} />{errEl}{hint}</>
      case 'chips':
        return <><ChipSelect id={id} label={f.label} options={f.options ?? []} value={Array.isArray(value) ? value : []} onChange={onChange} error={error} />{hint}</>
      case 'tel':
        return <><Input id={id} type="tel" inputMode="numeric" autoComplete={f.autoComplete ?? 'tel-national'} placeholder={f.placeholder} value={v} error={error} onBlur={onBlur}
          onChange={(e) => onChange(normalisePhone(e.target.value))} />{hint}</>
      default:
        return <><Input id={id} type={f.type ?? 'text'} autoComplete={f.autoComplete} maxLength={f.maxLength} placeholder={f.placeholder} value={v} error={error} onBlur={onBlur}
          onChange={(e) => onChange(f.transform ? f.transform(e.target.value) : e.target.value)} />{hint}</>
    }
  })()
  if (f.type === 'checkbox') {
    return (
      <div className={cx(f.wide && 'sm:col-span-2')}>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-navy-900" checked={v === 'yes'} onChange={(e) => onChange(e.target.checked ? 'yes' : '')} aria-invalid={!!error} />
          <span>{f.label}{f.required && <span className="ml-0.5 text-red-600" aria-hidden>*</span>}</span>
        </label>
        {errEl}
      </div>
    )
  }
  return (
    <div className={cx('min-w-0', f.wide && 'sm:col-span-2')}>
      <FieldLabel htmlFor={f.type === 'chips' ? undefined : id} required={f.required}>{f.label}</FieldLabel>
      {field}
    </div>
  )
}

/** Renders configured sections as a responsive two-column form. */
export function RegistrationFields({ sections, values, errors, onChange, onBlur }: { sections: RegSection[]; values: RegValues; errors: Record<string, string>; onChange: (k: string, v: string | string[]) => void; onBlur?: (k: string) => void }) {
  return (
    <div className="space-y-6">
      {sections.map((sec, i) => (
        <div key={sec.title} className={cx(i > 0 && 'border-t border-navy-50 pt-6')}>
          <fieldset>
            <legend className="font-display text-base font-bold text-navy-950">{sec.title}</legend>
            {sec.description && <p className="mt-0.5 text-[13px] text-slate-500">{sec.description}</p>}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {sec.fields.map((f) => <RegFieldInput key={f.key} f={f} value={values[f.key]} error={errors[f.key]} onChange={(v) => onChange(f.key, v)} onBlur={() => onBlur?.(f.key)} />)}
            </div>
          </fieldset>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Flow chrome                                                         */
/* ------------------------------------------------------------------ */

export function BackButton({ onClick, children = 'Back to account types' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2 text-sm font-semibold text-navy-700 hover:bg-navy-50 hover:text-navy-950">
      <ArrowLeft size={16} />{children}
    </button>
  )
}

/** The steps of a registration flow; the current step is highlighted and earlier ones ticked. */
export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="Registration progress">
      {steps.map((st, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={st} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold', done ? 'bg-leaf-500 text-white' : active ? 'bg-saffron-500 text-navy-950' : 'bg-navy-100 text-navy-800')}>{done ? <Check size={12} /> : i + 1}</span>
            <span className={cx('text-[13px]', active ? 'font-semibold text-navy-950' : 'text-slate-500', !active && 'hidden sm:inline')}>{st}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-5 bg-navy-100 sm:w-8" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}

const maskEmail = (e: string) => e.replace(/^(.)(.*)(.@.*)$/, (_, a: string, b: string, c: string) => a + '•'.repeat(Math.min(b.length, 6)) + c)

/**
 * Email/OTP verification step. Prototype: any 6 digits are accepted.
 */
export function OtpVerification({ email, mobile, onVerified, onBack, onResend }: { email: string; mobile?: string; onVerified: () => void; onBack: () => void; onResend?: () => void }) {
  const [otp, setOtp] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(30)
  const timer = useRef<number>(0)
  useEffect(() => {
    if (wait <= 0) return
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(t)
  }, [wait])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const verify = () => {
    if (!/^\d{6}$/.test(otp)) { setErr('Enter the 6-digit code. In this prototype any 6 digits work.'); return }
    setBusy(true)
    timer.current = window.setTimeout(() => { setBusy(false); onVerified() }, 800)
  }
  return (
    <div className="mx-auto max-w-md">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-saffron-50 text-saffron-700"><MailCheck size={22} /></div>
      <h2 className="mt-4 font-display text-xl font-bold text-navy-950">Verify your email</h2>
      <p className="mt-1 text-sm text-slate-600">We sent a 6-digit code to <b className="text-navy-950">{maskEmail(email)}</b>{mobile && <> and by SMS to <b className="text-navy-950">{maskPhone(mobile)}</b></>}. It expires in 10 minutes.</p>
      <form className="mt-5" onSubmit={(e) => { e.preventDefault(); verify() }}>
        <FieldLabel htmlFor="reg-otp" required>Verification code</FieldLabel>
        <Input id="reg-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} error={err} placeholder="6 digits" autoFocus
          className="tracking-[0.3em] tabular-nums" onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }} />
        <p className="mt-1 text-[11.5px] text-slate-500">Prototype: no email or SMS is sent — enter any 6 digits.</p>
        <Button type="submit" className="mt-5 w-full" size="lg" disabled={busy} icon={busy ? <Loader2 size={16} className="animate-spin" /> : undefined}>{busy ? 'Verifying…' : 'Verify & continue'}</Button>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <BackButton onClick={onBack}>Edit details</BackButton>
        <button type="button" disabled={wait > 0} onClick={() => { setWait(30); setOtp(''); setErr(''); onResend?.() }} className="font-semibold text-saffron-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline">
          {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
        </button>
      </div>
    </div>
  )
}

export interface CheckItem { label: string; detail?: string; warn?: string }

/** Runs a list of checks one after another (institute verification, role assignment) and then enables Continue. */
export function ProcessChecklist({ icon, title, sub, items, doneTitle, continueLabel, onDone, stepMs = 650 }: { icon: ReactNode; title: string; sub: ReactNode; items: CheckItem[]; doneTitle: string; continueLabel: string; onDone: () => void; stepMs?: number }) {
  const [n, setN] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (n >= items.length) return
    const t = window.setTimeout(() => setN((x) => x + 1), stepMs)
    return () => window.clearTimeout(t)
  }, [n, items.length, stepMs])
  const finished = n >= items.length
  return (
    <div className="mx-auto max-w-lg">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-navy-900 text-white">{icon}</div>
      <h2 className="mt-4 font-display text-xl font-bold text-navy-950">{finished ? doneTitle : title}</h2>
      <p className="mt-1 text-sm text-slate-600">{sub}</p>
      <ul className="mt-5 space-y-2" aria-live="polite">
        {items.map((it, i) => {
          const state = i < n ? (it.warn ? 'warn' : 'ok') : i === n ? 'run' : 'wait'
          return (
            <li key={it.label} className={cx('flex items-start gap-3 rounded-xl border px-4 py-3', state === 'warn' ? 'border-saffron-400 bg-saffron-50/60' : state === 'ok' ? 'border-leaf-500/25 bg-leaf-50/50' : 'border-navy-100 bg-white')}>
              <span className="mt-0.5 shrink-0">
                {state === 'ok' ? <CheckCircle2 size={18} className="text-leaf-600" /> : state === 'warn' ? <AlertTriangle size={18} className="text-saffron-600" /> : state === 'run' ? <Loader2 size={18} className="animate-spin text-navy-700" /> : <span className="block h-[18px] w-[18px] rounded-full border-2 border-navy-100" />}
              </span>
              <div className="min-w-0 text-sm">
                <p className={cx('font-semibold', state === 'wait' ? 'text-slate-400' : 'text-navy-950')}>{it.label}</p>
                {state !== 'wait' && state !== 'run' && (it.warn || it.detail) && <p className="text-[12.5px] text-slate-600">{it.warn ?? it.detail}</p>}
              </div>
            </li>
          )
        })}
      </ul>
      <Button className="mt-6 w-full" size="lg" disabled={!finished || busy} onClick={() => { setBusy(true); onDone() }} icon={!finished || busy ? <Loader2 size={16} className="animate-spin" /> : undefined}>
        {finished ? continueLabel : 'Checking…'}
      </Button>
    </div>
  )
}

/** Shown once the account is saved. Continues to the dashboard automatically after a few seconds. */
export function SuccessPanel({ title, body, details, ctaLabel, onContinue, seconds = 5 }: { title: string; body: ReactNode; details?: [string, string][]; ctaLabel: string; onContinue: () => void; seconds?: number }) {
  const [left, setLeft] = useState(seconds)
  const go = useRef(onContinue)
  useEffect(() => { go.current = onContinue }, [onContinue])
  useEffect(() => {
    if (left <= 0) { go.current(); return }
    const t = window.setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => window.clearTimeout(t)
  }, [left])
  return (
    <div className="mx-auto max-w-md text-center" role="status">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14, stiffness: 220 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-leaf-100 text-leaf-700">
        <CheckCircle2 size={32} />
      </motion.div>
      <h2 className="mt-4 font-display text-2xl font-bold text-navy-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
      {details && (
        <Card className="mt-5 p-4 text-left shadow-none">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {details.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-xs text-slate-500">{k}</dt><dd className="break-words font-semibold text-navy-950">{v}</dd></div>)}
          </dl>
        </Card>
      )}
      <Button className="mt-6 w-full" size="lg" onClick={onContinue}>{ctaLabel}</Button>
      <p className="mt-2 text-xs text-slate-500">Taking you there in {Math.max(left, 0)}s…</p>
    </div>
  )
}
