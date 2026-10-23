import express from 'express';
import { Assembly } from '../models/Assembly.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET all assemblies
router.get('/assemblies', async (req, res) => {
  try {
    const { status, project, location } = req.query;
    let query = { ownerEmail: req.user.email };

    if (status) query.status = status;
    if (project) query.project = project;
    if (location) query.location = location;

    const assemblies = await Assembly.find(query)
      .sort({ createdAt: -1 })
      .populate('parentAssets.assetId')
      .populate('components');

    res.json({ success: true, data: assemblies, count: assemblies.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single assembly
router.get('/assemblies/:id', async (req, res) => {
  try {
    const assembly = await Assembly.findOne({ _id: req.params.id, ownerEmail: req.user.email })
      .populate('parentAssets.assetId')
      .populate('components');

    if (!assembly) {
      return res.status(404).json({ success: false, message: 'Assembly not found' });
    }
    res.json({ success: true, data: assembly });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE assembly
router.post('/assemblies', async (req, res) => {
  try {
    const { code, name, type, location, project, description, parentAssets, components, createdBy, qrCode } = req.body;

    // Check if code already exists
    const existing = await Assembly.findOne({ code, ownerEmail: req.user.email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Assembly code already exists' });
    }

    const assembly = new Assembly({
      code,
      name,
      type,
      location,
      project,
      description,
      parentAssets: parentAssets || [],
      components: components || [],
      createdBy: createdBy || 'System',
      ownerEmail: req.user.email,
      qrCode,
      status: 'Available',
      lastInspection: new Date(),
      nextInspectionDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await assembly.save();

    res.status(201).json({ success: true, data: assembly, message: 'Assembly created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE assembly
router.put('/assemblies/:id', async (req, res) => {
  try {
    const { components, status, location, remarks } = req.body;

    const assembly = await Assembly.findOne({ _id: req.params.id, ownerEmail: req.user.email });
    if (!assembly) {
      return res.status(404).json({ success: false, message: 'Assembly not found' });
    }

    if (components) {
      assembly.components = components;

      // Check if all components are present
      const allPresent = components.every((comp) => comp.required === comp.onAssembly);
      assembly.status = allPresent ? 'Available' : 'Incomplete';
    }

    if (status) assembly.status = status;
    if (location) assembly.location = location;
    if (remarks) assembly.remarks = remarks;

    await assembly.save();

    res.json({ success: true, data: assembly, message: 'Assembly updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE assembly
router.delete('/assemblies/:id', async (req, res) => {
  try {
    const assembly = await Assembly.findOneAndDelete({ _id: req.params.id, ownerEmail: req.user.email });
    if (!assembly) {
      return res.status(404).json({ success: false, message: 'Assembly not found' });
    }
    res.json({ success: true, message: 'Assembly deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update assembly component status
router.patch('/assemblies/:id/components', async (req, res) => {
  try {
    const { componentName, onAssembly, condition } = req.body;

    const assembly = await Assembly.findOne({ _id: req.params.id, ownerEmail: req.user.email });
    if (!assembly) {
      return res.status(404).json({ success: false, message: 'Assembly not found' });
    }

    const component = assembly.components.find((c) => c.componentName === componentName);
    if (!component) {
      return res.status(404).json({ success: false, message: 'Component not found' });
    }

    component.onAssembly = onAssembly !== undefined ? onAssembly : component.onAssembly;
    component.condition = condition || component.condition;

    // Update assembly status based on components
    const allPresent = assembly.components.every((comp) => comp.required === comp.onAssembly);
    assembly.status = allPresent ? 'Available' : 'Incomplete';

    await assembly.save();

    res.json({ success: true, data: assembly, message: 'Component updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
