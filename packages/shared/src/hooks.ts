/**
 * Joy Morocco - React Hooks
 * 
 * Ready-to-use React hooks for API integration
 * Works with React, Next.js, or any React framework
 */

import { useState, useEffect, useCallback } from 'react';
import api from './api-client';
import { useOrdersSocket } from './use-orders-socket';
import type {
  Order,
  OrdersListParams,
  OrdersListResponse,
  User,
  Supplement,
  TransportType,
  TourMapping,
  RoomTypeRule,
  OrderHistory,
  ShopifyStore,
  Customer,
  CustomersResponse,
  ApiError,
} from './types';

// ============================================
// Auth Hooks
// ============================================

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const currentUser = await api.auth.getMe();
      setUser(currentUser);
    } catch (err: any) {
      setUser(null);
      if (!err.isAuthError) {
        console.error('Auth check failed:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await api.auth.login({ email, password });
      setUser(response.user);
      return response.user;
    } catch (err: any) {
      const errorMsg = err.message || 'Login failed';
      setError(errorMsg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    refetch: checkAuth,
  };
}

// ============================================
// Orders Hooks
// ============================================

export function useOrders(params?: OrdersListParams) {
  const [data, setData] = useState<OrdersListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(Date.now());

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await api.orders.list(params);
      setData(response);
      setLastFetchTime(Date.now());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  // Initial fetch
  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  // Real-time: refetch silently when the backend emits any order event
  const silentRefetch = useCallback(() => {
    if (document.visibilityState === 'visible') {
      fetchOrders(true);
    }
  }, [fetchOrders]);

  useOrdersSocket(silentRefetch);

  // Fallback: 30s poll when tab is visible (catches missed WS events)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchOrders(true);
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchOrders(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchOrders]);

  return {
    orders: data?.orders || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 10,
    loading,
    error,
    refetch: () => fetchOrders(false),
    lastFetchTime,
  };
}

export function useOrder(id: string | null) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setOrder(null);
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.orders.getById(id);
        setOrder(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const updateOrder = async (updates: Partial<Order>) => {
    if (!id) return;
    
    try {
      const updated = await api.orders.update(id, updates);
      setOrder(updated);
      return updated;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    order,
    loading,
    error,
    updateOrder,
  };
}

export function useOrderHistory(orderId: string | null) {
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.orders.getHistory(orderId);
        setHistory(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [orderId]);

  const addNote = async (note: string) => {
    if (!orderId) return;
    
    try {
      const newEntry = await api.orders.addNote(orderId, note);
      setHistory(prev => [newEntry, ...prev]);
      return newEntry;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    history,
    loading,
    error,
    addNote,
  };
}

// ============================================
// Supplements Hooks
// ============================================

export function useSupplements(orderId: string | null) {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSupplements = useCallback(async () => {
    if (!orderId) {
      setSupplements([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await api.supplements.listByOrder(orderId);
      setSupplements(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch supplements');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchSupplements();
  }, [fetchSupplements]);

  const addSupplement = async (label: string, amount: number) => {
    if (!orderId) return;
    
    try {
      const newSupplement = await api.supplements.create(orderId, { label, amount });
      setSupplements(prev => [...prev, newSupplement]);
      return newSupplement;
    } catch (err: any) {
      throw err;
    }
  };

  const removeSupplement = async (id: string) => {
    try {
      await api.supplements.delete(id);
      setSupplements(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    supplements,
    loading,
    error,
    addSupplement,
    removeSupplement,
    refetch: fetchSupplements,
  };
}

// ============================================
// Users Hooks
// ============================================

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.users.list();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
}

// ============================================
// Shopify Stores Hook
// ============================================
export function useShopifyStores() {
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.stores.list();
      setStores(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  return {
    stores,
    loading,
    error,
    refetch: fetchStores,
  };
}

// ============================================
// Transport Types Hook
// ============================================

export function useTransportTypes(activeOnly = false) {
  const [transportTypes, setTransportTypes] = useState<TransportType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransportTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = activeOnly
        ? await api.transportTypes.listActive()
        : await api.transportTypes.list();
      setTransportTypes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transport types');
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    fetchTransportTypes();
  }, [fetchTransportTypes]);

  return {
    transportTypes,
    loading,
    error,
    refetch: fetchTransportTypes,
  };
}

// ============================================
// Tour Mappings Hook
// ============================================

export function useTourMappings() {
  const [tourMappings, setTourMappings] = useState<TourMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTourMappings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.tourMappings.list();
      setTourMappings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tour mappings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTourMappings();
  }, [fetchTourMappings]);

  return {
    tourMappings,
    loading,
    error,
    refetch: fetchTourMappings,
  };
}

// ============================================
// Room Type Rules Hook
// ============================================

export function useRoomTypeRules() {
  const [roomRules, setRoomRules] = useState<RoomTypeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoomRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.roomRules.list();
      setRoomRules(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch room rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoomRules();
  }, [fetchRoomRules]);

  return {
    roomRules,
    loading,
    error,
    refetch: fetchRoomRules,
  };
}

// ============================================
// Customers Hook
// ============================================

export function useCustomers(params?: {
  search?: string;
  storeId?: string;
  country?: string;
  page?: number;
  pageSize?: number;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.customers.findAll(params);
      setCustomers(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return {
    customers,
    total,
    totalPages,
    loading,
    error,
    refetch: fetchCustomers,
  };
}

// ============================================
// Usage Examples
// ============================================

/*
// Example 1: Orders List Page
function OrdersPage() {
  const { orders, total, loading, error } = useOrders({
    page: 1,
    pageSize: 10,
    status: 'New',
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Orders ({total})</h1>
      {orders.map(order => (
        <div key={order.id}>{order.shopifyOrderNumber}</div>
      ))}
    </div>
  );
}

// Example 2: Order Details Page
function OrderDetailsPage({ orderId }) {
  const { order, loading, updateOrder } = useOrder(orderId);
  const { history, addNote } = useOrderHistory(orderId);
  const { supplements, addSupplement } = useSupplements(orderId);

  const handleStatusChange = async (newStatus) => {
    await updateOrder({ status: newStatus });
  };

  const handleAddNote = async (note) => {
    await addNote(note);
  };

  if (loading) return <div>Loading...</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div>
      <h1>{order.shopifyOrderNumber}</h1>
      <button onClick={() => handleStatusChange('Validate')}>
        Validate Order
      </button>
      {/* ... rest of UI ... *\/}
    </div>
  );
}

// Example 3: Login Page
function LoginPage() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      // Redirect to dashboard
    } catch (err) {
      // Error is already set in hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <div>{error}</div>}
    </form>
  );
}
*/
