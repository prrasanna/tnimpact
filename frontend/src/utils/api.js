// API configuration and helper functions

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem("access_token");

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Authentication API calls
export const authAPI = {
  // Register a new user
  register: async (userData) => {
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  // Login user
  login: async (email, password) => {
    return apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
};

// Admin API calls
export const adminAPI = {
  // Get dashboard data
  getDashboardData: async () => {
    return apiRequest("/admin/dashboard-data");
  },

  // Add new product
  addProduct: async (productData) => {
    return apiRequest("/admin/dashboard/add-product", {
      method: "POST",
      body: JSON.stringify(productData),
    });
  },

  // Get all products
  getAllProducts: async () => {
    return apiRequest("/admin/all-products");
  },
};

// Warehouse API calls
export const warehouseAPI = {
  // Get pending products
  getPendingProducts: async () => {
    return apiRequest("/warehouse/pending");
  },

  // Mark order as picked
  markPicked: async (orderId) => {
    return apiRequest(`/warehouse/mark-picked/${orderId}`, {
      method: "PUT",
    });
  },

  // Mark order as packed
  markPacked: async (orderId) => {
    return apiRequest(`/warehouse/mark-packed/${orderId}`, {
      method: "PUT",
    });
  },
};

// Delivery API calls
export const deliveryAPI = {
  // Get my orders
  getMyOrders: async () => {
    return apiRequest("/delivery/my-orders");
  },

  // Mark order as delivered
  markDelivered: async (orderId) => {
    return apiRequest(`/delivery/mark-delivered/${orderId}`, {
      method: "PUT",
    });
  },

  // Update order status
  updateStatus: async (orderId, status, currentLocation = "") => {
    return apiRequest(`/delivery/update-status/${orderId}`, {
      method: "PUT",
      body: JSON.stringify({ status, current_location: currentLocation }),
    });
  },
};

// Dispatcher API calls
export const dispatcherAPI = {
  // Get all orders
  getAllOrders: async () => {
    return apiRequest("/dispatcher/orders");
  },

  // Get dashboard data
  getDashboardData: async () => {
    return apiRequest("/dispatcher/dashboard-data");
  },
};

// Unified voice API calls
export const voiceAPI = {
  // Process command in backend (Phase 2: user info from JWT token)
  processCommand: async ({ command, currentLocation = "" }) => {
    return apiRequest("/voice/command", {
      method: "POST",
      body: JSON.stringify({ command, current_location: currentLocation }),
    });
  },

  // Synthesize speech audio as MP3 blob for reliable multilingual playback.
  synthesizeSpeech: async ({ command, language = "en" }) => {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_BASE_URL}/voice/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ command, language }),
    });

    if (!response.ok) {
      throw new Error(`Failed to synthesize speech: HTTP ${response.status}`);
    }

    return response.blob();
  },
};

// Phase 2: Context Management API
export const contextAPI = {
  // Get user's conversation context
  getContext: async (userId) => {
    return apiRequest(`/context/${encodeURIComponent(userId)}`);
  },

  // Update user's conversation context
  updateContext: async (userId, updates) => {
    return apiRequest(`/context/${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
  },

  // Clear user's conversation context
  clearContext: async (userId) => {
    return apiRequest(`/context/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
  },

  // Get context summary
  getContextSummary: async (userId) => {
    return apiRequest(`/context/${encodeURIComponent(userId)}/summary`);
  },
};

export default {
  auth: authAPI,
  admin: adminAPI,
  warehouse: warehouseAPI,
  delivery: deliveryAPI,
  dispatcher: dispatcherAPI,
  voice: voiceAPI,
  context: contextAPI,
};
