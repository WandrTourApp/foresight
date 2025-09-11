'use client';

import { useState } from 'react';

interface CustomerPrintablesPanelProps {
  boat: {
    id: string;
    customer: string;
    model: string;
    hullColor?: string;
    options?: any[];
  };
}

export default function CustomerPrintablesPanel({ boat }: CustomerPrintablesPanelProps) {
  const [selectedPrint, setSelectedPrint] = useState<'options' | 'picklist' | null>(null);

  // Mock standard BOM data
  const standardBOM = [
    { partNumber: 'HULL-26-STD', description: '26\' Hull Mold', vendor: 'Fiberglass Supply Co', qty: 1, staging: 'Main Production Floor' },
    { partNumber: 'DECK-26-OPEN', description: 'Open Deck Assembly', vendor: 'Fiberglass Supply Co', qty: 1, staging: 'Main Production Floor' },
    { partNumber: 'CONSOLE-STD', description: 'Standard Console', vendor: 'Marine Console Mfg', qty: 1, staging: 'Console Station' },
    { partNumber: 'HELM-SEAT-STD', description: 'Standard Helm Seat', vendor: 'Boat Seat Supply', qty: 1, staging: 'Console Station' },
    { partNumber: 'NAV-LIGHT-LED', description: 'LED Navigation Light Set', vendor: 'Marine Electronics Co', qty: 1, staging: 'Rigging Bay' }
  ];

  // Mock options data
  const selectedOptions = [
    { partNumber: 'GAR-8612XSV', description: 'Garmin 8612xsv GPS/Fish Finder', vendor: 'Marine Electronics Co', qty: 1, staging: 'Console Station' },
    { partNumber: 'VHF-STD-25', description: 'Standard Horizon VHF Radio', vendor: 'Marine Electronics Co', qty: 1, staging: 'Console Station' },
    { partNumber: 'HELM-DLX-01', description: 'Deluxe Helm Seat - White', vendor: 'Boat Seat Supply', qty: 0, staging: 'Replaced by Deluxe', note: 'replaced by Deluxe Helm Seat' }
  ];

  // Merge standard BOM with options
  const getMergedPicklist = () => {
    const merged = [...standardBOM];
    
    // Add options
    selectedOptions.forEach(option => {
      if (option.qty > 0) {
        merged.push(option);
      } else if (option.note) {
        // Find and update conflicting standard items
        const conflictIndex = merged.findIndex(item => item.description.includes('Helm Seat'));
        if (conflictIndex >= 0) {
          merged[conflictIndex] = { ...merged[conflictIndex], qty: 0, note: option.note };
        }
      }
    });

    // Group by vendor
    const groupedByVendor = merged.reduce((acc, item) => {
      if (!acc[item.vendor]) {
        acc[item.vendor] = [];
      }
      acc[item.vendor].push(item);
      return acc;
    }, {} as Record<string, typeof merged>);

    return groupedByVendor;
  };

  const handlePrint = () => {
    window.print();
  };

  if (selectedPrint === 'options') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 print:p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h2 className="text-xl font-semibold">Options Sheet Preview</h2>
              <div className="space-x-2">
                <button 
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Print
                </button>
                <button 
                  onClick={() => setSelectedPrint(null)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Print Content */}
            <div className="print:block">
              <div className="text-center mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-800">FORESIGHT MARINE</h1>
                <h2 className="text-xl text-gray-600">Boat Options Sheet</h2>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Boat Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><strong>Customer:</strong> {boat.customer}</div>
                    <div><strong>Model:</strong> {boat.model}' Center Console</div>
                    <div><strong>Hull Color:</strong> {boat.hullColor || 'Standard White'}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Sheet Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><strong>Boat ID:</strong> {boat.id}</div>
                    <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                    <div><strong>Status:</strong> Customer Copy</div>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-1">Selected Options</h3>
              <div className="space-y-2 mb-6">
                {selectedOptions.filter(opt => opt.qty > 0).map((option, idx) => (
                  <div key={idx} className="flex items-start">
                    <div className="w-4 h-4 border-2 border-gray-400 rounded-sm mr-3 mt-0.5 flex items-center justify-center">
                      <span className="text-green-600 font-bold">✓</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{option.description}</div>
                      <div className="text-sm text-gray-600">Part #: {option.partNumber}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-4 border-t text-sm text-gray-600">
                <div>Customer Copy - Printed on: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedPrint === 'picklist') {
    const groupedPicklist = getMergedPicklist();
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 print:p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h2 className="text-xl font-semibold">Picklist Preview</h2>
              <div className="space-x-2">
                <button 
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Print
                </button>
                <button 
                  onClick={() => setSelectedPrint(null)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Print Content */}
            <div className="print:block">
              <div className="text-center mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-800">FORESIGHT MARINE</h1>
                <h2 className="text-xl text-gray-600">Production Picklist</h2>
                <div className="text-sm text-gray-500 mt-2">
                  {boat.customer} - {boat.model}' ({boat.id})
                </div>
              </div>

              {Object.entries(groupedPicklist).map(([vendor, items]) => (
                <div key={vendor} className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2">
                    {vendor}
                  </h3>
                  
                  <table className="w-full border-collapse border border-gray-300 mb-4">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 p-2 text-left">Part #</th>
                        <th className="border border-gray-300 p-2 text-left">Description</th>
                        <th className="border border-gray-300 p-2 text-center">Qty</th>
                        <th className="border border-gray-300 p-2 text-left">Staging</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} className={item.qty === 0 ? 'bg-red-50' : ''}>
                          <td className="border border-gray-300 p-2 font-mono text-sm">{item.partNumber}</td>
                          <td className="border border-gray-300 p-2">
                            {item.description}
                            {item.note && <div className="text-sm text-red-600 italic">Note: {item.note}</div>}
                          </td>
                          <td className="border border-gray-300 p-2 text-center">{item.qty}</td>
                          <td className="border border-gray-300 p-2">{item.staging}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              <div className="mt-8 pt-4 border-t text-sm text-gray-600">
                <div>Internal Use Only - Printed on: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-semibold text-blue-800 mb-3">📋 Printables</h3>
      <div className="space-y-2">
        <button
          onClick={() => setSelectedPrint('options')}
          className="w-full text-left px-3 py-2 bg-white border border-blue-200 rounded hover:bg-blue-50 text-sm"
        >
          <div className="font-medium text-blue-800">Options Sheet</div>
          <div className="text-xs text-blue-600">Customer-facing configuration</div>
        </button>
        <button
          onClick={() => setSelectedPrint('picklist')}
          className="w-full text-left px-3 py-2 bg-white border border-blue-200 rounded hover:bg-blue-50 text-sm"
        >
          <div className="font-medium text-blue-800">Picklist</div>
          <div className="text-xs text-blue-600">Internal production list</div>
        </button>
      </div>
    </div>
  );
}