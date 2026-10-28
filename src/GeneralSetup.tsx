import { PackagePlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { setupAPI } from './api/client'
import type { SetupItemRecord, SetupMasterRecord } from './api/client'
import './GeneralSetup.css'

type SectionState = { items: SetupItemRecord[]; loading: boolean; error: string }
type Dialog = { master: SetupMasterRecord; item?: SetupItemRecord; deleting?: boolean }

export function GeneralSetup({ notify }: { notify: (message: string) => void }) {
  const [masters, setMasters] = useState<SetupMasterRecord[]>([])
  const [sections, setSections] = useState<Record<string, SectionState>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [name, setName] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  const mounted = useRef(false)
  const controllers = useRef(new Map<string, AbortController>())

  async function loadItems(master: SetupMasterRecord) {
    controllers.current.get(master._id)?.abort()
    const controller = new AbortController()
    controllers.current.set(master._id, controller)
    setSections((current) => ({ ...current, [master._id]: { items: current[master._id]?.items || [], loading: true, error: '' } }))
    try {
      const response = await setupAPI.getItems(master._id, controller.signal)
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load items.')
      if (!controller.signal.aborted && mounted.current) {
        setSections((current) => ({ ...current, [master._id]: { items: response.data!, loading: false, error: '' } }))
      }
    } catch (failure) {
      if (!controller.signal.aborted && mounted.current) {
        setSections((current) => ({ ...current, [master._id]: { items: current[master._id]?.items || [], loading: false, error: failure instanceof Error ? failure.message : 'Unable to load items.' } }))
      }
    }
  }

  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    const pending = controllers.current
    setupAPI.getMasters(controller.signal).then((response) => {
      if (controller.signal.aborted) return
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load setup masters.')
      setMasters(response.data)
      response.data.forEach((master) => { void loadItems(master) })
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load setup masters.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => {
      mounted.current = false
      controller.abort()
      pending.forEach((request) => request.abort())
      pending.clear()
    }
  }, [reload])

  function openDialog(value: Dialog) {
    setDialog(value)
    setName(value.item?.name || '')
    setFormError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dialog || busy.current) return
    if (!dialog.deleting && !name.trim()) { setFormError('Item name is required.'); return }
    busy.current = true
    setSaving(true)
    setFormError('')
    try {
      const { master, item, deleting } = dialog
      const response = deleting && item ? await setupAPI.delete(master._id, item._id)
        : item ? await setupAPI.update(master._id, item._id, name.trim())
        : await setupAPI.create(master._id, name.trim())
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to save setup item.')
      if (!mounted.current) return
      const saved = response.data
      // Do not let an earlier list request overwrite the completed mutation.
      controllers.current.get(master._id)?.abort()
      setSections((current) => {
        const items = (current[master._id]?.items || []).filter((row) => row._id !== saved._id)
        if (!deleting) items.push(saved)
        return { ...current, [master._id]: { items: items.sort((a, b) => a.code.localeCompare(b.code)), loading: false, error: '' } }
      })
      setDialog(null)
      notify(deleting ? `${saved.name} deactivated.` : item ? 'Setup item updated.' : `Setup item ${saved.code} created.`)
    } catch (failure) {
      if (mounted.current) setFormError(failure instanceof Error ? failure.message : 'Unable to reach the server. Please try again.')
    } finally {
      busy.current = false
      if (mounted.current) setSaving(false)
    }
  }

  return <>
    <div className="portal-intro"><div><p>SHARED CONFIGURATION</p><h2>General Setup</h2><span>Manage shared categories and reference values.</span></div></div>
    {loading ? <p role="status">Loading setup masters...</p> : error ? <div role="alert"><p className="login-error">{error}</p><button className="outline-action" onClick={() => { setLoading(true); setError(''); setReload((value) => value + 1) }}>Retry</button></div>
      : masters.length === 0 ? <p className="issue-empty">No active setup masters. Run the General Setup seed command to add defaults.</p>
      : <div className="general-setup-grid">{masters.map((master) => {
        const section = sections[master._id]
        return <section className="portal-panel setup-card" key={master._id} aria-labelledby={`master-${master._id}`}>
          <div className="setup-card-head"><h3 id={`master-${master._id}`}>{master.name}</h3><button className="primary-action" disabled={!section || section.loading || !!section.error} onClick={() => openDialog({ master })}><PackagePlus size={16} /> Add</button></div>
          {!section || section.loading ? <p className="issue-empty" role="status">Loading items...</p> : section.error ? <div role="alert"><p className="login-error">{section.error}</p><button className="outline-action" onClick={() => void loadItems(master)}>Retry</button></div>
            : <div className="setup-table-wrap"><table className="setup-table"><thead><tr><th>Code</th><th>Name</th><th>Actions</th></tr></thead><tbody>{section.items.length === 0 ? <tr><td colSpan={3} className="issue-empty">No active items.</td></tr> : section.items.map((item) => <tr key={item._id}><td>{item.code}</td><td>{item.name}</td><td><span className="row-actions"><button onClick={() => openDialog({ master, item })} aria-label={`Edit ${item.name}`}>Edit</button><button onClick={() => openDialog({ master, item, deleting: true })} aria-label={`Delete ${item.name}`}>Delete</button></span></td></tr>)}</tbody></table></div>}
        </section>
      })}</div>}
    {dialog && <div className="portal-modal-backdrop"><form className="portal-modal setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-dialog-title" onSubmit={submit} onKeyDown={(event) => { if (event.key === 'Escape' && !busy.current) setDialog(null) }}>
      <div><span><p>{dialog.master.name}</p><h2 id="setup-dialog-title">{dialog.deleting ? 'Deactivate item' : dialog.item ? 'Edit item' : 'Add item'}</h2></span><button type="button" className="icon-button" disabled={saving} onClick={() => setDialog(null)} aria-label="Close setup form"><X size={18} /></button></div>
      {dialog.deleting ? <p className="form-description">Deactivate “{dialog.item?.name}”? This record will be deactivated rather than permanently deleted.</p>
        : <section>{dialog.item && <label className="wide">Code<input value={dialog.item.code} readOnly /></label>}<label className="wide">Item name<input value={name} onChange={(event) => setName(event.target.value)} required autoFocus disabled={saving} /></label></section>}
      {formError && <p className="login-error" role="alert">{formError}</p>}
      <footer><button className="outline-action" type="button" disabled={saving} onClick={() => setDialog(null)}>Cancel</button><button className="primary-action" type="submit" disabled={saving} autoFocus={dialog.deleting}>{saving ? 'Saving...' : dialog.deleting ? 'Deactivate' : 'Save item'}</button></footer>
    </form></div>}
  </>
}
