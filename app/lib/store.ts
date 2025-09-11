'use client';

// Simple in-memory store for MVP data
// In production, this would be replaced with a proper database and API

import { Boat, BOMData, OptionsData, PicklistItem } from './types';

// Sample data based on existing JSON files
const SAMPLE_BOM_DATA: BOMData = {
  model: "26 Open",
  revision: "v0.1-mock", 
  base_items: [
    { sku: "HULL-26-BASE", name: "26' Hull Base Layup", qty: 1, unit: "ea", dept: "Lamination" },
    { sku: "DECK-26-STD", name: "26' Deck - Standard", qty: 1, unit: "ea", dept: "Lamination" },
    { sku: "CONS-STD", name: "Console Standard", qty: 1, unit: "ea", dept: "Assembly" },
    { sku: "STEER-SEA", name: "Seastar Steering Kit", qty: 1, unit: "ea", dept: "Rigging" },
    { sku: "ELEC-12GA", name: "12ga Marine Wire (100ft)", qty: 2, unit: "roll", dept: "Rigging" },
    { sku: "FUEL-50", name: "50 Gal Fuel Tank", qty: 1, unit: "ea", dept: "Assembly" },
    { sku: "SEAT-STD", name: "Leaning Post Standard", qty: 1, unit: "ea", dept: "Assembly" },
    { sku: "BIM-STD", name: "Standard Bimini", qty: 1, unit: "ea", dept: "Finish" },
    { sku: "CLEAT-8", name: "8\" Dock Cleat", qty: 4, unit: "ea", dept: "Rigging" },
  ]
};

const SAMPLE_OPTIONS_DATA: OptionsData = {
  options: [
    {
      id: "hard_top",
      name: "Hard Top",
      effects: {
        add: [
          { sku: "HT-001", name: "Hard Top Assembly", qty: 1, unit: "ea", dept: "Assembly" },
          { sku: "ELEC-10GA", name: "10ga Marine Wire (100ft)", qty: 1, unit: "roll", dept: "Rigging" }
        ],
        remove: [{ sku: "BIM-STD" }]
      }
    },
    {
      id: "stereo_upgrade", 
      name: "Stereo Upgrade (JL)",
      effects: {
        add: [
          { sku: "JL-AMP-600", name: "JL 600W Amplifier", qty: 1, unit: "ea", dept: "Rigging" },
          { sku: "JL-SPK-65", name: "JL 6.5\" Speakers", qty: 6, unit: "ea", dept: "Rigging" },
          { sku: "ELEC-12GA", name: "12ga Marine Wire (extra)", qty: 1, unit: "roll", dept: "Rigging" }
        ],
        remove: []
      }
    },
    {
      id: "engine_upgrade",
      name: "300HP Engine Upgrade", 
      effects: {
        add: [
          { sku: "ENG-300", name: "300HP Outboard", qty: 1, unit: "ea", dept: "Rigging" },
          { sku: "PROP-300", name: "High Performance Prop", qty: 1, unit: "ea", dept: "Rigging" }
        ],
        remove: [{ sku: "ENG-250" }] // Assumes base has 250HP
      }
    },
    {
      id: "fishing_package",
      name: "Fishing Package",
      effects: {
        add: [
          { sku: "FISH-BOX", name: "Insulated Fish Box", qty: 1, unit: "ea", dept: "Assembly" },
          { sku: "ROD-HOLD", name: "Rod Holders", qty: 8, unit: "ea", dept: "Assembly" },
          { sku: "BAIT-WELL", name: "Live Bait Well", qty: 1, unit: "ea", dept: "Assembly" }
        ],
        remove: []
      }
    }
  ]
};

// Helper to compute freeze-by date (48h before Lamination start)
function computeFreezeByDate(laminationStartDate: string): string {
  const startDate = new Date(laminationStartDate);
  const freezeBy = new Date(startDate.getTime() - (48 * 60 * 60 * 1000)); // 48 hours before
  return freezeBy.toISOString();
}

// Sample boats data
const SAMPLE_BOATS: Boat[] = [
  {
    id: "boat-001",
    customer: "Johnson Marine",
    model: "26 Open",
    due_date: "2025-12-15",
    stations: [
      { name: "Lamination", start_date: "2025-09-10", end_date: "2025-09-15", status: "pending" },
      { name: "Assembly", start_date: "2025-09-16", end_date: "2025-10-05", status: "pending" },
      { name: "Rigging", start_date: "2025-10-06", end_date: "2025-10-20", status: "pending" },
      { name: "Finish", start_date: "2025-10-21", end_date: "2025-11-10", status: "pending" }
    ],
    config_stage: "base_scheduled",
    gelcoat_color: null,
    color_freeze_by: computeFreezeByDate("2025-09-10"),
    selected_options: []
  },
  {
    id: "boat-002", 
    customer: "Pacific Yachts",
    model: "26 Open",
    due_date: "2025-11-30",
    stations: [
      { name: "Lamination", start_date: "2025-08-25", end_date: "2025-08-30", status: "in_progress" },
      { name: "Assembly", start_date: "2025-09-01", end_date: "2025-09-20", status: "pending" },
      { name: "Rigging", start_date: "2025-09-21", end_date: "2025-10-05", status: "pending" },
      { name: "Finish", start_date: "2025-10-06", end_date: "2025-10-25", status: "pending" }
    ],
    config_stage: "finalized",
    gelcoat_color: "Ocean Blue",
    color_freeze_by: computeFreezeByDate("2025-08-25"),
    selected_options: ["hard_top", "stereo_upgrade"]
  }
];

// In-memory store
class Store {
  private boats: Boat[] = [...SAMPLE_BOATS];
  private bomData: BOMData = SAMPLE_BOM_DATA;
  private optionsData: OptionsData = SAMPLE_OPTIONS_DATA;
  private picklistItems: PicklistItem[] = [];

  // Boats
  getBoats(): Boat[] {
    return [...this.boats];
  }

  getBoat(id: string): Boat | undefined {
    return this.boats.find(boat => boat.id === id);
  }

  updateBoat(id: string, updates: Partial<Boat>): Boat | null {
    const index = this.boats.findIndex(boat => boat.id === id);
    if (index === -1) return null;
    
    this.boats[index] = { ...this.boats[index], ...updates };
    return this.boats[index];
  }

  addBoat(boat: Omit<Boat, 'id'>): Boat {
    const id = `boat-${Date.now()}`;
    const newBoat: Boat = { ...boat, id };
    this.boats.push(newBoat);
    return newBoat;
  }

  // BOM Data
  getBOMData(): BOMData {
    return this.bomData;
  }

  getOptionsData(): OptionsData {
    return this.optionsData;
  }

  // Picklist items
  getPicklistItems(boatId: string): PicklistItem[] {
    return this.picklistItems.filter(item => item.boat_id === boatId);
  }

  updatePicklistItemStatus(boatId: string, sku: string, status: 'pending' | 'picked' | 'staged'): void {
    const item = this.picklistItems.find(item => item.boat_id === boatId && item.sku === sku);
    if (item) {
      item.pick_status = status;
    }
  }

  // Initialize picklist items for a boat (usually called after finalizing config)
  initializePicklistForBoat(boatId: string, bomItems: any[]): void {
    // Remove existing items for this boat
    this.picklistItems = this.picklistItems.filter(item => item.boat_id !== boatId);
    
    // Add new items
    const newItems: PicklistItem[] = bomItems.map(item => ({
      ...item,
      pick_status: 'pending' as const,
      boat_id: boatId
    }));
    
    this.picklistItems.push(...newItems);
  }
}

// Singleton store instance
export const store = new Store();