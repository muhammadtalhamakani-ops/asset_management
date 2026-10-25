import { Activity, AlertTriangle, ArrowLeftRight, Bell, Box, Boxes, Building2, Camera, CheckCircle2, ChevronDown, CircleUserRound, ClipboardCheck, FileBarChart2, FileSpreadsheet, Grid2X2, Hammer, HardHat, LayoutDashboard, LockKeyhole, LogOut, Mail, MapPin, PackageCheck, PackagePlus, QrCode, Search, ShieldCheck, Truck, UserRound, Wrench, X } from 'lucide-react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { assemblyAPI, assetAPI, authAPI, inspectionAPI, movementAPI, returnAPI, supplierAPI } from './api/client'
import './App.css'

type Screen = 'Dashboard' | 'Assets' | 'Activity' | 'Profile'
type Asset = { name: string; category: string; quantity: string; location: string; code: string }

const categories = [
  { name: 'Machinery', count: 18, icon: Wrench, tone: 'blue' },
  { name: 'Hardware', count: 246, icon: Hammer, tone: 'orange' },
  { name: 'Steel', count: 84, icon: Grid2X2, tone: 'green' },
  { name: 'Materials', count: 129, icon: Box, tone: 'violet' },
]
const initialAssets: Asset[] = [
  { name: 'Excavator CAT 320', category: 'Machinery', quantity: '2 units', location: 'Zone A', code: 'MAC-021' },
  { name: 'Rebar 16 mm', category: 'Steel', quantity: '1.2 t', location: 'Steel yard', code: 'STL-016' },
  { name: 'Safety helmets', category: 'Hardware', quantity: '8 units', location: 'Store room', code: 'SAF-104' },
]

type PortalPage = 'Dashboard' | 'Supplier Setup' | 'Asset Register' | 'Inventory' | 'Receive Assets' | 'Issue & Allocate' | 'Transfers' | 'Assemblies' | 'QR Scanner' | 'Inspections' | 'Returns & Damage' | 'Reports & Audit'
type SupplierRecord = { _id: string; companyName: string; contactPerson: string; email: string; phone: string; address: string; taxId: string; notes: string; status: 'Active' | 'Inactive'; createdAt: string }
type AssetRecord = { _id?: string; code: string; name: string; type: string; serial: string; assetTagId: string; category: string; department: string; subcategory: string; description: string; manufacturer: string; model: string; warranty: string; quantity: number; unit: string; minimum: number; unitCost: number; value: string; supplier: string; purchaseDate: string | null; receiveDate?: string | null; project: string; location: string; status: string; qrCode: string; attachments: string; remarks: string }
type ReceiveRecord = { assetCode: string; quantity: number; supplier: string; grn: string; billNo: string; project: string; remarks: string; recordedBy: string }
type IssueRecord = { assetCode: string; quantity: number; recipientName: string; billNo: string; project: string; remarks: string; recordedBy: string }
type TransferRecord = { assetCode: string; quantity: number; fromLocation: string; toLocation: string; project: string; remarks: string; recordedBy: string }
type ReturnRecord = { assetCode: string; qrCode?: string; returnDate?: string; type: string; quantityIssued: number; quantityReturned: number; quantityDamaged: number; quantityMissing: number; condition: string; damageDescription: string; responsibleParty: string; location: string; recordedBy: string; remarks: string }
type IssueMovement = { _id?: string; id: string; assetCode: string; assetName: string; quantity: number; unit: string; fromLocation?: string; recipientName?: string; billNo?: string; project?: string; status: string; timestamp: string }
type TransferMovement = { _id?: string; id: string; assetCode: string; assetName: string; quantity: number; unit: string; fromLocation?: string; toLocation?: string; project?: string; status: string; timestamp: string }
type ReceiveMovement = { id: string; assetCode: string; assetName: string; quantity: number; unit: string; toLocation?: string; supplier?: string; grn?: string; billNo?: string; project?: string; status: string; timestamp: string }
type ReportMovement = { _id?: string; id: string; type: string; assetCode: string; assetName: string; quantity: number; unit: string; fromLocation?: string; toLocation?: string; recipientName?: string; supplier?: string; grn?: string; billNo?: string; status: string; recordedBy?: string; timestamp: string }
type ReturnMovement = { _id?: string; id: string; assetCode: string; assetName: string; qrCode?: string; billNo?: string; type: string; quantityIssued: number; quantityReturned: number; quantityDamaged: number; quantityMissing: number; condition: string; responsibleParty: string; resolution: string; returnDate: string }
function PortalReturns({ movements, loadError, query, setQuery, status, setStatus, openReturn }: { movements: ReturnMovement[]; loadError: string; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; openReturn: () => void }) { const filtered = movements.filter((movement) => JSON.stringify(movement).toLowerCase().includes(query.toLowerCase()) && (status === 'All' || movement.resolution === status)); return <><div className="portal-intro"><div><p>EXCEPTIONS & RECOVERY</p><h2>Returns, damage & loss</h2><span>Record returned, damaged and missing quantities with responsibility and resolution.</span></div><button className="primary-action" onClick={openReturn}><PackagePlus size={17} /> Record return</button></div><section className="portal-panel portal-table issue-table"><PortalHead eyebrow="RETURN HISTORY" title="Returns, damage & loss records" action="View full audit" /><div className="issue-filters"><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search record, asset, bill or responsible party" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Closed</option><option>Replacement pending</option><option>Repair pending</option><option>Under investigation</option></select></div>{loadError && <p className="login-error">{loadError}</p>}<div className="return-table-head"><span>RECORD</span><span>ASSET</span><span>BILL NO</span><span>RESPONSIBLE PARTY</span><span>QUANTITIES</span><span>CONDITION</span><span>RESOLUTION</span></div>{filtered.length === 0 ? <p className="issue-empty">No return records match the current filters.</p> : filtered.map((movement) => <div className="return-row" key={movement.id}><span><b>{movement.id}</b><small>{formatPortalDate(movement.returnDate)}</small></span><span>{movement.assetName} <small>{movement.assetCode}</small></span><span>{movement.billNo || 'Not recorded'}</span><span>{movement.responsibleParty}</span><span>Issued {movement.quantityIssued} · Returned {movement.quantityReturned}{movement.quantityDamaged ? ` · Damaged ${movement.quantityDamaged}` : ''}{movement.quantityMissing ? ` · Missing ${movement.quantityMissing}` : ''}</span><span>{movement.condition}</span><PortalStatus value={movement.resolution} /></div>)}</section></> }
function ActiveReturnModalWithAssets({ assets, close, save, recordedBy }: { assets: AssetRecord[]; close: () => void; save: (draft?: AssetRecord | ReceiveRecord | IssueRecord | TransferRecord | ReturnRecord) => Promise<string | undefined>; recordedBy: string }) { const [assetCode, setAssetCode] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const selectedAsset = assets.find((asset) => asset.code.toLowerCase() === assetCode.trim().toLowerCase()); const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(''); setLoading(true); const fields = new FormData(event.currentTarget); const message = await save({ assetCode: String(fields.get('assetCode')).trim(), billNo: String(fields.get('billNo')).trim(), type: String(fields.get('type')), quantityIssued: Number(fields.get('quantityIssued')), quantityReturned: Number(fields.get('quantityReturned')), quantityDamaged: Number(fields.get('quantityDamaged')), quantityMissing: Number(fields.get('quantityMissing')), condition: String(fields.get('condition')), damageDescription: String(fields.get('damageDescription')).trim(), responsibleParty: String(fields.get('responsibleParty')).trim(), location: String(fields.get('location')).trim(), recordedBy, remarks: String(fields.get('remarks')).trim() }); setLoading(false); if (message) setError(message) }; return <div className="portal-modal-backdrop"><form className="portal-modal return-modal" onSubmit={submit}><div><span><p>EXCEPTIONS & RECOVERY</p><h2>Record return</h2></span><button className="icon-button" type="button" onClick={close} aria-label="Close return form"><X size={18} /></button></div><p className="form-description">Select an asset from inventory or enter its code manually.</p><section><label>Asset ID / code<input name="assetCode" list="return-asset-codes" value={assetCode} onChange={(event) => setAssetCode(event.target.value)} required placeholder="Select or enter asset code" /><datalist id="return-asset-codes">{assets.map((asset) => <option key={asset.code} value={asset.code}>{asset.name}</option>)}</datalist></label><label>Asset type<input value={selectedAsset?.type || 'Enter an inventory asset code'} readOnly /></label><label>Asset tag ID<input value={selectedAsset?.assetTagId || 'Not recorded'} readOnly /></label><label>Bill no.<input name="billNo" required placeholder="Enter bill number" /></label><label>Record type<select name="type" defaultValue="Return"><option>Return</option><option>Damage</option><option>Loss</option><option>Variance</option></select></label><label>Quantity issued<input name="quantityIssued" required type="number" min="0" step="any" /></label><label>Quantity returned<input name="quantityReturned" type="number" min="0" step="any" defaultValue="0" /></label><label>Quantity damaged<input name="quantityDamaged" type="number" min="0" step="any" defaultValue="0" /></label><label>Quantity missing<input name="quantityMissing" type="number" min="0" step="any" defaultValue="0" /></label><label>Condition<select name="condition" defaultValue="Good"><option>Good</option><option>Damaged</option><option>Missing</option><option>Destroyed</option></select></label><label>Responsible party<input name="responsibleParty" required placeholder="Enter person or team" /></label><label>Location<input name="location" defaultValue={selectedAsset?.location || ''} required placeholder="e.g. Warehouse 01" /></label><label className="wide">Damage description<textarea name="damageDescription" placeholder="Describe damage or loss" /></label><label className="wide">Remarks<textarea name="remarks" placeholder="Add supporting notes" /></label></section>{error && <p className="login-error">{error}</p>}<footer><button className="outline-action" type="button" onClick={close} disabled={loading}>Cancel</button><button className="primary-action" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Record return'}</button></footer></form></div> }
type CurrentUser = { email: string; name: string; role: string }
type AssemblyComponent = { componentName: string; required: number; onAssembly: number; condition: string }
type AssemblyRecord = { _id?: string; code: string; name: string; type: string; description?: string; location: string; project: string; status: string; components: AssemblyComponent[]; lastInspection?: string; nextInspectionDue?: string; qrCode?: string; remarks?: string }
type ChecklistItem = { item: string; checked: boolean; remarks?: string }
type CorrectionAction = { action: string; assignedTo: string; dueDate?: string; completed: boolean }
type InspectionRecord = { _id?: string; id: string; assetCode: string; assetName: string; type: string; checklist: ChecklistItem[]; condition: string; status: string; location: string; inspector?: { name: string; signature?: string }; correctionActions: CorrectionAction[]; nextInspectionDue?: string; remarks?: string; inspectionDate: string }

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function formatPortalDate(value?: string | null) {
  if (!value || value === 'Not recorded') return 'Not recorded'
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  const date = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not recorded'
  return `${String(date.getDate()).padStart(2, '0')}/${monthNames[date.getMonth()]}/${date.getFullYear()}`
}
function parsePortalDate(value: string) {
  const match = /^(\d{1,2})\/([A-Za-z]+)\/(\d{4})$/.exec(value.trim())
  if (!match) return null
  const day = Number(match[1])
  const month = monthNames.findIndex((name) => name.toLowerCase() === match[2].toLowerCase())
  const year = Number(match[3])
  if (month < 0) return null
  const date = new Date(year, month, day)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

async function editAssetRecord(asset: AssetRecord) { const name = window.prompt('Asset name', asset.name); if (!name || !asset._id) return; const quantity = Number(window.prompt('Quantity', String(asset.quantity))); if (!Number.isFinite(quantity) || quantity < 0) return; const response = await assetAPI.update(asset._id, { name, quantity, unitCost: asset.unitCost, location: asset.location, status: asset.status, minimum: asset.minimum, project: asset.project, category: asset.category, type: asset.type }); if (!response.success) return window.alert(response.message || 'Unable to update asset.'); window.location.reload() }
async function deleteAssetRecord(asset: AssetRecord) { if (!asset._id || !window.confirm(`Delete ${asset.name}? This also removes its movement history.`)) return; const response = await assetAPI.delete(asset._id); if (!response.success) return window.alert(response.message || 'Unable to delete asset.'); window.location.reload() }
async function editMovementRecord(movement: { _id?: string; id: string; remarks?: string }) { if (!movement._id) return window.alert('This record cannot be edited because its database ID is missing.'); const remarks = window.prompt('Remarks', movement.remarks || ''); if (remarks === null) return; const response = await movementAPI.update(movement._id, { remarks }); if (!response.success) return window.alert(response.message || 'Unable to update movement.'); window.location.reload() }
async function deleteMovementRecord(movement: { _id?: string; id: string; assetName: string }) { if (!movement._id || !window.confirm(`Delete movement ${movement.id} for ${movement.assetName}?`)) return; const response = await movementAPI.delete(movement._id); if (!response.success) return window.alert(response.message || 'Unable to delete movement.'); window.location.reload() }
const portalPages: { label: PortalPage; icon: typeof LayoutDashboard; group: string }[] = [
  { label: 'Dashboard', icon: LayoutDashboard, group: 'OVERVIEW' }, { label: 'Supplier Setup', icon: Building2, group: 'SUPPLIER SETUP' }, { label: 'Asset Register', icon: Boxes, group: 'ASSET CONTROL' }, { label: 'Inventory', icon: PackageCheck, group: 'ASSET CONTROL' },
  { label: 'Receive Assets', icon: Truck, group: 'TRANSACTIONS' }, { label: 'Issue & Allocate', icon: UserRound, group: 'TRANSACTIONS' }, { label: 'Transfers', icon: ArrowLeftRight, group: 'TRANSACTIONS' },
  { label: 'Assemblies', icon: HardHat, group: 'SITE OPERATIONS' }, { label: 'QR Scanner', icon: QrCode, group: 'SITE OPERATIONS' }, { label: 'Inspections', icon: ShieldCheck, group: 'SITE OPERATIONS' }, { label: 'Returns & Damage', icon: AlertTriangle, group: 'SITE OPERATIONS' }, { label: 'Reports & Audit', icon: FileBarChart2, group: 'REPORTING' },
]
const portalMovements = [['TRF-0082', 'Facade Scaffold Assembly', 'Al Quoz Logistics Hub to Dubai Marina, Tower 3 Level 12', '15 min ago', 'Transferred'], ['ISS-0328', 'Excavator CAT 320', 'Dubai Creek Harbour, Plot DCH-12 to Earthworks team', '1 hr ago', 'Issued'], ['GRN-0147', 'Rebar 16 mm', 'Conares Steel to Jebel Ali Industrial Yard', 'Today, 08:42', 'Received'], ['INSP-0064', 'Tower scaffold set', 'Business Bay, Tower C Level 2', 'Yesterday', 'Passed']]
const PROJECT_SITES = ['Dubai Creek Harbour - Tower C', 'Business Bay Business Park Extension', 'Dubai Marina - Tower 3', 'Al Quoz Logistics Hub', 'Palm Jumeirah Villa Development', 'Jebel Ali Industrial Yard']
const ASSET_CATEGORIES = ['Machinery', 'Hardware', 'Steel', 'Materials', 'Scaffolding', 'Other']
const DEPARTMENTS = ['Procurement', 'Operations', 'Maintenance', 'Engineering', 'HSE', 'Logistics', 'Administration', 'Other']
const ASSET_MAKES = ['Alimak', 'Al Jaber Building Materials', 'Bosch', 'Caterpillar', 'Conares Steel', 'Dubai Cable Company', 'Emirates Concrete Products', 'FG Wilson', 'Gulf Fire', 'Layher', 'PERI', 'Potain', 'RAK Ceramics', 'SANY', '3M', 'Other']
const ASSET_MODELS = ['320 GC', 'A252', 'CureShield 200', 'Cuplock Std', 'DCC-100HD', 'FF18', 'GSB 18V-55', 'H-700', 'MDT 178', 'MAXIMO', 'OPC 42.5N', 'P250-5', 'Protecta AB113', 'SY306C', 'Other']
const WARRANTY_OPTIONS = ['Not specified', 'No warranty', '6 months', '1 year', '2 years', '3 years', '5 years', 'Other']

export default function App() {
  const [page, setPage] = useState<PortalPage>(() => { const savedPage = window.localStorage.getItem('fieldstock-page') as PortalPage | null; return savedPage && portalPages.some((item) => item.label === savedPage) ? savedPage : 'Dashboard' }); const [assets, setAssets] = useState<AssetRecord[]>([]); const [assetLoadError, setAssetLoadError] = useState(''); const [issueMovements, setIssueMovements] = useState<IssueMovement[]>([]); const [issueLoadError, setIssueLoadError] = useState(''); const [transferMovements, setTransferMovements] = useState<TransferMovement[]>([]); const [transferLoadError, setTransferLoadError] = useState(''); const [receiveMovements, setReceiveMovements] = useState<ReceiveMovement[]>([]); const [receiveLoadError, setReceiveLoadError] = useState(''); const [reportMovements, setReportMovements] = useState<ReportMovement[]>([]); const [reportLoadError, setReportLoadError] = useState(''); const [returnMovements, setReturnMovements] = useState<ReturnMovement[]>([]); const [returnLoadError, setReturnLoadError] = useState(''); const [returnQuery, setReturnQuery] = useState(''); const [returnStatus, setReturnStatus] = useState('All'); const [selected, setSelected] = useState<AssetRecord | null>(null); const [modal, setModal] = useState<'asset' | 'receive' | 'issue' | 'transfer' | 'return' | null>(null); const [query, setQuery] = useState(''); const [issueQuery, setIssueQuery] = useState(''); const [issueStatus, setIssueStatus] = useState('All'); const [transferQuery, setTransferQuery] = useState(''); const [transferStatus, setTransferStatus] = useState('All'); const [receiveQuery, setReceiveQuery] = useState(''); const [receiveStatus, setReceiveStatus] = useState('All'); const [notice, setNotice] = useState(''); const [signedIn, setSignedIn] = useState(() => window.localStorage.getItem('fieldstock-signed-in') === 'true'); const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => { const raw = window.localStorage.getItem('fieldstock-user'); return raw ? JSON.parse(raw) as CurrentUser : null })
  const [activeProject, setActiveProject] = useState(() => window.localStorage.getItem('fieldstock-active-project') || 'All projects')
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  useEffect(() => { window.localStorage.setItem('fieldstock-active-project', activeProject) }, [activeProject])
  useEffect(() => { window.localStorage.setItem('fieldstock-page', page) }, [page])
  useEffect(() => { if (!window.localStorage.getItem('fieldstock-session-token')) setSignedIn(false) }, [])
  useEffect(() => { if (signedIn) window.localStorage.setItem('fieldstock-signed-in', 'true'); else { window.localStorage.removeItem('fieldstock-signed-in'); window.localStorage.removeItem('fieldstock-session-token') } }, [signedIn])
  useEffect(() => { if (currentUser) window.localStorage.setItem('fieldstock-user', JSON.stringify(currentUser)); else window.localStorage.removeItem('fieldstock-user') }, [currentUser])
  useEffect(() => {
    if (!signedIn) return
    assetAPI.getAll()
      .then((response) => {
        if (!response.success) throw new Error(response.message || 'Unable to load assets.')
        setAssets(response.data as AssetRecord[])
        setAssetLoadError('')
      })
      .catch(() => setAssetLoadError('Unable to load assets from the server.'))
  }, [signedIn])
  useEffect(() => {
    if (!signedIn) return
    movementAPI.getAll({ type: 'issue' })
      .then((response) => {
        if (!response.success) throw new Error(response.message || 'Unable to load issues.')
        setIssueMovements(response.data as IssueMovement[])
        setIssueLoadError('')
      })
      .catch(() => setIssueLoadError('Unable to load issue history from the server.'))
  }, [signedIn])
  useEffect(() => {
    if (!signedIn) return
    movementAPI.getAll({ type: 'transfer' })
      .then((response) => {
        if (!response.success) throw new Error(response.message || 'Unable to load transfers.')
        setTransferMovements(response.data as TransferMovement[])
        setTransferLoadError('')
      })
      .catch(() => setTransferLoadError('Unable to load transfer history from the server.'))
  }, [signedIn])
  useEffect(() => {
    if (!signedIn) return
    movementAPI.getAll({ type: 'receive' })
      .then((response) => {
        if (!response.success) throw new Error(response.message || 'Unable to load receiving history.')
        setReceiveMovements(response.data as ReceiveMovement[])
        setReceiveLoadError('')
      })
      .catch(() => setReceiveLoadError('Unable to load receiving history from the server.'))
  }, [signedIn])
  useEffect(() => {
    if (!signedIn) return
    movementAPI.getAll()
      .then((response) => {
        if (!response.success) throw new Error(response.message || 'Unable to load audit history.')
        setReportMovements(response.data as ReportMovement[])
        setReportLoadError('')
      })
      .catch(() => setReportLoadError('Unable to load reports from the server.'))
  }, [signedIn])
  useEffect(() => {
    if (!signedIn) return
    returnAPI.getAll()
      .then((response) => {
        if (!response.success) throw new Error(response.message || 'Unable to load return records.')
        setReturnMovements(response.data as ReturnMovement[])
        setReturnLoadError('')
      })
      .catch(() => setReturnLoadError('Unable to load return records from the server.'))
  }, [signedIn])
  void receiveMovements; void receiveLoadError; void receiveQuery; void receiveStatus; void setReceiveQuery; void setReceiveStatus
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2800) }
  const save = async (draft?: AssetRecord | ReceiveRecord | IssueRecord | TransferRecord | ReturnRecord) => {
    if (modal === 'asset' && draft) {
      try {
        const response = await assetAPI.create(draft)
        if (!response.success) return response.message || 'Unable to create the asset.'
        setAssets((items) => [response.data as AssetRecord, ...items])
        notify('Asset master record created.')
        setModal(null)
        return undefined
      } catch {
        return 'Unable to reach the server. Please try again.'
      }
    }
    if (modal === 'receive' && draft && 'assetCode' in draft && 'quantity' in draft) {
      try {
        const response = await movementAPI.receive(draft)
        if (!response.success) return response.message || 'Unable to record the receiving.'
        setReceiveMovements((items) => [response.data as ReceiveMovement, ...items])
        setReportMovements((items) => [response.data as ReportMovement, ...items])
        setAssets((items) => items.map((asset) => asset.code === draft.assetCode ? { ...asset, quantity: asset.quantity + draft.quantity, value: `AED ${((asset.quantity + draft.quantity) * asset.unitCost).toLocaleString()}`, status: asset.status === 'Low stock' && asset.quantity + draft.quantity >= asset.minimum ? 'Available' : asset.status } : asset))
        notify('Receiving recorded and inventory updated.')
        setModal(null)
        return undefined
      } catch {
        return 'Unable to reach the server. Please try again.'
      }
    }
    if (modal === 'issue' && draft && 'recipientName' in draft) {
      try {
        const response = await movementAPI.issue(draft)
        if (!response.success) return response.message || 'Unable to record the issue.'
        setReportMovements((items) => [response.data as ReportMovement, ...items])
        setIssueMovements((items) => [response.data as IssueMovement, ...items])
        setAssets((items) => items.map((asset) => asset.code === draft.assetCode ? { ...asset, quantity: asset.quantity - draft.quantity, value: `AED ${((asset.quantity - draft.quantity) * asset.unitCost).toLocaleString()}`, status: asset.quantity - draft.quantity < asset.minimum ? 'Low stock' : 'In use' } : asset))
        notify('Issue allocation recorded and inventory updated.')
        setModal(null)
        return undefined
      } catch {
        return 'Unable to reach the server. Please try again.'
      }
    }
    if (modal === 'transfer' && draft && 'fromLocation' in draft) {
      try {
        const response = await movementAPI.transfer(draft)
        if (!response.success) return response.message || 'Unable to record the transfer.'
        setReportMovements((items) => [response.data as ReportMovement, ...items])
        setTransferMovements((items) => [response.data as TransferMovement, ...items])
        setAssets((items) => items.map((asset) => asset.code === draft.assetCode ? { ...asset, location: draft.toLocation, status: 'In transit' } : asset))
        notify('Transfer recorded and asset location updated.')
        setModal(null)
        return undefined
      } catch {
        return 'Unable to reach the server. Please try again.'
      }
    }
    if (modal === 'return' && draft && 'quantityReturned' in draft) {
      try {
        const response = await returnAPI.create(draft)
        if (!response.success) return response.message || 'Unable to record the return.'
        setReturnMovements((items) => [response.data as ReturnMovement, ...items])
        setAssets((items) => items.map((asset) => asset.code === draft.assetCode ? { ...asset, quantity: asset.quantity + draft.quantityReturned, value: `AED ${((asset.quantity + draft.quantityReturned) * asset.unitCost).toLocaleString()}`, status: draft.quantityDamaged > 0 ? 'Damaged' : asset.status } : asset))
        notify('Return and condition record saved.')
        setModal(null)
        return undefined
      } catch {
        return 'Unable to reach the server. Please try again.'
      }
    }
    notify(`${modal === 'receive' ? 'Receiving' : modal === 'issue' ? 'Issue allocation' : 'Transfer'} recorded and audit history updated.`)
    setModal(null)
    return undefined
  }
  const userInitials = currentUser?.name ? currentUser.name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() : 'U'
  const visibleAssets = activeProject === 'All projects' ? assets : assets.filter((asset) => asset.project === activeProject)
  if (!signedIn) return <PortalSignedOut onSignIn={(user) => { setCurrentUser(user); setSignedIn(true) }} />
  return <main className="asset-portal"><aside className="asset-rail"><div className="portal-brand"><span><Boxes size={19} /></span><strong>FIELD<span>STOCK</span></strong></div><button className="project-switch" onClick={() => setProjectMenuOpen((value) => !value)}><i /><span><small>ACTIVE PROJECT</small>{activeProject}</span><ChevronDown size={15} /></button>{projectMenuOpen && <div className="project-menu"><button type="button" className={activeProject === 'All projects' ? 'active' : ''} onClick={() => { setActiveProject('All projects'); setProjectMenuOpen(false) }}>All projects</button>{PROJECT_SITES.map((site) => <button type="button" key={site} className={activeProject === site ? 'active' : ''} onClick={() => { setActiveProject(site); setProjectMenuOpen(false) }}>{site}</button>)}</div>}<nav>{['OVERVIEW', 'SUPPLIER SETUP', 'ASSET CONTROL', 'TRANSACTIONS', 'SITE OPERATIONS', 'REPORTING'].map((group) => <div className="portal-nav-group" key={group}><small>{group}</small>{portalPages.filter((item) => item.group === group).map(({ label, icon: Icon }) => <button key={label} className={page === label && !selected ? 'active' : ''} onClick={() => { setSelected(null); setPage(label) }}><Icon size={17} /><span>{label}</span></button>)}</div>)}</nav><div className="rail-user"><b>{userInitials}</b><span>{currentUser?.name || 'Signed-in user'}<small>{currentUser?.email || currentUser?.role || ''}</small></span></div><button className="rail-logout" onClick={() => { setSignedIn(false); setCurrentUser(null) }} aria-label="Log out of FieldStock" title="Log out"><LogOut size={17} /><span>Log out</span></button></aside><section className="asset-main"><header><div><div className="portal-crumb">ASSET MANAGEMENT <span>/</span> {selected ? 'ASSET DETAILS' : page.toUpperCase()}</div><h1>{selected ? selected.name : page}</h1></div><div className="portal-tools"><button className="icon-button" aria-label="Search"><Search size={18} /></button><button className="scan-button" onClick={() => { setSelected(null); setPage('QR Scanner') }}><QrCode size={17} /> Scan asset</button><button className="avatar" title={currentUser?.email || ''}>{userInitials}</button></div></header><div className="portal-body"><PortalContent page={page} assets={visibleAssets} assetLoadError={assetLoadError} issueMovements={issueMovements} issueLoadError={issueLoadError} issueQuery={issueQuery} setIssueQuery={setIssueQuery} issueStatus={issueStatus} setIssueStatus={setIssueStatus} transferMovements={transferMovements} transferLoadError={transferLoadError} transferQuery={transferQuery} setTransferQuery={setTransferQuery} transferStatus={transferStatus} setTransferStatus={setTransferStatus} reportMovements={reportMovements} reportLoadError={reportLoadError} returnMovements={returnMovements} returnLoadError={returnLoadError} returnQuery={returnQuery} setReturnQuery={setReturnQuery} returnStatus={returnStatus} setReturnStatus={setReturnStatus} selected={selected} query={query} setQuery={setQuery} select={setSelected} setModal={setModal} notify={notify} onAssetUpdated={(asset) => setAssets((items) => items.map((item) => (item._id === asset._id ? asset : item)))} /></div></section>{modal === 'return' ? <ReturnModalWithAssets assets={assets} close={() => setModal(null)} save={save} recordedBy={currentUser?.name || 'Unknown user'} /> : modal && <PortalModal kind={modal} close={() => setModal(null)} save={save} recordedBy={currentUser?.name || 'Unknown user'} />}{notice && <div className="portal-toast"><CheckCircle2 size={18} />{notice}</div>}</main>
}

/* function PortalSignedOut({ onSignIn }: { onSignIn: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  */
/*
function PortalSignedOut({ onSignIn }: { onSignIn: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [success, setSuccess] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
  //
  const selectedAsset = assets.find((asset) => asset.code.toLowerCase() === assetCode.trim().toLowerCase());
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const fields = new FormData(event.currentTarget);
    const message = await save({
      assetCode: String(fields.get('assetCode')).trim(),
      billNo: String(fields.get('billNo')).trim(),
      type: String(fields.get('type')),
      quantityIssued: Number(fields.get('quantityIssued')),
      quantityReturned: Number(fields.get('quantityReturned')),
      quantityDamaged: Number(fields.get('quantityDamaged')),
      quantityMissing: Number(fields.get('quantityMissing')),
      condition: String(fields.get('condition')),
      damageDescription: String(fields.get('damageDescription')).trim(),
      responsibleParty: String(fields.get('responsibleParty')).trim(),
      location: String(fields.get('location')).trim(),
      recordedBy: 'Alex Rivera',
      remarks: String(fields.get('remarks')).trim()
    });
    setLoading(false);
    if (message) setError(message);
  };
  return (
    <div className="portal-modal-backdrop">
      <form className="portal-modal return-modal" onSubmit={submit}>
        <div>
          <span>
            <p>EXCEPTIONS & RECOVERY</p>
            <h2>Record return</h2>
          </span>
          <button className="icon-button" type="button" onClick={close} aria-label="Close return form">
            <X size={18} />
          </button>
        </div>
        <p className="form-description">Select an asset from inventory or enter its code manually.</p>
        <section>
          <label>
            Asset ID / code
            <input
              name="assetCode"
              list="return-asset-codes"
              value={assetCode}
              onChange={(event) => setAssetCode(event.target.value)}
              required
              placeholder="Select or enter asset code"
            />
            <datalist id="return-asset-codes">
              {assets.map((asset) => (
                <option key={asset.code} value={asset.code}>
                  {asset.name}
                </option>
              ))}
            </datalist>
          </label>
          <label>
            Asset type
            <input value={selectedAsset?.type || 'Enter an inventory asset code'} readOnly />
          </label>
          <label>
            Record type
            <select name="type" defaultValue="Return">
              <option>Return</option>
              <option>Damage</option>
              <option>Loss</option>
              <option>Variance</option>
            </select>
          </label>
          <label>
            Bill no.
            <input name="billNo" required placeholder="Enter bill number" />
          </label>
          <label>
            Quantity issued
            <input name="quantityIssued" required type="number" min="0" step="any" />
          </label>
          <label>
            Quantity returned
            <input name="quantityReturned" type="number" min="0" step="any" defaultValue="0" />
          </label>
          <label>
            Quantity damaged
            <input name="quantityDamaged" type="number" min="0" step="any" defaultValue="0" />
          </label>
          <label>
            Quantity missing
            <input name="quantityMissing" type="number" min="0" step="any" defaultValue="0" />
          </label>
          <label>
            Condition
            <select name="condition" defaultValue="Good">
              <option>Good</option>
              <option>Damaged</option>
              <option>Missing</option>
              <option>Destroyed</option>
            </select>
          </label>
          <label>
            Responsible party
            <input name="responsibleParty" required placeholder="Enter person or team" />
          </label>
          <label>
            Location
            <input name="location" defaultValue={selectedAsset?.location || ''} required placeholder="e.g. Warehouse 01" />
          </label>
          <label className="wide">
            Damage description
            <textarea name="damageDescription" placeholder="Describe damage or loss" />
          </label>
          <label className="wide">
            Remarks
            <textarea name="remarks" placeholder="Add supporting notes" />
          </label>
        </section>
        {error && <p className="login-error">{error}</p>}
        <footer>
          <button className="outline-action" type="button" onClick={close} disabled={loading}>
            Cancel
          </button>
          <button className="primary-action" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save record'}
          </button>
        </footer>
      </form>
    </div>
  );
  //
    event.preventDefault()
    if (!email.trim() || !password) return setError('Enter your email address and password.')
    setError(''); setLoading(true)
    try {
      const response = await authAPI.login(email.trim(), password)
      if (!response.success) { setLoading(false); return setError(response.message || 'Login failed.') }
      setLoading(false); setSuccess(true)
      window.setTimeout(() => { setSuccess(false); onSignIn() }, 1200)
    } catch {
      setLoading(false); setError('Unable to reach the server. Please try again.')
    }
  }
  return <main className="portal-login"><section className="login-panel"><div className="portal-brand"><span><Boxes size={19} /></span><strong>FIELD<span>STOCK</span></strong></div><div className="login-welcome"><p>ASSET MANAGEMENT</p><h1>Welcome back</h1><span>Sign in to manage site stock, equipment, movements and inspections.</span></div><form onSubmit={submit}><label>Email address<span className="login-input"><Mail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" autoComplete="email" /></span></label><label>Password<span className="login-input"><LockKeyhole size={17} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" /></span></label>{error && <p className="login-error">{error}</p>}<div className="login-options"><label><input type="checkbox" defaultChecked /> Keep me signed in</label><button type="button">Forgot password?</button></div><button className="login-submit" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in to workspace'} <span>→</span></button></form><small className="login-security"><LockKeyhole size={13} /> Protected workspace access</small></section><aside className="login-showcase"><div className="showcase-brand">FIELDSTOCK <span>/ RIVERSIDE</span></div><div className="showcase-copy"><p>LIVE SITE CONTROL</p><h2>Every asset.<br />Exactly where it belongs.</h2><span>One workspace for materials, equipment, teams and site accountability.</span></div><div className="showcase-stats"><div><b>3,182</b><span>Tracked items</span></div><div><b>04</b><span>Active locations</span></div><div><b>98%</b><span>Audit complete</span></div></div></aside>{success && <div className="portal-modal-backdrop"><div className="login-success-popup"><CheckCircle2 size={40} /><h2>Login successful</h2><p>Welcome back, redirecting to your workspace…</p></div></div>}</main>
}

*/

function PortalSignedOut({ onSignIn }: { onSignIn: (user: CurrentUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password) return setError('Enter your email address and password.')
    setError(''); setLoading(true)
    try {
      const response = await authAPI.login(email.trim(), password)
      if (!response.success) return setError(response.message || 'Login failed.')
      setSuccess(true)
      if (!response.token) return setError('Unable to start a secure session. Please try again.')
      window.localStorage.setItem('fieldstock-session-token', response.token as string)
      const user = response.data as CurrentUser
      window.setTimeout(() => { setSuccess(false); onSignIn(user) }, 1200)
    } catch {
      setError('Unable to reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  return <main className="portal-login"><section className="login-panel"><div className="portal-brand"><span><Boxes size={19} /></span><strong>FIELD<span>STOCK</span></strong></div><div className="login-welcome"><p>ASSET MANAGEMENT</p><h1>Welcome back</h1><span>Sign in to manage site stock, equipment, movements and inspections.</span></div><form onSubmit={submit}><label>Email address<span className="login-input"><Mail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" autoComplete="email" /></span></label><label>Password<span className="login-input"><LockKeyhole size={17} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" /></span></label>{error && <p className="login-error">{error}</p>}<div className="login-options"><label><input type="checkbox" defaultChecked /> Keep me signed in</label><button type="button">Forgot password?</button></div><button className="login-submit" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in to workspace'} <span>→</span></button></form><small className="login-security"><LockKeyhole size={13} /> Protected workspace access</small></section><aside className="login-showcase"><div className="showcase-brand">FIELDSTOCK <span>/ RIVERSIDE</span></div><div className="showcase-copy"><p>LIVE SITE CONTROL</p><h2>Every asset.<br />Exactly where it belongs.</h2><span>One workspace for materials, equipment, teams and site accountability.</span></div><div className="showcase-stats"><div><b>3,182</b><span>Tracked items</span></div><div><b>04</b><span>Active locations</span></div><div><b>98%</b><span>Audit complete</span></div></div></aside>{success && <div className="portal-modal-backdrop"><div className="login-success-popup"><CheckCircle2 size={40} /><h2>Login successful</h2><p>Welcome back, redirecting to your workspace...</p></div></div>}</main>
}

function PortalContent({ page, assets, assetLoadError, issueMovements, issueLoadError, issueQuery, setIssueQuery, issueStatus, setIssueStatus, transferMovements, transferLoadError, transferQuery, setTransferQuery, transferStatus, setTransferStatus, reportMovements, reportLoadError, returnMovements, returnLoadError, returnQuery, setReturnQuery, returnStatus, setReturnStatus, selected, query, setQuery, select, setModal, notify, onAssetUpdated }: { page: PortalPage; assets: AssetRecord[]; assetLoadError: string; issueMovements: IssueMovement[]; issueLoadError: string; issueQuery: string; setIssueQuery: (value: string) => void; issueStatus: string; setIssueStatus: (value: string) => void; transferMovements: TransferMovement[]; transferLoadError: string; transferQuery: string; setTransferQuery: (value: string) => void; transferStatus: string; setTransferStatus: (value: string) => void; reportMovements: ReportMovement[]; reportLoadError: string; returnMovements: ReturnMovement[]; returnLoadError: string; returnQuery: string; setReturnQuery: (value: string) => void; returnStatus: string; setReturnStatus: (value: string) => void; selected: AssetRecord | null; query: string; setQuery: (value: string) => void; select: (asset: AssetRecord | null) => void; setModal: (value: 'asset' | 'receive' | 'issue' | 'transfer' | 'return') => void; notify: (message: string) => void; onAssetUpdated: (asset: AssetRecord) => void }) {
  if (selected) return <PortalDetails asset={selected} back={() => select(null)} action={setModal} />
  if (page === 'Supplier Setup') return <PortalSupplierSetup />
  if (page === 'Dashboard') return <PortalDashboardDynamic assets={assets} movements={reportMovements} modal={setModal} />
  if (page === 'Asset Register' || page === 'Inventory') return <PortalRegister inventory={page === 'Inventory'} assets={assets} assetLoadError={assetLoadError} query={query} setQuery={setQuery} select={select} modal={setModal} onAssetUpdated={onAssetUpdated} transferMovements={transferMovements} />
  if (page === 'Assemblies') return <PortalAssemblies notify={notify} />
  if (page === 'QR Scanner') return <PortalScanner assets={assets} select={select} notify={notify} onAssetUpdated={onAssetUpdated} />
  if (page === 'Inspections') return <PortalInspections notify={notify} />
  if (page === 'Returns & Damage') return <PortalReturns movements={returnMovements} loadError={returnLoadError} query={returnQuery} setQuery={setReturnQuery} status={returnStatus} setStatus={setReturnStatus} openReturn={() => setModal('return')} />
  if (page === 'Receive Assets') return <PortalReceiveTable movements={reportMovements.filter((movement) => movement.type === 'receive')} openReceive={() => setModal('receive')} />
  if (page === 'Issue & Allocate') return <PortalIssuePage movements={issueMovements} loadError={issueLoadError} query={issueQuery} setQuery={setIssueQuery} status={issueStatus} setStatus={setIssueStatus} openIssue={() => setModal('issue')} />
  if (page === 'Transfers') return <PortalTransferPage movements={transferMovements} loadError={transferLoadError} query={transferQuery} setQuery={setTransferQuery} status={transferStatus} setStatus={setTransferStatus} openTransfer={() => setModal('transfer')} />
  if (page === 'Reports & Audit') return <PortalReports assets={assets} movements={reportMovements} loadError={reportLoadError} />
  return <PortalTransaction page={page} modal={setModal} issueMovements={issueMovements} issueLoadError={issueLoadError} issueQuery={issueQuery} setIssueQuery={setIssueQuery} issueStatus={issueStatus} setIssueStatus={setIssueStatus} transferMovements={transferMovements} transferLoadError={transferLoadError} transferQuery={transferQuery} setTransferQuery={setTransferQuery} transferStatus={transferStatus} setTransferStatus={setTransferStatus} />
}

export function PortalDashboard({ assets, select, modal }: { assets: AssetRecord[]; select: (asset: AssetRecord) => void; modal: (value: 'receive' | 'issue' | 'transfer') => void }) { return <><div className="portal-filters"><button>Riverside Commercial Hub <ChevronDown size={15} /></button><button>All sites <ChevronDown size={15} /></button><button>August 2026 <ChevronDown size={15} /></button></div><section className="portal-metrics"><PortalMetric label="Total asset value" value="AED 204,300" detail="Across 5 tracked assets" /><PortalMetric label="Available stock" value="3,182" detail="Across 4 site locations" /><PortalMetric label="Issued / in use" value="38" detail="12 due for return" tone="blue" /><PortalMetric label="Needs attention" value="3" detail="Low stock, damage, inspections" tone="amber" /></section><div className="portal-grid"><section className="portal-panel wide"><PortalHead eyebrow="LIVE ACTIVITY" title="Recent movement" action="View full audit" />{portalMovements.map(([id, name, route, time, status]) => <div className="portal-movement" key={id}><i><ArrowLeftRight size={16} /></i><div><b>{name}</b><small>{id} · {route}</small></div><span>{time}</span><PortalStatus value={status} /></div>)}</section><section className="portal-panel"><PortalHead eyebrow="STOCK ALERTS" title="Action required" />{[['Rebar 16 mm', 'Below minimum stock at Steel yard'], ['Tower scaffold set', 'Inspection due tomorrow'], ['Formwork panel', '4 units marked damaged']].map(([name, text]) => <div className="portal-alert" key={name}><i><AlertTriangle size={15} /></i><span><b>{name}</b><small>{text}</small></span></div>)}</section><section className="portal-panel wide"><PortalHead eyebrow="ASSET VISIBILITY" title="Assets by location" />{['Warehouse 01', 'Building B, Level 3', 'Steel yard', 'Zone A'].map((name, index) => <div className="location-bar" key={name}><span>{name}</span><i><b style={{ width: `${88 - index * 16}%` }} /></i><strong>{1280 - index * 220}</strong></div>)}</section><section className="portal-panel quick-actions"><PortalHead eyebrow="SITE ACTIONS" title="Record a transaction" /><button onClick={() => modal('receive')}><Truck size={17} /> Receive delivery</button><button onClick={() => modal('issue')}><UserRound size={17} /> Issue asset</button><button onClick={() => modal('transfer')}><ArrowLeftRight size={17} /> Transfer asset</button></section></div><section className="portal-panel asset-list"><PortalHead eyebrow="ASSET REGISTER" title="Recently updated assets" action="Open register" />{assets.slice(0, 4).map((asset) => <button onClick={() => select(asset)} key={asset.code}><div><b>{asset.name}</b><small>{asset.code} · {asset.type}</small></div><span>{asset.quantity} {asset.unit}</span><span>{asset.location}</span><PortalStatus value={asset.status} /></button>)}</section></> }
function PortalDashboardDynamic({ assets, movements, modal }: { assets: AssetRecord[]; movements: ReportMovement[]; modal: (value: 'receive' | 'issue' | 'transfer') => void }) { const [site, setSite] = useState('All sites'); const [range, setRange] = useState('All time'); const sites = Array.from(new Set(assets.map((asset) => asset.location).filter(Boolean))); const filteredAssets = assets.filter((asset) => site === 'All sites' || asset.location === site); const filteredMovements = movements.filter((movement) => { const matchesSite = site === 'All sites' || movement.fromLocation === site || movement.toLocation === site; if (range === 'All time') return matchesSite; const days = range === 'Last 7 days' ? 7 : 30; return matchesSite && Date.now() - new Date(movement.timestamp).getTime() <= days * 86400000 }); const totalValue = filteredAssets.reduce((total, asset) => total + asset.quantity * asset.unitCost, 0); const stock = filteredAssets.reduce((total, asset) => total + asset.quantity, 0); const inUse = filteredAssets.filter((asset) => asset.status === 'In use').reduce((total, asset) => total + asset.quantity, 0); const attention = filteredAssets.filter((asset) => ['Low stock', 'Damaged', 'Under inspection'].includes(asset.status)); const locationTotals = Object.entries(filteredAssets.reduce<Record<string, number>>((result, asset) => { result[asset.location] = (result[asset.location] || 0) + asset.quantity; return result }, {})).sort(([, first], [, second]) => second - first).slice(0, 4); const openAudit = () => { window.localStorage.setItem('fieldstock-page', 'Reports & Audit'); window.location.reload() }; return <><div className="portal-filters"><button>Riverside Commercial Hub <ChevronDown size={15} /></button><select value={site} onChange={(event) => setSite(event.target.value)}><option>All sites</option>{sites.map((item) => <option key={item}>{item}</option>)}</select><select value={range} onChange={(event) => setRange(event.target.value)}><option>All time</option><option>Last 7 days</option><option>Last 30 days</option></select></div><section className="portal-metrics"><PortalMetric label="Total asset value" value={`AED ${totalValue.toLocaleString()}`} detail={`Across ${filteredAssets.length} tracked assets`} /><PortalMetric label="Available stock" value={stock.toLocaleString()} detail={`Across ${locationTotals.length} active locations`} /><PortalMetric label="Issued / in use" value={inUse.toLocaleString()} detail={`${filteredMovements.filter((movement) => movement.type === 'issue').length} issue events`} tone="blue" /><PortalMetric label="Needs attention" value={attention.length.toString()} detail="Low stock, damage, inspections" tone="amber" /></section><div className="portal-grid"><section className="portal-panel wide"><div className="portal-head"><div><small>LIVE ACTIVITY</small><h2>Recent movement</h2></div><button onClick={openAudit}>View full audit</button></div>{filteredMovements.length === 0 ? <p className="issue-empty">No movement records found.</p> : filteredMovements.slice(0, 5).map((movement) => <div className="portal-movement" key={movement.id}><i><ArrowLeftRight size={16} /></i><div><b>{movement.assetName}</b><small>{movement.id} · {movement.fromLocation || movement.toLocation || movement.recipientName || 'No location recorded'}</small></div><span>{formatPortalDate(movement.timestamp)}</span><PortalStatus value={movement.status} /></div>)}</section><section className="portal-panel"><PortalHead eyebrow="STOCK ALERTS" title="Action required" />{attention.length === 0 ? <p className="issue-empty">No assets need attention.</p> : attention.slice(0, 5).map((asset) => <div className="portal-alert" key={asset.code}><i><AlertTriangle size={15} /></i><span><b>{asset.name}</b><small>{asset.status} at {asset.location}</small></span></div>)}</section><section className="portal-panel wide"><PortalHead eyebrow="ASSET VISIBILITY" title="Assets by location" />{locationTotals.length === 0 ? <p className="issue-empty">No location data found.</p> : locationTotals.map(([location, quantity]) => <div className="location-bar" key={location}><span>{location}</span><i><b style={{ width: `${Math.max(18, Math.min(100, quantity / Math.max(stock, 1) * 100))}%` }} /></i><strong>{quantity.toLocaleString()}</strong></div>)}</section><section className="portal-panel quick-actions"><PortalHead eyebrow="SITE ACTIONS" title="Record a transaction" /><button onClick={() => modal('receive')}><Truck size={17} /> Receive delivery</button><button onClick={() => modal('issue')}><UserRound size={17} /> Issue asset</button><button onClick={() => modal('transfer')}><ArrowLeftRight size={17} /> Transfer asset</button></section></div></> }
function PortalMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: string }) { return <article className={`portal-metric ${tone ?? ''}`}><small>{label}</small><strong>{value}</strong><span>{detail}</span></article> }
function PortalHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) { return <div className="portal-head"><div><small>{eyebrow}</small><h2>{title}</h2></div>{action && <button>{action}</button>}</div> }
function PortalStatus({ value }: { value: string }) { return <span className={`portal-status ${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span> }

function exportAssetsToExcel(assets: AssetRecord[], columns: string[]) {
  const escapeCell = (value: string | number) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const rows = assets.map((asset) => [asset.assetTagId, asset.code, asset.name, asset.type, asset.serial, asset.category, asset.department, asset.subcategory, asset.description, asset.manufacturer, asset.model, asset.warranty, asset.unit, asset.quantity, asset.minimum, asset.unitCost, asset.value, asset.supplier, formatPortalDate(asset.purchaseDate), formatPortalDate(asset.receiveDate), asset.project, asset.location, asset.status, asset.qrCode, asset.attachments, asset.remarks].map(escapeCell).join(','))
  const csv = ['\uFEFF' + columns.map(escapeCell).join(','), ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `asset-register-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function PortalRegister({ inventory, assets, assetLoadError, query, setQuery, select, modal, onAssetUpdated, transferMovements }: { inventory: boolean; assets: AssetRecord[]; assetLoadError: string; query: string; setQuery: (value: string) => void; select: (asset: AssetRecord) => void; modal: (value: 'asset' | 'receive') => void; onAssetUpdated: (asset: AssetRecord) => void; transferMovements: TransferMovement[] }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [editingAsset, setEditingAsset] = useState<AssetRecord | null>(null)
  const [locationFilter, setLocationFilter] = useState('All locations')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const pageSize = 10
  const filtered = assets.filter((asset) => JSON.stringify(asset).toLowerCase().includes(query.toLowerCase()) && (locationFilter === 'All locations' || asset.location === locationFilter) && (typeFilter === 'All types' || asset.type === typeFilter) && (statusFilter === 'All statuses' || asset.status === statusFilter))
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(currentPage, pageCount)
  const visibleAssets = filtered.slice((page - 1) * pageSize, page * pageSize)
  const firstAsset = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1
  const lastAsset = Math.min(page * pageSize, filtered.length)
  const updateQuery = (value: string) => { setQuery(value); setCurrentPage(1) }
  const updateFilter = (setter: (value: string) => void, value: string) => { setter(value); setCurrentPage(1) }
  const locations = [...new Set(assets.map((asset) => asset.location).filter(Boolean))]
  const types = [...new Set(assets.map((asset) => asset.type).filter(Boolean))]
  const statuses = [...new Set(assets.map((asset) => asset.status).filter(Boolean))]
  const getLocationHistory = (assetCode: string) => transferMovements.filter((movement) => movement.assetCode === assetCode).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((movement) => `${movement.fromLocation || 'Unknown'} \u2192 ${movement.toLocation || 'Unknown'} (${movement.quantity} ${movement.unit}) \u00b7 ${formatPortalDate(movement.timestamp)}`)
  useEffect(() => { const table = document.querySelector('.asset-master-table'); if (!table) return; const handleDoubleClick = (event: Event) => { const target = event.target as HTMLElement; const value = target.textContent?.trim() || ''; const asset = visibleAssets.find((item) => item.code === value); if (asset) select(asset) }; table.addEventListener('dblclick', handleDoubleClick); return () => table.removeEventListener('dblclick', handleDoubleClick) }, [visibleAssets, select])
  const columns = ['Asset tag ID', 'Asset ID', 'Asset name', 'Asset type', 'Serial number', 'Category', 'Department', 'Sub-category', 'Description', 'Make', 'Model', 'Warranty', 'Unit', 'Quantity', 'Minimum stock', 'Unit cost', 'Total value', 'Supplier', 'Order date', 'Receive date', 'Project', 'Current location', 'Status', 'QR / barcode', 'Photos / documents', 'Remarks']
  return <>
    <div className="portal-intro"><div><p>{inventory ? 'STOCK CONTROL' : 'ASSET MASTER'}</p><h2>{inventory ? 'Inventory by location' : 'All assets'}</h2><span>{inventory ? 'Opening, received, issued and available stock across active sites.' : 'All Asset Master fields are available in the register. Scroll horizontally to review the full record.'}</span></div><div className="portal-intro-actions"><button className="outline-action" type="button" onClick={() => exportAssetsToExcel(filtered, columns)}><FileSpreadsheet size={17} /> Export to Excel</button><button className="primary-action" onClick={() => modal(inventory ? 'receive' : 'asset')}><PackagePlus size={17} /> {inventory ? 'Receive assets' : 'Add asset'}</button></div></div>
    <div className="portal-toolbar"><label><Search size={17} /><input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Search asset ID, name, serial or QR" /></label><select value={locationFilter} onChange={(event) => updateFilter(setLocationFilter, event.target.value)} aria-label="Filter by location"><option>All locations</option>{locations.map((location) => <option key={location}>{location}</option>)}</select><select value={typeFilter} onChange={(event) => updateFilter(setTypeFilter, event.target.value)} aria-label="Filter by type"><option>All types</option>{types.map((type) => <option key={type}>{type}</option>)}</select><select value={statusFilter} onChange={(event) => updateFilter(setStatusFilter, event.target.value)} aria-label="Filter by status"><option>All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>
    {assetLoadError && <p className="login-error">{assetLoadError}</p>}<section className={`portal-panel portal-table asset-master-table${inventory ? ' inventory-view' : ''}`}><div className="portal-table-head">{columns.map((column) => <span key={column}>{column}</span>)}{inventory && <span>Location history</span>}<span>ACTIONS</span></div>{visibleAssets.map((asset) => <div className="asset-master-row" key={asset.code}><span>{asset.assetTagId}</span><span>{asset.code}</span><span><b>{asset.name}</b></span><span>{asset.type}</span><span>{asset.serial}</span><span>{asset.category}</span><span>{asset.department || 'Not recorded'}</span><span>{asset.subcategory}</span><span>{asset.description}</span><span>{asset.manufacturer}</span><span>{asset.model}</span><span>{asset.warranty || 'Not recorded'}</span><span>{asset.unit}</span><span>{asset.quantity}</span><span>{asset.minimum}</span><span>AED {asset.unitCost.toLocaleString()}</span><span>{asset.value}</span><span>{asset.supplier}</span><span>{formatPortalDate(asset.purchaseDate)}</span><span>{formatPortalDate(asset.receiveDate)}</span><span>{asset.project}</span><span>{asset.location}</span><PortalStatus value={asset.status} /><span>{asset.qrCode}</span><span>{asset.attachments}</span><span>{asset.remarks}</span>{inventory && <span className="location-history">{(() => { const history = getLocationHistory(asset.code); return history.length ? history.map((entry, index) => <small key={index}>{entry}</small>) : 'No transfers recorded' })()}</span>}<span className="row-actions"><button type="button" onClick={() => setEditingAsset(asset)}>Edit</button><button type="button" onClick={() => void deleteAssetRecord(asset)}>Delete</button></span></div>)}</section>
    <nav className="portal-pagination" aria-label="Asset register pages"><span>Showing {firstAsset}-{lastAsset} of {filtered.length} assets</span><div><button type="button" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={page === 1}>Previous</button><strong>Page {page} of {pageCount}</strong><button type="button" onClick={() => setCurrentPage((value) => Math.min(pageCount, value + 1))} disabled={page === pageCount}>Next</button></div></nav>
    {editingAsset && <AssetEditModal asset={editingAsset} close={() => setEditingAsset(null)} onSaved={(asset) => { onAssetUpdated(asset); setEditingAsset(null); select(asset) }} />}
  </>
}

function PortalTransaction({ page, modal, issueMovements, issueLoadError, issueQuery, setIssueQuery, issueStatus, setIssueStatus, transferMovements, transferLoadError, transferQuery, setTransferQuery, transferStatus, setTransferStatus }: { page: PortalPage; modal: (value: 'receive' | 'issue' | 'transfer') => void; issueMovements: IssueMovement[]; issueLoadError: string; issueQuery: string; setIssueQuery: (value: string) => void; issueStatus: string; setIssueStatus: (value: string) => void; transferMovements: TransferMovement[]; transferLoadError: string; transferQuery: string; setTransferQuery: (value: string) => void; transferStatus: string; setTransferStatus: (value: string) => void }) { const kind = page === 'Receive Assets' ? 'receive' : page === 'Issue & Allocate' ? 'issue' : 'transfer'; const Icon = kind === 'receive' ? Truck : kind === 'issue' ? UserRound : ArrowLeftRight; const heading = kind === 'receive' ? 'Receive a delivery' : kind === 'issue' ? 'Issue to a responsible party' : 'Transfer between locations'; return <div className="transaction-layout"><section className="portal-panel transaction-card"><i><Icon size={27} /></i><p>{kind === 'receive' ? 'GRN & DELIVERIES' : kind === 'issue' ? 'ASSET ALLOCATION' : 'LOCATION MOVEMENT'}</p><h2>{heading}</h2><span>{kind === 'receive' ? 'Record supplier deliveries to automatically increase inventory.' : kind === 'issue' ? 'Allocate tools, materials and equipment with accountability and return dates.' : 'Move assets between warehouses, sites, buildings, floors and work areas.'}</span><dl><div><dt>Project</dt><dd>Riverside Commercial Hub</dd></div><div><dt>Responsible user</dt><dd>Alex Rivera</dd></div></dl><button className="primary-action" onClick={() => modal(kind)}>New {kind === 'receive' ? 'receiving' : kind}</button></section>{kind === 'issue' ? <PortalIssueTable movements={issueMovements} loadError={issueLoadError} query={issueQuery} setQuery={setIssueQuery} status={issueStatus} setStatus={setIssueStatus} /> : kind === 'transfer' ? <PortalTransferTable movements={transferMovements} loadError={transferLoadError} query={transferQuery} setQuery={setTransferQuery} status={transferStatus} setStatus={setTransferStatus} /> : <section className="portal-panel transaction-guide"><PortalHead eyebrow="REQUIRED RECORD" title="Transaction details" /><div className="field-grid">{['Asset / QR code', 'Project', 'Supplier / purchase order', 'To location', 'Quantity and unit', 'Date and time'].map((label) => <label key={label}><small>{label}</small><span>{label === 'Project' ? 'Riverside Commercial Hub' : 'Select or enter value'}<ChevronDown size={14} /></span></label>)}</div><div className="compliance-note"><Camera size={18} />Attach delivery notes, photos, approval and digital signature when required.</div></section>}</div> }

function PortalIssueTable({ movements, loadError, query, setQuery, status, setStatus }: { movements: IssueMovement[]; loadError: string; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void }) { const filtered = movements.filter((movement) => JSON.stringify(movement).toLowerCase().includes(query.toLowerCase()) && (status === 'All' || movement.status === status)); return <section className="portal-panel portal-table issue-table"><PortalHead eyebrow="ISSUE HISTORY" title="Issued assets" action="View full audit" /><div className="issue-filters"><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search issue, asset or recipient" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Issued</option><option>Pending</option></select></div>{loadError && <p className="login-error">{loadError}</p>}<div className="portal-table-head"><span>ISSUE ID</span><span>ASSET</span><span>RECIPIENT / LOCATION</span><span>BILL NO</span><span>QUANTITY</span><span>DATE</span><span>STATUS</span><span>ACTIONS</span></div>{filtered.length === 0 ? <p className="issue-empty">No issue records match the current filters.</p> : filtered.map((movement) => <div key={movement.id}><span><b>{movement.id}</b></span><span>{movement.assetName} <small>{movement.assetCode}</small></span><span>{movement.recipientName || movement.fromLocation || 'Not recorded'}</span><span>{movement.billNo || 'Not recorded'}</span><span>{movement.quantity} {movement.unit}</span><span>{formatPortalDate(movement.timestamp)}</span><PortalStatus value={movement.status} /><span className="row-actions"><button type="button" onClick={() => void editMovementRecord(movement)}>Edit</button><button type="button" onClick={() => void deleteMovementRecord(movement)}>Delete</button></span></div>)}</section> }

function PortalTransferTable({ movements, loadError, query, setQuery, status, setStatus }: { movements: TransferMovement[]; loadError: string; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void }) { const [editingTransfer, setEditingTransfer] = useState<TransferMovement | null>(null); const filtered = movements.filter((movement) => JSON.stringify(movement).toLowerCase().includes(query.toLowerCase()) && (status === 'All' || movement.status === status)); useEffect(() => { const table = document.querySelector('.transfer-table'); if (!table) return; const handleDoubleClick = (event: Event) => { const target = event.target as HTMLElement; const value = target.textContent?.trim() || ''; const movement = filtered.find((item) => item.id === value); if (movement) setEditingTransfer(movement) }; table.addEventListener('dblclick', handleDoubleClick); return () => table.removeEventListener('dblclick', handleDoubleClick) }, [filtered]); return <section className="portal-panel portal-table issue-table transfer-table"><PortalHead eyebrow="TRANSFER HISTORY" title="Transferred assets" action="View full audit" /><div className="issue-filters"><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transfer, asset or location" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Transferred</option><option>Pending</option></select></div>{loadError && <p className="login-error">{loadError}</p>}<div className="portal-table-head"><span>TRANSFER ID</span><span>ASSET</span><span>FROM LOCATION</span><span>TO LOCATION</span><span>QUANTITY</span><span>DATE</span><span>STATUS</span></div>{filtered.length === 0 ? <p className="issue-empty">No transfer records match the current filters.</p> : filtered.map((movement) => <div className="transfer-row" key={movement.id}><span><b>{movement.id}</b></span><span>{movement.assetName} <small>{movement.assetCode}</small></span><span>{movement.fromLocation || 'Not recorded'}</span><span>{movement.toLocation || 'Not recorded'}</span><span>{movement.quantity} {movement.unit}</span><span>{formatPortalDate(movement.timestamp)}</span><PortalStatus value={movement.status} /></div>)}{editingTransfer && <TransferEditModal movement={editingTransfer} close={() => setEditingTransfer(null)} />}</section> }

function PortalSupplierSetup() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [query, setQuery] = useState('')
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadSuppliers = () => {
    setLoading(true)
    supplierAPI.getAll()
      .then((response) => {
        if (!response.success) throw new Error(response.message || 'Unable to load suppliers.')
        setSuppliers(response.data as SupplierRecord[])
        setLoadError('')
      })
      .catch(() => setLoadError('Unable to load suppliers from the server.'))
      .finally(() => setLoading(false))
  }

  useEffect(loadSuppliers, [])

  const filtered = suppliers.filter((supplier) =>
    `${supplier.companyName} ${supplier.contactPerson} ${supplier.email} ${supplier.phone} ${supplier.taxId}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )

  const registerSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setLoading(true)
    setLoadError('')
    try {
      const response = await supplierAPI.create({
        companyName: String(fields.get('companyName') || '').trim(),
        contactPerson: String(fields.get('contactPerson') || '').trim(),
        email: String(fields.get('email') || '').trim(),
        phone: String(fields.get('phone') || '').trim(),
        taxId: String(fields.get('taxId') || '').trim(),
        address: String(fields.get('address') || '').trim(),
        notes: String(fields.get('notes') || '').trim(),
        status: String(fields.get('status') || 'Active'),
      })
      if (!response.success || !response.data?._id) {
        setLoadError(response.message || 'Unable to register supplier.')
        return
      }

      setSuppliers((items) => [...items, response.data as SupplierRecord].sort((first, second) => first.companyName.localeCompare(second.companyName)))
      setModalOpen(false)

      const refreshed = await supplierAPI.getAll()
      if (refreshed.success) setSuppliers(refreshed.data as SupplierRecord[])
    } catch {
      setLoadError('Unable to save the supplier. Check the server connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return <>
    <div className="portal-intro">
      <div><p>VENDOR DIRECTORY</p><h2>Supplier Setup</h2><span>Register suppliers and keep their contact details together.</span></div>
      <button className="primary-action" type="button" onClick={() => { setLoadError(''); setModalOpen(true) }}><PackagePlus size={17} /> Register supplier</button>
    </div>
    <section className="portal-panel portal-table issue-table supplier-table">
      <div className="portal-head"><div><small>SUPPLIER DIRECTORY</small><h2>Registered suppliers ({suppliers.length})</h2></div></div>
      <div className="issue-filters"><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search suppliers, contacts, email or tax ID" /></label></div>
      {loadError && <p className="login-error">{loadError}</p>}
      <div className="supplier-table-head"><span>SUPPLIER</span><span>CONTACT PERSON</span><span>EMAIL</span><span>PHONE</span><span>TAX ID</span><span>STATUS</span></div>
      {loading && suppliers.length === 0 ? <p className="issue-empty">Loading suppliers...</p> : filtered.length === 0 ? <p className="issue-empty">No suppliers match this search.</p> : filtered.map((supplier) => <div className="supplier-row" key={supplier._id}><span><b>{supplier.companyName}</b><small>{supplier.address || 'No address recorded'}</small></span><span>{supplier.contactPerson || 'Not recorded'}</span><span>{supplier.email || 'Not recorded'}</span><span>{supplier.phone || 'Not recorded'}</span><span>{supplier.taxId || 'Not recorded'}</span><PortalStatus value={supplier.status} /></div>)}
    </section>
    {modalOpen && <div className="portal-modal-backdrop"><form className="portal-modal" onSubmit={registerSupplier}>
      <div><span><p>VENDOR DIRECTORY</p><h2>Register supplier</h2></span><button className="icon-button" type="button" onClick={() => setModalOpen(false)} aria-label="Close supplier form"><X size={18} /></button></div>
      <section>
        <label>Supplier name<input name="companyName" required autoFocus placeholder="Company or supplier name" /></label>
        <label>Contact person<input name="contactPerson" placeholder="Full name" /></label>
        <label>Email<input name="email" type="email" placeholder="name@company.com" /></label>
        <label>Phone<input name="phone" type="tel" placeholder="Phone number" /></label>
        <label>Tax ID<input name="taxId" placeholder="Tax registration number" /></label>
        <label>Status<select name="status" defaultValue="Active"><option>Active</option><option>Inactive</option></select></label>
        <label className="wide">Address<textarea name="address" placeholder="Supplier address" /></label>
        <label className="wide">Notes<textarea name="notes" placeholder="Payment terms or other notes" /></label>
      </section>
      <footer><button className="outline-action" type="button" onClick={() => setModalOpen(false)}>Cancel</button><button className="primary-action" type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register supplier'}</button></footer>
    </form></div>}
  </>
}

function PortalAssemblies({ notify }: { notify: (message: string) => void }) {
  const [assemblies, setAssemblies] = useState<AssemblyRecord[]>([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [listQuery, setListQuery] = useState('')
  const [listStatus, setListStatus] = useState('All')
  const [detailsAssembly, setDetailsAssembly] = useState<AssemblyRecord | null>(null)

  const load = () => {
    setLoading(true)
    assemblyAPI.getAll()
      .then((response) => {
        if (!response.success) throw new Error(response.message || 'Unable to load assemblies.')
        const data = response.data as AssemblyRecord[]
        setAssemblies(data)
        setLoadError('')
        setSelectedId((current) => (current && data.some((item) => item._id === current) ? current : data[0]?._id ?? null))
      })
      .catch(() => setLoadError('Unable to load assemblies from the server.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const selected = assemblies.find((item) => item._id === selectedId) || null

  const updateComponent = async (componentName: string, onAssembly: number, condition: string) => {
    if (!selected?._id) return
    try {
      const response = await assemblyAPI.updateComponent(selected._id, { componentName, onAssembly, condition })
      if (!response.success) { notify(response.message || 'Unable to update component.'); return }
      const updated = response.data as AssemblyRecord
      setAssemblies((items) => items.map((item) => (item._id === updated._id ? updated : item)))
      notify('Component updated and saved to the database.')
    } catch {
      notify('Unable to reach the server. Please try again.')
    }
  }

  const adjustQuantity = (component: AssemblyComponent, delta: number) => {
    const next = Math.max(0, Math.min(component.required, component.onAssembly + delta))
    const condition = next === component.required ? 'Pass' : next === 0 ? 'Missing' : component.condition === 'Damaged' ? 'Damaged' : 'Missing'
    void updateComponent(component.componentName, next, condition)
  }

  const cycleCondition = (component: AssemblyComponent) => {
    const order = ['Pass', 'Damaged', 'Missing']
    const next = order[(order.indexOf(component.condition) + 1) % order.length]
    void updateComponent(component.componentName, component.onAssembly, next)
  }

  const deleteAssembly = async () => {
    if (!selected?._id || !window.confirm(`Delete assembly ${selected.name}? This cannot be undone.`)) return
    const response = await assemblyAPI.delete(selected._id)
    if (!response.success) { notify(response.message || 'Unable to delete assembly.'); return }
    notify('Assembly deleted from the database.')
    load()
  }

  const statusOptions = Array.from(new Set(assemblies.map((assembly) => assembly.status)))
  const filteredAssemblies = assemblies.filter((assembly) => JSON.stringify(assembly).toLowerCase().includes(listQuery.toLowerCase()) && (listStatus === 'All' || assembly.status === listStatus))

  return <>
    <div className="portal-intro"><div><p>ASSEMBLY & COMPONENT TRACKING</p><h2>Scaffolding and formwork</h2><span>Track parent assemblies, required components, condition and inspection readiness.</span></div><button className="primary-action" onClick={() => setShowCreate(true)}><PackagePlus size={17} /> Create assembly</button></div>
    {loadError && <p className="login-error">{loadError}</p>}
    {loading ? <p className="issue-empty">Loading assemblies...</p> : assemblies.length === 0 ? <section className="portal-panel"><p className="issue-empty">No assemblies recorded yet. Create one to start tracking components.</p></section> : <div className="assembly-grid">
      <section className="portal-panel assembly-card">
        {assemblies.length > 1 && <div className="assembly-picker">{assemblies.map((assembly) => <button type="button" key={assembly._id} className={assembly._id === selectedId ? 'active' : ''} onClick={() => setSelectedId(assembly._id ?? null)}><span>{assembly.name}</span><PortalStatus value={assembly.status} /></button>)}</div>}
        {selected && <><div><i><HardHat size={26} /></i><PortalStatus value={selected.status} /></div>
          <h2>{selected.name}</h2>
          <p>{selected.code} · {selected.type} · {selected.project}</p>
          <span><MapPin size={15} /> {selected.location}</span>
          <span><ClipboardCheck size={15} /> {selected.lastInspection ? `Inspected ${formatPortalDate(selected.lastInspection)}` : 'Not yet inspected'}</span>
          <button className="outline-action" onClick={() => setShowQr(true)}><QrCode size={17} /> View assembly QR</button>
          <button className="outline-action" onClick={() => void deleteAssembly()}><X size={15} /> Delete assembly</button>
        </>}
      </section>
      <section className="portal-panel component-table">
        <PortalHead eyebrow="PARENT ASSEMBLY" title="Required components" />
        <div className="component-row header"><span>COMPONENT</span><span>REQUIRED</span><span>ON ASSEMBLY</span><span>CONDITION</span></div>
        {selected?.components.map((component) => <div className="component-row" key={component.componentName}>
          <b>{component.componentName}</b>
          <span>{component.required}</span>
          <span className="component-stepper"><button type="button" onClick={() => adjustQuantity(component, -1)} aria-label={`Decrease ${component.componentName}`}>-</button>{component.onAssembly}<button type="button" onClick={() => adjustQuantity(component, 1)} aria-label={`Increase ${component.componentName}`}>+</button></span>
          <button type="button" className="condition-toggle" onClick={() => cycleCondition(component)}><PortalStatus value={component.condition} /></button>
        </div>)}
      </section>
    </div>}
    {!loading && <section className="portal-panel portal-table issue-table assembly-list-table">
      <PortalHead eyebrow="ALL ASSEMBLIES" title={`Assemblies created (${assemblies.length})`} />
      <div className="issue-filters"><label><Search size={15} /><input value={listQuery} onChange={(event) => setListQuery(event.target.value)} placeholder="Search assembly, code, location or project" /></label><select value={listStatus} onChange={(event) => setListStatus(event.target.value)}><option>All</option>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></div>
      <div className="assembly-table-head"><span>ASSEMBLY</span><span>CODE</span><span>TYPE</span><span>PROJECT</span><span>LOCATION</span><span>COMPONENTS</span><span>STATUS</span></div>
      {filteredAssemblies.length === 0 ? <p className="issue-empty">No assemblies match the current filters.</p> : filteredAssemblies.map((assembly) => <div className="assembly-table-row" key={assembly._id}>
        <span className="assembly-name-link" onClick={() => setDetailsAssembly(assembly)}><b>{assembly.name}</b></span>
        <span>{assembly.code}</span>
        <span>{assembly.type}</span>
        <span>{assembly.project}</span>
        <span>{assembly.location}</span>
        <span>{assembly.components.filter((component) => component.onAssembly === component.required).length}/{assembly.components.length} complete</span>
        <PortalStatus value={assembly.status} />
      </div>)}
      <p className="assembly-list-summary">Showing {filteredAssemblies.length} of {assemblies.length} assemblies</p>
    </section>}
    {showCreate && <AssemblyCreateModal close={() => setShowCreate(false)} onCreated={(assembly) => { setAssemblies((items) => [assembly, ...items]); setSelectedId(assembly._id ?? null); setShowCreate(false); notify('Assembly created and saved to the database.') }} />}
    {showQr && selected && <div className="portal-modal-backdrop"><div className="portal-modal qr-modal"><div><span><p>ASSEMBLY QR</p><h2>{selected.name}</h2></span><button className="icon-button" type="button" onClick={() => setShowQr(false)} aria-label="Close QR view"><X size={18} /></button></div><div className="qr-modal-body"><QrCode size={140} /><p>{selected.qrCode && selected.qrCode !== 'Not recorded' ? selected.qrCode : selected.code}</p></div></div></div>}
    {detailsAssembly && <AssemblyDetailsModal assembly={detailsAssembly} close={() => setDetailsAssembly(null)} />}
  </>
}

function AssemblyDetailsModal({ assembly, close }: { assembly: AssemblyRecord; close: () => void }) {
  return <div className="portal-modal-backdrop"><div className="portal-modal assembly-details-modal">
    <div><span><p>ASSEMBLY DETAILS</p><h2>{assembly.name}</h2></span><button className="icon-button" type="button" onClick={close} aria-label="Close assembly details"><X size={18} /></button></div>
    <div className="detail-list">
      <div><dt>Code</dt><dd>{assembly.code}</dd></div>
      <div><dt>Type</dt><dd>{assembly.type}</dd></div>
      <div><dt>Status</dt><dd><PortalStatus value={assembly.status} /></dd></div>
      <div><dt>Project</dt><dd>{assembly.project}</dd></div>
      <div><dt>Location</dt><dd>{assembly.location}</dd></div>
      <div><dt>Description</dt><dd>{assembly.description || 'Not recorded'}</dd></div>
      <div><dt>Last inspection</dt><dd>{assembly.lastInspection ? formatPortalDate(assembly.lastInspection) : 'Not yet inspected'}</dd></div>
      <div><dt>Next inspection due</dt><dd>{assembly.nextInspectionDue ? formatPortalDate(assembly.nextInspectionDue) : 'Not scheduled'}</dd></div>
      <div><dt>QR code</dt><dd>{assembly.qrCode && assembly.qrCode !== 'Not recorded' ? assembly.qrCode : assembly.code}</dd></div>
      <div><dt>Remarks</dt><dd>{assembly.remarks || 'No remarks'}</dd></div>
    </div>
    <h3>Components</h3>
    <div className="component-row header"><span>COMPONENT</span><span>REQUIRED</span><span>ON ASSEMBLY</span><span>CONDITION</span></div>
    {assembly.components.map((component) => <div className="component-row" key={component.componentName}><b>{component.componentName}</b><span>{component.required}</span><span>{component.onAssembly}</span><PortalStatus value={component.condition} /></div>)}
    <footer><button className="outline-action" type="button" onClick={close}>Close</button></footer>
  </div></div>
}

function AssemblyCreateModal({ close, onCreated }: { close: () => void; onCreated: (assembly: AssemblyRecord) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('Scaffolding')
  const [location, setLocation] = useState('')
  const [project, setProject] = useState('Riverside Commercial Hub')
  const [description, setDescription] = useState('')
  const [components, setComponents] = useState([{ componentName: '', required: 1 }])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const updateRow = (index: number, field: 'componentName' | 'required', value: string) => setComponents((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: field === 'required' ? Number(value) : value } : row)))
  const addRow = () => setComponents((rows) => [...rows, { componentName: '', required: 1 }])
  const removeRow = (index: number) => setComponents((rows) => rows.filter((_, i) => i !== index))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validComponents = components.filter((row) => row.componentName.trim())
    if (!name.trim() || !location.trim() || validComponents.length === 0) { setError('Enter a name, location and at least one component.'); return }
    setLoading(true)
    setError('')
    try {
      const response = await assemblyAPI.create({
        code: `SCAF-${Date.now().toString().slice(-6)}`,
        name: name.trim(),
        type,
        location: location.trim(),
        project: project.trim() || 'Riverside Commercial Hub',
        description: description.trim(),
        components: validComponents.map((row) => ({ componentName: row.componentName.trim(), required: row.required, onAssembly: row.required, condition: 'Pass' })),
        createdBy: 'Alex Rivera',
      })
      if (!response.success) { setError(response.message || 'Unable to create assembly.'); return }
      onCreated(response.data as AssemblyRecord)
    } catch {
      setError('Unable to reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <div className="portal-modal-backdrop"><form className="portal-modal" onSubmit={submit}>
    <div><span><p>ASSEMBLY & COMPONENT TRACKING</p><h2>Create assembly</h2></span><button className="icon-button" type="button" onClick={close} aria-label="Close create assembly form"><X size={18} /></button></div>
    <section>
      <label>Assembly name<input value={name} onChange={(event) => setName(event.target.value)} required placeholder="e.g. Facade Scaffold Assembly" /></label>
      <label>Type<select value={type} onChange={(event) => setType(event.target.value)}><option>Scaffolding</option><option>Formwork</option><option>Other</option></select></label>
      <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} required placeholder="e.g. Building B, Level 3" /></label>
      <label>Project<input value={project} onChange={(event) => setProject(event.target.value)} /></label>
      <label className="wide">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Assembly notes" /></label>
    </section>
    <section className="assembly-component-rows">
      <h3>Required components</h3>
      {components.map((row, index) => <div className="assembly-component-row" key={index}>
        <input value={row.componentName} onChange={(event) => updateRow(index, 'componentName', event.target.value)} placeholder="Component name" />
        <input type="number" min="0" value={row.required} onChange={(event) => updateRow(index, 'required', event.target.value)} />
        <button type="button" onClick={() => removeRow(index)} disabled={components.length === 1} aria-label="Remove component row">×</button>
      </div>)}
      <button type="button" className="portal-link" onClick={addRow}>+ Add component</button>
    </section>
    {error && <p className="login-error">{error}</p>}
    <footer><button className="outline-action" type="button" onClick={close} disabled={loading}>Cancel</button><button className="primary-action" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create assembly'}</button></footer>
  </form></div>
}

function PortalScanner({ assets, select, notify, onAssetUpdated }: { assets: AssetRecord[]; select: (asset: AssetRecord) => void; notify: (message: string) => void; onAssetUpdated: (asset: AssetRecord) => void }) {
  const [code, setCode] = useState('SCAF-000125')
  const [libraryQuery, setLibraryQuery] = useState('')
  const [genAssetCode, setGenAssetCode] = useState('')
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState('')
  const qrCanvasRef = useRef<HTMLDivElement>(null)
  const found = assets.find((asset) => asset.code.toLowerCase() === code.toLowerCase())
  const qrValue = (asset: AssetRecord) => (asset.qrCode && asset.qrCode !== 'Not recorded' ? asset.qrCode : asset.code)
  const libraryAssets = assets.filter((asset) => `${asset.code} ${asset.name} ${asset.qrCode}`.toLowerCase().includes(libraryQuery.toLowerCase()))

  const generateQrCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const asset = assets.find((item) => item.code.toLowerCase() === genAssetCode.trim().toLowerCase())
    if (!asset) { setGenError('Enter or select a valid asset ID / code.'); return }
    if (!asset._id) { setGenError('This asset has no database ID yet.'); return }
    setGenLoading(true)
    setGenError('')
    try {
      const newQrCode = `QR-${asset.code}-${Date.now().toString().slice(-5)}`
      const response = await assetAPI.update(asset._id, { qrCode: newQrCode })
      if (!response.success) { setGenError(response.message || 'Unable to generate a QR code.'); return }
      const updated = response.data as AssetRecord
      onAssetUpdated(updated)
      setCode(updated.code)
      setGenAssetCode('')
      notify(`New QR code generated for ${updated.name}.`)
    } catch {
      setGenError('Unable to reach the server. Please try again.')
    } finally {
      setGenLoading(false)
    }
  }

  const downloadQr = () => {
    const canvas = qrCanvasRef.current?.querySelector('canvas')
    if (!canvas || !found) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `${found.code}-qr.png`
    link.click()
  }

  return <>
    <div className="scanner-layout">
      <section className="portal-panel scan-panel">
        <p>QR / BARCODE LOOKUP</p><h2>Identify an asset on site</h2><span>Scan a code to open its current status, location, responsibility and recent activity.</span>
        <div className="scanner-frame">{found ? <QRCodeSVG value={qrValue(found)} size={150} level="M" /> : <QrCode size={94} />}<i /><i /><i /><i /></div>
        <label><Search size={17} /><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter asset ID or QR code" /></label>
        {found && <>
          <div ref={qrCanvasRef} className="qr-hidden-canvas"><QRCodeCanvas value={qrValue(found)} size={256} level="M" /></div>
          <button type="button" className="outline-action" onClick={downloadQr}><QrCode size={15} /> Download QR (PNG)</button>
        </>}
      </section>
      <section className="portal-panel scan-result">
        <PortalHead eyebrow={found ? 'ASSET FOUND' : 'NO MATCH'} title={found ? found.name : 'No asset found'} />
        {found ? <><div className="scan-identity"><i><HardHat size={24} /></i><div><b>{found.code}</b><small>{found.type} · {found.serial ?? 'Assembly QR registered'}</small></div><PortalStatus value={found.status} /></div><dl><div><dt>Current location</dt><dd>{found.location}</dd></div><div><dt>Assigned party</dt><dd>{found.status === 'In use' ? 'Earthworks team' : 'Unassigned'}</dd></div><div><dt>Inspection state</dt><dd>Pass · Next due 28 Sep 2026</dd></div></dl><button className="primary-action" onClick={() => select(found)}><Boxes size={16} /> View asset details</button></> : <span>Try SCAF-000125, MAC-021 or STL-016.</span>}
      </section>
    </div>
    <section className="portal-panel qr-generate">
      <PortalHead eyebrow="NEW ASSET QR" title="Generate a QR code for an asset" />
      <span className="qr-generate-hint">Pick an asset already in the register (create it first from Asset Register if it's new) and generate a unique QR code that gets saved to its record.</span>
      <form className="qr-generate-form" onSubmit={(event) => void generateQrCode(event)}>
        <label>Asset ID / code<input value={genAssetCode} list="qr-generate-asset-codes" onChange={(event) => setGenAssetCode(event.target.value)} placeholder="Select or enter asset code" required /><datalist id="qr-generate-asset-codes">{assets.map((asset) => <option key={asset.code} value={asset.code}>{asset.name}</option>)}</datalist></label>
        <button className="primary-action" type="submit" disabled={genLoading}>{genLoading ? 'Generating...' : 'Generate QR code'}</button>
      </form>
      {genError && <p className="login-error">{genError}</p>}
    </section>
    <section className="portal-panel qr-library">
      <PortalHead eyebrow="QR CODE LIBRARY" title={`Generated codes (${libraryAssets.length})`} />
      <div className="issue-filters"><label><Search size={15} /><input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="Search asset name, code or QR value" /></label></div>
      <div className="qr-library-grid">
        {libraryAssets.map((asset) => <button type="button" className="qr-library-card" key={asset.code} onClick={() => setCode(asset.code)}>
          <QRCodeSVG value={qrValue(asset)} size={104} level="M" />
          <b>{asset.name}</b>
          <span>{asset.code}</span>
          <small>{qrValue(asset)}</small>
        </button>)}
        {libraryAssets.length === 0 && <p className="issue-empty">No assets match this search.</p>}
      </div>
    </section>
  </>
}

function PortalInspections({ notify }: { notify: (message: string) => void }) {
  const [inspections, setInspections] = useState<InspectionRecord[]>([])
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = () => {
    setLoading(true)
    inspectionAPI.getAll()
      .then((response) => {
        if (!response.success) throw new Error(response.message || 'Unable to load inspections.')
        const data = response.data as InspectionRecord[]
        setInspections(data)
        setLoadError('')
        setSelectedId((current) => (current && data.some((item) => item._id === current) ? current : data[0]?._id ?? null))
      })
      .catch(() => setLoadError('Unable to load inspections from the server.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])
  useEffect(() => { assetAPI.getAll().then((response) => { if (response.success) setAssets(response.data as AssetRecord[]) }).catch(() => undefined) }, [])

  const selected = inspections.find((item) => item._id === selectedId) || null

  const persist = async (payload: Record<string, unknown>, successMessage: string) => {
    if (!selected?._id) return
    try {
      const response = await inspectionAPI.update(selected._id, payload)
      if (!response.success) { notify(response.message || 'Unable to update inspection.'); return }
      const updated = response.data as InspectionRecord
      setInspections((items) => items.map((item) => (item._id === updated._id ? updated : item)))
      notify(successMessage)
    } catch {
      notify('Unable to reach the server. Please try again.')
    }
  }

  const toggleChecklistItem = (index: number) => {
    if (!selected) return
    const checklist = selected.checklist.map((entry, i) => (i === index ? { ...entry, checked: !entry.checked } : entry))
    void persist({ checklist }, 'Checklist updated and saved to the database.')
  }

  const updateCondition = (condition: string) => {
    void persist({ condition }, 'Condition updated and saved to the database.')
  }

  const assignCorrectiveAction = () => {
    if (!selected) return
    const action = window.prompt('Corrective action description')
    if (!action) return
    const assignedTo = window.prompt('Assign to') || 'Site supervisor'
    const correctionActions = [...selected.correctionActions, { action, assignedTo, completed: false }]
    void persist({ correctionActions, status: 'Needs Repair' }, 'Corrective action assigned and saved to the database.')
  }

  return <>
    <div className="portal-intro"><div><p>SAFETY & CONDITION</p><h2>Inspections</h2><span>Complete reusable asset and assembly inspection checklists before use.</span></div><button className="primary-action" onClick={() => setShowCreate(true)}><ClipboardCheck size={17} /> Start inspection</button></div>
    {loadError && <p className="login-error">{loadError}</p>}
    {loading ? <p className="issue-empty">Loading inspections...</p> : inspections.length === 0 ? <section className="portal-panel"><p className="issue-empty">No inspections recorded yet. Start one to build the safety history.</p></section> : <section className="portal-panel inspection">
      <div>
        {inspections.length > 1 && <div className="assembly-picker">{inspections.map((inspection) => <button type="button" key={inspection._id} className={inspection._id === selectedId ? 'active' : ''} onClick={() => setSelectedId(inspection._id ?? null)}><span>{inspection.assetName}</span><PortalStatus value={inspection.status} /></button>)}</div>}
        {selected && <><i><ShieldCheck size={25} /></i><h2>{selected.assetName}</h2><p>{selected.assetCode} · {selected.location}</p><PortalStatus value={selected.status} /></>}
      </div>
      {selected && <div>
        {selected.checklist.map((entry, index) => <label key={entry.item}><input type="checkbox" checked={entry.checked} onChange={() => toggleChecklistItem(index)} />{entry.item}</label>)}
        <label>Condition<select value={selected.condition} onChange={(event) => updateCondition(event.target.value)}><option>Good</option><option>Fair</option><option>Poor</option></select></label>
      </div>}
      {selected && <aside>
        <small>LAST INSPECTION</small><b>{formatPortalDate(selected.inspectionDate)}</b>
        <small>INSPECTOR</small><b>{selected.inspector?.name || 'Not recorded'}</b>
        {selected.correctionActions.length > 0 && <><small>CORRECTIVE ACTIONS</small>{selected.correctionActions.map((action, index) => <b key={index}>{action.action} · {action.assignedTo}</b>)}</>}
        <button className="outline-action" onClick={assignCorrectiveAction}>Assign corrective action</button>
      </aside>}
    </section>}
    {showCreate && <InspectionCreateModal assets={assets} close={() => setShowCreate(false)} onCreated={(inspection) => { setInspections((items) => [inspection, ...items]); setSelectedId(inspection._id ?? null); setShowCreate(false); notify('Inspection recorded and saved to the database.') }} />}
  </>
}

function InspectionCreateModal({ assets, close, onCreated }: { assets: AssetRecord[]; close: () => void; onCreated: (inspection: InspectionRecord) => void }) {
  const [assetCode, setAssetCode] = useState('')
  const [type, setType] = useState('Safety check')
  const [location, setLocation] = useState('')
  const [inspectorName, setInspectorName] = useState('Alex Rivera')
  const [condition, setCondition] = useState('Good')
  const [status, setStatus] = useState('Pass')
  const [checklistText, setChecklistText] = useState('Base and load-bearing components secure\nGuard rails and platforms installed\nCross braces complete and locked\nNo visible deformation or corrosion')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const selectedAsset = assets.find((asset) => asset.code.toLowerCase() === assetCode.trim().toLowerCase())
  const today = new Date().toISOString().slice(0, 10)
  useEffect(() => { if (selectedAsset) setLocation((current) => current || selectedAsset.location) }, [selectedAsset])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const checklistItems = checklistText.split('\n').map((line) => line.trim()).filter(Boolean)
    if (!assetCode.trim() || !location.trim() || checklistItems.length === 0) { setError('Enter an asset code, location and at least one checklist item.'); return }
    setLoading(true)
    setError('')
    try {
      const response = await inspectionAPI.create({
        assetCode: assetCode.trim(),
        type,
        checklist: checklistItems.map((item) => ({ item, checked: true, remarks: '' })),
        condition,
        status,
        location: location.trim(),
        inspector: { name: inspectorName.trim() || 'Alex Rivera' },
      })
      if (!response.success) { setError(response.message || 'Unable to record inspection.'); return }
      onCreated(response.data as InspectionRecord)
    } catch {
      setError('Unable to reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <div className="portal-modal-backdrop"><form className="portal-modal" onSubmit={submit}>
    <div><span><p>SAFETY & CONDITION</p><h2>Start inspection</h2></span><button className="icon-button" type="button" onClick={close} aria-label="Close start inspection form"><X size={18} /></button></div>
    <section>
      <label>Asset / assembly code<input value={assetCode} list="inspection-asset-codes" onChange={(event) => setAssetCode(event.target.value)} required placeholder="Select or enter asset code" /><datalist id="inspection-asset-codes">{assets.map((asset) => <option key={asset.code} value={asset.code}>{asset.name}</option>)}</datalist></label>
      <label>Asset name<input value={selectedAsset?.name || 'Enter an inventory asset code'} readOnly /></label>
      <label>Asset tag ID<input value={selectedAsset?.assetTagId || 'Not recorded'} readOnly /></label>
      <label>Inspection type<select value={type} onChange={(event) => setType(event.target.value)}><option>Safety check</option><option>Maintenance</option><option>Condition assessment</option><option>Compliance</option></select></label>
      <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} required placeholder="e.g. Building B, Level 3" /></label>
      <label>Inspector<input value={inspectorName} onChange={(event) => setInspectorName(event.target.value)} required /></label>
      <label>Condition<select value={condition} onChange={(event) => setCondition(event.target.value)}><option>Good</option><option>Fair</option><option>Poor</option></select></label>
      <label>Result<select value={status} onChange={(event) => setStatus(event.target.value)}><option>Pass</option><option>Fail</option><option>Needs Repair</option></select></label>
      <label className="wide">Checklist items (one per line)<textarea value={checklistText} onChange={(event) => setChecklistText(event.target.value)} /></label>
    </section>
    {error && <p className="login-error">{error}</p>}
    <footer><button className="outline-action" type="button" onClick={close} disabled={loading}>Cancel</button><button className="primary-action" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Record inspection'}</button></footer>
  </form></div>
}

function LegacyPortalReturns({ movements, loadError, query, setQuery, status, setStatus, openReturn }: { movements: ReturnMovement[]; loadError: string; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; openReturn: () => void }) { const filtered = movements.filter((movement) => `${movement.id} ${movement.assetCode} ${movement.assetName} ${movement.responsibleParty}`.toLowerCase().includes(query.toLowerCase()) && (status === 'All' || movement.resolution === status)); return <><div className="portal-intro"><div><p>EXCEPTIONS & RECOVERY</p><h2>Returns, damage & loss</h2><span>Record returned, damaged and missing quantities with responsibility and resolution.</span></div><button className="primary-action" onClick={openReturn}><PackagePlus size={17} /> Record return</button></div><section className="portal-panel portal-table issue-table"><PortalHead eyebrow="RETURN HISTORY" title="Returns, damage & loss records" action="View full audit" /><div className="issue-filters"><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search record, asset or responsible party" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Closed</option><option>Replacement pending</option><option>Repair pending</option><option>Under investigation</option></select></div>{loadError && <p className="login-error">{loadError}</p>}<div className="return-table-head"><span>RECORD</span><span>ASSET</span><span>RESPONSIBLE PARTY</span><span>QUANTITIES</span><span>CONDITION</span><span>RESOLUTION</span></div>{filtered.length === 0 ? <p className="issue-empty">No return records match the current filters.</p> : filtered.map((movement) => <div className="return-row" key={movement.id}><span><b>{movement.id}</b><small>{formatPortalDate(movement.returnDate)}</small></span><span>{movement.assetName} <small>{movement.assetCode}</small></span><span>{movement.responsibleParty}</span><span>Issued {movement.quantityIssued} · Returned {movement.quantityReturned}{movement.quantityDamaged ? ` · Damaged ${movement.quantityDamaged}` : ''}{movement.quantityMissing ? ` · Missing ${movement.quantityMissing}` : ''}</span><PortalStatus value={movement.condition} /><span>{movement.resolution}</span></div>)}</section></> }
function PortalReceiveTable({ movements, openReceive }: { movements: ReportMovement[]; openReceive: () => void }) { const [query, setQuery] = useState(''); const [status, setStatus] = useState('All'); const filtered = movements.filter((movement) => JSON.stringify(movement).toLowerCase().includes(query.toLowerCase()) && (status === 'All' || movement.status === status)); return <section className="portal-panel portal-table issue-table"><div className="portal-head"><div><small>GRN & DELIVERIES</small><h2>Received assets</h2></div><button className="primary-action" onClick={openReceive}><Truck size={16} /> New receiving</button></div><div className="issue-filters"><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search receiving, asset or supplier" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Received</option><option>Pending</option></select></div><div className="receive-table-head"><span>GRN ID</span><span>ASSET</span><span>SUPPLIER</span><span>BILL NO</span><span>DESTINATION</span><span>QUANTITY</span><span>DATE</span><span>STATUS</span></div>{filtered.length === 0 ? <p className="issue-empty">No receiving records match the current filters.</p> : filtered.map((movement) => <div className="receive-row" key={movement.id}><span><b>{movement.id}</b></span><span>{movement.assetName} <small>{movement.assetCode}</small></span><span>{movement.supplier || 'Not recorded'}</span><span>{movement.billNo || 'Not recorded'}</span><span>{movement.toLocation || 'Not recorded'}</span><span>{movement.quantity} {movement.unit}</span><span>{formatPortalDate(movement.timestamp)}</span><PortalStatus value={movement.status} /></div>)}</section> }
function PortalIssuePage({ movements, loadError, query, setQuery, status, setStatus, openIssue }: { movements: IssueMovement[]; loadError: string; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; openIssue: () => void }) { return <section className="transaction-full-table"><div className="portal-intro"><div><p>ASSET ALLOCATION</p><h2>Issued assets</h2><span>Review assets issued to responsible parties.</span></div><button className="primary-action" onClick={openIssue}><UserRound size={16} /> New issue</button></div><PortalIssueTable movements={movements} loadError={loadError} query={query} setQuery={setQuery} status={status} setStatus={setStatus} /></section> }
function PortalTransferPage({ movements, loadError, query, setQuery, status, setStatus, openTransfer }: { movements: TransferMovement[]; loadError: string; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; openTransfer: () => void }) { return <section className="transaction-full-table"><div className="portal-intro"><div><p>LOCATION MOVEMENT</p><h2>Transferred assets</h2><span>Review assets moved between locations.</span></div><button className="primary-action" onClick={openTransfer}><ArrowLeftRight size={16} /> New transfer</button></div><PortalTransferTable movements={movements} loadError={loadError} query={query} setQuery={setQuery} status={status} setStatus={setStatus} /></section> }
function PortalReports({ assets, movements, loadError }: { assets: AssetRecord[]; movements: ReportMovement[]; loadError: string }) { const currentStock = assets.reduce((total, asset) => total + asset.quantity, 0); const assetValue = assets.reduce((total, asset) => total + asset.quantity * asset.unitCost, 0); const openVariance = assets.filter((asset) => asset.status === 'Damaged' || asset.status === 'Low stock').length; const formatMoney = (value: number) => `AED ${value.toLocaleString()}`; const exportReport = () => { const rows = [['ID', 'Type', 'Asset', 'Asset code', 'Quantity', 'From location', 'To location', 'Recipient', 'Status', 'Recorded by', 'Timestamp'], ...movements.map((movement) => [movement.id, movement.type, movement.assetName, movement.assetCode, `${movement.quantity} ${movement.unit}`, movement.fromLocation || '', movement.toLocation || '', movement.recipientName || '', movement.status, movement.recordedBy || '', movement.timestamp])]; const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = `fieldstock-audit-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href) }; return <><div className="portal-intro"><div><p>REPORTING & AUDIT</p><h2>Asset intelligence</h2><span>Export inventory, movement, utilization, variance and accountability reports.</span></div><button className="primary-action" onClick={exportReport}><FileBarChart2 size={17} /> Export report</button></div>{loadError && <p className="login-error">{loadError}</p>}<section className="report-grid">{[['Current stock', currentStock.toLocaleString(), 'Available quantity across all locations'], ['Asset value', formatMoney(assetValue), 'Current quantity multiplied by unit cost'], ['Open variance', String(openVariance), 'Damaged or low-stock assets'], ['Audit events', movements.length.toLocaleString(), 'Movement records in the audit history']].map(([label, value, text]) => <article className="portal-panel report-card" key={label}><small>{label.toUpperCase()}</small><strong>{value}</strong><span>{text}</span><button type="button">Open report</button></article>)}</section><section className="portal-panel audit"><PortalHead eyebrow="AUDIT HISTORY" title="Recent accountable actions" />{movements.length === 0 ? <p className="issue-empty">No movement records found.</p> : movements.map((movement) => <div className="portal-movement" key={movement.id}><i><ClipboardCheck size={16} /></i><div><b>{movement.status}: {movement.assetName}</b><small>{movement.id} · {movement.fromLocation || movement.toLocation || movement.recipientName || 'No location recorded'} · Recorded by {movement.recordedBy || 'System'}</small></div><span>{formatPortalDate(movement.timestamp)}</span></div>)}</section></> }

function PortalDetails({ asset, back, action }: { asset: AssetRecord; back: () => void; action: (value: 'issue' | 'transfer') => void }) { return <><button className="portal-back" onClick={back}>← Back to asset register</button><section className="portal-panel asset-hero"><i><Boxes size={45} /></i><div><p>ASSET PROFILE</p><h2>{asset.name}</h2><span>{asset.code} · {asset.type}{asset.serial ? ` · Serial ${asset.serial}` : ''}</span><div><PortalStatus value={asset.status} /><span><MapPin size={14} /> {asset.location}</span><span><QrCode size={14} /> QR registered</span></div></div><aside><button className="outline-action" onClick={() => action('transfer')}><ArrowLeftRight size={16} /> Transfer</button><button className="primary-action" onClick={() => action('issue')}><UserRound size={16} /> Issue asset</button></aside></section><div className="detail-grid"><section className="portal-panel"><PortalHead eyebrow="CURRENT STOCK" title="Inventory overview" /><dl className="detail-list"><div><dt>Available quantity</dt><dd>{asset.quantity} {asset.unit}</dd></div><div><dt>Minimum stock level</dt><dd>{asset.minimum} {asset.unit}</dd></div><div><dt>Unit / total value</dt><dd>{asset.value}</dd></div><div><dt>Supplier</dt><dd>BuildSource Trading</dd></div></dl></section><section className="portal-panel"><PortalHead eyebrow="RECENT HISTORY" title="Movement & inspection" />{portalMovements.slice(0, 3).map(([id, , route, time, status]) => <div className="portal-movement" key={id}><i><ArrowLeftRight size={15} /></i><div><b>{status}</b><small>{route}</small></div><span>{time}</span></div>)}</section></div></> }
function ReturnModal({ close, save }: { close: () => void; save: (draft?: AssetRecord | ReceiveRecord | IssueRecord | TransferRecord | ReturnRecord) => Promise<string | undefined> }) { const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(''); setLoading(true); const fields = new FormData(event.currentTarget); const message = await save({ assetCode: String(fields.get('assetCode')).trim(), type: String(fields.get('type')), quantityIssued: Number(fields.get('quantityIssued')), quantityReturned: Number(fields.get('quantityReturned')), quantityDamaged: Number(fields.get('quantityDamaged')), quantityMissing: Number(fields.get('quantityMissing')), condition: String(fields.get('condition')), damageDescription: String(fields.get('damageDescription')).trim(), responsibleParty: String(fields.get('responsibleParty')).trim(), location: String(fields.get('location')).trim(), recordedBy: 'Alex Rivera', remarks: String(fields.get('remarks')).trim() }); setLoading(false); if (message) setError(message) }; return <div className="portal-modal-backdrop"><form className="portal-modal return-modal" onSubmit={submit}><div><span><p>EXCEPTIONS & RECOVERY</p><h2>Record return</h2></span><button className="icon-button" type="button" onClick={close} aria-label="Close return form"><X size={18} /></button></div><p className="form-description">Record returned, damaged, or missing quantities for an asset.</p><section><label>Asset ID / code<input name="assetCode" required placeholder="e.g. SAF-104" /></label><label>Record type<select name="type" defaultValue="Return"><option>Return</option><option>Damage</option><option>Loss</option><option>Variance</option></select></label><label>Quantity issued<input name="quantityIssued" required type="number" min="0" step="any" /></label><label>Quantity returned<input name="quantityReturned" type="number" min="0" step="any" defaultValue="0" /></label><label>Quantity damaged<input name="quantityDamaged" type="number" min="0" step="any" defaultValue="0" /></label><label>Quantity missing<input name="quantityMissing" type="number" min="0" step="any" defaultValue="0" /></label><label>Condition<select name="condition" defaultValue="Good"><option>Good</option><option>Damaged</option><option>Missing</option><option>Destroyed</option></select></label><label>Responsible party<input name="responsibleParty" required placeholder="Enter person or team" /></label><label>Location<input name="location" required placeholder="e.g. Warehouse 01" /></label><label className="wide">Damage description<textarea name="damageDescription" placeholder="Describe damage or loss" /></label><label className="wide">Remarks<textarea name="remarks" placeholder="Add supporting notes" /></label></section>{error && <p className="login-error">{error}</p>}<footer><button className="outline-action" type="button" onClick={close} disabled={loading}>Cancel</button><button className="primary-action" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save record'}</button></footer></form></div> }

function ReturnModalWithAssets({ assets, close, save, recordedBy }: { assets: AssetRecord[]; close: () => void; save: (draft?: AssetRecord | ReceiveRecord | IssueRecord | TransferRecord | ReturnRecord) => Promise<string | undefined>; recordedBy: string }) {
  const [assetCode, setAssetCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const selectedAsset = assets.find((asset) => asset.code.toLowerCase() === assetCode.trim().toLowerCase())
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    const fields = new FormData(event.currentTarget)
    const message = await save({ assetCode: String(fields.get('assetCode')).trim(), qrCode: selectedAsset?.qrCode || '', billNo: String(fields.get('billNo')).trim(), type: String(fields.get('type')), quantityIssued: Number(fields.get('quantityIssued')), quantityReturned: Number(fields.get('quantityReturned')), quantityDamaged: Number(fields.get('quantityDamaged')), quantityMissing: Number(fields.get('quantityMissing')), condition: String(fields.get('condition')), damageDescription: String(fields.get('damageDescription')).trim(), responsibleParty: String(fields.get('responsibleParty')).trim(), location: String(fields.get('location')).trim(), recordedBy, remarks: String(fields.get('remarks')).trim() })
    setLoading(false)
    if (message) setError(message)
  }
  return <div className="portal-modal-backdrop"><form className="portal-modal return-modal" onSubmit={submit}><div><span><p>EXCEPTIONS & RECOVERY</p><h2>Record return</h2></span><button className="icon-button" type="button" onClick={close} aria-label="Close return form"><X size={18} /></button></div><p className="form-description">Select an asset from inventory or enter its code manually.</p><section><label>Asset ID / code<input name="assetCode" list="return-asset-codes" value={assetCode} onChange={(event) => setAssetCode(event.target.value)} required placeholder="Select or enter asset code" /><datalist id="return-asset-codes">{assets.map((asset) => <option key={asset.code} value={asset.code}>{asset.name}</option>)}</datalist></label><label>Asset type<input value={selectedAsset?.type || 'Enter an inventory asset code'} readOnly /></label><label>Asset tag ID<input value={selectedAsset?.assetTagId || 'Not recorded'} readOnly /></label><label>Record type<select name="type" defaultValue="Return"><option>Return</option><option>Damage</option><option>Loss</option><option>Variance</option></select></label><label>Quantity issued<input name="quantityIssued" required type="number" min="0" step="any" /></label><label>Quantity returned<input name="quantityReturned" type="number" min="0" step="any" defaultValue="0" /></label><label>Quantity damaged<input name="quantityDamaged" type="number" min="0" step="any" defaultValue="0" /></label><label>Quantity missing<input name="quantityMissing" type="number" min="0" step="any" defaultValue="0" /></label><label>Condition<select name="condition" defaultValue="Good"><option>Good</option><option>Damaged</option><option>Missing</option><option>Destroyed</option></select></label><label>Responsible party<input name="responsibleParty" required placeholder="Enter person or team" /></label><label key={selectedAsset?.code || 'manual'}>Location<input name="location" defaultValue={selectedAsset?.location || ''} required placeholder="e.g. Warehouse 01" /></label><label className="wide">Damage description<textarea name="damageDescription" placeholder="Describe damage or loss" /></label><label className="wide">Remarks<textarea name="remarks" placeholder="Add supporting notes" /></label></section>{error && <p className="login-error">{error}</p>}<footer><button className="outline-action" type="button" onClick={close} disabled={loading}>Cancel</button><button className="primary-action" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save record'}</button></footer></form></div>
}

function AssetEditModal({ asset, close, onSaved }: { asset: AssetRecord; close: () => void; onSaved: (asset: AssetRecord) => void }) { const [draft, setDraft] = useState(asset); const [purchaseDate, setPurchaseDate] = useState(asset.purchaseDate && asset.purchaseDate !== 'Not recorded' ? formatPortalDate(asset.purchaseDate) : ''); const [receiveDate, setReceiveDate] = useState(asset.receiveDate && asset.receiveDate !== 'Not recorded' ? formatPortalDate(asset.receiveDate) : ''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const update = (field: keyof AssetRecord, value: string | number) => setDraft((current) => ({ ...current, [field]: value })); const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const parsedPurchaseDate = purchaseDate ? parsePortalDate(purchaseDate) : ''; const parsedReceiveDate = receiveDate ? parsePortalDate(receiveDate) : ''; if (!parsedPurchaseDate || !parsedReceiveDate || !String(draft.department || '').trim()) { setError('Department, order date, and receive date are required. Enter dates as DD/Month/YYYY.'); return } setLoading(true); setError(''); try { const response = await assetAPI.update(asset._id || '', { ...draft, purchaseDate: parsedPurchaseDate || null, receiveDate: parsedReceiveDate || null }); if (!response.success) { setError(response.message || 'Unable to update asset.'); return } onSaved(response.data as AssetRecord); close() } catch { setError('Unable to reach the server. Please try again.') } finally { setLoading(false) } }; return <div className="portal-modal-backdrop"><form className="portal-modal asset-master-modal" onSubmit={submit}><div><span><p>ASSET MASTER</p><h2>Edit asset</h2></span><button className="icon-button" type="button" onClick={close} aria-label="Close edit asset form"><X size={18} /></button></div><p className="form-description">Update all fields for this asset record.</p>{error && <p className="login-error">{error}</p>}<section><h3>Identification</h3><label>Asset ID / code<input value={draft.code} readOnly /></label><label>Asset name<input value={draft.name} onChange={(event) => update('name', event.target.value)} required /></label><label>Asset type<select value={draft.type} onChange={(event) => update('type', event.target.value)}><option>Countable / Consumable</option><option>Material</option><option>Reusable asset</option><option>Scaffolding</option><option>Formwork</option><option>Assembly / Kit</option></select></label><label>Serial number<input value={draft.serial} onChange={(event) => update('serial', event.target.value)} /></label><label>Asset tag ID<input value={draft.assetTagId} onChange={(event) => update('assetTagId', event.target.value)} /></label><h3>Classification</h3><label>Category<input value={draft.category} onChange={(event) => update('category', event.target.value)} required /></label><label>Department<input value={draft.department || ''} onChange={(event) => update('department', event.target.value)} required /></label><label>Sub-category<input value={draft.subcategory} onChange={(event) => update('subcategory', event.target.value)} /></label><label>Manufacturer<input value={draft.manufacturer} onChange={(event) => update('manufacturer', event.target.value)} /></label><label>Model<input value={draft.model} onChange={(event) => update('model', event.target.value)} /></label><h3>Stock & value</h3><label>Unit<select value={draft.unit || 'units'} onChange={(event) => update('unit', event.target.value)}><option>pieces</option><option>units</option><option>meters</option><option>kg</option><option>t</option><option>set</option><option>box</option><option>packet</option></select></label><label>Quantity<input type="number" min="0" step="any" value={draft.quantity} onChange={(event) => update('quantity', Number(event.target.value))} required /></label><label>Minimum stock<input type="number" min="0" step="any" value={draft.minimum} onChange={(event) => update('minimum', Number(event.target.value))} required /></label><label>Unit cost<input type="number" min="0" step="0.01" value={draft.unitCost} onChange={(event) => update('unitCost', Number(event.target.value))} required /></label><h3>Source & location</h3><label>Supplier<input value={draft.supplier} onChange={(event) => update('supplier', event.target.value)} /></label><label>Order date<span className="date-field"><input type="text" inputMode="text" required placeholder="DD/Month/YYYY" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} /><input aria-label="Choose order date" type="date" value={parsePortalDate(purchaseDate) || ""} onChange={(event) => setPurchaseDate(event.target.value ? formatPortalDate(event.target.value) : "")} /></span></label><label>Receive date<span className="date-field"><input type="text" inputMode="text" required placeholder="DD/Month/YYYY" value={receiveDate} onChange={(event) => setReceiveDate(event.target.value)} /><input aria-label="Choose receive date" type="date" value={parsePortalDate(receiveDate) || ""} onChange={(event) => setReceiveDate(event.target.value ? formatPortalDate(event.target.value) : "")} /></span></label><label>Project<input value={draft.project} onChange={(event) => update('project', event.target.value)} /></label><label>Current location<input value={draft.location} onChange={(event) => update('location', event.target.value)} required /></label><label>Status<select value={draft.status} onChange={(event) => update('status', event.target.value)}><option>Available</option><option>In use</option><option>In transit</option><option>Low stock</option><option>Under inspection</option><option>Damaged</option></select></label><label>QR code / barcode<input value={draft.qrCode} onChange={(event) => update('qrCode', event.target.value)} /></label><h3>Supporting records</h3><label className="wide">Photos / documents<input value={draft.attachments} onChange={(event) => update('attachments', event.target.value)} /></label><label className="wide">Detailed description<textarea value={draft.description} onChange={(event) => update('description', event.target.value)} /></label><label className="wide">Remarks<textarea value={draft.remarks} onChange={(event) => update('remarks', event.target.value)} /></label></section><footer><button className="outline-action" type="button" onClick={close} disabled={loading}>Cancel</button><button className="primary-action" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</button></footer></form></div> }

function TransferEditModal({ movement, close }: { movement: TransferMovement; close: () => void }) { const [draft, setDraft] = useState(movement); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const update = (field: keyof TransferMovement, value: string | number) => setDraft((current) => ({ ...current, [field]: value })); const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!movement._id) { setError('This transfer has no database ID.'); return } setLoading(true); setError(''); try { const payload = { quantity: draft.quantity, fromLocation: draft.fromLocation, toLocation: draft.toLocation, project: draft.project, status: draft.status }; const response = await movementAPI.update(movement._id, payload); if (!response.success) { setError(response.message || 'Unable to update transfer.'); return } close(); window.location.reload() } catch { setError('Unable to reach the server. Please try again.') } finally { setLoading(false) } }; return <div className="portal-modal-backdrop"><form className="portal-modal" onSubmit={submit}><div><span><p>LOCATION MOVEMENT</p><h2>Edit transfer</h2></span><button className="icon-button" type="button" onClick={close} aria-label="Close edit transfer form"><X size={18} /></button></div><section><label>Transfer ID<input value={draft.id} readOnly /></label><label>Asset<input value={`${draft.assetName} (${draft.assetCode})`} readOnly /></label><label>From location<input value={draft.fromLocation || ''} onChange={(event) => update('fromLocation', event.target.value)} required /></label><label>To location<input value={draft.toLocation || ''} onChange={(event) => update('toLocation', event.target.value)} required /></label><label>Quantity<input type="number" min="1" step="any" value={draft.quantity} onChange={(event) => update('quantity', Number(event.target.value))} required /></label><label>Project<input value={draft.project || ''} onChange={(event) => update('project', event.target.value)} /></label></section>{error && <p className="login-error">{error}</p>}<footer><button className="outline-action" type="button" onClick={close} disabled={loading}>Cancel</button><button className="primary-action" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</button></footer></form></div> }

function PortalModal({ kind, close, save, recordedBy }: { kind: 'asset' | 'receive' | 'issue' | 'transfer'; close: () => void; save: (draft?: AssetRecord | ReceiveRecord | IssueRecord | TransferRecord | ReturnRecord) => Promise<string | undefined>; recordedBy: string }) {
  const title = kind === 'asset' ? 'Add asset' : kind === 'receive' ? 'Receive assets' : kind === 'issue' ? 'Issue & allocate' : 'Transfer assets'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [assetCode, setAssetCode] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [receiveDate, setReceiveDate] = useState('')
  const selectedAsset = assets.find((asset) => asset.code.toLowerCase() === assetCode.trim().toLowerCase())
  useEffect(() => { if (kind !== 'asset') assetAPI.getAll().then((response) => { if (response.success) setAssets(response.data as AssetRecord[]) }).catch(() => undefined) }, [kind])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    if (kind !== 'asset') {
      const fields = new FormData(event.currentTarget)
      const message = await save(kind === 'receive'
        ? { assetCode: String(fields.get('assetCode')).trim(), quantity: Number(fields.get('quantity')), supplier: String(fields.get('supplier')).trim(), grn: String(fields.get('grn')).trim(), billNo: String(fields.get('billNo')).trim(), project: String(fields.get('project')).trim(), remarks: String(fields.get('remarks')).trim(), recordedBy }
        : kind === 'issue'
          ? { assetCode: String(fields.get('assetCode')).trim(), quantity: Number(fields.get('quantity')), recipientName: String(fields.get('recipientName')).trim(), billNo: String(fields.get('billNo')).trim(), project: String(fields.get('project')).trim(), remarks: String(fields.get('remarks')).trim(), recordedBy }
          : { assetCode: String(fields.get('assetCode')).trim(), quantity: Number(fields.get('quantity')), fromLocation: String(fields.get('fromLocation')).trim(), toLocation: String(fields.get('toLocation')).trim(), project: String(fields.get('project')).trim(), remarks: String(fields.get('remarks')).trim(), recordedBy })
      setLoading(false)
      if (message) setError(message)
      return
    }
    const fields = new FormData(event.currentTarget)
    const quantity = Number(fields.get('quantity'))
    const unitCost = Number(fields.get('unitCost'))
    const attachment = fields.get('attachments')
    const rawPurchaseDate = String(fields.get('purchaseDate') || '').trim()
    const purchaseDate = rawPurchaseDate ? parsePortalDate(rawPurchaseDate) : ''
    const rawReceiveDate = receiveDate.trim()
    const parsedReceiveDate = rawReceiveDate ? parsePortalDate(rawReceiveDate) : ''
    if (!String(fields.get('code') || '').trim() || !String(fields.get('category') || '').trim() || !String(fields.get('department') || '').trim() || !purchaseDate || !parsedReceiveDate) { setError('Asset ID, category, department, order date, and receive date are required.'); setLoading(false); return }
    const message = await save({ code: String(fields.get('code')).trim(), name: String(fields.get('name')), type: String(fields.get('type')), serial: String(fields.get('serial') || 'Not recorded'), assetTagId: '', category: String(fields.get('category')), department: String(fields.get('department')).trim(), subcategory: String(fields.get('subcategory') || 'Not recorded'), description: String(fields.get('description') || 'Not recorded'), manufacturer: String(fields.get('manufacturer') || 'Not recorded'), model: String(fields.get('model') || 'Not recorded'), quantity, unit: String(fields.get('unit')), minimum: Number(fields.get('minimum')), unitCost, value: `AED ${(quantity * unitCost).toLocaleString()}`, supplier: String(fields.get('supplier') || 'Not recorded'), purchaseDate, receiveDate: parsedReceiveDate, project: String(fields.get('project')), location: String(fields.get('location')), status: String(fields.get('status')), qrCode: '', attachments: attachment instanceof File && attachment.name ? attachment.name : 'No files', remarks: String(fields.get('remarks') || 'No remarks') })
    setLoading(false)
    if (message) setError(message)
  }
  if (kind !== 'asset') return <div className="portal-modal-backdrop"><form className="portal-modal" onSubmit={submit}><div><span><p>ASSET MANAGEMENT</p><h2>{title}</h2></span><button className="icon-button" type="button" onClick={close}><X size={18} /></button></div><section><label>Asset ID / code<input name="assetCode" list="transaction-asset-codes" value={assetCode} onChange={(event) => setAssetCode(event.target.value)} required placeholder="Select or enter asset code" /><datalist id="transaction-asset-codes">{assets.map((asset) => <option key={asset.code} value={asset.code}>{asset.name}</option>)}</datalist></label><label>Asset tag ID<input value={selectedAsset?.assetTagId || 'Not recorded'} readOnly /></label>{kind === 'receive' && <label>Supplier<input name="supplier" required placeholder="Enter supplier name" /></label>}{kind === 'receive' && <label>GRN number<input name="grn" required defaultValue={`GRN-${Date.now().toString().slice(-6)}`} placeholder="Enter GRN number" /></label>}{kind === 'receive' && <label>Bill no.<input name="billNo" required placeholder="Enter supplier bill number" /></label>}{kind === 'issue' && <label>Recipient<input name="recipientName" required placeholder="Enter recipient" /></label>}{kind === 'issue' && <label>Bill no.<input name="billNo" placeholder="Enter bill number (if applicable)" /></label>}{kind === 'transfer' && <><label>Available quantity<input value={selectedAsset ? `${selectedAsset.quantity} ${selectedAsset.unit}` : 'Select an asset'} readOnly /></label><label key={selectedAsset?.code || 'manual-from-location'}>From location<input name="fromLocation" defaultValue={selectedAsset?.location || ''} required placeholder="Enter current location" /></label><label>To location<input name="toLocation" required placeholder="Enter destination" /></label></>}<label>Quantity<input name="quantity" required type="number" min="1" step="any" placeholder="Enter quantity" /></label><label>Project<select name="project" defaultValue={PROJECT_SITES[0]}>{PROJECT_SITES.map((site) => <option key={site}>{site}</option>)}</select></label><label className="wide">Remarks<textarea name="remarks" placeholder="Add purpose, condition, approval or supporting notes" /></label></section>{error && <p className="login-error">{error}</p>}<footer><button className="outline-action" type="button" onClick={close}>Cancel</button><button className="primary-action" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save record'}</button></footer></form></div>
  return <div className="portal-modal-backdrop"><form className="portal-modal asset-master-modal" onSubmit={submit}><div><span><p>ASSET MASTER</p><h2>Add asset</h2></span><button className="icon-button" type="button" onClick={close} aria-label="Close add asset form"><X size={18} /></button></div><p className="form-description">Create a complete asset record for inventory, tracking and site accountability.</p>{error && <p className="login-error">{error}</p>}<section>
    <h3>Identification</h3><label>Asset ID / code<input name="code" required placeholder="e.g. MAC-022" /></label><label>Asset name<input name="name" required placeholder="e.g. Excavator CAT 320" /></label><label>Asset type<select name="type" defaultValue="Material"><option>Countable / Consumable</option><option>Material</option><option>Reusable asset</option><option>Scaffolding</option><option>Formwork</option><option>Assembly / Kit</option></select></label><label>Serial number<input name="serial" placeholder="Where applicable" /></label><label>Asset tag ID<input value="Generated automatically" readOnly /></label>
    <h3>Classification</h3><label>Asset category<select name="category" required defaultValue=""><option value="" disabled>Select category</option>{ASSET_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label>Department<select name="department" required defaultValue=""><option value="" disabled>Select department</option>{DEPARTMENTS.map((department) => <option key={department}>{department}</option>)}</select></label><label>Sub-category<input name="subcategory" placeholder="e.g. Earthmoving equipment" /></label><label>Make<select name="manufacturer" defaultValue="Not recorded"><option>Not recorded</option>{ASSET_MAKES.map((make) => <option key={make}>{make}</option>)}</select></label><label>Model<select name="model" defaultValue="Not recorded"><option>Not recorded</option>{ASSET_MODELS.map((model) => <option key={model}>{model}</option>)}</select></label><label>Warranty<select name="warranty" defaultValue="Not specified">{WARRANTY_OPTIONS.map((warranty) => <option key={warranty}>{warranty}</option>)}</select></label>
    <h3>Stock & value</h3><label>Unit of measurement<select name="unit" defaultValue="units"><option>units</option><option>pieces</option><option>meters</option><option>kg</option><option>t</option><option>set</option><option>box</option><option>packet</option></select></label><label>Quantity<input name="quantity" required type="number" min="0" step="any" defaultValue="0" /></label><label>Minimum stock level<input name="minimum" required type="number" min="0" step="any" defaultValue="0" /></label><label>Unit cost<input name="unitCost" required type="number" min="0" step="0.01" defaultValue="0" /></label>
    <h3>Source & location</h3><label>Supplier<input name="supplier" placeholder="Supplier or vendor name" /></label><label>Order date<span className="date-field"><input name="purchaseDate" type="text" inputMode="text" placeholder="DD/Month/YYYY" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} /><input aria-label="Choose order date" type="date" value={parsePortalDate(purchaseDate) || ""} onChange={(event) => setPurchaseDate(event.target.value ? formatPortalDate(event.target.value) : "")} /></span></label><label>Receive date<span className="date-field"><input type="text" inputMode="text" placeholder="DD/Month/YYYY" value={receiveDate} onChange={(event) => setReceiveDate(event.target.value)} /><input aria-label="Choose receive date" type="date" value={parsePortalDate(receiveDate) || ""} onChange={(event) => setReceiveDate(event.target.value ? formatPortalDate(event.target.value) : "")} /></span></label><label>Project<select name="project" defaultValue={PROJECT_SITES[0]}>{PROJECT_SITES.map((site) => <option key={site}>{site}</option>)}</select></label><label>Current location<input name="location" required placeholder="e.g. Warehouse 01" /></label><label>Status<select name="status" defaultValue="Available"><option>Available</option><option>In use</option><option>In transit</option><option>Low stock</option><option>Under inspection</option><option>Damaged</option></select></label><label>QR code / barcode<input value="Generated automatically" readOnly /></label>
    <h3>Supporting records</h3><label className="wide">Photos and documents<input name="attachments" type="file" multiple accept="image/*,.pdf,.doc,.docx" /></label><label className="wide">Detailed description<textarea name="description" placeholder="Asset description, specifications or handling notes" /></label><label className="wide">Remarks<textarea name="remarks" placeholder="Add purchase, condition, storage or approval notes" /></label>
  </section><footer><button className="outline-action" type="button" onClick={close} disabled={loading}>Cancel</button><button className="primary-action" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create asset'}</button></footer></form></div>
}

export function LegacyApp() {
  const [signedIn, setSignedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [screen, setScreen] = useState<Screen>('Dashboard')
  const [formOpen, setFormOpen] = useState(false)
  const [assets, setAssets] = useState<Asset[]>(initialAssets)
  const [draft, setDraft] = useState({ name: '', category: 'Machinery', quantity: '', location: '' })

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password) return setError('Enter your email address and password to continue.')
    setError(''); setSignedIn(true)
  }
  function selectScreen(next: Screen) { setScreen(next); setFormOpen(false) }
  function saveAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.name || !draft.quantity || !draft.location) return
    setAssets((items) => [{ ...draft, code: `AST-${String(items.length + 1).padStart(3, '0')}` }, ...items])
    setDraft({ name: '', category: 'Machinery', quantity: '', location: '' }); setFormOpen(false)
  }
  if (!signedIn) return <Login email={email} password={password} error={error} setEmail={setEmail} setPassword={setPassword} onSubmit={signIn} />
  return <main className="app-shell">
    <aside className="sidebar"><div className="brand"><i><Box size={19} /></i><b>ASSETLY</b></div><div className="project"><span /><div><small>ACTIVE PROJECT</small>Riverside Commercial Hub</div><ChevronDown size={15} /></div><nav>
      <NavButton icon={<LayoutDashboard size={18} />} label="Dashboard" active={screen === 'Dashboard'} onClick={() => selectScreen('Dashboard')} />
      <NavButton icon={<Wrench size={18} />} label="Assets" active={screen === 'Assets'} onClick={() => selectScreen('Assets')} />
      <NavButton icon={<Activity size={18} />} label="Activity" active={screen === 'Activity'} onClick={() => selectScreen('Activity')} />
      <NavButton icon={<CircleUserRound size={18} />} label="Profile" active={screen === 'Profile'} onClick={() => selectScreen('Profile')} />
    </nav><button className="signout" onClick={() => setSignedIn(false)}><LogOut size={18} /> Sign out</button></aside>
    <section className="workspace"><header><div><p className="eyebrow">CONSTRUCTION ASSET CONTROL</p><h1>{screen}</h1></div><div className="header-actions"><button aria-label="Search"><Search size={19} /></button><button aria-label="Notifications" className="notice"><Bell size={19} /></button><div className="user"><em>AR</em><span><b>Alex Rivera</b><small>Site Manager</small></span></div></div></header>
      <div className="content">{screen === 'Dashboard' && <Dashboard assets={assets} openAssets={() => selectScreen('Assets')} />}{screen === 'Assets' && (formOpen ? <AssetForm draft={draft} setDraft={setDraft} cancel={() => setFormOpen(false)} submit={saveAsset} /> : <Assets assets={assets} onAdd={() => setFormOpen(true)} />)}{screen === 'Activity' && <ActivityScreen />}{screen === 'Profile' && <ProfileScreen />}</div>
    </section></main>
}

function Login({ email, password, error, setEmail, setPassword, onSubmit }: { email: string; password: string; error: string; setEmail: (value: string) => void; setPassword: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <main className="login"><section><div className="brand"><i><Box size={19} /></i><b>ASSETLY</b></div><div className="login-copy"><p className="eyebrow">ACCOUNT ACCESS</p><h1>Welcome back</h1><p>Sign in to manage site assets and keep construction moving.</p></div><form onSubmit={onSubmit}><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>{error && <p className="error">{error}</p>}<div className="options"><label><input type="checkbox" /> Keep me signed in</label><button type="button">Forgot password?</button></div><button className="primary" type="submit">Sign in <span>→</span></button></form></section><aside className="login-art" aria-label="Construction site" /></main> }
function Dashboard({ assets, openAssets }: { assets: Asset[]; openAssets: () => void }) { return <><div className="banner"><i><HardHat size={24} /></i><div><small>ACTIVE PROJECT</small><b>Riverside Commercial Hub</b><span><MapPin size={13} /> North Site · 4 zones operating</span></div><button>View project →</button></div><div className="stats"><Stat value={String(474 + assets.length)} label="Total assets" /><Stat value="3" label="Low stock" warning /><Stat value="12" label="Due today" /></div><Section title="Asset categories" label="OVERVIEW" action="View all assets" onAction={openAssets}><div className="categories">{categories.map(({ name, count, icon: Icon, tone }) => <button onClick={openAssets} className={`category ${tone}`} key={name}><i><Icon size={23} /></i><b>{name}</b><small>{count} items</small></button>)}</div></Section><Section title="Needs attention" label="INVENTORY"><div className="attention">{assets.slice(0, 3).map((asset) => <div key={asset.code}><i><Box size={17} /></i><span><b>{asset.name}</b><small>{asset.code} · {asset.location}</small></span><em>{asset.quantity} left</em></div>)}</div></Section></> }
function Assets({ assets, onAdd }: { assets: Asset[]; onAdd: () => void }) { return <section><div className="heading"><div><p className="eyebrow">ASSET REGISTER</p><h2>Site assets</h2><p>Machinery, hardware, steel, and materials across all active zones.</p></div><button className="primary small" onClick={onAdd}><PackagePlus size={18} /> Add asset</button></div><div className="table"><div className="table-head"><span>ASSET</span><span>CATEGORY</span><span>QUANTITY</span><span>LOCATION</span></div>{assets.map((asset) => <div className="table-row" key={asset.code}><span><b>{asset.name}</b><small>{asset.code}</small></span><span>{asset.category}</span><span>{asset.quantity}</span><span>{asset.location}</span></div>)}</div></section> }
function AssetForm({ draft, setDraft, cancel, submit }: { draft: { name: string; category: string; quantity: string; location: string }; setDraft: (draft: { name: string; category: string; quantity: string; location: string }) => void; cancel: () => void; submit: (event: FormEvent<HTMLFormElement>) => void }) { return <section><div className="heading"><div><p className="eyebrow">ASSET REGISTER</p><h2>Add new asset</h2><p>Record an asset and assign it to an active site location.</p></div><button className="close" onClick={cancel} aria-label="Close asset form"><X size={19} /></button></div><form className="asset-form" onSubmit={submit}><label>Asset name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Excavator CAT 320" /></label><label>Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label>Quantity<input required value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} placeholder="e.g. 2 units" /></label><label>Location<input required value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="e.g. Zone A" /></label><div><button type="button" className="secondary" onClick={cancel}>Cancel</button><button type="submit" className="primary small"><ClipboardCheck size={18} /> Save asset</button></div></form></section> }
function ActivityScreen() { return <section className="plain"><i><Activity size={28} /></i><p className="eyebrow">SITE LOG</p><h2>Recent activity</h2><p>Review the latest asset movements and inventory updates from Riverside Commercial Hub.</p><Timeline text="Safety helmets issued to Zone B" time="20 minutes ago" /><Timeline text="Excavator CAT 320 inspection completed" time="2 hours ago" /><Timeline text="Rebar delivery received at Steel yard" time="Yesterday" /></section> }
function ProfileScreen() { return <section className="plain"><i><CircleUserRound size={28} /></i><p className="eyebrow">YOUR WORKSPACE</p><h2>Alex Rivera</h2><p>Site Manager for Riverside Commercial Hub.</p><dl><div><dt>Email</dt><dd>alex.rivera@assetly.com</dd></div><div><dt>Role</dt><dd>Site Manager</dd></div><div><dt>Workspace</dt><dd>Assetly Construction</dd></div></dl></section> }
function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) { return <button onClick={onClick} className={active ? 'nav active' : 'nav'}>{icon}{label}</button> }
function Stat({ value, label, warning = false }: { value: string; label: string; warning?: boolean }) { return <div><b className={warning ? 'warning' : ''}>{value}</b><span>{label}</span></div> }
function Section({ title, label, action, onAction, children }: { title: string; label: string; action?: string; onAction?: () => void; children: React.ReactNode }) { return <section className="section"><div className="heading"><div><p className="eyebrow">{label}</p><h2>{title}</h2></div>{action && <button className="text" onClick={onAction}>{action}</button>}</div>{children}</section> }
function Timeline({ text, time }: { text: string; time: string }) { return <div className="timeline"><i /><span><b>{text}</b><small>{time}</small></span></div> }
export { ReturnModal }
