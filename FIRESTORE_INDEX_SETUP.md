# Firestore Index Setup

For real-time messaging to work properly, you need to create a Firestore index.

## Required Index

The app needs a composite index for querying messages by `conversationId` and ordering by `timestamp`.

### Option 1: Automatic (Recommended)
1. Run the app and try to send a message
2. Check the browser console for an error message
3. Click the link in the error message - it will take you to Firebase Console to create the index automatically

### Option 2: Manual Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Firestore Database > Indexes
4. Click "Create Index"
5. Set up the index with:
   - Collection ID: `messages`
   - Fields to index:
     - `conversationId` (Ascending)
     - `timestamp` (Ascending)
   - Query scope: Collection
6. Click "Create"

### Option 3: Using Firebase CLI
Create a file `firestore.indexes.json` in your project root:

```json
{
  "indexes": [
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "conversationId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "timestamp",
          "order": "ASCENDING"
        }
      ]
    }
  ]
}
```

Then run:
```bash
firebase deploy --only firestore:indexes
```

## Note
The app includes fallback handling that works without the index, but messages may not be in chronological order until the index is created.
