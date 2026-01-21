import { useState, useEffect, useRef } from 'react';
import {
  sendUserMessage,
  getOrCreateConversationId,
  subscribeToMessages,
  getAllFAQs,
  FAQ,
  Message
} from '../firebase/services';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import FAQList from './FAQList';

const SupportWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFAQs, setShowFAQs] = useState(true); // Show FAQs by default
  const [isInitializing, setIsInitializing] = useState(false);
  const [isChattingWithAgent, setIsChattingWithAgent] = useState(false); // Track if user chose to chat with agent
  const [userId] = useState(() => {
    // Generate or retrieve user ID (in production, use proper auth)
    const stored = localStorage.getItem('supportWidget_userId');
    if (stored) return stored;
    const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('supportWidget_userId', newId);
    return newId;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Always load FAQs when widget opens (if not chatting with agent)
      // This ensures FAQs are shown even after closing and reopening
      if (!isChattingWithAgent) {
        loadInitialFAQs();
      }
      // Initialize conversation in background (don't block UI)
      if (!conversationId) {
        initializeConversation();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen to avoid unnecessary reloads

  useEffect(() => {
    if (conversationId && !conversationId.startsWith('temp_')) {
      // Subscribe to real-time messages
      console.log('Subscribing to messages for conversation:', conversationId);
      const unsubscribe = subscribeToMessages(conversationId, (newMessages) => {
        console.log('Received messages:', newMessages.length);
        setMessages(newMessages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date
            ? msg.timestamp
            : (msg.timestamp as any).toDate ? (msg.timestamp as any).toDate() : new Date()
        })));
      });

      return () => {
        console.log('Unsubscribing from messages');
        unsubscribe();
      };
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = async () => {
    if (conversationId) return; // Already initialized

    setIsInitializing(true);
    try {
      const convId = await getOrCreateConversationId(userId);
      setConversationId(convId);
    } catch (error) {
      console.error('Error initializing conversation:', error);
      // Even if conversation creation fails, allow user to interact
      // Create a temporary conversation ID for local use
      const tempId = `temp_${Date.now()}`;
      setConversationId(tempId);
    } finally {
      setIsInitializing(false);
    }
  };

  const loadInitialFAQs = async () => {
    try {
      // Load all FAQs, not just a limited set
      const allFAQs = await getAllFAQs();
      setFaqs(allFAQs);
      setShowFAQs(true);
    } catch (error) {
      console.error('Error loading FAQs:', error);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Only allow sending messages when chatting with agent
    // FAQs work separately and don't use the message system
    if (!isChattingWithAgent) {
      // If user tries to send a message while viewing FAQs, switch to chat mode
      await handleStartChat();
      // Wait a moment for state to update, then send the message
      setTimeout(async () => {
        await sendMessageToAgent(messageText);
      }, 100);
      return;
    }

    await sendMessageToAgent(messageText);
  };

  const sendMessageToAgent = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Ensure conversation is initialized before sending
    let convId = conversationId;
    if (!convId || convId.startsWith('temp_')) {
      await initializeConversation();
      convId = conversationId;
      // If still no conversation, create one on the fly
      if (!convId || convId.startsWith('temp_')) {
        try {
          convId = await getOrCreateConversationId(userId);
          setConversationId(convId);
        } catch (error) {
          console.error('Error creating conversation:', error);
          return;
        }
      }
    }

    setIsLoading(true);
    setShowFAQs(false); // Hide FAQs when sending messages in chat mode

    try {
      // Send message to Firebase (real-time listener will update UI)
      console.log('Sending message:', messageText, 'to conversation:', convId);
      const messageId = await sendUserMessage(messageText, convId, userId);
      console.log('Message sent successfully with ID:', messageId);
      // Don't show FAQs in chat mode - keep it focused on live messaging
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error message to user
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        text: "Sorry, there was an error sending your message. Please try again.",
        timestamp: new Date(),
        sender: 'system',
        conversationId: convId || 'temp',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFAQClick = (_faq: FAQ) => {
    // FAQs work independently - just show the answer without creating chat messages
    // This is a read-only FAQ browsing experience, separate from live chat
    // No need to initialize conversation or add messages
    // The FAQList component will handle displaying the answer internally
  };

  const handleStartChat = async () => {
    // Mark that user chose to chat with agent - don't show FAQs again
    setIsChattingWithAgent(true);
    // Hide FAQs immediately - don't reload them
    setShowFAQs(false);

    // Ensure conversation is initialized
    let convId = conversationId;
    if (!convId || convId.startsWith('temp_')) {
      setIsInitializing(true);
      try {
        convId = await getOrCreateConversationId(userId);
        setConversationId(convId);
      } catch (error) {
        console.error('Error creating conversation:', error);
        // Create temp ID as fallback
        convId = `temp_${Date.now()}`;
        setConversationId(convId);
      } finally {
        setIsInitializing(false);
      }
    }

    // Add a welcome message indicating they're now chatting with an agent
    // Only add if there are no messages yet or last message isn't already a welcome message
    const lastMessage = messages[messages.length - 1];
    const isAlreadyWelcomed = lastMessage?.id?.startsWith('welcome_');

    if (!isAlreadyWelcomed) {
      const welcomeMessage: Message = {
        id: `welcome_${Date.now()}`,
        text: "You're now connected to our support team. How can we help you today?",
        timestamp: new Date(),
        sender: 'system',
        conversationId: convId || 'temp',
      };

      setMessages((prev) => [...prev, welcomeMessage]);
    }
  };

  return (
    <>
      {/* Widget Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            // Reset to FAQ view when opening widget
            setIsChattingWithAgent(false);
            setShowFAQs(true);
          }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full p-3 sm:p-4 shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 z-50 touch-manipulation"
          aria-label="Open support widget"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* Widget Panel */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:top-auto sm:w-96 sm:max-h-[calc(100vh-3rem)] sm:h-[600px] w-full h-full sm:rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-3 sm:p-4 rounded-t-lg sm:rounded-t-lg flex justify-between items-center">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {isChattingWithAgent && (
                <button
                  onClick={async () => {
                    // Go back to FAQs - completely separate from chat
                    setIsChattingWithAgent(false);
                    setShowFAQs(true);
                    // Reload FAQs to show fresh list
                    await loadInitialFAQs();
                    // Note: Messages are kept in state but hidden when viewing FAQs
                    // This allows users to switch back to chat and see their conversation history
                  }}
                  className="hover:bg-blue-700 active:bg-blue-800 rounded-full p-1.5 sm:p-1 transition-colors mr-2 flex-shrink-0 touch-manipulation"
                  aria-label="Back to FAQs"
                  title="Back to FAQs"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h2 className="text-base sm:text-lg font-semibold truncate">
                {isChattingWithAgent ? 'Chat with Agent' : 'Help & Support'}
              </h2>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                // Reset to FAQ view when closing, so it shows FAQs when reopened
                // Don't clear messages - keep conversation history
                // Note: We'll reset isChattingWithAgent and showFAQs when opening again
              }}
              className="hover:bg-blue-700 active:bg-blue-800 rounded-full p-1.5 sm:p-1 transition-colors flex-shrink-0 touch-manipulation ml-2"
              aria-label="Close widget"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50">
            {/* Show FAQs view when not chatting with agent and FAQs should be shown */}
            {!isChattingWithAgent && showFAQs && faqs.length > 0 && (
              <>
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 mb-4">
                    <p className="text-sm font-medium">Browse FAQs or start a conversation</p>
                  </div>
                )}
                <FAQList
                  faqs={faqs}
                  onFAQClick={handleFAQClick}
                  onStartChat={handleStartChat}
                />
              </>
            )}

            {/* Show messages view when chatting with agent */}
            {isChattingWithAgent && (
              <>
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 mt-8">
                    <p className="text-lg font-medium mb-2">Welcome! 👋</p>
                    <p>You're connected to our support team</p>
                  </div>
                )}
                {messages.length > 0 && <MessageList messages={messages} />}
                <div ref={messagesEndRef} />
              </>
            )}

            {/* Show welcome message when no FAQs, no messages, and not chatting */}
            {!isChattingWithAgent && !showFAQs && messages.length === 0 && faqs.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-lg font-medium mb-2">Welcome! 👋</p>
                <p>How can we help you today?</p>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center my-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            {isInitializing && (
              <div className="flex justify-center my-2">
                <p className="text-xs text-gray-500">Initializing conversation...</p>
              </div>
            )}
          </div>

          {/* Input Area - Only show when chatting with agent */}
          {isChattingWithAgent && (
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={isLoading || isInitializing}
            />
          )}
        </div>
      )}
    </>
  );
};

export default SupportWidget;
