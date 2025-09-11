'use client';

import LaminationDashboard from './lamination_dashboard';

export default function LaminationPage() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Lamination Department</h1>
      <LaminationDashboard />
    </main>
  );
}