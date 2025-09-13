'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Trash2, Edit3, Plus } from "lucide-react";

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
  parts: BoatPart[];
  createdDate: string;
};

// Status styling matching your color system
const STATUS_CONFIG: Record<StatusKey, { label: string; color: string; bg: string; border: string }> = {
  unscheduled: { label: "Unscheduled", color: "text-gray-700", bg: "bg-gray-100", border: "border-l-4 border-gray-400" },
  week_1: { label: "Week 1", color: "text-white", bg: "bg-red-500", border: "border-l-4 border-red-600" },
  week_2: { label: "Week 2", color: "text-white", bg: "bg-purple-500", border: "border-l-4 border-purple-600" },
  week_3: { label: "Week 3", color: "text-white", bg: "bg-blue-500", border: "border-l-4 border-blue-600" },
  in_mold: { label: "In Mold", color: "text-white", bg: "bg-orange-500", border: "border-l-4 border-orange-600" },
  pulled: { label: "Pulled", color: "text-black", bg: "bg-yellow-400", border: "border-l-4 border-yellow-500" },
  finished: { label: "Finished", color: "text-white", bg: "bg-green-500", border: "border-l-4 border-green-600" },
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
      parts: boatParts,
      createdDate: new Date().toISOString(),
    };

    setBoats(prev => {
      const updated = [...prev, newBoat];
      // Save to localStorage
      localStorage.setItem('fiberglassBoats', JSON.stringify(updated));
      return updated;
    });
    setSelectedBoatId(newBoat.id);
    setNewBoatName("");
    setShowNewBoatForm(false);
  };

  const updatePartStatus = (partId: string) => {
    if (!selectedBoat) return;
    
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
      localStorage.setItem('fiberglassBoats', JSON.stringify(updated));
      return updated;
    });
  };

  const updatePart = (partId: string, updates: Partial<BoatPart>) => {
    if (!selectedBoat) return;
    
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
      localStorage.setItem('fiberglassBoats', JSON.stringify(updated));
      return updated;
    });
  };

  const deletePart = (partId: string) => {
    if (!selectedBoat) return;
    
    setBoats(prev => {
      const updated = prev.map(boat => 
        boat.id === selectedBoat.id 
          ? {
              ...boat,
              parts: boat.parts.filter(part => part.id !== partId)
            }
          : boat
      );
      localStorage.setItem('fiberglassBoats', JSON.stringify(updated));
      return updated;
    });
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fiberglass Parts Management</h1>
          <p className="text-gray-600">Automated boat configuration • Status workflow tracking</p>
        </div>
        
        <button
          onClick={() => setShowNewBoatForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Boat
        </button>
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
            <h2 className="text-xl font-semibold">{selectedBoat.name} - {selectedBoat.configuration}</h2>
            <p className="text-sm text-gray-600">{selectedBoat.parts.length} parts total</p>
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
                        <tr key={part.id} className={`hover:bg-gray-50 ${statusConfig.border}`}>
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
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.color} ${statusConfig.bg} hover:opacity-80 transition-opacity`}
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
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingPart(isEditing ? null : part.id)}
                                className={`p-1 rounded hover:bg-gray-200 transition-colors ${isEditing ? 'text-blue-600' : 'text-gray-500'}`}
                                title={isEditing ? "Save changes" : "Edit part"}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deletePart(part.id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Delete part"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
    </div>
  );
}