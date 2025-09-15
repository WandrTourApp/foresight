'use client';

import React from "react";
import { useAllBars, useScheduleStore } from '../lib/schedule-store';

// Enhanced timeline with add/subtract weeks and improved drag & drop + notes
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const isoAddWeeks = (iso, w) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + 7 * w);
  return d.toISOString().slice(0, 10);
};

// Get the Monday ISO date for any given date (canonical week key)
const getWeekMonday = (isoDate) => {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday is day 1
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
};
const colorForBoat = (name, bars = []) => {
  // First check if boat has a stored custom color
  const boatBar = bars.find(b => b.boat === name && b.color);
  if (boatBar?.color) return boatBar.color;

  // Fallback to generated color
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 85% 35%)`;
};

const colorForBoatBg = (name, bars = []) => {
  // First check if boat has a stored custom color
  const boatBar = bars.find(b => b.boat === name && b.color);
  if (boatBar?.color) {
    // Convert hex to rgba with transparency
    const hex = boatBar.color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, 0.4)`;
  }

  // Fallback to generated color
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsla(${h % 360}, 85%, 45%, 0.4)`;
};

// Predefined color palette - lighter, less opaque colors for better distinction
const COLOR_PALETTE = [
  '#60a5fa', // Light Blue
  '#f87171', // Light Red
  '#4ade80', // Light Green
  '#fb923c', // Light Orange
  '#a78bfa', // Light Purple
  '#22d3ee', // Light Cyan
  '#f472b6', // Light Rose
  '#2dd4bf', // Light Teal
  '#fbbf24', // Light Yellow
  '#facc15', // Golden Yellow
  '#fde047', // Sunny Yellow
  '#fdba74', // Light Amber
  '#f97316', // Light Chocolate
  '#e9a23b', // Light Peru
  '#fed7aa', // Light Sandy Brown
  '#e5b85c', // Light Tan
  '#ec4899', // Hot Pink
  '#84cc16', // Light Lime Green
  '#fb7185', // Light Coral
  '#67e8f9', // Light Turquoise
];

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

const base = weekRange(1)[0];

// Helper to calculate bar height based on notes content
const calculateBarHeight = (bar, weeks) => {
  const baseHeight = 48;
  let maxNoteLines = 0;
  
  // Use startIso for runs, start for bars
  const startDate = bar.startIso || bar.start;
  
  if (bar.weekNotes && startDate) {
    for (let i = 0; i < weeks; i++) {
      const weekIso = isoAddWeeks(startDate, i);
      const weekMonday = getWeekMonday(weekIso);
      if (weekMonday) {
        const note = bar.weekNotes[weekMonday];
        if (note) {
          // Count actual line breaks plus wrapped lines
          const explicitLines = note.split('\n').length;
          const totalChars = note.length;
          const wrappedLines = Math.ceil(totalChars / 30); // ~30 chars per line for 200px width
          const actualLines = Math.max(explicitLines, wrappedLines);
          maxNoteLines = Math.max(maxNoteLines, actualLines);
        }
      }
    }
  }
  
  // Add 18px per line of notes for better readability
  return baseHeight + (maxNoteLines * 18);
};
const mk26 = (boat) => [
  { id: boat + "-26-lam", boat: boat, model: "26", dept: "lamination", startIso: base, weeks: 3 },
  { id: boat + "-26-ass", boat: boat, model: "26", dept: "assembly", startIso: isoAddWeeks(base, 3), weeks: 3 },
  { id: boat + "-26-fin", boat: boat, model: "26", dept: "finishing", startIso: isoAddWeeks(base, 6), weeks: 3 },
  { id: boat + "-26-rig", boat: boat, model: "26", dept: "rigging", startIso: isoAddWeeks(base, 9), weeks: 3 },
  { id: boat + "-26-qc", boat: boat, model: "26", dept: "qc", startIso: isoAddWeeks(base, 12), weeks: 1 }
];
const mk40 = (boat) => [
  { id: boat + "-40-lam", boat: boat, model: "40", dept: "lamination", startIso: base, weeks: 8 },
  { id: boat + "-40-ass", boat: boat, model: "40", dept: "assembly", startIso: isoAddWeeks(base, 8), weeks: 8 },
  { id: boat + "-40-fin", boat: boat, model: "40", dept: "finishing", startIso: isoAddWeeks(base, 16), weeks: 8 },
  { id: boat + "-40-rig", boat: boat, model: "40", dept: "rigging", startIso: isoAddWeeks(base, 24), weeks: 8 },
  { id: boat + "-40-qc", boat: boat, model: "40", dept: "qc", startIso: isoAddWeeks(base, 32), weeks: 1 }
];

export default function TimelineWithAddBoat() {
  const bars = useAllBars();
  const { addBars, setBars, updateBar, updateWeekNote, addWeek, splitBar, mergeBar, deleteBars } = useScheduleStore();
  const hasLoadedRef = React.useRef(false);
  const [isSaving, setIsSaving] = React.useState(false);
  
  // Load data from API on mount (only once)
  React.useEffect(() => {
    if (hasLoadedRef.current) return;
    
    const loadData = async () => {
      try {
        const response = await fetch('/api/schedule-store');
        if (response.ok) {
          const data = await response.json();
          if (data.bars && data.bars.length > 0) {
            setBars(data.bars);
            hasLoadedRef.current = true;
            // Also save to localStorage for other dashboards
            localStorage.setItem('scheduleData', JSON.stringify(data));
          }
        }
      } catch (error) {
        console.error('Failed to load schedule data:', error);
      }
    };
    
    loadData();
  }, []); // Remove addBars dependency to prevent re-runs
  
  // Save function
  const saveSchedule = async () => {
    setIsSaving(true);
    try {
      // Save to API
      const response = await fetch('/api/schedule-store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bars, tasks: [] })
      });

      if (response.ok) {
        // Also save to localStorage for other dashboards to access
        localStorage.setItem('scheduleData', JSON.stringify({ bars, tasks: [] }));
        console.log('Schedule saved successfully');
      } else {
        console.error('Failed to save schedule');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const weeks = React.useMemo(() => weekRange(40), []);
  const weekIndex = React.useMemo(() => new Map(weeks.map((w, i) => [w, i])), [weeks]);

  // Convert bars to runs format for compatibility with existing UI
  const runs = React.useMemo(() => {
    const deptMapping = {
      'LAM': 'lamination',
      'ASM': 'assembly', 
      'FIN': 'finishing',
      'RIG': 'rigging'
    };
    
    return bars.map(bar => ({
      id: bar.id,
      boat: bar.boat,
      model: bar.model,
      dept: deptMapping[bar.dept] || bar.dept.toLowerCase(),
      startIso: bar.start,
      weeks: bar.duration,
      note: bar.note,
      weekNotes: bar.weekNotes || {}
    }));
  }, [bars]);

  // State for UI interactions (remove undo/redo for now as provider manages state)

  const [hoverWeek, setHoverWeek] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [statusCtx, setStatusCtx] = React.useState(null);
  const [notes, setNotes] = React.useState({});
  const [addBoatOpen, setAddBoatOpen] = React.useState(false);
  const [newBoatName, setNewBoatName] = React.useState('');
  const [newBoatModel, setNewBoatModel] = React.useState('26');
  const [newBoatType, setNewBoatType] = React.useState('Open');

  // Enhanced drag and drop
  const [draggingId, setDraggingId] = React.useState(null);
  const [dragOverInfo, setDragOverInfo] = React.useState(null);
  
  // 3-dot menu for boats
  const [openMenuId, setOpenMenuId] = React.useState(null);
  const [colorPickerOpen, setColorPickerOpen] = React.useState(null); // boat name when color picker is open

  // Helper functions for color management
  const getUsedColors = () => {
    const usedColors = new Set();
    bars.forEach(bar => {
      if (bar.color) usedColors.add(bar.color);
    });
    return Array.from(usedColors);
  };

  const getBoatColor = (boatName) => {
    const bar = bars.find(b => b.boat === boatName);
    return bar?.color || null;
  };

  const getNextAvailableColor = () => {
    const usedColors = getUsedColors();
    for (const color of COLOR_PALETTE) {
      if (!usedColors.includes(color)) {
        return color;
      }
    }
    // If all colors are used, fall back to first color (shouldn't happen with 12 colors)
    return COLOR_PALETTE[0];
  };

  const changeBoatColor = async (boatName, newColor) => {
    // Update all bars for this boat
    const boatBars = bars.filter(b => b.boat === boatName);
    boatBars.forEach(bar => {
      updateBar(bar.id, { color: newColor });
    });

    // Also update the fiberglass boats data
    try {
      const existingBoats = JSON.parse(localStorage.getItem('fiberglassBoats') || '[]');
      const updatedBoats = existingBoats.map(boat => {
        if (boat.name.includes(boatName)) {
          return { ...boat, color: newColor };
        }
        return boat;
      });
      localStorage.setItem('fiberglassBoats', JSON.stringify(updatedBoats));
    } catch (error) {
      console.error('Failed to update boat color in fiberglass data:', error);
    }

    setColorPickerOpen(null);
  };

  React.useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (typing) return;
      if (!selected) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const run = runs.find(r => r.id === selected.runId);
        if (run) { 
          // For now, just reduce duration by 1 week
          updateBar(run.id, { duration: Math.max(1, run.weeks - 1) });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, runs, updateBar]);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId) {
        setOpenMenuId(null);
      }
    };
    
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  const deleteWeekFromRun = (run, weekIso) => {
    const startIdx = weekIndex.get(run.startIso) ?? -1;
    const delIdx = weekIndex.get(weekIso) ?? -1;
    if (startIdx < 0 || delIdx < 0) return;
    const offset = delIdx - startIdx;
    if (offset < 0 || offset >= run.weeks) return;
    const leftWeeks = offset;
    const rightWeeks = run.weeks - offset - 1;
    // Use provider's splitBar if we're splitting, otherwise just reduce duration
    if (leftWeeks > 0 && rightWeeks > 0) {
      splitBar(run.id, [leftWeeks, rightWeeks]);
    } else {
      updateBar(run.id, { duration: run.weeks - 1 });
    }
    setSelected(null); setStatusOpen(false);
  };

  const addWeekToRun = () => {
    if (!selected) return;
    const run = runs.find(r => r.id === selected.runId);
    if (!run) return;
    // Use provider's addWeek function
    addWeek(selected.runId, 0);
    if (statusCtx) {
      setStatusCtx({ ...statusCtx, totalWeeks: run.weeks + 1 });
    }
  };

  const subtractWeekFromRun = () => {
    if (!selected) return;
    const run = runs.find(r => r.id === selected.runId);
    if (!run || run.weeks <= 1) return;
    // Update duration in provider
    updateBar(selected.runId, { duration: run.weeks - 1 });
    if (statusCtx) {
      setStatusCtx({ ...statusCtx, totalWeeks: run.weeks - 1 });
    }
  };

  const addNewBoat = async () => {
    if (!newBoatName.trim()) return;
    
    // Find the latest end date across all boats
    let latestEndWeek = 0;
    runs.forEach(run => {
      const startIdx = weekIndex.get(run.startIso) ?? 0;
      const endIdx = startIdx + run.weeks - 1;
      latestEndWeek = Math.max(latestEndWeek, endIdx);
    });
    
    // Start new boat right after the latest end (add 1 week buffer)
    const newStartIdx = latestEndWeek + 1;
    const newStartIso = weeks[newStartIdx] || weeks[weeks.length - 10];
    
    // Create new boat bars for provider
    const timestamp = Date.now();
    const newBars = [];
    const newColor = getNextAvailableColor(); // Get an available color for the new boat

    if (newBoatModel === '26') {
      newBars.push(
        { id: `${newBoatName}-LAM-${timestamp}`, boat: newBoatName, model: '26', dept: 'LAM', start: newStartIso, duration: 3, boatType: newBoatType, color: newColor },
        { id: `${newBoatName}-ASM-${timestamp}`, boat: newBoatName, model: '26', dept: 'ASM', start: isoAddWeeks(newStartIso, 3), duration: 3, boatType: newBoatType, color: newColor },
        { id: `${newBoatName}-FIN-${timestamp}`, boat: newBoatName, model: '26', dept: 'FIN', start: isoAddWeeks(newStartIso, 6), duration: 3, boatType: newBoatType, color: newColor },
        { id: `${newBoatName}-RIG-${timestamp}`, boat: newBoatName, model: '26', dept: 'RIG', start: isoAddWeeks(newStartIso, 9), duration: 3, boatType: newBoatType, color: newColor }
      );
    } else {
      newBars.push(
        { id: `${newBoatName}-LAM-${timestamp}`, boat: newBoatName, model: '40', dept: 'LAM', start: newStartIso, duration: 8, boatType: newBoatType, color: newColor },
        { id: `${newBoatName}-ASM-${timestamp}`, boat: newBoatName, model: '40', dept: 'ASM', start: isoAddWeeks(newStartIso, 8), duration: 8, boatType: newBoatType, color: newColor },
        { id: `${newBoatName}-FIN-${timestamp}`, boat: newBoatName, model: '40', dept: 'FIN', start: isoAddWeeks(newStartIso, 16), duration: 8, boatType: newBoatType, color: newColor },
        { id: `${newBoatName}-RIG-${timestamp}`, boat: newBoatName, model: '40', dept: 'RIG', start: isoAddWeeks(newStartIso, 24), duration: 8, boatType: newBoatType, color: newColor }
      );
    }
    
    addBars(newBars);
    
    // Auto-generate parts based on boat type (for 26ft boats only for now)
    if (newBoatModel === '26') {
      await generatePartsForBoat(newBoatName, newBoatModel, newBoatType, newColor);
    }
    
    // Reset form
    setNewBoatName('');
    setNewBoatModel('26');
    setNewBoatType('Open');
    setAddBoatOpen(false);
  };

  // Function to automatically generate parts for a new boat
  const generatePartsForBoat = async (boatName, model, boatType, color) => {
    try {
      // Load master parts catalog
      const catalogResponse = await fetch('/master-parts-catalog.json');
      if (!catalogResponse.ok) {
        console.error('Catalog fetch failed:', catalogResponse.status, catalogResponse.statusText);
        throw new Error(`Failed to fetch catalog: ${catalogResponse.status}`);
      }
      
      const catalogText = await catalogResponse.text();
      let catalog;
      try {
        catalog = JSON.parse(catalogText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response text:', catalogText);
        throw new Error('Invalid JSON response from catalog');
      }
      
      // Filter parts based on boat type
      const configMapping = {
        "Open": ["All Boats", "All Open", "Open Boats Only"],
        "Bay Boat": ["All Boats", "Bay"],
        "Open with Forward Seating": ["All Boats", "All Open", "Open Boats Only", "Open with Forward Seating"]
      };
      
      // Map boat type to configuration format expected by parts system
      const boatConfig = boatType === "Open" ? "Open" : 
                        boatType === "Bay" ? "Bay Boat" : 
                        "Open with Forward Seating";
      
      const relevantBoatTypes = configMapping[boatConfig] || configMapping["Open"];
      const filteredParts = catalog.masterParts?.filter(part => 
        part.boatTypes.some(type => relevantBoatTypes.includes(type))
      ) || [];

      // Create boat parts with smart defaults
      const boatParts = filteredParts.map(masterPart => {
        // Smart lamination type assignment
        let lamType = "Hand Layup";
        if (masterPart.name.toLowerCase().includes("hull")) {
          lamType = "Skin";
        } else if (masterPart.name.toLowerCase().includes("fishbox") || 
                   masterPart.name.toLowerCase().includes("livewell") ||
                   masterPart.name.toLowerCase().includes("tub")) {
          lamType = "Infusion";
        }

        // Smart gelcoat assignment
        let gelColor = "White";
        if (masterPart.name.toLowerCase().includes("fishbox") && masterPart.name.includes("55")) {
          gelColor = "Dresdin Blue";
        } else if (masterPart.name.toLowerCase().includes("hull")) {
          gelColor = "Light Blue";
        } else if (masterPart.name.toLowerCase().includes("baitwell")) {
          gelColor = "Dresdin Blue";
        }

        return {
          id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          masterPartId: masterPart.id,
          name: masterPart.name,
          category: masterPart.category,
          qtyNeeded: masterPart.qtyPerBoat,
          status: "unscheduled",
          notes: masterPart.notes || "",
          location: masterPart.location || "",
          gelColor
        };
      });

      // Create new boat entry for parts system
      const newBoat = {
        id: `boat-${Date.now()}`,
        name: `${boatName} ${model}ft`,
        configuration: boatConfig,
        color: color || (model === '40' ? "#0ea5e9" : "#f97316"), // Use provided color or default
        parts: boatParts,
        createdDate: new Date().toISOString(),
      };

      // Save to localStorage (same as parts page does)
      const existingBoats = JSON.parse(localStorage.getItem('fiberglassBoats') || '[]');
      const updatedBoats = [...existingBoats, newBoat];
      localStorage.setItem('fiberglassBoats', JSON.stringify(updatedBoats));

      console.log(`✅ Auto-generated ${boatParts.length} parts for ${newBoat.name} (${boatConfig})`);
    } catch (error) {
      console.error('Failed to generate parts for boat:', error);
      // Don't block boat creation if parts generation fails
    }
  };

  const onDropDeptWeek = (dept, weekIso) => {
    if (!draggingId) return;
    const run = runs.find(r => r.id === draggingId);
    if (!run) return;
    
    const currentStartIdx = weekIndex.get(run.startIso) ?? 0;
    const dropIdx = weekIndex.get(weekIso) ?? 0;
    
    let newStartIdx;
    if (dropIdx > currentStartIdx) {
      // Moving forward - make the END align with drop position
      newStartIdx = dropIdx - (run.weeks - 1);
    } else {
      // Moving backward - make the START align with drop position  
      newStartIdx = dropIdx;
    }
    
    // Ensure we don't go negative
    newStartIdx = Math.max(0, newStartIdx);
    const newStartIso = weeks[newStartIdx];
    
    if (!newStartIso) return;
    
    // Update the bar in provider with new start date and department
    updateBar(draggingId, { start: newStartIso, dept: dept.toUpperCase() });
    setDraggingId(null); 
    setDragOverInfo(null);
  };

  const sortRuns = (a, b) => {
    if (a.dept !== b.dept) return a.dept.localeCompare(b.dept);
    if (a.model !== b.model) return a.model === '26' ? -1 : 1;
    if (a.startIso !== b.startIso) return a.startIso < b.startIso ? -1 : 1;
    return a.id.localeCompare(b.id);
  };

  const depts = ['lamination', 'assembly', 'finishing', 'rigging', 'qc'];

  const percentFor = (run, weekIso) => {
    const startIdx = weekIndex.get(run.startIso) ?? 0;
    const idx = weekIndex.get(weekIso) ?? 0;
    const pos = Math.max(0, Math.min(run.weeks - 1, idx - startIdx));
    return Math.round(((pos + 1) / run.weeks) * 100);
  };

  const selectedRun = selected ? runs.find(r => r.id === selected.runId) : null;
  
  // Delete all bars for a boat
  const handleDeleteBoat = (boatName) => {
    if (confirm(`Are you sure you want to delete all departments for boat "${boatName}"? This cannot be undone.`)) {
      deleteBars(boatName);
      setOpenMenuId(null);
    }
  };

  return (
    <div className="p-2 space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Production Timeline</h1>
        <div className="flex items-center gap-2">
          <button 
            className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            onClick={saveSchedule}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Schedule'}
          </button>
          <button 
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => setAddBoatOpen(true)}
          >
            + Add Boat
          </button>
        </div>
      </div>
      
      <div className="overflow-auto max-h-[calc(100vh-120px)] border border-gray-300">
        <table className="min-w-[1200px] w-full border-collapse">
          <thead className="bg-neutral-50">
            <tr>
              <th className="sticky left-0 top-0 bg-neutral-50 border border-gray-300 px-2 py-1 text-left w-44" style={{ zIndex: 1000, backgroundColor: 'rgb(250 250 250)' }}>Department / Actual</th>
              {weeks.map(w => (
                <th key={w} className="sticky top-0 border border-gray-300 px-2 py-1 text-center text-xs whitespace-nowrap bg-neutral-50" style={{ minWidth: '200px', zIndex: 999, backgroundColor: 'rgb(250 250 250)' }}>
                  {new Date(w).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {depts.map((dept) => {
              // Calculate the minimum height needed for this department row
              const deptRuns = runs.filter(r => r.dept === dept);
              
              // Calculate max height for Model 26 bars
              const model26Bars = deptRuns.filter(r => r.model === '26');
              const maxModel26Height = model26Bars.reduce((max, bar) => {
                const height = calculateBarHeight(bar, bar.weeks);
                return Math.max(max, height);
              }, 48); // minimum bar height
              
              // Calculate max height for Model 40 bars
              const model40Bars = deptRuns.filter(r => r.model === '40');
              const maxModel40Height = model40Bars.reduce((max, bar) => {
                const height = calculateBarHeight(bar, bar.weeks);
                return Math.max(max, height);
              }, 48); // minimum bar height
              
              // Total row height needs to accommodate both rows with dynamic positioning
              const totalHeight = model40Bars.length > 0 
                ? (12 + maxModel26Height + 20 + maxModel40Height + 20) // top padding + model26 + gap + model40 + bottom padding
                : (12 + maxModel26Height + 20); // just model26 with padding
              
              const maxBarHeight = Math.max(totalHeight, 160); // minimum 160px

              return (
                <tr key={dept}>
                  <th className="sticky left-0 bg-white border border-gray-300 px-2 py-1 text-left capitalize" style={{ zIndex: 999, backgroundColor: 'white' }}>{dept}</th>
                  <td className="p-0 border" colSpan={weeks.length}>
                    <div className="relative" style={{ minHeight: `${maxBarHeight}px` }}>
                    
                    {/* Week grid background */}
                    <div className="absolute inset-0" style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks.length}, 200px)` }}>
                      {weeks.map((w) => (
                        <div
                          key={w}
                          onDragOver={(e) => { e.preventDefault(); setDragOverInfo({ dept, weekIso: w }); }}
                          onDrop={() => onDropDeptWeek(dept, w)}
                          onMouseEnter={() => setHoverWeek(w)}
                          onMouseLeave={() => { setHoverWeek(null); setDragOverInfo(null); }}
                          className={`border-l first:border-l-0 border-gray-300 ${dragOverInfo && dragOverInfo.dept === dept && dragOverInfo.weekIso === w ? 'bg-blue-100 border-blue-400' : ''}`}
                          style={{ minHeight: '100%' }}
                        />
                      ))}
                    </div>

                    {/* Boats */}
                    {runs.filter(r => r.dept === dept).sort(sortRuns).map((r) => {
                      const startIdx = weekIndex.get(r.startIso);
                      if (startIdx == null || startIdx < 0) return null;
                      const span = Math.max(1, Math.min(r.weeks, weeks.length - startIdx));
                      const boatColor = colorForBoat(r.boat, bars);
                      const boatBgColor = colorForBoatBg(r.boat, bars);
                      const isDragging = draggingId === r.id;
                      const isSelected = selected && selected.runId === r.id;
                      
                      // Calculate dynamic position - Model 40s need to be below all Model 26s
                      const model26Bars = runs.filter(run => run.dept === dept && run.model === '26');
                      const maxModel26Height = model26Bars.reduce((max, bar26) => {
                        const height = calculateBarHeight(bar26, bar26.weeks);
                        return Math.max(max, height);
                      }, 48); // minimum bar height
                      
                      const topOffset = r.model === '26' ? 12 : (12 + maxModel26Height + 20); // 20px gap between rows
                      const barHeight = calculateBarHeight(r, r.weeks);
                      
                      return (
                        <div
                          key={r.id}
                          draggable
                          onDragStart={(e) => { 
                            setDraggingId(r.id); 
                            e.dataTransfer.effectAllowed = 'move';
                            try { e.dataTransfer.setData('text/plain', r.id); } catch {} 
                          }}
                          onDragEnd={() => { setDraggingId(null); setDragOverInfo(null); }}
                          className={`absolute flex flex-col justify-start p-2 text-sm font-semibold text-gray-800 rounded border-2 select-none cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-70' : ''} ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'shadow-md'}`}
                          style={{
                            left: `${startIdx * 200}px`,
                            width: `${span * 200}px`,
                            top: `${topOffset}px`,
                            height: `${barHeight}px`,
                            borderColor: boatColor,
                            backgroundColor: boatBgColor,
                            zIndex: openMenuId === r.id ? 500 : (isSelected ? 200 : (r.model === '26' ? 60 : 30)),
                            overflow: 'visible'
                          }}
                          title={`${r.boat} — ${r.dept} (${r.weeks}w) - Drag to move`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="truncate text-center flex-1">{r.boat} <span className="opacity-60 text-[10px]">({r.model})</span></div>
                            <div className="relative" style={{ zIndex: 100 }}>
                              <button
                                className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === r.id ? null : r.id);
                                }}
                              >
                                ⋯
                              </button>
                              {openMenuId === r.id && (
                                <div className="absolute right-0 mt-1 w-28 bg-white border border-gray-200 rounded-md shadow-lg z-[9999]">
                                  <button
                                    className="w-full px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteBoat(r.boat);
                                    }}
                                  >
                                    🗑️ Delete Boat
                                  </button>
                                  <button
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // TODO: Implement split week functionality
                                      console.log('Split week for bar:', r.id);
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    ✂️ Split Week
                                  </button>
                                  <button
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // TODO: Implement merge week functionality
                                      console.log('Merge week for bar:', r.id);
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    📎 Merge Week
                                  </button>
                                  <button
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setColorPickerOpen(r.boat);
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    🎨 Change Color
                                  </button>
                                </div>
                              )}
                            </div>
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
                          
                          {/* Week selection buttons - exclude area under 3-dot menu */}
                          <div className="absolute inset-0" style={{ display: 'grid', gridTemplateColumns: `repeat(${span}, 200px)` }}>
                            {Array.from({ length: span }).map((_, i) => {
                              const iso = isoAddWeeks(r.startIso, i);
                              const active = selected && selected.runId === r.id && selected.weekIso === iso;
                              const isFirstWeek = i === 0;
                              return (
                                <button
                                  key={i}
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const weekMonday = getWeekMonday(iso);
                                    setSelected({ runId: r.id, weekIso: weekMonday }); 
                                    setStatusCtx({ boat: r.boat, dept: r.dept, model: r.model, weekIso: weekMonday, weekNum: i + 1, totalWeeks: r.weeks }); 
                                    setStatusOpen(true); 
                                  }}
                                  className={`border-l first:border-l-0 border-neutral-300/30 focus:outline-none hover:bg-blue-50/60 ${active ? 'bg-blue-200/70' : ''}`}
                                  style={{ 
                                    pointerEvents: isDragging ? 'none' : 'auto',
                                    // For first week, exclude the right 32px where 3-dot menu is
                                    clipPath: isFirstWeek ? 'polygon(0 0, calc(100% - 32px) 0, calc(100% - 32px) 100%, 0 100%)' : 'none'
                                  }}
                                  aria-label={`Select week ${iso}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {addBoatOpen && (
        <div className="fixed left-4 top-1/2 transform -translate-y-1/2 w-[320px] bg-white shadow-xl border rounded-lg p-4" style={{ zIndex: 10000 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Add New Boat</div>
            <button className="text-sm px-2 py-1 border rounded" onClick={() => setAddBoatOpen(false)}>Cancel</button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Boat Name</label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                placeholder="Enter boat name..."
                value={newBoatName}
                onChange={(e) => setNewBoatName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addNewBoat()}
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Boat Type</label>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={newBoatType}
                onChange={(e) => setNewBoatType(e.target.value)}
              >
                <option value="Open">Open Sportfish (~22 parts)</option>
                <option value="Bay">Bay Boat (~28 parts)</option>
                <option value="Open with Forward Seating">Open w/ Forward Seating (~25 parts)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={newBoatModel}
                onChange={(e) => setNewBoatModel(e.target.value)}
              >
                <option value="26">Model 26 (3 weeks per dept)</option>
                <option value="40">Model 40 (8 weeks per dept)</option>
              </select>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button
                className="flex-1 bg-black text-white px-3 py-2 rounded text-sm hover:opacity-90 disabled:opacity-50"
                onClick={addNewBoat}
                disabled={!newBoatName.trim()}
              >
                Create Boat
              </button>
            </div>
            
            <div className="text-xs text-neutral-600">
              New boat will be scheduled after the last boat in the timeline.<br/>
              <span className="font-medium text-green-700">Auto-generates complete parts list</span> for lamination tracking.
            </div>
          </div>
        </div>
      )}

      {statusOpen && statusCtx && (
        <div className="fixed right-0 top-0 h-full w-[380px] bg-white shadow-xl border-l p-4" style={{ zIndex: 10000 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Week Status</div>
            <button className="text-sm px-2 py-1 border rounded" onClick={() => setStatusOpen(false)}>Close</button>
          </div>
          
          <div className="mb-4 p-3 bg-neutral-50 rounded border">
            <div className="font-medium mb-2 text-sm">Adjust Timeline</div>
            <div className="flex items-center gap-2">
              <button 
                className="px-3 py-1 text-sm border rounded hover:bg-neutral-100 disabled:opacity-50"
                onClick={subtractWeekFromRun}
                disabled={!selectedRun || selectedRun.weeks <= 1}
                title="Remove one week from this run"
              >
                - Week
              </button>
              <span className="text-sm text-neutral-600 px-2">
                {selectedRun ? selectedRun.weeks : 0} weeks
              </span>
              <button 
                className="px-3 py-1 text-sm border rounded hover:bg-neutral-100"
                onClick={addWeekToRun}
                disabled={!selectedRun}
                title="Add one week to this run"
              >
                + Week
              </button>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Boat:</span> {statusCtx.boat} <span className="opacity-60">({statusCtx.model})</span></div>
            <div className="capitalize"><span className="font-medium">Dept:</span> {statusCtx.dept}</div>
            <div><span className="font-medium">Week:</span> {new Date(statusCtx.weekIso).toLocaleDateString()} (#{statusCtx.weekNum} of {statusCtx.totalWeeks})</div>
            <div className="flex items-center gap-2">
              <span className="font-medium">% complete:</span>
              <div className="flex-1 h-2 bg-neutral-200 rounded">
                <div className="h-2 bg-black rounded" style={{ width: `${percentFor(selectedRun || { weeks: 1, startIso: statusCtx.weekIso }, statusCtx.weekIso)}%` }} />
              </div>
              <span className="tabular-nums">{percentFor(selectedRun || { weeks: 1, startIso: statusCtx.weekIso }, statusCtx.weekIso)}%</span>
            </div>
            <div>
              <div className="font-medium mb-1">Notes</div>
              <textarea
                className="w-full h-24 border rounded p-2 resize-none"
                placeholder="Add quick notes for this week…"
                value={selectedRun?.weekNotes?.[statusCtx.weekIso] || ''}
                onChange={e => {
                  if (selectedRun) {
                    updateWeekNote(selectedRun.id, statusCtx.weekIso, e.target.value);
                  }
                }}
              />
              <button
                className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                onClick={saveSchedule}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
            <div>
              <a href={`/tracker?boat=${encodeURIComponent(statusCtx.boat)}&open=1`} className="inline-block mt-1 text-white bg-black px-3 py-1.5 rounded hover:opacity-90">Open Boat</a>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Modal */}
      {colorPickerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Choose Color for {colorPickerOpen}</h3>

            <div className="grid grid-cols-5 gap-3 mb-4">
              {COLOR_PALETTE.map((color) => {
                const isUsed = getUsedColors().includes(color) && getBoatColor(colorPickerOpen) !== color;
                const isCurrent = getBoatColor(colorPickerOpen) === color;

                return (
                  <button
                    key={color}
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      isCurrent ? 'border-gray-800 scale-110' : 'border-gray-300'
                    } ${isUsed ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 hover:border-gray-500'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      if (!isUsed) {
                        changeBoatColor(colorPickerOpen, color);
                      }
                    }}
                    disabled={isUsed}
                    title={isUsed ? 'Color already in use' : (isCurrent ? 'Current color' : 'Click to select')}
                  >
                    {isCurrent && (
                      <span className="text-gray-800 text-xl font-bold">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setColorPickerOpen(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-neutral-600">
        Tips: Drag a chip to any department/week to move it. Click inside a chip to select a week; use +/- Week buttons to adjust timeline length. Press <kbd>Delete</kbd> to remove a week (splits the run). Undo/Redo with Ctrl+Z / Ctrl+Y.
      </div>
    </div>
  );
}