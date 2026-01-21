# Firebase FAQ Seed Data

Use this data to seed your Firestore `faqs` collection. You can add these documents manually through the Firebase Console or use a script.

## Sample FAQ Documents

### FAQ 1: Password Reset
```json
{
  "question": "How do I reset my password?",
  "answer": "You can reset your password by clicking on 'Forgot Password' on the login page. Enter your email address and you'll receive a password reset link. Click the link in the email and follow the instructions to create a new password.",
  "keywords": ["password", "reset", "forgot", "login", "account", "security"],
  "category": "Account"
}
```

### FAQ 2: Account Creation
```json
{
  "question": "How do I create an account?",
  "answer": "To create an account, click on the 'Sign Up' button on the homepage. Fill in your email address, choose a secure password, and complete the verification process. You'll receive a confirmation email to verify your account.",
  "keywords": ["account", "signup", "register", "create", "sign up", "new user"],
  "category": "Account"
}
```

### FAQ 3: Payment Issues
```json
{
  "question": "I'm having trouble with my payment",
  "answer": "If you're experiencing payment issues, please check that your card details are correct and that you have sufficient funds. If the problem persists, contact our billing support team at billing@example.com with your transaction ID.",
  "keywords": ["payment", "billing", "card", "transaction", "charge", "invoice", "money"],
  "category": "Billing"
}
```

### FAQ 4: Feature Request
```json
{
  "question": "How can I request a new feature?",
  "answer": "We love hearing from our users! You can submit feature requests through our feedback form in your account settings, or email us at feedback@example.com. Our product team reviews all suggestions regularly.",
  "keywords": ["feature", "request", "suggestion", "feedback", "improvement", "idea"],
  "category": "Product"
}
```

### FAQ 5: Technical Support
```json
{
  "question": "The app is not working properly",
  "answer": "If you're experiencing technical issues, try these steps: 1) Refresh the page or restart the app, 2) Clear your browser cache, 3) Check your internet connection, 4) Update to the latest version. If the issue persists, contact our technical support team.",
  "keywords": ["bug", "error", "not working", "broken", "issue", "problem", "technical", "support"],
  "category": "Technical"
}
```

### FAQ 6: Subscription Management
```json
{
  "question": "How do I cancel my subscription?",
  "answer": "To cancel your subscription, go to Account Settings > Subscription, and click 'Cancel Subscription'. Your subscription will remain active until the end of the current billing period. You can reactivate it anytime before it expires.",
  "keywords": ["subscription", "cancel", "billing", "plan", "renewal", "membership"],
  "category": "Billing"
}
```

## Adding FAQs via Firebase Console

1. Go to Firebase Console > Firestore Database
2. Click on the `faqs` collection (create it if it doesn't exist)
3. Click "Add document"
4. Copy the JSON structure above (without the outer quotes)
5. Paste and save

## Adding FAQs via Code

You can also use the Firebase Admin SDK or a simple script to bulk import FAQs. Here's a Node.js example:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const faqs = [
  {
    question: "How do I reset my password?",
    answer: "You can reset your password by clicking on 'Forgot Password'...",
    keywords: ["password", "reset", "forgot"],
    category: "Account"
  },
  // ... add more FAQs
];

async function seedFAQs() {
  const batch = db.batch();
  faqs.forEach(faq => {
    const ref = db.collection('faqs').doc();
    batch.set(ref, faq);
  });
  await batch.commit();
  console.log('FAQs seeded successfully!');
}

seedFAQs();
```
