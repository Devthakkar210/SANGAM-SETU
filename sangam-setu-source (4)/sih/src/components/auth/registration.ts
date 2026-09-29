import { useState } from 'react'

/* ------------------------------------------------------------------ */
/* Field configuration                                                 */
/* ------------------------------------------------------------------ */

export type RegFieldType = 'text' | 'email' | 'tel' | 'password' | 'date' | 'select' | 'textarea' | 'chips' | 'checkbox'
export type RegOption = string | { value: string; label: string }
export type RegValues = Record<string, string | string[]>

export interface RegField {
  key: string
  label: string
  type?: RegFieldType
  required?: boolean
  placeholder?: string
  hint?: string
  options?: RegOption[]
  /** stretch across both columns */
  wide?: boolean
  autoComplete?: string
  maxLength?: number
  /** key of the field this one must equal (confirm password) */
  matches?: string
  /** extra rule; return an error message or '' */
  validate?: (v: string, all: RegValues) => string
  /** normalise while typing (e.g. uppercase codes) */
  transform?: (v: string) => string
}
export interface RegSection { title: string; description?: string; fields: RegField[] }

export const optValue = (o: RegOption) => (typeof o === 'string' ? o : o.value)
export const optLabel = (o: RegOption) => (typeof o === 'string' ? o : o.label)
export const str = (v: RegValues[string] | undefined) => (Array.isArray(v) ? v.join(',') : v ?? '')

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const MOBILE_RE = /^\d{10}$/

export function passwordIssues(p: string) {
  const issues: string[] = []
  if (p.length < 8) issues.push('at least 8 characters')
  if (!/[A-Za-z]/.test(p)) issues.push('a letter')
  if (!/\d/.test(p)) issues.push('a number')
  return issues
}

/** Validate one field against its config. */
export function validateRegField(f: RegField, values: RegValues): string {
  const raw = values[f.key]
  const empty = Array.isArray(raw) ? raw.length === 0 : f.type === 'checkbox' ? raw !== 'yes' : !String(raw ?? '').trim()
  if (empty) {
    if (!f.required) return ''
    if (f.type === 'chips') return `Select at least one option for ${f.label.toLowerCase()}.`
    if (f.type === 'checkbox') return 'Please tick this box to continue.'
    if (f.type === 'select') return `Select ${f.label.toLowerCase()}.`
    return `${f.label} is required.`
  }
  const v = str(raw).trim()
  if (f.type === 'email' && !EMAIL_RE.test(v)) return 'Enter a valid email address, e.g. name@example.in'
  if (f.type === 'tel' && !MOBILE_RE.test(v)) return `${f.label} must contain exactly 10 digits.`
  if (f.type === 'password' && !f.matches) {
    const issues = passwordIssues(v)
    if (issues.length) return `Password needs ${issues.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`
  }
  if (f.matches && v !== str(values[f.matches])) return 'Passwords do not match.'
  return f.validate?.(v, values) ?? ''
}

export function validateRegistration(sections: RegSection[], values: RegValues) {
  const e: Record<string, string> = {}
  sections.forEach((s) => s.fields.forEach((f) => { const m = validateRegField(f, values); if (m) e[f.key] = m }))
  return e
}

/** Form state + validation for a set of sections. Values live in the caller so they survive going back from later steps. */
export function useRegistrationForm(sections: RegSection[], initial: RegValues = {}) {
  const [values, setValues] = useState<RegValues>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fields = sections.flatMap((s) => s.fields)
  const setField = (key: string, v: string | string[]) => {
    const next = { ...values, [key]: v }
    setValues(next)
    // Clear this field's error; re-check a dependent field (confirm password) if it is already showing one
    setErrors((e) => {
      const upd = { ...e, [key]: '' }
      fields.filter((f) => f.matches === key && e[f.key]).forEach((f) => { upd[f.key] = validateRegField(f, next) })
      return upd
    })
  }
  const blurField = (key: string) => {
    const f = fields.find((x) => x.key === key)
    if (!f) return
    const v = values[key]
    if (Array.isArray(v) ? !v.length : !String(v ?? '').trim()) return // don't nag on empty fields until submit
    setErrors((e) => ({ ...e, [key]: validateRegField(f, values) }))
  }
  const validate = () => {
    const e = validateRegistration(sections, values)
    setErrors(e)
    return e
  }
  return { values, errors, setErrors, setField, blurField, validate }
}

export const maskPhone = (m: string) => (m.length >= 10 ? `+91 ${m.slice(0, 2)}XXX XX${m.slice(-3)}` : m)

/** Keep digits only; drop a pasted +91 / leading 0 so "+91 98765 43210" becomes 9876543210. */
export function normalisePhone(raw: string) {
  let d = raw.replace(/\D/g, '')
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2)
  else if (d.length > 10 && d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}
