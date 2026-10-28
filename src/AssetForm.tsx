import { SearchSelect } from './SearchSelect'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ValidationError } from 'yup'
import { assetAPI, setupAPI, supplierAPI } from './api/client'
import type { SetupItemRecord } from './api/client'
import type { AssetRecord } from './assetTypes'
import './AssetForm.css'
import { formatAssetDate, downloadAssetAttachment } from './assetHelpers'
import { createAssetValidationSchema } from './assetValidation'

const relationFields = [
  ['categoryId', 'Asset Category', true], ['departmentId', 'Department', true], ['makeId', 'Make', true],
  ['modelId', 'Model', true], ['warrantyId', 'Warranty', false], ['statusId', 'Status', true],
] as const
type Option = { _id: string; name: string }

function AssetDateField({ label, name, value, onChange, error }: { label: string; name: string; value: string; onChange: (value: string) => void; error?: string }) {
  return <label>{label}<span className="asset-date-picker"><span aria-hidden="true">{formatAssetDate(value) || 'dd-MMM-yyyy'}</span><input type="date" name={name} aria-label={label} required value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={!!error} aria-describedby={error ? `asset-error-${name}` : undefined} /></span>{error && <span className="asset-field-error" id={`asset-error-${name}`}>{error}</span>}</label>
}

export function AssetForm({ asset, close, onSaved }: { asset?: AssetRecord; close: () => void; onSaved: (asset: AssetRecord) => void }) {
  const [options, setOptions] = useState<Record<string, SetupItemRecord[]>>({})
  const [projects, setProjects] = useState<Option[]>([])
  const [suppliers, setSuppliers] = useState<Option[]>([])
  const [projectId, setProjectId] = useState(asset?.project_id || '')
  const [supplierId, setSupplierId] = useState(asset?.supplierId || '')
  const [selected, setSelected] = useState<Record<string, string>>(() => Object.fromEntries(relationFields.map(([key]) => [key, asset?.[key] || ''])))
  const [purchaseDate, setPurchaseDate] = useState(asset?.purchaseDate?.slice(0, 10) || '')
  const [receiveDate, setReceiveDate] = useState(asset?.receiveDate?.slice(0, 10) || '')
  const [quantity, setQuantity] = useState(asset?.quantity ?? 1)
  const [cost, setCost] = useState(asset?.unitCost ?? 0)
  const [files, setFiles] = useState<File[]>([])
  const [removed, setRemoved] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [retry, setRetry] = useState(0)
  const busy = useRef(false)
  const mounted = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const touched = useRef(new Set<string>())

  const retainedCount = (asset?.attachments || []).filter((file) => !removed.includes(file._id)).length
  const validationSchema = createAssetValidationSchema(!!asset, retainedCount)
  const valuesFromForm = (form: HTMLFormElement) => ({ ...Object.fromEntries(new FormData(form)), files })

  function validateField(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, blur = false) {
    const name = input.name
    if (!name || !validationSchema.fields[name as keyof typeof validationSchema.fields] || !formRef.current) return
    if (blur) touched.current.add(name)
    if (!blur && !touched.current.has(name)) return
    const values = { ...valuesFromForm(formRef.current), [name]: input instanceof HTMLInputElement && input.type === 'file' ? Array.from(input.files || []) : input.value }
    let message = ''
    try { validationSchema.validateSyncAt(name, values) }
    catch (failure) { if (failure instanceof ValidationError) message = failure.message }
    setFieldErrors((current) => ({ ...current, [name]: message }))
  }

  function changeAttachments(nextFiles: File[], nextRemoved = removed) {
    setFiles(nextFiles)
    setRemoved(nextRemoved)
    if (!touched.current.has('files')) return
    const retained = (asset?.attachments || []).filter((file) => !nextRemoved.includes(file._id)).length
    let message = ''
    try { createAssetValidationSchema(!!asset, retained).validateSyncAt('files', { files: nextFiles }) }
    catch (failure) { if (failure instanceof ValidationError) message = failure.message }
    setFieldErrors((current) => ({ ...current, files: message }))
  }

  const errorFor = (name: string) => fieldErrors[name] ? <span className="asset-field-error" id={`asset-error-${name}`}>{fieldErrors[name]}</span> : null
  const fieldLabels: Record<string, string> = { code: 'Asset code', name: 'Asset name', description: 'Detailed Description', deliveryNote: 'Delivery Note', location: 'Location', quantity: 'Quantity', minimum: 'Minimum Stock', unitCost: 'Unit Cost', files: 'Attachments', remarks: 'Remarks' }
  const fieldProps = (name: string) => ({ ...(fieldLabels[name] ? { 'aria-label': fieldLabels[name] } : {}), 'aria-invalid': !!fieldErrors[name], 'aria-describedby': fieldErrors[name] ? `asset-error-${name}` : undefined })

  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    async function load() {
      try {
        const [masters, projectResponse, supplierResponse] = await Promise.all([setupAPI.getMasters(controller.signal), assetAPI.getProjects(controller.signal), supplierAPI.getAll()])
        if (!masters.success || !masters.data) throw new Error(masters.message || 'Unable to load setup masters.')
        if (!projectResponse.success || !supplierResponse.success) throw new Error('Unable to load projects or suppliers.')
        const entries = await Promise.all(relationFields.map(async ([key, masterName]) => {
          const master = masters.data!.find((row) => row.name === masterName)
          if (!master) throw new Error(`${masterName} master is unavailable.`)
          const response = await setupAPI.getItems(master._id, controller.signal)
          if (!response.success || !response.data) throw new Error(response.message || `Unable to load ${masterName}.`)
          return [key, response.data] as const
        }))
        if (controller.signal.aborted) return
        const lists = Object.fromEntries(entries)
        setOptions(lists)
        setProjects(projectResponse.data)
        setSuppliers(supplierResponse.data.map((row: { _id: string; companyName: string; code: string }) => ({ _id: row._id, name: `${row.code} — ${row.companyName}` })))
        if (!asset) setSelected((current) => ({ ...current, statusId: lists.statusId.find((row) => row.systemKey === 'asset:available')?._id || '' }))
        setError('')
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load form options.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => { mounted.current = false; controller.abort() }
  }, [asset, retry])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current || loading) return
    setError('')
    const element = event.currentTarget
    try {
      validationSchema.validateSync(valuesFromForm(element), { abortEarly: false })
      setFieldErrors({})
    } catch (failure) {
      if (failure instanceof ValidationError) {
        const errors: Record<string, string> = {}
        for (const issue of failure.inner) {
          const name = issue.path?.startsWith('files') ? 'files' : issue.path
          if (name) { errors[name] ||= issue.message; touched.current.add(name) }
        }
        setFieldErrors(errors)
        const first = element.elements.namedItem(Object.keys(errors)[0])
        if (first instanceof HTMLElement) first.focus()
      }
      return
    }
    const fields = new FormData(element)
    const data: Record<string, unknown> = { ...selected, quantity, unitCost: Number.isNaN(cost) ? 0 : cost, minimum: Number(fields.get('minimum')), purchaseDate, receiveDate, removeAttachmentIds: removed }
    for (const key of ['code', 'name', 'description', 'deliveryNote', 'project_id', 'supplierId', 'location', 'unit', 'remarks']) data[key] = String(fields.get(key) || '').trim()
    const form = new FormData()
    form.set('data', JSON.stringify(data))
    files.forEach((file) => form.append('files', file))
    busy.current = true
    setSaving(true)
    setError('')
    try {
      const response = await assetAPI.saveForm(form, asset?._id)
      if (!response.success || !response.data) {
        if (/code.*(exists|duplicate)/i.test(response.message || '')) {
          touched.current.add('code')
          setFieldErrors((current) => ({ ...current, code: response.message }))
          const codeInput = element.elements.namedItem('code')
          if (codeInput instanceof HTMLElement) codeInput.focus()
          return
        }
        throw new Error(response.message || 'Unable to save asset.')
      }
      if (mounted.current) { onSaved(response.data as AssetRecord); close() }
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'Unable to reach the server.')
    } finally { busy.current = false; if (mounted.current) setSaving(false) }
  }

  const labels: Record<string, string | undefined> = { categoryId: asset?.category, departmentId: asset?.department, makeId: asset?.manufacturer, modelId: asset?.model, warrantyId: asset?.warranty, statusId: asset?.status }
  const select = (key: string, label: string, required: boolean) => <label key={key}>{label}<SearchSelect name={key} {...fieldProps(key)} aria-label={label} required={required} value={selected[key] || ''} onChange={(event) => setSelected((current) => ({ ...current, [key]: event.target.value }))}><option value="">Select {label.toLowerCase()}</option>{selected[key] && !options[key]?.some((row) => row._id === selected[key]) && <option value={selected[key]}>{labels[key] || 'Existing selection'} (inactive)</option>}{(options[key] || []).map((row) => <option key={row._id} value={row._id}>{row.name}</option>)}</SearchSelect>{errorFor(key)}</label>
  return <div className="portal-modal-backdrop"><form ref={formRef} noValidate className="portal-modal asset-register-modal" role="dialog" aria-modal="true" aria-labelledby="asset-form-title" onSubmit={submit} onBlurCapture={(event) => { if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) validateField(event.target, true) }} onChangeCapture={(event) => { if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) validateField(event.target) }}>
    <div><span><p>ASSET REGISTER</p><h2 id="asset-form-title">{asset ? 'Edit asset' : 'Add asset'}</h2></span><button className="icon-button" type="button" disabled={saving} onClick={close} aria-label="Close asset form"><X size={18} /></button></div>
    {loading && <p role="status">Loading form options...</p>}
    {error && <p className="login-error" role="alert">{error}</p>}
    {!loading && !Object.keys(options).length && <button type="button" className="outline-action" onClick={() => { setLoading(true); setRetry((value) => value + 1) }}>Retry loading options</button>}
    <section className="asset-form-fields"><fieldset disabled={saving || loading || !Object.keys(options).length}>
      <label>Asset code<input name="code" {...fieldProps('code')} defaultValue={asset?.code || ''} required readOnly={!!asset} />{errorFor('code')}</label>
      <label>Asset Tag ID<input value={asset?.assetTagId || 'Generated automatically'} readOnly /></label>
      <label>Asset name<input name="name" {...fieldProps('name')} defaultValue={asset?.name || ''} required />{errorFor('name')}</label>
      <label className="wide">Detailed Description<textarea name="description" {...fieldProps('description')} defaultValue={asset?.description || ''} />{errorFor('description')}</label>
      {relationFields.map(([key, label, required]) => select(key, label, required))}
      <div className="asset-dates wide"><AssetDateField label="Order Date" name="purchaseDate" value={purchaseDate} onChange={setPurchaseDate} error={fieldErrors.purchaseDate} /><AssetDateField label="Receive Date" name="receiveDate" value={receiveDate} onChange={setReceiveDate} error={fieldErrors.receiveDate} /><label>Delivery Note<input name="deliveryNote" {...fieldProps('deliveryNote')} defaultValue={asset?.deliveryNote || ''} required />{errorFor('deliveryNote')}</label></div>
      <label>Project<SearchSelect aria-label="Project" name="project_id" {...fieldProps('project_id')} value={projectId} onChange={(event) => setProjectId(event.target.value)} required><option value="">Select project</option>{asset?.project_id && !projects.some((row) => row._id === asset.project_id) && <option value={asset.project_id}>{asset.project} (inactive)</option>}{projects.map((row) => <option key={row._id} value={row._id}>{row.name}</option>)}</SearchSelect>{errorFor('project_id')}</label>
      <label>Supplier<SearchSelect aria-label="Supplier" name="supplierId" {...fieldProps('supplierId')} value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">Select supplier (optional)</option>{asset?.supplierId && !suppliers.some((row) => row._id === asset.supplierId) && <option value={asset.supplierId}>{asset.supplier} (inactive)</option>}{suppliers.map((row) => <option key={row._id} value={row._id}>{row.name}</option>)}</SearchSelect>{errorFor('supplierId')}</label>
      <label>Location<input name="location" {...fieldProps('location')} defaultValue={asset?.location || ''} required />{errorFor('location')}</label>
      <h3 className="wide">Stock &amp; Value</h3>
      <label>Unit of Measurement<SearchSelect aria-label="Unit of Measurement" name="unit" {...fieldProps('unit')} defaultValue={asset?.unit || 'unit'} required>{['unit', 'pieces', 'units', 'meters', 'kg', 't', 'set', 'box', 'packet'].map((unit) => <option key={unit}>{unit}</option>)}</SearchSelect>{errorFor('unit')}</label>
      <label>Quantity<input name="quantity" {...fieldProps('quantity')} type="number" min={asset ? 0 : '0.000001'} step="any" value={Number.isNaN(quantity) ? '' : quantity} required onChange={(event) => setQuantity(event.target.valueAsNumber)} />{errorFor('quantity')}</label>
      <label>Minimum Stock<input name="minimum" {...fieldProps('minimum')} type="number" min="0" step="any" defaultValue={asset?.minimum ?? 0} />{errorFor('minimum')}</label>
      <label>Unit Cost<input name="unitCost" {...fieldProps('unitCost')} type="number" min="0" step="0.01" value={Number.isNaN(cost) ? '' : cost} onChange={(event) => setCost(event.target.valueAsNumber)} />{errorFor('unitCost')}</label>
      <label>Total Value<input value={`AED ${Number.isFinite(quantity * cost) ? (quantity * cost).toLocaleString() : '0'}`} readOnly /></label>
      <label className="wide">Attachments (maximum 10, 10 MiB each)<input name="files" {...fieldProps('files')} type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx" onChange={(event) => changeAttachments(Array.from(event.target.files || []))} />{errorFor('files')}</label>
      <ul className="asset-attachments wide">{(asset?.attachments || []).filter((file) => !removed.includes(file._id)).map((file) => <li key={file._id}><button type="button" onClick={() => { void downloadAssetAttachment(asset!._id!, file._id, file.originalName).catch(() => setError('Unable to download attachment.')) }}>{file.originalName}</button><button type="button" onClick={() => changeAttachments(files, [...removed, file._id])}>Remove</button></li>)}{files.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}<button type="button" onClick={() => changeAttachments(files.filter((_, i) => i !== index))}>Remove</button></li>)}</ul>
      {asset?.legacyAttachments && <p className="wide">Legacy filenames (files unavailable): {asset.legacyAttachments}</p>}
      <label className="wide">Remarks<textarea name="remarks" {...fieldProps('remarks')} defaultValue={asset?.remarks || ''} />{errorFor('remarks')}</label>
    </fieldset></section>
    <footer><button className="outline-action" type="button" disabled={saving} onClick={close}>Cancel</button><button className="primary-action" type="submit" disabled={saving || loading || !Object.keys(options).length}>{saving ? 'Saving...' : asset ? 'Save changes' : 'Create asset'}</button></footer>
  </form></div>
}
