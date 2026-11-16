# Security Specification — Arefin's Pen Firestore Rules

## 1. Data Invariants
- **Products (`/products/{productId}`)**: Every product has a validated alphanumeric/hyphen ID, valid category enum, positive price in BDT, bounded strings, bounded color/image arrays, and server-verified timestamps. Only verified admins may create, update, or delete products. Public storefront visitors may read products.
- **Orders (`/orders/{orderId}`)**: Contains customer PII (`phone`, `customerName`, `address`, `userEmail`, optional `academyClass` for Al Amanah Academy). Only verified signed-in users may create orders, and BOTH `userId` MUST equal `request.auth.uid` AND `userEmail` MUST equal `request.auth.token.email`. Serial numbers increment atomically via `/meta/orderCounter` starting from `1` (`#1`, `#2`, `#3`...), verified via `getAfter`. Reads (`get` and `list`) are restricted strictly to the owning user (`existing().userId == request.auth.uid || existing().userEmail == request.auth.token.email`) or verified admins (`isAdmin()` for the Admin Panel). No customer can view or list another customer's order, and `userId`/`userEmail` are immutable once created.
- **Al Amanah Academy Class Validation**: Orders with `city == 'Al Amanah Academy'` must specify `academyClass` in `['5', '6', '7']`.
- **Store Meta (`/meta/{metaId}`)**: Stores global `orderCounter` (`lastOrderNumber`) and `catalogMeta` (`seeded`). Counter increments are restricted to verified signed-in users by `+1` per transaction.

## 2. Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Order Creation**: Signed-out visitor attempts `create` on `/orders/order-1` -> Denied (`isVerified()` false).
2. **Cross-User Order Read (`get`)**: Signed-in User B attempts `get` on `/orders/order-1` owned by User A (different uid & email) -> Denied (`existing().userId == request.auth.uid || existing().userEmail == request.auth.token.email` false).
3. **Cross-User Order Scraping (`list`)**: Signed-in User B queries `collection(db, 'orders')` without scoping to their own `uid` or `email` -> Denied (`allow list` requires `resource.data.userId == request.auth.uid || resource.data.userEmail == request.auth.token.email` or `isAdmin()`).
4. **Order UID or Email Impersonation on Create**: User B attempts `create` on `/orders/order-2` with `userId: "<uidA>"` or `userEmail: "victim@gmail.com"` -> Denied (`incoming().userId == request.auth.uid && incoming().userEmail == request.auth.token.email` false).
5. **Serial Number Forgery / Counter Bypass**: User attempts `create` on `/orders/order-99` (`serialNumber: 99`) without atomically incrementing `/meta/orderCounter` by `+1` -> Denied (`getAfter` invariant fails).
6. **Al Amanah Academy Missing/Invalid Class**: User creates order for `Al Amanah Academy` with `academyClass: "8"` or omitted -> Denied (`academyClass in ['5', '6', '7']` required).
7. **Unauthenticated Product Write**: Anonymous client attempts `create` or `update` on `/products/neucose-b` -> Denied (`isAdmin()` false).
8. **Unverified Admin Email Spoof**: User with `email: "adminarefin808@gmail.com"` and `email_verified: false` attempts admin write -> Denied (`email_verified == true` required).
9. **Shadow Field Injection on Order Create**: Attacker sends `/orders/order-1` with extra field `{ isPaid: true }` -> Denied (`keys().hasOnly(...)` rejects shadow fields).
10. **Order Stage Tampering by Customer**: Customer attempts `create` with `currentStageIndex: 4` or `update` on own order `{ currentStageIndex: 4 }` -> Denied (`currentStageIndex == 1` on create, `isAdmin()` required on update).
11. **Path ID Poisoning**: Attacker sends 500-character document ID on `/orders/<500chars>` -> Denied (`isValidId` max 128 chars & regex).
12. **Backdated Timestamp Spoofing / Immutable Mutation**: Any write with `createdAt != request.time` or modifying `userId` / `userEmail` / `serialNumber` / `orderId` -> Denied.
