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

// const GELCOAT_OPTIONS = ["White", "Black", "Blue", "Red", "Gray", "Custom"];
// const PROCESS_OPTIONS = ["Infusion", "Open", "Squish"];
const ALERT_TYPES = ["Quality Issue", "Delay", "Material Shortage", "Equipment Problem", "Other"];

// Generate weeks for scheduling display
function getWorkWeeks(startDate, numWeeks = 3) {
  const weeks = [];
  const currentDate = new Date(startDate);
  
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
function groupPartsByWeek(parts: Part[], weeks: Array<{weekStartISO: string; label: string; startDate: Date}>) {
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
  const [selectedCard, setSelectedCard] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [dragging, setDragging] = useState(null);

  // Generate weeks starting from current date
  const weeks = useMemo(() => getWorkWeeks(new Date()), []);

  // Parts data from lamination schedule
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState<any[]>([]);

  // Group parts into week sections (matching schedule layout)
  const weekSections = useMemo(() => {
    return groupPartsByWeek(parts, weeks);
  }, [parts, weeks]);

  // Dynamic boat list from loaded parts
  const boatList = useMemo(() => {
    const boats = new Set(parts.map(part => part.boat.label.split(' • ')[0]));
    return Array.from(boats);
  }, [parts]);

  const [alerts, setAlerts] = useState([]);

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

  // Load schedule data from localStorage/API
  const loadScheduleData = async () => {
    try {
      // First try localStorage (updated by production schedule)
      const localData = localStorage.getItem('scheduleData');
      if (localData) {
        const parsedData = JSON.parse(localData);
        if (parsedData.bars) {
          // Filter for lamination department only
          const laminationBars = parsedData.bars.filter(bar => bar.dept === 'LAM');
          setScheduleData(laminationBars);
          return;
        }
      }

      // Fallback to API
      const response = await fetch('/api/schedule-store');
      if (response.ok) {
        const data = await response.json();
        if (data.bars) {
          const laminationBars = data.bars.filter(bar => bar.dept === 'LAM');
          setScheduleData(laminationBars);
        }
      }
    } catch (error) {
      console.error('Failed to load schedule data:', error);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadPartsFromAPI();
    loadScheduleData();
  }, []);

  // Listen for schedule data changes from production schedule
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'scheduleData') {
        loadScheduleData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Generate dynamic timeline data from production schedule
  const generateTimelineData = () => {
    const now = new Date();
    const timelineData = {};
    const scheduledData = {};

    // Sort schedule data by start date
    const sortedBars = scheduleData.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // Separate by model type
    const model26Bars = sortedBars.filter(bar => bar.model === '26');
    const model40Bars = sortedBars.filter(bar => bar.model === '40');

    // For 26ft boats - show next 3 boats
    model26Bars.slice(0, 3).forEach((bar, index) => {
      const startDate = new Date(bar.start);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + (bar.duration * 7));

      // Calculate progress based on current date
      let progress = 0;
      if (now >= startDate) {
        if (now >= endDate) {
          progress = 100;
        } else {
          const totalDuration = endDate.getTime() - startDate.getTime();
          const elapsed = now.getTime() - startDate.getTime();
          progress = Math.round((elapsed / totalDuration) * 100);
        }
      }

      const barData = {
        boat: bar.boat,
        progress: progress,
        weeks: bar.duration,
        color: bar.color || colorForBoat(bar.boat, parts),
        note: bar.note || `${bar.model}ft boat`,
        startDate: bar.start,
        id: bar.id
      };

      const isCurrentOrStarted = startDate <= now;
      const key = isCurrentOrStarted ? 'Actual' : 'Scheduled';
      const timelineKey = index === 0 ? `LAM 26 ${key}` : `LAM 26 ${key} ${index + 1}`;

      if (isCurrentOrStarted) {
        timelineData[timelineKey] = barData;
      } else {
        scheduledData[timelineKey] = barData;
      }
    });

    // For 40ft boats - show next boats covering at least 9 weeks
    let totalWeeks40 = 0;
    let boatIndex40 = 0;

    while (totalWeeks40 < 9 && boatIndex40 < model40Bars.length) {
      const bar = model40Bars[boatIndex40];
      const startDate = new Date(bar.start);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + (bar.duration * 7));

      // Calculate progress based on current date
      let progress = 0;
      if (now >= startDate) {
        if (now >= endDate) {
          progress = 100;
        } else {
          const totalDuration = endDate.getTime() - startDate.getTime();
          const elapsed = now.getTime() - startDate.getTime();
          progress = Math.round((elapsed / totalDuration) * 100);
        }
      }

      const barData = {
        boat: bar.boat,
        progress: progress,
        weeks: bar.duration,
        color: bar.color || colorForBoat(bar.boat, parts),
        note: bar.note || `${bar.model}ft boat`,
        startDate: bar.start,
        id: bar.id
      };

      const isCurrentOrStarted = startDate <= now;
      const key = isCurrentOrStarted ? 'Actual' : 'Scheduled';
      const timelineKey = boatIndex40 === 0 ? `LAM 40 ${key}` : `LAM 40 ${key} ${boatIndex40 + 1}`;

      if (isCurrentOrStarted) {
        timelineData[timelineKey] = barData;
      } else {
        scheduledData[timelineKey] = barData;
      }

      totalWeeks40 += bar.duration;
      boatIndex40++;
    }

    return { timelineData, scheduledData };
  };

  const { timelineData, scheduledData } = useMemo(() => {
    return generateTimelineData();
  }, [scheduleData, parts]);

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
    
    // Calculate the target date based on the week start date and day index
    const targetDate = new Date(targetWeek.startDate);
    targetDate.setDate(targetDate.getDate() + targetDayIndex);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // Update the part data
    setParts(prev => prev.map(part => 
      part.id === dragging.id 
        ? { ...part, scheduledWeek: targetDateStr }
        : part
    ));
    
    setDragging(null);
  }


  function updateCard(updatedCard) {
    setParts(prev => prev.map(part => 
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

  // Production Timeline Component (copied from production schedule)
  function ProductionTimeline({ scheduleData }) {
    // Helper functions from production schedule
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const isoAddWeeks = (iso, w) => {
      if (!iso) return null;
      const d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      d.setUTCDate(d.getUTCDate() + 7 * w);
      return d.toISOString().slice(0, 10);
    };

    const getWeekMonday = (isoDate) => {
      if (!isoDate) return null;
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return null;
      const day = d.getUTCDay();
      const diff = (day === 0 ? -6 : 1) - day;
      d.setUTCDate(d.getUTCDate() + diff);
      return d.toISOString().slice(0, 10);
    };

    const weekRange = (count, startIso) => {
      const base = startIso ? new Date(startIso) : new Date();
      const wd = base.getUTCDay();
      const monday = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - ((wd + 6) % 7)));
      const arr = [];
      for (let i = 0; i < count; i++) {
        const d = new Date(monday.getTime() + i * ONE_WEEK_MS);
        arr.push(d.toISOString().slice(0, 10));
      }
      return arr;
    };

    const calculateBarHeight = (bar, weeks) => {
      const baseHeight = 48;
      let maxNoteLines = 0;

      const startDate = bar.startIso || bar.start;

      if (bar.weekNotes && startDate) {
        for (let i = 0; i < weeks; i++) {
          const weekIso = isoAddWeeks(startDate, i);
          const weekMonday = getWeekMonday(weekIso);
          if (weekMonday) {
            const note = bar.weekNotes[weekMonday];
            if (note) {
              const explicitLines = note.split('\n').length;
              const totalChars = note.length;
              const wrappedLines = Math.ceil(totalChars / 30);
              const actualLines = Math.max(explicitLines, wrappedLines);
              maxNoteLines = Math.max(maxNoteLines, actualLines);
            }
          }
        }
      }

      return baseHeight + (maxNoteLines * 18);
    };

    const colorForBoatProd = (name, bars = []) => {
      const boatBar = bars.find(b => b.boat === name && b.color);
      if (boatBar?.color) return boatBar.color;
      let h = 0;
      for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
      return `hsl(${h % 360} 85% 35%)`;
    };

    const colorForBoatBgProd = (name, bars = []) => {
      const boatBar = bars.find(b => b.boat === name && b.color);
      if (boatBar?.color) {
        const hex = boatBar.color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, 0.4)`;
      }
      let h = 0;
      for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
      return `hsla(${h % 360}, 85%, 45%, 0.4)`;
    };

    // Generate 9 weeks from current date
    const weeks = useMemo(() => weekRange(9), []);
    const weekIndex = useMemo(() => new Map(weeks.map((w, i) => [w, i])), [weeks]);

    // Filter for lamination department only
    const laminationBars = scheduleData.filter(bar => bar.dept === 'LAM');

    // Convert bars to runs format for compatibility
    const runs = useMemo(() => {
      return laminationBars.map(bar => ({
        id: bar.id,
        boat: bar.boat,
        model: bar.model,
        dept: 'lamination',
        startIso: bar.start,
        weeks: bar.duration,
        note: bar.note,
        weekNotes: bar.weekNotes || {}
      }));
    }, [laminationBars]);

    const sortRuns = (a, b) => {
      if (a.model !== b.model) return a.model === '26' ? -1 : 1;
      if (a.startIso !== b.startIso) return a.startIso < b.startIso ? -1 : 1;
      return a.id.localeCompare(b.id);
    };

    // Calculate max height for each model
    const model26Bars = runs.filter(r => r.model === '26');
    const maxModel26Height = model26Bars.reduce((max, bar) => {
      const height = calculateBarHeight(bar, bar.weeks);
      return Math.max(max, height);
    }, 48);

    const model40Bars = runs.filter(r => r.model === '40');
    const maxModel40Height = model40Bars.reduce((max, bar) => {
      const height = calculateBarHeight(bar, bar.weeks);
      return Math.max(max, height);
    }, 48);

    const totalHeight = model40Bars.length > 0
      ? (12 + maxModel26Height + 20 + maxModel40Height + 20)
      : (12 + maxModel26Height + 20);

    const maxBarHeight = Math.max(totalHeight, 160);

    return (
      <div className="overflow-auto max-h-[400px] border border-gray-300">
        <table className="min-w-[1200px] w-full border-collapse">
          <thead className="bg-neutral-50">
            <tr>
              <th className="sticky left-0 top-0 bg-neutral-50 border border-gray-300 px-2 py-1 text-left w-44" style={{ zIndex: 1000, backgroundColor: 'rgb(250 250 250)' }}>Lamination</th>
              {weeks.map(w => (
                <th key={w} className="sticky top-0 border border-gray-300 px-2 py-1 text-center text-xs whitespace-nowrap bg-neutral-50" style={{ minWidth: '200px', zIndex: 999, backgroundColor: 'rgb(250 250 250)' }}>
                  {new Date(w).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="sticky left-0 bg-white border border-gray-300 px-2 py-1 text-left capitalize" style={{ zIndex: 999, backgroundColor: 'white' }}>Lamination</th>
              <td className="p-0 border" colSpan={weeks.length}>
                <div className="relative" style={{ minHeight: `${maxBarHeight}px` }}>

                  {/* Week grid background */}
                  <div className="absolute inset-0" style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks.length}, 200px)` }}>
                    {weeks.map((w) => (
                      <div
                        key={w}
                        className="border-l first:border-l-0 border-gray-300"
                        style={{ minHeight: '100%' }}
                      />
                    ))}
                  </div>

                  {/* Boats */}
                  {runs.sort(sortRuns).map((r) => {
                    const startIdx = weekIndex.get(r.startIso);
                    if (startIdx == null || startIdx < 0) return null;
                    const span = Math.max(1, Math.min(r.weeks, weeks.length - startIdx));
                    const boatColor = colorForBoatProd(r.boat, laminationBars);
                    const boatBgColor = colorForBoatBgProd(r.boat, laminationBars);

                    const topOffset = r.model === '26' ? 12 : (12 + maxModel26Height + 20);
                    const barHeight = calculateBarHeight(r, r.weeks);

                    return (
                      <div
                        key={r.id}
                        className="absolute flex flex-col justify-start p-2 text-sm font-semibold text-gray-800 rounded border-2 select-none shadow-md"
                        style={{
                          left: `${startIdx * 200}px`,
                          width: `${span * 200}px`,
                          top: `${topOffset}px`,
                          height: `${barHeight}px`,
                          borderColor: boatColor,
                          backgroundColor: boatBgColor,
                          zIndex: r.model === '26' ? 60 : 30,
                          overflow: 'visible'
                        }}
                        title={`${r.boat} — ${r.dept} (${r.weeks}w)`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="truncate text-center flex-1">{r.boat} <span className="opacity-60 text-[10px]">({r.model})</span></div>
                        </div>

                        {/* Notes display */}
                        <div className="text-xs text-gray-700 mt-1" style={{ display: 'grid', gridTemplateColumns: `repeat(${span}, 200px)`, overflow: 'visible' }}>
                          {Array.from({ length: span }).map((_, i) => {
                            const weekIso = isoAddWeeks(r.startIso, i);
                            const weekMonday = getWeekMonday(weekIso);
                            const note = weekMonday ? r.weekNotes?.[weekMonday] : null;
                            return (
                              <div key={i} className="px-1 border-l first:border-l-0 border-neutral-300/30 text-left overflow-visible" style={{ fontSize: '11px', lineHeight: '14px', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                {note || ''}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
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
            </div>

            <div className="text-center text-gray-500 py-8">
              <p>No alerts at this time</p>
            </div>
          </div>

          {/* Production Schedule Timeline - Lamination Only */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Lamination Timeline (Read-Only)</h2>
              <div className="text-sm text-gray-500">9 weeks view from Production Schedule</div>
            </div>

            <ProductionTimeline scheduleData={scheduleData} />
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