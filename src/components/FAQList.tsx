import { useState } from 'react';
import { FAQ } from '../firebase/services';

interface FAQListProps {
  faqs: FAQ[];
  onFAQClick: (faq: FAQ) => void;
  onStartChat?: () => void;
}

const FAQList = ({ faqs, onFAQClick, onStartChat }: FAQListProps) => {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const handleFAQClick = (faq: FAQ) => {
    // Toggle FAQ expansion - FAQs work independently, no chat messages
    if (expandedFAQ === faq.id) {
      setExpandedFAQ(null);
    } else {
      setExpandedFAQ(faq.id);
    }
    // Call parent handler if needed (currently not used but kept for compatibility)
    onFAQClick(faq);
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Frequently Asked Questions:</h3>
        {onStartChat && (
          <button
            onClick={onStartChat}
            className="text-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-600 dark:active:bg-blue-700 text-white px-3 py-2 sm:py-1 rounded-md transition-colors touch-manipulation w-full sm:w-auto"
          >
            Chat with Agent
          </button>
        )}
      </div>
      {faqs.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No FAQs available</p>
      ) : (
        faqs.map((faq) => (
          <div
            key={faq.id}
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all"
          >
            <button
              onClick={() => handleFAQClick(faq)}
              className="w-full text-left p-3 sm:p-3 hover:bg-blue-50 dark:hover:bg-gray-700 active:bg-blue-100 dark:active:bg-gray-600 transition-colors touch-manipulation"
            >
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{faq.question}</p>
                    <svg
                      className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform flex-shrink-0 ml-2 ${
                        expandedFAQ === faq.id ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {faq.category && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{faq.category}</p>
                  )}
                </div>
              </div>
            </button>
            {expandedFAQ === faq.id && (
              <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap break-words">{faq.answer}</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default FAQList;
