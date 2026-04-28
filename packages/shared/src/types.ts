/**
 * Joy Morocco Backend - TypeScript Interfaces
 * 
 * Complete type definitions for frontend development
 * Auto-generated from backend entities
 */

// ============================================
// User Types
// ============================================

export enum UserRole {
  OWNER = 'Owner',
  ADMIN = 'Admin',
  TRAVEL_AGENT = 'Travel Agent',
  DRIVER = 'Driver',
  FINANCE = 'Finance',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface User {
  id: string; // UUID
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  accessibleShopifyStores: string[]; // ['EN', 'ES']
  permissions: Record<string, any>;
  assignedTransportCode: string | null;
  createdAt: string; // ISO timestamp
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status?: UserStatus;
  accessibleShopifyStores?: string[];
  permissions?: Record<string, any>;
  assignedTransportCode?: string | null;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  accessibleShopifyStores?: string[];
  permissions?: Record<string, any>;
  assignedTransportCode?: string | null;
}

// ============================================
// Auth Types
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
}

export interface AuthMeResponse extends User {}

// ============================================
// Order Types
// ============================================

export enum OrderStatus {
  NEW = 'New',
  UPDATED = 'Updated',
  VALIDATE = 'Validate',
  COMPLETED = 'Completed',
  CANCELED = 'Canceled',
}

export enum TourType {
  SHARED = 'Shared',
  PRIVATE = 'Private',
}

export enum PaymentStatus {
  PENDING = 'pending',
  DEPOSIT_PAID = 'deposit_paid',
  PARTIALLY_PAID = 'partially_paid',
  FULLY_PAID = 'fully_paid',
  REFUNDED = 'refunded',
}

export enum FinancialStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  PARTIALLY_REFUNDED = 'partially_refunded',
  REFUNDED = 'refunded',
  VOIDED = 'voided',
}

export interface Order {
  id: string; // UUID
  
  // Shopify Information
  shopifyOrderId: string;
  shopifyOrderNumber: string; // "DS4493-26"
  shopifyLineItemId: string;
  lineItemIndex: number;
  storeId: string; // "EN" | "ES"
  shopifyCreatedAt: string; // ISO timestamp
  
  // Customer Information
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerAvatar?: string; // Frontend-only field from mock data
  
  // Tour Details
  tourDate: string | null; // "2026-02-20"
  tourHour: string | null; // "16:00"
  pax: number;
  tourCode: string | null;
  tourTitle: string;
  tourType: TourType | null;
  campType: string | null;
  roomType: string | null;
  pickupLocation: string | null;
  accommodationName: string | null;
  
  // Status
  status: OrderStatus;
  
  // Payment Tracking
  lineItemPrice: string; // Decimal as string "199.00"
  lineItemDiscount: string;
  shopifyTotalAmount: string;
  originalTotalAmount: string;
  depositAmount: string;
  balanceAmount: string;
  currency: string; // "EUR"
  paymentStatus: PaymentStatus;
  financialStatus: FinancialStatus | null;
  
  // Logistics
  transport: string | null;
  note: string | null;
  
  // Driver Assignment
  driverId: string | null; // UUID
  driverNotes: string | null;
  assignedAt: string | null; // ISO timestamp
  
  // Shopify Raw Data
  lineItemProperties: Record<string, any>;
  shopifyMetadata: Record<string, any>;
  tags: string[] | null;
  
  // Timestamps
  createdAt: string; // ISO timestamp
  updatedAt: string;
  confirmedAt: string | null;
  canceledAt: string | null;

  supplements?: Supplement[]; // Frontend-only field from mock data
}

export interface OrdersListResponse {
  orders: Order[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface OrdersListParams {
  page?: number;
  pageSize?: number;
  storeId?: string;
  status?: OrderStatus;
  shopifyOrderId?: string;
  tourType?: TourType;
  transport?: string;
  startDate?: string; // "2026-02-01"
  endDate?: string; // "2026-02-28"
  customerName?: string;
  search?: string;
  sortBy?: 'shopifyCreatedAt' | 'tourDate' | 'customerName' | 'status' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateOrderDto {
  shopifyOrderId: string;
  shopifyOrderNumber: string;
  shopifyLineItemId: string;
  lineItemIndex: number;
  storeId: string;
  shopifyCreatedAt?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  tourDate?: string;
  tourHour?: string;
  pax: number;
  tourTitle: string;
  tourType?: TourType;
  campType?: string;
  lineItemPrice: number;
  depositAmount: number;
  balanceAmount: number;
  currency: string;
}

export interface UpdateOrderDto {
  status?: OrderStatus;
  tourDate?: string;
  tourHour?: string;
  pax?: number;
  tourType?: TourType;
  campType?: string;
  roomType?: string;
  pickupLocation?: string;
  accommodationName?: string;
  transport?: string;
  note?: string;
  driverId?: string;
  driverNotes?: string;
}

// ============================================
// Order History Types
// ============================================

export enum OrderHistoryType {
  STATUS_CHANGE = 'status_change',
  NOTE_ADDED = 'note_added',
  DRIVER_ASSIGNED = 'driver_assigned',
  DRIVER_UNASSIGNED = 'driver_unassigned',
  FIELD_UPDATED = 'field_updated',
  SUPPLEMENT_ADDED = 'supplement_added',
  SUPPLEMENT_REMOVED = 'supplement_removed',
}

export interface OrderHistory {
  id: string; // UUID
  orderId: string; // UUID
  type: OrderHistoryType;
  userId: string | null; // UUID
  user?: {
    id: string;
    name: string;
    email: string;
  };
  
  // For STATUS_CHANGE
  oldStatus?: OrderStatus;
  newStatus?: OrderStatus;
  
  // For FIELD_UPDATED
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  
  // For NOTE_ADDED
  note?: string;
  
  // For DRIVER_ASSIGNED/UNASSIGNED
  driverId?: string; // UUID
  driverName?: string;
  
  // For SUPPLEMENT_ADDED/REMOVED
  supplementId?: string; // UUID
  supplementLabel?: string;
  supplementAmount?: string; // Decimal as string
  
  metadata: Record<string, any>;
  createdAt: string; // ISO timestamp
}

export interface AddNoteRequest {
  note: string;
}

// ============================================
// Supplement Types
// ============================================

export interface Supplement {
  id: string; // UUID
  orderId: string; // UUID
  label: string;
  amount: string; // Decimal as string "50.00"
  createdBy: string; // UUID
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string; // ISO timestamp
}

export interface CreateSupplementDto {
  label: string;
  amount: number;
  createdById?: string;
}

// ============================================
// Shopify Store Types
// ============================================

export enum StoreStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface ShopifyStore {
  id: string; // UUID
  internalName: string; // "EN" | "ES"
  shopifyDomain: string; // "desertexplore.myshopify.com"
  // accessToken is NOT returned (sensitive)
  apiVersion: string; // "2026-01"
  status: StoreStatus;
  // webhookSecret is NOT returned (sensitive)
  lastSyncedAt: string | null; // ISO timestamp
  lastOrderFetchedAt: string | null; // ISO timestamp
  initialSyncCompleted: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface CreateShopifyStoreDto {
  internalName: string;
  shopifyDomain: string;
  accessToken: string;
  apiVersion?: string;
  status?: StoreStatus;
  webhookSecret?: string;
}

export interface UpdateShopifyStoreDto {
  internalName?: string;
  shopifyDomain?: string;
  accessToken?: string;
  apiVersion?: string;
  status?: StoreStatus;
  webhookSecret?: string;
}

// ============================================
// Tour Mapping Types
// ============================================

export interface TourMapping {
  id: string; // UUID
  storeId: string; // "EN" | "ES"
  productTitle: string;
  productSku: string | null;
  tourCode: string | null;
  createdAt: string; // ISO timestamp
}

export interface CreateTourMappingDto {
  storeId: string;
  productTitle: string;
  productSku?: string;
  tourCode?: string;
}

export interface UpdateTourMappingDto {
  tourCode?: string;
}

// ============================================
// Room Type Rule Types
// ============================================

export interface RoomTypeRule {
  id: string; // UUID
  paxMin: number;
  paxMax: number;
  defaultRoomType: string;
  allowedRoomTypes: string[]; // Array of room types
  isActive: boolean;
  createdAt: string; // ISO timestamp
}

export interface CreateRoomTypeRuleDto {
  paxMin: number;
  paxMax: number;
  defaultRoomType: string;
  allowedRoomTypes: string[];
  isActive?: boolean;
}

export interface UpdateRoomTypeRuleDto {
  paxMin?: number;
  paxMax?: number;
  defaultRoomType?: string;
  allowedRoomTypes?: string[];
  isActive?: boolean;
}

// ============================================
// Transport Type Types
// ============================================

export interface TransportType {
  id: string; // UUID
  code: string; // "FCHK", "MDBM", "TBC"
  name: string; // "Falah Cool Heat Transport"
  isActive: boolean;
  createdAt: string; // ISO timestamp
}

export interface CreateTransportTypeDto {
  code: string;
  name: string;
  isActive?: boolean;
}

export interface UpdateTransportTypeDto {
  code?: string;
  name?: string;
  isActive?: boolean;
}

// ============================================
// API Error Types
// ============================================

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

// ============================================
// Utility Type Guards
// ============================================

export function isApiError(error: any): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    'message' in error &&
    'error' in error
  );
}

export function isUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// ============================================
// Temporary Frontend-only types
// ============================================
// These types were used with mock-data and may be phased out
// as the backend connection is fully integrated.

export interface TourItem {
    id: string;
    tourCode: string;
    pax: number;
    tourHour: string;
    tourType: 'Shared' | 'Private';
    campType: 'Comfort' | 'Luxury' | 'Luxury A/C';
    roomType: string;
    accommodationName?: string;
}


// Customer entity — matches backend /customers endpoint
export interface Customer {
  id: string;
  shopifyCustomerId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  totalOrders: number;
  totalSpent: string;
  storeId?: string;
  storeDomain?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomersResponse {
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Legacy type kept for backwards compat
export interface ShopifyCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  storeId: string;
  location?: string;
  postalCode?: string;
  totalOrders: number;
  amountSpent: number;
  note?: string;
  tags?: string[];
  emailSubscription: 'subscribed' | 'unsubscribed' | 'pending';
  smsSubscription: 'subscribed' | 'unsubscribed' | 'pending';
  taxExempt: boolean;
  language: string;
  createdAt: string;
  updatedAt: string;
}

// To be compatible with old mock data response
export interface OrdersResponse {
    orders: Order[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
