'use client';

import React, { useState, useMemo, useEffect } from "react";

const BOAT_COLORS = {
  Johnson: "#ef4444",
  Smoak: "#06b6d4",
  King: "#8b5cf6",
  Orme: "#22c55e",
  "40-22": "#f59e0b",
  "40-23": "#16a34a",
};

function colorForBoat(boat, parts: Part[] = []) {
  // First try to find color from parts data
  const part = parts.find(p => p.boat.label.split(' • ')[0] === boat);
  if (part && part.boat.colorHex) {
    return part.boat.colorHex;
  }
  
  // Fallback to hardcoded colors
  if (BOAT_COLORS[boat]) return BOAT_COLORS[boat];
  
  // Generate color from boat name
  let h = 0;
  for (let i = 0; i < boat.length; i++) h = (h * 31 + boat.charCodeAt(i)) % 360;
  return `hsl(${h}, 65%, 50%)`;
}

// Types from lamination schedule
type Stage = "In Mold" | "Out of Mold" | "Cutter" | "Finishing" | "Done";
type LamType = "Squish" | "Infusion" | "Hand Layup";

type Part = {
  id: string;
  name: string;
  boat: { id: string; label: string; length: 26 | 40; colorHex: string; shipWeek: string };
  lamType: LamType;
  gelcoat: string;
  qtyNeeded: number;
  qtyDone: number;
  stage: Stage;
  dueDate: string;
  scheduledWeek?: string;
  assignee?: string;
  notes?: string;
};

const GELCOAT_OPTIONS = ["White", "Black", "Blue", "Red", "Gray", "Custom"];
const PROCESS_OPTIONS = ["Infusion", "Open", "Squish"];
const ALERT_TYPES = ["Quality Issue", "Delay", "Material Shortage", "Equipment Problem", "Other"];

// Generate 4-day work weeks (Mon-Thu only)
function getWorkWeeks(startDate, numWeeks = 8) {
  const weeks = [];
  let currentDate = new Date(startDate);
  
  // Find the Monday of the week containing startDate
  const dayOfWeek = currentDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  currentDate.setDate(currentDate.getDate() + daysToMonday);
  
  for (let w = 0; w < numWeeks; w++) {
    const weekStart = new Date(currentDate);
    const days = [];
    
    for (let d = 0; d < 4; d++) { // Mon-Thu only
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      days.push({
        date: day,
        label: ['Mon', 'Tue', 'Wed', 'Thu'][d],
        dateStr: day.toISOString().split('T')[0]
      });
    }
    
    weeks.push({
      weekNumber: w + 1,
      label: `Week of ${weekStart.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`,
      startDate: weekStart,
      days
    });
    
    currentDate.setDate(currentDate.getDate() + 7); // Next week
  }
  
  return weeks;
}

// Transform lamination parts into weekly cards
function transformPartsToWeeklyCards(parts: Part[], weeks: any[]) {
  const cards: any[] = [];
  
  parts.forEach((part, index) => {
    if (!part.scheduledWeek) return;
    
    // Find which week this part belongs to
    const scheduledDate = new Date(part.scheduledWeek);
    const weekIndex = weeks.findIndex(week => {
      const weekStart = week.startDate;
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Full week
      return scheduledDate >= weekStart && scheduledDate <= weekEnd;
    });
    
    if (weekIndex === -1) return; // Part not in visible weeks
    
    // Assign to a day within the week (distribute evenly or use specific logic)
    const dayIndex = index % 4; // Distribute across Mon-Thu
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu'];
    
    cards.push({
      id: part.id,
      boat: part.boat.label.split(' • ')[0], // Extract boat name
      part: part.name,
      gelcoat: part.gelcoat,
      sprayDate: part.dueDate,
      process: part.lamType === "Squish" ? "Squish" : 
               part.lamType === "Infusion" ? "Infusion" : "Open", // Map Hand Layup to Open
      weekNumber: weekIndex + 1,
      day: dayLabels[dayIndex],
      dayNote: part.notes || ""
    });
  });
  
  return cards;
}

export default function LaminationDashboard() {
  const [showScheduled, setShowScheduled] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedBar, setSelectedBar] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [barPopupOpen, setBarPopupOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(null);

  // Generate weeks starting from current date
  const weeks = useMemo(() => getWorkWeeks(new Date('2025-02-10')), []);

  // Parts data from lamination schedule
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  // Transform parts into weekly cards
  const weeklyCards = useMemo(() => {
    return transformPartsToWeeklyCards(parts, weeks);
  }, [parts, weeks]);

  // Dynamic boat list from loaded parts
  const boatList = useMemo(() => {
    const boats = new Set(parts.map(part => part.boat.label.split(' • ')[0]));
    return Array.from(boats);
  }, [parts]);

  const [alerts, setAlerts] = useState([
    { id: 1, type: "Quality Issue", text: "Gelcoat bubble on Johnson console", boat: "Johnson" },
    { id: 2, type: "Delay", text: "Material delivery delayed", boat: "Smoak" }
  ]);

  // Load parts from API
  const loadPartsFromAPI = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/lamination-parts');
      if (response.ok) {
        const data = await response.json();
        setParts(data.parts || []);
      } else {
        console.error('Failed to load parts:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to load parts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadPartsFromAPI();
  }, []);

  // Timeline data matching Production Schedule
  const timelineData = {
    "LAM 26 Actual": { 
      boat: "Johnson", 
      progress: 65, 
      weeks: 3, 
      color: "#ef4444",
      note: "On track, gelcoat complete"
    },
    "LAM 40 Actual": { 
      boat: "40-22", 
      progress: 40, 
      weeks: 8, 
      color: "#f59e0b",
      note: "Slight delay in materials"
    }
  };

  const scheduledData = {
    "LAM 26 Scheduled": { 
      boat: "Smoak", 
      progress: 0, 
      weeks: 3, 
      color: "#06b6d4",
      note: "Starting next week"
    },
    "LAM 40 Scheduled": { 
      boat: "40-23", 
      progress: 0, 
      weeks: 8, 
      color: "#16a34a",
      note: "Planned for March"
    }
  };

  function handleCardClick(card) {
    setSelectedCard(card);
    setPopupOpen(true);
  }

  function handleBarClick(barKey, barData) {
    setSelectedBar({ key: barKey, ...barData });
    setBarPopupOpen(true);
  }

  function handleDragStart(e, card) {
    setDragging(card);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(e, targetWeekNumber, targetDay) {
    e.preventDefault();
    if (!dragging) return;

    // Update the corresponding part's scheduledWeek based on the new week/day
    const targetWeek = weeks[targetWeekNumber - 1];
    if (!targetWeek) return;
    
    const targetDayIndex = ['Mon', 'Tue', 'Wed', 'Thu'].indexOf(targetDay);
    if (targetDayIndex === -1) return;
    
    const targetDate = targetWeek.days[targetDayIndex]?.dateStr;
    if (!targetDate) return;

    // Update the part data
    setParts(prev => prev.map(part => 
      part.id === dragging.id 
        ? { ...part, scheduledWeek: targetDate }
        : part
    ));
    
    setDragging(null);
  }

  function addAlert() {
    const newAlert = {
      id: Date.now(),
      type: "Other",
      text: "",
      boat: ""
    };
    setAlerts(prev => [...prev, newAlert]);
  }

  function updateAlert(id, field, value) {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, [field]: value } : alert
    ));
  }

  function deleteAlert(id) {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }

  function updateCard(updatedCard) {
    setWeeklyParts(prev => prev.map(part => 
      part.id === updatedCard.id ? updatedCard : part
    ));
  }

  function TimelineBar({ label, data, isScheduled = false }) {
    const boatColor = colorForBoat(data.boat, parts);
    const barWidth = data.weeks * 120; // 120px per week
    
    return (
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>
        <div 
          className="relative border-2 rounded-xl bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors overflow-hidden"
          style={{ 
            width: `${barWidth}px`, 
            height: '80px',
            borderTopColor: boatColor,
            borderTopWidth: '4px'
          }}
          onClick={() => handleBarClick(label, data)}
        >
          {/* Background with boat color tint */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{ backgroundColor: boatColor }}
          />
          
          {/* Progress overlay */}
          <div 
            className="absolute inset-0 opacity-60"
            style={{ 
              background: `linear-gradient(to right, ${boatColor} ${data.progress}%, transparent ${data.progress}%)`
            }}
          />
          
          {/* Week divider lines */}
          {Array.from({ length: data.weeks - 1 }, (_, i) => (
            <div 
              key={i}
              className="absolute top-0 bottom-0 w-px bg-gray-400 opacity-50"
              style={{ left: `${((i + 1) / data.weeks) * 100}%` }}
            />
          ))}
          
          {/* Week labels at top */}
          <div className="absolute top-1 left-0 right-0 flex">
            {Array.from({ length: data.weeks }, (_, i) => (
              <div 
                key={i} 
                className="flex-1 text-center"
              >
                <span className="text-xs text-gray-600 bg-white bg-opacity-75 px-1 rounded">
                  W{i + 1}
                </span>
              </div>
            ))}
          </div>
          
          {/* Boat name (centered) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-800 bg-white bg-opacity-90 px-2 py-1 rounded">
              {data.boat}
            </span>
          </div>
          
          {/* Progress percentage */}
          <div className="absolute bottom-1 right-2">
            <span className="text-sm font-semibold text-gray-800 bg-white bg-opacity-90 px-1 rounded">
              {data.progress}%
            </span>
          </div>
          
          {/* Note line at bottom */}
          {data.note && (
            <div className="absolute bottom-1 left-2">
              <span className="text-xs text-gray-700 bg-white bg-opacity-90 px-1 rounded">
                {data.note}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Lamination Dashboard</h1>
        <div className="flex gap-3">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => alert("Navigate to Boat Tracker" + (selectedCard || selectedBar ? ` for ${(selectedCard?.boat || selectedBar?.boat)}` : ""))}
          >
            Open Boat Tracker
          </button>
          <button 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            onClick={() => alert("Navigate to Parts Page")}
          >
            Open Parts Page
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Weekly Schedule Cards - Left Column */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Weekly Schedule</h2>
            {loading && <div className="text-sm text-gray-500">Loading parts...</div>}
          </div>
          
          <div className="overflow-y-auto max-h-[600px]">
            {weeks.slice(0, 4).map(week => (
              <div key={week.weekNumber} className="mb-6 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-3 text-gray-700">{week.label}</h3>
                
                <div className="grid grid-cols-4 gap-4">
                  {week.days.map(day => (
                    <div 
                      key={day.label}
                      className="min-h-[250px] border-2 border-dashed border-gray-300 rounded-lg p-3 bg-gray-50"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, week.weekNumber, day.label)}
                    >
                      <div className="text-center mb-3">
                        <h4 className="font-medium text-sm text-gray-600">{day.label}</h4>
                        <div className="text-xs text-gray-500">{day.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}</div>
                      </div>
                      
                      {weeklyCards
                        .filter(card => card.weekNumber === week.weekNumber && card.day === day.label)
                        .map(card => (
                          <div
                            key={card.id}
                            className="bg-white border border-gray-200 rounded-lg p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow"
                            style={{ borderLeft: `4px solid ${colorForBoat(card.boat, parts)}` }}
                            draggable
                            onDragStart={(e) => handleDragStart(e, card)}
                            onClick={() => handleCardClick(card)}
                          >
                            <div className="text-sm font-semibold text-gray-800">{card.boat} - {card.part}</div>
                            
                            <div className="text-xs text-gray-600 mt-1">
                              Gelcoat: {card.gelcoat}
                            </div>
                            
                            <div className="text-xs text-gray-600">
                              Process: {card.process}
                            </div>
                            
                            <div className="text-xs text-blue-600 mt-1">
                              Spray: {new Date(card.sprayDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
                            </div>
                            
                            {card.dayNote && (
                              <div className="text-xs text-gray-700 mt-2 bg-yellow-50 p-1 rounded border">
                                {card.dayNote}
                              </div>
                            )}
                          </div>
                        ))
                      }
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Alerts & Issues Block */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Alerts & Issues</h2>
              <button 
                onClick={addAlert}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Add Alert
              </button>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {alerts.map(alert => (
                <div key={alert.id} className="border border-gray-200 rounded-lg p-3 bg-red-50">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <select 
                        value={alert.type}
                        onChange={(e) => updateAlert(alert.id, 'type', e.target.value)}
                        className="text-sm border rounded px-2 py-1 mb-2 w-full"
                      >
                        {ALERT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      
                      <select
                        value={alert.boat}
                        onChange={(e) => updateAlert(alert.id, 'boat', e.target.value)}
                        className="text-sm border rounded px-2 py-1 mb-2 w-full"
                      >
                        <option value="">Select boat...</option>
                        {boatList.map(boat => (
                          <option key={boat} value={boat}>{boat}</option>
                        ))}
                      </select>
                      
                      <textarea
                        value={alert.text}
                        onChange={(e) => updateAlert(alert.id, 'text', e.target.value)}
                        placeholder="Issue description..."
                        className="text-sm border rounded px-2 py-1 w-full resize-none"
                        rows={2}
                      />
                    </div>
                    
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Snippet */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Timeline</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showScheduled}
                  onChange={(e) => setShowScheduled(e.target.checked)}
                />
                Show Scheduled
              </label>
            </div>
            
            <div className="overflow-x-auto">
              <div className="space-y-1 min-w-max">
                {Object.entries(timelineData).map(([lane, data]) => (
                  <TimelineBar key={lane} label={lane} data={data} />
                ))}
                
                {showScheduled && Object.entries(scheduledData).map(([lane, data]) => (
                  <TimelineBar key={lane} label={lane} data={data} isScheduled={true} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Edit Pop-up Modal */}
      {popupOpen && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 max-w-90vw">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Card</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="text-gray-600 hover:text-gray-800 relative"
                >
                  ⋮
                  {menuOpen && (
                    <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-2 w-40 z-10">
                      <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Add Week</button>
                      <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Subtract Week</button>
                      <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Split Week</button>
                      <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Merge Week</button>
                    </div>
                  )}
                </button>
                <button
                  onClick={() => {setPopupOpen(false); setMenuOpen(false);}}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Boat + Part</label>
                <input
                  type="text"
                  value={`${selectedCard.boat} - ${selectedCard.part}`}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  onChange={(e) => {
                    const [boat, ...partArray] = e.target.value.split(' - ');
                    const part = partArray.join(' - ');
                    setSelectedCard({...selectedCard, boat: boat || '', part: part || ''});
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gelcoat</label>
                <div className="flex gap-2">
                  <select
                    value={GELCOAT_OPTIONS.includes(selectedCard.gelcoat) ? selectedCard.gelcoat : 'Custom'}
                    onChange={(e) => setSelectedCard({...selectedCard, gelcoat: e.target.value})}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {GELCOAT_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {(!GELCOAT_OPTIONS.includes(selectedCard.gelcoat) || selectedCard.gelcoat === 'Custom') && (
                    <input
                      type="text"
                      value={selectedCard.gelcoat === 'Custom' ? '' : selectedCard.gelcoat}
                      onChange={(e) => setSelectedCard({...selectedCard, gelcoat: e.target.value})}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Custom gelcoat"
                    />
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spray Date</label>
                <input
                  type="date"
                  value={selectedCard.sprayDate}
                  onChange={(e) => setSelectedCard({...selectedCard, sprayDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Process</label>
                <select
                  value={selectedCard.process}
                  onChange={(e) => setSelectedCard({...selectedCard, process: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {PROCESS_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day Note</label>
                <textarea
                  value={selectedCard.dayNote || ''}
                  onChange={(e) => setSelectedCard({...selectedCard, dayNote: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none"
                  rows={2}
                  placeholder="Note for this day..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    updateCard(selectedCard);
                    setPopupOpen(false); 
                    setMenuOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Submit
                </button>
                <button
                  onClick={() => {setPopupOpen(false); setMenuOpen(false);}}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Bar Pop-up Modal */}
      {barPopupOpen && selectedBar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{selectedBar.boat}</h3>
              <button
                onClick={() => setBarPopupOpen(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dept %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={selectedBar.progress}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Progress percentage"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  defaultValue={selectedBar.note}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none"
                  rows={3}
                  placeholder="Add note for boat tracker..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    alert("Note saved to Boat Tracker");
                    setBarPopupOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Submit
                </button>
                <button
                  onClick={() => alert(`Navigate to Boat Tracker for ${selectedBar.boat}`)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Open Boat Tracker
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}