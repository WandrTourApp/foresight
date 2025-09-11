'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Role = 'employee' | 'floor_manager' | 'plant_manager' | 'admin' | 'stockroom';

type Action = 
  | 'view_dashboard' 
  | 'view_timeline' 
  | 'view_picklist'
  | 'pick_parts'
  | 'move_dates'
  | 'drag_lamination'
  | 'set_options'
  | 'finalize_config'
  | 'reopen_config'
  | 'create_lead'
  | 'edit_lead'
  | 'convert_lead'
  | 'create_order'
  | 'edit_order'
  | 'view_details'
  | 'order_parts'
  | 'receive_parts'
  | 'manage_schedule'
  | 'review_custom_options';

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  can: (action: Action) => boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// Permission matrix
export function can(role: Role, action: Action): boolean {
  switch (role) {
    case 'employee':
      return [
        'view_dashboard',
        'view_timeline'
      ].includes(action);
      
    case 'stockroom':
      return [
        'view_dashboard',
        'view_timeline', 
        'view_picklist',
        'pick_parts',
        'receive_parts'
      ].includes(action);
      
    case 'floor_manager':
      return [
        'view_dashboard',
        'view_timeline',
        'view_picklist', 
        'pick_parts',
        'move_dates',
        'drag_lamination',
        'view_details',
        'order_parts', // Purchasing duties
        'receive_parts' // Stockroom duties
      ].includes(action);
      
    case 'plant_manager':
      return [
        'view_dashboard',
        'view_timeline',
        'view_picklist', 
        'pick_parts',
        'move_dates',
        'drag_lamination',
        'view_details',
        'order_parts',
        'receive_parts',
        'manage_schedule', // Can drag boat blocks in Gantt
        'review_custom_options' // Custom option review queue
      ].includes(action);
      
    case 'admin':
      return true; // Admin can do everything
      
    default:
      return false;
  }
}

interface RoleProviderProps {
  children: ReactNode;
}

export function RoleProvider({ children }: RoleProviderProps) {
  const [role, setRole] = useState<Role>('employee');
  const [mounted, setMounted] = useState(false);
  
  // Initialize role from storage and URL params
  useEffect(() => {
    setMounted(true);
    
    // Check URL for role override (?role=admin)
    const urlParams = new URLSearchParams(window.location.search);
    const urlRole = urlParams.get('role') as Role;
    
    if (urlRole && ['employee', 'stockroom', 'floor_manager', 'plant_manager', 'admin'].includes(urlRole)) {
      // URL override takes precedence
      setRole(urlRole);
      localStorage.setItem('userRole', urlRole);
      
      // Clean URL after setting role
      const url = new URL(window.location.href);
      url.searchParams.delete('role');
      window.history.replaceState({}, '', url.toString());
    } else {
      // Load from localStorage or cookie
      const storedRole = localStorage.getItem('userRole') as Role;
      if (storedRole && ['employee', 'stockroom', 'floor_manager', 'plant_manager', 'admin'].includes(storedRole)) {
        setRole(storedRole);
      }
    }
  }, []);

  // Persist role changes
  const handleSetRole = (newRole: Role) => {
    setRole(newRole);
    localStorage.setItem('userRole', newRole);
  };
  
  const canAction = (action: Action) => can(role, action);

  return (
    <RoleContext.Provider value={{ role, setRole: handleSetRole, can: canAction }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}