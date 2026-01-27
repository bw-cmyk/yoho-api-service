import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1/admin',
  timeout: 10000,
});

// 请求拦截器 - 添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// 类型定义
export interface User {
  id: string;
  username: string;
  nickname: string;
  email: string;
  role: number;
  banned: boolean;
  createdAt: string;
}

export type ProductType = 'INSTANT_BUY' | 'LUCKY_DRAW';
export type ProductStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'SOLD_OUT' | 'ARCHIVED';

export interface Product {
  id: number;
  type: ProductType;
  name: string;
  description: string;
  thumbnail: string;
  images: string[];
  detail: string;
  originalPrice: string;
  salePrice: string;
  stock: number;
  status: ProductStatus;
  badge: string;
  priority: number;
  saleStartTime: string;
  saleEndTime: string;
  purchaseLimit: number;
  totalRating: string;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 通用请求方法
const request = {
  get: <T>(url: string, params?: object): Promise<T> => api.get(url, { params }) as Promise<T>,
  post: <T>(url: string, data?: object): Promise<T> => api.post(url, data) as Promise<T>,
  put: <T>(url: string, data?: object): Promise<T> => api.put(url, data) as Promise<T>,
  patch: <T>(url: string, data?: object): Promise<T> => api.patch(url, data) as Promise<T>,
  delete: <T>(url: string): Promise<T> => api.delete(url) as Promise<T>,
};

// 用户管理 API
export const userApi = {
  getList: (params: { page: number; limit: number; keyword?: string; role?: number; banned?: boolean }) =>
    request.get<PaginatedResponse<User>>('/users', params),
  getStats: () => request.get<{ total: number; banned: number; active: number; todayNew: number }>('/users/stats'),
  getOne: (id: string) => request.get<User>(`/users/${id}`),
  update: (id: string, data: { nickname?: string; email?: string; role?: number; banned?: boolean }) =>
    request.patch<User>(`/users/${id}`, data),
  ban: (id: string) => request.post<{ success: boolean; message: string }>(`/users/${id}/ban`),
  unban: (id: string) => request.post<{ success: boolean; message: string }>(`/users/${id}/unban`),
};

// 商品管理 API
export const productApi = {
  getList: (params: { page: number; limit: number; keyword?: string; type?: ProductType; status?: ProductStatus }) =>
    request.get<PaginatedResponse<Product>>('/products', params),
  getStats: () => request.get<{
    total: number;
    active: number;
    draft: number;
    paused: number;
    instantBuy: number;
    luckyDraw: number;
  }>('/products/stats'),
  getOne: (id: number) => request.get<Product>(`/products/${id}`),
  create: (data: {
    type: ProductType;
    name: string;
    description?: string;
    originalPrice: string;
    salePrice: string;
    stock?: number;
    thumbnail?: string;
    images?: string[];
    detail?: string;
    badge?: string;
    priority?: number;
    saleStartTime?: string;
    saleEndTime?: string;
    purchaseLimit?: number;
  }) => request.post<Product>('/products', data),
  update: (id: number, data: {
    type?: ProductType;
    name?: string;
    description?: string;
    originalPrice?: string;
    salePrice?: string;
    status?: ProductStatus;
    stock?: number;
    thumbnail?: string;
    images?: string[];
    detail?: string;
    badge?: string;
    priority?: number;
    saleStartTime?: string;
    saleEndTime?: string;
    purchaseLimit?: number;
  }) => request.patch<Product>(`/products/${id}`, data),
  delete: (id: number) => request.delete<{ success: boolean; message: string }>(`/products/${id}`),
  setActive: (id: number) => request.post<Product>(`/products/${id}/active`),
  setPaused: (id: number) => request.post<Product>(`/products/${id}/pause`),
  setArchived: (id: number) => request.post<Product>(`/products/${id}/archive`),
};

// 认证 API
export interface AuthUser {
  sub: string;
  username: string;
  nickname: string;
  email: string;
  role: number;
}

export const authApi = {
  me: () => request.get<AuthUser>('/auth/me'),
  verify: (token: string) => request.get<{ valid: boolean; user: AuthUser }>('/auth/verify', { token }),
};

// 上传 API
export const uploadApi = {
  uploadImage: async (file: File): Promise<{ url: string; id: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }) as { success: boolean; data: { url: string; id: string } };
    return response.data;
  },
};

// 商品规格 API
export interface Specification {
  id: number;
  productId: number;
  key: string;
  value: string;
  isDefault: boolean;
  sort: number;
}

export const specificationApi = {
  getList: (productId: number) =>
    request.get<Specification[]>(`/products/${productId}/specifications`),
  create: (productId: number, data: { key: string; value: string; isDefault?: boolean; sort?: number }) =>
    request.post<Specification>(`/products/${productId}/specifications`, data),
  replaceAll: (productId: number, specs: { key: string; value: string; isDefault?: boolean; sort?: number }[]) =>
    request.put<Specification[]>(`/products/${productId}/specifications/replace`, specs),
  update: (productId: number, id: number, data: { key?: string; value?: string; isDefault?: boolean; sort?: number }) =>
    request.put<Specification>(`/products/${productId}/specifications/${id}`, data),
  delete: (productId: number, id: number) =>
    request.delete<{ success: boolean }>(`/products/${productId}/specifications/${id}`),
};

export default api;
