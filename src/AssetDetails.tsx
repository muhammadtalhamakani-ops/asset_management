import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowLeftRight, Boxes, History, Pencil, Send, Wrench } from 'lucide-react'
import { assetAPI } from './api/client'
import type { AssetRecord } from './assetTypes'
import { downloadAssetAttachment, formatAssetDate } from './assetHelpers'
import './AssetDetails.css'

const display = (value: unknown) => value === undefined || value === null || value === '' || value === 'Not recorded' || value === 'No remarks' ? '-' : String(value)
export function AssetDetails({ asset, back }: { asset: AssetRecord; back: () => void }) {
  const [record, setRecord] = useState<AssetRecord | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const [images, setImages] = useState<{ id: string; name: string; url: string }[]>([])
  const [activeImage, setActiveImage] = useState('')
  const [fileError, setFileError] = useState('')
  const [imagesLoading, setImagesLoading] = useState(false)
  useEffect(() => {
    let cancelled = false
    setLoading(true); setRecord(null); setError('')
    assetAPI.getById(asset._id || asset.code).then((response) => {
      if (cancelled) return
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load asset.')
      setRecord(response.data)
    }).catch((failure) => { if (!cancelled) setError(failure instanceof Error ? failure.message : 'Unable to load asset.') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [asset._id, asset.code, retry])
  useEffect(() => {
    let cancelled = false
    const urls: string[] = []
    setImages([]); setActiveImage(''); setFileError('')
    const files = record?.attachments?.filter((file) => file.mimeType?.startsWith('image/')) || []
    setImagesLoading(files.length > 0)
    Promise.all(files.map(async (file) => {
      try {
        const blob = await assetAPI.downloadAttachment(record!._id!, file._id)
        if (cancelled) return null
        const url = URL.createObjectURL(blob)
        urls.push(url)
        return { id: file._id, name: file.originalName, url }
      } catch { if (!cancelled) setFileError('Some image previews are unavailable. You can retry loading the asset.'); return null }
    })).then((results) => {
      if (cancelled) return
      const next = results.filter((item) => item !== null)
      setImages(next); setActiveImage(next[0]?.id || ''); setImagesLoading(false)
    })
    return () => { cancelled = true; urls.forEach((url) => URL.revokeObjectURL(url)) }
  }, [record])
  const currentImage = images.find((image) => image.id === activeImage)
  const rows: [string, unknown][] = record ? [
    ['Asset ID', record.code], ['Asset Tag ID', record.assetTagId], ['Category', record.category], ['Department', record.department],
    ['Make', record.manufacturer], ['Model', record.model], ['Serial Number', record.serial], ['Purchase Order', '-'], ['Delivery Note', record.deliveryNote],
    ['Order Date', formatAssetDate(record.purchaseDate)], ['Received Date', formatAssetDate(record.receiveDate)], ['Project', record.project],
    ['Current Location', record.location], ['Warranty', record.warranty], ['Supplier', record.supplier], ['Supplier Contact', record.supplierContact],
    ['Unit of Measurement', record.unit], ['Quantity', record.quantity], ['Minimum Stock', record.minimum], ['Unit Cost', `AED ${record.unitCost ?? 0}`], ['Total Value', record.value],
  ] : []
  const actions = [[Send, 'Issue to Site'], [ArrowLeftRight, 'Transfer'], [Wrench, 'Send for Maintenance'], [History, 'View History'], [Pencil, 'Edit Asset']] as const
  return <section className="asset-details-page">
    <button type="button" className="portal-back" onClick={back}><ArrowLeft size={16} /> Back to Asset Register</button>
    <div className="portal-panel asset-details-panel"><header><h2>Asset Details</h2><p>Asset Register <span aria-hidden="true">›</span> {asset.code}</p></header>
      {loading ? <p role="status">Loading asset details...</p> : error ? <div role="alert"><p className="login-error">{error}</p><button type="button" className="outline-action" onClick={() => setRetry((value) => value + 1)}>Retry</button></div> : record && <>
        <div className="asset-details-title"><h3>{record.name}</h3><span className="asset-details-status">{display(record.status)}</span><span className="asset-details-category">{display(record.category)}</span></div>
        <div className="asset-details-layout"><section className="asset-details-gallery" aria-label="Asset images"><div className="asset-details-image">{currentImage ? <img src={currentImage.url} alt={currentImage.name} /> : <div><Boxes size={52} /><p>{imagesLoading ? 'Loading images...' : 'No image available'}</p></div>}</div>{images.length > 0 && <div className="asset-details-thumbnails">{images.map((image) => <button type="button" key={image.id} aria-label={`View ${image.name}`} aria-pressed={image.id === activeImage} onClick={() => setActiveImage(image.id)}><img src={image.url} alt={image.name} /></button>)}</div>}</section>
          <dl className="asset-details-information">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{display(value)}</dd></div>)}</dl>
          <aside className="asset-details-actions"><h3>Actions</h3>{actions.map(([Icon, label]) => <button type="button" disabled title="Available in a future update" key={label}><Icon size={16} />{label}</button>)}<p>Available in a future update</p></aside>
        </div>
        <div className="asset-details-notes"><section><h3>Detailed Description</h3><p>{display(record.description)}</p></section><section><h3>Attachments</h3>{record.attachments?.length ? <ul>{record.attachments.map((file) => <li key={file._id}><button type="button" onClick={() => { void downloadAssetAttachment(record._id!, file._id, file.originalName).catch(() => setFileError('Unable to download attachment. Please try again.')) }}>{file.originalName}</button></li>)}</ul> : <p>-</p>}{record.legacyAttachments && <p>Legacy filenames (files unavailable): {record.legacyAttachments}</p>}{fileError && <p className="login-error" role="alert">{fileError}</p>}</section><section><h3>Remarks</h3><p>{display(record.remarks)}</p></section></div>
      </>}
    </div>
  </section>
}
