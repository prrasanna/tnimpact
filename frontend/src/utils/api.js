// API configuration and helper functions

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('access_token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// Authentication API calls
export const authAPI = {
  // Register a new user
  register: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Login user
  login: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
};

// Admin API calls
export const adminAPI = {
  // Get dashboard data
  getDashboardData: async () => {
    return apiRequest('/admin/dashboard-data');
  },

  // Add new product
  addProduct: async (productData) => {
    return apiRequest('/admin/dashboard/add-product', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  // Get all products
  getAllProducts: async () => {
    return apiRequest('/admin/all-products');
  },
};

// Warehouse API calls
export const warehouseAPI = {
  // Get pending products
  getPendingProducts: async () => {
    return apiRequest('/warehouse/pending');
  },

  // Mark order as packed
  markPacked: async (orderId) => {
    return apiRequest(`/warehouse/mark-packed/${orderId}`, {
      method: 'PUT',
    });
  },
};

// Delivery API calls
export const deliveryAPI = {
  // Get my orders
  getMyOrders: async () => {
    return apiRequest('/delivery/my-orders');
  },

  // Mark order as delivered
  markDelivered: async (orderId) => {
    return apiRequest(`/delivery/mark-delivered/${orderId}`, {
      method: 'PUT',
    });
  },
};

// Unified voice API calls
export const voiceAPI = {
  // Process command in backend with role and user context
  processCommand: async ({ command, user_role, user_name }) => {
    return apiRequest('/voice/command', {
      method: 'POST',
      body: JSON.stringify({ command, user_role, user_name }),
    });
  },
};

export default {
  auth: authAPI,
  admin: adminAPI,
  warehouse: warehouseAPI,
  delivery: deliveryAPI,
  voice: voiceAPI,
};
