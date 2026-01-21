import { useState, useEffect, useRef } from 'react';
import { 
  subscribeToConversations, 
  subscribeToMessages, 
  sendAgentMessage,
  markMessagesAsReadByIds,
  subscribeToUnreadCounts,
  Message 
} from '../firebase/services';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ThemeToggle from './ThemeToggle';

interface Conversation {
  id: string;
  userId: string;
  status: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  createdAt: any;
  updatedAt: any;
}

const AgentDashboard = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const currentMessagesRef = useRef<Message[]>([]);
  const selectedConversationRef = useRef<string | null>(null);
  const [agentId] = useState(() => {
    const stored = localStorage.getItem('supportWidget_agentId');
    if (stored) return stored;
    const newId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('supportWidget_agentId', newId);
    return newId;
  });
  const [agentName, setAgentName] = useState(() => {
    return localStorage.getItem('supportWidget_agentName') || 'Support Agent';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep selectedConversationRef in sync with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    // Subscribe to conversations
    const unsubscribeConversations = subscribeToConversations((newConversations) => {
      // CRITICAL: Preserve the currently selected conversation
      // Never auto-select conversations, even when new messages arrive
      //const currentSelection = selectedConversationRef.current;
      
      // Simply update the conversations list
      // The selected conversation ID is stored separately and won't change
      setConversations(newConversations);
      
      // ABSOLUTELY NEVER change selection automatically
      // Selection can ONLY change via user click on the conversation button
      // Even if a conversation with new messages moves to the top, selection stays the same
    });

    // Subscribe to unread message counts
    // This will automatically update when messages are marked as read
    const unsubscribeUnreadCounts = subscribeToUnreadCounts((counts) => {
      console.log('Unread counts updated:', counts);
      // Update unread counts - when a conversation's count becomes 0, badges will disappear
      setUnreadCounts(counts);
      // Badges automatically disappear when count becomes 0 because hasUnread = unreadCount > 0
    });

    return () => {
      unsubscribeConversations();
      unsubscribeUnreadCounts();
    };
  }, []);

  useEffect(() => {
    // Only subscribe to messages if we have a selected conversation
    // This ensures we only listen to the conversation the agent is viewing
    if (selectedConversation) {
      const conversationId = selectedConversation; // Capture for closure
      
      // Subscribe to messages for selected conversation
      const unsubscribe = subscribeToMessages(conversationId, (newMessages) => {
        // Verify this is still the selected conversation (prevent race conditions)
        if (selectedConversationRef.current !== conversationId) {
          console.log('Conversation changed, ignoring message update');
          return;
        }
        
        const mappedMessages = newMessages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date 
            ? msg.timestamp 
            : (msg.timestamp as any).toDate ? (msg.timestamp as any).toDate() : new Date()
        }));
        
        // Update both state and ref
        setMessages(mappedMessages);
        currentMessagesRef.current = mappedMessages;
        
        // Mark unread messages as read when they're loaded in the selected conversation
        // This indicates the agent has viewed them
        const unreadUserMessages = mappedMessages.filter(
          msg => msg.sender === 'user' && !msg.read && msg.conversationId === conversationId
        );
        
        if (unreadUserMessages.length > 0) {
          // Mark messages as read - badges will automatically disappear
          const messageIds = unreadUserMessages
            .map(m => m.id)
            .filter(Boolean) as string[];
          
          console.log('Marking', messageIds.length, 'unread messages as read for conversation:', conversationId);
          markMessagesAsReadByIds(messageIds).then(() => {
            console.log('Messages marked as read, badges should disappear');
          });
        }
      });

      return () => {
        unsubscribe();
      };
    } else {
      setMessages([]);
      currentMessagesRef.current = [];
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || !selectedConversation) return;

    setIsLoading(true);
    try {
      await sendAgentMessage(messageText, selectedConversation, agentId, agentName);
      // Messages are already marked as read when loaded, so no need to mark again here
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUnreadCount = (conversationId: string): number => {
    return unreadCounts[conversationId] || 0;
  };

  const getTotalUnreadCount = (): number => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  };

  const formatTime = (timestamp: any): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <div className="flex h-screen relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Conversations Sidebar */}
        <div className={`absolute sm:relative w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-50 h-full transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        }`}>
          <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-600 dark:bg-blue-700 text-white">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-lg sm:text-xl font-bold">Agent Dashboard</h1>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = '/';
                  }}
                  className="text-xs sm:text-sm hover:underline"
                >
                  User View
                </a>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="sm:hidden text-white hover:bg-blue-700 dark:hover:bg-blue-600 rounded p-1"
                  aria-label="Close sidebar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={agentName}
                onChange={(e) => {
                  setAgentName(e.target.value);
                  localStorage.setItem('supportWidget_agentName', e.target.value);
                }}
                className="text-sm bg-blue-700 dark:bg-blue-600 border border-blue-500 dark:border-blue-400 rounded px-2 py-1.5 sm:py-1 flex-1 text-white placeholder-blue-200 dark:placeholder-blue-300"
                placeholder="Your name"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-2">
              <div className="flex items-center justify-between mb-2 px-2">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Active Conversations ({conversations.length})
                </h2>
                {getTotalUnreadCount() > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1">
                    {getTotalUnreadCount()} new
                  </span>
                )}
              </div>
            </div>
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <p>No active conversations</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {conversations.map((conversation) => {
                  const unreadCount = getUnreadCount(conversation.id);
                  // hasUnread is true only when unreadCount > 0
                  const hasUnread = unreadCount > 0;
                  const isSelected = selectedConversation === conversation.id;
                  
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => {
                        // Only change selection on explicit user click
                        console.log('User clicked conversation:', conversation.id);
                        setSelectedConversation(conversation.id);
                        // Close sidebar on mobile after selection
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left p-2.5 sm:p-3 rounded-lg transition-colors touch-manipulation ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 dark:border-blue-400'
                          : hasUnread
                          ? 'bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'
                          : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Red dot indicator - only show if unread and not selected */}
                          {hasUnread && !isSelected && (
                            <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full"></span>
                          )}
                          <span className={`text-sm font-medium truncate ${
                            hasUnread 
                              ? 'text-gray-900 dark:text-gray-100 font-bold' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            User: {conversation.userId.substring(0, 12)}...
                          </span>
                        </div>
                        {/* Badge - only show if there are unread messages */}
                        {hasUnread && (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center flex-shrink-0 ml-2">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {conversation.assignedAgentName && (
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            {conversation.assignedAgentName} •{' '}
                          </span>
                        )}
                        {formatTime(conversation.updatedAt)}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            conversation.status === 'active'
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {conversation.status}
                        </span>
                        {/* "New message" label - only show if unread and not selected */}
                        {hasUnread && !isSelected && (
                          <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                            New message{unreadCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 transition-colors">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="sm:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0"
                      aria-label="Open sidebar"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                        Conversation with User
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                        {conversations.find(c => c.id === selectedConversation)?.userId}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 active:text-gray-900 dark:active:text-gray-200 flex-shrink-0 touch-manipulation"
                    aria-label="Close conversation"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 transition-colors">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <>
                    <MessageList messages={messages} />
                    <div ref={messagesEndRef} />
                  </>
                )}
                {isLoading && (
                  <div className="flex justify-center my-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <MessageInput 
                onSendMessage={handleSendMessage} 
                disabled={isLoading} 
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="sm:hidden mb-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Open Conversations
                </button>
                <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-base sm:text-lg font-medium">Select a conversation to start chatting</p>
                <p className="text-xs sm:text-sm mt-2">Choose a conversation from the sidebar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
