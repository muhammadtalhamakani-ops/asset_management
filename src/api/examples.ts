// Example Integration Guide for React Components
// This file shows how to integrate the MongoDB API with your React components

import { assetAPI, movementAPI, inspectionAPI, returnAPI, assemblyAPI } from './client';

type ExampleData = Record<string, any>;
type ExampleFilters = Record<string, string>;

// ============================================
// DASHBOARD PAGE INTEGRATION
// ============================================
export async function loadDashboardData() {
  try {
    // Get asset statistics
    const stats = await assetAPI.getStatistics();
    
    // Get recent movements
    const recentMovements = await movementAPI.getAll({ status: 'Received' });
    
    // Get return statistics
    const returnStats = await returnAPI.getStatistics();
    
    return {
      totalValue: stats.data.totalValue,
      assetsByStatus: stats.data.byStatus,
      assetsByCategory: stats.data.byCategory,
      recentMovements: recentMovements.data,
      returnStats: returnStats.data,
    };
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    throw error;
  }
}

// ============================================
// ASSET REGISTER PAGE INTEGRATION
// ============================================
export async function loadAssetRegister(filters: ExampleFilters = {}) {
  try {
    const response = await assetAPI.getAll(filters);
    return response.data; // Returns array of assets
  } catch (error) {
    console.error('Error loading assets:', error);
    throw error;
  }
}

export async function searchAssets(query: string) {
  return assetAPI.getAll({ search: query });
}

export async function createNewAsset(assetData: ExampleData) {
  try {
    const response = await assetAPI.create({
      code: assetData.code || `AST-${Date.now().toString().slice(-4)}`,
      name: assetData.name,
      type: assetData.type,
      serial: assetData.serial || 'Not recorded',
      category: assetData.category,
      subcategory: assetData.subcategory || 'Not recorded',
      description: assetData.description || 'Not recorded',
      manufacturer: assetData.manufacturer || 'Not recorded',
      model: assetData.model || 'Not recorded',
      quantity: assetData.quantity,
      unit: assetData.unit,
      minimum: assetData.minimum,
      unitCost: assetData.unitCost,
      value: `AED ${(assetData.quantity * assetData.unitCost).toLocaleString()}`,
      supplier: assetData.supplier || 'Not recorded',
      purchaseDate: assetData.purchaseDate,
      project: assetData.project || 'Riverside Commercial Hub',
      location: assetData.location,
      status: assetData.status || 'Available',
      qrCode: assetData.qrCode || 'Not recorded',
      attachments: assetData.attachments?.name || 'No files',
      remarks: assetData.remarks || 'No remarks',
      createdBy: assetData.createdBy || 'Alex Rivera',
    });
    
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('Error creating asset:', error);
    throw error;
  }
}

export async function updateAsset(assetId: string, updates: ExampleData) {
  try {
    // Recalculate value if quantity or unitCost changed
    if (updates.quantity !== undefined || updates.unitCost !== undefined) {
      const asset = await assetAPI.getById(assetId);
      const newQuantity = updates.quantity !== undefined ? updates.quantity : asset.data.quantity;
      const newUnitCost = updates.unitCost !== undefined ? updates.unitCost : asset.data.unitCost;
      updates.value = `AED ${(newQuantity * newUnitCost).toLocaleString()}`;
    }
    
    const response = await assetAPI.update(assetId, updates);
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('Error updating asset:', error);
    throw error;
  }
}

export async function deleteAsset(assetId: string) {
  try {
    const response = await assetAPI.delete(assetId);
    if (!response.success) {
      throw new Error(response.message);
    }
    return response;
  } catch (error) {
    console.error('Error deleting asset:', error);
    throw error;
  }
}

// ============================================
// RECEIVE ASSETS PAGE INTEGRATION
// ============================================
export async function recordReceiving(receiveData: ExampleData) {
  try {
    const response = await movementAPI.receive({
      assetCode: receiveData.assetCode,
      quantity: receiveData.quantity,
      supplier: receiveData.supplier,
      grn: receiveData.grn,
      project: receiveData.project || 'Riverside Commercial Hub',
      recordedBy: receiveData.recordedBy || 'Alex Rivera',
      remarks: receiveData.remarks,
    });
    
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('Error recording receiving:', error);
    throw error;
  }
}

// ============================================
// ISSUE & ALLOCATE PAGE INTEGRATION
// ============================================
export async function issueAsset(issueData: ExampleData) {
  try {
    const response = await movementAPI.issue({
      assetCode: issueData.assetCode,
      quantity: issueData.quantity,
      recipientName: issueData.recipientName,
      project: issueData.project || 'Riverside Commercial Hub',
      recordedBy: issueData.recordedBy || 'Alex Rivera',
      remarks: issueData.remarks,
    });
    
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('Error issuing asset:', error);
    throw error;
  }
}

// ============================================
// TRANSFERS PAGE INTEGRATION
// ============================================
export async function transferAsset(transferData: ExampleData) {
  try {
    const response = await movementAPI.transfer({
      assetCode: transferData.assetCode,
      quantity: transferData.quantity,
      fromLocation: transferData.fromLocation,
      toLocation: transferData.toLocation,
      project: transferData.project || 'Riverside Commercial Hub',
      recordedBy: transferData.recordedBy || 'Alex Rivera',
      remarks: transferData.remarks,
    });
    
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('Error transferring asset:', error);
    throw error;
  }
}

export async function getMovementHistory(assetCode: string) {
  try {
    const response = await movementAPI.getAll({ assetCode });
    return response.data;
  } catch (error) {
    console.error('Error getting movement history:', error);
    throw error;
  }
}

// ============================================
// INSPECTIONS PAGE INTEGRATION
// ============================================
export async function startInspection(assetCode: string) {
  try {
    // Get the asset details
    const assetResponse = await assetAPI.getById(assetCode);
    return assetResponse.data;
  } catch (error) {
    console.error('Error loading asset for inspection:', error);
    throw error;
  }
}

export async function recordInspection(inspectionData: ExampleData) {
  try {
    const response = await inspectionAPI.create({
      assetCode: inspectionData.assetCode,
      type: inspectionData.type || 'Safety check',
      checklist: inspectionData.checklist || [
        { item: 'Base secure', checked: false, remarks: '' },
        { item: 'Guard rails installed', checked: false, remarks: '' },
        { item: 'No deformation', checked: false, remarks: '' },
      ],
      condition: inspectionData.condition, // Good, Fair, Poor
      status: inspectionData.status, // Pass, Fail, Needs Repair
      location: inspectionData.location,
      inspector: {
        name: inspectionData.inspectorName || 'Samira Khan',
        signature: inspectionData.signature || '',
      },
      nextInspectionDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      remarks: inspectionData.remarks,
    });
    
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('Error recording inspection:', error);
    throw error;
  }
}

export async function getInspectionHistory(assetCode: string) {
  try {
    const response = await inspectionAPI.getAll({ assetCode });
    return response.data;
  } catch (error) {
    console.error('Error getting inspection history:', error);
    throw error;
  }
}

// ============================================
// RETURNS & DAMAGE PAGE INTEGRATION
// ============================================
export async function recordReturn(returnData: ExampleData) {
  try {
    const response = await returnAPI.create({
      assetCode: returnData.assetCode,
      type: returnData.type, // Return, Damage, Loss, Variance
      quantityIssued: returnData.quantityIssued,
      quantityReturned: returnData.quantityReturned,
      quantityDamaged: returnData.quantityDamaged || 0,
      quantityMissing: returnData.quantityMissing || 0,
      condition: returnData.condition,
      damageDescription: returnData.damageDescription || '',
      responsibleParty: returnData.responsibleParty,
      location: returnData.location,
      recordedBy: returnData.recordedBy || 'Alex Rivera',
      remarks: returnData.remarks,
    });
    
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('Error recording return:', error);
    throw error;
  }
}

export async function getReturnRecords(filters: ExampleFilters = {}) {
  try {
    const response = await returnAPI.getAll(filters);
    return response.data;
  } catch (error) {
    console.error('Error getting return records:', error);
    throw error;
  }
}

export async function updateReturnResolution(returnId: string, resolution: string) {
  try {
    const response = await returnAPI.update(returnId, { resolution });
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('Error updating return resolution:', error);
    throw error;
  }
}

// ============================================
// ASSEMBLIES PAGE INTEGRATION
// ============================================
export async function getAssemblies() {
  try {
    const response = await assemblyAPI.getAll();
    return response.data;
  } catch (error) {
    console.error('Error getting assemblies:', error);
    throw error;
  }
}

export async function createAssembly(assemblyData: ExampleData) {
  try {
    const response = await assemblyAPI.create({
      code: assemblyData.code || `SCAF-${Date.now().toString().slice(-6)}`,
      name: assemblyData.name,
      type: assemblyData.type, // Scaffolding, Formwork, Other
      description: assemblyData.description || '',
      location: assemblyData.location,
      project: assemblyData.project || 'Riverside Commercial Hub',
      parentAssets: assemblyData.parentAssets || [],
      components: assemblyData.components || [],
      qrCode: assemblyData.qrCode || 'Not recorded',
    });
    
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('Error creating assembly:', error);
    throw error;
  }
}

export async function updateAssemblyComponent(assemblyId: string, componentData: ExampleData) {
  try {
    const response = await assemblyAPI.updateComponent(assemblyId, {
      componentName: componentData.componentName,
      onAssembly: componentData.onAssembly,
      condition: componentData.condition, // Pass, Missing, Damaged
    });
    
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('Error updating assembly component:', error);
    throw error;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
export async function getAssetByCode(code: string) {
  try {
    const response = await assetAPI.getById(code);
    return response.data;
  } catch (error) {
    console.error('Error getting asset:', error);
    throw error;
  }
}

export async function getAssetByQRCode(qrCode: string) {
  try {
    const response = await assetAPI.getById(qrCode);
    return response.data;
  } catch (error) {
    console.error('Error getting asset by QR:', error);
    throw error;
  }
}

export async function checkHealthStatus() {
  try {
    const response = await fetch('http://localhost:5000/api/health');
    const data = await response.json();
    return data.status === 'OK';
  } catch (error) {
    console.error('Backend is not running');
    return false;
  }
}
