'use client';

import React, { useState } from 'react';

type Boat = {
  id: string;
  name: string;
  model: "26" | "40";
  department: "Assembly" | "Rigging" | "Lamination" | "Finishing";
  shortCount: number;
};

type ShelfAssignment = {
  shelf: 1 | 2;
  boatId: string | null;
};

type Alert = {
  id: string;
  kind: "received" | "backordered" | "late";
  partName: string;
  qty?: number;
  boatId: string;
  department: "Assembly" | "Rigging";
  eta?: string;
  createdAt: string;
};

const StockroomDashboard: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState("Main");

  // Dummy data
  const boats: Boat[] = [
    { id: "b1", name: "Johnson", model: "26", department: "Assembly", shortCount: 1 },
    { id: "b2", name: "Simms", model: "40", department: "Rigging", shortCount: 0 },
    { id: "b3", name: "Kennedy", model: "26", department: "Finishing", shortCount: 2 },
    { id: "b4", name: "Miller", model: "40", department: "Lamination", shortCount: 0 }
  ];

  const shelves: ShelfAssignment[] = [
    { shelf: 1, boatId: "b3" },
    { shelf: 2, boatId: "b4" }
  ];

  const alerts: Alert[] = [
    {
      id: "a1",
      kind: "received",
      partName: "Cupholder",
      qty: 1,
      boatId: "b1",
      department: "Assembly",
      createdAt: "2025-09-09T10:30:00Z"
    },
    {
      id: "a2",
      kind: "backordered",
      partName: "Fuel Valve",
      boatId: "b2",
      department: "Rigging",
      eta: "2025-09-18",
      createdAt: "2025-09-09T09:15:00Z"
    }
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Stub callbacks
  const onOpenPickList = (boatId: string): void => {
    console.log(`Opening pick list for boat: ${boatId}`);
  };

  const onOpenPickListWithPart = (boatId: string, partId?: string): void => {
    console.log(`Opening pick list for boat: ${boatId}, part: ${partId}`);
  };

  const onOpenProductionSchedule = (boatId: string): void => {
    console.log(`Opening production schedule for boat: ${boatId}`);
  };

  // Helper functions
  const getBoatById = (id: string) => boats.find(b => b.id === id);
  const boatsInProgress = boats.filter(b => b.department === "Assembly" || b.department === "Rigging");
  
  const getStatusDot = (shortCount: number) => shortCount === 0 ? "🟢" : "🔴";
  
  const getAlertIcon = (kind: string) => {
    switch (kind) {
      case "received": return "📦";
      case "backordered": return "⏳";
      case "late": return "⚠️";
      default: return "📋";
    }
  };

  const formatAlertMessage = (alert: Alert) => {
    const boat = getBoatById(alert.boatId);
    const boatName = boat ? `${boat.name} ${boat.model}` : "Unknown Boat";
    
    switch (alert.kind) {
      case "received":
        return `${alert.partName} (${alert.qty || 1}) received → Send to ${boatName} (${alert.department})`;
      case "backordered":
        return `${alert.partName} backordered for ${boatName} (${alert.department})${alert.eta ? ` — ETA ${new Date(alert.eta).toLocaleDateString()}` : ''}`;
      case "late":
        return `${alert.partName} late for ${boatName} (${alert.department})${alert.eta ? ` — Expected ${new Date(alert.eta).toLocaleDateString()}` : ''}`;
      default:
        return `${alert.partName} update for ${boatName} (${alert.department})`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Stockroom — Picker Dashboard</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="location" className="text-sm font-medium text-gray-700">
            Stockroom Location:
          </label>
          <select
            id="location"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Main">Main</option>
            <option value="Annex">Annex</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Boats in Progress */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Boats in Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {boatsInProgress.slice(0, 6).map((boat) => (
              <div key={boat.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{boat.name} {boat.model}</h3>
                    <p className="text-sm text-gray-600">{boat.department}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getStatusDot(boat.shortCount)}</span>
                    {boat.shortCount > 0 && (
                      <span className="text-sm text-red-600 font-medium">
                        {boat.shortCount} short{boat.shortCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onOpenPickList(boat.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Open Pick List
                  </button>
                  <button
                    onClick={() => onOpenProductionSchedule(boat.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Timeline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Shelves + Alerts */}
        <div className="space-y-8">
          {/* Staging Shelves */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Staging Shelves</h2>
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              {shelves.map((shelf) => {
                const boat = shelf.boatId ? getBoatById(shelf.boatId) : null;
                return (
                  <div 
                    key={shelf.shelf}
                    className={`p-4 flex items-center justify-between ${shelf.shelf === 1 ? 'border-b border-gray-200' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-700">Shelf {shelf.shelf}</span>
                      <span className="text-gray-400">→</span>
                      {boat ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{boat.name} {boat.model}</span>
                          <span className="text-sm">{getStatusDot(boat.shortCount)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">(empty)</span>
                      )}
                    </div>
                    {boat && (
                      <button
                        onClick={() => onOpenPickList(boat.id)}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        View
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Alerts</h2>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div 
                  key={alert.id}
                  onClick={() => onOpenPickListWithPart(alert.boatId, alert.id)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{getAlertIcon(alert.kind)}</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 leading-relaxed">
                        {formatAlertMessage(alert)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.createdAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockroomDashboard;