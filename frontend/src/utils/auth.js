// Authentication helpers using backend API and JWT tokens
import { authAPI } from './api';

const CURRENT_USER_KEY = "vla_current_user";
const TOKEN_KEY = "access_token";

// Role mapping for frontend routes
export const roleToRoute = {
  admin: "/admin",
  warehouse: "/warehouse",
  delivery: "/delivery",
};

// Register new user via backend API
export const registerUser = async ({ name, email, password, role }) => {
  try {
    // Map frontend role names to backend role names
    const roleMap = {
      "Admin": "admin",
      "Warehouse Staff": "warehouse",
      "Delivery Person": "delivery",
    };
    
    const backendRole = roleMap[role] || role.toLowerCase();
    
    const response = await authAPI.register({
      name,
      email,
      password,
      role: backendRole,
    });
    
    return { success: true, user: response };
  } catch (error) {
    console.error('Registration error:', error);
    throw new Error(error.message || 'Registration failed');
  }
};

// Login user via backend API
export const loginUser = async (email, password) => {
  try {
    const response = await authAPI.login(email, password);
    
    // Store JWT token
    localStorage.setItem(TOKEN_KEY, response.access_token);
    
    // Decode JWT to get user info (simple base64 decode)
    const tokenPayload = JSON.parse(atob(response.access_token.split('.')[1]));
    
    const user = {
      email: tokenPayload.sub,
      role: tokenPayload.role,
      name: email.split('@')[0], // Temporary until we fetch full user data
    };
    
    // Store user info
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
};

// Get current user from localStorage
export const getCurrentUser = () => {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

// Get current user role
export const getCurrentRole = () => {
  const user = getCurrentUser();
  return user ? user.role : null;
};

// Get auth token
export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getAuthToken();
};

// Logout user
export const logoutUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
};
