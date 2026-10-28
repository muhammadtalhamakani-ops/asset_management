import * as yup from 'yup'

const units = ['unit', 'pieces', 'units', 'meters', 'kg', 't', 'set', 'box', 'packet']
const requiredText = () => yup.string().trim().required('Required')
const reference = () => requiredText().matches(/^[a-f\d]{24}$/i, 'Select a valid option')
const optionalReference = () => yup.string().matches(/^[a-f\d]{24}$/i, { message: 'Select a valid option', excludeEmptyString: true })
const date = () => requiredText().test('valid-date', 'Enter a valid date', (value) => {
  if (!value) return true
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
})
const nonnegative = () => yup.number().transform((value, original) => original === '' ? 0 : value).typeError('Enter a valid number').min(0, 'Must be zero or greater').test('finite', 'Enter a finite number', (value) => value === undefined || Number.isFinite(value)).default(0)
const allowedFiles: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export function createAssetValidationSchema(editing: boolean, retainedFiles: number) {
  const quantity = yup.number().transform((value, original) => original === '' ? undefined : value).typeError('Enter a valid number').required('Required').test('finite', 'Enter a finite number', Number.isFinite)
  return yup.object({
    deliveryNote: requiredText(), code: requiredText(), name: requiredText(), location: requiredText(),
    categoryId: reference(), departmentId: reference(), makeId: reference(), modelId: reference(),
    warrantyId: optionalReference(), statusId: reference(), project_id: reference(), supplierId: optionalReference(),
    purchaseDate: date(), receiveDate: date(),
    unit: requiredText().oneOf(units, 'Select a valid unit'),
    quantity: editing ? quantity.min(0, 'Must be zero or greater') : quantity.moreThan(0, 'Must be greater than zero'),
    minimum: nonnegative(), unitCost: nonnegative(),
    files: yup.array().of(yup.mixed<File>().required('Select a file')
      .test('size', 'Each file must be 10 MiB or smaller', (file) => file.size <= 10 * 1024 * 1024)
      .test('format', 'Use JPEG, PNG, GIF, WebP, PDF, DOC or DOCX files', (file) => allowedFiles[file.name.split('.').pop()?.toLowerCase() || ''] === file.type))
      .test('count', 'Maximum 10 attachments per asset', (files) => retainedFiles + (files?.length || 0) <= 10).default([]),
  })
}
