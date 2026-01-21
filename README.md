# Help & Support Center Widget

A modern, responsive help & support center widget built with React, TypeScript, Tailwind CSS, and Firebase.

## Features

- 💬 **Chat Interface**: Users can send messages to the help center
- 👥 **Support Agents**: Real-time chat with support agents
- 🔄 **Real-time Messaging**: Instant message synchronization using Firebase listeners
- 🔍 **Smart FAQ Search**: Automatically finds relevant FAQs based on user questions
- 📊 **Agent Dashboard**: Full-featured dashboard for support agents to manage conversations
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS
- 🔥 **Firebase Integration**: Real-time data storage and retrieval
- 📱 **Mobile Friendly**: Works seamlessly on all device sizes

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase project with Firestore enabled

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database in your Firebase project
3. Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Replace the values with your Firebase project configuration (found in Project Settings > General > Your apps).

### 3. Firestore Database Setup

Create three collections in Firestore:

#### Collection: `conversations`
Documents will be created automatically when users start conversations. Structure:
```
{
  userId: string,
  status: string (e.g., "active", "closed"),
  assignedAgentId: string (optional),
  assignedAgentName: string (optional),
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### Collection: `messages`
Documents will be created automatically when users or agents send messages. Structure:
```
{
  text: string,
  timestamp: Timestamp,
  sender: string ("user" | "agent" | "system"),
  userId: string (for user messages),
  agentId: string (for agent messages),
  agentName: string (for agent messages),
  conversationId: string,
  read: boolean
}
```

#### Collection: `faqs`
Add FAQ documents with the following structure:
```
{
  question: string,
  answer: string,
  keywords: string[] (optional),
  category: string (optional)
}
```

Example FAQ document:
```json
{
  "question": "How do I reset my password?",
  "answer": "You can reset your password by clicking on 'Forgot Password' on the login page and following the instructions sent to your email.",
  "keywords": ["password", "reset", "forgot", "login"],
  "category": "Account"
}
```

### 4. Firestore Security Rules

Update your Firestore security rules to allow read/write access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read FAQs
    match /faqs/{document=**} {
      allow read: if true;
      allow write: if false; // Only admins can write FAQs
    }
    
    // Conversations - users can create, agents can read/write
    match /conversations/{conversationId} {
      allow read: if true; // Both users and agents can read
      allow create: if true; // Users can create conversations
      allow update: if true; // Agents can update (assign themselves, etc.)
    }
    
    // Messages - users can create their own, agents can create and read all
    match /messages/{messageId} {
      allow read: if true; // Both users and agents can read messages in their conversations
      allow create: if true; // Both users and agents can create messages
      allow update: if true; // Allow marking as read, etc.
    }
  }
}
```

**Note**: These rules are permissive for development. In production, implement proper authentication and authorization.

### 5. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
support-widget/
├── src/
│   ├── components/
│   │   ├── SupportWidget.tsx    # Main widget component
│   │   ├── MessageList.tsx      # Message display component
│   │   ├── MessageInput.tsx     # Message input component
│   │   └── FAQList.tsx          # FAQ display component
│   ├── firebase/
│   │   ├── config.ts            # Firebase configuration
│   │   └── services.ts           # Firebase service functions
│   ├── App.tsx                   # Main app component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## Usage

### User View

1. Click the chat button in the bottom right corner to open the widget
2. Type your question and send it
3. The widget will search for relevant FAQs and display them
4. Click on any FAQ to view the full answer
5. Your messages are sent in real-time to support agents
6. Support agents can respond to your messages in real-time

### Agent Dashboard

1. Click the "Agent Dashboard" button on the main page
2. View all active conversations in the sidebar
3. Click on a conversation to open it
4. See all messages in real-time
5. Type and send responses to users
6. Your name will be displayed to users when you respond

### Real-time Features

- Messages sync instantly between users and agents
- No page refresh needed
- Conversations are tracked and organized
- Agents can see all active conversations

## Building for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

## Customization

### Styling
Modify `tailwind.config.js` to customize colors, spacing, and other design tokens.

### Widget Position
Edit `SupportWidget.tsx` to change the widget's position by modifying the `fixed bottom-6 right-6` classes.

### FAQ Search Algorithm
The FAQ search uses simple keyword matching. You can enhance it in `src/firebase/services.ts` by:
- Using Firebase's full-text search capabilities
- Integrating with a search service like Algolia
- Implementing more sophisticated NLP matching

## License

MIT
