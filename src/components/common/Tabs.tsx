import React, { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon: string;
  component: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
}

const Tabs: React.FC<TabsProps> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-dark-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 text-transparent bg-clip-text">
          Communication Hub
        </h1>
        <p className="text-gray-400 mt-1">
          Connect with Soundalchemy team and community members
        </p>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-dark-700">
          <div className="flex space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`h-full ${
                activeTab === tab.id ? 'block' : 'hidden'
              }`}
            >
              {tab.component}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Tabs; 