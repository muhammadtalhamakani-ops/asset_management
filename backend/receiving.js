import mongoose from 'mongoose';
import { Asset } from './models/Asset.js';
import { Supplier } from './models/Supplier.js';
import { Project } from './models/Project.js';
import { invalid } from './assetCatalog.js';

function text(body, field, required = false) {
  if (body[field] !== undefined && typeof body[field] !== 'string') throw invalid(`${field} must be text.`);
  const value = (body[field] || '').trim();
  if (required && !value) throw invalid(`${field} is required.`);
  return value;
}
function objectId(value, label) {
  if (!mongoose.isObjectIdOrHexString(value)) throw invalid(`Select a valid ${label}.`);
  return value;
}

export async function receivingFields(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalid('Invalid receiving data.');
  const assetCode = text(body, 'assetCode').toUpperCase();
  let asset;
  if (body.assetId !== undefined) {
    asset = await Asset.findOne({ _id: objectId(body.assetId, 'Asset'), isActive: true });
  } else {
    if (!assetCode) throw invalid('Select an Asset.');
    asset = await Asset.findOne({ code: assetCode, isActive: true });
  }
  if (!asset) throw invalid('Active asset not found.', 404);
  if (assetCode && asset.code !== assetCode) throw invalid('Asset ID and code do not match.');
  if (typeof body.quantity !== 'number' || !Number.isFinite(body.quantity) || body.quantity <= 0) throw invalid('Quantity must be greater than zero.');

  const project = asset.project_id && await Project.findOne({ _id: asset.project_id, isActive: true });
  if (!project) throw invalid('Asset Project is unavailable. Correct it in Asset Register before receiving.');
  if (body.project_id !== undefined && String(objectId(body.project_id, 'Project')) !== String(project._id)) throw invalid('Receiving Project must match the selected asset.');
  if (body.project !== undefined && text(body, 'project') !== project.name) throw invalid('Receiving Project must match the selected asset.');

  let supplier;
  if (body.supplierId !== undefined) {
    supplier = await Supplier.findOne({ _id: objectId(body.supplierId, 'Supplier'), isActive: true });
  } else if (body.supplier !== undefined) {
    const name = text(body, 'supplier', true);
    const matches = await Supplier.find({ companyName: name, isActive: true }).collation({ locale: 'en', strength: 2 }).limit(2);
    if (matches.length !== 1) throw invalid('Select a valid Supplier; the supplied name has no unique active match.');
    [supplier] = matches;
  } else if (asset.supplierId) {
    supplier = await Supplier.findOne({ _id: asset.supplierId, isActive: true });
  }
  if (!supplier) throw invalid('Select an active Supplier.');

  return { asset, data: {
    assetId: asset._id, assetCode: asset.code, assetName: asset.name,
    supplierId: supplier._id, supplier: supplier.companyName,
    project_id: project._id, project: project.name,
    quantity: body.quantity, unit: asset.unit, toLocation: asset.location,
    grn: text(body, 'grn', true), billNo: text(body, 'billNo', true),
    remarks: text(body, 'remarks'), recordedBy: text(body, 'recordedBy', true),
  } };
}

// Preserve snapshot labels when historical references are inactive or missing.
export async function movementsData(movements) {
  const rows = movements.map((movement) => movement.toObject ? movement.toObject() : { ...movement });
  const supplierIds = rows.map((row) => row.supplierId).filter(Boolean);
  const projectIds = rows.map((row) => row.project_id).filter(Boolean);
  const [suppliers, projects] = await Promise.all([
    supplierIds.length ? Supplier.find({ _id: { $in: supplierIds }, isActive: true }).select('companyName').lean() : [],
    projectIds.length ? Project.find({ _id: { $in: projectIds }, isActive: true }).select('name').lean() : [],
  ]);
  const supplierNames = new Map(suppliers.map((row) => [String(row._id), row.companyName]));
  const projectNames = new Map(projects.map((row) => [String(row._id), row.name]));
  return rows.map((row) => ({ ...row,
    supplier: supplierNames.get(String(row.supplierId)) || row.supplier,
    project: projectNames.get(String(row.project_id)) || row.project,
  }));
}
