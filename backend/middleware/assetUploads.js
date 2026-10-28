import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { mkdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const assetUploadDirectory = process.env.ASSET_UPLOAD_DIR || fileURLToPath(new URL('../uploads/assets/', import.meta.url));
const allowed = new Map([
  ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.png', 'image/png'], ['.gif', 'image/gif'], ['.webp', 'image/webp'],
  ['.pdf', 'application/pdf'], ['.doc', 'application/msword'], ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
]);
const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    try { await mkdir(assetUploadDirectory, { recursive: true }); callback(null, assetUploadDirectory); }
    catch (error) { callback(error); }
  },
  filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({
  storage, limits: { files: 10, fileSize: 10 * 1024 * 1024, fields: 2, fieldSize: 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowed.get(extension) !== file.mimetype) return callback(Object.assign(new Error('Unsupported attachment format.'), { status: 400 }));
    callback(null, true);
  },
}).array('files', 10);

export function assetUploads(req, res, next) {
  upload(req, res, (error) => {
    if (error) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : error.status || 400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'Each attachment must be 10 MiB or smaller.' : error.code?.startsWith('LIMIT_') ? 'Upload limit exceeded (maximum 10 files).' : 'Unsupported attachment or upload failed.' });
    next();
  });
}

export async function removeAssetFiles(keys) {
  await Promise.all(keys.map(async (key) => {
    if (!key || path.basename(key) !== key) return;
    try { await unlink(path.join(assetUploadDirectory, key)); }
    catch (error) { if (error.code !== 'ENOENT') console.error('Unable to remove an asset attachment.'); }
  }));
}

export function uploadedAttachments(req) {
  return (req.files || []).map((file) => ({ originalName: path.basename(file.originalname), mimeType: file.mimetype, size: file.size, storageKey: file.filename }));
}
