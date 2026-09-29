import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Trash2, Save, Rocket, ListChecks, FileText, Workflow, Bell, Settings2, Sparkles, ArrowUp, ArrowDown, Check, X, Layers, Wand2, Eye, CopyPlus, Undo2, Cpu,
} from 'lucide-react'
import { useStore } from '../../store/AppStore'
import type { DocType, EligibilityRule, RuleField, RuleOp, Scheme, Stage } from '../../types'
import { STAGES } from '../../types'
import { FIELD_META, evaluateScheme, inr, ruleText, uid, type Answers } from '../../lib/rules'
import { Badge, Button, Card, Input, Label, Modal, PageHeader, Select, Tabs, Textarea, cx } from '../../components/ui'

const DOC_LABELS: Record<DocType, string> = {
  st_cert: 'ST Certificate', income_cert: 'Income Certificate', marksheet: 'Marksheet', bonafide: 'Bonafide Certificate', bank: 'Bank Passbook / Cancelled Cheque',
  research_reg: 'PhD Registration Letter', progress_report: 'Annual Progress Report', admission_letter: 'Admission Letter', passport: 'Passport',
}
const TRIGGERS = ['On submission', 'On deficiency', 'On institution verification', 'On stage change', 'On selection', 'On disbursement', 'Renewal window', '7 days before deadline']
const CHANNELS = ['In-app', 'SMS + In-app', 'Email + In-app', 'SMS + Email + In-app']
const DEMO_ANS: Answers = { category: 'ST', educationLevel: 'MPhil/PhD', income: 240000, marks: 78, destination: 'Domestic', institutionType: 'Government', researchStatus: 'Registered', studyLocation: 'Within home state', course: 'PhD, Environmental Science' }

const TEMPLATE = (): Scheme => ({
  id: 'stemgirls', code: 'ST-STEM', name: 'ST Girls in STEM Scholarship (example)', short: 'Girls in STEM',
  description: 'Example scheme configured live in the Scheme Builder to show how a new programme can run on the same platform — no code changes.',
  level: 'Undergraduate (Science / Engineering)', incomeLabel: 'Family income up to ₹4.5 lakh / year (example)',
  benefits: ['Annual tuition support (example)', 'Laptop grant in first year (example)', 'Mentoring by women scientists'],
  period: { opens: '2026-10-01', closes: '2026-12-15' },
  dates: [{ label: 'Applications open', date: '2026-10-01' }, { label: 'Last date', date: '2026-12-15' }],
  rules: [
    { id: 'r1', field: 'category', op: '=', value: 'ST' },
    { id: 'r2', field: 'educationLevel', op: 'in', value: ['Undergraduate'] },
    { id: 'r3', field: 'marks', op: '>=', value: 60 },
    { id: 'r4', field: 'income', op: '<=', value: 450000 },
  ],
  documents: [
    { key: 'st_cert', label: 'ST Certificate', mandatory: true }, { key: 'income_cert', label: 'Income Certificate', mandatory: true },
    { key: 'marksheet', label: 'Class XII Marksheet', mandatory: true }, { key: 'admission_letter', label: 'Admission Letter', mandatory: true }, { key: 'bank', label: 'Bank Passbook / Cancelled Cheque', mandatory: true },
  ],
  extraFields: [{ key: 'stream', label: 'Stream', type: 'select', options: ['Engineering', 'Pure Sciences', 'Medical / Allied'] }],
  workflow: ['Submitted', 'AI Document Check', 'Institution Verification', 'State Scrutiny', 'Selection Committee', 'Sanction', 'Disbursement'],
  notifications: [{ trigger: 'On submission', channel: 'SMS + In-app' }, { trigger: 'On selection', channel: 'SMS + Email + In-app' }],
  color: '#D9680F', renewable: true, years: 4, status: 'Draft', budgetCr: 25,
})

type Tab = 'basics' | 'rules' | 'docs' | 'flow' | 'notify'

export default function SchemeBuilder() {
  const s = useStore()
  const nav = useNavigate()
  const [selId, setSelId] = useState('nfst')
  const saved = s.schemes.find((x) => x.id === selId) ?? s.schemes[0]
  const [w, setW] = useState<Scheme>(saved)
  const [tab, setTab] = useState<Tab>('rules')
  const [preview, setPreview] = useState(false)
  useEffect(() => { setW(s.schemes.find((x) => x.id === selId) ?? s.schemes[0]) }, [selId]) // eslint-disable-line

  const dirty = JSON.stringify(w) !== JSON.stringify(saved)
  const upd = (p: Partial<Scheme>) => setW((x) => ({ ...x, ...p }))
  const setRule = (id: string, p: Partial<EligibilityRule>) => upd({ rules: w.rules.map((r) => r.id === id ? { ...r, ...p } : r) })

  const demoAns = (s.eligibilityAnswers as unknown as Answers) ?? DEMO_ANS
  const before = evaluateScheme(saved, demoAns)
  const after = evaluateScheme(w, demoAns)
  const pool = useMemo(() => s.applications.filter((a) => a.submittedOn >= '2026').map((a): Answers => ({
    category: 'ST', educationLevel: /PhD/.test(a.course) ? 'MPhil/PhD' : /Class I?X|Class X$/.test(a.course) ? 'Class 9-10' : /XII/.test(a.course) ? 'Class 11-12' : /^M/.test(a.course) ? 'Postgraduate' : 'Undergraduate',
    income: a.income, marks: a.marks, destination: a.schemeId === 'nos' ? 'Overseas' : 'Domestic', institutionType: a.schemeId === 'topclass' ? 'Notified Top Class' : a.schemeId === 'nos' ? 'Foreign University' : 'Government',
    researchStatus: /PhD/.test(a.course) ? 'Registered' : 'Not applicable', studyLocation: a.schemeId === 'nos' ? 'Abroad' : 'Within home state', course: a.course,
  })), [s.applications])
  const reach = (sc: Scheme) => pool.filter((p) => evaluateScheme(sc, p).verdict === 'match').length

  const diffSummary = () => {
    const parts: string[] = []
    const r0 = saved.rules.map(ruleText), r1 = w.rules.map(ruleText)
    r1.filter((r) => !r0.includes(r)).forEach((r) => parts.push(`+ rule "${r}"`))
    r0.filter((r) => !r1.includes(r)).forEach((r) => parts.push(`− rule "${r}"`))
    if (w.documents.length !== saved.documents.length) parts.push(`documents ${saved.documents.length}→${w.documents.length}`)
    if (w.workflow.join() !== saved.workflow.join()) parts.push(`workflow ${saved.workflow.length}→${w.workflow.length} stages`)
    if (w.notifications.length !== saved.notifications.length) parts.push(`notifications ${saved.notifications.length}→${w.notifications.length}`)
    if (w.name !== saved.name || w.description !== saved.description || w.period.closes !== saved.period.closes) parts.push('basic details')
    if (w.status === 'Draft') parts.push('status Draft → Live')
    return parts.join('; ') || 'no field changes'
  }
  const save = (publish?: boolean) => {
    const next = { ...w, status: publish ? 'Live' as const : w.status }
    const exists = s.schemes.some((x) => x.id === next.id)
    s.set((p) => ({ schemes: exists ? p.schemes.map((x) => x.id === next.id ? next : x) : [...p.schemes, next] }))
    setW(next)
    s.log(publish ? 'Scheme published' : 'Scheme configuration updated', `${next.short}: ${diffSummary()}`)
    if (publish) s.notify({ title: `New scheme live: ${next.short}`, body: `${next.name} is now open on the platform. Check your eligibility.`, channel: ['in-app', 'sms', 'email'], kind: 'info', audience: 'student' })
    s.toast(publish ? `${next.short} is live — visible in Schemes and the Eligibility Finder` : `${next.short} configuration saved. Eligibility checks use the new rules immediately.`)
  }
  const fromTemplate = () => {
    const t = TEMPLATE()
    if (!s.schemes.some((x) => x.id === t.id)) s.set((p) => ({ schemes: [...p.schemes, t] }))
    s.log('Scheme created from template', `${t.short} created as Draft`)
    setSelId(t.id); setTab('rules')
    s.toast('New scheme created from template — review and publish', 'info')
  }
  const addRule = () => upd({ rules: [...w.rules, { id: uid('r'), field: 'marks', op: '>=', value: 60 }] })
  const presetRule = (field: RuleField) => {
    if (field === 'income') { const ir = w.rules.find((r) => r.field === 'income'); if (ir) setRule(ir.id, { value: 200000 }); else upd({ rules: [...w.rules, { id: uid('r'), field: 'income', op: '<=', value: 200000 }] }) }
    else if (!w.rules.some((r) => r.field === 'marks')) upd({ rules: [...w.rules, { id: uid('r'), field: 'marks', op: '>=', value: 55 }] })
    setTab('rules')
  }

  const tabs: { id: Tab; label: ReactNode }[] = [
    { id: 'basics', label: <span className="flex items-center gap-1.5"><Settings2 size={13} />Basics</span> },
    { id: 'rules', label: <span className="flex items-center gap-1.5"><ListChecks size={13} />Eligibility ({w.rules.length})</span> },
    { id: 'docs', label: <span className="flex items-center gap-1.5"><FileText size={13} />Documents ({w.documents.length})</span> },
    { id: 'flow', label: <span className="flex items-center gap-1.5"><Workflow size={13} />Workflow ({w.workflow.length})</span> },
    { id: 'notify', label: <span className="flex items-center gap-1.5"><Bell size={13} />Notifications ({w.notifications.length})</span> },
  ]

  return (
    <div>
      <PageHeader title="No-code Scheme Builder" sub="Configure eligibility rules, document checklists, workflow stages and notifications. Forms, AI checks and dashboards adapt automatically — no code release needed."
        actions={<Button variant="saffron" icon={<CopyPlus size={16} />} onClick={fromTemplate}>New scheme from template</Button>} />

      {/* Same platform visual */}
      <Card className="mb-5 overflow-hidden p-5">
        <div className="mb-3 flex items-center gap-2"><Layers size={16} className="text-navy-700" /><h2 className="font-display text-base font-bold text-navy-950">{s.schemes.length} schemes · one engine</h2></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {s.schemes.map((x) => (
            <motion.button layout key={x.id} onClick={() => setSelId(x.id)}
              className={cx('rounded-xl border-2 p-3 text-left transition', x.id === selId ? 'border-navy-900 bg-navy-50' : 'border-transparent bg-paper hover:border-navy-100')}>
              <div className="mb-2 h-1.5 w-8 rounded-full" style={{ background: x.color }} />
              <p className="truncate text-[13px] font-bold text-navy-950">{x.short}</p>
              <p className="mt-1 text-[11px] text-slate-500">{x.rules.length} rules · {x.documents.length} docs · {x.workflow.length} stages</p>
              <Badge color={x.status === 'Live' ? 'green' : 'violet'} className="mt-2">{x.status}</Badge>
            </motion.button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-navy-950 p-3 text-[11.5px] font-semibold text-white/90 sm:grid-cols-6">
          {['Verified profile', 'Rules engine', 'AI document check', 'Workflow engine', 'Notifications', 'Audit & analytics'].map((e) => <span key={e} className="flex items-center gap-1.5"><Cpu size={12} className="text-saffron-400" />{e}</span>)}
        </div>
        <p className="mt-2 text-center text-[11.5px] text-slate-500">Shared platform services — every scheme above reuses them</p>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: w.color }} /><h2 className="font-display text-lg font-bold text-navy-950">{w.name}</h2>{dirty && <Badge color="amber">Unsaved changes</Badge>}</div>
            <div className="flex gap-2">
              {dirty && <Button size="sm" variant="ghost" icon={<Undo2 size={14} />} onClick={() => setW(saved)}>Discard</Button>}
              <Button size="sm" variant="outline" icon={<Eye size={14} />} onClick={() => setPreview(true)}>Preview form</Button>
              <Button size="sm" disabled={!dirty} icon={<Save size={14} />} onClick={() => save()}>Save</Button>
              {w.status === 'Draft' && <Button size="sm" variant="success" icon={<Rocket size={14} />} onClick={() => save(true)}>Publish</Button>}
            </div>
          </div>
          <Tabs value={tab} onChange={setTab} tabs={tabs} />

          <div className="mt-5">
            {tab === 'basics' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label htmlFor="sn">Scheme Name</Label><Input id="sn" value={w.name} onChange={(e) => upd({ name: e.target.value })} /></div>
                <div><Label htmlFor="ss">Short name</Label><Input id="ss" value={w.short} onChange={(e) => upd({ short: e.target.value })} /></div>
                <div><Label htmlFor="sl">Education level (display)</Label><Input id="sl" value={w.level} onChange={(e) => upd({ level: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label htmlFor="sd">Description</Label><Textarea id="sd" rows={3} value={w.description} onChange={(e) => upd({ description: e.target.value })} /></div>
                <div><Label htmlFor="po">Application opens</Label><Input id="po" type="date" value={w.period.opens} onChange={(e) => upd({ period: { ...w.period, opens: e.target.value } })} /></div>
                <div><Label htmlFor="pc">Application closes</Label><Input id="pc" type="date" value={w.period.closes} onChange={(e) => upd({ period: { ...w.period, closes: e.target.value } })} /></div>
                <div><Label htmlFor="bc">Budget (₹ crore, example)</Label><Input id="bc" type="number" value={w.budgetCr} onChange={(e) => upd({ budgetCr: Number(e.target.value) })} /></div>
                <div><Label htmlFor="rn">Renewable</Label><Select id="rn" options={['Yes', 'No']} value={w.renewable ? 'Yes' : 'No'} onChange={(e) => upd({ renewable: e.target.value === 'Yes' })} /></div>
              </div>
            )}

            {tab === 'rules' && (
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2 text-[12.5px]"><Wand2 size={14} className="text-violet-600" /><span className="font-semibold text-navy-900">Try a change:</span>
                  <button onClick={() => presetRule('income')} className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-800 hover:bg-violet-100">Set income limit to ₹2,00,000</button>
                  <button onClick={() => presetRule('marks')} className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-800 hover:bg-violet-100">+ Marks ≥ 55%</button>
                </div>
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {w.rules.map((r, i) => {
                      const m = FIELD_META[r.field]
                      const ops: RuleOp[] = m.kind === 'number' ? ['<=', '>='] : ['=', '!=', 'in']
                      return (
                        <motion.li key={r.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-wrap items-center gap-2 rounded-xl border border-navy-100 bg-paper p-3">
                          <span className="w-10 text-xs font-bold text-slate-500">{i === 0 ? 'IF' : 'AND'}</span>
                          <Select aria-label="Field" className="!w-48" options={Object.values(FIELD_META).map((f) => f.label)} value={m.label} onChange={(e) => {
                            const field = (Object.keys(FIELD_META) as RuleField[]).find((k) => FIELD_META[k].label === e.target.value)!
                            const fm = FIELD_META[field]
                            setRule(r.id, { field, op: fm.kind === 'number' ? '<=' : '=', value: fm.kind === 'number' ? (field === 'income' ? 250000 : 60) : fm.options![0] })
                          }} />
                          <Select aria-label="Operator" className="!w-24" options={ops} value={r.op} onChange={(e) => {
                            const op = e.target.value as RuleOp
                            setRule(r.id, { op, value: op === 'in' ? (Array.isArray(r.value) ? r.value : [String(r.value)]) : Array.isArray(r.value) ? r.value[0] : r.value })
                          }} />
                          {m.kind === 'number' ? (
                            <div className="relative w-40"><span className="absolute left-3 top-2.5 text-sm text-slate-400">{m.unit === '₹' ? '₹' : ''}</span><Input aria-label="Value" type="number" className={m.unit === '₹' ? 'pl-7' : ''} value={Number(r.value)} onChange={(e) => setRule(r.id, { value: Number(e.target.value) })} /></div>
                          ) : r.op === 'in' ? (
                            <div className="flex flex-wrap gap-1">{m.options!.map((o) => {
                              const on = (r.value as string[]).includes(o)
                              return <button key={o} onClick={() => setRule(r.id, { value: on ? (r.value as string[]).filter((x) => x !== o) : [...(r.value as string[]), o] })} className={cx('rounded-full px-2.5 py-1 text-xs font-semibold ring-1', on ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white text-slate-600 ring-navy-100')}>{o}</button>
                            })}</div>
                          ) : (
                            <Select aria-label="Value" className="!w-48" options={m.options!} value={String(r.value)} onChange={(e) => setRule(r.id, { value: e.target.value })} />
                          )}
                          <button onClick={() => upd({ rules: w.rules.filter((x) => x.id !== r.id) })} aria-label="Remove rule" className="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ul>
                <Button variant="soft" className="mt-3" icon={<Plus size={15} />} onClick={addRule}>Eligibility Rule</Button>
                <div className="mt-5 rounded-xl bg-navy-950 p-4 font-mono text-[12.5px] leading-6 text-white/90">
                  {w.rules.map((r, i) => <div key={r.id}><span className="text-saffron-400">{i === 0 ? 'IF ' : 'AND '}</span>{ruleText(r)}</div>)}
                  <div><span className="text-leaf-500">THEN </span>eligible for <span className="text-saffron-400">{w.short}</span></div>
                </div>
              </div>
            )}

            {tab === 'docs' && (
              <div>
                <ul className="space-y-2">{w.documents.map((d) => (
                  <li key={d.key} className="flex flex-wrap items-center gap-3 rounded-xl border border-navy-100 p-3">
                    <FileText size={16} className="text-navy-700" />
                    <Input aria-label="Document label" className="max-w-xs" value={d.label} onChange={(e) => upd({ documents: w.documents.map((x) => x.key === d.key ? { ...x, label: e.target.value } : x) })} />
                    <Badge color="violet"><Sparkles size={11} />AI classifier: {DOC_LABELS[d.key]}</Badge>
                    <label className="ml-auto flex items-center gap-1.5 text-[13px]"><input type="checkbox" className="accent-navy-900" checked={d.mandatory} onChange={(e) => upd({ documents: w.documents.map((x) => x.key === d.key ? { ...x, mandatory: e.target.checked } : x) })} />Mandatory</label>
                    <button aria-label="Remove document" onClick={() => upd({ documents: w.documents.filter((x) => x.key !== d.key) })} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                  </li>
                ))}</ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(Object.keys(DOC_LABELS) as DocType[]).filter((k) => !w.documents.some((d) => d.key === k)).map((k) => (
                    <Button key={k} size="sm" variant="soft" icon={<Plus size={14} />} onClick={() => upd({ documents: [...w.documents, { key: k, label: DOC_LABELS[k], mandatory: true }] })}>{DOC_LABELS[k]}</Button>
                  ))}
                </div>
                <p className="mt-3 text-[12px] text-slate-500">The student's checklist and the AI extraction templates are generated from this list.</p>
              </div>
            )}

            {tab === 'flow' && (
              <div>
                <ol className="space-y-2">{w.workflow.map((st, i) => (
                  <li key={st} className="flex items-center gap-3 rounded-xl border border-navy-100 p-3">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">{i + 1}</span>
                    <span className="flex-1 font-semibold text-navy-950">{st}</span>
                    {st === 'AI Document Check' && <Badge color="violet">Advisory only</Badge>}
                    <button aria-label="Move up" disabled={i === 0} onClick={() => { const n = [...w.workflow]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; upd({ workflow: n }) }} className="rounded p-1 text-slate-500 hover:bg-navy-50 disabled:opacity-30"><ArrowUp size={15} /></button>
                    <button aria-label="Move down" disabled={i === w.workflow.length - 1} onClick={() => { const n = [...w.workflow]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; upd({ workflow: n }) }} className="rounded p-1 text-slate-500 hover:bg-navy-50 disabled:opacity-30"><ArrowDown size={15} /></button>
                    <button aria-label="Remove stage" disabled={st === 'Submitted'} onClick={() => upd({ workflow: w.workflow.filter((x) => x !== st) })} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={15} /></button>
                  </li>
                ))}</ol>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STAGES.filter((x) => !w.workflow.includes(x)).map((st) => <Button key={st} size="sm" variant="soft" icon={<Plus size={14} />} onClick={() => upd({ workflow: STAGES.filter((x) => w.workflow.includes(x) || x === st) as Stage[] })}>Workflow Stage: {st}</Button>)}
                  {STAGES.every((x) => w.workflow.includes(x)) && <p className="text-[12.5px] text-slate-500">All standard stages are in use. Custom stages (e.g. “Field visit”) would be added here in production.</p>}
                </div>
              </div>
            )}

            {tab === 'notify' && (
              <div>
                <ul className="space-y-2">{w.notifications.map((n, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-navy-100 p-3">
                    <Bell size={15} className="text-saffron-600" /><span className="text-xs font-bold text-slate-500">WHEN</span>
                    <Select aria-label="Trigger" className="!w-56" options={TRIGGERS} value={n.trigger} onChange={(e) => upd({ notifications: w.notifications.map((x, j) => j === i ? { ...x, trigger: e.target.value } : x) })} />
                    <span className="text-xs font-bold text-slate-500">SEND</span>
                    <Select aria-label="Channel" className="!w-52" options={CHANNELS} value={n.channel} onChange={(e) => upd({ notifications: w.notifications.map((x, j) => j === i ? { ...x, channel: e.target.value } : x) })} />
                    <button aria-label="Remove notification" onClick={() => upd({ notifications: w.notifications.filter((_, j) => j !== i) })} className="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                  </li>
                ))}</ul>
                <Button variant="soft" className="mt-3" icon={<Plus size={15} />} onClick={() => upd({ notifications: [...w.notifications, { trigger: '7 days before deadline', channel: 'SMS + In-app' }] })}>Notification</Button>
                <p className="mt-3 text-[12px] text-slate-500">SMS and e-mail delivery is simulated in this prototype.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Impact panel */}
        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card className="p-5">
            <h3 className="mb-1 flex items-center gap-2 font-display text-base font-bold text-navy-950"><Sparkles size={15} className="text-violet-600" />Live impact</h3>
            <p className="mb-4 text-[12.5px] text-slate-500">Rules are evaluated as you edit — before you save.</p>
            <div className="rounded-xl border border-navy-100 p-3">
              <p className="text-[12px] font-semibold text-slate-500">Demo student (Anjali · PhD · {inr(demoAns.income)})</p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <VerdictPill v={before.verdict} /><span className="text-slate-400">→</span><VerdictPill v={after.verdict} />
              </div>
              <ul className="mt-2 space-y-1">{after.results.filter((r) => !r.pass).map((r) => <li key={r.rule.id} className="flex gap-1.5 text-[12px] text-red-700"><X size={13} className="mt-0.5 shrink-0" />{r.reason}</li>)}
                {after.results.every((r) => r.pass) && <li className="flex gap-1.5 text-[12px] text-leaf-700"><Check size={13} className="mt-0.5" />Meets all {after.results.length} rules</li>}</ul>
            </div>
            <div className="mt-3 rounded-xl border border-navy-100 p-3">
              <p className="text-[12px] font-semibold text-slate-500">Applicants in this cycle who would qualify</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-navy-950">{reach(saved)} <span className="text-base text-slate-400">→</span> <span className={reach(w) < reach(saved) ? 'text-red-600' : reach(w) > reach(saved) ? 'text-leaf-600' : ''}>{reach(w)}</span></p>
              <p className="text-[11.5px] text-slate-500">of {pool.length} sample records</p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="outline" onClick={() => nav('/eligibility')}>Open Eligibility Finder</Button>
              <Button variant="outline" onClick={() => nav('/schemes')}>View public scheme catalogue</Button>
            </div>
          </Card>
          <Card className="p-4 text-[12.5px] text-slate-600">
            <p className="mb-1 font-semibold text-navy-900">Governance</p>
            Every save writes a versioned entry to the audit log. In production, changes to a Live scheme would need a second approver before taking effect.
          </Card>
        </div>
      </div>

      <Modal open={preview} onClose={() => setPreview(false)} title={`Form preview — ${w.short}`} wide>
        <p className="mb-4 text-sm text-slate-600">This is what applicants would see, generated from the configuration. Verified profile fields are pre-filled; only scheme-specific fields are asked.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-navy-100 p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Scheme-specific fields</p>
            {w.extraFields.length === 0 ? <p className="text-sm text-slate-500">None — the verified profile covers everything.</p> : w.extraFields.map((f) => (
              <div key={f.key} className="mb-3"><Label>{f.label}</Label>{f.type === 'select' ? <Select options={f.options ?? []} /> : <Input type={f.type === 'date' ? 'date' : 'text'} placeholder={f.placeholder} />}</div>
            ))}
          </div>
          <div className="rounded-xl border border-navy-100 p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Document checklist</p>
            <ul className="space-y-1.5">{w.documents.map((d) => <li key={d.key} className="flex items-center justify-between text-[13px]"><span>{d.label}</span><Badge color={d.mandatory ? 'red' : 'gray'}>{d.mandatory ? 'Required' : 'Optional'}</Badge></li>)}</ul>
            <p className="mb-2 mt-4 text-xs font-semibold uppercase text-slate-500">Tracker stages</p>
            <div className="flex flex-wrap gap-1">{w.workflow.map((st, i) => <Badge key={st} color="navy">{i + 1}. {st}</Badge>)}</div>
          </div>
        </div>
        {w.status === 'Live' && <div className="mt-4 flex justify-end"><Button variant="saffron" onClick={() => { setPreview(false); s.set(() => ({ role: 'student' })); nav(`/student/apply/${w.id}`) }}>Open as student</Button></div>}
      </Modal>
    </div>
  )
}

function VerdictPill({ v }: { v: 'match' | 'near' | 'no' }) {
  return <Badge color={v === 'match' ? 'green' : v === 'near' ? 'amber' : 'red'}>{v === 'match' ? 'Eligible' : v === 'near' ? 'Near miss' : 'Not eligible'}</Badge>
}
