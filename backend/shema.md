## Joy Morocco Backend – Frontend Schema

This document describes the backend from a **frontend point of view**: how to authenticate, what the main entities look like, and which HTTP endpoints you can call.

---

## 1. Overview

- **Base URL**: will depend on environment, e.g. `https://api.joy-morocco.com`  
  In this document we’ll call it **`BASE_URL`**.
- **Stack**: NestJS 11, PostgreSQL via TypeORM, scheduled jobs, Shopify integration.
- **Auth**: Cookie-based JWT (HTTP-only cookies, no tokens in localStorage).
- **Main concepts**:
  - **Users** – with roles (Owner, Admin, Travel Agent, Driver, Finance).
  - **Shopify stores** – language/market specific (EN, ES, etc.).
  - **Orders** – imported/updated from Shopify and then managed internally.

---

## 2. Authentication & Session Handling

The frontend never handles raw tokens directly. Instead, the backend sets **HTTP-only cookies**:

- `access_token` – short-lived (≈15 minutes).
- `refresh_token` – long-lived (≈7 days).

Your HTTP client **must** send cookies, e.g. `fetch(..., { credentials: 'include' })`.

### 2.1 Login

- **URL**: `POST {BASE_URL}/auth/login`
- **Body**:

```json
{
  "email": "agent@example.com",
  "password": "plain-text-password"
}
```

- **Success (200)**:
  - Sets cookies:
    - `access_token` (HTTP-only)
    - `refresh_token` (HTTP-only)
  - **Response body**:

```json
{
  "user": {
    "id": "uuid",
    "name": "Agent Name",
    "email": "agent@example.com",
    "role": "Owner | Admin | Travel Agent | Driver | Finance",
    "status": "active | inactive",
    "accessibleShopifyStores": ["EN", "ES"],
    "permissions": {}
  }
}
```

Use this user object to initialize your app state.

### 2.2 Refresh Token

Used when the `access_token` has expired.

- **URL**: `POST {BASE_URL}/auth/refresh`
- **Auth**: Uses `refresh_token` cookie.
- **Body**: _empty_
- **Success (200)**:
  - Rotates (replaces) **both** cookies:
    - `access_token`
    - `refresh_token`
  - **Response**:

```json
{ "success": true }
```

**Frontend flow suggestion**:

1. A request to a protected endpoint returns `401`.
2. Call `POST /auth/refresh`.
3. If that succeeds, retry the original request.
4. If it fails with `401`, redirect the user to the login page.

### 2.3 Logout

- **URL**: `POST {BASE_URL}/auth/logout`
- **Auth**: Requires valid `access_token` cookie.
- **Body**: _empty_
- **Success (200)**:

```json
{ "success": true }
```

Server also invalidates the user’s stored refresh token.

### 2.4 Get Current User

There are **two** similar “me” endpoints; you can choose one consistent place to read from:

- **Preferred for auth bootstrap**:
  - `GET {BASE_URL}/auth/me`
- **Alternative (user module)**:
  - `GET {BASE_URL}/users/me`

Both require a valid `access_token` cookie and return the current user info.

---

## 3. User Model & API

### 3.1 User JSON Shape

Approximate shape of a user returned by the API:

```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "role": "Owner | Admin | Travel Agent | Driver | Finance",
  "status": "active | inactive",
  "accessibleShopifyStores": ["EN", "ES"],
  "permissions": {
    "any": "json"
  },
  "createdAt": "ISO timestamp"
}
```

Notes:

- `role` controls high-level access (admin vs travel agent vs driver, etc.).
- `accessibleShopifyStores` is a list of internal store codes the user can see (e.g. `["EN","ES"]`).
- `permissions` is a flexible JSON object for finer-grained UI feature toggles.

### 3.2 Permissions by Role (High Level)

- **Owner, Admin**:
  - Full access to user management (create, update, delete).
  - Full access to orders and stores.
- **Travel Agent**:
  - Read access to orders, limited to their allowed stores.
  - Likely no access to user management (except own profile).
- **Driver, Finance**:
  - May have more specialized access (not fully enforced at controller level, but you can use `permissions` and `role` to drive UI).

### 3.3 User Endpoints

All user endpoints require a valid `access_token` cookie.

- **Create user**
  - **URL**: `POST {BASE_URL}/users`
  - **Roles allowed**: Owner, Admin
  - **Body** (`CreateUserDto`, simplified guess):

```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "Owner | Admin | Travel Agent | Driver | Finance",
  "status": "active | inactive",
  "accessibleShopifyStores": ["EN"],
  "permissions": {}
}
```

- **List users**
  - **URL**: `GET {BASE_URL}/users`
  - **Roles**: Owner, Admin
  - **Response**: `User[]`

- **Get own profile**
  - **URL**: `GET {BASE_URL}/users/me`
  - **Roles**: any authenticated user

- **Get user by id**
  - **URL**: `GET {BASE_URL}/users/{id}`
  - **Roles**:
    - Owner/Admin: can view any user.
    - Other roles: can only view their own `id` (otherwise 403).

- **Update user**
  - **URL**: `PATCH {BASE_URL}/users/{id}`
  - **Roles**: Owner, Admin
  - **Body** (`UpdateUserDto`): any subset of user fields (except password hash, which is internal).

- **Delete user**
  - **URL**: `DELETE {BASE_URL}/users/{id}`
  - **Roles**: Owner, Admin

---

## 4. Shopify Stores

### 4.1 Store JSON Shape

```json
{
  "id": "uuid",
  "internalName": "EN",
  "shopifyDomain": "desertexplore.myshopify.com",
  "accessToken": "string",
  "apiVersion": "2026-01",
  "status": "active | inactive",
  "webhookSecret": "string | null",
  "lastSyncedAt": "ISO timestamp | null",
  "lastOrderFetchedAt": "ISO timestamp | null",
  "initialSyncCompleted": true,
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

**Frontend notes**:

- Treat `accessToken` and `webhookSecret` as **sensitive**; do not display them in plain text for non-admins.
- `internalName` is what other parts of the system use (e.g. `storeId` on orders), so prefer that in filters.

### 4.2 Store Endpoints

All endpoints below require `access_token` cookie.

- **List stores**
  - **URL**: `GET {BASE_URL}/shopify-stores`
  - **Roles**: Owner, Admin, TravelAgent
  - **Use in UI**:
    - Store selector for orders filters.
    - Display store status, sync status.

- **Create store**
  - **URL**: `POST {BASE_URL}/shopify-stores`
  - **Roles**: Owner, Admin
  - **Body** (`CreateShopifyStoreDto`, approximate):

```json
{
  "internalName": "EN",
  "shopifyDomain": "desertexplore.myshopify.com",
  "accessToken": "string",
  "apiVersion": "2026-01",
  "status": "active",
  "webhookSecret": "string"
}
```

- **Get store**
  - **URL**: `GET {BASE_URL}/shopify-stores/{id}`
  - **Roles**: Owner, Admin

- **Update store**
  - **URL**: `PATCH {BASE_URL}/shopify-stores/{id}`
  - **Roles**: Owner, Admin

- **Delete store**
  - **URL**: `DELETE {BASE_URL}/shopify-stores/{id}`
  - **Roles**: Owner, Admin

- **Toggle active/inactive**
  - **URL**: `POST {BASE_URL}/shopify-stores/{id}/toggle-status`
  - **Roles**: Owner, Admin
  - **Use in UI**:
    - A switch or button to activate/deactivate a store.

---

## 5. Orders

Orders correspond to **Shopify line items**, enriched with travel/tour logic and internal fields.

### 5.1 Order JSON Shape (Important Fields)

```json
{
  "id": "uuid",

  "shopifyOrderId": "string",
  "shopifyOrderNumber": "string",
  "shopifyLineItemId": "string",
  "lineItemIndex": 0,
  "storeId": "EN",
  "shopifyCreatedAt": "2026-02-16T10:00:00.000Z",

  "customerName": "string",
  "customerEmail": "string",
  "customerPhone": "string | null",

  "tourDate": "2026-02-20",
  "tourHour": "16:00",
  "pax": 2,
  "tourCode": "string | null",
  "tourTitle": "3 Days Desert Tour",
  "tourType": "Shared | Private | null",
  "campType": "string | null",
  "roomType": "string | null",
  "pickupLocation": "string | null",
  "accommodationName": "string | null",

  "status": "New | Updated | Validate | Completed | Canceled",

  "lineItemPrice": "199.00",
  "lineItemDiscount": "0.00",
  "shopifyTotalAmount": "398.00",
  "originalTotalAmount": "398.00",
  "depositAmount": "398.00",
  "balanceAmount": "0.00",
  "currency": "EUR",

  "paymentStatus": "pending | deposit_paid | partially_paid | fully_paid | refunded",
  "financialStatus": "pending | authorized | partially_paid | paid | partially_refunded | refunded | voided | null",

  "transport": "4x4",
  "note": "Customer notes here",

  "driverId": "uuid | null",
  "driverNotes": "string | null",
  "assignedAt": "ISO timestamp | null",

  "lineItemProperties": {
    "raw": "Original text from Shopify line item properties"
  },
  "shopifyMetadata": {
    "productType": "string",
    "fullShopifyOrder": {}
  },
  "tags": ["VIP", "Online"],

  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp",
  "confirmedAt": "ISO timestamp | null",
  "canceledAt": "ISO timestamp | null"
}
```

**Important frontend considerations**:

- Monetary fields (`lineItemPrice`, etc.) are decimals in Postgres and may arrive as strings. Handle as strings or convert to numbers carefully.
- `tourDate` is a **date-only** field (`YYYY-MM-DD`).
- `tourHour` is a simple `HH:MM` string.
- `status` drives much of the workflow UI (new incoming orders vs validated vs completed vs canceled).

### 5.2 Order Filtering & Pagination

Orders are fetched from `GET /orders` with various query parameters.

From the controller and DTOs, you can use:

- **Pagination**:
  - `page`: number (default `1`).
  - `pageSize` or `limit`: number (common defaults `10` or `50`).
- **Sorting** (depending on service implementation):
  - `sortBy`: column name (e.g. `createdAt`, `tourDate`).
  - `sortOrder`: `"ASC"` or `"DESC"`.
- **Filters**:
  - `status`: `New | Updated | Validate | Completed | Canceled`.
  - `customerName`: substring search.
  - `dateFrom`, `dateTo`: ISO date strings (e.g. `2026-02-01`).
  - `storeId`: internal store code, e.g. `EN`, `ES`.
  - `tourType`: `Shared` or `Private`.
  - `transport`: string.
  - In controller there are also:
    - `shopifyOrderId`
    - `startDate`, `endDate` – these map similarly to date range filters.

The exact response format for list may look like:

```json
{
  "items": [/* Order[] */],
  "total": 123,
  "page": 1,
  "pageSize": 50
}
```

(Exact structure depends on `OrdersService.findAll`, but this is a typical pattern.)

### 5.3 Order Endpoints

All order endpoints require an `access_token` cookie.

- **Create order**
  - **URL**: `POST {BASE_URL}/orders`
  - **Roles**: Owner, Admin
  - **Body**: `CreateOrderDto` (mirrors many of the fields above).
  - **Typical use**: internal/admin UI only (automatic creation usually happens via Shopify webhooks and sync).

- **List orders**
  - **URL**: `GET {BASE_URL}/orders`
  - **Roles**: Owner, Admin, TravelAgent
  - **Query params**:
    - `page`
    - `pageSize` / `limit`
    - `storeId`
    - `status`
    - `shopifyOrderId`
    - `tourType`
    - `transport`
    - `startDate` / `endDate` or `dateFrom` / `dateTo`

- **Get order by id**
  - **URL**: `GET {BASE_URL}/orders/{id}`
  - **Roles**: Owner, Admin, TravelAgent
  - **Use in UI**:
    - Detailed order view page.

- **Update order**
  - **URL**: `PATCH {BASE_URL}/orders/{id}`
  - **Roles**: Owner, Admin
  - **Body**: `UpdateOrderDto` – typical fields you might update:
    - `status`
    - `tourDate`, `tourHour`
    - `transport`, `pickupLocation`, `accommodationName`
    - `driverId`, `driverNotes`, `assignedAt`
    - `note`

- **Delete order**
  - **URL**: `DELETE {BASE_URL}/orders/{id}`
  - **Roles**: Owner, Admin

---

## 6. Typical Frontend Flows

### 6.1 App Initialization

1. On app load, call `GET /auth/me` (or `/users/me`) with credentials included.
2. If `200`:
   - Store the `user` in global state (role, stores, permissions).
   - Render main app.
3. If `401`:
   - Optionally try `POST /auth/refresh` then retry `GET /auth/me`.
   - If still unauthorized, redirect to login.

### 6.2 Login Flow

1. User submits email/password.
2. Call `POST /auth/login`.
3. On success:
   - Cookies are set by the backend.
   - Store returned `user` data in state.
   - Navigate to the main dashboard (e.g. orders list).

### 6.3 Orders List Page

1. Read current filters and pagination from UI (store, status, date range, page).
2. Call `GET /orders` with appropriate query params.
3. Display:
   - Table with important columns: `tourDate`, `tourHour`, `tourTitle`, `pax`, `customerName`, `status`, `storeId`, `transport`, `driver`.
   - Pagination controls using `total`, `page`, `pageSize`.
4. When user changes filters or page, refetch.

### 6.4 Order Details Page

1. When user clicks an order row, navigate to `/orders/{id}` in your frontend.
2. Call `GET /orders/{id}`.
3. Show:
   - Core info: tour date/time, pax, tour title/type, transport, camp/room.
   - Customer info: name, email, phone.
   - Financial info: prices, currency, payment status.
   - Internal info: driver, driver notes, tags, notes, Shopify metadata (optionally).

### 6.5 Store Management (Admin/Owner Only)

1. Admin views list from `GET /shopify-stores`.
2. Can:
   - Toggle status using `POST /shopify-stores/{id}/toggle-status`.
   - Edit details with `PATCH /shopify-stores/{id}`.
   - Add new stores using `POST /shopify-stores`.

---

## 7. Implementation Tips for Frontend

- **HTTP client**:
  - Always configure `withCredentials: true` (Axios) or `credentials: 'include'` (fetch).
  - Centralize error handling for `401` to attempt refresh then redirect.

- **Role-based UI**:
  - Use `user.role` and `user.permissions` to decide:
    - Which menu entries to show (e.g. “Users”, “Stores” only for Owner/Admin).
    - Whether to enable destructive actions (delete, status changes, etc.).

- **Store restrictions**:
  - Respect `user.accessibleShopifyStores` to filter which stores appear in dropdowns.
  - For a global admin view, you can show all from `/shopify-stores`.

- **Date/time handling**:
  - Treat backend `tourDate` as a plain date; do not assume local timezone conversions.
  - `tourHour` is just `HH:MM`; use a time picker and send string values.

If you need more detail for a specific screen (e.g. driver dashboard, finance reports, webhook logs), we can extend this schema with that focus.


