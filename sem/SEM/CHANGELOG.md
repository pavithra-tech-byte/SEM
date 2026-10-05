# 🛡️ SEM SYSTEM EVOLUTION LOG (CHANGELOG)

This file tracks all critical architectural changes, bug fixes, and feature implementations to ensure transparency and provide a revert-path for system stability.

## [2026-09-06] - Session: Expanded Poster Lightbox & Unified Media Normalization

### 🐞 CRITICAL BUG FIX
- **Expanded Poster Black Screen Resolved**:
  - **Root Cause**: `ZoomImage` in `EventDetailsModal.jsx` previously only checked legacy single-value fields (`posterUrl` and `posterBlob`). Events synchronized via Supabase/Firebase or multi-poster events store links in `posterUrls: string[]`. As a result, `ZoomImage` received `null`, causing the lightbox to render completely black with only the close button.
  - **Fix**: Implemented `useEventPosters(event)` and `extractEventImages(event)` in `src/utils.js` to comprehensively parse `posterUrls`, `posterBlobs`, `posterUrl`, `posterBlob`, and snake_case fallbacks (`poster_urls`, `poster_url`).
  - **Event Propagation**: Added `e.stopPropagation()` to carousel previous/next buttons to prevent accidental zoom modal activation when simply switching preview slides.
  - **Placeholder Guard**: Disabled zoom triggers and hover overlay when an event has no poster (`images.length === 0`).
- **Dashboard Upcoming Count Synchronization**:
  - **Root Cause**: `Dashboard.jsx` used a disparate date check relying on `endDate` and `!referenceDate` fallbacks along with a fallback `|| 8`, while `EventList.jsx` filtered upcoming events based on future deadline/start dates (`deadline > now || start > now`). This caused Dashboard to report 38 upcoming events while EventList accurately reported 37 signals.
  - **Fix**: Centralized date range filtering into `matchesDateRange(event, rangeKey, now)` in `src/utils.js`. Both `Dashboard.jsx` and `EventList.jsx` now share the identical calculation, guaranteeing 100% synchronization across cards, stats, and filtered signal views.
- **Security Hardening & Scanner False-Positive Mitigation**:
  - Added `Permissions-Policy` header restricting camera, microphone, geolocation, and payment to enhance client-side protection.
  - Added `X-Permitted-Cross-Domain-Policies: none`.
  - Expanded `Content-Security-Policy` with `https://*.supabase.co` in `connect-src` and `img-src`.
  - Refined SPA rewrite in `vercel.json` (`/((?!.*\\.).*)`) to exclude dotfiles and static assets, ensuring automated scanners requesting fake files (`/.env`, `/.git`) receive an authentic 404 instead of a misleading 200 SPA shell.
  - Added `public/robots.txt` with appropriate crawler boundaries.

### 🚀 LIGHTBOX & VIEWER UPGRADE (`PosterLightbox`)
- **Multi-Poster Navigation**: Full support for browsing through multiple event posters directly within the expanded lightbox (floating arrows, bottom dots, and keyboard navigation via `ArrowLeft` / `ArrowRight`).
- **Interactive Inspection (Zoom & Pan)**: Added Zoom In (`+`), Zoom Out (`-`), and Reset (`0` / button), double-click to toggle 1x / 2x zoom, and fluid click-and-drag panning when zoomed in.
- **Action Toolbar**: High-resolution "Download Poster" action and "Open in New Tab" direct link.
- **Resilient States**: Added loading spinner (`Loader2`) and an error fallback card with a direct link button if an image fails to load.
- **Reference Documentation**: Added `docs/POSTER_SYSTEM_GUIDE.md` detailing the entire schema, URL resolution, and lifecycle guidelines for future upgrades.

## [2026-03-26] - Session: Team Induction & Infrastructure Reinforcement

### ⚙️ CORE ARCHITECTURE
- **Global Layout Correction**: Removed the `AdminPanel` from the global `App.jsx` layout. It was inadvertently rendering "Access Denied" for non-admins on every page. Now isolated to `/admin` route.
- **Routing Stability**: Refactored `RoutesWrapper` in `App.jsx` to ensure `/invite/:teamId` is accessible regardless of authentication state.

### 🚀 FEATURES
- **Poster URL Support**: Added `Neural Link 0 (Poster URL)` to `AddEventModal` and `EditEventModal`.
-   **FCM Notifications:** Firebase Cloud Messaging structure is integrated, awaiting VAPID key and Sender ID configuration in the Firebase Console.
-   **Team Induction Flow:** Implemented a persistent `sessionStorage` based redirect in `JoinTeam.jsx` and `Login.jsx`, ensuring users who sign in after clicking an invite link are automatically returned to the induction process.
-   **UI Integrity:** Stabilized `JoinTeam.jsx` after component corruption, restoring full induction functionality and seat-limit monitoring (Max 10 per team).
- **Real-time Sync**: Enhanced `App.jsx` with a dual-channel sync for Global Events and Team-specific performance data.

### 🐞 BUG FIXES
- **Team Join Resolution**: Redesigned `JoinTeam.jsx` to handle both direct UIDs and alphanumeric invite codes with a 10-member limit check.
- **Admin Lockout**: Ensured only the master admin (`jagadish2k2006@gmail.com`) can retain/assign the 'admin' role.

### ⚠️ PENDING CONTEXT (ACTION REQUIRED)
- **FCM Configuration**: The Service Worker and `getToken` call currently use placeholders for `messagingSenderId` and `vapidKey`. These must be provided via the Firebase Console for production notifications to function.
- **Performance Optimization**: Investigating lag reports in the Dashboard component.

---
*End of current session entry.*
