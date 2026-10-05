# Firebase Setup Requirements

To connect this application to your own Firebase project, follow these steps:

## 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and follow the prompts to create a new project.
3. Once the project is created, click the **Web icon** (`</>`) to register a new web app.
4. Give it a nickname (e.g., `CollegeEventManager`) and click **Register app**.

## 2. Enable Authentication
1. In the Firebase Console, go to **Build > Authentication**.
2. Click **Get Started**.
3. Go to the **Sign-in method** tab.
4. Enable **Email/Password** and click **Save**.

## 3. Enable Cloud Firestore
1. Go to **Build > Firestore Database**.
2. Click **Create database**.
3. Choose a location and start in **Test mode** (you can update security rules later).
4. Click **Enable**.

## 4. Get Your Configuration
1. Go to **Project Settings** (gear icon next to Project Overview).
2. Scroll down to **Your apps** and look for the **Firebase SDK snippet**.
3. Select the **Config** radio button.
4. Copy the `firebaseConfig` object. It should look something like this:
   ```json
   {
     "apiKey": "...",
     "authDomain": "...",
     "projectId": "...",
     "storageBucket": "...",
     "messagingSenderId": "...",
     "appId": "..."
   }
   ```

## 5. Configure the App
1. Open the application.
2. Go to **Settings > Team Cloud Setup**.
3. Select **Firebase Sync**.
4. Paste the copied JSON configuration into the text area.
5. Go to **Login** and you can now register or log in using your Firebase credentials.

---
**Note:** The application uses Firestore to store events and Firebase Auth for team access. All data will be synced in real-time across all team members using the same configuration.
