// Boat Tracker Utilities - Pure helpers for color, progress, and fiberglass parts

export type BoatColor = {
  bg: string;
  text: string;
  hex: string;
  light: string;
  border: string;
};

export type FiberglassPartStatus = 'Not touched' | 'Pulled' | 'Trimmed' | 'Finished' | 'Installed';

export type FiberglassPart = {
  name: string;
  status: FiberglassPartStatus;
  category: string;
  department: string;
};

// Color palette for boats (consistent hashing)
const BOAT_COLOR_PALETTE: BoatColor[] = [
  { bg: 'bg-red-500', text: 'text-red-800', hex: '#ef4444', light: 'bg-red-100', border: 'border-red-300' },
  { bg: 'bg-blue-500', text: 'text-blue-800', hex: '#3b82f6', light: 'bg-blue-100', border: 'border-blue-300' },
  { bg: 'bg-green-500', text: 'text-green-800', hex: '#10b981', light: 'bg-green-100', border: 'border-green-300' },
  { bg: 'bg-purple-500', text: 'text-purple-800', hex: '#8b5cf6', light: 'bg-purple-100', border: 'border-purple-300' },
  { bg: 'bg-orange-500', text: 'text-orange-800', hex: '#f97316', light: 'bg-orange-100', border: 'border-orange-300' },
  { bg: 'bg-pink-500', text: 'text-pink-800', hex: '#ec4899', light: 'bg-pink-100', border: 'border-pink-300' },
  { bg: 'bg-indigo-500', text: 'text-indigo-800', hex: '#6366f1', light: 'bg-indigo-100', border: 'border-indigo-300' },
  { bg: 'bg-teal-500', text: 'text-teal-800', hex: '#14b8a6', light: 'bg-teal-100', border: 'border-teal-300' },
  { bg: 'bg-cyan-500', text: 'text-cyan-800', hex: '#06b6d4', light: 'bg-cyan-100', border: 'border-cyan-300' },
  { bg: 'bg-amber-500', text: 'text-amber-800', hex: '#f59e0b', light: 'bg-amber-100', border: 'border-amber-300' },
];

// Simple hash function for consistent color assignment
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get boat color with fallback to consistent hashing
 */
export function getBoatColor(boatName: string, explicit?: string): BoatColor {
  if (explicit) {
    // Try to parse explicit color or find matching palette entry
    const paletteMatch = BOAT_COLOR_PALETTE.find(c => c.hex === explicit || c.bg.includes(explicit));
    if (paletteMatch) return paletteMatch;
  }
  
  // Use consistent hashing to pick from palette
  const hash = hashString(boatName);
  const index = hash % BOAT_COLOR_PALETTE.length;
  return BOAT_COLOR_PALETTE[index];
}

/**
 * Compute overall percentage for a boat - defensive fallback
 */
export function computeOverallPercent(boatIdOrName: string): number {
  try {
    // This is a placeholder - in real implementation, would calculate from actual data
    // For now, return a safe fallback
    const hash = hashString(boatIdOrName);
    return Math.floor((hash % 80) + 10); // 10-90% range for demo
  } catch {
    return 0;
  }
}

/**
 * Get fiberglass parts for a boat and department - defensive fallback
 */
export function getFiberglassPartsFor(boatIdOrName: string, deptKey: string): FiberglassPart[] {
  try {
    // This is a placeholder - in real implementation, would fetch from actual parts data
    // Return mock data structure for now
    const mockParts: FiberglassPart[] = [
      { name: '26\' Hull', status: 'Finished', category: 'Hull', department: deptKey },
      { name: 'Open Deck', status: 'Trimmed', category: 'Deck', department: deptKey },
      { name: 'Console Liner', status: 'Pulled', category: 'Console', department: deptKey },
    ];
    
    return mockParts.filter(p => p.department === deptKey);
  } catch {
    return [];
  }
}

/**
 * Get department progress percentage - defensive fallback
 */
export function getDepartmentProgress(boatIdOrName: string, deptKey: string): number {
  try {
    const parts = getFiberglassPartsFor(boatIdOrName, deptKey);
    if (parts.length === 0) return 0;
    
    const finishedCount = parts.filter(p => 
      p.status === 'Finished' || p.status === 'Installed'
    ).length;
    
    return Math.round((finishedCount / parts.length) * 100);
  } catch {
    return 0;
  }
}

/**
 * Get remaining fiberglass count for a boat
 */
export function getRemainingFiberglassCount(boatIdOrName: string): { remaining: number; total: number } {
  try {
    // Get all departments' fiberglass parts
    const allDepts = ['lamination', 'finishing', 'rigging', 'assembly'];
    let total = 0;
    let completed = 0;
    
    allDepts.forEach(dept => {
      const parts = getFiberglassPartsFor(boatIdOrName, dept);
      total += parts.length;
      completed += parts.filter(p => 
        p.status === 'Finished' || p.status === 'Installed'
      ).length;
    });
    
    return { remaining: total - completed, total };
  } catch {
    return { remaining: 0, total: 0 };
  }
}

/**
 * Get department mini-badge info
 */
export function getDepartmentBadges(boatIdOrName: string) {
  const depts = [
    { key: 'lamination', label: 'Lam' },
    { key: 'assembly', label: 'Assy' },
    { key: 'finishing', label: 'Fin' },
    { key: 'rigging', label: 'Rig' },
  ];
  
  return depts.map(dept => ({
    ...dept,
    percent: getDepartmentProgress(boatIdOrName, dept.key)
  }));
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength) + '…';
}

/**
 * Issue icon mappings
 */
export const ISSUE_ICONS = {
  missingParts: '🛑',
  gelcoat: '🎨',
  otherDelay: '⏳'
} as const;

export const ISSUE_LABELS = {
  missingParts: 'Missing parts',
  gelcoat: 'Gelcoat issues', 
  otherDelay: 'Other delays'
} as const;