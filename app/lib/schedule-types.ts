// schedule-types.ts: CLIENT-SAFE. Import in components.
export type Dept = 'lamination' | 'finishing' | 'rigging' | 'assembly' | 'qc';
export type SplitPreset = '3/1' | '2/2' | '1/3';
export type ModelTag = '40' | '26';

export interface BoatColor {
  boat_id: string;
  color_hex?: string;
}

export interface ScheduledRow {
  week_start: string;
  dept: Dept;
  boat_id: string;
  split?: SplitPreset;
  model?: ModelTag;
}

export interface ActualRow {
  start_week: string;
  dept: Dept;
  boat_id: string;
  run_weeks: number;
  model?: ModelTag;
}

export interface ScheduleData {
  boats: BoatColor[];
  scheduled: ScheduledRow[];
  actual: ActualRow[];
}

export function normalizeDept(input: string): Dept | null {
  const normalized = input.toLowerCase().trim();
  
  // lamination aliases
  if (['lamination', 'lam', 'laminate'].includes(normalized)) return 'lamination';
  
  // finishing aliases
  if (['finishing', 'finish', 'detail'].includes(normalized)) return 'finishing';
  
  // rigging aliases
  if (['rig', 'rigging', 'pre-rig', 'prerig'].includes(normalized)) return 'rigging';
  
  // assembly aliases
  if (['assembly', 'assy', 'build'].includes(normalized)) return 'assembly';
  
  // qc aliases
  if (['qc', 'sea trial', 'sea_trial', 'delivery', 'qa', 'quality'].includes(normalized)) return 'qc';
  
  return null;
}

export function normalizeWeek(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    // Get the Monday of this week
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday: go back 6, otherwise go back to Monday
    
    const monday = new Date(date);
    monday.setDate(date.getDate() + daysToMonday);
    
    return monday.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

// Simple hash function for deterministic colors
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function stableBoatColor(boat_id: string, boats: BoatColor[]): string {
  // First check if we have an explicit color
  const boat = boats.find(b => b.boat_id === boat_id);
  if (boat?.color_hex) {
    return boat.color_hex;
  }
  
  // Generate deterministic color from boat_id
  const hash = hashString(boat_id);
  const hue = hash % 360;
  const saturation = 65 + (hash % 25); // 65-90%
  const lightness = 45 + (hash % 20); // 45-65%
  
  return hslToHex(hue, saturation, lightness);
}

// Debug helper to expand runs → per-week rows (for counts/testing)
export function expandRuns(actual: ActualRow[]): Array<{ week: string; dept: Dept; boat_id: string; model?: ModelTag }> {
  const out: Array<{ week: string; dept: Dept; boat_id: string; model?: ModelTag }> = [];
  for (const r of actual) {
    let d = new Date(r.start_week);
    for (let i = 0; i < r.run_weeks; i++) {
      out.push({ week: d.toISOString().slice(0,10), dept: r.dept, boat_id: r.boat_id, model: r.model });
      d.setUTCDate(d.getUTCDate() + 7);
    }
  }
  return out;
}