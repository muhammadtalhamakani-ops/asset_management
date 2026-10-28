import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import * as yup from 'yup'
import { assetAPI, supplierAPI } from './api/client'
import type { AssetRecord } from './assetTypes'
import { SearchSelect } from './SearchSelect'
import './ReceiveAssetForm.css'

type Supplier = { _id: string; code: string; companyName: string; isActive: boolean }
type Project = { _id: string; name: string; isActive: boolean }
type Draft = { assetId: string; assetCode: string; supplierId: string; quantity: number; grn: string; billNo: string; remarks: string; recordedBy: string }
type Fields = { assetId: string; supplierId: string; quantity: string; grn: string; billNo: string; remarks: string }

export function ReceiveAssetForm({ close, save, recordedBy }: { close: () => void; save: (draft: Draft) => Promise<string | undefined>; recordedBy: string }) {
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [fields, setFields] = useState<Fields>(() => ({ assetId: '', supplierId: '', quantity: '', grn: `GRN-${Date.now().toString().slice(-6)}`, billNo: '', remarks: '' }))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [retry, setRetry] = useState(0)
  const busy = useRef(false)
  const touched = useRef(new Set<string>())
  const form = useRef<HTMLFormElement>(null)
  const mounted = useRef(false)
  const selected = assets.find((asset) => asset._id === fields.assetId)
  const project = projects.find((row) => row._id === selected?.project_id)
  const projectMessage = selected && !project ? 'Asset Project is unavailable. Correct it in Asset Register before receiving.' : ''
  const required = () => yup.string().trim().required('Required')
  const schema = yup.object({
    assetId: required().oneOf(['', ...assets.map((row) => row._id!)], 'Select an active Asset'),
    supplierId: required().oneOf(['', ...suppliers.map((row) => row._id)], 'Select an active Supplier'),
    project_id: required().oneOf(['', ...projects.map((row) => row._id)], 'Asset Project is unavailable'),
    quantity: yup.number().transform((value, original) => original === '' ? undefined : value).typeError('Enter a valid number').required('Required').moreThan(0, 'Must be greater than zero').test('finite', 'Enter a finite number', Number.isFinite),
    grn: required(), billNo: required(), remarks: yup.string(),
  })
  function values(next = fields) {
    const asset = assets.find((row) => row._id === next.assetId)
    return { ...next, project_id: projects.find((row) => row._id === asset?.project_id)?._id || '' }
  }
  function validate(name: string, next = fields) {
    let message = ''
    try { schema.validateSyncAt(name, values(next)) }
    catch (failure) { if (failure instanceof yup.ValidationError) message = failure.message }
    setErrors((current) => ({ ...current, [name]: message }))
  }
  function change(name: keyof Fields, value: string) {
    const next = { ...fields, [name]: value }
    if (name === 'assetId') {
      const supplierId = assets.find((row) => row._id === value)?.supplierId || ''
      next.supplierId = suppliers.some((row) => row._id === supplierId) ? supplierId : ''
      setErrors((current) => ({ ...current, supplierId: '', project_id: '' }))
      touched.current.delete('supplierId')
    }
    setFields(next)
    if (touched.current.has(name) || ((name === 'assetId' || name === 'supplierId') && !value)) {
      touched.current.add(name)
      validate(name, next)
    }
  }
  useEffect(() => {
    mounted.current = true
    let cancelled = false
    setLoading(true)
    setLoadError('')
    Promise.all([assetAPI.getAll(), supplierAPI.getAll(), assetAPI.getProjects()]).then(([assetResponse, supplierResponse, projectResponse]) => {
      if (cancelled) return
      if (!assetResponse.success || !supplierResponse.success || !projectResponse.success || !Array.isArray(assetResponse.data) || !Array.isArray(supplierResponse.data) || !Array.isArray(projectResponse.data)) throw new Error('Unable to load assets, suppliers or projects.')
      setAssets(assetResponse.data)
      setSuppliers(supplierResponse.data)
      setProjects(projectResponse.data)
    }).catch((failure) => { if (!cancelled) setLoadError(failure instanceof Error ? failure.message : 'Unable to load receiving options.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; mounted.current = false }
  }, [retry])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current || loading || loadError) return
    setError('')
    try { schema.validateSync(values(), { abortEarly: false }); setErrors({}) }
    catch (failure) {
      if (failure instanceof yup.ValidationError) {
        const next: Record<string, string> = {}
        for (const issue of failure.inner) if (issue.path) { next[issue.path] ||= issue.message; touched.current.add(issue.path) }
        setErrors(next)
        const input = form.current?.elements.namedItem(Object.keys(next)[0])
        if (input instanceof HTMLElement) input.focus()
      }
      return
    }
    if (!selected?._id || !project) return
    busy.current = true; setSaving(true)
    try {
      const message = await save({ assetId: selected._id, assetCode: selected.code, supplierId: fields.supplierId, quantity: Number(fields.quantity), grn: fields.grn.trim(), billNo: fields.billNo.trim(), remarks: fields.remarks.trim(), recordedBy })
      if (message && mounted.current) setError(message)
    } catch { if (mounted.current) setError('Unable to record receiving. Please try again.') }
    finally { busy.current = false; if (mounted.current) setSaving(false) }
  }
  const props = (name: string) => ({ 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `receive-error-${name}` : undefined })
  const fieldError = (name: string) => errors[name] ? <span className="receive-field-error" id={`receive-error-${name}`}>{errors[name]}</span> : null
  return <div className="portal-modal-backdrop"><form ref={form} noValidate role="dialog" aria-modal="true" aria-labelledby="receive-form-title" className="portal-modal receive-assets-modal" onSubmit={submit} onBlurCapture={(event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) {
      const name = event.target.name
      if (name && name in schema.fields) { touched.current.add(name); validate(name, { ...fields, [name]: event.target.value }) }
    }
  }}><div><span><p>ASSET MANAGEMENT</p><h2 id="receive-form-title">Receive assets</h2></span><button className="icon-button" type="button" disabled={saving} onClick={close} aria-label="Close receive form"><X size={18} /></button></div>
    {loading && <p role="status">Loading receiving options...</p>}
    {loadError && <div role="alert"><p className="login-error">{loadError}</p><button type="button" className="outline-action" onClick={() => setRetry((value) => value + 1)}>Retry loading options</button></div>}
    {!loading && !loadError && (!assets.length || !suppliers.length) && <p role="status">{!assets.length ? 'No active assets available. Add an asset in Asset Register first.' : 'No active suppliers available. Add a supplier in Supplier Setup first.'}</p>}
    <section><fieldset disabled={loading || saving || !!loadError}>
      <label>Asset<SearchSelect name="assetId" aria-label="Asset" required {...props('assetId')} value={fields.assetId} onChange={(event) => change('assetId', event.target.value)}><option value="">Select asset</option>{assets.map((row) => <option key={row._id} value={row._id}>{row.code} — {row.name}</option>)}</SearchSelect>{fieldError('assetId')}</label>
      <label>Asset Tag ID<input aria-label="Asset Tag ID" readOnly value={selected?.assetTagId || '-'} /></label>
      <label>Supplier<SearchSelect name="supplierId" aria-label="Supplier" required {...props('supplierId')} value={fields.supplierId} onChange={(event) => change('supplierId', event.target.value)}><option value="">Select supplier</option>{suppliers.map((row) => <option key={row._id} value={row._id}>{row.code} — {row.companyName}</option>)}</SearchSelect>{fieldError('supplierId')}</label>
      <label>Project<input aria-label="Project" readOnly value={project?.name || '-'} {...props('project_id')} /><input type="hidden" name="project_id" value={project?._id || ''} />{projectMessage ? <span className="receive-field-error" role="alert">{projectMessage}</span> : fieldError('project_id')}</label>
      <label>Location<input aria-label="Location" readOnly value={selected?.location || '-'} /></label>
      <label>Unit<input aria-label="Unit" readOnly value={selected?.unit || '-'} /></label>
      <label>Quantity<input name="quantity" aria-label="Quantity" required type="number" min="0" step="any" {...props('quantity')} value={fields.quantity} onChange={(event) => change('quantity', event.target.value)} />{fieldError('quantity')}</label>
      <label>GRN number<input name="grn" aria-label="GRN number" required {...props('grn')} value={fields.grn} onChange={(event) => change('grn', event.target.value)} />{fieldError('grn')}</label>
      <label>Bill no.<input name="billNo" aria-label="Bill no." required {...props('billNo')} value={fields.billNo} onChange={(event) => change('billNo', event.target.value)} />{fieldError('billNo')}</label>
      <label className="wide">Remarks<textarea name="remarks" aria-label="Remarks" value={fields.remarks} onChange={(event) => change('remarks', event.target.value)} /></label>
    </fieldset></section>
    {error && <p className="login-error" role="alert">{error}</p>}
    <footer><button type="button" className="outline-action" disabled={saving} onClick={close}>Cancel</button><button type="submit" className="primary-action" disabled={loading || saving || !!loadError || !assets.length || !suppliers.length || !!projectMessage}>{saving ? 'Saving...' : 'Save record'}</button></footer>
  </form></div>
}
