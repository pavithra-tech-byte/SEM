# 🖼️ SEM Poster System Architecture & Upgrade Guide

## 1. Executive Summary & Context

Event posters are essential informational assets for college competitions, hackathons, and technical symposiums. They typically convey critical details including rules, schedules, prize pools, eligibility criteria, and payment QR codes.

In previous iterations of SEM:
- Posters were stored as single scalar properties: `posterUrl` (string) and `posterBlob` (Blob).
- To support multi-page posters and brochures, the data model evolved to arrays: `posterUrls` and `posterBlobs`.
- However, the expanded lightbox component (`ZoomImage`) in `EventDetailsModal.jsx` had only checked the legacy fields (`posterUrl` and `posterBlob`). When events synced from the database (such as Supabase or Firebase) provided `posterUrls` without `posterUrl`, the expanded view failed, rendering a completely black screen.

This document details the unified poster system, its data flow, lifecycle management, and architectural standards for future upgrades.

---

## 2. Data Schema & Normalization

SEM supports various poster formats to maintain full backward and cross-database compatibility:

| Field Name | Type | Description | Source |
| :--- | :--- | :--- | :--- |
| `posterUrls` | `string[]` | Primary array of remote image URLs | User input, Supabase `poster_urls`, Firebase |
| `posterBlobs` | `(Blob \| string)[]` | Array of local binary blobs / files | File input picker before cloud sync |
| `posterUrl` | `string` | Single URL string (legacy fallback) | Older event records, single URL inputs |
| `posterBlob` | `Blob \| string` | Single binary blob (legacy fallback) | Older drafts or single file uploads |
| `poster_urls` / `poster_url` | `string[] \| string` | Snake_case database row fallback | Raw Supabase responses prior to camelCase mapping |

### Normalization Logic (`extractEventImages`)
Located in [src/utils.js](file:///d:/documents/SEM/src/utils.js), `extractEventImages(event)`:
1. Inspects `posterBlobs`, `posterBlob`, `posterUrls`, `posterUrl`, and snake_case aliases.
2. Trims whitespace and removes empty/falsy values.
3. Automatically resolves Google Drive sharing links (`drive.google.com/file/d/ID`, `/d/ID`, `?id=ID`) into direct CDN image URLs (`https://lh3.googleusercontent.com/d/ID`).
4. Deduplicates identical URLs using a `Set`.
5. Returns an array of valid `Blob` instances and clean URL strings.

---

## 3. React Lifecycle & Memory Management (`useEventPosters`)

Creating `URL.createObjectURL(blob)` without proper cleanup causes continuous memory leaks in single-page applications.

### Hook: `useEventPosters(event)`
- Found in [src/utils.js](file:///d:/documents/SEM/src/utils.js).
- For each `Blob` item, creates a browser object URL (`URL.createObjectURL(blob)`).
- Remote URL strings are preserved as-is.
- **Cleanup Guarantee**: On component unmount or when `event` changes, all created object URLs are systematically revoked using `URL.revokeObjectURL(url)`.
- Dependency tracking tracks `event.id`, `event.serverId`, and serialized URLs to avoid unnecessary re-allocations.

```javascript
import { useEventPosters } from '../utils';

const MyComponent = ({ event }) => {
    const images = useEventPosters(event);
    // images is string[] (resolved URLs and active Object URLs)
};
```

---

## 4. UI Components

### 1. `PostersCarousel` (Modal Card Preview)
- Located in [src/components/EventDetailsModal.jsx](file:///d:/documents/SEM/src/components/EventDetailsModal.jsx).
- Displays the active poster preview.
- Includes navigation arrows and indicator pills when `images.length > 1`.
- **Event Propagation**: All navigation button clicks call `e.stopPropagation()` to prevent accidentally launching the full-screen zoom modal while simply browsing preview slides.
- When `images.length === 0`, renders a clean "No Information Poster" state and disables zoom click triggers.

### 2. `PosterLightbox` (Expanded Full-Screen Lightbox)
- Built with **Framer Motion** for silky smooth transitions.
- **Synchronized State**: Opens precisely at `activePosterIndex` from the preview carousel.
- **Multi-Poster Navigation**:
  - Floating previous/next arrows (`ChevronLeft`, `ChevronRight`).
  - Slide counter (`Poster 2 of 3`).
  - Bottom dot navigation.
  - Keyboard shortcuts: `ArrowLeft` (previous) and `ArrowRight` (next).
- **Interactive Inspection (Zoom & Pan)**:
  - Zoom controls: `+` (Zoom In), `-` (Zoom Out), `0` (Reset / Fit to screen).
  - Double-click image to toggle between 1x and 2x zoom.
  - Smooth pan/drag when zoomed (`isDragging` state with `grab`/`grabbing` cursor).
- **Actions Toolbar**:
  - **Download High-Res Poster**: Directly triggers a browser file download with a sanitized event filename (e.g. `CHEMOVISTA_poster_1.jpg`), with a fallback for CORS restrictions.
  - **Open Original in New Tab**: Direct link to the raw CDN/Drive asset.
  - **Close Lightbox**: `X` button, `Escape` key, or backdrop click.
- **Loading & Error States**:
  - Subtle animated spinner (`Loader2`) while the high-resolution asset loads.
  - Clear error fallback card with an "Open Directly" button if an image fails to load.

### 3. `PosterImage` (Event Cards)
- Located in [src/components/EventCard.jsx](file:///d:/documents/SEM/src/components/EventCard.jsx).
- Uses `useEventPosters(event)` for unified handling across dashboard, search, discovery, and event list grids.

---

## 5. Guidelines for Future Upgrades

When adding new media features (e.g., PDF brochures, Cloudinary / S3 uploads, image compression):

1. **Always use `useEventPosters(event)`**:
   Avoid writing custom `event.posterUrl || event.posterUrls[0]` checks in UI components. Always consume the hook to ensure consistent array handling and blob memory cleanup.
2. **Database Migrations / Schema Updates**:
   When writing database queries or Firestore/Supabase synchronization routines, always serialize `posterUrls` as an array of strings. If a single string is encountered, wrap it: `Array.isArray(urls) ? urls : (urls ? [urls] : [])`.
3. **Google Drive Link Considerations**:
   Google Drive files must have link sharing set to **"Anyone with the link can view"**. Files with restricted college workspace domain permissions cannot be previewed by external users via `lh3.googleusercontent.com`.
4. **Direct Cloud Storage Uploads**:
   When upgrading to Supabase Storage or Firebase Storage bucket uploads:
   - Convert user-selected files to compressed WebP before uploading.
   - Store the public bucket URL in `posterUrls`.
   - Clear `posterBlobs` once upload completes to minimize IndexedDB storage footprint.
