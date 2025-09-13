'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Trash2, Edit3, Plus, Undo2, Save, MoreVertical, Calendar, Check } from "lucide-react";

// Status system matching your spreadsheet workflow
type StatusKey = 
  | "unscheduled"  // Grey
  | "week_1"       // Red (next week)
  | "week_2"       // Purple 
  | "week_3"       // Blue
  | "in_mold"      // Orange
  | "pulled"       // Yellow
  | "finished";    // Green

type BoatConfiguration = "Bay Boat" | "Open" | "Open with Forward Seating";

// Boat color mapping based on production schedule logic
const getBoatColor = (boatName: string, config: BoatConfiguration): string => {
  // Determine boat size based on configuration (simplified logic)
  const is40ft = config === "Open with Forward Seating" || boatName.toLowerCase().includes("40");
  return is40ft ? "#0ea5e9" : "#f97316"; // Blue for 40ft, Orange for 26ft
};

type MasterPart = {
  id: string;
  name: string;
  category: string;
  boatTypes: string[];
  qtyPerBoat: number;
  location: string;
  notes: string;
};

type BoatPart = {
  id: string;
  masterPartId: string;
  name: string;
  category: string;
  qtyNeeded: number;
  status: StatusKey;
  dueDate?: string;
  notes: string;
  location: string;
  gelColor: string;
};

type Boat = {
  id: string;
  name: string;
  configuration: BoatConfiguration;
  color: string; // Hex color from production schedule
  parts: BoatPart[];
  createdDate: string;
};

type UndoAction = {
  type: 'DELETE_PART' | 'UPDATE_PART' | 'STATUS_CHANGE';
  boatId: string;
  partId: string;
  previousState: BoatPart | null;
  description: string;
};

// Status styling matching your color system
const STATUS_CONFIG: Record<StatusKey, { 
  label: string; 
  color: string; 
  bg: string; 
  border: string; 
  bgHex: string; // For dual-color design 
  textColor: string; // For dual-color design
}> = {
  unscheduled: { label: "Unscheduled", color: "text-gray-700", bg: "bg-gray-100", border: "border-l-4 border-gray-400", bgHex: "#f3f4f6", textColor: "#374151" },
  week_1: { label: "Week 1", color: "text-white", bg: "bg-red-500", border: "border-l-4 border-red-600", bgHex: "#ef4444", textColor: "#ffffff" },
  week_2: { label: "Week 2", color: "text-white", bg: "bg-purple-500", border: "border-l-4 border-purple-600", bgHex: "#a855f7", textColor: "#ffffff" },
  week_3: { label: "Week 3", color: "text-white", bg: "bg-blue-500", border: "border-l-4 border-blue-600", bgHex: "#3b82f6", textColor: "#ffffff" },
  in_mold: { label: "In Mold", color: "text-white", bg: "bg-orange-500", border: "border-l-4 border-orange-600", bgHex: "#f97316", textColor: "#ffffff" },
  pulled: { label: "Pulled", color: "text-black", bg: "bg-yellow-400", border: "border-l-4 border-yellow-500", bgHex: "#facc15", textColor: "#000000" },
  finished: { label: "Finished", color: "text-white", bg: "bg-green-500", border: "border-l-4 border-green-600", bgHex: "#22c55e", textColor: "#ffffff" },
};

const STATUS_ORDER: StatusKey[] = ["unscheduled", "week_1", "week_2", "week_3", "in_mold", "pulled", "finished"];

function getNextStatus(current: StatusKey): StatusKey {
  const currentIndex = STATUS_ORDER.indexOf(current);
  const nextIndex = (currentIndex + 1) % STATUS_ORDER.length;
  return STATUS_ORDER[nextIndex];
}

// Filter parts based on boat configuration
function filterPartsForConfiguration(masterParts: MasterPart[], config: BoatConfiguration): MasterPart[] {
  console.log('Filtering parts for config:', config);
  console.log('Master parts count:', masterParts.length);
  console.log('Sample part types:', masterParts.slice(0, 3).map(p => ({ name: p.name, types: p.boatTypes })));
  
  const filtered = masterParts.filter(part => {
    const types = part.boatTypes;
    
    switch (config) {
      case "Bay Boat":
        return types.includes("Bay") || types.includes("All Boats");
      case "Open":
        return types.includes("Open Boats Only") || types.includes("All Open") || types.includes("All Boats");
      case "Open with Forward Seating":
        return types.includes("Open Boats Only") || 
               types.includes("All Open") || 
               types.includes("Open with Forward Seating") || 
               types.includes("All Boats");
      default:
        return false;
    }
  });
  
  console.log('Filtered parts count:', filtered.length);
  console.log('Filtered parts:', filtered.slice(0, 3).map(p => ({ name: p.name, types: p.boatTypes })));
  
  return filtered;
}

export default function FiberglassPartsPage() {
  const [masterParts, setMasterParts] = useState<MasterPart[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [selectedBoatId, setSelectedBoatId] = useState<string | null>(null);
  const [showNewBoatForm, setShowNewBoatForm] = useState(false);
  const [newBoatName, setNewBoatName] = useState("");
  const [newBoatConfig, setNewBoatConfig] = useState<BoatConfiguration>("Open");
  const [editingPart, setEditingPart] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Custom part creation
  const [showAddPartForm, setShowAddPartForm] = useState(false);
  const [newPartName, setNewPartName] = useState("");
  const [newPartCategory, setNewPartCategory] = useState("");
  const [newPartQty, setNewPartQty] = useState(1);
  
  // Menu and schedule dialog state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [scheduleDialogPart, setScheduleDialogPart] = useState<BoatPart | null>(null);

  // Load master parts catalog
  useEffect(() => {
    const loadMasterParts = async () => {
      try {
        const response = await fetch(`/master-parts-catalog.json?v=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          setMasterParts(data.masterParts || []);
          console.log('Loaded master parts:', data.masterParts.length);
        } else {
          console.error('Failed to fetch master parts:', response.status);
          // Force fallback test data
          const testParts: MasterPart[] = [
            { id: "console", name: "Console", category: "Console", boatTypes: ["All Boats"], qtyPerBoat: 1, location: "", notes: "" },
            { id: "big-leaning-post", name: "Big Leaning Post", category: "Leaning Post", boatTypes: ["Open Boats Only"], qtyPerBoat: 1, location: "", notes: "" },
            { id: "port-forward-seating-tub", name: "Port Side Forward Seating Tub", category: "Open Tubs", boatTypes: ["Open with Forward Seating"], qtyPerBoat: 1, location: "", notes: "" }
          ];
          setMasterParts(testParts);
          console.log('Using fallback test data (404):', testParts.length);
        }
      } catch (error) {
        console.error('Failed to load master parts:', error);
        // Fallback test data
        const testParts: MasterPart[] = [
          { id: "console", name: "Console", category: "Console", boatTypes: ["All Boats"], qtyPerBoat: 1, location: "", notes: "" },
          { id: "big-leaning-post", name: "Big Leaning Post", category: "Leaning Post", boatTypes: ["Open Boats Only"], qtyPerBoat: 1, location: "", notes: "" },
          { id: "port-forward-seating-tub", name: "Port Side Forward Seating Tub", category: "Open Tubs", boatTypes: ["Open with Forward Seating"], qtyPerBoat: 1, location: "", notes: "" }
        ];
        setMasterParts(testParts);
        console.log('Using fallback test data after error:', testParts.length);
      }
    };
    loadMasterParts();
  }, []);

  const selectedBoat = boats.find(b => b.id === selectedBoatId);

  // Helper to add action to undo stack
  const addToUndoStack = (action: UndoAction) => {
    setUndoStack(prev => [...prev.slice(-9), action]); // Keep last 10 actions
  };

  // Helper to mark unsaved changes
  const markUnsaved = () => {
    setHasUnsavedChanges(true);
  };

  // Save to localStorage
  const saveToStorage = (updatedBoats: Boat[]) => {
    localStorage.setItem('fiberglassBoats', JSON.stringify(updatedBoats));
    setHasUnsavedChanges(false);
  };

  // Manual save function
  const saveChanges = () => {
    saveToStorage(boats);
  };

  // Undo last action
  const undoLastAction = () => {
    if (undoStack.length === 0) return;
    
    const lastAction = undoStack[undoStack.length - 1];
    
    setBoats(prev => {
      const updated = prev.map(boat => {
        if (boat.id !== lastAction.boatId) return boat;
        
        switch (lastAction.type) {
          case 'DELETE_PART':
            // Restore deleted part
            if (lastAction.previousState) {
              return {
                ...boat,
                parts: [...boat.parts, lastAction.previousState]
              };
            }
            return boat;
            
          case 'UPDATE_PART':
          case 'STATUS_CHANGE':
            // Restore previous state of part
            if (lastAction.previousState) {
              return {
                ...boat,
                parts: boat.parts.map(part =>
                  part.id === lastAction.partId ? lastAction.previousState! : part
                )
              };
            }
            return boat;
            
          default:
            return boat;
        }
      });
      return updated;
    });
    
    // Remove the undone action from stack
    setUndoStack(prev => prev.slice(0, -1));
    markUnsaved();
  };

  // Group parts by category
  const partsByCategory = useMemo(() => {
    if (!selectedBoat) return {};
    
    const grouped: Record<string, BoatPart[]> = {};
    selectedBoat.parts.forEach(part => {
      if (!grouped[part.category]) grouped[part.category] = [];
      grouped[part.category].push(part);
    });
    return grouped;
  }, [selectedBoat]);

  const createNewBoat = () => {
    if (!newBoatName.trim()) return;

    const relevantParts = filterPartsForConfiguration(masterParts, newBoatConfig);
    const boatParts: BoatPart[] = relevantParts.map(masterPart => ({
      id: `${masterPart.id}-${Date.now()}-${Math.random()}`,
      masterPartId: masterPart.id,
      name: masterPart.name,
      category: masterPart.category,
      qtyNeeded: masterPart.qtyPerBoat,
      status: "unscheduled" as StatusKey,
      notes: masterPart.notes,
      location: masterPart.location,
      gelColor: "White", // Default gel color
    }));

    const newBoat: Boat = {
      id: `boat-${Date.now()}`,
      name: newBoatName,
      configuration: newBoatConfig,
      color: getBoatColor(newBoatName, newBoatConfig),
      parts: boatParts,
      createdDate: new Date().toISOString(),
    };

    setBoats(prev => {
      const updated = [...prev, newBoat];
      saveToStorage(updated); // Auto-save new boats
      return updated;
    });
    setSelectedBoatId(newBoat.id);
    setNewBoatName("");
    setShowNewBoatForm(false);
  };

  const updatePartStatus = (partId: string) => {
    if (!selectedBoat) return;
    
    const currentPart = selectedBoat.parts.find(p => p.id === partId);
    if (!currentPart) return;
    
    // Record undo action
    addToUndoStack({
      type: 'STATUS_CHANGE',
      boatId: selectedBoat.id,
      partId,
      previousState: { ...currentPart },
      description: `Changed status of ${currentPart.name}`
    });
    
    setBoats(prev => {
      const updated = prev.map(boat => 
        boat.id === selectedBoat.id 
          ? {
              ...boat,
              parts: boat.parts.map(part =>
                part.id === partId 
                  ? { ...part, status: getNextStatus(part.status) }
                  : part
              )
            }
          : boat
      );
      markUnsaved();
      return updated;
    });
  };

  const updatePart = (partId: string, updates: Partial<BoatPart>) => {
    if (!selectedBoat) return;
    
    const currentPart = selectedBoat.parts.find(p => p.id === partId);
    if (!currentPart) return;
    
    // Record undo action
    addToUndoStack({
      type: 'UPDATE_PART',
      boatId: selectedBoat.id,
      partId,
      previousState: { ...currentPart },
      description: `Updated ${currentPart.name}`
    });
    
    setBoats(prev => {
      const updated = prev.map(boat => 
        boat.id === selectedBoat.id 
          ? {
              ...boat,
              parts: boat.parts.map(part =>
                part.id === partId ? { ...part, ...updates } : part
              )
            }
          : boat
      );
      markUnsaved();
      return updated;
    });
  };

  const deletePart = (partId: string) => {
    if (!selectedBoat) return;
    
    const partToDelete = selectedBoat.parts.find(p => p.id === partId);
    if (!partToDelete) return;
    
    // Record undo action
    addToUndoStack({
      type: 'DELETE_PART',
      boatId: selectedBoat.id,
      partId,
      previousState: { ...partToDelete },
      description: `Deleted ${partToDelete.name}`
    });
    
    setBoats(prev => {
      const updated = prev.map(boat => 
        boat.id === selectedBoat.id 
          ? {
              ...boat,
              parts: boat.parts.filter(part => part.id !== partId)
            }
          : boat
      );
      markUnsaved();
      return updated;
    });
  };

  // Add part to lamination schedule
  const addPartToSchedule = async (partId: string, weekChoice: 'next' | 'after') => {
    if (!selectedBoat) return;
    
    const part = selectedBoat.parts.find(p => p.id === partId);
    if (!part) return;
    
    // Update part status based on week choice
    const newStatus = weekChoice === 'next' ? 'week_1' : 'week_2';
    updatePart(partId, { status: newStatus as StatusKey });
    
    // Calculate scheduled week (next Monday or Monday after)
    const today = new Date();
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    
    if (weekChoice === 'after') {
      nextMonday.setDate(nextMonday.getDate() + 7);
    }
    
    const scheduledWeek = nextMonday.toISOString().split('T')[0];
    
    // Create lamination schedule entry
    const schedulePart = {
      id: `P-${Date.now()}`,
      name: part.name,
      boat: {
        id: `B-${selectedBoat.configuration.includes('40') ? 40 : 26}-${selectedBoat.name}`,
        label: `${selectedBoat.name} • ${selectedBoat.configuration.includes('40') ? 40 : 26}‑ft`,
        length: selectedBoat.configuration.includes('40') ? 40 : 26,
        colorHex: selectedBoat.color,
        shipWeek: "TBD"
      },
      lamType: part.category.includes('Infusion') ? 'Infusion' : 'Hand Layup',
      gelcoat: part.gelColor,
      qtyNeeded: part.qtyNeeded,
      qtyDone: 0,
      stage: "Scheduled",
      scheduledWeek,
      dueDate: new Date(nextMonday.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Friday
      assignee: "",
      notes: part.notes,
      history: [{
        ts: new Date().toISOString(),
        action: "Part scheduled",
        by: "User"
      }]
    };
    
    try {
      // Get existing parts
      const response = await fetch('/api/lamination-parts');
      const data = await response.json();
      
      // Add new part
      const updatedParts = [...(data.parts || []), schedulePart];
      
      // Save back
      await fetch('/api/lamination-parts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts: updatedParts })
      });
      
      // Close schedule dialog
      setScheduleDialogPart(null);
      
      // Show success message (could add a toast here)
      console.log(`Added ${part.name} to lamination schedule for ${scheduledWeek}`);
    } catch (error) {
      console.error('Failed to add to schedule:', error);
    }
  };

  const addCustomPart = () => {
    if (!selectedBoat || !newPartName.trim()) return;
    
    const newPart: BoatPart = {
      id: `custom-${Date.now()}-${Math.random()}`,
      masterPartId: `custom-${Date.now()}`,
      name: newPartName,
      category: newPartCategory || "Custom",
      qtyNeeded: newPartQty,
      status: "unscheduled" as StatusKey,
      notes: "Custom part",
      location: "",
      gelColor: "White"
    };
    
    setBoats(prev => {
      const updated = prev.map(boat => 
        boat.id === selectedBoat.id 
          ? {
              ...boat,
              parts: [...boat.parts, newPart]
            }
          : boat
      );
      markUnsaved();
      return updated;
    });
    
    // Reset form
    setNewPartName("");
    setNewPartCategory("");
    setNewPartQty(1);
    setShowAddPartForm(false);
  };

  // Load boats from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fiberglassBoats');
      if (saved) {
        const savedBoats = JSON.parse(saved);
        setBoats(savedBoats);
        console.log('Loaded saved boats:', savedBoats.length);
      }
    } catch (error) {
      console.error('Failed to load saved boats:', error);
    }
  }, []);

  // Keyboard shortcut for undo (Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoLastAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack]); // Include undoStack as dependency to ensure latest state

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.menu-container')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fiberglass Parts Management</h1>
          <p className="text-gray-600">
            Automated boat configuration • Status workflow tracking
            {hasUnsavedChanges && <span className="ml-2 text-orange-600 font-medium">• Unsaved changes</span>}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={undoLastAction}
            disabled={undoStack.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title="Undo last action"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>
          
          <button
            onClick={saveChanges}
            disabled={!hasUnsavedChanges}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title="Save changes to storage"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          
          <button
            onClick={() => setShowNewBoatForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Boat
          </button>
        </div>
      </div>

      {/* New Boat Form */}
      {showNewBoatForm && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Create New Boat</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Boat Name</label>
              <input
                type="text"
                value={newBoatName}
                onChange={(e) => setNewBoatName(e.target.value)}
                placeholder="e.g., Johnson, 40-22, etc."
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Configuration</label>
              <select
                value={newBoatConfig}
                onChange={(e) => setNewBoatConfig(e.target.value as BoatConfiguration)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Bay Boat">Bay Boat</option>
                <option value="Open">Open</option>
                <option value="Open with Forward Seating">Open with Forward Seating</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createNewBoat}
                disabled={!newBoatName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewBoatForm(false);
                  setNewBoatName("");
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Part Form */}
      {showAddPartForm && selectedBoat && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Add Custom Part</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Part Name</label>
              <input
                type="text"
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
                placeholder="e.g., Custom Hatch"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <input
                type="text"
                value={newPartCategory}
                onChange={(e) => setNewPartCategory(e.target.value)}
                placeholder="e.g., Hatches"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                value={newPartQty}
                onChange={(e) => setNewPartQty(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={addCustomPart}
              disabled={!newPartName.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Add Part
            </button>
            <button
              onClick={() => {
                setShowAddPartForm(false);
                setNewPartName("");
                setNewPartCategory("");
                setNewPartQty(1);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Boat Selection */}
      {boats.length > 0 && (
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Boat</label>
          <select
            value={selectedBoatId || ""}
            onChange={(e) => setSelectedBoatId(e.target.value || null)}
            className="w-full max-w-md border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select a boat --</option>
            {boats.map(boat => (
              <option key={boat.id} value={boat.id}>
                {boat.name} ({boat.configuration}) - {boat.parts.length} parts
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Parts Table */}
      {selectedBoat && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{selectedBoat.name} - {selectedBoat.configuration}</h2>
                <p className="text-sm text-gray-600">{selectedBoat.parts.length} parts total</p>
              </div>
              <button
                onClick={() => setShowAddPartForm(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Part
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Part Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Qty</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Gel Color</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Due Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Notes</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(partsByCategory).map(([category, parts]) => (
                  <React.Fragment key={category}>
                    <tr className="bg-gray-100">
                      <td colSpan={8} className="px-4 py-2 text-sm font-semibold text-gray-800 uppercase tracking-wide">
                        {category} ({parts.length})
                      </td>
                    </tr>
                    {parts.map(part => {
                      const statusConfig = STATUS_CONFIG[part.status];
                      const isEditing = editingPart === part.id;
                      
                      return (
                        <tr 
                          key={part.id} 
                          className="hover:opacity-90 transition-opacity border-l-4" 
                          style={{ 
                            borderLeftColor: selectedBoat.color, // Boat color border
                            backgroundColor: statusConfig.bgHex + '20', // Status color fill with opacity
                            color: statusConfig.textColor 
                          }}
                        >
                          <td className="px-4 py-3 font-medium">{part.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{part.category}</td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={part.qtyNeeded}
                                onChange={(e) => updatePart(part.id, { qtyNeeded: Number(e.target.value) })}
                                className="w-16 border rounded px-2 py-1 text-sm"
                              />
                            ) : (
                              <span className="text-sm">{part.qtyNeeded}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={part.gelColor}
                                onChange={(e) => updatePart(part.id, { gelColor: e.target.value })}
                                placeholder="e.g., White, Blue"
                                className="w-24 border rounded px-2 py-1 text-sm"
                              />
                            ) : (
                              <span className="text-sm">{part.gelColor}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => updatePartStatus(part.id)}
                              className="px-3 py-1 rounded-full text-xs font-semibold border-2 hover:opacity-80 transition-opacity"
                              style={{ 
                                backgroundColor: statusConfig.bgHex,
                                color: statusConfig.textColor,
                                borderColor: selectedBoat.color // Boat color border
                              }}
                              title="Click to advance status"
                            >
                              {statusConfig.label}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="date"
                                value={part.dueDate || ""}
                                onChange={(e) => updatePart(part.id, { dueDate: e.target.value })}
                                className="border rounded px-2 py-1 text-sm"
                              />
                            ) : (
                              <span className="text-sm">{part.dueDate || "—"}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={part.notes}
                                onChange={(e) => updatePart(part.id, { notes: e.target.value })}
                                placeholder="Add notes..."
                                className="w-full border rounded px-2 py-1 text-sm"
                              />
                            ) : (
                              <span className="text-sm text-gray-600">{part.notes || "—"}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative menu-container">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === part.id ? null : part.id);
                                }}
                                className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-500"
                                title="More options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              
                              {openMenuId === part.id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-10">
                                  <button
                                    onClick={() => {
                                      setEditingPart(isEditing ? null : part.id);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    {isEditing ? "Save changes" : "Edit"}
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      setScheduleDialogPart(part);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Calendar className="w-4 h-4" />
                                    Add to Schedule
                                  </button>
                                  
                                  <hr className="my-1" />
                                  
                                  <button
                                    onClick={() => {
                                      deletePart(part.id);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {boats.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Plus className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No boats created yet</h3>
          <p className="text-gray-600 mb-6">Create your first boat to start managing fiberglass parts</p>
          <button
            onClick={() => setShowNewBoatForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create First Boat
          </button>
        </div>
      )}

      {/* Schedule Dialog */}
      {scheduleDialogPart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 max-w-90vw">
            <h2 className="text-xl font-semibold mb-4">Add to Lamination Schedule</h2>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                Schedule <span className="font-medium">{scheduleDialogPart.name}</span> for production:
              </p>
              <p className="text-sm text-gray-500">
                This will update the part status and add it to the lamination schedule.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  addPartToSchedule(scheduleDialogPart.id, 'next');
                }}
                className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-between"
              >
                <span>Next Week</span>
                <span className="text-sm opacity-75">Status → Week 1</span>
              </button>
              
              <button
                onClick={() => {
                  addPartToSchedule(scheduleDialogPart.id, 'after');
                }}
                className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-between"
              >
                <span>Week After</span>
                <span className="text-sm opacity-75">Status → Week 2</span>
              </button>
              
              <hr className="my-2" />
              
              <button
                onClick={() => setScheduleDialogPart(null)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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