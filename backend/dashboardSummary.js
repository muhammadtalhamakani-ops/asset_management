import { Asset } from './models/Asset.js';
import { SetupMaster } from './models/SetupMaster.js';
import { SetupItem } from './models/SetupItem.js';
import { Project } from './models/Project.js';

function groupsWithLabels(counts, records) {
  const byId = new Map(records.map((record) => [String(record._id), record]));
  const result = new Map(records.filter((record) => record.isActive).map((record) => [String(record._id), {
    _id: record._id, name: record.name, count: 0, isActive: true, ...(record.systemKey ? { systemKey: record.systemKey } : {}),
  }]));
  let unassigned = 0;
  for (const group of counts) {
    const record = byId.get(String(group._id));
    if (!record) { unassigned += group.count; continue; }
    result.set(String(record._id), { _id: record._id, name: record.name, count: group.count, isActive: record.isActive, ...(record.systemKey ? { systemKey: record.systemKey } : {}) });
  }
  if (unassigned) result.set('unassigned', { _id: null, name: 'Unassigned', count: unassigned, isActive: false });
  return [...result.values()].sort((a, b) => a.name.localeCompare(b.name) || String(a._id).localeCompare(String(b._id)));
}

export async function dashboardSummary() {
  // One facet keeps all counts/totals on the same active asset snapshot.
  const [aggregate, masters, projects] = await Promise.all([
    Asset.aggregate([
      { $match: { isActive: true } },
      { $facet: {
        totals: [{ $group: { _id: null, count: { $sum: 1 }, value: { $sum: { $multiply: ['$quantity', '$unitCost'] } } } }],
        byCategory: [{ $group: { _id: '$categoryId', count: { $sum: 1 } } }],
        byStatus: [{ $group: { _id: '$statusId', count: { $sum: 1 } } }],
        byProject: [{ $group: { _id: '$project_id', count: { $sum: 1 } } }],
      } },
    ]),
    SetupMaster.find({ name: { $in: ['Asset Category', 'Status'] } }).lean(),
    Project.find().select('_id name isActive').lean(),
  ]);
  const items = await SetupItem.find({ parentId: { $in: masters.map((master) => master._id) } }).select('_id name parentId isActive systemKey').lean();
  const catalog = (name) => {
    const master = masters.find((row) => row.name === name);
    return master ? items.filter((item) => String(item.parentId) === String(master._id)).map((item) => ({ ...item, isActive: !!(item.isActive && master.isActive) })) : [];
  };
  const data = aggregate[0];
  return {
    totalAssets: data?.totals[0]?.count || 0, totalValue: data?.totals[0]?.value || 0,
    byCategory: groupsWithLabels(data?.byCategory || [], catalog('Asset Category')),
    byStatus: groupsWithLabels(data?.byStatus || [], catalog('Status')),
    byProject: groupsWithLabels(data?.byProject || [], projects),
  };
}
