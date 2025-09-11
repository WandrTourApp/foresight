'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRole } from './role-context';
import { store } from './store';

interface VendorPart {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  category: string;
  pickLocation: string;
  staging: { location: string; quantity: number }[];
  source: 'vendor' | 'internal';
}

interface PickingState {
  expandedPart: string | null;
  isStagingComplete: Record<string, boolean>;
  pickedStatus: Record<string, 'none' | 'all' | 'shortage'>;
  shortageQuantities: Record<string, string>;
  selectedStagingLocation: Record<string, string>;
}

// Mock vendor parts data with picking and staging info
const mockVendorParts: Record<string, VendorPart[]> = {
  'boat-1': [
    // Assembly Hull
    { 
      id: '1', 
      sku: 'CLEAT-SS-8', 
      name: 'Stainless Steel Cleat 8"', 
      quantity: 6, 
      category: 'Assembly Hull', 
      source: 'vendor', 
      pickLocation: 'Bin A-12',
      staging: [
        { location: 'Hull Assembly Bay A', quantity: 4 },
        { location: 'Hull Assembly Bay B', quantity: 2 }
      ]
    },
    { 
      id: '2', 
      sku: 'RAIL-SS-36', 
      name: 'SS Rail 36"', 
      quantity: 4, 
      category: 'Assembly Hull', 
      source: 'vendor', 
      pickLocation: 'Bin A-15',
      staging: [
        { location: 'Hull Assembly Bay A', quantity: 4 }
      ]
    },
    { 
      id: '3', 
      sku: 'HINGE-SS-4', 
      name: 'SS Hinge 4"', 
      quantity: 8, 
      category: 'Assembly Hull', 
      source: 'vendor', 
      pickLocation: 'Bin A-18',
      staging: [
        { location: 'Console Assembly', quantity: 4 },
        { location: 'Hatch Assembly', quantity: 4 }
      ]
    },
    
    // Hull Options
    { 
      id: '4', 
      sku: 'HARDTOP-KIT', 
      name: 'Hard Top Frame Kit', 
      quantity: 1, 
      category: 'Hull Options', 
      source: 'vendor', 
      pickLocation: 'Hardtop Rack HT-1',
      staging: [
        { location: 'Hardtop Assembly Bay', quantity: 1 }
      ]
    },
    
    // Rigging
    { 
      id: '8', 
      sku: 'HARNESS-MAIN', 
      name: 'Main Wiring Harness', 
      quantity: 1, 
      category: 'Rigging', 
      source: 'vendor', 
      pickLocation: 'Rigging Bin R-1',
      staging: [
        { location: 'Rigging Shelf A', quantity: 1 }
      ]
    },
    { 
      id: '9', 
      sku: 'SWITCH-PANEL', 
      name: 'Switch Panel', 
      quantity: 1, 
      category: 'Rigging', 
      source: 'vendor', 
      pickLocation: 'Rigging Bin R-3',
      staging: [
        { location: 'Console Rigging', quantity: 1 }
      ]
    },
    { 
      id: '10', 
      sku: 'GARMIN-9227', 
      name: 'Garmin 9227 MFD', 
      quantity: 1, 
      category: 'Rigging', 
      source: 'vendor', 
      pickLocation: 'Electronics Bin R-12',
      staging: [
        { location: 'Console Electronics', quantity: 1 }
      ]
    },
    
    // Finishing
    { 
      id: '12', 
      sku: 'WINDSHIELD-26', 
      name: 'Windshield Assembly 26"', 
      quantity: 1, 
      category: 'Finishing', 
      source: 'vendor', 
      pickLocation: 'Finishing Rack F-1',
      staging: [
        { location: 'Finishing Assembly A', quantity: 1 }
      ]
    }
  ]
};

export default function ForesightImprovedBomPicker() {
  const { role, can } = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeBoatId, setActiveBoatId] = useState<string | null>(null);
  const [boat, setBoatData] = useState<any>(null);
  const [autoCollapseCompleted, setAutoCollapseCompleted] = useState(false);
  
  // Picking state management
  const [pickingState, setPickingState] = useState<PickingState>({
    expandedPart: null,
    isStagingComplete: {},
    pickedStatus: {},
    shortageQuantities: {},
    selectedStagingLocation: {}
  });

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
  const picklist = useMemo(() => {
    if (!activeBoatId) return [];
    // In real app, would use BOM engine with vendor filter
    const parts = mockVendorParts[activeBoatId] || mockVendorParts['boat-1'];
    
    // Sort by picking location for optimized route
    return parts.sort((a, b) => a.pickLocation.localeCompare(b.pickLocation));
  }, [activeBoatId]);

  const handleBoatSelect = (boatId: string) => {
    setActiveBoatId(boatId);
    setPickingState({
      expandedPart: null,
      isStagingComplete: {},
      pickedStatus: {},
      shortageQuantities: {},
      selectedStagingLocation: {}
    });
    router.push(`/picklist?boat=${encodeURIComponent(boatId)}`);
  };

  const handlePartClick = (partId: string) => {
    setPickingState(prev => ({
      ...prev,
      expandedPart: prev.expandedPart === partId ? null : partId
    }));
  };

  const handlePickStatusChange = useCallback((partId: string, status: 'all' | 'shortage') => {
    setPickingState(prev => ({
      ...prev,
      pickedStatus: {
        ...prev.pickedStatus,
        [partId]: status
      },
      shortageQuantities: {
        ...prev.shortageQuantities,
        [partId]: status === 'shortage' ? (prev.shortageQuantities[partId] || '') : ''
      },
      // Only auto-collapse if toggle is enabled and part is fully completed
      expandedPart: (autoCollapseCompleted && status === 'all' && prev.isStagingComplete[partId]) ? null : prev.expandedPart
    }));
  }, [autoCollapseCompleted]);

  const handleShortageInput = useCallback((partId: string, value: string) => {
    setPickingState(prev => ({
      ...prev,
      shortageQuantities: {
        ...prev.shortageQuantities,
        [partId]: value
      }
    }));
  }, []);

  const handleShortageInputComplete = useCallback((partId: string, value: string) => {
    if (value !== '' && !isNaN(Number(value))) {
      setPickingState(prev => ({
        ...prev,
        shortageQuantities: {
          ...prev.shortageQuantities,
          [partId]: value
        },
        // Only auto-collapse if toggle is enabled and part is fully completed
        expandedPart: (autoCollapseCompleted && prev.isStagingComplete[partId]) ? null : prev.expandedPart
      }));
    }
  }, [autoCollapseCompleted]);
  
  const handleNoneLeft = useCallback((partId: string) => {
    setPickingState(prev => ({
      ...prev,
      shortageQuantities: {
        ...prev.shortageQuantities,
        [partId]: '0'
      },
      // Only auto-collapse if toggle is enabled and part is fully completed
      expandedPart: (autoCollapseCompleted && prev.isStagingComplete[partId]) ? null : prev.expandedPart
    }));
  }, [autoCollapseCompleted]);

  const handleCheckAllStaging = useCallback((partId: string) => {
    setPickingState(prev => ({
      ...prev,
      isStagingComplete: {
        ...prev.isStagingComplete,
        [partId]: true
      },
      // Auto-collapse if toggle is enabled and part is fully completed (picked + staged)
      expandedPart: (autoCollapseCompleted && prev.pickedStatus[partId] !== 'none') ? null : prev.expandedPart
    }));
  }, [autoCollapseCompleted]);

  const handleStagingLocationSelect = useCallback((partId: string, location: string) => {
    setPickingState(prev => ({
      ...prev,
      selectedStagingLocation: {
        ...prev.selectedStagingLocation,
        [partId]: location
      }
    }));
  }, []);

  const handleConfirmStaging = useCallback((partId: string) => {
    setPickingState(prev => ({
      ...prev,
      isStagingComplete: {
        ...prev.isStagingComplete,
        [partId]: true
      },
      // Don't auto-collapse for the new flow - keep expanded to show completion
      // expandedPart stays as is
    }));
  }, []);

  const handleReset = useCallback(() => {
    setPickingState({
      expandedPart: null,
      isStagingComplete: {},
      pickedStatus: {},
      shortageQuantities: {},
      selectedStagingLocation: {}
    });
  }, []);

  const getPartStatus = (part: VendorPart) => {
    const pickStatus = pickingState.pickedStatus[part.id] || 'none';
    const stagingComplete = pickingState.isStagingComplete[part.id] || false;
    
    if (pickStatus === 'none') return { status: 'pending', color: 'bg-gray-100 text-gray-800', text: 'Pending' };
    if (pickStatus === 'all' && stagingComplete) return { status: 'complete', color: 'bg-green-100 text-green-800', text: 'Complete' };
    if (pickStatus === 'shortage' && stagingComplete) return { status: 'shortage', color: 'bg-orange-100 text-orange-800', text: 'Shortage' };
    if (pickStatus !== 'none' && !stagingComplete) return { status: 'picked', color: 'bg-blue-100 text-blue-800', text: 'Picked - Need Staging' };
    return { status: 'pending', color: 'bg-gray-100 text-gray-800', text: 'Pending' };
  };

  const renderPartDetail = (part: VendorPart) => {
    const pickStatus = pickingState.pickedStatus[part.id] || 'none';
    const shortageQty = pickingState.shortageQuantities[part.id] || '';
    const stagingComplete = pickingState.isStagingComplete[part.id] || false;
    
    const getPickButtonClass = (status: string) => {
      if (pickStatus === status) return 'text-white';
      return 'text-gray-800';
    };

    const getPickButtonColor = (status: string) => {
      if (pickStatus === status) {
        return status === 'all' ? 'bg-green-500' : 'bg-red-500';
      }
      return 'bg-gray-200 hover:bg-gray-300';
    };
    
    return (
      <div className="space-y-6 mt-4 border-t border-gray-200 pt-4">
        {/* Picking Section */}
        <div className={`rounded-md p-6 shadow-md transition-colors ${
          pickStatus === 'all' ? 'bg-green-100' : 
          pickStatus === 'shortage' ? 'bg-red-100' : 'bg-white'
        }`}>
          <h4 className="text-xl font-bold text-blue-600 border-b-2 border-blue-200 pb-2">
            PICKING INSTRUCTIONS
          </h4>
          <div className="mt-4 space-y-3">
            <p className="text-gray-700 text-lg">
              <span className="font-semibold">PICK:</span> Go to{' '}
              <span className="text-orange-500 font-bold">{part.pickLocation}</span> and grab{' '}
              <span className="font-bold">{part.quantity}</span> of the following part:
            </p>
            <p className="font-extrabold text-xl ml-4 text-gray-900">{part.name}</p>
            <p className="text-sm text-gray-600 ml-4">SKU: {part.sku}</p>
          </div>
          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => handlePickStatusChange(part.id, 'all')}
              className={`px-6 py-3 rounded-full font-bold transition-colors shadow-sm ${
                getPickButtonClass('all')} ${getPickButtonColor('all')
              }`}
            >
              Picked All
            </button>
            <button
              onClick={() => handlePickStatusChange(part.id, 'shortage')}
              className={`px-6 py-3 rounded-full font-bold transition-colors shadow-sm ${
                getPickButtonClass('shortage')} ${getPickButtonColor('shortage')
              }`}
            >
              Report Shortage
            </button>
          </div>
          {pickStatus === 'shortage' && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-red-500 font-semibold">
                How many did you actually pick? (Need {part.quantity})
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={shortageQty}
                  onChange={(e) => handleShortageInput(part.id, e.target.value)}
                  onBlur={(e) => handleShortageInputComplete(part.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleShortageInputComplete(part.id, (e.target as HTMLInputElement).value);
                    }
                  }}
                  className="w-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="0"
                  min="0"
                  max={part.quantity}
                />
                <button
                  onClick={() => handleNoneLeft(part.id)}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-full font-medium hover:bg-gray-300"
                >
                  None Left
                </button>
              </div>
              {shortageQty !== '' && (
                <p className="text-sm text-red-600 font-medium">
                  Shortage: {part.quantity - parseInt(shortageQty || '0')} parts missing
                </p>
              )}
            </div>
          )}
        </div>
  
        {/* Staging Section */}
        <div className={`rounded-md p-6 shadow-md transition-colors ${
          stagingComplete ? 'bg-green-100' : 
          pickStatus === 'shortage' ? 'bg-orange-50' : 'bg-white'
        }`}>
          <h4 className="text-xl font-bold text-blue-600 border-b-2 border-blue-200 pb-2">
            STAGING INSTRUCTIONS
          </h4>
          {pickStatus === 'shortage' && shortageQty !== '' ? (
            <div className="mt-4 space-y-3">
              <p className="text-orange-600 font-semibold mb-2">
                Only {shortageQty} parts available - stage what you have:
              </p>
              <ul className="space-y-3 list-disc list-inside">
                {(() => {
                  const availableParts = parseInt(shortageQty || '0');
                  let remainingParts = availableParts;
                  return part.staging.map((item, index) => {
                    const stagingQty = Math.min(item.quantity, remainingParts);
                    remainingParts -= stagingQty;
                    return (
                      <li key={index} className={`text-lg ${
                        stagingQty > 0 ? 'text-gray-700' : 'text-gray-400 line-through'
                      }`}>
                        Place <span className="font-bold">{stagingQty}</span> on the{' '}
                        <span className="text-orange-500 font-bold">{item.location}</span> shelf
                        {stagingQty === 0 && (
                          <span className="text-red-500 ml-2">(SKIP - No parts)</span>
                        )}
                      </li>
                    );
                  });
                })()}
              </ul>
            </div>
          ) : (
            <ul className="mt-4 space-y-3 list-disc list-inside">
              {part.staging.map((item, index) => (
                <li key={index} className="text-lg text-gray-700">
                  Place <span className="font-bold">{item.quantity}</span> on the{' '}
                  <span className="text-orange-500 font-bold">{item.location}</span> shelf.
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => handleCheckAllStaging(part.id)}
            className={`mt-4 px-6 py-3 rounded-full font-bold transition-colors shadow-sm ${
              stagingComplete 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-800 hover:bg-green-200'
            }`}
          >
            {stagingComplete ? 'Staging Complete!' : 'Check Off Staging'}
          </button>
        </div>
      </div>
    );
  };

  const renderPicklist = () => {
    if (picklist.length === 0) {
      return (
        <p className="text-gray-500 text-center py-8">Select a boat to begin picking.</p>
      );
    }

    const completedCount = picklist.filter(part => {
      const pickStatus = pickingState.pickedStatus[part.id] || 'none';
      const stagingComplete = pickingState.isStagingComplete[part.id] || false;
      return pickStatus !== 'none' && stagingComplete;
    }).length;

    return (
      <div className="space-y-4">
        {/* Progress Header */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Picking Progress: {completedCount} of {picklist.length} parts complete
              </h3>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(completedCount / picklist.length) * 100}%` }}
                />
              </div>
            </div>
            {completedCount === picklist.length && (
              <button 
                onClick={handleReset} 
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                🎉 All Complete! Reset
              </button>
            )}
          </div>
        </div>

        {/* Parts List */}
        {picklist.map((part) => {
          const partStatus = getPartStatus(part);
          const isExpanded = pickingState.expandedPart === part.id;
          
          return (
            <div key={part.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div
                onClick={() => handlePartClick(part.id)}
                className="p-2 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <h4 className="text-lg font-semibold text-gray-900">{part.name}</h4>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${partStatus.color}`}>
                        {partStatus.text}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      SKU: {part.sku} • Qty: {part.quantity} • Location: {part.pickLocation}
                    </div>
                  </div>
                  <div className="text-xl text-gray-400">
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </div>
              </div>
              
              {/* Inline Staging UI - appears when picked but not staged */}
              {partStatus.status === 'picked' && !pickingState.isStagingComplete[part.id] && (
                <div className="px-2 py-2 bg-blue-50 border-t border-blue-200">
                  <div className="flex items-center space-x-3 text-sm">
                    <span className="text-blue-800 font-medium">Stage to:</span>
                    <select 
                      value={pickingState.selectedStagingLocation[part.id] || ''}
                      onChange={(e) => handleStagingLocationSelect(part.id, e.target.value)}
                      className="px-2 py-1 border border-blue-300 rounded text-blue-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select location...</option>
                      {part.staging.map((stagingItem, index) => (
                        <option key={index} value={stagingItem.location}>
                          {stagingItem.location} ({stagingItem.quantity} needed)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleConfirmStaging(part.id)}
                      disabled={!pickingState.selectedStagingLocation[part.id]}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${ 
                        pickingState.selectedStagingLocation[part.id]
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
              
              {isExpanded && renderPartDetail(part)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Vendor Parts Picklist</h1>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={autoCollapseCompleted}
                onChange={(e) => setAutoCollapseCompleted(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Auto-collapse completed items
            </label>
          </div>
        </div>

        {/* Boat Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Select Boat</h2>
          {boats.length === 0 ? (
            <p className="text-gray-500">No boats available. Create boats from the Sales page first.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boats.map(boat => (
                <div
                  key={boat.id}
                  onClick={() => handleBoatSelect(boat.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    activeBoatId === boat.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900">{boat.customer}</h3>
                  <p className="text-sm text-gray-600">{boat.model}' Center Console</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      boat.config_stage === 'finalized'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {boat.config_stage === 'finalized' ? 'Finalized' : 'Draft'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {boat && (
          <>
            {/* Boat Status Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <h2 className="text-xl font-semibold">{boat.customer} - {boat.model}'</h2>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  boat.config_stage === 'finalized' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {boat.config_stage === 'finalized' ? 'Finalized' : 'Draft'}
                </span>
              </div>
            </div>

            {/* Picking Instructions */}
            {renderPicklist()}
          </>
        )}
      </div>
    </div>
  );
}