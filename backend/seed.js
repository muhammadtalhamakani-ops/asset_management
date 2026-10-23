/**
 * Seed script - populates MongoDB with realistic data for a Dubai-based
 * construction company ("Al Marasi Construction LLC").
 * Run with: npm run seed  (from the backend/ directory)
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import { Asset } from './models/Asset.js';
import { Movement } from './models/Movement.js';
import { Inspection } from './models/Inspection.js';
import { Return } from './models/Return.js';
import { Assembly } from './models/Assembly.js';
import User from './models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const PROJECTS = [
  'Dubai Creek Harbour - Tower C',
  'Business Bay Business Park Extension',
  'Dubai Marina - Tower 3',
  'Al Quoz Logistics Hub',
  'Palm Jumeirah Villa Development',
  'Jebel Ali Industrial Yard',
];

const LOCATIONS = [
  'Dubai Creek Harbour, Plot DCH-12',
  'Business Bay, Tower C Level 2',
  'Dubai Marina, Tower 3 Level 12',
  'Al Quoz Logistics Hub, Warehouse 4',
  'Palm Jumeirah, Villa Cluster D',
  'Jebel Ali Industrial Yard, Bay 7',
  'Store room - Main Yard',
  'Steel yard - Al Quoz',
];

const SUPPLIERS = [
  'Conares Steel',
  'Al Jaber Building Materials',
  'Emirates Concrete Products',
  'RAK Ceramics Trading',
  'Al Naboodah Equipment Rentals',
  'Dubai Cable Company',
];

// ---------- Users ----------
const USERS = [
  { email: 'ahmed.mansouri@almarasi.ae', name: 'Ahmed Al Mansouri', role: 'Site Manager', password: 'Passw0rd!1' },
  { email: 'fatima.rashid@almarasi.ae', name: 'Fatima Al Rashid', role: 'Admin', password: 'Passw0rd!2' },
  { email: 'ravi.kumar@almarasi.ae', name: 'Ravi Kumar', role: 'Store Keeper', password: 'Passw0rd!3' },
  { email: 'sara.abdullah@almarasi.ae', name: 'Sara Abdullah', role: 'Safety Officer', password: 'Passw0rd!4' },
  { email: 'john.dsouza@almarasi.ae', name: 'John D\'Souza', role: 'Site Engineer', password: 'Passw0rd!5' },
  { email: 'harmandemo@fastymtech.ae', name: 'Harman Demo', role: 'Admin', password: 'harmandemo' },
];

// ---------- Assets ----------
const ASSETS = [
  { code: 'MAC-021', name: 'Excavator CAT 320', type: 'Reusable asset', serial: 'CAT320-778812', category: 'Machinery', subcategory: 'Earthmoving', description: 'Hydraulic crawler excavator, 20-ton class', manufacturer: 'Caterpillar', model: '320 GC', quantity: 2, unit: 'units', minimum: 1, unitCost: 450000, supplier: 'Al Naboodah Equipment Rentals', project: 'Dubai Creek Harbour - Tower C', location: 'Dubai Creek Harbour, Plot DCH-12', status: 'In use', qrCode: 'QR-MAC-021', remarks: 'Scheduled service due next month' },
  { code: 'MAC-022', name: 'Tower Crane Potain MDT 178', type: 'Reusable asset', serial: 'POT178-55214', category: 'Machinery', subcategory: 'Lifting', description: 'Topless tower crane, 8t max capacity', manufacturer: 'Potain', model: 'MDT 178', quantity: 1, unit: 'units', minimum: 1, unitCost: 980000, supplier: 'Al Naboodah Equipment Rentals', project: 'Dubai Marina - Tower 3', location: 'Dubai Marina, Tower 3 Level 12', status: 'In use', qrCode: 'QR-MAC-022', remarks: 'Erected on site, monthly inspection required' },
  { code: 'MAC-023', name: 'Concrete Mixer Truck', type: 'Reusable asset', serial: 'CMX-90931', category: 'Machinery', subcategory: 'Concrete', description: '6m3 transit mixer truck', manufacturer: 'SANY', model: 'SY306C', quantity: 3, unit: 'units', minimum: 1, unitCost: 260000, supplier: 'Emirates Concrete Products', project: 'Business Bay Business Park Extension', location: 'Business Bay, Tower C Level 2', status: 'Available', qrCode: 'QR-MAC-023', remarks: 'Fleet rotates between active pours' },
  { code: 'MAC-024', name: 'Diesel Generator 250kVA', type: 'Reusable asset', serial: 'GEN250-44120', category: 'Machinery', subcategory: 'Power', description: 'Silent canopy diesel generator', manufacturer: 'FG Wilson', model: 'P250-5', quantity: 4, unit: 'units', minimum: 2, unitCost: 85000, supplier: 'Al Naboodah Equipment Rentals', project: 'Al Quoz Logistics Hub', location: 'Al Quoz Logistics Hub, Warehouse 4', status: 'Available', qrCode: 'QR-MAC-024', remarks: 'Backup power for site offices' },
  { code: 'STL-016', name: 'Rebar 16 mm', type: 'Material', category: 'Steel', subcategory: 'Reinforcement', description: 'Deformed reinforcement steel bar, 16mm dia, Grade 60', manufacturer: 'Conares Steel', model: 'BS4449 Gr.60', quantity: 1200, unit: 'kg', minimum: 300, unitCost: 3.2, supplier: 'Conares Steel', project: 'Dubai Creek Harbour - Tower C', location: 'Steel yard - Al Quoz', status: 'Available', qrCode: 'QR-STL-016', remarks: 'Stored under cover, batch #CR-2291' },
  { code: 'STL-012', name: 'Rebar 12 mm', type: 'Material', category: 'Steel', subcategory: 'Reinforcement', description: 'Deformed reinforcement steel bar, 12mm dia, Grade 60', manufacturer: 'Conares Steel', model: 'BS4449 Gr.60', quantity: 850, unit: 'kg', minimum: 200, unitCost: 3.1, supplier: 'Conares Steel', project: 'Business Bay Business Park Extension', location: 'Steel yard - Al Quoz', status: 'Available', qrCode: 'QR-STL-012', remarks: 'Batch #CR-2298' },
  { code: 'STL-025', name: 'Steel Mesh Sheet A252', type: 'Material', category: 'Steel', subcategory: 'Reinforcement', description: 'Welded steel fabric mesh sheet, 2.4m x 4.8m', manufacturer: 'Conares Steel', model: 'A252', quantity: 60, unit: 'pieces', minimum: 15, unitCost: 145, supplier: 'Conares Steel', project: 'Palm Jumeirah Villa Development', location: 'Steel yard - Al Quoz', status: 'Available', qrCode: 'QR-STL-025', remarks: 'Used for slab reinforcement' },
  { code: 'MAT-104', name: 'OPC Cement 50kg Bags', type: 'Material', category: 'Materials', subcategory: 'Concrete', description: 'Ordinary Portland Cement, 50kg sealed bags', manufacturer: 'Al Jaber Building Materials', model: 'OPC 42.5N', quantity: 420, unit: 'box', minimum: 100, unitCost: 18.5, supplier: 'Al Jaber Building Materials', project: 'Jebel Ali Industrial Yard', location: 'Al Quoz Logistics Hub, Warehouse 4', status: 'Available', qrCode: 'QR-MAT-104', remarks: 'Keep dry, rotate stock FIFO' },
  { code: 'MAT-118', name: 'Plywood Formwork Sheet 18mm', type: 'Material', category: 'Materials', subcategory: 'Formwork', description: 'Film-faced plywood sheet, 18mm, 1.22m x 2.44m', manufacturer: 'Al Jaber Building Materials', model: 'FF18', quantity: 180, unit: 'pieces', minimum: 40, unitCost: 95, supplier: 'Al Jaber Building Materials', project: 'Dubai Marina - Tower 3', location: 'Al Quoz Logistics Hub, Warehouse 4', status: 'Available', qrCode: 'QR-MAT-118', remarks: 'Reusable up to 8 pour cycles' },
  { code: 'MAT-131', name: 'Ceramic Floor Tiles 60x60', type: 'Material', category: 'Materials', subcategory: 'Finishing', description: 'Polished porcelain floor tile, 60x60cm', manufacturer: 'RAK Ceramics', model: 'RAK-Prima', quantity: 950, unit: 'box', minimum: 200, unitCost: 62, supplier: 'RAK Ceramics Trading', project: 'Palm Jumeirah Villa Development', location: 'Al Quoz Logistics Hub, Warehouse 4', status: 'Low stock', qrCode: 'QR-MAT-131', remarks: 'Reorder placed with supplier' },
  { code: 'HRD-104', name: 'Safety Helmets', type: 'Countable / Consumable', category: 'Hardware', subcategory: 'PPE', description: 'ANSI-rated safety helmet with chin strap', manufacturer: '3M', model: 'H-700', quantity: 220, unit: 'units', minimum: 50, unitCost: 28, supplier: 'Al Jaber Building Materials', project: 'Business Bay Business Park Extension', location: 'Store room - Main Yard', status: 'Available', qrCode: 'QR-HRD-104', remarks: 'Assigned per worker on induction' },
  { code: 'HRD-107', name: 'Safety Harness Full Body', type: 'Countable / Consumable', category: 'Hardware', subcategory: 'PPE', description: 'Full body harness with dual lanyard, fall arrest rated', manufacturer: '3M', model: 'Protecta AB113', quantity: 95, unit: 'units', minimum: 20, unitCost: 165, supplier: 'Al Jaber Building Materials', project: 'Dubai Marina - Tower 3', location: 'Store room - Main Yard', status: 'Available', qrCode: 'QR-HRD-107', remarks: 'Mandatory for working at height crews' },
  { code: 'HRD-112', name: 'Power Drill Set', type: 'Reusable asset', category: 'Hardware', subcategory: 'Power Tools', description: 'Cordless hammer drill set with battery kit', manufacturer: 'Bosch', model: 'GSB 18V-55', quantity: 24, unit: 'set', minimum: 5, unitCost: 620, supplier: 'Al Jaber Building Materials', project: 'Al Quoz Logistics Hub', location: 'Store room - Main Yard', status: 'Available', qrCode: 'QR-HRD-112', remarks: 'Issued to MEP and carpentry crews' },
  { code: 'SCF-031', name: 'Scaffold Frame Set (Cuplock)', type: 'Scaffolding', category: 'Scaffolding', subcategory: 'Cuplock system', description: 'Standard cuplock scaffold frame, 2m x 1.2m', manufacturer: 'Layher', model: 'Cuplock Std', quantity: 340, unit: 'pieces', minimum: 80, unitCost: 210, supplier: 'Al Naboodah Equipment Rentals', project: 'Dubai Creek Harbour - Tower C', location: 'Dubai Creek Harbour, Plot DCH-12', status: 'In use', qrCode: 'QR-SCF-031', remarks: 'Facade scaffold, tagged green' },
  { code: 'FRM-045', name: 'Wall Formwork Panel System', type: 'Formwork', category: 'Materials', subcategory: 'Formwork', description: 'Aluminium wall formwork panel, modular', manufacturer: 'PERI', model: 'MAXIMO', quantity: 150, unit: 'pieces', minimum: 30, unitCost: 480, supplier: 'Al Jaber Building Materials', project: 'Business Bay Business Park Extension', location: 'Business Bay, Tower C Level 2', status: 'Available', qrCode: 'QR-FRM-045', remarks: 'Used for core wall pours' },
  { code: 'MAC-030', name: 'Electric Cable Reel 100m', type: 'Countable / Consumable', category: 'Hardware', subcategory: 'Electrical', description: 'Heavy duty armoured cable reel, 100m, 415V', manufacturer: 'Dubai Cable Company', model: 'DCC-100HD', quantity: 45, unit: 'units', minimum: 10, unitCost: 340, supplier: 'Dubai Cable Company', project: 'Jebel Ali Industrial Yard', location: 'Al Quoz Logistics Hub, Warehouse 4', status: 'Available', qrCode: 'QR-MAC-030', remarks: 'Temporary power distribution' },
  { code: 'MAT-140', name: 'Curing Compound Drums', type: 'Material', category: 'Materials', subcategory: 'Concrete', description: 'Wax-based concrete curing compound, 200L drum', manufacturer: 'Emirates Concrete Products', model: 'CureShield 200', quantity: 38, unit: 'units', minimum: 10, unitCost: 410, supplier: 'Emirates Concrete Products', project: 'Dubai Marina - Tower 3', location: 'Al Quoz Logistics Hub, Warehouse 4', status: 'Available', qrCode: 'QR-MAT-140', remarks: 'Applied within 2 hours of pour' },
  { code: 'MAC-041', name: 'Passenger Hoist', type: 'Reusable asset', serial: 'PH-2201', category: 'Machinery', subcategory: 'Vertical Transport', description: 'Twin-cage construction passenger hoist, 2000kg', manufacturer: 'Alimak', model: 'Scando 650', quantity: 1, unit: 'units', minimum: 1, unitCost: 620000, supplier: 'Al Naboodah Equipment Rentals', project: 'Dubai Marina - Tower 3', location: 'Dubai Marina, Tower 3 Level 12', status: 'Under inspection', qrCode: 'QR-MAC-041', remarks: 'Annual load test in progress' },
  { code: 'HRD-120', name: 'Fire Extinguishers (9kg DCP)', type: 'Countable / Consumable', category: 'Hardware', subcategory: 'Safety', description: 'Dry chemical powder fire extinguisher, 9kg', manufacturer: 'Gulf Fire', model: 'DCP-9', quantity: 60, unit: 'units', minimum: 15, unitCost: 210, supplier: 'Al Jaber Building Materials', project: 'Palm Jumeirah Villa Development', location: 'Store room - Main Yard', status: 'Available', qrCode: 'QR-HRD-120', remarks: 'Distributed across site offices and stores' },
];

// ---------- Movement history templates ----------
const MOVEMENTS = [
  { type: 'receive', assetCode: 'STL-016', quantity: 400, supplier: 'Conares Steel', grn: 'GRN-2201', project: 'Dubai Creek Harbour - Tower C', remarks: 'Delivery batch #CR-2291', recordedBy: 'Ravi Kumar', daysAgo: 14 },
  { type: 'receive', assetCode: 'MAT-104', quantity: 150, supplier: 'Al Jaber Building Materials', grn: 'GRN-2202', project: 'Jebel Ali Industrial Yard', remarks: 'Monthly cement restock', recordedBy: 'Ravi Kumar', daysAgo: 12 },
  { type: 'receive', assetCode: 'MAT-131', quantity: 300, supplier: 'RAK Ceramics Trading', grn: 'GRN-2203', project: 'Palm Jumeirah Villa Development', remarks: 'Tile shipment for villa cluster D', recordedBy: 'Ravi Kumar', daysAgo: 9 },
  { type: 'issue', assetCode: 'MAC-021', quantity: 1, recipientName: 'Earthworks Team - Ahmed Al Mansouri', project: 'Dubai Creek Harbour - Tower C', remarks: 'Assigned for excavation phase 2', recordedBy: 'Ahmed Al Mansouri', daysAgo: 8 },
  { type: 'issue', assetCode: 'HRD-104', quantity: 40, recipientName: 'New site inductees batch 12', project: 'Business Bay Business Park Extension', remarks: 'Induction day PPE issue', recordedBy: 'Sara Abdullah', daysAgo: 7 },
  { type: 'issue', assetCode: 'HRD-107', quantity: 15, recipientName: 'Facade crew - John D\'Souza', project: 'Dubai Marina - Tower 3', remarks: 'Working at height crew', recordedBy: 'Sara Abdullah', daysAgo: 6 },
  { type: 'transfer', assetCode: 'SCF-031', quantity: 120, fromLocation: 'Al Quoz Logistics Hub, Warehouse 4', toLocation: 'Dubai Creek Harbour, Plot DCH-12', project: 'Dubai Creek Harbour - Tower C', remarks: 'Facade scaffold assembly relocation', recordedBy: 'Ahmed Al Mansouri', daysAgo: 5 },
  { type: 'transfer', assetCode: 'MAC-023', quantity: 1, fromLocation: 'Business Bay, Tower C Level 2', toLocation: 'Dubai Marina, Tower 3 Level 12', project: 'Dubai Marina - Tower 3', remarks: 'Reallocated for slab pour', recordedBy: 'John D\'Souza', daysAgo: 4 },
  { type: 'receive', assetCode: 'FRM-045', quantity: 50, supplier: 'Al Jaber Building Materials', grn: 'GRN-2204', project: 'Business Bay Business Park Extension', remarks: 'New formwork panels for core wall', recordedBy: 'Ravi Kumar', daysAgo: 3 },
  { type: 'issue', assetCode: 'MAT-118', quantity: 60, recipientName: 'Carpentry team - Zone B', project: 'Dubai Marina - Tower 3', remarks: 'Formwork sheets for column casting', recordedBy: 'John D\'Souza', daysAgo: 2 },
  { type: 'transfer', assetCode: 'MAC-024', quantity: 2, fromLocation: 'Al Quoz Logistics Hub, Warehouse 4', toLocation: 'Jebel Ali Industrial Yard, Bay 7', project: 'Jebel Ali Industrial Yard', remarks: 'Backup power for warehouse expansion', recordedBy: 'Ahmed Al Mansouri', daysAgo: 1 },
  { type: 'receive', assetCode: 'STL-012', quantity: 500, supplier: 'Conares Steel', grn: 'GRN-2205', project: 'Business Bay Business Park Extension', remarks: 'Delivery batch #CR-2298', recordedBy: 'Ravi Kumar', daysAgo: 20 },
  { type: 'receive', assetCode: 'STL-025', quantity: 80, supplier: 'Conares Steel', grn: 'GRN-2206', project: 'Palm Jumeirah Villa Development', remarks: 'Mesh sheet delivery for slab works', recordedBy: 'Ravi Kumar', daysAgo: 18 },
  { type: 'issue', assetCode: 'STL-016', quantity: 300, recipientName: 'Steel fixing team - Zone C', project: 'Dubai Creek Harbour - Tower C', remarks: 'Rebar issued for column cage tying', recordedBy: 'Ahmed Al Mansouri', daysAgo: 11 },
  { type: 'receive', assetCode: 'MAC-030', quantity: 60, supplier: 'Dubai Cable Company', grn: 'GRN-2207', project: 'Jebel Ali Industrial Yard', remarks: 'New cable reel stock for temporary power', recordedBy: 'Ravi Kumar', daysAgo: 16 },
  { type: 'transfer', assetCode: 'MAC-030', quantity: 15, fromLocation: 'Al Quoz Logistics Hub, Warehouse 4', toLocation: 'Jebel Ali Industrial Yard, Bay 7', project: 'Jebel Ali Industrial Yard', remarks: 'Temporary power distribution for warehouse bay', recordedBy: 'John D\'Souza', daysAgo: 9 },
  { type: 'issue', assetCode: 'HRD-112', quantity: 24, recipientName: 'MEP team - Zone A', project: 'Al Quoz Logistics Hub', remarks: 'Power drill sets issued for conduit fixing', recordedBy: 'Ravi Kumar', daysAgo: 9 },
  { type: 'issue', assetCode: 'MAT-140', quantity: 12, recipientName: 'Concrete pour crew - Tower 3', project: 'Dubai Marina - Tower 3', remarks: 'Curing compound issued after slab pour', recordedBy: 'John D\'Souza', daysAgo: 3 },
  { type: 'issue', assetCode: 'HRD-120', quantity: 20, recipientName: 'Site offices and stores', project: 'Palm Jumeirah Villa Development', remarks: 'Fire extinguishers distributed to cabins', recordedBy: 'Sara Abdullah', daysAgo: 15 },
  { type: 'transfer', assetCode: 'MAC-022', quantity: 1, fromLocation: 'Al Quoz Logistics Hub, Warehouse 4', toLocation: 'Dubai Marina, Tower 3 Level 12', project: 'Dubai Marina - Tower 3', remarks: 'Tower crane mobilised and erected on site', recordedBy: 'Ahmed Al Mansouri', daysAgo: 45 },
  { type: 'transfer', assetCode: 'MAC-041', quantity: 1, fromLocation: 'Al Quoz Logistics Hub, Warehouse 4', toLocation: 'Dubai Marina, Tower 3 Level 12', project: 'Dubai Marina - Tower 3', remarks: 'Passenger hoist mobilised for facade access', recordedBy: 'Ahmed Al Mansouri', daysAgo: 30 },
  { type: 'receive', assetCode: 'HRD-104', quantity: 60, supplier: 'Al Jaber Building Materials', grn: 'GRN-2208', project: 'Business Bay Business Park Extension', remarks: 'PPE restock ahead of new crew induction', recordedBy: 'Ravi Kumar', daysAgo: 22 },
];

// ---------- Inspections ----------
const INSPECTIONS = [
  { assetCode: 'MAC-041', type: 'Safety check', condition: 'Good', status: 'Pass', location: 'Dubai Marina, Tower 3 Level 12', inspector: 'Sara Abdullah', remarks: 'Annual load test completed successfully', daysAgo: 1,
    checklist: [{ item: 'Emergency stop function', checked: true, remarks: 'OK' }, { item: 'Cage door interlocks', checked: true, remarks: 'OK' }, { item: 'Load test 2000kg', checked: true, remarks: 'Passed' }] },
  { assetCode: 'SCF-031', type: 'Condition assessment', condition: 'Good', status: 'Pass', location: 'Dubai Creek Harbour, Plot DCH-12', inspector: 'Ahmed Al Mansouri', remarks: 'Weekly scaffold tag inspection', daysAgo: 3,
    checklist: [{ item: 'Base plates secure', checked: true, remarks: '' }, { item: 'Guard rails installed', checked: true, remarks: '' }, { item: 'Tag updated', checked: true, remarks: 'Green tag renewed' }] },
  { assetCode: 'MAC-022', type: 'Compliance', condition: 'Fair', status: 'Needs Repair', location: 'Dubai Marina, Tower 3 Level 12', inspector: 'Sara Abdullah', remarks: 'Minor hydraulic leak found on hoist mechanism', daysAgo: 5,
    checklist: [{ item: 'Wire rope condition', checked: true, remarks: 'Minor fraying' }, { item: 'Hydraulic system', checked: false, remarks: 'Leak identified' }, { item: 'Anemometer function', checked: true, remarks: 'OK' }] },
  { assetCode: 'HRD-112', type: 'Maintenance', condition: 'Good', status: 'Pass', location: 'Store room - Main Yard', inspector: 'Ravi Kumar', remarks: 'Routine power tool maintenance check', daysAgo: 10,
    checklist: [{ item: 'Battery health', checked: true, remarks: 'OK' }, { item: 'Chuck condition', checked: true, remarks: 'OK' }] },
  { assetCode: 'MAC-021', type: 'Safety check', condition: 'Good', status: 'Pass', location: 'Dubai Creek Harbour, Plot DCH-12', inspector: 'Ahmed Al Mansouri', remarks: 'Pre-shift excavator safety walkaround', daysAgo: 2,
    checklist: [{ item: 'Tracks and undercarriage', checked: true, remarks: 'OK' }, { item: 'Bucket teeth condition', checked: true, remarks: 'OK' }, { item: 'Reverse alarm function', checked: true, remarks: 'OK' }] },
  { assetCode: 'MAC-023', type: 'Maintenance', condition: 'Good', status: 'Pass', location: 'Business Bay, Tower C Level 2', inspector: 'Ravi Kumar', remarks: 'Scheduled 250-hour service completed', daysAgo: 6,
    checklist: [{ item: 'Drum rotation motor', checked: true, remarks: 'OK' }, { item: 'Hydraulic hoses', checked: true, remarks: 'OK' }, { item: 'Chute and hopper', checked: true, remarks: 'Cleaned' }] },
  { assetCode: 'MAC-024', type: 'Maintenance', condition: 'Fair', status: 'Needs Repair', location: 'Jebel Ali Industrial Yard, Bay 7', inspector: 'Ravi Kumar', remarks: 'Fuel gauge sensor reading intermittently', daysAgo: 4,
    checklist: [{ item: 'Fuel level sensor', checked: false, remarks: 'Intermittent fault' }, { item: 'Control panel', checked: true, remarks: 'OK' }, { item: 'Enclosure and canopy', checked: true, remarks: 'OK' }] },
  { assetCode: 'FRM-045', type: 'Condition assessment', condition: 'Good', status: 'Pass', location: 'Business Bay, Tower C Level 2', inspector: 'John D\'Souza', remarks: 'Panel faces and ties checked before core wall pour', daysAgo: 7,
    checklist: [{ item: 'Panel face condition', checked: true, remarks: 'OK' }, { item: 'Tie rods and wing nuts', checked: true, remarks: 'OK' }, { item: 'Release agent applied', checked: true, remarks: 'OK' }] },
  { assetCode: 'HRD-104', type: 'Compliance', condition: 'Good', status: 'Pass', location: 'Store room - Main Yard', inspector: 'Sara Abdullah', remarks: 'Batch check for cracks and expiry compliance', daysAgo: 14,
    checklist: [{ item: 'Shell integrity', checked: true, remarks: 'OK' }, { item: 'Chin strap and liner', checked: true, remarks: 'OK' }, { item: 'Manufacture date within limit', checked: true, remarks: 'OK' }] },
  { assetCode: 'HRD-120', type: 'Compliance', condition: 'Fair', status: 'Needs Repair', location: 'Store room - Main Yard', inspector: 'Sara Abdullah', remarks: 'Two units below gauge pressure, tagged for refill', daysAgo: 5,
    checklist: [{ item: 'Pressure gauge reading', checked: false, remarks: '2 units low pressure' }, { item: 'Pin and seal intact', checked: true, remarks: 'OK' }, { item: 'Signage and access clear', checked: true, remarks: 'OK' }] },
  { assetCode: 'MAC-030', type: 'Safety check', condition: 'Good', status: 'Pass', location: 'Jebel Ali Industrial Yard, Bay 7', inspector: 'John D\'Souza', remarks: 'Insulation and earthing check before deployment', daysAgo: 8,
    checklist: [{ item: 'Cable insulation', checked: true, remarks: 'OK' }, { item: 'Plug and socket condition', checked: true, remarks: 'OK' }, { item: 'Earth continuity test', checked: true, remarks: 'Passed' }] },
];

// ---------- Returns / damage ----------
const RETURNS = [
  { assetCode: 'HRD-107', type: 'Damage', quantityIssued: 15, quantityReturned: 13, quantityDamaged: 2, quantityMissing: 0, condition: 'Damaged', damageDescription: 'Stitching torn on lanyard attachment point', responsibleParty: 'Facade crew - John D\'Souza', location: 'Dubai Marina, Tower 3 Level 12', resolution: 'Replacement pending', replacementCost: 330, remarks: 'Damaged units withdrawn from service', recordedBy: 'Sara Abdullah', daysAgo: 4 },
  { assetCode: 'HRD-112', type: 'Return', quantityIssued: 24, quantityReturned: 24, quantityDamaged: 0, quantityMissing: 0, condition: 'Good', damageDescription: '', responsibleParty: 'MEP team - Zone A', location: 'Store room - Main Yard', resolution: 'Closed', replacementCost: 0, remarks: 'End of task return, all accounted for', recordedBy: 'Ravi Kumar', daysAgo: 6 },
  { assetCode: 'MAT-118', type: 'Variance', quantityIssued: 60, quantityReturned: 55, quantityDamaged: 3, quantityMissing: 2, condition: 'Damaged', damageDescription: 'Sheets cracked during handling, 2 sheets unaccounted for', responsibleParty: 'Carpentry team - Zone B', location: 'Dubai Marina, Tower 3 Level 12', resolution: 'Under investigation', replacementCost: 190, remarks: 'Incident reported to site engineer', recordedBy: 'John D\'Souza', daysAgo: 2 },
  { assetCode: 'MAC-030', type: 'Damage', quantityIssued: 15, quantityReturned: 14, quantityDamaged: 1, quantityMissing: 0, condition: 'Damaged', damageDescription: 'Outer cable jacket cut by sharp debris during pull', responsibleParty: 'John D\'Souza', location: 'Jebel Ali Industrial Yard, Bay 7', resolution: 'Repair pending', replacementCost: 120, remarks: 'Reel withdrawn for insulation repair before reuse', recordedBy: 'John D\'Souza', daysAgo: 5 },
  { assetCode: 'MAT-140', type: 'Loss', quantityIssued: 12, quantityReturned: 9, quantityDamaged: 0, quantityMissing: 3, condition: 'Missing', damageDescription: 'Drums unaccounted for after weekend pour, suspected spillage', responsibleParty: 'Concrete pour crew - Tower 3', location: 'Dubai Marina, Tower 3 Level 12', resolution: 'Under investigation', replacementCost: 1230, remarks: 'Site engineer reviewing CCTV and delivery logs', recordedBy: 'John D\'Souza', daysAgo: 1 },
];

// ---------- Assemblies ----------
const ASSEMBLIES = [
  { code: 'ASM-011', name: 'Facade Scaffold Assembly - DCH Tower C', type: 'Scaffolding', description: 'Full facade access scaffold covering levels 8-14', location: 'Dubai Creek Harbour, Plot DCH-12', project: 'Dubai Creek Harbour - Tower C', status: 'In use',
    parentAssetCode: 'SCF-031', parentQty: 120,
    components: [
      { componentName: 'Standard frame 2m x 1.2m', required: 120, onAssembly: 120, condition: 'Pass' },
      { componentName: 'Guard rail post', required: 40, onAssembly: 38, condition: 'Missing' },
      { componentName: 'Base plate', required: 60, onAssembly: 60, condition: 'Pass' },
      { componentName: 'Toe board', required: 40, onAssembly: 40, condition: 'Pass' },
    ], remarks: 'Missing guard rail posts flagged for restock', daysAgoInspection: 3 },
  { code: 'ASM-012', name: 'Core Wall Formwork Set - Business Bay', type: 'Formwork', description: 'Modular aluminium formwork set for lift core walls', location: 'Business Bay, Tower C Level 2', project: 'Business Bay Business Park Extension', status: 'Available',
    parentAssetCode: 'FRM-045', parentQty: 50,
    components: [
      { componentName: 'Wall panel 600mm', required: 50, onAssembly: 50, condition: 'Pass' },
      { componentName: 'Tie rod', required: 100, onAssembly: 96, condition: 'Damaged' },
      { componentName: 'Wing nut', required: 100, onAssembly: 100, condition: 'Pass' },
    ], remarks: 'A few tie rods bent, replacement requested', daysAgoInspection: 8 },
  { code: 'ASM-013', name: 'Access Stair Tower - Palm Jumeirah', type: 'Other', description: 'Temporary access stair tower serving villa cluster D upper levels', location: 'Palm Jumeirah, Villa Cluster D', project: 'Palm Jumeirah Villa Development', status: 'Incomplete',
    parentAssetCode: null, parentQty: 0,
    components: [
      { componentName: 'Stair flight 3m', required: 8, onAssembly: 6, condition: 'Missing' },
      { componentName: 'Landing platform', required: 4, onAssembly: 4, condition: 'Pass' },
      { componentName: 'Handrail section', required: 16, onAssembly: 14, condition: 'Damaged' },
    ], remarks: 'Two stair flights delayed from supplier; handrails bent during transport', daysAgoInspection: 2 },
];

async function seed() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set. Check backend/.env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  console.log('🧹 Clearing existing collections...');
  await Promise.all([
    Asset.deleteMany({}),
    Movement.deleteMany({}),
    Inspection.deleteMany({}),
    Return.deleteMany({}),
    Assembly.deleteMany({}),
    User.deleteMany({}),
  ]);

  // ---- Users ----
  console.log('👤 Seeding users...');
  for (const u of USERS) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    await User.create({ email: u.email, password: hashedPassword, name: u.name, role: u.role });
  }
  console.log(`   ${USERS.length} users created. Default password pattern: Passw0rd!<n>`);

  // ---- Assets ----
  console.log('📦 Seeding assets...');
  const savedAssets = {};
  for (const a of ASSETS) {
    const value = `AED ${(a.quantity * a.unitCost).toLocaleString()}`;
    const purchaseDate = new Date(Date.now() - (90 + Math.floor(Math.random() * 400)) * 24 * 60 * 60 * 1000);
    const asset = await Asset.create({
      ...a,
      department: a.department || 'General',
      value,
      purchaseDate,
      receiveDate: purchaseDate,
      createdBy: 'System Seed',
      lastModifiedBy: 'System Seed',
    });
    savedAssets[a.code] = asset;
  }
  console.log(`   ${ASSETS.length} assets created.`);

  // ---- Movements ----
  console.log('🚚 Seeding movement history...');
  let movementCounter = 1;
  for (const m of MOVEMENTS) {
    const asset = savedAssets[m.assetCode];
    if (!asset) continue;
    const timestamp = new Date(Date.now() - m.daysAgo * 24 * 60 * 60 * 1000);
    const prefix = m.type === 'receive' ? 'GRN' : m.type === 'issue' ? 'ISS' : 'TRF';
    const statusMap = { receive: 'Received', issue: 'Issued', transfer: 'Transferred' };
    await Movement.create({
      id: `${prefix}-${String(movementCounter++).padStart(4, '0')}`,
      type: m.type,
      assetId: asset._id,
      assetCode: asset.code,
      assetName: asset.name,
      quantity: m.quantity,
      unit: asset.unit,
      fromLocation: m.fromLocation || (m.type !== 'receive' ? asset.location : null),
      toLocation: m.toLocation || (m.type === 'receive' ? asset.location : null),
      supplier: m.supplier || null,
      grn: m.grn || null,
      recipientName: m.recipientName || null,
      status: statusMap[m.type],
      remarks: m.remarks,
      recordedBy: m.recordedBy,
      project: m.project,
      timestamp,
    });
  }
  console.log(`   ${MOVEMENTS.length} movements created.`);

  // ---- Inspections ----
  console.log('🛡️ Seeding inspections...');
  let inspCounter = 1;
  for (const i of INSPECTIONS) {
    const asset = savedAssets[i.assetCode];
    if (!asset) continue;
    const inspectionDate = new Date(Date.now() - i.daysAgo * 24 * 60 * 60 * 1000);
    await Inspection.create({
      id: `INSP-${String(inspCounter++).padStart(4, '0')}`,
      assetId: asset._id,
      assetCode: asset.code,
      assetName: asset.name,
      type: i.type,
      checklist: i.checklist,
      condition: i.condition,
      status: i.status,
      location: i.location,
      inspector: { name: i.inspector, signature: i.inspector },
      correctionActions: i.status === 'Needs Repair' ? [{ action: 'Repair hydraulic leak', assignedTo: 'Maintenance contractor', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), completed: false }] : [],
      nextInspectionDue: new Date(inspectionDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      remarks: i.remarks,
      inspectionDate,
    });
  }
  console.log(`   ${INSPECTIONS.length} inspections created.`);

  // ---- Returns ----
  console.log('↩️ Seeding return/damage records...');
  let retCounter = 1;
  for (const r of RETURNS) {
    const asset = savedAssets[r.assetCode];
    if (!asset) continue;
    const returnDate = new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000);
    await Return.create({
      id: `RET-${String(retCounter++).padStart(4, '0')}`,
      assetId: asset._id,
      assetCode: asset.code,
      assetName: asset.name,
      type: r.type,
      quantityIssued: r.quantityIssued,
      quantityReturned: r.quantityReturned,
      quantityDamaged: r.quantityDamaged,
      quantityMissing: r.quantityMissing,
      condition: r.condition,
      damageDescription: r.damageDescription,
      responsibleParty: r.responsibleParty,
      location: r.location,
      resolution: r.resolution,
      replacementCost: r.replacementCost,
      remarks: r.remarks,
      recordedBy: r.recordedBy,
      returnDate,
    });
  }
  console.log(`   ${RETURNS.length} return/damage records created.`);

  // ---- Assemblies ----
  console.log('🏗️ Seeding assemblies...');
  for (const a of ASSEMBLIES) {
    const parentAsset = savedAssets[a.parentAssetCode];
    const lastInspection = new Date(Date.now() - a.daysAgoInspection * 24 * 60 * 60 * 1000);
    await Assembly.create({
      code: a.code,
      name: a.name,
      type: a.type,
      description: a.description,
      parentAssets: parentAsset ? [{ assetId: parentAsset._id, assetCode: parentAsset.code, assetName: parentAsset.name, quantity: a.parentQty, unit: parentAsset.unit }] : [],
      components: a.components,
      status: a.status,
      location: a.location,
      project: a.project,
      lastInspection,
      nextInspectionDue: new Date(lastInspection.getTime() + 30 * 24 * 60 * 60 * 1000),
      remarks: a.remarks,
      createdBy: 'System Seed',
      qrCode: `QR-${a.code}`,
    });
  }
  console.log(`   ${ASSEMBLIES.length} assemblies created.`);

  console.log('\n✅ Seed complete: Al Marasi Construction LLC (Dubai) sample data loaded.');
  console.log('   Login with e.g. ahmed.mansouri@almarasi.ae / Passw0rd!1');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
