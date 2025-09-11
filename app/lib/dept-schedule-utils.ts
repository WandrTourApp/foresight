/**
 * Utility functions for department schedule management
 * Supports both 26 and 40 boats across all departments
 */

export type DepartmentType = 'lamination' | 'finishing' | 'rigging' | 'assembly';
export type BoatModel = '26' | '40';
export type CanonicalStatus = 'not_started' | 'in_progress' | 'done' | 'complete' | 'finished' | 'shipped' | string;

export function isDone(status: CanonicalStatus | undefined | null): boolean {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return s === 'done' || s === 'complete' || s === 'finished' || s === 'shipped';
}

export function toCanonical(done: boolean): CanonicalStatus {
  return done ? 'done' : 'not_started';
}

// Mock department schedules for different boat models
export const getDeptSchedule = (boatId: string, dept: DepartmentType, week: string) => {
  // In real app, this would fetch from API based on boatId, dept, week
  const model = boatId.includes('40') ? '40' : '26';
  
  const scheduleData = {
    'lamination': {
      '26': [
        { id: `${boatId}-lam-1`, customer: 'Goldman', part: 'Hull', model: '26', status: 'in-progress', priority: 'high', hours: 40 },
        { id: `${boatId}-lam-2`, customer: 'Goldman', part: 'Deck', model: '26', status: 'pending', priority: 'medium', hours: 32 }
      ],
      '40': [
        { id: `${boatId}-lam-1`, customer: 'Marina Corp', part: 'Hull XL', model: '40', status: 'in-progress', priority: 'high', hours: 60 },
        { id: `${boatId}-lam-2`, customer: 'Marina Corp', part: 'Deck XL', model: '40', status: 'pending', priority: 'medium', hours: 48 }
      ]
    },
    'finishing': {
      '26': [
        { id: `${boatId}-fin-1`, customer: 'Goldman', part: 'Hull Polish', model: '26', status: 'pending', priority: 'medium', hours: 16 },
        { id: `${boatId}-fin-2`, customer: 'Goldman', part: 'Deck Detail', model: '26', status: 'pending', priority: 'low', hours: 12 }
      ],
      '40': [
        { id: `${boatId}-fin-1`, customer: 'Marina Corp', part: 'Hull Polish XL', model: '40', status: 'pending', priority: 'medium', hours: 24 },
        { id: `${boatId}-fin-2`, customer: 'Marina Corp', part: 'Deck Detail XL', model: '40', status: 'pending', priority: 'low', hours: 18 }
      ]
    },
    'rigging': {
      '26': [
        { id: `${boatId}-rig-1`, customer: 'Goldman', part: 'Engine Mount', model: '26', status: 'pending', priority: 'high', hours: 8 },
        { id: `${boatId}-rig-2`, customer: 'Goldman', part: 'Electronics', model: '26', status: 'pending', priority: 'medium', hours: 24 }
      ],
      '40': [
        { id: `${boatId}-rig-1`, customer: 'Marina Corp', part: 'Twin Engine Mount', model: '40', status: 'pending', priority: 'high', hours: 12 },
        { id: `${boatId}-rig-2`, customer: 'Marina Corp', part: 'Electronics XL', model: '40', status: 'pending', priority: 'medium', hours: 32 }
      ]
    },
    'assembly': {
      '26': [
        { id: `${boatId}-asm-1`, customer: 'Goldman', part: 'Console Assembly', model: '26', status: 'pending', priority: 'medium', hours: 16 },
        { id: `${boatId}-asm-2`, customer: 'Goldman', part: 'Seating Install', model: '26', status: 'pending', priority: 'low', hours: 8 }
      ],
      '40': [
        { id: `${boatId}-asm-1`, customer: 'Marina Corp', part: 'Console Assembly XL', model: '40', status: 'pending', priority: 'medium', hours: 24 },
        { id: `${boatId}-asm-2`, customer: 'Marina Corp', part: 'Seating Install XL', model: '40', status: 'pending', priority: 'low', hours: 12 }
      ]
    }
  };

  return scheduleData[dept]?.[model] || [];
};

// Get all department items for a specific boat and week (for Timeline deep view)
export const getAllDeptItems = (boatId: string, week: string) => {
  const departments: DepartmentType[] = ['lamination', 'finishing', 'rigging', 'assembly'];
  
  return departments.reduce((acc, dept) => {
    const items = getDeptSchedule(boatId, dept, week);
    if (items.length > 0) {
      acc[dept] = items;
    }
    return acc;
  }, {} as Record<DepartmentType, any[]>);
};

// Status dot colors for Timeline read-only view
export const getStatusDot = (status: string) => {
  switch (status) {
    case 'complete':
    case 'done':
      return '🟢';
    case 'in-progress':
    case 'in_progress':
      return '🟡';
    case 'blocked':
    case 'problem':
      return '🔴';
    default:
      return '⚪';
  }
};