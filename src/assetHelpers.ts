import { assetAPI } from './api/client'

export function formatAssetDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getUTCDate()).padStart(2, '0')}-${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getUTCMonth()]}-${date.getUTCFullYear()}`
}

export async function downloadAssetAttachment(assetId: string, attachmentId: string, name: string) {
  const blob = await assetAPI.downloadAttachment(assetId, attachmentId)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

