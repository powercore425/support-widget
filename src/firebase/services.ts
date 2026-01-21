import {
  collection,
  addDoc,
  query,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  Unsubscribe,
  where,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

export type MessageSender = 'user' | 'agent' | 'system';

export interface Message {
  id?: string;
  text: string;
  timestamp: Date | Timestamp;
  sender: MessageSender;
  userId?: string;
  agentId?: string;
  agentName?: string;
  conversationId: string;
  read?: boolean;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category?: string;
}

// Generate or get conversation ID for a user
export const getOrCreateConversationId = async (userId: string): Promise<string> => {
  try {
    // Check if user has an active conversation
    // First try with orderBy (requires index)
    try {
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(conversationsQuery);

      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }
    } catch (indexError) {
      // If index doesn't exist, try without orderBy
      console.warn('Index not found, trying without orderBy:', indexError);
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        limit(10)
      );

      const snapshot = await getDocs(conversationsQuery);

      if (!snapshot.empty) {
        // Sort manually and return the most recent
        const sorted = snapshot.docs.sort((a, b) => {
          const aTime = a.data().createdAt?.toMillis() || 0;
          const bTime = b.data().createdAt?.toMillis() || 0;
          return bTime - aTime;
        });
        return sorted[0].id;
      }
    }

    // Create new conversation
    const conversationRef = await addDoc(collection(db, 'conversations'), {
      userId,
      status: 'active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return conversationRef.id;
  } catch (error) {
    console.error('Error getting conversation ID:', error);
    throw error;
  }
};

// Send a message from user
export const sendUserMessage = async (
  messageText: string,
  conversationId: string,
  userId?: string
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'messages'), {
      text: messageText,
      timestamp: Timestamp.now(),
      sender: 'user' as MessageSender,
      userId: userId || 'anonymous',
      conversationId,
      read: false,
    });

    // Update conversation timestamp
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Send a message from agent
export const sendAgentMessage = async (
  messageText: string,
  conversationId: string,
  agentId: string,
  agentName: string
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'messages'), {
      text: messageText,
      timestamp: Timestamp.now(),
      sender: 'agent' as MessageSender,
      agentId,
      agentName,
      conversationId,
      read: false,
    });

    // Update conversation timestamp and assign agent
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      updatedAt: serverTimestamp(),
      assignedAgentId: agentId,
      assignedAgentName: agentName,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error sending agent message:', error);
    throw error;
  }
};

// Subscribe to real-time messages for a conversation
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void
): Unsubscribe => {
  console.log('Setting up message subscription for conversation:', conversationId);

  // Create query with orderBy (requires Firestore index)
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      console.log('Message snapshot received, size:', snapshot.size);
      const messages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          text: data.text,
          timestamp: data.timestamp,
          sender: data.sender,
          userId: data.userId,
          agentId: data.agentId,
          agentName: data.agentName,
          conversationId: data.conversationId,
          read: data.read || false,
        });
      });

      // Sort manually to ensure correct order
      messages.sort((a, b) => {
        const aTime = a.timestamp instanceof Date
          ? a.timestamp.getTime()
          : (a.timestamp as any)?.toMillis?.() || (a.timestamp as any)?.seconds * 1000 || 0;
        const bTime = b.timestamp instanceof Date
          ? b.timestamp.getTime()
          : (b.timestamp as any)?.toMillis?.() || (b.timestamp as any)?.seconds * 1000 || 0;
        return aTime - bTime;
      });

      console.log('Calling callback with', messages.length, 'messages');
      callback(messages);
    },
    (error) => {
      console.error('Error in message subscription:', error);
      // If error is about missing index, try without orderBy
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.log('Index missing, retrying without orderBy...');
        const fallbackQ = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId)
        );
        return onSnapshot(
          fallbackQ,
          (snapshot) => {
            console.log('Fallback snapshot received, size:', snapshot.size);
            const messages: Message[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              messages.push({
                id: doc.id,
                text: data.text,
                timestamp: data.timestamp,
                sender: data.sender,
                userId: data.userId,
                agentId: data.agentId,
                agentName: data.agentName,
                conversationId: data.conversationId,
                read: data.read || false,
              });
            });

            // Sort manually
            messages.sort((a, b) => {
              const aTime = a.timestamp instanceof Date
                ? a.timestamp.getTime()
                : (a.timestamp as any)?.toMillis?.() || (a.timestamp as any)?.seconds * 1000 || 0;
              const bTime = b.timestamp instanceof Date
                ? b.timestamp.getTime()
                : (b.timestamp as any)?.toMillis?.() || (b.timestamp as any)?.seconds * 1000 || 0;
              return aTime - bTime;
            });

            console.log('Calling callback with', messages.length, 'messages (fallback)');
            callback(messages);
          },
          (fallbackError) => {
            console.error('Error in fallback subscription:', fallbackError);
          }
        );
      }
    }
  );
};

// Subscribe to all conversations (for agent dashboard)
export const subscribeToConversations = (
  callback: (conversations: any[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'conversations'),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const conversations: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      conversations.push({
        id: doc.id,
        ...data,
      });
    });
    callback(conversations);
  });
};

// Get messages for a conversation (one-time)
export const getMessages = async (conversationId: string): Promise<Message[]> => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(q);
    const messages: Message[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        text: data.text,
        timestamp: data.timestamp,
        sender: data.sender,
        userId: data.userId,
        agentId: data.agentId,
        agentName: data.agentName,
        conversationId: data.conversationId,
        read: data.read || false,
      });
    });

    return messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
};

// Mark messages as read
export const markMessagesAsRead = async (conversationId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return; // No unread messages
    }

    const updatePromises = snapshot.docs.map((doc) =>
      updateDoc(doc.ref, { read: true })
    );

    await Promise.all(updatePromises);
    console.log(`Marked ${snapshot.size} messages as read for conversation ${conversationId}`);
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
};

// Mark specific messages as read by their IDs
export const markMessagesAsReadByIds = async (messageIds: string[]): Promise<void> => {
  try {
    if (messageIds.length === 0) {
      console.log('No message IDs provided to mark as read');
      return;
    }

    console.log(`Attempting to mark ${messageIds.length} messages as read:`, messageIds);

    const updatePromises = messageIds.map((messageId) => {
      if (!messageId) {
        console.warn('Empty message ID, skipping');
        return Promise.resolve();
      }
      const messageRef = doc(db, 'messages', messageId);
      return updateDoc(messageRef, { read: true }).catch((error) => {
        console.error(`Error marking message ${messageId} as read:`, error);
        return Promise.resolve(); // Continue with other messages even if one fails
      });
    });

    await Promise.all(updatePromises);
    console.log(`Successfully marked ${messageIds.length} messages as read`);
  } catch (error) {
    console.error('Error marking messages as read by IDs:', error);
  }
};

// Get unread message count for a conversation
export const getUnreadMessageCount = async (conversationId: string): Promise<number> => {
  try {
    // Try with both where clauses first
    let q;
    try {
      q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('read', '==', false),
        where('sender', '==', 'user')
      );
    } catch (error) {
      // If index doesn't exist, try without sender filter
      q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('read', '==', false)
      );
    }

    const snapshot = await getDocs(q);
    // Filter by sender manually if needed
    let count = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.sender === 'user') {
        count++;
      }
    });
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Subscribe to unread message counts for all conversations
export const subscribeToUnreadCounts = (
  callback: (counts: Record<string, number>) => void
): Unsubscribe => {
  // Subscribe to all unread user messages
  let q;
  try {
    q = query(
      collection(db, 'messages'),
      where('read', '==', false),
      where('sender', '==', 'user')
    );
  } catch (error) {
    // Fallback: query without sender filter
    q = query(
      collection(db, 'messages'),
      where('read', '==', false)
    );
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const counts: Record<string, number> = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only count user messages
        if (data.sender === 'user' && data.conversationId) {
          const conversationId = data.conversationId;
          counts[conversationId] = (counts[conversationId] || 0) + 1;
        }
      });

      callback(counts);
    },
    (error) => {
      console.error('Error in unread counts subscription:', error);
      // Try fallback query
      if (error.code === 'failed-precondition') {
        const fallbackQ = query(
          collection(db, 'messages'),
          where('read', '==', false)
        );
        return onSnapshot(
          fallbackQ,
          (snapshot) => {
            const counts: Record<string, number> = {};
            snapshot.forEach((doc) => {
              const data = doc.data();
              if (data.sender === 'user' && data.conversationId) {
                const conversationId = data.conversationId;
                counts[conversationId] = (counts[conversationId] || 0) + 1;
              }
            });
            callback(counts);
          },
          (fallbackError) => {
            console.error('Error in fallback unread counts subscription:', fallbackError);
            callback({});
          }
        );
      }
      callback({});
    }
  );
};

// Search FAQs based on user question
export const searchFAQs = async (userQuestion: string): Promise<FAQ[]> => {
  try {
    const q = query(
      collection(db, 'faqs'),
      orderBy('question'),
      limit(5)
    );

    const querySnapshot = await getDocs(q);
    const allFAQs: FAQ[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      allFAQs.push({
        id: doc.id,
        question: data.question,
        answer: data.answer,
        keywords: data.keywords || [],
        category: data.category,
      });
    });

    // Simple keyword matching - in production, you might want to use a more sophisticated search
    const searchTerms = userQuestion.toLowerCase().split(' ');
    const matchedFAQs = allFAQs
      .map(faq => {
        const relevanceScore = searchTerms.reduce((score, term) => {
          const questionMatch = faq.question.toLowerCase().includes(term) ? 2 : 0;
          const answerMatch = faq.answer.toLowerCase().includes(term) ? 1 : 0;
          const keywordMatch = faq.keywords.some(k => k.toLowerCase().includes(term)) ? 3 : 0;
          return score + questionMatch + answerMatch + keywordMatch;
        }, 0);
        return { ...faq, relevanceScore };
      })
      .filter(faq => faq.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3)
      .map(({ relevanceScore, ...faq }) => faq);

    return matchedFAQs.length > 0 ? matchedFAQs : allFAQs.slice(0, 3);
  } catch (error) {
    console.error('Error searching FAQs:', error);
    return [];
  }
};

// Get all FAQs
export const getAllFAQs = async (): Promise<FAQ[]> => {
  try {
    const q = query(collection(db, 'faqs'), orderBy('question'));
    const querySnapshot = await getDocs(q);
    const faqs: FAQ[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      faqs.push({
        id: doc.id,
        question: data.question,
        answer: data.answer,
        keywords: data.keywords || [],
        category: data.category,
      });
    });

    return faqs;
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    return [];
  }
};
