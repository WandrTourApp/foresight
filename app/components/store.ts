'use client';

// Shared store for Foresight app state
// In-memory for MVP, with optional localStorage persistence

export interface Station {
  name: 'Lamination' | 'Assembly' | 'Rigging' | 'Finish';
  start: string; // ISO date string
  end: string;   // ISO date string
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Boat {
  id: string;
  customer: string;
  model: string;
  due_date: string; // ISO date string
  stations: Station[];
  config_stage: 'draft' | 'finalized';
  gelcoat_color: string | null;
  color_freeze_by: string; // ISO date string
  selected_options: string[]; // option IDs
  // Legacy compatibility fields
  hull_color?: string;
  deck_color?: string;
  liner_color?: string;
  hard_top_selected?: boolean;
  hard_top_color?: string;
}

export interface Note {
  boatId: string;
  sku: string;
  reason: string;
  photoUrl?: string;
  createdAt: string; // ISO date string
}

export interface FinalConfig {
  optionIds: string[];
  gelcoatColor: string;
}

export interface BOMItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  pickLocation?: string;
  staging?: Array<{ location: string; quantity: number }>;
}

// Simple in-memory store
class ForesightStore {
  private boats: Boat[] = [];
  private notes: Note[] = [];
  private activeBoatId: string | null = null;
  private initialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage();
    }
  }

  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('foresight-data');
      if (stored) {
        const data = JSON.parse(stored);
        this.boats = data.boats || [];
        this.notes = data.notes || [];
        this.activeBoatId = data.activeBoatId || null;
      }
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      this.initialized = true;
    }
  }

  private saveToLocalStorage() {
    if (typeof window === 'undefined' || !this.initialized) return;
    
    try {
      const data = {
        boats: this.boats,
        notes: this.notes,
        activeBoatId: this.activeBoatId,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('foresight-data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  // Boat operations
  getBoat(id: string): Boat | undefined {
    return this.boats.find(boat => boat.id === id);
  }

  setBoat(id: string, updates: Partial<Boat>): Boat | null {
    const index = this.boats.findIndex(boat => boat.id === id);
    if (index === -1) return null;
    
    this.boats[index] = { ...this.boats[index], ...updates };
    this.saveToLocalStorage();
    return this.boats[index];
  }

  listBoats(): Boat[] {
    return [...this.boats];
  }

  addBoat(boat: Omit<Boat, 'id'>): Boat {
    const newBoat: Boat = {
      ...boat,
      id: `boat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    this.boats.push(newBoat);
    this.saveToLocalStorage();
    return newBoat;
  }

  // Note operations
  upsertNote(note: Omit<Note, 'createdAt'>): Note {
    const fullNote: Note = {
      ...note,
      createdAt: new Date().toISOString()
    };
    
    // Remove any existing note for same boat+sku, then add new one
    this.notes = this.notes.filter(n => !(n.boatId === note.boatId && n.sku === note.sku));
    this.notes.push(fullNote);
    this.saveToLocalStorage();
    return fullNote;
  }

  getNotes(boatId?: string): Note[] {
    if (boatId) {
      return this.notes.filter(note => note.boatId === boatId);
    }
    return [...this.notes];
  }

  // Helper: compute freeze-by date (48h before lamination start)
  computeFreezeBy(laminationStart: string): string {
    const start = new Date(laminationStart);
    const freezeBy = new Date(start.getTime() - (48 * 60 * 60 * 1000)); // 48 hours before
    return freezeBy.toISOString();
  }

  // Helper: check if past freeze-by
  isPastFreezeBy(boat: Boat): boolean {
    if (boat.gelcoat_color) return false; // Already has color
    const freezeBy = new Date(boat.color_freeze_by);
    const now = new Date();
    return now > freezeBy;
  }

  // Active boat operations
  getActiveBoatId(): string | null {
    return this.activeBoatId;
  }

  setActiveBoat(id: string | null): void {
    this.activeBoatId = id;
    this.saveToLocalStorage();
  }

  getActiveBoat(): Boat | null {
    if (!this.activeBoatId) return null;
    return this.getBoat(this.activeBoatId) || null;
  }

  // Save final configuration for a boat
  saveFinalConfig(boatId: string, config: FinalConfig): boolean {
    const boat = this.getBoat(boatId);
    if (!boat) return false;
    
    this.setBoat(boatId, {
      selected_options: config.optionIds,
      gelcoat_color: config.gelcoatColor,
      config_stage: 'finalized'
    });
    
    return true;
  }

  // Initialize with sample data if empty
  initializeSampleData() {
    if (this.boats.length === 0) {
      const laminationStart = new Date();
      laminationStart.setDate(laminationStart.getDate() + 7); // Start in 7 days
      
      const sampleBoat: Omit<Boat, 'id'> = {
        customer: 'Johnson Marine',
        model: '26',
        due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
        stations: [
          { name: 'Lamination', start: laminationStart.toISOString(), end: new Date(laminationStart.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { name: 'Assembly', start: new Date(laminationStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(), end: new Date(laminationStart.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { name: 'Rigging', start: new Date(laminationStart.getTime() + 26 * 24 * 60 * 60 * 1000).toISOString(), end: new Date(laminationStart.getTime() + 40 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { name: 'Finish', start: new Date(laminationStart.getTime() + 41 * 24 * 60 * 60 * 1000).toISOString(), end: new Date(laminationStart.getTime() + 55 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' }
        ],
        config_stage: 'draft',
        gelcoat_color: null,
        color_freeze_by: this.computeFreezeBy(laminationStart.toISOString()),
        selected_options: []
      };
      
      this.addBoat(sampleBoat);
    }
  }
}

// Singleton instance
export const store = new ForesightStore();

// Initialize sample data on first load
if (typeof window !== 'undefined') {
  store.initializeSampleData();
}