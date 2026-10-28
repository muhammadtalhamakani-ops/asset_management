import mongoose from 'mongoose';
import { SetupMaster } from './models/SetupMaster.js';
import { SetupItem } from './models/SetupItem.js';
import { Project } from './models/Project.js';
import { Supplier } from './models/Supplier.js';
import { seedSetupMasters, nextSetupCode } from './setup.js';

export const assetRelations = {
  categoryId: ['Asset Category', 'category'], departmentId: ['Department', 'department'],
  makeId: ['Make', 'manufacturer'], modelId: ['Model', 'model'],
  warrantyId: ['Warranty', 'warranty'], statusId: ['Status', 'status'],
};
export const workflowStatuses = {
  available: 'Available', inUse: 'In use', inTransit: 'In transit',
  lowStock: 'Low stock', underInspection: 'Under inspection', damaged: 'Damaged',
};
export const defaultProjects = ['Dubai Creek Harbour - Tower C', 'Business Bay Business Park Extension', 'Dubai Marina - Tower 3', 'Al Quoz Logistics Hub', 'Palm Jumeirah Villa Development', 'Jebel Ali Industrial Yard'];
export const invalid = (message, status = 400) => Object.assign(new Error(message), { status });

export async function initializeAssetCatalog() {
  await seedSetupMasters();
  await Project.init();
  await SetupMaster.updateOne({ name: 'Status' }, { $setOnInsert: { name: 'Status', isActive: true } }, { upsert: true });
  const master = await SetupMaster.findOne({ name: 'Status' });
  for (const [key, name] of Object.entries(workflowStatuses)) {
    if (await SetupItem.exists({ systemKey: `asset:${key}` })) continue;
    const existing = await SetupItem.findOne({ parentId: master._id, normalizedName: name.toLowerCase(), isActive: true });
    if (existing) {
      // Migration-only write: user updates cannot modify stable system keys.
      await SetupItem.collection.updateOne({ _id: existing._id }, { $set: { systemKey: `asset:${key}` } });
    } else {
      try { await SetupItem.create({ name, parentId: master._id, code: await nextSetupCode(), systemKey: `asset:${key}` }); }
      catch (error) { if (error.code !== 11000) throw error; }
    }
  }
  for (const name of defaultProjects) {
    try { await Project.updateOne({ name }, { $setOnInsert: { name, isActive: true } }, { upsert: true }); }
    catch (error) { if (error.code !== 11000) throw error; }
  }
}

export async function setAssetStatus(asset, key) {
  const item = await SetupItem.findOne({ systemKey: `asset:${key}`, isActive: true });
  if (!item) throw invalid('Required workflow status is unavailable.', 409);
  asset.statusId = item._id;
  asset.status = item.name;
  asset.statusKey = key;
}

export async function hasAssetStatus(asset, key) {
  const item = await SetupItem.findOne({ systemKey: `asset:${key}` });
  return item ? String(asset.statusId) === String(item._id) : asset.status === workflowStatuses[key];
}

export async function validateAssetRelations(body, current) {
  const result = {};
  for (const [field, [masterName, label]] of Object.entries(assetRelations)) {
    const id = body[field];
    if (!id && field === 'warrantyId') { result[field] = null; result[label] = ''; continue; }
    if (!mongoose.isObjectIdOrHexString(id)) throw invalid(`Select a valid ${masterName}.`);
    const master = await SetupMaster.findOne({ name: masterName, isActive: true });
    const item = master && await SetupItem.findOne({ _id: id, parentId: master._id });
    // Existing inactive selections can be retained; new selections must be active.
    if (!item || (!item.isActive && String(current?.[field]) !== String(id))) throw invalid(`${masterName} is unavailable.`);
    result[field] = item._id;
    result[label] = item.name;
    if (field === 'statusId') result.statusKey = item.systemKey?.replace('asset:', '') || '';
  }
  if (!mongoose.isObjectIdOrHexString(body.project_id)) throw invalid('Select a valid Project.');
  const project = await Project.findById(body.project_id);
  if (!project || (!project.isActive && String(current?.project_id) !== String(project._id))) throw invalid('Project is unavailable.');
  result.project_id = project._id;
  result.project = project.name;
  if (body.supplierId) {
    if (!mongoose.isObjectIdOrHexString(body.supplierId)) throw invalid('Select a valid Supplier.');
    const supplier = await Supplier.findById(body.supplierId);
    if (!supplier || (!supplier.isActive && String(current?.supplierId) !== String(supplier._id))) throw invalid('Supplier is unavailable.');
    result.supplierId = supplier._id;
    result.supplier = supplier.companyName;
  } else { result.supplierId = null; result.supplier = ''; }
  return result;
}

export async function assetData(asset, lookups) {
  const data = asset.toObject ? asset.toObject() : { ...asset };
  for (const [field, [, label]] of Object.entries(assetRelations)) {
    if (!data[field]) continue;
    const item = lookups ? lookups.items.get(String(data[field])) : await SetupItem.findById(data[field]);
    if (item) {
      data[label] = item.name;
      if (field === 'statusId') data.statusKey = item.systemKey?.replace('asset:', '') || '';
    }
  }
  if (data.project_id) data.project = (lookups ? lookups.projects.get(String(data.project_id)) : await Project.findById(data.project_id))?.name || data.project;
  const supplier = data.supplierId ? (lookups ? lookups.suppliers.get(String(data.supplierId)) : await Supplier.findById(data.supplierId)) : null;
  if (supplier) data.supplier = supplier.companyName;
  data.supplierContact = supplier?.phone?.trim() || '';
  data.attachments = (data.attachments || []).map(({ storageKey: _storageKey, ...attachment }) => attachment);
  delete data.ownerEmail;
  return data;
}

export async function assetsData(assets) {
  const itemIds = assets.flatMap((asset) => Object.keys(assetRelations).map((field) => asset[field]).filter(Boolean));
  const [items, projects, suppliers] = await Promise.all([
    SetupItem.find({ _id: { $in: itemIds } }).lean(),
    Project.find({ _id: { $in: assets.map((asset) => asset.project_id).filter(Boolean) } }).lean(),
    Supplier.find({ _id: { $in: assets.map((asset) => asset.supplierId).filter(Boolean) } }).lean(),
  ]);
  const byId = (rows) => new Map(rows.map((row) => [String(row._id), row]));
  const lookups = { items: byId(items), projects: byId(projects), suppliers: byId(suppliers) };
  return Promise.all(assets.map((asset) => assetData(asset, lookups)));
}
