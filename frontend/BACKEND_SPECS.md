# Joy Morocco Backend API Documentation

**Version:** 1.0  
**Base URL:** `http://localhost:3001/api` (development)  
**Production:** `https://your-domain.com/api`

---

## 🔐 Authentication

All API requests require authentication via **HTTP-only cookies**. Your frontend must send cookies with every request.

### Setup Required
```javascript
// Always use credentials: 'include' in fetch calls
fetch('/api/orders', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Or with axios
axios.defaults.withCredentials = true;
```

---

## 🔑 Auth Endpoints

### Login
```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "admin@joymorocco.com",
  "password": "your-password"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@joymorocco.com",
    "role": "Admin",
    "status": "active",
    "accessibleShopifyStores": ["EN", "ES"],
    "permissions": {}
  }
}
```

**Sets Cookies:**
- `access_token` (HTTP-only, 15 min)
- `refresh_token` (HTTP-only, 7 days)

---

### Get Current User
```
GET /auth/me
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Admin User",
  "email": "admin@joymorocco.com",
  "role": "Owner | Admin | Travel Agent | Driver | Finance",
  "status": "active",
  "accessibleShopifyStores": ["EN", "ES"],
  "permissions": {}
}
```

---

### Refresh Token
```
POST /auth/refresh
```

**Request Body:** Empty

**Success Response (200):**
```json
{
  "success": true
}
```

**Use Case:** When you get 401, call this to refresh tokens, then retry the original request.

---

### Logout
```
POST /auth/logout
```

**Request Body:** Empty

**Success Response (200):**
```json
{
  "success": true
}
```

---

## 📦 Orders API

### List Orders (with Pagination & Filters)
```
GET /orders?page=1&pageSize=10&status=New&storeId=EN
```

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number (default: 1) | `1` |
| `pageSize` | number | Items per page (default: 50) | `10` |
| `storeId` | string | Filter by store | `EN`, `ES` |
| `status` | string | Filter by status | `New`, `Updated`, `Validate`, `Completed`, `Canceled` |
| `shopifyOrderId` | string | Filter by Shopify ID | `5482563043542` |
| `tourType` | string | Filter by tour type | `Private`, `Shared` |
| `transport` | string | Filter by transport | `FCHK`, `MDBM`, `TBC` |
| `startDate` | string | Tour date >= this (YYYY-MM-DD) | `2026-02-01` |
| `endDate` | string | Tour date <= this (YYYY-MM-DD) | `2026-02-28` |
| `customerName` | string | Search customer name (partial) | `John` |
| `search` | string | Global search (name, email, phone, order #, tour title) | `DS4493` |
| `sortBy` | string | Sort field | `tourDate`, `customerName`, `shopifyCreatedAt` |
| `sortOrder` | string | Sort direction | `ASC`, `DESC` |

**Response (200):**
```json
{
  "orders": [
    {
      "id": "97b19e9e-d4db-41c6-97f0-68fa6d872bb4",
      "shopifyOrderId": "5482563043542",
      "shopifyOrderNumber": "DS4493-26",
      "shopifyCreatedAt": "2026-02-13T09:00:00.000Z",
      "storeId": "ES",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "customerPhone": "+212600000000",
      "tourDate": "2026-02-20",
      "tourHour": "16:00",
      "pax": 2,
      "tourCode": "MARR3D",
      "tourTitle": "3 Day Marrakech Desert Tour",
      "tourType": "Private",
      "campType": "Superior Camp (+75€)",
      "roomType": "Double",
      "pickupLocation": "Hotel Riad",
      "accommodationName": null,
      "status": "New",
      "lineItemPrice": "450.00",
      "lineItemDiscount": "0.00",
      "shopifyTotalAmount": "900.00",
      "originalTotalAmount": "900.00",
      "depositAmount": "180.00",
      "balanceAmount": "720.00",
      "currency": "EUR",
      "paymentStatus": "deposit_paid",
      "financialStatus": "paid",
      "transport": "FCHK",
      "note": "Customer requests early pickup",
      "driverId": null,
      "driverNotes": null,
      "assignedAt": null,
      "tags": ["VIP"],
      "createdAt": "2026-02-13T10:30:00.000Z",
      "updatedAt": "2026-02-13T10:30:00.000Z"
    }
  ],
  "total": 351,
  "totalPages": 36,
  "page": 1,
  "pageSize": 10
}
```

**Important Notes:**
- Orders are sorted by `shopifyCreatedAt DESC` by default (newest first)
- When filtering by date range (`startDate`/`endDate`), sorting switches to `tourDate ASC` (earliest tour first)
- **TravelAgents** only see orders from stores in their `accessibleShopifyStores` array

---

### Get Single Order
```
GET /orders/{id}
```

**Parameters:**
- `id` (UUID): Order ID

**Response (200):**
```json
{
  "id": "97b19e9e-d4db-41c6-97f0-68fa6d872bb4",
  "shopifyOrderNumber": "DS4493-26",
  "customerName": "John Doe",
  "tourDate": "2026-02-20",
  "status": "New",
  ...
}
```

**Error Responses:**
- `400`: Invalid UUID format
- `403`: TravelAgent doesn't have access to this store
- `404`: Order not found

---

### Create Order
```
POST /orders
```

**Permissions:** Owner, Admin only

**Request Body:**
```json
{
  "shopifyOrderId": "5482563043542",
  "shopifyOrderNumber": "DS4493-26",
  "shopifyLineItemId": "13576880062678",
  "lineItemIndex": 0,
  "storeId": "EN",
  "shopifyCreatedAt": "2026-02-13T09:00:00.000Z",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+212600000000",
  "tourDate": "2026-02-20",
  "tourHour": "16:00",
  "pax": 2,
  "tourTitle": "3 Day Desert Tour",
  "tourType": "Private",
  "campType": "Superior",
  "lineItemPrice": 450,
  "depositAmount": 180,
  "balanceAmount": 720,
  "currency": "EUR"
}
```

**Response (201):** Created order object

---

### Update Order
```
PATCH /orders/{id}
```

**Permissions:** Owner, Admin only

**Request Body (all fields optional):**
```json
{
  "status": "Validate",
  "tourDate": "2026-02-21",
  "tourHour": "08:00",
  "transport": "MDBM",
  "driverId": "driver-uuid",
  "pickupLocation": "New Hotel",
  "note": "Updated note",
  "roomType": "Triple"
}
```

**Response (200):** Updated order object

**Auto-tracked in history:**
- Status changes
- Driver assignments
- Field updates

---

### Delete Order
```
DELETE /orders/{id}
```

**Permissions:** Owner, Admin only

**Response (200):**
```json
{
  "message": "Order deleted successfully"
}
```

---

### Add Note to Order
```
POST /orders/{id}/notes
```

**Permissions:** Owner, Admin, TravelAgent

**Request Body:**
```json
{
  "note": "Customer requested early pickup at 6 AM"
}
```

**Response (201):**
```json
{
  "id": "history-uuid",
  "orderId": "order-uuid",
  "type": "note_added",
  "note": "Customer requested early pickup at 6 AM",
  "userId": "user-uuid",
  "createdAt": "2026-02-13T11:00:00.000Z"
}
```

---

### Get Order History
```
GET /orders/{id}/history
```

**Permissions:** Owner, Admin, TravelAgent

**Response (200):**
```json
[
  {
    "id": "uuid",
    "orderId": "order-uuid",
    "type": "status_change",
    "oldStatus": "New",
    "newStatus": "Validate",
    "userId": "user-uuid",
    "user": {
      "id": "uuid",
      "name": "Admin User",
      "email": "admin@joymorocco.com"
    },
    "createdAt": "2026-02-13T10:00:00.000Z"
  },
  {
    "id": "uuid",
    "orderId": "order-uuid",
    "type": "note_added",
    "note": "Customer requested early pickup",
    "userId": "user-uuid",
    "user": {
      "id": "uuid",
      "name": "Travel Agent",
      "email": "agent@joymorocco.com"
    },
    "createdAt": "2026-02-13T09:30:00.000Z"
  },
  {
    "id": "uuid",
    "orderId": "order-uuid",
    "type": "driver_assigned",
    "driverId": "driver-uuid",
    "driverName": "Mohammed Ali",
    "userId": "user-uuid",
    "createdAt": "2026-02-13T09:00:00.000Z"
  }
]
```

**History Event Types:**
- `status_change`: Status was updated
- `note_added`: Note was added
- `driver_assigned`: Driver was assigned
- `driver_unassigned`: Driver was removed
- `field_updated`: Other field was updated
- `supplement_added`: Supplement was added
- `supplement_removed`: Supplement was deleted

---

## 💰 Supplements API

### List Supplements for Order
```
GET /orders/{orderId}/supplements
```

**Permissions:** Owner, Admin, TravelAgent

**Response (200):**
```json
[
  {
    "id": "uuid",
    "orderId": "order-uuid",
    "label": "Extra night accommodation",
    "amount": "50.00",
    "createdBy": "user-uuid",
    "creator": {
      "id": "uuid",
      "name": "Admin User",
      "email": "admin@joymorocco.com"
    },
    "createdAt": "2026-02-13T10:00:00.000Z"
  }
]
```

---

### Add Supplement
```
POST /orders/{orderId}/supplements
```

**Permissions:** Owner, Admin only

**Request Body:**
```json
{
  "label": "Extra night accommodation",
  "amount": 50.00
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "orderId": "order-uuid",
  "label": "Extra night accommodation",
  "amount": "50.00",
  "createdBy": "user-uuid",
  "createdAt": "2026-02-13T10:00:00.000Z"
}
```

**Auto-tracked:** Creates `supplement_added` history entry

---

### Delete Supplement
```
DELETE /supplements/{id}
```

**Permissions:** Owner, Admin only

**Response (200):**
```json
{
  "message": "Supplement deleted successfully"
}
```

**Auto-tracked:** Creates `supplement_removed` history entry

---

## 👥 Users API

### List Users
```
GET /users
```

**Permissions:** Owner, Admin only

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@joymorocco.com",
    "role": "Admin",
    "status": "active",
    "accessibleShopifyStores": ["EN", "ES"],
    "permissions": {},
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

---

### Get Current User Profile
```
GET /users/me
```

**Permissions:** Any authenticated user

**Response (200):** User object

---

### Get User by ID
```
GET /users/{id}
```

**Permissions:** 
- Owner/Admin: Can view any user
- Others: Can only view their own profile

**Response (200):** User object

**Error:**
- `403`: "You can only view your own profile"

---

### Create User
```
POST /users
```

**Permissions:** Owner, Admin only

**Request Body:**
```json
{
  "name": "New Agent",
  "email": "agent@joymorocco.com",
  "password": "secure-password",
  "role": "Travel Agent",
  "status": "active",
  "accessibleShopifyStores": ["EN"],
  "permissions": {}
}
```

**Response (201):** Created user object

---

### Update User
```
PATCH /users/{id}
```

**Permissions:** Owner, Admin only

**Request Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "role": "Admin",
  "accessibleShopifyStores": ["EN", "ES"],
  "status": "inactive"
}
```

**Response (200):** Updated user object

---

### Delete User
```
DELETE /users/{id}
```

**Permissions:** Owner, Admin only

**Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

---

## 🏪 Shopify Stores API

### List Stores
```
GET /shopify-stores
```

**Permissions:** **Owner ONLY**

**Response (200):**
```json
[
  {
    "id": "uuid",
    "internalName": "EN",
    "shopifyDomain": "desertexplore.myshopify.com",
    "apiVersion": "2026-01",
    "status": "active",
    "lastSyncedAt": "2026-02-13T10:00:00.000Z",
    "initialSyncCompleted": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

**Note:** `accessToken` and `webhookSecret` are NOT returned for security

---

### Get Store by ID
```
GET /shopify-stores/{id}
```

**Permissions:** Owner only

---

### Create Store
```
POST /shopify-stores
```

**Permissions:** Owner only

**Request Body:**
```json
{
  "internalName": "FR",
  "shopifyDomain": "desertfrance.myshopify.com",
  "accessToken": "shpat_xxxxx",
  "apiVersion": "2026-01",
  "webhookSecret": "secret-key"
}
```

---

### Update Store
```
PATCH /shopify-stores/{id}
```

**Permissions:** Owner only

---

### Delete Store
```
DELETE /shopify-stores/{id}
```

**Permissions:** Owner only

---

### Toggle Store Status
```
POST /shopify-stores/{id}/toggle-status
```

**Permissions:** Owner only

**Response (200):** Updated store with toggled status

---

## 🗺️ Tour Mappings API

### List Tour Mappings
```
GET /tour-mappings
```

**Permissions:** Owner, Admin only

**Response (200):**
```json
[
  {
    "id": "uuid",
    "storeId": "EN",
    "shopifyProductId": "7726370783446",
    "productTitle": "3-Day Marrakech Desert Tour",
    "productSku": null,
    "tourCode": "MARR3D",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

---

### Get Single Mapping
```
GET /tour-mappings/{id}
```

**Permissions:** Owner, Admin only

---

### Create Mapping
```
POST /tour-mappings
```

**Permissions:** Owner, Admin only

**Request Body:**
```json
{
  "storeId": "EN",
  "shopifyProductId": "7726370783446",
  "productTitle": "3-Day Desert Tour",
  "tourCode": "MARR3D"
}
```

---

### Update Mapping
```
PATCH /tour-mappings/{id}
```

**Permissions:** Owner, Admin only

**Request Body:**
```json
{
  "tourCode": "MARR3D"
}
```

---

### Delete Mapping
```
DELETE /tour-mappings/{id}
```

**Permissions:** Owner, Admin only

---

## 🛏️ Room Type Rules API

### List Rules
```
GET /room-type-rules
```

**Permissions:** Owner, Admin only

**Response (200):**
```json
[
  {
    "id": "uuid",
    "paxMin": 1,
    "paxMax": 1,
    "defaultRoomType": "Single",
    "allowedRoomTypes": ["Single"],
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  {
    "id": "uuid",
    "paxMin": 2,
    "paxMax": 2,
    "defaultRoomType": "Double",
    "allowedRoomTypes": ["Double", "Twin"],
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

---

### Create Rule
```
POST /room-type-rules
```

**Permissions:** Owner, Admin only

**Request Body:**
```json
{
  "paxMin": 3,
  "paxMax": 3,
  "defaultRoomType": "Triple",
  "allowedRoomTypes": ["Triple", "Double + Single"],
  "isActive": true
}
```

---

### Update Rule
```
PATCH /room-type-rules/{id}
```

**Permissions:** Owner, Admin only

---

### Delete Rule
```
DELETE /room-type-rules/{id}
```

**Permissions:** Owner, Admin only

---

## 🚗 Transport Types API

### List All Transports
```
GET /transport-types
```

**Permissions:** Any authenticated user

**Response (200):**
```json
[
  {
    "id": "uuid",
    "code": "FCHK",
    "name": "Falah Cool Heat Transport",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  {
    "id": "uuid",
    "code": "MDBM",
    "name": "Med B Med Transport",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  {
    "id": "uuid",
    "code": "TBC",
    "name": "To Be Confirmed",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

---

### List Active Transports Only
```
GET /transport-types/active
```

**Permissions:** Any authenticated user

**Response:** Array of active transport types only

---

### Get Single Transport
```
GET /transport-types/{id}
```

**Permissions:** Any authenticated user

---

### Create Transport
```
POST /transport-types
```

**Permissions:** Owner, Admin only

**Request Body:**
```json
{
  "code": "NEW",
  "name": "New Transport Company",
  "isActive": true
}
```

---

### Update Transport
```
PATCH /transport-types/{id}
```

**Permissions:** Owner, Admin only

**Request Body:**
```json
{
  "name": "Updated Name",
  "isActive": false
}
```

---

### Delete Transport
```
DELETE /transport-types/{id}
```

**Permissions:** Owner, Admin only

---

## 📊 Data Types Reference

### User Roles
```typescript
type UserRole = 
  | 'Owner'       // Full system access
  | 'Admin'       // Full access except store management
  | 'Travel Agent' // Limited to accessible stores
  | 'Driver'      // View assigned orders
  | 'Finance';    // View all orders
```

### Order Status
```typescript
type OrderStatus = 
  | 'New'       // Just created from Shopify
  | 'Updated'   // Modified via webhook
  | 'Validate'  // Manually confirmed
  | 'Completed' // Tour finished
  | 'Canceled'; // Canceled by customer
```

**Status Flow:**
```
New → Updated → Validate → Completed
  ↓
Canceled (can happen at any stage)
```

### Tour Type
```typescript
type TourType = 
  | 'Shared'   // Group tour
  | 'Private'; // Private tour
```

### Payment Status
```typescript
type PaymentStatus = 
  | 'pending'
  | 'deposit_paid'
  | 'partially_paid'
  | 'fully_paid'
  | 'refunded';
```

---

## 🔒 Permissions Matrix

| Endpoint | Owner | Admin | TravelAgent | Driver | Finance |
|----------|-------|-------|-------------|--------|---------|
| **Orders - List** | ✅ All | ✅ All | ✅ Filtered by stores | ❌ | ❌ |
| **Orders - View** | ✅ | ✅ | ✅ If in accessible stores | ❌ | ❌ |
| **Orders - Create** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Orders - Update** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Orders - Delete** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Orders - Add Note** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Orders - History** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Supplements** | ✅ Full | ✅ Full | ✅ Read only | ❌ | ❌ |
| **Users** | ✅ Full | ✅ Full | ✅ Read own | ✅ Read own | ✅ Read own |
| **Shopify Stores** | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| **Tour Mappings** | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| **Room Rules** | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| **Transport Types** | ✅ Full | ✅ Full | ✅ Read only | ✅ Read only | ✅ Read only |

---

## ⚠️ Important Notes

### UUIDs
All IDs are UUIDs (e.g., `97b19e9e-d4db-41c6-97f0-68fa6d872bb4`), NOT integers.

**Wrong:** `/api/orders/1234`  
**Correct:** `/api/orders/97b19e9e-d4db-41c6-97f0-68fa6d872bb4`

### Cookies
Always use `credentials: 'include'` in fetch calls. Cookies are HTTP-only and secure.

### Error Responses
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

Common status codes:
- `400`: Bad Request (validation error)
- `401`: Unauthorized (not logged in or token expired)
- `403`: Forbidden (no permission)
- `404`: Not Found
- `500`: Internal Server Error

### TravelAgent Access Control
TravelAgents can only access orders from stores in their `accessibleShopifyStores` array.

**Example:**
- Agent has `accessibleShopifyStores: ["EN"]`
- Can see EN orders ✅
- Cannot see ES orders ❌
- Will get `403 Forbidden` if trying to access ES order

---

## 🧪 Testing

### Get a Test Token
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@joymorocco.com",
    "password": "your-password"
  }' \
  -c cookies.txt
```

### Use Token in Requests
```bash
curl http://localhost:3001/api/orders \
  -b cookies.txt
```

---

## 📞 Support

For questions or issues with the API, contact the backend team.

**Backend Version:** 1.0  
**Last Updated:** February 2026