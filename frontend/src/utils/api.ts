// Define a base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  // 1. Get the token from localStorage
  const token = localStorage.getItem('token');

  // 2. Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}), // Keep any existing headers
    ...(token ? { Authorization: `Bearer ${token}` } : {}), // Add token if it exists
  };

  // 3. Execute fetch
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 4. Handle 401 globally (optional but recommended)
  if (response.status === 401) {
    console.warn('Token expired or invalid. Redirecting to login...');
    localStorage.removeItem('token');
    // window.location.href = '/login';
  }

  return response;
};
