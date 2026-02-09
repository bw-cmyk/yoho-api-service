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

  uploadVideo: async (file: File): Promise<{ url: string; id: string; thumbnailUrl?: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload/video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5分钟超时（视频文件较大）
    }) as { success: boolean; data: { url: string; id: string; thumbnailUrl?: string } };
    return response.data;
  },

  uploadMedia: async (file: File): Promise<{ url: string; id: string; type: 'IMAGE' | 'VIDEO'; thumbnailUrl?: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5分钟超时（视频文件较大）
    }) as { success: boolean; data: { url: string; id: string; type: 'IMAGE' | 'VIDEO'; thumbnailUrl?: string } };
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

// 抽奖轮次 API
export type DrawRoundStatus = 'ONGOING' | 'COMPLETED' | 'DRAWN' | 'CANCELLED';

export interface DrawRound {
  id: number;
  productId: number;
  roundNumber: number;
  totalSpots: number;
  soldSpots: number;
  pricePerSpot: string;
  prizeValue: string;
  status: DrawRoundStatus;
  completedAt: string | null;
  drawnAt: string | null;
  createdAt: string;
  result: {
    winningNumber: number;
    winnerUserId: string | null;
    winnerUserName: string | null;
    prizeStatus: string;
  } | null;
}

export const drawApi = {
  getRounds: (productId: number, page: number = 1, limit: number = 20) =>
    request.get<PaginatedResponse<DrawRound>>('/draws/rounds', { productId, page, limit }),
  getRoundDetail: (id: number) =>
    request.get<DrawRound>(`/draws/rounds/${id}`),
  processDraw: (id: number) =>
    request.post<{ success: boolean; result: unknown }>(`/draws/rounds/${id}/process`),
  createRound: (productId: number) =>
    request.post<DrawRound>(`/draws/products/${productId}/create-round`),
};

// 用户资产 API
export interface UserAsset {
  currency: string;
  balanceReal: string;
  balanceBonus: string;
  balanceLocked: string;
  totalBalance: string;
  withdrawableBalance: string;
  availableBalance: string;
}

export interface UserAssetsResponse {
  user: {
    id: string;
    username: string;
    nickname: string;
    email: string;
  };
  assets: UserAsset[];
  chainAssetsTotalUsd: string;
  chainAssetsCount: number;
}

export interface UserTransaction {
  id: string;
  type: string;
  source: string;
  status: string;
  amount: string;
  currency: string;
  balanceBefore: string;
  balanceAfter: string;
  description: string;
  referenceId: string;
  createdAt: string;
}

export interface UserChainAsset {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  balance: string;
  usdValue: string;
  priceUsd: string;
  lastUpdatedAt: string;
}

export const assetApi = {
  getUserAssets: (userId: string) =>
    request.get<UserAssetsResponse>(`/users/${userId}/assets`),
  getUserTransactions: (userId: string, page: number = 1, limit: number = 20, type?: string) =>
    request.get<PaginatedResponse<UserTransaction>>(`/users/${userId}/assets/transactions`, { page, limit, type }),
  getUserChainAssets: (userId: string) =>
    request.get<{ data: UserChainAsset[]; total: number }>(`/users/${userId}/assets/chain-assets`),
};

// 晒单管理 API
export type ShowcaseStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';
export type MediaType = 'IMAGE' | 'VIDEO';

export interface ShowcaseMedia {
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  cloudflareId?: string;
}

export interface Showcase {
  id: number;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  media: ShowcaseMedia[];
  productId: number | null;
  drawRoundId: number | null;
  prizeInfo: string | null;
  ipAddress: string | null;
  location: string | null;
  likeCount: number;
  viewCount: number;
  status: ShowcaseStatus;
  rejectReason: string | null;
  isPinned: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShowcaseStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export const showcaseApi = {
  getList: (params: { page: number; limit: number; status?: ShowcaseStatus; userId?: string }) =>
    request.get<PaginatedResponse<Showcase>>('/showcases', params),
  getStats: () => request.get<ShowcaseStats>('/showcases/stats'),
  getOne: (id: number) => request.get<Showcase>(`/showcases/${id}`),
  approve: (id: number) => request.post<{ success: boolean }>(`/showcases/${id}/approve`),
  reject: (id: number, reason?: string) => request.post<{ success: boolean }>(`/showcases/${id}/reject`, { reason }),
  hide: (id: number) => request.post<{ success: boolean }>(`/showcases/${id}/hide`),
  togglePin: (id: number) => request.post<{ success: boolean; isPinned: boolean }>(`/showcases/${id}/pin`),
  setPriority: (id: number, priority: number) => request.patch<{ success: boolean }>(`/showcases/${id}/priority`, { priority }),
  delete: (id: number) => request.delete<{ success: boolean }>(`/showcases/${id}`),
  // 手动创建晒单
  create: (data: {
    userId: string;
    userName?: string;
    userAvatar?: string;
    content?: string;
    media: ShowcaseMedia[];
    productId?: number;
    prizeInfo?: string;
  }) => request.post<Showcase>('/showcases', data),
};

// 货币管理 API
export interface CurrencyRate {
  currency: string;
  rateToUSD: string;
  symbol: string;
  name: string;
  decimals: number;
  isActive: boolean;
  displayOrder: number;
  lastUpdatedAt: string;
  updatedBy: string | null;
  createdAt: string;
}

export const currencyApi = {
  getList: () =>
    request.get<CurrencyRate[]>('/currencies'),
  getOne: (code: string) =>
    request.get<CurrencyRate>(`/currencies/${code}`),
  create: (data: {
    code: string;
    rateToUSD: string;
    symbol: string;
    name: string;
    decimals?: number;
    displayOrder: number;
  }) => request.post<CurrencyRate>('/currencies', data),
  update: (code: string, data: {
    rateToUSD?: string;
    symbol?: string;
    name?: string;
    decimals?: number;
    displayOrder?: number;
    isActive?: boolean;
  }) => request.put<CurrencyRate>(`/currencies/${code}`, data),
  toggleStatus: (code: string) =>
    request.patch<CurrencyRate>(`/currencies/${code}/status`, {}),
  delete: (code: string) =>
    request.delete<void>(`/currencies/${code}`),
};

// Banner 管理 API
export type BannerActionType = 'NONE' | 'ROUTER' | 'EXTERNAL_LINK' | 'PRODUCT' | 'DRAW';

export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  actionType: BannerActionType;
  actionValue: string | null;
  buttonText: string | null;
  backgroundColor: string | null;
  isActive: boolean;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
  clickCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export const bannerApi = {
  getList: (params: { page?: number; limit?: number; isActive?: boolean }) =>
    request.get<{ items: Banner[]; total: number; page: number; limit: number; totalPages: number }>('/banners', params),
  getOne: (id: number) => request.get<Banner>(`/banners/${id}`),
  create: (data: {
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl: string;
    mobileImageUrl?: string;
    actionType: BannerActionType;
    actionValue?: string;
    buttonText?: string;
    backgroundColor?: string;
    isActive?: boolean;
    sortOrder?: number;
    startDate?: string;
    endDate?: string;
  }) => request.post<Banner>('/banners', data),
  update: (id: number, data: {
    title?: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    mobileImageUrl?: string;
    actionType?: BannerActionType;
    actionValue?: string;
    buttonText?: string;
    backgroundColor?: string;
    isActive?: boolean;
    sortOrder?: number;
    startDate?: string;
    endDate?: string;
  }) => request.put<Banner>(`/banners/${id}`, data),
  delete: (id: number) => request.delete<{ success: boolean }>(`/banners/${id}`),
  toggleActive: (id: number) => request.post<Banner>(`/banners/${id}/toggle-active`, {}),
  updateSort: (sortData: Array<{ id: number; sortOrder: number }>) =>
    request.post<{ success: boolean }>('/banners/sort', sortData),
};

// 实物奖品订单管理 API
export type PrizeShippingStatus = 'PENDING_ADDRESS' | 'PENDING_SHIPMENT' | 'SHIPPED' | 'DELIVERED';

export interface PrizeOrderStats {
  pendingAddress: number;
  pendingShipment: number;
  shipped: number;
  delivered: number;
  total: number;
}

export interface PrizeOrder {
  drawResultId: number;
  shippingOrderNumber: string | null;
  prizeShippingStatus: PrizeShippingStatus;
  prizeStatus: string;
  product: {
    id: number;
    name: string;
    thumbnail: string;
  } | null;
  winner: {
    userId: string;
    userName: string | null;
    avatar: string | null;
  };
  shippingAddress: {
    recipientName: string;
    phoneNumber: string;
    fullAddress: string;
  } | null;
  logistics: {
    company: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  };
  prizeValue: string;
  addressSubmittedAt: string | null;
  createdAt: string;
}

export interface PrizeOrderDetail {
  drawResultId: number;
  orderId: number | null;
  orderNumber: string | null;
  prizeShippingStatus: PrizeShippingStatus | null;
  prizeStatus: string;
  drawRoundId: number;
  roundNumber: number;
  winningNumber: number;
  product: {
    id: number;
    name: string;
    thumbnail: string;
    images: string[];
  } | null;
  winner: {
    userId: string;
    userName: string | null;
    avatar: string | null;
  };
  shippingAddress: {
    recipientName: string;
    phoneNumber: string;
    country: string;
    state: string;
    city: string;
    streetAddress: string;
    apartment?: string;
    zipCode?: string;
    fullAddress: string;
  } | null;
  logistics: {
    company: string | null;
    trackingNumber: string | null;
    deliveredAt: string | null;
  } | null;
  timeline: Array<{
    event: string;
    title: string;
    description?: string;
    time: string;
  }>;
  prizeValue: string;
  addressSubmittedAt: string | null;
  createdAt: string;
}

export interface PrizeOrdersResponse {
  data: PrizeOrder[];
  total: number;
  page: number;
  limit: number;
  stats: {
    pendingAddress: number;
    pendingShipment: number;
    shipped: number;
    delivered: number;
  };
}

export const prizeOrderApi = {
  getStats: () =>
    request.get<PrizeOrderStats>('/draws/prize-orders/stats'),
  getList: (params: {
    status?: PrizeShippingStatus;
    keyword?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) =>
    request.get<PrizeOrdersResponse>('/draws/prize-orders', params),
  getDetail: (drawResultId: number) =>
    request.get<PrizeOrderDetail>(`/draws/prize-orders/${drawResultId}`),
  ship: (drawResultId: number, data: { logisticsCompany: string; trackingNumber: string }) =>
    request.post<{ success: boolean; orderId: number; prizeShippingStatus: PrizeShippingStatus }>(
      `/draws/prize-orders/${drawResultId}/ship`,
      data
    ),
  confirmDelivery: (drawResultId: number) =>
    request.post<{ success: boolean; orderId: number; prizeStatus: string; prizeShippingStatus: PrizeShippingStatus; deliveredAt: string }>(
      `/draws/prize-orders/${drawResultId}/confirm-delivery`
    ),
  batchShip: (orders: Array<{ drawResultId: number; logisticsCompany: string; trackingNumber: string }>) =>
    request.post<{ success: number; failed: number; errors: Array<{ drawResultId: number; error: string }> }>(
      '/draws/prize-orders/batch-ship',
      { orders }
    ),
};

// 通知管理 API
export type NotificationType = 'SYSTEM' | 'PRIZE_WON' | 'SHIPPING_UPDATE' | 'ORDER_UPDATE' | 'ACCOUNT' | 'PROMOTION';
export type NotificationTargetType = 'ALL' | 'SINGLE_USER';

export interface Notification {
  id: number;
  type: NotificationType;
  targetType: NotificationTargetType;
  userId: string | null;
  title: string;
  content: string;
  imageUrl: string | null;
  actionType: string | null;
  actionValue: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationStats {
  totalSent: number;
  systemBroadcasts: number;
  userNotifications: number;
  todaySent: number;
}

export const notificationApi = {
  getList: (params: {
    page: number;
    limit: number;
    type?: NotificationType;
    targetType?: NotificationTargetType;
    keyword?: string;
  }) =>
    request.get<PaginatedResponse<Notification>>('/notifications', params),
  getStats: () =>
    request.get<NotificationStats>('/notifications/stats'),
  getOne: (id: number) =>
    request.get<Notification>(`/notifications/${id}`),
  createSystem: (data: {
    title: string;
    content: string;
    type?: NotificationType;
    imageUrl?: string;
    actionType?: string;
    actionValue?: string;
  }) =>
    request.post<{ success: boolean; notificationId: number; recipientCount: number }>('/notifications/system', data),
  sendToUser: (data: {
    userId: string;
    title: string;
    content: string;
    type?: NotificationType;
    imageUrl?: string;
    actionType?: string;
    actionValue?: string;
  }) =>
    request.post<{ success: boolean; notificationId: number }>('/notifications/user', data),
  delete: (id: number) =>
    request.delete<{ success: boolean }>(`/notifications/${id}`),
};

// Bot Management API

// Bot User Types
export interface BotUser {
  userId: string;
  displayName: string;
  displayAvatar: string;
  enabled: boolean;
  balance?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BotUserStats {
  totalBots: number;
  enabledBots: number;
  totalBalance: string;
  avgBalance: string;
  botsWithLowBalance: number;
}

// Bot Task Types
export interface BotTask {
  id: number;
  taskType: string;
  targetId: string;
  enabled: boolean;
  config: Record<string, unknown>;
  lastExecutedAt: string | null;
  nextExecuteAt: string | null;
  executionsToday: number;
  createdAt: string;
  updatedAt: string;
}

// Lucky Draw Config Types
export interface BotLuckyDrawConfig {
  id: number;
  productId: number;
  enabled: boolean;
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  minQuantity: number;
  maxQuantity: number;
  dailyOrderLimit: number;
  maxFillPercentage: number;
  activeHours: number[];
  createdAt: string;
  updatedAt: string;
}

// Bot Task Log Types
export interface BotTaskLog {
  id: number;
  taskId: number;
  taskType: string;
  botUserId: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  details: Record<string, unknown>;
  errorMessage: string | null;
  executionTimeMs: number | null;
  createdAt: string;
}

export const botApi = {
  // Bot Users
  getList: (params: { page?: number; limit?: number; enabled?: boolean; hasBalance?: boolean }) =>
    request.get<{ items: BotUser[]; total: number; page: number; limit: number }>('/bot/users', params),
  getStats: () =>
    request.get<{ stats: BotUserStats }>('/bot/users/stats'),
  batchCreate: (data: { count: number; displayNamePrefix?: string; initialBalance?: number }) =>
    request.post<{ count: number; botUsers: BotUser[] }>('/bot/users/batch-create', data),
  recharge: (id: string, amount: number) =>
    request.post<{ success: boolean; message: string }>(`/bot/users/${id}/recharge`, { amount }),
  batchRecharge: (amountPerBot: number) =>
    request.post<{ success: number; failed: number }>('/bot/users/batch-recharge', { amountPerBot }),
  toggleStatus: (id: string, enabled: boolean) =>
    request.patch<{ success: boolean; message: string }>(`/bot/users/${id}/toggle`, { enabled }),
  delete: (id: string) =>
    request.delete<{ success: boolean; message: string }>(`/bot/users/${id}`),

  // Lucky Draw Config
  getConfigs: () =>
    request.get<{ configs: BotLuckyDrawConfig[] }>('/bot/lucky-draw/configs'),
  getConfig: (productId: number) =>
    request.get<{ config: BotLuckyDrawConfig }>(`/bot/lucky-draw/configs/${productId}`),
  updateConfig: (productId: number, data: Partial<BotLuckyDrawConfig>) =>
    request.put<{ config: BotLuckyDrawConfig }>(`/bot/lucky-draw/configs/${productId}`, data),
  enableBot: (productId: number) =>
    request.post<{ success: boolean; message: string }>(`/bot/lucky-draw/configs/${productId}/enable`),
  disableBot: (productId: number) =>
    request.post<{ success: boolean; message: string }>(`/bot/lucky-draw/configs/${productId}/disable`),
  createTask: (data: { productId: number; config?: Partial<BotLuckyDrawConfig> }) =>
    request.post<{ task: BotTask; config: BotLuckyDrawConfig }>('/bot/lucky-draw/tasks/create', data),

  // Tasks
  getTasks: (params: { page?: number; limit?: number; taskType?: string; enabled?: boolean }) =>
    request.get<{ items: BotTask[]; total: number; page: number; limit: number }>('/bot/tasks', params),
  startTask: (id: number) =>
    request.post<{ success: boolean; message: string }>(`/bot/tasks/${id}/start`),
  stopTask: (id: number) =>
    request.post<{ success: boolean; message: string }>(`/bot/tasks/${id}/stop`),

  // Logs
  getLogs: (params: { page?: number; limit?: number; taskType?: string; taskId?: number; status?: string; botUserId?: string }) =>
    request.get<{ items: BotTaskLog[]; total: number; page: number; limit: number }>('/bot/logs', params),
};

export default api;
