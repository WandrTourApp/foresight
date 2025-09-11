// Core type definitions for Foresight MVP

export type UserRole = 'employee' | 'floor_manager' | 'admin';

export type ConfigStage = 'base_scheduled' | 'finalized';

export type StationName = 'Lamination' | 'Assembly' | 'Rigging' | 'Finish';

export type PickStatus = 'pending' | 'picked' | 'staged';

export interface BOMItem {
  sku: string;
  name: string;
  qty: number;
  unit: string;
  dept: string;
}

export interface OptionEffect {
  add: BOMItem[];
  remove: { sku: string }[];
}

export interface Option {
  id: string;
  name: string;
  effects: OptionEffect;
}

export interface Station {
  name: StationName;
  start_date: string; // ISO date string
  end_date: string;   // ISO date string
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Boat {
  id: string;
  customer: string;
  model: string;
  due_date: string; // ISO date string
  stations: Station[];
  config_stage: ConfigStage;
  gelcoat_color: string | null;
  color_freeze_by: string; // ISO date string - computed as 48h before Lamination start
  selected_options: string[]; // array of option IDs
}

export interface PicklistItem extends BOMItem {
  pick_status: PickStatus;
  boat_id: string;
}

export interface BOMData {
  model: string;
  revision: string;
  base_items: BOMItem[];
}

export interface OptionsData {
  options: Option[];
}

// Grouped picklist for display
export interface DepartmentGroup {
  dept: string;
  items: PicklistItem[];
}

// User permissions check
export interface UserPermissions {
  canEditOptions: boolean;
  canMoveDates: boolean;
  canFinalizeConfig: boolean;
  canViewPicklist: boolean;
  canPickItems: boolean;
}

// Utility type for form states
export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
}