'use client';

import { useRole } from '../components/role-context';
import ForesightImprovedBomPicker from '../components/foresight-improved-bom-picker';

export default function PicklistPage() {
  const { role } = useRole();
  const hasPicklistAccess = ['admin', 'plant_manager', 'stockroom'].includes(role);
  
  if (!hasPicklistAccess) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-red-800 mb-2">Access Restricted</h1>
            <p className="text-red-700 mb-4">
              You don't have permission to access the Picklist. This page is restricted to Admin, Plant Manager, and Stockroom roles.
            </p>
            <p className="text-sm text-red-600">
              Current role: <span className="font-medium">{role.replace('_', ' ').toUpperCase()}</span>
            </p>
          </div>
        </div>
      </main>
    );
  }
  
  return (
    <main>
      <ForesightImprovedBomPicker />
    </main>
  );
}