import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authorization token to requests (disabled for now since endpoints don't require auth)
apiClient.interceptors.request.use(
  (config) => {
    // Skip adding Authorization header to avoid CORS preflight issues
    // const token = localStorage.getItem('auth_token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// export const cropAPI = {
//   recommendCrop: async (data) => {
//     const response = await apiClient.post('/api/crop-recommendation', data);
//     return response.data;
//   },
// };

export const cropAPI = {
  recommendYield: async (data) => {
    const response = await apiClient.post('/api/yield-prediction', data);
    return response.data;
  },
};

export const diseaseAPI = {
  detectDisease: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/plant-disease', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export const fertilizerAPI = {
  recommendFertilizer: async (data) => {
    const response = await apiClient.post('/api/fertilizer-recommendation', data);
    return response.data;
  },
};

export const weatherAPI = {
  getWeather: async (city, countryCode = 'IN') => {
    const response = await apiClient.post('/api/weather', { city, country_code: countryCode });
    return response.data;
  },
};

export default apiClient;
