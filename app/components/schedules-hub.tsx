'use client';
import { useState } from 'react';
import Link from 'next/link';
import ForesightLaminationModule from './foresight-lamination-module';
import ForesightFinishingModule from './foresight-finishing-module';
import ForesightRiggingModule from './foresight-rigging-module';
import ForesightAssemblyModule from './foresight-assembly-module';

export default function SchedulesHub() {
  const [activeTab, setActiveTab] = useState('lamination');

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'lamination':
        return <ForesightLaminationModule />;
      case 'finishing':
        return <ForesightFinishingModule />;
      case 'rigging':
        return <ForesightRiggingModule />;
      case 'assembly':
        return <ForesightAssemblyModule />;
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'lamination', name: 'Lamination', color: 'orange' },
    { id: 'finishing', name: 'Finishing', color: 'green' },
    { id: 'rigging', name: 'Rigging', color: 'purple' },
    { id: 'assembly', name: 'Assembly', color: 'blue' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Schedules</h1>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? `border-${tab.color}-500 text-${tab.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {renderActiveModule()}
        </div>
      </div>
    </div>
  );
}
