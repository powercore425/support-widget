import { useState } from 'react';
import SupportWidget from './components/SupportWidget';
import AgentDashboard from './components/AgentDashboard';
import ThemeToggle from './components/ThemeToggle';
import { seedFAQs } from './scripts/seedFAQs';

function App() {
  const [view, setView] = useState<'user' | 'agent'>('user');
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedFAQs = async () => {
    setIsSeeding(true);
    try {
      await seedFAQs();
      alert('FAQs seeded successfully!');
    } catch (error) {
      console.error('Error seeding FAQs:', error);
      alert('Error seeding FAQs. Check console for details.');
    } finally {
      setIsSeeding(false);
    }
  };

  if (view === 'agent') {
    return <AgentDashboard />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-8 transition-colors">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Support Widget Demo
          </h1>
          <div className="flex flex-row gap-2 items-start sm:items-center">
            <ThemeToggle />
            {
              /*
              <button
                onClick={handleSeedFAQs}
                disabled={isSeeding}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 dark:bg-blue-500 dark:hover:bg-blue-600 dark:active:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors touch-manipulation text-sm sm:text-base"
              >
                {isSeeding ? 'Seeding...' : 'Seed FAQs'}
              </button>
              */
            }
            <button
              onClick={() => setView('agent')}
              className="bg-green-600 hover:bg-green-700 active:bg-green-800 dark:bg-green-500 dark:hover:bg-green-600 dark:active:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors touch-manipulation text-sm sm:text-base"
            >
              Agent Dashboard
            </button>
          </div>
        </div>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 sm:mb-8">
          Click the chat button in the bottom right corner to open the support widget.
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 transition-colors">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">Features:</h2>
          <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-700 dark:text-gray-300">
            <li>Send messages to the help center</li>
            <li>Get relevant FAQs based on your questions</li>
            <li>Real-time chat with support agents</li>
            <li>Firebase integration for data storage</li>
            <li>Agent dashboard for support team</li>
          </ul>
        </div>
      </div>
      <SupportWidget />
    </div>
  );
}

export default App;
