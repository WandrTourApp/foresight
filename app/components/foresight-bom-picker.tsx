'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRole } from './role-context';
import { store } from './store';

// Vendor parts data structure
interface VendorPart {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  category: string;
  location?: string;
  source: 'vendor' | 'internal';
  status?: 'open' | 'ordered' | 'received' | 'staged';
  vendor?: string;
  poRef?: string;
  eta?: string;
  backorder?: boolean;
  neededBy?: string;
}

interface LineStatus {
  status: 'open' | 'ordered' | 'received' | 'staged';
  vendor?: string;
  poRef?: string;
  eta?: string;
  backorder?: boolean;
  stagedLocation?: string;
}

// Mock vendor parts data - in real app, this would come from BOM engine
const mockVendorParts: Record<string, VendorPart[]> = {
  'boat-1': [
    // Assembly Hull
    { id: '1', sku: 'CLEAT-SS-8', name: 'Stainless Steel Cleat 8"', quantity: 6, category: 'Assembly Hull', source: 'vendor', location: 'A-12' },
    { id: '2', sku: 'RAIL-SS-36', name: 'SS Rail 36"', quantity: 4, category: 'Assembly Hull', source: 'vendor', location: 'A-15' },
    { id: '3', sku: 'HINGE-SS-4', name: 'SS Hinge 4"', quantity: 8, category: 'Assembly Hull', source: 'vendor', location: 'A-18' },
    
    // Hull Options
    { id: '4', sku: 'HARDTOP-KIT', name: 'Hard Top Frame Kit', quantity: 1, category: 'Hull Options', source: 'vendor', location: 'HT-1' },
    { id: '5', sku: 'HARDTOP-CANVAS', name: 'Hard Top Canvas', quantity: 1, category: 'Hull Options', source: 'vendor', location: 'HT-2' },
    
    // Liner
    { id: '6', sku: 'CUPHOLDER-SS', name: 'SS Cup Holder', quantity: 12, category: 'Liner', source: 'vendor', location: 'L-5' },
    { id: '7', sku: 'DRAIN-PLUG', name: 'Drain Plug Assembly', quantity: 4, category: 'Liner', source: 'vendor', location: 'L-8' },
    
    // Rigging
    { id: '8', sku: 'HARNESS-MAIN', name: 'Main Wiring Harness', quantity: 1, category: 'Rigging', source: 'vendor', location: 'R-1' },
    { id: '9', sku: 'SWITCH-PANEL', name: 'Switch Panel', quantity: 1, category: 'Rigging', source: 'vendor', location: 'R-3' },
    { id: '10', sku: 'GARMIN-9227', name: 'Garmin 9227 MFD', quantity: 1, category: 'Rigging', source: 'vendor', location: 'R-12' },
    { id: '11', sku: 'JL-SPEAKERS', name: 'JL Audio Speakers', quantity: 4, category: 'Rigging', source: 'vendor', location: 'R-15' },
    
    // Finishing
    { id: '12', sku: 'WINDSHIELD-26', name: 'Windshield Assembly 26"', quantity: 1, category: 'Finishing', source: 'vendor', location: 'F-1' },
    { id: '13', sku: 'CUSHION-SET', name: 'Cushion Set', quantity: 1, category: 'Finishing', source: 'vendor', location: 'F-8' },
  ]
};

export default function ForesightBomPicker() {
  const { role, can } = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeBoatId, setActiveBoatId] = useState<string | null>(null);
  const [boat, setBoatData] = useState<any>(null);
  const [lineStatuses, setLineStatuses] = useState<Record<string, LineStatus>>({});
  const [showChangeRequest, setShowChangeRequest] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const [printView, setPrintView] = useState(false);
  const [showStagingPane, setShowStagingPane] = useState(false);

  const boats = store.listBoats();
  
  // Initialize from URL params
  useEffect(() => {
    const boatParam = searchParams.get('boat');
    if (boatParam) {
      setActiveBoatId(boatParam);
      const boatData = store.getBoat(boatParam);
      if (boatData) {
        setBoatData(boatData);
      }
    }
  }, [searchParams]);

  // Get vendor parts for active boat
  const vendorParts = useMemo(() => {
    if (!activeBoatId) return [];
    // In real app, would use BOM engine with vendor filter
    return mockVendorParts[activeBoatId] || mockVendorParts['boat-1'];
  }, [activeBoatId]);

  // Group parts by category
  const groupedParts = useMemo(() => {
    const groups: Record<string, VendorPart[]> = {};
    vendorParts.forEach(part => {
      if (!groups[part.category]) {
        groups[part.category] = [];
      }
      groups[part.category].push(part);
    });
    return groups;
  }, [vendorParts]);

  // Get staged parts for staging pane
  const stagedParts = useMemo(() => {
    return vendorParts.filter(part => lineStatuses[part.id]?.status === 'staged');
  }, [vendorParts, lineStatuses]);

  const handleBoatSelect = (boatId: string) => {
    setActiveBoatId(boatId);
    router.push(`/picklist?boat=${encodeURIComponent(boatId)}`);
  };

  const handleOrder = (partId: string) => {
    const vendor = prompt('Enter vendor name:');
    const poRef = prompt('Enter PO/Reference:');
    const eta = prompt('Enter ETA (YYYY-MM-DD):');
    const backorder = confirm('Is this a backorder?');
    
    if (vendor && poRef) {
      setLineStatuses(prev => ({
        ...prev,
        [partId]: {
          status: 'ordered',
          vendor,
          poRef,
          eta: eta || undefined,
          backorder
        }
      }));
    }
  };

  const handleReceive = (partId: string) => {
    setLineStatuses(prev => ({
      ...prev,
      [partId]: {
        ...prev[partId],
        status: 'received'
      }
    }));
  };

  const handleStage = (partId: string) => {
    const location = prompt('Enter staging location:');
    if (location) {
      setLineStatuses(prev => ({
        ...prev,
        [partId]: {
          ...prev[partId],
          status: 'staged',
          stagedLocation: location
        }
      }));
    }
  };

  const handleReset = (partId: string) => {
    setLineStatuses(prev => {
      const newStatuses = { ...prev };
      delete newStatuses[partId];
      return newStatuses;
    });
  };

  const handleChangeRequest = (partId: string) => {
    setShowChangeRequest(partId);
    setChangeReason('');
  };

  const submitChangeRequest = () => {
    if (showChangeRequest && changeReason) {
      // In real app, save to PM queue
      console.log('Change request:', { boatId: activeBoatId, sku: showChangeRequest, reason: changeReason });
      alert('Change request submitted to Plant Manager');
      setShowChangeRequest(null);
      setChangeReason('');
    }
  };

  const handlePrint = () => {
    setPrintView(true);
    setTimeout(() => {
      window.print();
      setPrintView(false);
    }, 100);
  };

  const getStatusChip = (part: VendorPart) => {
    const status = lineStatuses[part.id];
    if (!status) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Open</span>;
    }
    
    const chips = [];
    
    // Main status chip
    const statusColors = {
      open: 'bg-gray-100 text-gray-800',
      ordered: 'bg-blue-100 text-blue-800',
      received: 'bg-green-100 text-green-800',
      staged: 'bg-purple-100 text-purple-800'
    };
    
    chips.push(
      <span key="status" className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status.status]}`}>
        {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
      </span>
    );
    
    // Backorder chip
    if (status.backorder) {
      chips.push(
        <span key="backorder" className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 ml-2">
          Backorder
        </span>
      );
    }
    
    // Vendor late chip
    if (status.eta && boat?.stations) {
      const etaDate = new Date(status.eta);
      const laminationStation = boat.stations.find((s: any) => s.name === 'Lamination');
      if (laminationStation) {
        const neededBy = new Date(laminationStation.start);
        if (etaDate > neededBy) {
          const daysLate = Math.floor((etaDate.getTime() - neededBy.getTime()) / (1000 * 60 * 60 * 24));
          chips.push(
            <span key="late" className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 ml-2">
              Late {daysLate}d
            </span>
          );
        }
      }
    }
    
    return <div className="flex items-center">{chips}</div>;
  };

  const isPurchasing = can('order_parts');
  const isStockroom = can('receive_parts');

  if (printView) {
    return (
      <div className="print-view p-8 bg-white">
        <h1 className="text-2xl font-bold mb-4">Vendor Parts Picklist</h1>
        <div className="mb-4">
          <p><strong>Boat:</strong> {boat?.customer} - {boat?.model}'</p>
          <p><strong>Due Date:</strong> {boat?.due_date ? new Date(boat.due_date).toLocaleDateString() : 'TBD'}</p>
        </div>
        {Object.entries(groupedParts).map(([category, parts]) => (
          <div key={category} className="mb-6">
            <h3 className="font-bold text-lg border-b border-gray-300 pb-1 mb-2">{category}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">SKU</th>
                  <th className="text-left py-1">Part</th>
                  <th className="text-center py-1">Qty</th>
                  <th className="text-left py-1">Location</th>
                  <th className="text-left py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {parts.map(part => (
                  <tr key={part.id} className="border-b">
                    <td className="py-1">{part.sku}</td>
                    <td className="py-1">{part.name}</td>
                    <td className="text-center py-1">{part.quantity}</td>
                    <td className="py-1">{part.location}</td>
                    <td className="py-1">{lineStatuses[part.id]?.status || 'Open'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Vendor Parts Picklist</h1>
          <div className="flex space-x-2">
            {(role === 'admin' || role === 'plant_manager') && (
              <button 
                onClick={() => router.push('/sales')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Back to Sales
              </button>
            )}
          </div>
        </div>

        {/* Boat Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Select Boat</h2>
          {boats.length === 0 ? (
            <p className="text-gray-500">No boats available. Create boats from the Sales page first.</p>
          ) : (
            <select
              value={activeBoatId || ''}
              onChange={(e) => handleBoatSelect(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-md px-3 py-2 text-gray-900"
            >
              <option value="">Select a boat...</option>
              {boats.map(boat => (
                <option key={boat.id} value={boat.id}>
                  {boat.customer} - {boat.model}' ({boat.config_stage})
                </option>
              ))}
            </select>
          )}
        </div>

        {boat && (
          <>
            {/* Boat Status Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4 items-center">
                  <h2 className="text-xl font-semibold">{boat.customer} - {boat.model}'</h2>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    boat.config_stage === 'finalized' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {boat.config_stage === 'finalized' ? 'Finalized' : 'Draft'}
                  </span>
                  {boat.color_freeze_by && (
                    <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                      Freeze: {new Date(boat.color_freeze_by).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                {/* Print Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePrint('single')}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium"
                  >
                    Print Picklist
                  </button>
                  <button
                    onClick={() => setShowStagingPane(!showStagingPane)}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      showStagingPane 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {showStagingPane ? 'Hide Staging' : `Show Staging (${stagedParts.length})`}
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content with Staging Pane Toggle */}
            <div className={`grid gap-6 ${showStagingPane ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
              <div className={showStagingPane ? 'lg:col-span-2' : 'col-span-1'}>
                {/* Vendor Parts List */}
                {vendorParts.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <p className="text-gray-500 text-lg">No vendor parts for this boat.</p>
                    <p className="text-gray-400 text-sm mt-2">All parts are internally manufactured.</p>
                  </div>
                ) : (
                  Object.entries(groupedParts).map(([category, parts]) => {
                    const nonStagedParts = parts.filter(part => lineStatuses[part.id]?.status !== 'staged');
                    if (nonStagedParts.length === 0) return null;
                    
                    return (
                      <div key={category} className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h3 className="text-lg font-semibold mb-4 border-b border-gray-200 pb-2">{category}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {nonStagedParts.map(part => {
                          const status = lineStatuses[part.id];
                          return (
                            <tr key={part.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{part.sku}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{part.name}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-center">{part.quantity}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{part.location}</td>
                              <td className="px-4 py-3 text-sm">{getStatusChip(part)}</td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex space-x-2">
                                  {/* Purchasing Actions */}
                                  {isPurchasing && (!status || status.status === 'open') && (
                                    <button
                                      onClick={() => handleOrder(part.id)}
                                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                    >
                                      Order Now
                                    </button>
                                  )}
                                  
                                  {/* Stockroom Actions */}
                                  {isStockroom && status?.status === 'ordered' && (
                                    <button
                                      onClick={() => handleReceive(part.id)}
                                      className="text-green-600 hover:text-green-900 text-sm font-medium"
                                    >
                                      Mark Received
                                    </button>
                                  )}
                                  
                                  {isStockroom && status?.status === 'received' && (
                                    <button
                                      onClick={() => handleStage(part.id)}
                                      className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                                    >
                                      Stage
                                    </button>
                                  )}
                                  
                                  {/* Reset Action */}
                                  {(isPurchasing || isStockroom) && status && (
                                    <button
                                      onClick={() => handleReset(part.id)}
                                      className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                                    >
                                      Reset
                                    </button>
                                  )}
                                  
                                  {/* Request Change - Available to all */}
                                  <button
                                    onClick={() => handleChangeRequest(part.id)}
                                    className="text-orange-600 hover:text-orange-900 text-sm font-medium"
                                  >
                                    Request Change
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
                    );
                  })
                )}
              </div>
              
              {/* Staging Pane */}
              {showStagingPane && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Staging Area</h3>
                    <button
                      onClick={() => setShowStagingPane(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  
                  {stagedParts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No parts staged yet</p>
                      <p className="text-sm mt-1">Use "Stage" to move received parts here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stagedParts.map(part => {
                        const status = lineStatuses[part.id];
                        return (
                          <div key={part.id} className="border border-green-200 bg-green-50 rounded-md p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm text-gray-900">{part.sku}</div>
                                <div className="text-sm text-gray-700">{part.name}</div>
                                <div className="text-xs text-gray-500">Qty: {part.quantity}</div>
                                {status?.stagedLocation && (
                                  <div className="text-xs text-green-600 mt-1">📍 {status.stagedLocation}</div>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleReset(part.id)}
                                  className="text-red-600 hover:text-red-800 text-xs font-medium"
                                >
                                  Unstage
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Change Request Modal */}
            {showChangeRequest && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                  <h3 className="text-lg font-semibold mb-4">Request Change</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    SKU: {vendorParts.find(p => p.id === showChangeRequest)?.sku}
                  </p>
                  <textarea
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="Enter reason for change..."
                    className="w-full border-2 border-gray-300 rounded-md px-3 py-2 text-gray-900 h-32"
                  />
                  <div className="flex justify-end space-x-4 mt-4">
                    <button
                      onClick={() => setShowChangeRequest(null)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitChangeRequest}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
                    >
                      Submit Request
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Links Footer */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <div className="flex space-x-4">
                <button
                  onClick={() => router.push(`/lamination?boat=${activeBoatId}`)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  → Lamination
                </button>
                <button
                  onClick={() => router.push(`/timeline-v2?boat=${activeBoatId}`)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  → Timeline
                </button>
                <button
                  onClick={() => router.push(`/tracker?boat=${activeBoatId}`)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  → Tracker
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .print-view {
            display: block !important;
          }
          body > *:not(.print-view) {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}