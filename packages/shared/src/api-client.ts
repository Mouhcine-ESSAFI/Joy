/**
 * Joy Morocco API Client
 * 
 * Ready-to-use fetch wrapper for all backend endpoints
 * Handles authentication, errors, and TypeScript types
 */

import type {
    // Auth
    LoginRequest,
    LoginResponse,
    AuthMeResponse,

    // Orders
    Order,
    OrdersListParams,
    OrdersListResponse,
    CreateOrderDto,
    UpdateOrderDto,
    OrderHistory,
    AddNoteRequest,

    // Supplements
    Supplement,
    CreateSupplementDto,

    // Users
    User,
    CreateUserDto,
    UpdateUserDto,

    // Stores
    ShopifyStore,
    CreateShopifyStoreDto,
    UpdateShopifyStoreDto,

    // Tour Mappings
    TourMapping,
    CreateTourMappingDto,
    UpdateTourMappingDto,

    // Room Rules
    RoomTypeRule,
    CreateRoomTypeRuleDto,
    UpdateRoomTypeRuleDto,

    // Transport Types
    TransportType,
    CreateTransportTypeDto,
    UpdateTransportTypeDto,

    // Customers
    Customer,
    CustomersResponse,

    // Errors
    ApiError,
  } from './types';
import { isApiError } from './types';
  
  // ============================================
  // Configuration
  // ============================================
  
  // All API calls go through Next.js's /api rewrite proxy (same-origin).
  // This avoids cross-origin cookie restrictions in all browsers.
  // The proxy destination is configured in next.config.ts via NEXT_PUBLIC_API_URL.
  const API_BASE_URL = '/api';
  
  // ============================================
  // Core HTTP Client
  // ============================================
  
  class HttpClient {
    private baseUrl: string;
  
    constructor(baseUrl: string) {
      this.baseUrl = baseUrl;
    }
  
    private async request<T>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<T> {
      const url = `${this.baseUrl}${endpoint}`;

      const config: RequestInit = {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      };

      try {
        const response = await fetch(url, config);

        // Handle 401 - Try to refresh token
        if (response.status === 401) {
          // ⭐ Don't try to refresh on auth endpoints
          const isAuthEndpoint = endpoint === '/auth/login' || endpoint === '/auth/refresh';
          
          if (isAuthEndpoint) {
            // For auth endpoints, just return the error directly
            const apiError = await this.handleError(response);
            const error = new Error(Array.isArray(apiError.message) ? apiError.message.join(', ') : String(apiError.message));
            (error as any).response = apiError;
            throw error;
          }
          
          // For other endpoints, try to refresh token
          const refreshed = await this.refreshToken();
          if (refreshed) {
            const retryResponse = await fetch(url, config);
            if (!retryResponse.ok) {
              const apiError = await this.handleError(retryResponse);
              const error = new Error(Array.isArray(apiError.message) ? apiError.message.join(', ') : String(apiError.message));
              (error as any).response = apiError;
              throw error;
            }
            return await retryResponse.json();
          } else {
            if (typeof window !== 'undefined') {
              const currentPath = window.location.pathname;
              if (!currentPath.includes('/login')) {
                window.location.href = '/login';
              }
            }
            const error = new Error('Session expired');
            (error as any).isAuthError = true;
            throw error;
          }
        }

        if (!response.ok) {
          const apiError = await this.handleError(response);
          const error = new Error(Array.isArray(apiError.message) ? apiError.message.join(', ') : String(apiError.message));
          (error as any).response = apiError;
          throw error;
        }

        if (response.status === 204) {
          return {} as T;
        }

        return await response.json();
        } catch (error: any) {
          // ⭐ Don't log auth-related errors (they're expected)
          const isAuthError = error.isAuthError || 
                              error.message === 'Invalid credentials' || 
                              error.message === 'Session expired';
          
          if (!isAuthError) {
            console.error('API Error:', error);
          }
          
          throw error;
        }
    }
  
    private async handleError(response: Response): Promise<ApiError> {
      try {
        const errorBody = await response.json();
        if (isApiError(errorBody)) {
          return errorBody;
        }
        // If the body is JSON but not our expected error format, create a proper error.
        return {
          statusCode: response.status,
          message: typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody),
          error: response.statusText,
        };
      } catch {
        // This catches if response.json() fails (e.g. not valid JSON)
        return {
          statusCode: response.status,
          message: response.statusText,
          error: 'The server returned a non-JSON error response.',
        };
      }
    }
  
    private async refreshToken(): Promise<boolean> {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  
    async get<T>(endpoint: string): Promise<T> {
      return this.request<T>(endpoint, { method: 'GET' });
    }
  
    async post<T>(endpoint: string, data?: any): Promise<T> {
      return this.request<T>(endpoint, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      });
    }
  
    async patch<T>(endpoint: string, data: any): Promise<T> {
      return this.request<T>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
  
    async delete<T>(endpoint: string): Promise<T> {
      return this.request<T>(endpoint, { method: 'DELETE' });
    }
  }
  
  const client = new HttpClient(API_BASE_URL);
  
  // ============================================
  // Auth API
  // ============================================
  
  export const authApi = {
    login: (data: LoginRequest) =>
      client.post<LoginResponse>('/auth/login', data),
  
    logout: () =>
      client.post<{ success: boolean }>('/auth/logout'),
  
    getMe: () =>
      client.get<AuthMeResponse>('/auth/me'),
  
    refresh: () =>
      client.post<{ success: boolean }>('/auth/refresh'),
  };
  
  // ============================================
  // Orders API
  // ============================================
  
  export const ordersApi = {
    list: (params?: OrdersListParams) => {
      const queryString = params
        ? '?' + new URLSearchParams(params as any).toString()
        : '';
      return client.get<OrdersListResponse>(`/orders${queryString}`);
    },
  
    getById: (id: string) =>
      client.get<Order>(`/orders/${id}`),
  
    create: (data: CreateOrderDto) =>
      client.post<Order>('/orders', data),
  
    update: (id: string, data: UpdateOrderDto) =>
      client.patch<Order>(`/orders/${id}`, data),
  
    delete: (id: string) =>
      client.delete<void>(`/orders/${id}`),
  
    addNote: (id: string, note: string) =>
      client.post<OrderHistory>(`/orders/${id}/notes`, { note }),
  
    getHistory: (id: string) =>
      client.get<OrderHistory[]>(`/orders/${id}/history`),
  };
  
  // ============================================
  // Supplements API
  // ============================================
  
  export const supplementsApi = {
    listByOrder: (orderId: string) =>
      client.get<Supplement[]>(`/supplements/orders/${orderId}`),
  
    create: (orderId: string, data: CreateSupplementDto) =>
      client.post<Supplement>(`/supplements/orders/${orderId}`, data),
  
    delete: (id: string) =>
      client.delete<{ message: string }>(`/supplements/${id}`),
  };
  
  // ============================================
  // Users API
  // ============================================
  
  export const usersApi = {
    list: () =>
      client.get<User[]>('/users'),

    getMe: () =>
      client.get<User>('/users/me'),

    getById: (id: string) =>
      client.get<User>(`/users/${id}`),

    create: (data: CreateUserDto) =>
      client.post<User>('/users', data),

    update: (id: string, data: UpdateUserDto) =>
      client.patch<User>(`/users/${id}`, data),

    delete: (id: string) =>
      client.delete<void>(`/users/${id}`),

    getOwnerProfile: () =>
      client.get<User>('/users/owner-profile'),

    updateOwnerProfile: (data: { name?: string; email?: string; password?: string }) =>
      client.patch<User>('/users/owner-profile', data),
  };
  
  // ============================================
  // Shopify Stores API
  // ============================================
  
  export const storesApi = {
    list: () =>
      client.get<ShopifyStore[]>('/shopify-stores'),
  
    getById: (id: string) =>
      client.get<ShopifyStore>(`/shopify-stores/${id}`),
  
    create: (data: CreateShopifyStoreDto) =>
      client.post<ShopifyStore>('/shopify-stores', data),
  
    update: (id: string, data: UpdateShopifyStoreDto) =>
      client.patch<ShopifyStore>(`/shopify-stores/${id}`, data),
  
    delete: (id: string) =>
      client.delete<void>(`/shopify-stores/${id}`),
  
    toggleStatus: (id: string) =>
      client.post<ShopifyStore>(`/shopify-stores/${id}/toggle-status`),
  };
  
  // ============================================
  // Tour Mappings API
  // ============================================
  
  export const tourMappingsApi = {
    list: () =>
      client.get<TourMapping[]>('/tour-mappings'),
  
    getById: (id: string) =>
      client.get<TourMapping>(`/tour-mappings/${id}`),
  
    create: (data: CreateTourMappingDto) =>
      client.post<TourMapping>('/tour-mappings', data),
  
    update: (id: string, data: UpdateTourMappingDto) =>
      client.patch<TourMapping>(`/tour-mappings/${id}`, data),
  
    delete: (id: string) =>
      client.delete<void>(`/tour-mappings/${id}`),
  };
  
  // ============================================
  // Room Type Rules API
  // ============================================
  
  export const roomRulesApi = {
    list: () =>
      client.get<RoomTypeRule[]>('/room-type-rules'),
  
    create: (data: CreateRoomTypeRuleDto) =>
      client.post<RoomTypeRule>('/room-type-rules', data),
  
    update: (id: string, data: UpdateRoomTypeRuleDto) =>
      client.patch<RoomTypeRule>(`/room-type-rules/${id}`, data),
  
    delete: (id: string) =>
      client.delete<void>(`/room-type-rules/${id}`),
  };
  
  // ============================================
  // Transport Types API
  // ============================================
  
  export const transportTypesApi = {
    list: () =>
      client.get<TransportType[]>('/transport-types'),
  
    listActive: () =>
      client.get<TransportType[]>('/transport-types/active'),
  
    getById: (id: string) =>
      client.get<TransportType>(`/transport-types/${id}`),
  
    create: (data: CreateTransportTypeDto) =>
      client.post<TransportType>('/transport-types', data),
  
    update: (id: string, data: UpdateTransportTypeDto) =>
      client.patch<TransportType>(`/transport-types/${id}`, data),
  
    delete: (id: string) =>
      client.delete<void>(`/transport-types/${id}`),
  };

  // ============================================
  // Customers API
  // ============================================

  export const customersApi = {
    findAll: (params?: {
      search?: string;
      storeId?: string;
      country?: string;
      page?: number;
      pageSize?: number;
    }) => client.get<CustomersResponse>('/customers', params as any),

    findOne: (id: string) => client.get<Customer>(`/customers/${id}`),

    getStats: () => client.get<{ total: number; withEmail: number }>('/customers/stats'),
  };

  // ============================================
  // Maintenance API (Owner only)
  // ============================================

  export const maintenanceApi = {
    resetOrders: () =>
      client.post<{ success: boolean; message: string; deletedAt: string }>('/maintenance/reset-orders'),

    resetSync: () =>
      client.post<{ success: boolean; message: string; resetAt: string }>('/maintenance/reset-sync'),
  };

  // ============================================
  // Notifications API
  // ============================================

  export const notificationsApi = {
    subscribe: (subscription: any) =>
      client.post<any>('/notifications/subscribe', subscription),

    test: () =>
      client.post<{ message: string }>('/notifications/test'),
  };
  
  // ============================================
  // Export all APIs
  // ============================================
  
  export const api = {
    auth: authApi,
    orders: ordersApi,
    supplements: supplementsApi,
    users: usersApi,
    stores: storesApi,
    tourMappings: tourMappingsApi,
    roomRules: roomRulesApi,
    transportTypes: transportTypesApi,
    customers: customersApi,
    notifications: notificationsApi,
    maintenance: maintenanceApi,
  };
  export default api;
