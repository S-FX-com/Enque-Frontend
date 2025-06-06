import axios from 'axios';
import { getAuthToken } from '@/lib/auth';

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Añadir interceptor para incluir el token de autenticación
apiClient.interceptors.request.use(
  config => {
    const token = getAuthToken();
    if (token) {
      // Asegurarse de que headers existe
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
apiClient.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    console.error('API request error:', error.response || error.message || error);
    return Promise.reject(error);
  }
);
