'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { useScheduleStore, ScheduleBar } from '../../lib/schedule-store';

// Helper to snap date to previous Monday
function snapToMonday(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, else go back to Monday
  date.setDate(date.getDate() + diff);
  return date.toISOString().split('T')[0];
}

// Helper to add weeks to a date
function addWeeks(dateStr: string, weeks: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString().split('T')[0];
}

export default function AdminImportsPage() {
  const { addBars } = useScheduleStore();
  const [preview, setPreview] = useState<ScheduleBar[]>([]);
  const [fileName, setFileName] = useState('');
  const [rawData, setRawData] = useState<any[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setRawData(results.data);
        const bars = generateBarsFromCSV(results.data);
        setPreview(bars);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        alert('Error parsing CSV file');
      }
    });
  };

  const generateBarsFromCSV = (data: any[]): ScheduleBar[] => {
    const bars: ScheduleBar[] = [];
    
    data.forEach((row, index) => {
      // Skip empty rows
      if (!row['boat name'] || !row['model']) return;
      
      const boatName = row['boat name'];
      const model = row['model'] as '26' | '40';
      const startDate = snapToMonday(row['start mon lam']);
      const durLam = parseInt(row['dur lam']) || 0;
      const durAsm = parseInt(row['dur asm']) || 0;
      const durFin = parseInt(row['dur fini']) || 0;
      const durRig = parseInt(row['dur rig']) || 0;
      const note = row['note'] || '';
      
      // Generate 4 bars: LAM → ASM → FIN → RIG
      bars.push({
        id: `${boatName}-LAM-${index}`,
        boat: boatName,
        model,
        dept: 'LAM',
        start: startDate,
        duration: durLam,
        note: note
      });
      
      bars.push({
        id: `${boatName}-ASM-${index}`,
        boat: boatName,
        model,
        dept: 'ASM',
        start: addWeeks(startDate, durLam),
        duration: durAsm
      });
      
      bars.push({
        id: `${boatName}-FIN-${index}`,
        boat: boatName,
        model,
        dept: 'FIN',
        start: addWeeks(startDate, durLam + durAsm),
        duration: durFin
      });
      
      bars.push({
        id: `${boatName}-RIG-${index}`,
        boat: boatName,
        model,
        dept: 'RIG',
        start: addWeeks(startDate, durLam + durAsm + durFin),
        duration: durRig
      });
    });
    
    return bars;
  };

  const handleCommit = () => {
    if (preview.length === 0) {
      alert('No data to import');
      return;
    }
    
    console.log('About to import bars:', preview);
    addBars(preview);
    console.log('Bars imported successfully');
    alert(`Successfully imported ${preview.length} production bars`);
    setPreview([]);
    setRawData([]);
    setFileName('');
  };

  const handleClear = () => {
    setPreview([]);
    setRawData([]);
    setFileName('');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">CSV Import - Production Schedule</h1>
      
      {/* File Upload */}
      <div className="mb-6 bg-white p-4 rounded shadow">
        <label className="block mb-2 font-semibold">Upload CSV File</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-sky-50 file:text-sky-700
            hover:file:bg-sky-100"
        />
        {fileName && (
          <p className="mt-2 text-sm text-gray-600">
            Loaded: {fileName} ({rawData.length} rows)
          </p>
        )}
      </div>

      {/* CSV Format Guide */}
      <div className="mb-6 bg-blue-50 p-4 rounded">
        <h3 className="font-semibold mb-2">CSV Format:</h3>
        <code className="text-sm bg-white p-2 block rounded">
          boat name,model,start mon lam,dur lam,dur asm,dur fini,dur rig,note
        </code>
        <p className="text-sm mt-2 text-gray-600">
          Dates will be automatically snapped to the previous Monday
        </p>
      </div>

      {/* Preview Grid */}
      {preview.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Preview ({preview.length} bars)</h2>
          
          {/* Group by boat for display */}
          <div className="bg-white rounded shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boat</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {preview.map((bar, index) => (
                  <tr key={bar.id} className={index % 4 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-2 text-sm">{bar.boat}</td>
                    <td className="px-4 py-2 text-sm">{bar.model}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold
                        ${bar.dept === 'LAM' ? 'bg-blue-100 text-blue-800' : ''}
                        ${bar.dept === 'ASM' ? 'bg-green-100 text-green-800' : ''}
                        ${bar.dept === 'FIN' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${bar.dept === 'RIG' ? 'bg-purple-100 text-purple-800' : ''}
                      `}>
                        {bar.dept}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{bar.start}</td>
                    <td className="px-4 py-2 text-sm">{bar.duration} weeks</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{bar.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mini Timeline Preview */}
          <div className="mt-6 bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-3">Timeline Preview</h3>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {['LAM', 'ASM', 'FIN', 'RIG'].map(dept => (
                  <div key={dept} className="flex items-center mb-2">
                    <div className="w-20 font-semibold text-sm">{dept}</div>
                    <div className="flex-1 relative h-8">
                      {preview
                        .filter(bar => bar.dept === dept)
                        .map(bar => {
                          const startDate = new Date(bar.start);
                          const baseDate = new Date(preview[0].start);
                          const weekOffset = Math.floor((startDate - baseDate) / (7 * 24 * 60 * 60 * 1000));
                          
                          return (
                            <div
                              key={bar.id}
                              className="absolute h-6 flex items-center px-2 text-xs text-white rounded"
                              style={{
                                left: `${weekOffset * 40}px`,
                                width: `${bar.duration * 40}px`,
                                backgroundColor: `hsl(${bar.boat.charCodeAt(0) * 31 % 360}, 70%, 50%)`
                              }}
                            >
                              {bar.boat}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={handleCommit}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
            >
              Commit to Schedule
            </button>
            <button
              onClick={handleClear}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}