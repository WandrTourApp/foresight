'use client';

import LaminationDashboard from './lamination_dashboard';

export default function LaminationPage() {
  return (
    <main className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Lamination Department</h1>
        <div className="flex gap-3">
          <a 
            href="/lamination/schedule" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Lamination Schedule
          </a>
          <a 
            href="/lamination/parts" 
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Parts (Legacy View)
          </a>
        </div>
      </div>
      <LaminationDashboard />
    </main>
  );
}