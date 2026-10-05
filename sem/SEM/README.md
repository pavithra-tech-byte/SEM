# 🎓 SEM Student Event Manager

> **Offline-first, intelligent event management system for engineering students**

A Progressive Web Application (PWA) designed to replace Excel-based event tracking with a modern, fast, and intelligent solution.

---

## 🚀 Features

### Core Capabilities
- ✅ **Offline-First Architecture** - Works without internet using IndexedDB
- 📊 **Smart Dashboard** - High-priority events, deadline alerts, statistics
- 📅 **Calendar View** - Visual timeline of all events
- 📈 **Analytics & Insights** - ROI tracking, win rates, financial overview
- 🔔 **Smart Notifications** - Deadline and event reminders (offline-capable)
- 📥 **CSV Import/Export** - Bulk import from Excel, export for backup

### Intelligent Features
- 🧠 **Auto Status Engine** - Automatically calculates event status based on dates
- ⚡ **Priority Scoring (0-100)** - Smart ranking based on:
  - Prize vs Fee ratio
  - Event type importance
  - Days remaining
  - Online vs Offline
- 🎯 **Advanced Filtering** - Search, status, type, date range
- 🌓 **Dark Mode** - Eye-friendly theme switching
- 🤖 **Neural Vision Engine (AI)** - Built-in OCR using Tesseract.js to scan posters and auto-fill event details
- 📡 **Google Sheets Sync** - Sync events directly from a Google Sheet CSV URL

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite |
| **Styling** | Tailwind CSS |
| **State** | Zustand |
| **Database** | IndexedDB (Dexie.js) |
| **PWA** | Workbox Service Workers |
| **Date Handling** | date-fns |
| **CSV Processing** | PapaParse |
| **Icons** | Lucide React |

---

## 📦 Installation

### Prerequisites
- Node.js 16+ and npm

### Setup

```bash
# Navigate to project directory
cd CollegeEventManager

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will open at `http://localhost:3000`

---

## 📱 PWA Installation

### Desktop
1. Open the app in Chrome/Edge
2. Click the install icon in the address bar
3. Click "Install"

### Mobile
1. Open the app in mobile browser
2. Tap "Add to Home Screen"
3. The app will work offline like a native app

---

## 📊 Data Model

Each event contains:

```javascript
{
  collegeName: String,
  eventName: String,
  eventType: Enum (Hackathon, Paper, Workshop, etc.),
  registrationDeadline: Date,
  startDate: Date,
  endDate: Date,
  prizeAmount: Number,
  registrationFee: Number,
  accommodation: Boolean,
  location: String,
  isOnline: Boolean,
  contactNumbers: Array,
  posterUrl: String,
  website: String,
  description: String,
  teamSize: Number,
  eligibility: String,
  status: Auto-calculated,
  priorityScore: Auto-calculated (0-100),
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎯 Usage Guide

### Adding Events

**Method 1: Manual Entry**
1. Click "Add Event" button
2. Fill in event details
3. Submit

**Method 2: CSV Import**
1. Export your Excel sheet as CSV
2. Click "Import" button
3. Select CSV file
4. System auto-maps columns
5. Events imported to local database

### CSV Column Mapping

The system automatically detects these column names (case-insensitive):

- **College Name**: college, institution, university
- **Event Name**: event, name, title
- **Event Type**: type, category
- **Deadline**: registration deadline, deadline, last date
- **Start Date**: start date, from date, event date
- **End Date**: end date, to date
- **Prize**: prize, prize amount, reward
- **Fee**: fee, registration fee, entry fee
- **Location**: location, venue, city
- **Online**: online, mode, virtual
- **Contact**: contact, phone, mobile

### Filtering Events

Use the filters on the Events page:
- **Search** - Event name, college, location
- **Status** - Open, Closed, Attended, Won, etc.
- **Event Type** - Hackathon, Workshop, etc.
- **Date Range** - Today, This Week, This Month

### Priority Scoring

Events are automatically scored (0-100) based on:

1. **Prize vs Fee Ratio** (30 points)
   - Free with prize: 30 points
   - 10x ratio: 30 points
   - 5x ratio: 20 points
   - 2x ratio: 10 points

2. **Event Type** (20 points)
   - Hackathon: 20
   - Contest: 18
   - Paper Presentation: 15
   - Workshop: 12

3. **Days Remaining** (25 points)
   - ≤2 days: 25 points
   - ≤7 days: 20 points
   - ≤14 days: 15 points

4. **Mode** (15 points)
   - Online: 15
   - Offline with accommodation: 10
   - Offline: 5

5. **Prize Bonus** (10 points)
   - ≥₹1L: 10 points
   - ≥₹50K: 7 points
   - ≥₹10K: 5 points

---

## 🔔 Notifications

### Setup
1. Go to Settings
2. Enable Notifications
3. Grant browser permission
4. Configure reminder days

### Default Reminders
- **Deadline**: 7, 3, 1, 0 days before
- **Event Start**: 1 day before

Notifications work **offline** using the Web Notifications API.

---

## 📈 Analytics

Track your performance:
- Total events tracked
- Win rate percentage
- Total prize money won
- ROI (Return on Investment)
- Events by type/status
- Online vs Offline distribution
- Financial overview

---

## 🎨 Design Philosophy

### Principles
1. **Offline-First** - Local database is primary, cloud is optional
2. **Performance** - Instant load, millisecond filtering
3. **Intelligence** - Auto-status, priority scoring, smart sorting
4. **Usability** - Card-based, mobile-first, keyboard shortcuts

### Not Just a CRUD App
This is a **decision-support platform** that helps you:
- Identify high-value events
- Never miss deadlines
- Track ROI and performance
- Make data-driven decisions

---

## 🔒 Privacy & Data

- **Local-Only Storage** - All data stored in browser IndexedDB
- **No Cloud Required** - Works 100% offline
- **Private** - Designed for 5-person teams
- **Export Anytime** - Download your data as CSV

---

## 🚧 Future Enhancements

- [ ] OCR for poster auto-fill
- [ ] Firebase/Supabase sync (optional)
- [ ] Team collaboration features
- [ ] College reputation tracking
- [ ] Event recommendation engine
- [ ] WhatsApp/Email integration

---

## 📜 Project Evolution & Recovery Log

This section tracks major architectural changes and critical updates for easy reference and restoration.

### 📅 Session: March 26, 2026 - Infrastructure & Workspace Stability
- **Tactical Unit Induction (Repair):** Fixed the `JoinTeam.jsx` component to restore induction UI and seat-limit monitoring (Max 10).
- **Post-Auth Intelligence:** Implemented `sessionStorage` based redirects in `Login.jsx` to return users to their pending invites automatically after sign-in.
- **Visual Asset Expansion:** Integrated `Neural Link 0 (Poster URL)` fields in both Add and Edit modals for dual-source image handling (File/URL).
- **Asset Reset Logic:** Standardized "Flush" button behavior to clear both local blobs and remote URLs in real-time.
- **Admin Layout Sanitization:** Isolated the `AdminPanel` to the `/admin` route to prevent unauthorized access alerts on the global layout.

### 📅 Session: March 25, 2026 - Team Collaboration & Security
- **Team Join Logic:** Enabled team joining via both Leader UIDs and alphanumeric Invite Codes.
- **Firestore RBAC:** Optimized security rules to allow team-based data isolation while maintaining global event visibility.
- **Cloud Notification Prep:** Integrated FCM Service Worker and internal request logic for background alerts.

### 📅 Session: March 24, 2026 - AI & Event Intelligence
- **Priority Scoring v2:** Refined scoring algorithms for more accurate event ranking.
- **AI OCR Integration:** Initial groundwork for Tesseract.js poster scanning.

---

**Built with ❤️ for engineering students who deserve better than Excel**

