import axios from 'axios';

// export const API_BASE = 'https://api.salon.aasofttech.com/api';
 export const API_BASE = 'http://localhost:3000/api';
const BRANCH_STORAGE_KEY = 'salon_selected_branch_id';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and branch ID
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const branchId = localStorage.getItem(BRANCH_STORAGE_KEY);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (branchId) {
      config.headers['X-Branch-Id'] = branchId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

// Consolidated API Methods
export const ApiService = {
  // Suppliers
  suppliers: {
    getAll: (params: any) => apiClient.get('/suppliers', { params }).then(res => res.data),
    getList: () => apiClient.get('/suppliers/list').then(res => res.data),
    getById: (id: number) => apiClient.get(`/suppliers/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/suppliers', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/suppliers/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/suppliers/${id}`).then(res => res.data),
    getReport: (params: any) => apiClient.get('/suppliers/report', { params }).then(res => res.data),
    getLedger: (id: number) => apiClient.get(`/suppliers/${id}/ledger`).then(res => res.data),
    addPayment: (id: number, data: any) => apiClient.post(`/suppliers/${id}/payment`, data).then(res => res.data),
  },

  // Staff
  staff: {
    getAll: (params: any) => apiClient.get('/staff', { params }).then(res => res.data),
    getById: (id: number) => apiClient.get(`/staff/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/staff', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/staff/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/staff/${id}`).then(res => res.data),
    getBranches: () => apiClient.get('/branches').then(res => res.data),
    getLogs: (id: number, params?: any) => apiClient.get(`/staff/${id}/logs`, { params }).then(res => res.data),
  },

  // Customers
  customers: {
    getAll: (params: any) => apiClient.get('/customers', { params }).then(res => res.data),
    getById: (id: number) => apiClient.get(`/customers/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/customers', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/customers/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/customers/${id}`).then(res => res.data),
    getHistory: (id: number, params?: any) => apiClient.get(`/customers/${id}/history`, { params }).then(res => res.data), 
    addPayment: (id: number, data: any) => apiClient.post(`/customers/${id}/payment`, data).then(res => res.data),
  },


  //stocks
  // Stock
  stock: {
    getAll: (params?: any) =>
      apiClient.get('/stocks', { params }).then(res => res.data),

    getById: (id: number) =>
      apiClient.get(`/stocks/${id}`).then(res => res.data),

    manage: (data: any) =>
      apiClient.post('/stocks/manage', data).then(res => res.data),

    transfer: (data: any) =>
      apiClient.post('/stocks/transfer', data).then(res => res.data),

    getLowStock: (params?: any) =>
      apiClient.get('/stocks/low', { params }).then(res => res.data),
    getVariance: (params?: any) =>
      apiClient.get('/stocks/variance', { params }).then(res => res.data),

    getLogs: (params: { productId?: number; page?: number; limit?: number }) =>
      apiClient.get("/stocks/logs", { params }).then(res => res.data),

    getAdjustments: (params?: any) =>
      apiClient.get("/stocks/adjustments", { params }).then(res => res.data),

    createAdjustment: (data: any) =>
      apiClient.post("/stocks/adjustments", data).then(res => res.data),

    getTransfers: (params?: any) =>
      apiClient.get("/stocks/transfers", { params }).then(res => res.data),

    createTransfer: (data: any) =>
      apiClient.post("/stocks/transfers", data).then(res => res.data),
  },

  // Purchases (Supplier Purchases)
  purchases: {
    getAll: (params?: any) => apiClient.get('/supplier-purchases', { params }).then(res => res.data),

    getById: (id: number) => apiClient.get(`/supplier-purchases/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/supplier-purchases', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/supplier-purchases/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/supplier-purchases/${id}`).then(res => res.data),
    addPayment: (id: number, data: any) => apiClient.post(`/supplier-purchases/${id}/payment`, data).then(res => res.data),
    getPayments: (id: number) => apiClient.get(`/supplier-purchases/${id}/payments`).then(res => res.data),
    getAllReturns: (params?: any) => apiClient.get('/supplier-purchases/returns', { params }).then(res => res.data),
    createReturn: (purchaseId: number, data: any) => apiClient.post(`/supplier-purchases/${purchaseId}/return`, data).then(res => res.data),
    getReturns: (purchaseId: number) => apiClient.get(`/supplier-purchases/${purchaseId}/returns`).then(res => res.data),
    getReturnById: (returnId: number) => apiClient.get(`/supplier-purchases/return/${returnId}`).then(res => res.data),
    addReturnPayment: (returnId: number, data: any) => apiClient.post(`/supplier-purchases/return/${returnId}/payment`, data).then(res => res.data),
  },

  // Branches
  branches: {
    getAll: (params?: any) => apiClient.get('/branches', { params }).then(res => res.data),
    getById: (id: number) => apiClient.get(`/branches/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/branches', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/branches/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/branches/${id}`).then(res => res.data),
  },

  //categories
  categories: {
    getAll: (params?: any) => apiClient.get('/categories', { params }).then(res => res.data),
    getById: (id: number) => apiClient.get(`/categories/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/categories', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/categories/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/categories/${id}`).then(res => res.data),
    search: (query: string) => apiClient.get('/categories/search', { params: { q: query } }).then(res => res.data),
  },
  // Units
  units: {
    getAll: (params?: any) => apiClient.get('/units', { params }).then(res => res.data),
    getById: (id: number) => apiClient.get(`/units/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/units', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/units/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/units/${id}`).then(res => res.data),
  },
  // Brands
  brands: {
    getAll: (params?: any) => apiClient.get('/brands', { params }).then(res => res.data),
    getById: (id: number) => apiClient.get(`/brands/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/brands', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/brands/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/brands/${id}`).then(res => res.data),
  },
  // Variations
  variations: {
    getAll: (params?: any) => apiClient.get('/variations', { params }).then(res => res.data),
    getById: (id: number) => apiClient.get(`/variations/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/variations', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/variations/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/variations/${id}`).then(res => res.data),
  },
  // Products
  products: {
    getAll: (params?: any) => apiClient.get('/products', { params }).then(res => res.data),
    getNextSku: (branchId?: number | string) =>
      apiClient.get('/products/next-sku', { params: branchId != null ? { branchId } : {} }).then(res => res.data),
    getById: (id: number) => apiClient.get(`/products/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/products', data).then(res => res.data),
    createWithFile: async (data: FormData) => {
      const token = localStorage.getItem('token');
      const branchId = localStorage.getItem('salon_selected_branch_id');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (branchId) headers['X-Branch-Id'] = branchId;

      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers,
        body: data
      });
      if (!res.ok) throw new Error("Failed to upload");
      return res.json();
    },
    update: (id: number, data: any) => apiClient.put(`/products/${id}`, data).then(res => res.data),
    updateWithFile: async (id: number, data: FormData) => {
      const token = localStorage.getItem('token');
      const branchId = localStorage.getItem('salon_selected_branch_id');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (branchId) headers['X-Branch-Id'] = branchId;

      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'PUT',
        headers,
        body: data
      });
      if (!res.ok) throw new Error("Failed to upload");
      return res.json();
    },
    delete: (id: number) => apiClient.delete(`/products/${id}`).then(res => res.data),
    search: (query: string) => apiClient.get('/products/search', { params: { q: query } }).then(res => res.data),
  },

  // Services
  services: {
    getAll: (params?: any) => apiClient.get('/services', { params }).then(res => res.data),
    getNextCode: (branchId?: number | string) =>
      apiClient.get('/services/next-code', { params: branchId != null ? { branchId } : {} }).then(res => res.data),
    getById: (id: number) => apiClient.get(`/services/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/services', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/services/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/services/${id}`).then(res => res.data),
  },

  // Packages
  packages: {
    getAll: (params?: any) => apiClient.get('/packages', { params }).then(res => res.data),
    getById: (id: number) => apiClient.get(`/packages/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/packages', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/packages/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/packages/${id}`).then(res => res.data),
  },

  // ✅ SALES (POS)
  sales: {
    submit: (data: any) =>
      apiClient.post("/pos/sale/submit", data).then((res) => res.data),

    start: () =>
      apiClient.post("/pos/sale/start").then((res) => res.data),

    getById: (saleId: number) =>
      apiClient.get(`/pos/sale/${saleId}`).then((res) => res.data),

    addItem: (saleId: number, data: any) =>
      apiClient.post(`/pos/sale/${saleId}/item`, data).then((res) => res.data),

    removeItem: (saleId: number, itemId: number) =>
      apiClient.delete(`/pos/sale/${saleId}/item/${itemId}`).then((res) => res.data),

    update: (saleId: number, data: any) =>
      apiClient.patch(`/pos/sale/${saleId}`, data).then((res) => res.data),

    pay: (saleId: number, data: any) =>
      apiClient.post(`/pos/sale/${saleId}/pay`, data).then((res) => res.data),

    delete: (saleId: number) =>
      apiClient.delete(`/pos/sale/${saleId}`).then((res) => res.data),

    getAll: (params?: any) =>
      apiClient.get("/pos/sales", { params }).then((res) => res.data),

    getCustomers: () =>
      apiClient.get("/pos/customers").then((res) => res.data),

    getBanks: () =>
      apiClient.get("/pos/banks").then((res) => res.data),
    createReturn: (data: any) =>
      apiClient.post("/pos/returns", data).then((res) => res.data),
    listReturns: (params?: any) =>
      apiClient.get("/pos/returns", { params }).then((res) => res.data),
    getReturnById: (id: number) =>
      apiClient.get(`/pos/returns/${id}`).then((res) => res.data),
    addReturnPayment: (id: number, data: any) =>
      apiClient.post(`/pos/returns/${id}/pay`, data).then((res) => res.data),
    deleteReturn: (id: number) =>
      apiClient.delete(`/pos/returns/${id}`).then((res) => res.data),
  },

  // ✅ POS REGISTER
  register: {
    getCurrent: () => apiClient.get("/pos/register/current").then(res => res.data),
    getById: (id: number) => apiClient.get(`/pos/register/${id}`).then(res => res.data),
    open: (data: any) => apiClient.post("/pos/register/open", data).then(res => res.data),
    close: (data: any) => apiClient.post("/pos/register/close", data).then(res => res.data),
    addTransaction: (data: any) => apiClient.post("/pos/register/transaction", data).then(res => res.data),
  },

   
  roles: {
    getAll: (params?: any) => apiClient.get('/roles', { params }).then(res => res.data),
  },

  // User Salaries
  userSalaries: {
    create: (data: any) => apiClient.post('/user-salaries', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/user-salaries/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/user-salaries/${id}`).then(res => res.data),
  },

  // Appointments
  appointments: {
    getAll: (params: any) => apiClient.get('/appointments', { params }).then(res => res.data),
    getById: (id: number) => apiClient.get(`/appointments/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/appointments', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.patch(`/appointments/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/appointments/${id}`).then(res => res.data),
    updateStatus: (id: number, status: string) => apiClient.patch(`/appointments/${id}`, { status }).then(res => res.data),
    getStats: (params: any) => apiClient.get('/appointments/stats', { params }).then(res => res.data),
    checkIn: (id: number) => apiClient.post(`/appointments/check-in/${id}`).then(res => res.data),
    checkOut: (id: number) => apiClient.post(`/appointments/check-out/${id}`).then(res => res.data),
    reportIssue: (id: number, data: any) => apiClient.post(`/appointments/${id}/issue`, data).then(res => res.data),
    getAvailableSlots: (params: { staffId?: number; serviceId?: number; packageId?: number; date: string }) =>
      apiClient.get('/appointments/available-slots', { params }).then(res => res.data),
  },

  // Accounts (Banks)
  accounts: {
    getAll: () => apiClient.get('/banks').then(res => res.data),
    getById: (id: number) => apiClient.get(`/banks/${id}`).then(res => res.data),
    getTransactions: (id: number) => apiClient.get(`/banks/${id}/transactions`).then(res => res.data),
    create: (data: any) => apiClient.post('/banks', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/banks/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/banks/${id}`).then(res => res.data),
  },

  //expense Categories
  expenseCategories:{
    getAll: (params?: any) => apiClient.get('/expense-categories', { params }).then(res => res.data),
    getById: (id: number) => apiClient.get(`/expense-categories/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/expense-categories', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/expense-categories/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/expense-categories/${id}`).then(res => res.data),
    search: (query: string) => apiClient.get('/expense-categories/search', { params: { q: query } }).then(res => res.data),
  },

  // Expenses
  expenses: {
    getAll: (params?: any) => apiClient.get('/expenses', { params }).then(res => res.data),
    getById: (id: number) => apiClient.get(`/expenses/${id}`).then(res => res.data),
    create: (data: any) => apiClient.post('/expenses', data).then(res => res.data),
    update: (id: number, data: any) => apiClient.put(`/expenses/${id}`, data).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/expenses/${id}`).then(res => res.data),
  },
  

  // Generic request methods if needed
  get: (url: string, config?: any) => apiClient.get(url, config).then(res => res.data),
  post: (url: string, data?: any, config?: any) => apiClient.post(url, data, config).then(res => res.data),
  put: (url: string, data?: any, config?: any) => apiClient.put(url, data, config).then(res => res.data),
  patch: (url: string, data?: any, config?: any) => apiClient.patch(url, data, config).then(res => res.data),
  delete: (url: string, config?: any) => apiClient.delete(url, config).then(res => res.data),
};

export default ApiService;
