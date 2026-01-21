import { Message } from '../firebase/services';

interface MessageListProps {
  messages: Message[];
}

const formatTime = (date: Date | any): string => {
  const dateObj = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date());
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const MessageList = ({ messages }: MessageListProps) => {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const isUser = message.sender === 'user';
        const isAgent = message.sender === 'agent';
        
        return (
          <div
            key={message.id || index}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-3 py-2 sm:px-4 sm:py-2 ${
                isUser
                  ? 'bg-blue-600 text-white'
                  : isAgent
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              {isAgent && message.agentName && (
                <p className="text-xs font-semibold mb-1 opacity-90">
                  {message.agentName}
                </p>
              )}
              <p className="whitespace-pre-wrap text-sm break-words">{message.text}</p>
              <p
                className={`text-xs mt-1 ${
                  isUser ? 'text-blue-100' : isAgent ? 'text-green-100' : 'text-gray-500'
                }`}
              >
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
