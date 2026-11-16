# Security Specification — Arefin's Pen Firestore Rules

## 1. Data Invariants
- **Products (`/products/{productId}`)**: Every product has a validated alphanumeric/hyphen ID, valid category enum, positive price in BDT, bounded strings, bounded color/image arrays, and server-verified timestamps. Only verified admins may create, update, or delete products. Public storefront visitors may read products.
- **Orders (`/orders/{orderId}`)**: Contains customer PII (`phone`, `customerName`, `address`). List/get/update/delete access is restricted strictly to verified admins. Customer order creation validates all required fields, enforces `paymentMethod == 'cod'`, locks initial `currentStageIndex == 1`, and rejects extra shadow fields via `hasOnly()`.
- **Order Tracking (`/orderTracking/{trackingKey}`)**: Keyed by `<serialNumber>_<phoneSuffix>` without exposing street address or full phone number. Only single-document `get` is allowed (`allow list: if false` prevents scraping).
- **Store Meta (`/meta/{metaId}`)**: Stores `orderCounter` (`lastOrderNumber`) and `catalogMeta` (`seeded`).

## 2. Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Product Creation**: Anonymous client attempts `create` on `/products/fake-pen` -> Denied (`isAdmin()` false).
2. **Unauthenticated Product Out-of-Stock Update**: Anonymous client attempts `update` on `/products/neucose-b` `{ inStock: false }` -> Denied (`isAdmin()` false).
3. **Unverified Admin Email Spoof**: User with `email: "adminarefin808@gmail.com"` and `email_verified: false` attempts product write -> Denied (`email_verified == true` required).
4. **Shadow Field Injection on Order Create**: Attacker sends `/orders/order-99` with extra field `{ isPaid: true }` -> Denied (`keys().hasOnly(...)` rejects shadow fields).
5. **Order Stage Tampering on Create**: Attacker creates `/orders/order-99` with `currentStageIndex: 4` (Delivered) -> Denied (`incoming().currentStageIndex == 1` enforced on create).
6. **PII Order List Scraping**: Non-admin user attempts `list` on `/orders` -> Denied (`allow list: if isAdmin()`).
7. **Single Order PII Read by Non-Admin**: Non-admin user attempts `get` on `/orders/order-1` -> Denied (`allow get: if isAdmin()`).
8. **Order Tracking Collection Scraping**: Attacker attempts `list` on `/orderTracking` -> Denied (`allow list: if false`).
9. **Path ID Poisoning**: Attacker sends 500-character document ID on `/products/<500chars>` -> Denied (`isValidId` max 128 chars & regex).
10. **Denial-of-Wallet String Overflow**: Payload with 10,000-character `shortDescription` or `address` -> Denied (`.size()` limits).
11. **Backdated Timestamp Spoofing**: Admin or client attempts write with spoofed `createdAt` or `updatedAt != request.time` -> Denied (`request.time` enforced).
12. **Immutable Field Modification**: Admin attempts to overwrite `createdAt` or `id` on an existing product or `serialNumber` on an existing order -> Denied.
