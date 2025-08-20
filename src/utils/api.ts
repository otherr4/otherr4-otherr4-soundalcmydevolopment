import axios from 'axios';
import { toast } from 'react-hot-toast';

// Backoff utility
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Create axios instance with base configuration
const api = axios.create({
  // Use relative URL since we're using Vite's proxy
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000 // Increase timeout to 30 seconds
});

// Rate limiting state
let retryCount = 0;
const maxRetries = 3;
const baseDelay = 1000; // 1 second

// Add request interceptor
api.interceptors.request.use(
  async (config) => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.token) {
          config.headers.Authorization = `Bearer ${userData.token}`;
          
          // Add admin token for admin routes
          if (config.url?.includes('/admin')) {
            // Check if user has admin role
            if (userData.role !== 'admin') {
              throw new Error('Admin access required');
            }
            
            const adminSecret = import.meta.env.VITE_ADMIN_SECRET;
            if (!adminSecret) {
              console.error('Admin secret is not configured');
              throw new Error('Admin configuration error');
            }
            
            config.headers['X-Admin-Token'] = adminSecret;
            console.log('Adding admin token for admin route:', config.url);
          }
        }
      } catch (error) {
        console.error('Error in request interceptor:', error);
        localStorage.removeItem('user');
        window.location.href = '/admin-signin';
        return Promise.reject(error);
      }
    } else if (config.url?.includes('/admin')) {
      // If trying to access admin routes without being logged in
      window.location.href = '/admin-signin';
      return Promise.reject(new Error('Authentication required'));
    }

    // Log outgoing request
    console.log('Outgoing request:', {
      method: config.method,
      url: config.url,
      params: config.params,
      headers: config.headers
    });

    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => {
    // Reset retry count on successful response
    retryCount = 0;
    // Log successful response
    console.log('Response received:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle rate limiting (429)
    if (error.response?.status === 429 && !originalRequest._retry && retryCount < maxRetries) {
      originalRequest._retry = true;
      retryCount++;

      // Exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), 10000);
      console.log(`Rate limited. Retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
      
      await wait(delay);
      return api(originalRequest);
    }

    // Handle connection refused
    if (error.code === 'ECONNREFUSED' && !originalRequest._retry && retryCount < maxRetries) {
      originalRequest._retry = true;
      retryCount++;

      const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), 10000);
      console.log(`Connection refused. Retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
      
      await wait(delay);
      return api(originalRequest);
    }

    // Handle other errors
    const errorDetails = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    };
    console.error('Response error:', errorDetails);
    
    // Handle specific error cases
    if (error.response) {
      switch (error.response.status) {
        case 429:
          toast.error('Too many requests. Please wait a moment and try again.');
          break;
        case 401:
          toast.error('Session expired. Please login again.');
          localStorage.removeItem('user');
          window.location.href = '/admin-signin';
          break;
        case 403:
          console.error('Access denied error:', error.response.data);
          toast.error('Access denied. Please ensure you have admin privileges and try logging in again.');
          localStorage.removeItem('user');
          window.location.href = '/admin-signin';
          break;
        case 404:
          toast.error('Resource not found.');
          break;
        case 400:
          toast.error(error.response.data?.message || 'Invalid request. Please check your input.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(error.response.data?.error || 'An error occurred.');
      }
    } else if (error.request) {
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timed out. Please check if the server is running and try again.');
      } else if (error.code === 'ECONNREFUSED') {
        toast.error('Cannot connect to server. Please ensure the server is running.');
      } else {
        toast.error('Network error. Please check your connection and server status.');
      }
    } else {
      toast.error('An unexpected error occurred.');
    }
    
    return Promise.reject(error);
  }
);

export default api; 