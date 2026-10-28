export type AssetAttachment = { _id: string; originalName: string; mimeType: string; size: number }
export type AssetRecord = {
  _id?: string; code: string; name: string; assetTagId: string; type: string; serial: string;
  category: string; department: string; manufacturer: string; model: string; warranty: string;
  categoryId?: string; departmentId?: string; makeId?: string; modelId?: string; warrantyId?: string;
  statusId?: string; statusKey?: string; supplierId?: string; project_id?: string; isActive?: boolean;
  subcategory: string; description: string; quantity: number; unit: string; minimum: number; unitCost: number;
  value: string; supplier: string; purchaseDate: string | null; receiveDate?: string | null;
  project: string; location: string; status: string; qrCode: string; attachments: AssetAttachment[];
  deliveryNote?: string; supplierContact?: string; legacyAttachments?: string; remarks: string;
}
export const attachmentNames = (asset: AssetRecord) => asset.attachments?.map((file) => file.originalName).join(', ') || asset.legacyAttachments || 'No files'
