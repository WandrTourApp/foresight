'use client';

import React, { useState, useMemo } from "react";

const BOAT_COLORS = {
  "Deep Blue": "#ef4444",
  "Ocean Master": "#06b6d4", 
  "Sea Titan": "#8b5cf6",
  "Wave Crusher": "#22c55e",
  "Storm King": "#f59e0b",
  "Marlin Hunter": "#16a34a",
  "Thunder Strike": "#f97316",
  "Neptune's Fury": "#84cc16",
  "40-22": "#dc2626",
  "40-23": "#059669"
};

function colorForBoat(boat) {
  if (BOAT_COLORS[boat]) return BOAT_COLORS[boat];
  let h = 0;
  for (let i = 0; i < boat.length; i++) h = (h * 31 + boat.charCodeAt(i)) % 360;
  return `hsl(${h}, 65%, 50%)`;
}

const STATUS_OPTIONS = ["Not Started", "In Progress", "Done"];
const ALERT_TYPES = ["Quality Issue", "Delay", "Material Shortage", "Equipment Problem", "Other"];
const BOAT_LIST = ["Deep Blue", "Ocean Master", "Sea Titan", "Wave Crusher", "Storm King", "Marlin Hunter", "Thunder Strike", "Neptune's Fury", "40-22", "40-23"];

// Rigging 40 milestones (16 tasks)
const RIGGING40_MILESTONES = [
  "Console Installed & Rigged",
  "Console Liner", 
  "LP Installed",
  "Tackle Center",
  "Grill & Lounge Lid",
  "Battery Bank",
  "Four Lounge Tubs & Hatches",
  "Port Bilge",
  "Starboard Bilge",
  "Jack Plates (all)",
  "Engines Mounted (all)",
  "Engines Rigged",
  "Hard Top Installed",
  "Boat Outfitting",
  "Tie-ins",
  "QC/Sea Trial Prep"
];

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

export default function Rigging40Dashboard() {
  const [showScheduled, setShowScheduled] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null); // For notes system
  const [selectedBar, setSelectedBar] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [barPopupOpen, setBarPopupOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Generate weeks starting from current date
  const weeks = useMemo(() => getWorkWeeks(new Date('2025-09-09')), []);

  // Sample weekly milestone data for rigging 40
  const [weeklyMilestones, setWeeklyMilestones] = useState([
    {
      id: 1,
      boat: "Deep Blue",
      milestone: "Console Installed & Rigged",
      status: "Done",
      assignedDate: "2025-09-09"
    },
    {
      id: 2,
      boat: "Deep Blue",
      milestone: "Console Liner",
      status: "Done",
      assignedDate: "2025-09-10"
    },
    {
      id: 3,
      boat: "Deep Blue",
      milestone: "LP Installed",
      status: "In Progress",
      assignedDate: "2025-09-11"
    },
    {
      id: 4,
      boat: "Deep Blue",
      milestone: "Tackle Center",
      status: "Not Started",
      assignedDate: "2025-09-12"
    },
    {
      id: 5,
      boat: "Deep Blue",
      milestone: "Grill & Lounge Lid",
      status: "Not Started",
      assignedDate: "2025-09-16"
    },
    {
      id: 6,
      boat: "Ocean Master",
      milestone: "Console Installed & Rigged",
      status: "In Progress",
      assignedDate: "2025-09-09"
    },
    {
      id: 7,
      boat: "Ocean Master",
      milestone: "Console Liner",
      status: "Not Started",
      assignedDate: "2025-09-10"
    },
    {
      id: 8,
      boat: "Sea Titan",
      milestone: "Four Lounge Tubs & Hatches",
      status: "In Progress",
      assignedDate: "2025-09-11"
    },
    {
      id: 9,
      boat: "Sea Titan",
      milestone: "Port Bilge",
      status: "Not Started",
      assignedDate: "2025-09-12"
    },
    {
      id: 10,
      boat: "Wave Crusher",
      milestone: "Jack Plates (all)",
      status: "In Progress",
      assignedDate: "2025-09-11"
    },
    {
      id: 11,
      boat: "Wave Crusher",
      milestone: "Engines Mounted (all)",
      status: "Not Started",
      assignedDate: "2025-09-12"
    },
    {
      id: 12,
      boat: "Storm King",
      milestone: "Hard Top Installed",
      status: "In Progress",
      assignedDate: "2025-09-11"
    }
  ]);

  // Notes system - milestoneId -> { Mon: "note", Tue: "note", etc }
  const [milestoneNotes, setMilestoneNotes] = useState({
    1: { Mon: "Console wiring completed", Wed: "Testing all systems" },
    3: { Tue: "LP brackets installed", Thu: "Hydraulic connections pending" },
    6: { Mon: "Started console installation", Wed: "Wiring harness issues" },
    8: { Wed: "Tub alignment perfect", Thu: "Hatch fitting next" },
    10: { Mon: "Jack plate brackets ready", Thu: "Installation scheduled" },
    12: { Tue: "Hard top positioned", Wed: "Securing hardware" }
  });

  const [alerts, setAlerts] = useState([
    { id: 1, type: "Material Shortage", text: "Dual engine wiring harness - 1 unit needed for Ocean Master", boat: "Ocean Master" },
    { id: 2, type: "Equipment Problem", text: "Hard top crane needs hydraulic repair", boat: "Storm King" },
    { id: 3, type: "Delay", text: "Triple engine delivery delayed 5 days", boat: "Wave Crusher" },
    { id: 4, type: "Quality Issue", text: "Lounge tub gelcoat defect found", boat: "Sea Titan" }
  ]);

  // Timeline data - sequential boats for rigging 40 (longer cycles)
  const timelineData = {
    "RIG 40 Actual": [
      { boat: "Deep Blue", weeks: 6, progress: 70, color: "#ef4444", note: "LP & tackle phase" },
      { boat: "Ocean Master", weeks: 6, progress: 25, color: "#06b6d4", note: "Console issues" },
      { boat: "Sea Titan", weeks: 5, progress: 45, color: "#8b5cf6", note: "Tubs & hatches" }
    ]
  };

  const scheduledData = {
    "RIG 40 Scheduled": [
      { boat: "Wave Crusher", weeks: 6, progress: 0, color: "#22c55e", note: "October start" },
      { boat: "Storm King", weeks: 6, progress: 0, color: "#f59e0b", note: "November planned" },
      { boat: "Marlin Hunter", weeks: 5, progress: 0, color: "#16a34a", note: "December queue" }
    ]
  };

  function handleMilestoneClick(milestone) {
    setSelectedMilestone(selectedMilestone?.id === milestone.id ? null : milestone);
  }

  function handleCardEdit(milestone) {
    setSelectedCard(milestone);
    setPopupOpen(true);
  }

  function handleDayClick(day) {
    if (!selectedMilestone) return;
    
    const currentNote = milestoneNotes[selectedMilestone.id]?.[day] || "";
    const newNote = prompt(`Add note for ${selectedMilestone.boat} - ${selectedMilestone.milestone} on ${day}:`, currentNote);
    
    if (newNote !== null) {
      setMilestoneNotes(prev => ({
        ...prev,
        [selectedMilestone.id]: {
          ...prev[selectedMilestone.id],
          [day]: newNote
        }
      }));
    }
  }

  function handleBarClick(barKey, boats) {
    // For timeline bars with multiple boats, show the first boat
    setSelectedBar({ key: barKey, ...boats[0] });
    setBarPopupOpen(true);
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
    setWeeklyMilestones(prev => prev.map(milestone => 
      milestone.id === updatedCard.id ? updatedCard : milestone
    ));
  }

  function TimelineBar({ label, boats }) {
    const totalWeeks = boats.reduce((sum, boat) => sum + boat.weeks, 0);
    const barWidth = totalWeeks * 120; // 120px per week
    
    return (
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>
        
        {/* Week headers above the blocks */}
        <div className="flex mb-2" style={{ width: `${barWidth}px` }}>
          {boats.map((boat, boatIndex) => {
            const boatWidth = boat.weeks * 120;
            return (
              <div key={boatIndex} className="flex" style={{ width: `${boatWidth}px` }}>
                {Array.from({ length: boat.weeks }, (_, i) => {
                  // Calculate the actual date for this week
                  const baseDate = new Date('2025-09-09'); 
                  const totalPreviousWeeks = boats.slice(0, boatIndex).reduce((sum, b) => sum + b.weeks, 0);
                  const weekDate = new Date(baseDate.getTime() + (totalPreviousWeeks + i) * 7 * 24 * 60 * 60 * 1000);
                  const monday = new Date(weekDate);
                  const dayOfWeek = monday.getDay();
                  monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                  const friday = new Date(monday.getTime() + 4 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <div 
                      key={i} 
                      className="flex-1 text-center border-r last:border-r-0 border-gray-300 py-1"
                    >
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {monday.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}-{friday.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        
        {/* Timeline blocks */}
        <div className="flex border-2 border-gray-300 rounded-xl overflow-hidden" style={{ width: `${barWidth}px` }}>
          {boats.map((boat, index) => {
            const boatColor = colorForBoat(boat.boat);
            const boatWidth = boat.weeks * 120;
            
            return (
              <div
                key={index}
                className="relative bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors border-r last:border-r-0 border-gray-300"
                style={{ 
                  width: `${boatWidth}px`, 
                  height: '80px',
                  borderTopColor: boatColor,
                  borderTopWidth: '4px'
                }}
                onClick={() => handleBarClick(label, boats)}
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
                    background: `linear-gradient(to right, ${boatColor} ${boat.progress}%, transparent ${boat.progress}%)`
                  }}
                />
                
                {/* Week divider lines */}
                {Array.from({ length: boat.weeks - 1 }, (_, i) => (
                  <div 
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-gray-400 opacity-50"
                    style={{ left: `${((i + 1) / boat.weeks) * 100}%` }}
                  />
                ))}
                
                {/* Boat name (centered) */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-800 bg-white bg-opacity-90 px-2 py-1 rounded">
                    {boat.boat}
                  </span>
                </div>
                
                {/* Progress percentage */}
                <div className="absolute bottom-1 right-2">
                  <span className="text-sm font-semibold text-gray-800 bg-white bg-opacity-90 px-1 rounded">
                    {boat.progress}%
                  </span>
                </div>
                
                {/* Clean note at bottom-left */}
                {boat.note && (
                  <div className="absolute bottom-1 left-2">
                    <span className="text-xs text-gray-700 bg-white bg-opacity-90 px-1 rounded">
                      {boat.note}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Rigging 40 Dashboard</h1>
        <div className="flex gap-3">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => alert("Navigate to Boat Tracker" + (selectedCard || selectedBar ? ` for ${(selectedCard?.boat || selectedBar?.boat)}` : ""))}
          >
            Open Boat Tracker
          </button>
          <button 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            onClick={() => alert("Navigate to Production Schedule")}
          >
            Production Schedule
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Weekly Schedule Cards - New Layout */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Weekly Schedule</h2>
          
          <div className="flex gap-8 h-[600px]">
            {/* Milestones List - Left Side */}
            <div className="w-80 border-r border-gray-200 pr-6">
              <h3 className="text-lg font-medium mb-3 text-gray-700">40ft Rigging Milestones ({weeklyMilestones.length})</h3>
              <div className="space-y-2 overflow-y-auto h-full">
                {weeklyMilestones.map(milestone => (
                  <div
                    key={milestone.id}
                    className={`bg-white border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedMilestone?.id === milestone.id 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    style={{ borderLeft: `4px solid ${colorForBoat(milestone.boat)}` }}
                    onClick={() => handleMilestoneClick(milestone)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-semibold text-gray-800">
                        {milestone.boat} - {milestone.milestone}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardEdit(milestone);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 text-xs text-gray-600 mb-2">
                      <div>
                        <span className="font-medium">Status:</span><br/>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          milestone.status === "Done" ? "bg-green-100 text-green-800" :
                          milestone.status === "In Progress" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {milestone.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-blue-600">
                      <span className="font-medium">Assigned:</span> {new Date(milestone.assignedDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
                    </div>
                    
                    {selectedMilestone?.id === milestone.id && (
                      <div className="mt-2 text-xs bg-blue-100 p-2 rounded border">
                        Selected - Click day columns to add notes
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Days Grid - Right Side - MUCH WIDER */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-medium mb-4 text-gray-700">
                Daily Notes {selectedMilestone && `- ${selectedMilestone.boat} ${selectedMilestone.milestone}`}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px', height: 'calc(100% - 60px)' }}>
                {['Mon', 'Tue', 'Wed', 'Thu'].map((day, index) => (
                  <div key={day} className="border-2 border-gray-300 rounded-xl bg-white" style={{ minWidth: '250px' }}>
                    <div className="bg-gray-100 p-6 border-b-2 border-gray-300 text-center">
                      <h4 className="font-bold text-xl text-gray-800">{day}</h4>
                      <div className="text-base text-gray-600 mt-2">
                        {new Date(new Date('2025-09-09').getTime() + index * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
                      </div>
                    </div>
                    
                    <div className="p-6 h-full overflow-y-auto" style={{ height: 'calc(100% - 100px)' }}>
                      {weeklyMilestones.map(milestone => {
                        const note = milestoneNotes[milestone.id]?.[day];
                        const isSelected = selectedMilestone?.id === milestone.id;
                        
                        if (!note && !isSelected) return null;
                        
                        return (
                          <div
                            key={milestone.id}
                            className={`mb-4 p-4 rounded-xl cursor-pointer transition-all border-2 ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-400 shadow-lg' 
                                : note 
                                  ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100 shadow-md'
                                  : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                            }`}
                            style={{ 
                              borderLeftColor: colorForBoat(milestone.boat), 
                              borderLeftWidth: '6px', 
                              borderLeftStyle: 'solid',
                              minHeight: '80px'
                            }}
                            onClick={() => handleDayClick(day)}
                          >
                            {isSelected && (
                              <div className="font-bold text-blue-800 mb-3 text-base">
                                {milestone.boat} - {milestone.milestone}
                              </div>
                            )}
                            
                            {note ? (
                              <div className="text-gray-800 leading-relaxed text-base">{note}</div>
                            ) : isSelected ? (
                              <div className="text-gray-600 italic text-base">Click to add note for this day</div>
                            ) : null}
                          </div>
                        );
                      })}
                      
                      {/* Show placeholder when milestone is selected but no notes */}
                      {selectedMilestone && !milestoneNotes[selectedMilestone.id]?.[day] && (
                        <div
                          className="p-6 border-3 border-dashed border-blue-400 rounded-xl text-center cursor-pointer hover:bg-blue-50 transition-colors bg-blue-25"
                          style={{ minHeight: '120px' }}
                          onClick={() => handleDayClick(day)}
                        >
                          <div className="text-blue-700 font-bold text-lg">Add note for {selectedMilestone.boat}</div>
                          <div className="text-blue-600 text-base mt-2">Click to add note for {day}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                        className="text-xs border rounded px-1 mb-2 w-full"
                      >
                        {ALERT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      
                      <select
                        value={alert.boat}
                        onChange={(e) => updateAlert(alert.id, 'boat', e.target.value)}
                        className="text-xs border rounded px-1 mb-2 w-full"
                      >
                        <option value="">Select Boat</option>
                        {BOAT_LIST.map(boat => (
                          <option key={boat} value={boat}>{boat}</option>
                        ))}
                      </select>
                      
                      <textarea
                        value={alert.text}
                        onChange={(e) => updateAlert(alert.id, 'text', e.target.value)}
                        placeholder="Describe the issue..."
                        className="text-xs border rounded px-1 w-full h-16 resize-none"
                      />
                    </div>
                    
                    <button 
                      onClick={() => deleteAlert(alert.id)}
                      className="text-red-600 hover:text-red-800 font-bold"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Timeline</h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showScheduled}
              onChange={(e) => setShowScheduled(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show Scheduled</span>
          </label>
        </div>
        
        <div className="overflow-x-auto">
          <div className="space-y-4" style={{ minWidth: '1200px' }}>
            {Object.entries(timelineData).map(([key, boats]) => (
              <TimelineBar key={key} label={key} boats={boats} />
            ))}
            
            {showScheduled && Object.entries(scheduledData).map(([key, boats]) => (
              <TimelineBar key={key} label={key} boats={boats} />
            ))}
          </div>
        </div>
      </div>

      {/* Card Edit Popup */}
      {popupOpen && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit 40ft Rigging Milestone</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Milestone</label>
                <select
                  value={selectedCard.milestone}
                  onChange={(e) => setSelectedCard({...selectedCard, milestone: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  {RIGGING40_MILESTONES.map(milestone => (
                    <option key={milestone} value={milestone}>{milestone}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Boat</label>
                <select
                  value={selectedCard.boat}
                  onChange={(e) => setSelectedCard({...selectedCard, boat: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  {BOAT_LIST.map(boat => (
                    <option key={boat} value={boat}>{boat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={selectedCard.status}
                  onChange={(e) => setSelectedCard({...selectedCard, status: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Date</label>
                <input
                  type="date"
                  value={selectedCard.assignedDate}
                  onChange={(e) => setSelectedCard({...selectedCard, assignedDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  updateCard(selectedCard);
                  setPopupOpen(false);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => setPopupOpen(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}