'use client';

import React from 'react';

// Type definitions
type Boat = {
  id: string;
  name: string;
  model: "26" | "40";
  department: "Assembly" | "Rigging" | "Lamination" | "Finishing";
  currentWeek: number;
  risk: "green" | "yellow" | "red";
  criticalShortCount: number;
};

type Shortage = {
  id: string;
  itemId: string;
  itemName: string;
  sku?: string;
  boatId: string;
  department: "Assembly" | "Rigging";
  needDate: string;
  status: "open" | "backordered" | "received";
  eta?: string;
  vendorId?: string;
};

type Vendor = { id: string; name: string; };

type Kpis = {
  deliveriesDueThisWeek: number;
  deliveriesLate: number;
  openPoCount: number;
};

type Alert = {
  id: string;
  message: string;
  createdAt: string;
};

// Dummy data
const boats: Boat[] = [
  { id: "1", name: "Johnson", model: "26", department: "Assembly", currentWeek: 2, risk: "yellow", criticalShortCount: 1 },
  { id: "2", name: "Simms", model: "40", department: "Rigging", currentWeek: 3, risk: "red", criticalShortCount: 2 },
  { id: "3", name: "Kennedy", model: "26", department: "Assembly", currentWeek: 1, risk: "green", criticalShortCount: 0 },
  { id: "4", name: "Miller", model: "40", department: "Rigging", currentWeek: 2, risk: "yellow", criticalShortCount: 1 },
  { id: "5", name: "Davis", model: "26", department: "Assembly", currentWeek: 4, risk: "green", criticalShortCount: 0 },
  { id: "6", name: "Wilson", model: "40", department: "Rigging", currentWeek: 1, risk: "yellow", criticalShortCount: 1 },
];

const shortages: Shortage[] = [
  { id: "1", itemId: "FT001", itemName: "Fuel Tank", sku: "FT-26-001", boatId: "1", department: "Assembly", needDate: "2025-09-18", status: "backordered", eta: "2025-09-19", vendorId: "ABC" },
  { id: "2", itemId: "CW001", itemName: "Console Windshield", sku: "CW-40-001", boatId: "2", department: "Rigging", needDate: "2025-09-22", status: "open", vendorId: "XYZ" },
  { id: "3", itemId: "PB001", itemName: "Pump Box Kit", sku: "PB-40-001", boatId: "2", department: "Rigging", needDate: "2025-09-23", status: "backordered", eta: "2025-09-26", vendorId: "ABC" },
  { id: "4", itemId: "WH001", itemName: "Wiring Harness", sku: "WH-40-001", boatId: "4", department: "Rigging", needDate: "2025-09-20", status: "open", vendorId: "DEF" },
  { id: "5", itemId: "ST001", itemName: "Steering Column", sku: "ST-40-001", boatId: "6", department: "Rigging", needDate: "2025-09-16", status: "backordered", eta: "2025-09-18", vendorId: "GHI" },
];

const vendors: Vendor[] = [
  { id: "ABC", name: "ABC Marine" },
  { id: "XYZ", name: "XYZ Components" },
  { id: "DEF", name: "DEF Electronics" },
  { id: "GHI", name: "GHI Systems" },
];

const kpis: Kpis = {
  deliveriesDueThisWeek: 3,
  deliveriesLate: 1,
  openPoCount: 10,
};

const alerts: Alert[] = [
  { id: "1", message: "Vendor ABC missed ship date on Fuel Tank (Johnson 26)", createdAt: "2025-09-09T09:30:00Z" },
  { id: "2", message: "Option change for Simms 40 — Pick List updated", createdAt: "2025-09-09T08:15:00Z" },
  { id: "3", message: "New PO required for Console Windshield (Simms 40)", createdAt: "2025-09-08T16:45:00Z" },
];

// Stub callbacks
const onOpenProductionSchedule = (boatId: string) => console.log('Open production schedule for boat:', boatId);
const onOpenPickList = (boatId: string) => console.log('Open pick list for boat:', boatId);
const onOpenPickListWithPart = (boatId: string, itemId: string) => console.log('Open pick list for boat:', boatId, 'item:', itemId);
const onOpenShortages = (boatId: string) => console.log('Open shortages for boat:', boatId);
const onCreatePoDraft = (itemId: string, vendorId?: string) => console.log('Create PO draft for item:', itemId, 'vendor:', vendorId);
const onUpdateStatus = (itemId: string) => console.log('Update status for item:', itemId);
const onOpenDeliveries = () => console.log('Open deliveries');
const onOpenLateDeliveries = () => console.log('Open late deliveries');
const onOpenPoList = () => console.log('Open PO list');
const onOpenAlert = (alertId: string) => console.log('Open alert:', alertId);

const PurchasingDashboard: React.FC = () => {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-green-100 text-green-800';
      case 'backordered': return 'bg-yellow-100 text-yellow-800';
      case 'open': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getSlipRisk = (boatId: string) => {
    const boat = boats.find(b => b.id === boatId);
    const boatShortages = shortages.filter(s => s.boatId === boatId);
    
    if (boatShortages.length === 0) return "On track";
    
    const hasLateItems = boatShortages.some(s => {
      if (!s.eta) return true;
      return new Date(s.eta) > new Date(s.needDate);
    });
    
    return hasLateItems ? "+2 days" : "+1 day";
  };

  const boatsAtRisk = boats.filter(b => b.risk !== 'green').slice(0, 4);
  const criticalShortagesTop8 = shortages
    .sort((a, b) => new Date(a.needDate).getTime() - new Date(b.needDate).getTime())
    .slice(0, 8);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Purchasing Dashboard</h1>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* 1. Boats in Production - Mini Timeline Strip */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Boats in Production</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {boats.map((boat) => (
              <div
                key={boat.id}
                className={`flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => onOpenProductionSchedule(boat.id)}
                title={`${boat.criticalShortCount} critical shortages`}
              >
                <div className={`h-12 w-32 ${getRiskColor(boat.risk)} rounded flex items-center justify-center text-white text-sm font-medium`}>
                  {boat.name} {boat.model}
                </div>
                <div className="text-xs text-gray-600 text-center mt-1">
                  {boat.department.slice(0, 3).toUpperCase()} Wk{boat.currentWeek}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 2. Boats at Risk */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Boats at Risk</h2>
            <div className="space-y-4">
              {boatsAtRisk.map((boat) => {
                const boatShortages = shortages.filter(s => s.boatId === boat.id);
                const shortageNames = boatShortages.map(s => s.itemName).join(', ');
                
                return (
                  <div key={boat.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{boat.name} {boat.model}</h3>
                        <p className="text-sm text-gray-600">{boat.department}</p>
                      </div>
                      <span className="text-sm font-medium text-red-600">
                        {getSlipRisk(boat.id)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">
                      {shortageNames || 'No shortages'}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => onOpenShortages(boat.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200"
                      >
                        Open Shortages
                      </button>
                      <button
                        onClick={() => onOpenPickList(boat.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200"
                      >
                        Open Pick List
                      </button>
                      <button
                        onClick={() => onOpenProductionSchedule(boat.id)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200"
                      >
                        Timeline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Deliveries & Vendor Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Deliveries & Vendor Status</h2>
            
            {/* KPI Tiles */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div 
                className="bg-blue-50 p-3 rounded-lg cursor-pointer hover:bg-blue-100"
                onClick={onOpenDeliveries}
              >
                <div className="text-2xl font-bold text-blue-600">{kpis.deliveriesDueThisWeek}</div>
                <div className="text-xs text-blue-700">Due This Week</div>
              </div>
              <div 
                className="bg-red-50 p-3 rounded-lg cursor-pointer hover:bg-red-100"
                onClick={onOpenLateDeliveries}
              >
                <div className="text-2xl font-bold text-red-600">{kpis.deliveriesLate}</div>
                <div className="text-xs text-red-700">Late</div>
              </div>
              <div 
                className="bg-gray-50 p-3 rounded-lg cursor-pointer hover:bg-gray-100"
                onClick={onOpenPoList}
              >
                <div className="text-2xl font-bold text-gray-600">{kpis.openPoCount}</div>
                <div className="text-xs text-gray-700">Open POs</div>
              </div>
            </div>

            {/* Alerts */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Recent Alerts</h3>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded cursor-pointer hover:bg-yellow-100"
                    onClick={() => onOpenAlert(alert.id)}
                  >
                    <p className="text-sm text-gray-800">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(alert.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Critical Shortages */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Critical Shortages</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-sm font-medium text-gray-500 pb-2">Part Name</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-2">Boat (Dept + Need Date)</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-2">Status</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-2">ETA</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {criticalShortagesTop8.map((shortage) => {
                  const boat = boats.find(b => b.id === shortage.boatId);
                  const vendor = vendors.find(v => v.id === shortage.vendorId);
                  
                  return (
                    <tr key={shortage.id} className="border-b border-gray-100">
                      <td className="py-3">
                        <div className="font-medium text-gray-900">{shortage.itemName}</div>
                        {shortage.sku && <div className="text-xs text-gray-500">{shortage.sku}</div>}
                      </td>
                      <td className="py-3">
                        <div className="text-sm text-gray-900">
                          {boat?.name} {boat?.model} ({shortage.department.slice(0, 3)})
                        </div>
                        <div className="text-xs text-gray-500">{formatDate(shortage.needDate)}</div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(shortage.status)}`}>
                          {shortage.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-900">
                        {shortage.eta ? formatDate(shortage.eta) : '—'}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => onCreatePoDraft(shortage.itemId, shortage.vendorId)}
                            className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded hover:bg-green-200"
                          >
                            Create PO
                          </button>
                          <button
                            onClick={() => onUpdateStatus(shortage.itemId)}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200"
                          >
                            Update
                          </button>
                          <button
                            onClick={() => onOpenPickListWithPart(shortage.boatId, shortage.itemId)}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200"
                          >
                            Pick List
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchasingDashboard;