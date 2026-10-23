// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';
type ApiFilters = Record<string, string>;
type ApiPayload = Record<string, unknown>;
const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  const token = window.localStorage.getItem('fieldstock-session-token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
};

// Asset APIs
export const assetAPI = {
  getAll: (filters: ApiFilters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiFetch(`${API_BASE_URL}/assets${params ? `?${params}` : ''}`).then((res) => res.json());
  },

  getById: (id: string) => apiFetch(`${API_BASE_URL}/assets/${id}`).then((res) => res.json()),

  create: (assetData: ApiPayload) =>
    apiFetch(`${API_BASE_URL}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assetData),
    }).then((res) => res.json()),

  update: (id: string, assetData: ApiPayload) =>
    apiFetch(`${API_BASE_URL}/assets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assetData),
    }).then((res) => res.json()),

  delete: (id: string) =>
    apiFetch(`${API_BASE_URL}/assets/${id}`, { method: 'DELETE' }).then((res) => res.json()),

  getStatistics: () => apiFetch(`${API_BASE_URL}/assets-stats/summary`).then((res) => res.json()),

  updateStock: (id: string, quantityChange: number) =>
    apiFetch(`${API_BASE_URL}/assets/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantityChange }),
    }).then((res) => res.json()),
};

export const supplierAPI = {
  getAll: () => apiFetch(`${API_BASE_URL}/suppliers`).then((res) => res.json()),
  create: (supplierData: ApiPayload) =>
    apiFetch(`${API_BASE_URL}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supplierData),
    }).then((res) => res.json()),
};

// Movement APIs
export const movementAPI = {
  getAll: (filters: ApiFilters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiFetch(`${API_BASE_URL}/movements${params ? `?${params}` : ''}`).then((res) => res.json());
  },

  getById: (id: string) => apiFetch(`${API_BASE_URL}/movements/${id}`).then((res) => res.json()),

  receive: (receiveData: ApiPayload) =>
    apiFetch(`${API_BASE_URL}/movements/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receiveData),
    }).then((res) => res.json()),

  issue: (issueData: ApiPayload) =>
    apiFetch(`${API_BASE_URL}/movements/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(issueData),
    }).then((res) => res.json()),

  transfer: (transferData: ApiPayload) =>
    apiFetch(`${API_BASE_URL}/movements/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transferData),
    }).then((res) => res.json()),

  update: (id: string, movementData: ApiPayload) =>
    apiFetch(`${API_BASE_URL}/movements/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movementData),
    }).then((res) => res.json()),

  delete: (id: string) =>
    apiFetch(`${API_BASE_URL}/movements/${id}`, { method: 'DELETE' }).then((res) => res.json()),
};

// Inspection APIs
export const inspectionAPI = {
  getAll: (filters: ApiFilters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiFetch(`${API_BASE_URL}/inspections${params ? `?${params}` : ''}`).then((res) => res.json());
  },

  getById: (id: string) => apiFetch(`${API_BASE_URL}/inspections/${id}`).then((res) => res.json()),

  create: (inspectionData: ApiPayload) =>
    apiFetch(`${API_BASE_URL}/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inspectionData),
    }).then((res) => res.json()),

  update: (id: string, inspectionData: ApiPayload) =>
    apiFetch(`${API_BASE_URL}/inspections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inspectionData),
    }).then((res) => res.json()),

  delete: (id: string) =>
    apiFetch(`${API_BASE_URL}/inspections/${id}`, { method: 'DELETE' }).then((res) => res.json()),
};

// Return APIs
export const returnAPI = {
  getAll: (filters: ApiFilters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiFetch(`${API_BASE_URL}/returns${params ? `?${params}` : ''}`).then((res) => res.json());
  },

  getById: (id: string) => apiFetch(`${API_BASE_URL}/returns/${id}`).then((res) => res.json()),

  create: (returnData: ApiPayload) =>
    apiFetch(`${API_BASE_URL}/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(returnData),
    }).then((res) => res.json()),

  update: (id: string, returnData: ApiPayload) =>
    apiFetch(`${API_BASE_URL}/returns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(returnData),
    }).then((res) => res.json()),

  delete: (id: string) =>
    apiFetch(`${API_BASE_URL}/returns/${id}`, { method: 'DELETE' }).then((res) => res.json()),

  getStatistics: () => apiFetch(`${API_BASE_URL}/returns-stats/summary`).then((res) => res.json()),
};

// Assembly APIs
export const assemblyAPI = {
  getAll: (filters: ApiFilters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiFetch(`${API_BASE_URL}/assemblies${params ? `?${params}` : ''}`).then((res) => res.json());
  },

  getById: (id: string) => apiFetch(`${API_BASE_URL}/assemblies/${id}`).then((res) => res.json()),

  create: (assemblyData: ApiPayload) =>
    apiFetch(`${API_BASE_URL}/assemblies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assemblyData),
    }).then((res) => res.json()),

  update: (id: string, assemblyData: ApiPayload) =>
    apiFetch(`${API_BASE_URL}/assemblies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assemblyData),
    }).then((res) => res.json()),

  delete: (id: string) =>
    apiFetch(`${API_BASE_URL}/assemblies/${id}`, { method: 'DELETE' }).then((res) => res.json()),

  updateComponent: (id: string, componentData: ApiPayload) =>
    apiFetch(`${API_BASE_URL}/assemblies/${id}/components`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(componentData),
    }).then((res) => res.json()),
};

// Auth APIs
export const authAPI = {
  login: (email: string, password: string) =>
    fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then((res) => res.json()),

  register: (userData: { email: string; password: string; name?: string; role?: string }) =>
    fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    }).then((res) => res.json()),
};

