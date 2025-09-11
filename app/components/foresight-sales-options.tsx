'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRole } from './role-context';
import { store } from './store';
import { merge, groupByDept } from './bom/engine';

// Mock BOM data for demonstration
const baseItemsForModel = {
  '26': [
    { id: 'hull-26', name: 'Hull Mold - 26ft', category: 'Lamination', quantity: 1, department: 'Lamination' },
    { id: 'deck-26', name: 'Deck Mold - 26ft', category: 'Lamination', quantity: 1, department: 'Lamination' },
    { id: 'console-std', name: 'Standard Console', category: 'Assembly', quantity: 1, department: 'Assembly' },
    { id: 'engine-yamaha', name: 'Yamaha 300HP', category: 'Rigging', quantity: 1, department: 'Rigging' }
  ],
  '40': [
    { id: 'hull-40', name: 'Hull Mold - 40ft', category: 'Lamination', quantity: 1, department: 'Lamination' },
    { id: 'deck-40', name: 'Deck Mold - 40ft', category: 'Lamination', quantity: 1, department: 'Lamination' },
    { id: 'console-xl', name: 'XL Console', category: 'Assembly', quantity: 1, department: 'Assembly' },
    { id: 'engine-twin', name: 'Twin Yamaha 350HP', category: 'Rigging', quantity: 2, department: 'Rigging' }
  ]
};

const optionRulesForModel = {
  'hard_top': {
    adds: [
      { id: 'ht-frame', name: 'Hard Top Frame', category: 'Assembly', quantity: 1, department: 'Assembly' },
      { id: 'ht-canvas', name: 'Hard Top Canvas', category: 'Assembly', quantity: 1, department: 'Assembly' }
    ],
    removes: []
  },
  'stereo_upgrade': {
    adds: [
      { id: 'jl-speakers', name: 'JL Audio Speakers', category: 'Electronics', quantity: 4, department: 'Rigging' },
      { id: 'jl-amp', name: 'JL Audio Amplifier', category: 'Electronics', quantity: 1, department: 'Rigging' }
    ],
    removes: [{ id: 'std-radio', name: 'Standard Radio' }]
  },
  'twin_livewells': {
    adds: [
      { id: 'livewell-pump', name: 'Livewell Pump', category: 'Plumbing', quantity: 2, department: 'Assembly' },
      { id: 'livewell-tank', name: 'Livewell Tank', category: 'Plumbing', quantity: 2, department: 'Assembly' }
    ],
    removes: []
  }
};

const availableOptions = [
  { id: 'hard_top', name: 'Hard Top', price: 8500 },
  { id: 'stereo_upgrade', name: 'JL Audio Stereo Upgrade', price: 3200 },
  { id: 'twin_livewells', name: 'Twin Livewells', price: 1800 },
  { id: 'trim_tabs', name: 'Bennett Trim Tabs', price: 1200 },
  { id: 'bow_thruster', name: 'Bow Thruster', price: 4500 },
  { id: 'electronics_pkg', name: 'Garmin Electronics Package', price: 5200 }
];

function colorFreezeWarning(boat: any): { overdue: boolean; msg: string } {
  if (!boat?.color_freeze_by) {
    return { overdue: false, msg: 'Freeze date not set' };
  }
  
  const freezeDate = new Date(boat.color_freeze_by);
  const now = new Date();
  const overdue = now > freezeDate;
  
  if (overdue) {
    const daysOverdue = Math.floor((now.getTime() - freezeDate.getTime()) / (1000 * 60 * 60 * 24));
    return { 
      overdue: true, 
      msg: `Color selection was due ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago` 
    };
  } else {
    const daysLeft = Math.ceil((freezeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { 
      overdue: false, 
      msg: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining` 
    };
  }
}

export default function ForesightSalesOptions() {
  const { role, can } = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mounted, setMounted] = useState(false);
  const [activeBoatId, setActiveBoatId] = useState<string | null>(null);
  const [boat, setBoatData] = useState<any>(null);
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [gelcoat, setGelcoat] = useState<string>('');
  const [showReopenWarning, setShowReopenWarning] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const boats = store.listBoats();

  // Initialize from URL params or existing config
  useEffect(() => {
    const boatParam = searchParams.get('boat');
    if (boatParam) {
      setActiveBoatId(boatParam);
      const boatData = store.getBoat(boatParam);
      if (boatData) {
        setBoatData(boatData);
        setOptionIds(boatData.selected_options || []);
        setGelcoat(boatData.gelcoat_color || '');
      }
    }
  }, [searchParams]);

  // Update boat data when activeBoatId changes
  useEffect(() => {
    if (activeBoatId) {
      const boatData = store.getBoat(activeBoatId);
      if (boatData) {
        setBoatData(boatData);
        setOptionIds(boatData.selected_options || []);
        setGelcoat(boatData.gelcoat_color || '');
        
        // Check for reopen warning from sessionStorage
        const reopenWarning = sessionStorage.getItem('salesReopenWarning');
        if (reopenWarning) {
          const warning = JSON.parse(reopenWarning);
          if (warning.boatId === activeBoatId) {
            setShowReopenWarning(true);
          }
        }
      }
    }
  }, [activeBoatId]);

  const handleBoatSelect = (boatId: string) => {
    setActiveBoatId(boatId);
    router.push(`/sales/options?boat=${encodeURIComponent(boatId)}`);
  };

  const handleOptionToggle = (optionId: string) => {
    if (!can('edit_order')) return;
    
    setOptionIds(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleSave = () => {
    if (!activeBoatId || !can('edit_order')) return;
    
    store.setBoat(activeBoatId, {
      selected_options: optionIds,
      gelcoat_color: gelcoat || null
    });
    
    alert('Configuration saved as draft');
  };

  const handleFinalize = () => {
    if (!activeBoatId || !can('edit_order')) return;
    
    const cfg = { optionIds, gelcoatColor: gelcoat || '' };
    store.saveFinalConfig(activeBoatId, cfg);
    store.setBoat(activeBoatId, { wasFinalizedOnce: true, config_stage: 'finalized' });
    
    // Show success message and redirect to Customer Card with CTAs
    const boat = store.getBoat(activeBoatId);
    const message = `Configuration finalized for ${boat?.customer || 'boat'} - ${boat?.model}' boat`;
    
    // Store success message for the customer page
    sessionStorage.setItem('salesSuccessMessage', JSON.stringify({
      type: 'finalize',
      message,
      boatId: activeBoatId,
      boat
    }));
    
    // Redirect to customer card/details page instead of picklist
    router.push(`/sales?view=active&boat=${encodeURIComponent(activeBoatId)}`);
  };

  const handleReopen = () => {
    if (!activeBoatId || !can('edit_order')) return;
    
    store.setBoat(activeBoatId, { config_stage: 'draft' });
    setBoatData(prev => ({ ...prev, config_stage: 'draft' }));
    
    // Always show reopen warning banner (stays on options page)
    setShowReopenWarning(true);
    
    // Store reopen message for persistent yellow warning
    sessionStorage.setItem('salesReopenWarning', JSON.stringify({
      boatId: activeBoatId,
      message: 'Reopened for editing - production unchanged until re-finalized'
    }));
    
    // Stay on current page (/sales/options) - don't navigate anywhere
  };

  // Compute picklist preview
  const finalItems = boat ? merge(
    baseItemsForModel[boat.model as keyof typeof baseItemsForModel] || [],
    optionRulesForModel,
    optionIds
  ) : [];
  const grouped = groupByDept(finalItems);

  const freezeInfo = boat ? colorFreezeWarning(boat) : { overdue: false, msg: '' };
  const isAdmin = can('edit_order');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Sales Options</h1>
          {(role === 'admin' || role === 'plant_manager') && (
            <button 
              onClick={() => router.push('/sales')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Sales
            </button>
          )}
        </div>

        {/* Boat Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Select Boat</h2>
          {!mounted ? (
            // SSR/client initial pass match: simple skeleton/placeholder
            <div className="h-10 border-2 border-gray-300 rounded-md bg-gray-100" />
          ) : boats.length === 0 ? (
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
            {/* Status Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Configuration Status</h2>
              
              <div className="flex flex-wrap gap-4 items-center">
                {/* Config Stage */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    boat.config_stage === 'finalized' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {boat.config_stage === 'finalized' ? 'Finalized' : 'Draft'}
                  </span>
                </div>

                {/* Gelcoat Status */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Gelcoat:</span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    boat.gelcoat_color 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {boat.gelcoat_color || 'TBD'}
                  </span>
                </div>

                {/* Freeze-by Date */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Color Freeze:</span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    freezeInfo.overdue 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {freezeInfo.msg}
                  </span>
                </div>
              </div>

              {/* Reopen Warning Banner */}
              {showReopenWarning && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex">
                    <div className="text-sm text-yellow-800">
                      <strong>Reopened for editing:</strong> Production unchanged until re-finalized.
                      {freezeInfo.overdue && ' Color selection deadline has also passed.'}
                    </div>
                    <button
                      onClick={() => {
                        setShowReopenWarning(false);
                        // Clear from sessionStorage
                        sessionStorage.removeItem('salesReopenWarning');
                      }}
                      className="ml-auto text-yellow-600 hover:text-yellow-800"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Configuration Panel */}
              <div className="space-y-6">
                {/* Gelcoat Color */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4">Gelcoat Color</h3>
                  <input
                    type="text"
                    value={gelcoat}
                    onChange={(e) => setGelcoat(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="Enter gelcoat color"
                    className="w-full border-2 border-gray-300 rounded-md px-3 py-2 text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Options Selection */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4">Options</h3>
                  <div className="space-y-3">
                    {availableOptions.map(option => (
                      <label 
                        key={option.id} 
                        className={`flex items-center justify-between p-3 border border-gray-200 rounded-md ${
                          isAdmin ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={optionIds.includes(option.id)}
                            onChange={() => handleOptionToggle(option.id)}
                            disabled={!isAdmin}
                            className="mr-3 disabled:cursor-not-allowed"
                          />
                          <span className="text-gray-900">{option.name}</span>
                        </div>
                        <span className="font-medium text-gray-900">${option.price.toLocaleString()}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4">Actions</h3>
                    <div className="flex space-x-4">
                      {boat.config_stage === 'draft' ? (
                        <>
                          <button
                            onClick={handleSave}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium"
                          >
                            Save Draft
                          </button>
                          <button
                            onClick={handleFinalize}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
                          >
                            Finalize → Picklist
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleReopen}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md font-medium"
                        >
                          Reopen for Editing
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Picklist Preview */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Picklist Preview</h3>
                <div className="text-sm text-gray-600 mb-4">
                  This shows the final BOM that will be generated for production.
                </div>
                
                {Object.entries(grouped).map(([dept, items]) => (
                  <div key={dept} className="mb-6">
                    <h4 className="font-medium text-gray-800 mb-2 border-b border-gray-200 pb-1">
                      {dept}
                    </h4>
                    <div className="space-y-1">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-700">{item.name}</span>
                          <span className="text-gray-600">Qty: {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {Object.keys(grouped).length === 0 && (
                  <div className="text-gray-500 text-center py-4">
                    No items in BOM. Select options to see preview.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}