# 🚀 Quick Start Guide - Event Manager

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd CollegeEventManager
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

The app will open at `http://localhost:3000`

---

## 📱 First-Time Setup

### 1. Enable Notifications
- Click **Settings** (gear icon)
- Toggle **Enable Notifications**
- Allow browser permission
- Configure reminder days (default: 7, 3, 1, 0)

### 2. Add Your First Event

**Option A: Manual Entry**
1. Click **Add Event** button
2. Fill in event details
3. Click **Add Event**

**Option B: Import from Excel**
1. Export your Excel sheet as CSV
2. Click **Import** button
3. Select CSV file
4. Events automatically imported!

---

## 🎯 Common Tasks

### Adding Events Manually
```
Header → Add Event → Fill Form → Submit
```

### Importing from CSV
```
Header → Import → Select CSV → Auto-mapping → Import
```

### Filtering Events
```
Events Page → Use filters (Search, Status, Type, Date)
```

### Viewing Event Details
```
Click any event card → View full details → Update status
```

### Checking Analytics
```
Analytics Page → View stats, charts, ROI
```

### Exporting Data
```
Settings → Export CSV → Download backup
```

---

## 📊 Sample CSV Format

Download `sample-events.csv` for reference.

**Required Columns**:
- College Name
- Event Name
- Event Type
- Registration Deadline
- Start Date
- End Date

**Optional Columns**:
- Prize, Fee, Location, Online, Contact, Website, Description, Team Size, Eligibility

---

## 🎨 Keyboard Shortcuts (Desktop)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Search events |
| `Ctrl/Cmd + N` | New event |
| `Ctrl/Cmd + I` | Import CSV |
| `Ctrl/Cmd + D` | Toggle dark mode |
| `Esc` | Close modal |

*(Coming in future update)*

---

## 🔔 Notification Setup

### Desktop (Chrome/Edge)
1. Settings → Enable Notifications
2. Browser will ask for permission
3. Click "Allow"

### Mobile (Android/iOS)
1. Install app to home screen first
2. Settings → Enable Notifications
3. Grant permission in browser settings

---

## 📈 Understanding Priority Scores

Events are automatically scored 0-100:

- **90-100**: Must attend (high prize, low fee, urgent)
- **70-89**: High priority (good ROI, important type)
- **40-69**: Medium priority (decent opportunity)
- **0-39**: Low priority (low value or far deadline)

---

## 🎯 Best Practices

### 1. Regular Updates
- Check dashboard daily for deadline alerts
- Update event status after participation
- Mark events as "Won" when you win prizes

### 2. Data Management
- Export CSV backup weekly
- Clear old completed events monthly
- Keep poster URLs updated

### 3. Team Collaboration
- Share CSV exports with team
- Use notes for team strategies
- Track college reputation in notes

---

## 🐛 Troubleshooting

### App not loading?
- Clear browser cache
- Check if JavaScript is enabled
- Try incognito mode

### CSV import failing?
- Ensure file is .csv format
- Check date format (YYYY-MM-DD recommended)
- Verify column names match expected format

### Notifications not working?
- Check browser notification permissions
- Ensure notifications enabled in Settings
- Try re-granting permission

### Data disappeared?
- Check if browser data was cleared
- Restore from CSV backup
- IndexedDB might be full (check storage)

---

## 📱 Mobile Usage Tips

### Installing as App
1. Open in mobile browser
2. Menu → "Add to Home Screen"
3. App icon appears on home screen
4. Works offline like native app

### Mobile Gestures
- **Swipe** to navigate (future)
- **Pull down** to refresh
- **Long press** for quick actions (future)

---

## 🔒 Privacy & Security

### Your Data is Safe
- ✅ Stored locally in your browser
- ✅ No cloud upload (unless you enable sync)
- ✅ No tracking or analytics
- ✅ Export anytime

### Backup Strategy
1. Export CSV weekly
2. Save to cloud storage (Google Drive, OneDrive)
3. Keep multiple versions

---

## 🚀 Advanced Features

### Custom Reminders
Settings → Notification → Change reminder days
Example: `7, 5, 3, 2, 1, 0` for daily reminders

### Filtering Tricks
- Combine filters for precise results
- Use search for quick lookup
- Sort by priority for decision-making

### Analytics Insights
- Track win rate to improve strategy
- Monitor ROI to optimize participation
- Analyze event types for best opportunities

---

## 📞 Need Help?

### Resources
- 📖 Full documentation: `README.md`
- 🏗️ Architecture: `ARCHITECTURE.md`
- 📊 Sample data: `sample-events.csv`

### Common Questions

**Q: Can I use this offline?**  
A: Yes! After first load, works 100% offline.

**Q: How many events can I store?**  
A: 10,000+ events (browser-dependent)

**Q: Can I sync across devices?**  
A: Not yet, but coming soon. Use CSV export/import for now.

**Q: Is my data private?**  
A: Yes, everything is local. No cloud upload.

---

## 🎓 Tips for Engineering Students

### Event Selection Strategy
1. Filter by high priority (70+)
2. Check prize vs fee ratio
3. Prefer online events (easier logistics)
4. Look for accommodation if offline

### Time Management
- Set reminders 7 days before deadline
- Prepare team 3 days before
- Register 1 day before deadline
- Attend events with high ROI

### Tracking Success
- Mark events as "Attended" or "Won"
- Add notes about experience
- Review analytics monthly
- Improve strategy based on data

---

**Ready to replace Excel? Let's go! 🚀**

Start by importing your existing events or adding your first event manually.
