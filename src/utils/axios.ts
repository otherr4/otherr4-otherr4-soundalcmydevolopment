import axios from 'axios';
import { toast } from 'react-hot-toast';

// Use a fixed backend URL
const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://sound-alchemy-backend2-main.vercel.app';

// Create axios instance
const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000, // 10 second timeout
  validateStatus: (status) => status >= 200 && status < 500 // Accept all responses except 500s
});

// Log the base URL for debugging
console.log('Using API base URL:', api.defaults.baseURL);

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    config.params = { ...config.params, _t: Date.now() };
    
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const { token } = JSON.parse(user);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
      }
    }
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
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`[${response.config.method?.toUpperCase()}] ${response.config.url}:`, response.data);
    }
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    // Handle specific error cases
    if (error.response) {
      switch (error.response.status) {
        case 400:
          if (error.response.data?.errors) {
            const errorMessages = error.response.data.errors.map((err: any) => err.message).join('\n');
            toast.error(errorMessages);
          } else {
            toast.error(error.response.data?.message || 'Invalid request. Please check your input.');
          }
          break;
        case 401:
          toast.error('Session expired. Please log in again.');
          localStorage.removeItem('user');
          window.location.href = '/login';
          break;
        case 403:
          toast.error('Access denied. You do not have permission to perform this action.');
          break;
        case 404:
          toast.error('Resource not found.');
          break;
        case 429:
          const retryAfter = error.response.headers['retry-after'];
          toast.error(`Too many requests. Please try again in ${retryAfter || 'a few'} seconds.`);
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(error.response.data?.message || 'An error occurred.');
      }
    } else if (error.request) {
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error('Network error. Please check your connection and ensure the server is running.');
      }
    } else {
      toast.error('An unexpected error occurred.');
    }
    
    return Promise.reject(error);
  }
);

export default api; 