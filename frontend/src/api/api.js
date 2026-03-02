// frontend/src/api/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('te_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// -------- Orders API helpers --------

// Get current customer's orders
export const getMyOrders = () => API.get('/orders/my');

// -------- Reviews API helpers --------

export const createReview = (data) => API.post('/reviews', data);

export const getRestaurantReviews = (restaurantId) =>
  API.get(`/reviews/restaurant/${restaurantId}`);

// -------- Complaints API helpers (with image upload) --------

// Create complaint (customer)
export const createComplaint = (formData) =>
  API.post('/complaints', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Customer: list own complaints
export const getMyComplaints = () => API.get('/complaints/my');

// Admin/AI: list unprocessed complaints
export const getUnprocessedComplaints = () =>
  API.get('/complaints/admin/unprocessed');

// Admin/AI: update AI-related fields for a complaint
export const updateComplaintAI = (id, data) =>
  API.patch(`/complaints/${id}/ai`, data);

export default API;
