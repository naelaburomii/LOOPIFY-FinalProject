# Loopify - B2B Business Platform

A full cross-platform business webapp and mobile app built with React Native + Expo, supporting Web, iOS, and Android from a single codebase.

## Features

- 🔐 Business Authentication (Login & Registration)
- 🏢 Business Profile Management
- 📦 Inventory Management
- 🖼️ Product Image Uploads
- 🔍 Browse Other Businesses
- 📋 B2B Order Management
- 📊 Order Status Tracking
- 📄 Invoice Management

## Tech Stack

- **React Native + Expo** - Cross-platform framework
- **Expo Router** - File-based routing
- **Firebase Auth** - Authentication
- **Firestore** - Database
- **Firebase Storage** - Image storage
- **React Native Paper** - UI components
- **Expo Image Picker** - Image selection

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (installed globally or via npx)
- Firebase project

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd LOOPIFY-FinalProject
```

2. Install dependencies
```bash
npm install
```

3. Set up Firebase
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Enable Firebase Storage
   - Copy your Firebase config

4. Configure environment variables
   - Copy `.env.example` to `.env`
   - Fill in your Firebase configuration values

```bash
cp .env.example .env
```

5. Update `.env` with your Firebase credentials:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Running the App

#### Web
```bash
npm run web
```

#### iOS
```bash
npm run ios
```

#### Android
```bash
npm run android
```

#### Development Server
```bash
npm start
```

## Project Structure

```
LOOPIFY-FinalProject/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/            # Main app tabs
│   │   └── index.tsx
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point
├── config/                # Configuration files
│   └── firebase.ts        # Firebase initialization
├── services/              # Business logic
│   └── auth.ts           # Authentication service
├── assets/                # Images and static files
└── package.json
```

## Firebase Setup

1. **Authentication**
   - Go to Firebase Console > Authentication
   - Enable "Email/Password" sign-in method

2. **Firestore Database**
   - Go to Firebase Console > Firestore Database
   - Create database in production mode (or test mode for development)
   - Set up security rules (see below)

3. **Firebase Storage**
   - Go to Firebase Console > Storage
   - Create storage bucket
   - Set up security rules (see below)

### Firestore Security Rules (Development)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /businesses/{businessId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == businessId;
    }
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /orders/{orderId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Security Rules (Development)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

### Web
```bash
expo export:web
```

## License

MIT





















