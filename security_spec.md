# Security Specification — Van Gogh CryptoCats Gallery

## 1. Data Invariants
1. A `UserPublicProfile` at `/users/{userId}` can only be created or updated by `request.auth.uid == userId` with a verified email (`request.auth.token.email_verified == true`), and `data.uid` must equal `userId`.
2. Private PII (`email`) is strictly isolated in `/users/{userId}/private/account` (`allow get, create, update` only for owner `request.auth.uid == userId`, `allow list: if false`).
3. Every `UserCatProfile` at `/users/{userId}/cats/{catId}` and `UserArtworkMeta` at `/users/{userId}/artworks/{artworkId}` MUST reference an existing parent `/users/{userId}` document (`exists(...)` on create) and enforce `ownerUid == request.auth.uid == userId`.
4. All path IDs (`userId`, `docId`, `catId`, `artworkId`) MUST satisfy `^[a-zA-Z0-9_-]+$` and length `<= 128`.
5. All `createdAt` and `updatedAt` timestamps MUST equal `request.time`; `createdAt`, `uid`, `ownerUid`, and `id` are immutable on update.
6. Image previews stored in Firestore (`imagePreviewUrl`) are strictly bounded (`<= 500000` chars) so documents never approach the 1MB Firestore limit.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Write**: `create /users/u1` with `request.auth == null`.
2. **Unverified Email**: `create /users/u1` with `request.auth.token.email_verified == false`.
3. **UID Spoofing**: `create /users/u1` as `u2` or with `data.uid = "u2"`.
4. **Shadow Ghost Field**: `create /users/u1` including `isAdmin: true` or `role: "superuser"`.
5. **PII Leak via Read**: `get /users/u1/private/account` as `u2`.
6. **PII List Scrape**: `list /users/u1/private` as `u1` or `u2`.
7. **ID Poisoning**: `create /users/u1/artworks/bad$id..1500chars` with invalid characters or length > 128.
8. **Orphaned Artwork Write**: `create /users/u1/artworks/art1` when `/users/u1` parent doc does not exist.
9. **Client Timestamp Forgery**: `create /users/u1/artworks/art1` with `createdAt = "2020-01-01T00:00:00Z"` instead of `request.time`.
10. **Immutable Owner Hijack**: `update /users/u1/artworks/art1` changing `ownerUid` or `createdAt`.
11. **Value Poisoning / Oversize String**: `update /users/u1/artworks/art1` setting `title` to a 5KB string or `imagePreviewUrl` > 500,000 chars.
12. **Cross-Tenant List Query**: `list /users/u1/artworks` as `u2` without matching `ownerUid == request.auth.uid`.
