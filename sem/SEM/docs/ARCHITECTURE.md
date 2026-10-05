# 🏗️ Event Manager - Architecture Documentation

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface (React)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │ Events   │  │ Calendar │  │Analytics │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  State Management (Zustand)                  │
│  • Theme • Filters • Sorting • Modals • Preferences         │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Status Engine│  │Priority Score│  │ Notifications│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  Data Access Layer (Dexie)                   │
│  • CRUD Operations • Bulk Import • Search • Filters         │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                 IndexedDB (Browser Storage)                  │
│  • Events • Colleges • Notes • Settings                     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  Service Worker (Workbox)                    │
│  • Offline Caching • Asset Management • Background Sync     │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Database Layer (`src/db.js`)

**Purpose**: Offline-first data persistence using IndexedDB

**Key Features**:
- Event CRUD operations
- Auto-status calculation
- Priority scoring algorithm
- Bulk import/export
- Search and filtering

**Schema**:
```javascript
events: {
  id: auto-increment,
  collegeName, eventName, eventType,
  dates: { registrationDeadline, startDate, endDate },
  financial: { prizeAmount, registrationFee },
  location: { location, isOnline, accommodation },
  metadata: { status, priorityScore, createdAt, updatedAt }
}
```

### 2. State Management (`src/store.js`)

**Purpose**: Global application state using Zustand

**State Slices**:
- UI State (theme, view mode, modals)
- Filters (status, type, search, date range)
- Sorting (field, order)
- User Preferences (notifications, reminders)
- Sync Status

**Persistence**: LocalStorage for theme and preferences

### 3. Intelligent Engines

#### Auto Status Engine
```javascript
calculateStatus(deadline, startDate, endDate) {
  if (today > endDate) return 'Completed'
  if (today >= startDate) return 'Attended'
  if (today > deadline) return 'Closed'
  if (today === deadline) return 'Deadline Today'
  return 'Open'
}
```

#### Priority Scoring (0-100)
```javascript
score = 
  prizeToFeeRatio(30) +
  eventTypePriority(20) +
  daysRemaining(25) +
  eventMode(15) +
  prizeBonus(10)
```

### 4. CSV Import/Export (`src/csvUtils.js`)

**Features**:
- Auto-column mapping with fuzzy matching
- Date parsing (multiple formats)
- Type conversion (numbers, booleans)
- Bulk database insertion
- Export with custom formatting

**Column Mapping**:
```javascript
{
  'college name' → collegeName,
  'event' → eventName,
  'deadline' → registrationDeadline,
  // ... 15+ column variations
}
```

### 5. Notification System (`src/notifications.js`)

**Capabilities**:
- Web Notifications API
- Offline-capable reminders
- Configurable reminder intervals
- Deadline and event alerts
- Background notification checks

**Flow**:
```
User enables notifications
  → Request permission
  → Schedule reminders based on preferences
  → Check hourly for due notifications
  → Show native browser notifications
```

---

## Data Flow

### Adding an Event

```
User fills form
  → Validate input
  → Create event object
  → Calculate status (auto)
  → Calculate priority score (auto)
  → Insert into IndexedDB
  → Update UI (reactive)
  → Schedule notifications
```

### CSV Import

```
User selects CSV file
  → Parse with PapaParse
  → Auto-detect column mapping
  → Transform rows to event objects
  → Validate data
  → Bulk insert to IndexedDB
  → Show success/error feedback
```

### Filtering Events

```
User changes filter
  → Update Zustand state
  → Trigger component re-render
  → Query IndexedDB with filters
  → Sort by selected field
  → Display filtered results
```

---

## Offline-First Strategy

### Service Worker Caching

**Static Assets**:
- HTML, CSS, JS files
- Fonts, icons
- App shell

**Runtime Caching**:
- Google Fonts
- External images (posters)

**Cache Strategy**: Cache-First with Network Fallback

### IndexedDB Persistence

- All events stored locally
- No network required for CRUD
- Instant read/write operations
- Survives browser refresh

### Sync Strategy (Active)

```
Local DB (Primary)
  ↕ (Real-time Sync)
Firebase Firestore (Cloud Backup & Team Share)
```

**Implementation**:
- **Auth**: Firebase Authentication (Email/Password)
- **Database**: Cloud Firestore
- **Real-time**: Snapshot listeners for instant UI updates across devices
- **Offline**: IndexedDB stores data, syncing to Firestore when online


---

## Performance Optimizations

### 1. React Optimizations
- `useMemo` for expensive calculations
- `useLiveQuery` for reactive IndexedDB
- Lazy loading of routes
- Code splitting

### 2. Database Optimizations
- Indexed fields (status, eventType, dates)
- Batch operations for bulk import
- Efficient queries with Dexie

### 3. UI Optimizations
- Skeleton loaders
- Debounced search
- Virtual scrolling (future)
- Optimistic UI updates

---

## Security Considerations

### Data Privacy
- **Local-only storage** (no cloud by default)
- **No user tracking**
- **No external analytics**

### Input Validation
- Required field checks
- Date validation
- Number parsing
- XSS prevention (React auto-escapes)

### Access Control (Future)
- Email whitelist
- Passcode protection
- Team member management

---

## Scalability

### Current Limits
- **Events**: ~10,000 (IndexedDB limit: 50MB+)
- **Team Size**: 5 members
- **Offline Storage**: Browser-dependent (50MB-1GB)

### Future Scaling
- Cloud sync for unlimited storage
- Multi-team support
- Advanced analytics with aggregation

---

## Technology Decisions

### Why React?
- Component reusability
- Rich ecosystem
- Excellent PWA support
- Fast development

### Why IndexedDB?
- Offline-first requirement
- Large storage capacity
- Structured data support
- Browser-native

### Why Zustand?
- Lightweight (1KB)
- Simple API
- No boilerplate
- Persistence support

### Why Tailwind CSS?
- Rapid development
- Consistent design
- Dark mode support
- Small bundle size

### Why Vite?
- Lightning-fast HMR
- Optimized builds
- Modern tooling
- PWA plugin support

---

## Deployment

### Build Process
```bash
npm run build
  → Vite bundles app
  → Workbox generates service worker
  → Static files in dist/
```

### Hosting Options
1. **Static Hosting** (Vercel, Netlify, GitHub Pages)
2. **Self-Hosted** (Nginx, Apache)
3. **Local Network** (Team server)

### PWA Installation
- Automatic prompt on supported browsers
- Add to Home Screen on mobile
- Offline functionality after first visit

---

## Testing Strategy (Future)

### Unit Tests
- Database operations
- Status calculation
- Priority scoring
- CSV parsing

### Integration Tests
- Component interactions
- State management
- IndexedDB queries

### E2E Tests
- User flows
- PWA installation
- Offline functionality

---

## Monitoring & Analytics (Future)

### Performance Metrics
- Load time
- Time to interactive
- IndexedDB query time
- Service worker cache hit rate

### User Metrics (Privacy-Preserving)
- Events added per week
- Most used filters
- Win rate trends
- Feature usage

---

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Review IndexedDB size
- Clear old completed events
- Export backups

### Database Migrations
```javascript
db.version(2).stores({
  events: '++id, ..., newField'
}).upgrade(tx => {
  // Migration logic
});
```

---

## Future Roadmap

### Phase 2: Intelligence
- [ ] ML-based event recommendations
- [ ] College reputation scoring
- [ ] Success prediction model

### Phase 3: Collaboration
- [ ] Real-time team sync
- [ ] Shared notes and strategies
- [ ] Task assignment

### Phase 4: Integration
- [ ] WhatsApp notifications
- [ ] Email reminders
- [ ] Calendar sync (Google, Outlook)

---

**Architecture Version**: 1.0.0  
**Last Updated**: 2026-02-07
