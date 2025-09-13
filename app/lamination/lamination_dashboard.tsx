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
type Organizer = "None" | "Boat" | "Lamination Type";

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

// Generate weeks for scheduling display
function getWorkWeeks(startDate, numWeeks = 3) {
  const weeks = [];
  let currentDate = new Date(startDate);
  
  // Find the Monday of the week containing startDate
  const dayOfWeek = currentDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  currentDate.setDate(currentDate.getDate() + daysToMonday);
  
  for (let w = 0; w < numWeeks; w++) {
    const weekStart = new Date(currentDate);
    
    weeks.push({
      weekNumber: w + 1,
      label: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      startDate: weekStart,
      weekStartISO: weekStart.toISOString().split('T')[0]
    });
    
    currentDate.setDate(currentDate.getDate() + 7); // Next week
  }
  
  return weeks;
}

// Group parts by week (similar to lamination schedule)
function groupPartsByWeek(parts: Part[], weeks: any[]) {
  const weekSections = weeks.map(week => {
    const weekStart = new Date(week.weekStartISO);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const items = parts.filter(part => {
      if (!part.scheduledWeek) return false;
      const scheduledDate = new Date(part.scheduledWeek);
      return scheduledDate >= weekStart && scheduledDate <= weekEnd;
    });
    
    return {
      key: week.weekStartISO,
      label: week.label,
      items: items,
      range: { start: weekStart, end: weekEnd }
    };
  });
  
  return weekSections;
}

// Grouping helper functions (matching schedule)
function groupKeyFor(part: Part, organize: Organizer): string {
  switch (organize) {
    case "Boat":
      return part.boat.id;
    case "Lamination Type":
      return part.lamType;
    default:
      return "all";
  }
}

// Group rows by organizer (matching schedule organization)
function groupRows(items: Part[], organize: Organizer): Array<[string, Part[]]> {
  if (organize === "None") {
    return [["all", items]];
  }
  
  const map = new Map<string, Part[]>();
  items.forEach((p) => {
    const k = groupKeyFor(p, organize);
    const arr = map.get(k) || [];
    arr.push(p);
    map.set(k, arr);
  });
  return Array.from(map.entries());
}

export default function LaminationDashboard() {
  const [showScheduled, setShowScheduled] = useState(false);
  const [selectedBar, setSelectedBar] = useState(null);
  const [barPopupOpen, setBarPopupOpen] = useState(false);
  const [organize, setOrganize] = useState<Organizer>("Boat");

  // Generate weeks starting from current date
  const weeks = useMemo(() => getWorkWeeks(new Date()), []);

  // Parts data from lamination schedule
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  // Group parts into week sections (matching schedule layout)
  const weekSections = useMemo(() => {
    return groupPartsByWeek(parts, weeks);
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
            onClick={() => alert("Navigate to Boat Tracker" + (selectedBar ? ` for ${selectedBar?.boat}` : ""))}
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
        
        {/* Lamination Schedule Mirror - Left Column */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold">Lamination Schedule</h2>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-500 mb-1">Organize by</label>
                  <select 
                    className="border rounded-md px-2 py-2 text-sm" 
                    value={organize} 
                    onChange={(e) => setOrganize(e.target.value as Organizer)}
                  >
                    {(["None", "Boat", "Lamination Type"] as Organizer[]).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
              {loading && <div className="text-sm text-gray-500">Loading parts...</div>}
            </div>
            
            <div className="space-y-6">
              {weekSections.map((section) => {
                const grouped = groupRows(section.items, organize);
                return (
                  <div key={section.key} className="rounded-xl border">
                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                      <div className="text-sm font-semibold">{section.label}</div>
                      <div className="text-xs text-gray-500">{section.items.length} parts</div>
                    </div>

                    <table className="w-full text-sm">
                      <thead className="bg-white">
                        <tr className="border-b">
                          <th className="p-2 text-left">Part</th>
                          <th className="p-2 text-left">Lam Type</th>
                          <th className="p-2 text-left">Gelcoat</th>
                          <th className="p-2 text-left">Stage</th>
                          <th className="p-2 text-right">Qty</th>
                          <th className="p-2 text-left">Due</th>
                          <th className="p-2 text-left">Assignee</th>
                          <th className="p-2 text-left">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grouped.map(([key, rows]) => (
                          <React.Fragment key={key}>
                            {organize !== "None" && (
                              <tr className="bg-gray-50/70 border-b">
                                <td colSpan={8} className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  {organize === "Boat" && (
                                    <span className="inline-flex items-center gap-2">
                                      <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: rows[0]?.boat.colorHex }} />
                                      {rows[0]?.boat.label} ({rows.length})
                                    </span>
                                  )}
                                  {organize === "Lamination Type" && (
                                    <span>{rows[0]?.lamType} ({rows.length})</span>
                                  )}
                                </td>
                              </tr>
                            )}
                            {rows.map((p) => {
                              const overdue = new Date(p.dueDate) < new Date() && p.stage !== "Done";
                              const finished = p.stage === "Done";
                              const STAGE_COLORS: Record<Stage, string> = {
                                "In Mold": "bg-red-300 text-red-900",
                                "Out of Mold": "bg-orange-300 text-orange-900",
                                "Cutter": "bg-yellow-300 text-yellow-900",
                                "Finishing": "bg-lime-300 text-lime-900",
                                "Done": "bg-green-400 text-green-900",
                              };
                              return (
                                <tr key={p.id}
                                  className={`border-b hover:bg-gray-50 ${finished ? 'line-through opacity-60' : ''}`} 
                                  style={{ borderLeft: `4px solid ${p.boat.colorHex}` }}>
                                  <td className="p-2 align-middle">
                                    <div className="font-medium flex items-center gap-2">
                                      <span>{p.name}</span>
                                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: p.boat.colorHex }}>
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.boat.colorHex }} />
                                        {p.boat.length}‑ft
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-500">Boat: {p.boat.label}</div>
                                  </td>
                                  <td className="p-2 align-middle">
                                    <span className="text-sm">{p.lamType}</span>
                                  </td>
                                  <td className="p-2 align-middle">{p.gelcoat}</td>
                                  <td className="p-2 align-middle">
                                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${STAGE_COLORS[p.stage]}`}>
                                      {p.stage}
                                    </span>
                                  </td>
                                  <td className="p-2 text-right align-middle">
                                    <span className="text-sm">
                                      {p.qtyDone}/{p.qtyNeeded}
                                    </span>
                                  </td>
                                  <td className="p-2 align-middle">
                                    <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : ''}`}>
                                      {new Date(p.dueDate).toLocaleDateString()}
                                    </span>
                                  </td>
                                  <td className="p-2 align-middle">
                                    <span className="text-sm">{p.assignee || "—"}</span>
                                  </td>
                                  <td className="p-2 align-middle">
                                    <span className="text-sm text-gray-600">{p.notes || "—"}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
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