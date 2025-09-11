import 'server-only';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as XLSX from 'xlsx';
import { SHEET_NAME, FIRST_WEEK_COLUMN, ROWMAP } from '../config/schedule-map';
import { normalizeDept, type Dept, type ScheduleData, type ScheduledRow, type ActualRow, expandRuns } from './schedule-types';

// Module-level variables for debugging
let __lastWorkbookPath = '';
let __usedTemp = false;

// Resolve data path regardless of CWD (Next sometimes runs from .next)
function resolveSchedulePath(): string {
  const p1 = path.join(process.cwd(), 'data', 'production_schedule.xlsx');
  if (fs.existsSync(p1)) return p1;
  // Fallback: project root two levels up (rare but safe)
  const p2 = path.join(__dirname, '..', '..', '..', 'data', 'production_schedule.xlsx');
  if (fs.existsSync(p2)) return p2;
  return p1; // default (will throw downstream with a clear message)
}

type Ws = XLSX.WorkSheet;

function inRange(r:number, c:number, s:{r:number,c:number}, e:{r:number,c:number}) {
  return r >= s.r && r <= e.r && c >= s.c && c <= e.c;
}
function getMergedTopLeft(ws: Ws, r:number, c:number) {
  const merges = (ws as any)['!merges'] as Array<{s:{r:number,c:number},e:{r:number,c:number}}> | undefined;
  if (!merges) return null;
  for (const m of merges) if (inRange(r,c,m.s,m.e)) return m.s;
  return null;
}
export function getCellRaw(ws: Ws, r:number, c:number) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = (ws as any)[addr];
  if (cell && cell.v != null && cell.v !== '') return cell.v;
  const topLeft = getMergedTopLeft(ws, r, c);
  if (topLeft) {
    const tlAddr = XLSX.utils.encode_cell(topLeft);
    const tl = (ws as any)[tlAddr];
    if (tl && tl.v != null && tl.v !== '') return tl.v;
  }
  return undefined;
}

// Read workbook safely on Windows:
// 1) Try readFileSync buffer → XLSX.read(buffer)
// 2) If EPERM/EBUSY, copy to temp and read the temp
// 3) Small retry loop to handle transient locks
export function readWorkbookSafe(): XLSX.WorkBook {
  const src = resolveSchedulePath();
  let lastErr: any = null;
  __lastWorkbookPath = src;
  __usedTemp = false;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const buf = fs.readFileSync(src);                       // read as buffer (works even if Excel has write-lock)
      return XLSX.read(buf, { type: 'buffer', cellDates: false, cellNF: true, cellText: false });
    } catch (e: any) {
      lastErr = e;
      const code = (e?.code || '').toUpperCase();
      const locky = code === 'EPERM' || code === 'EBUSY' || code === 'EACCES';
      if (!locky) break;

      try {
        // Shadow copy to a temp file under .next/cache (short path helps)
        const tmpDir = path.join(process.cwd(), '.next', 'cache', 'foresight-tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const tmp = path.join(tmpDir, `schedule-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`);

        // Stream copy (works even when the source has a sharing lock)
        fs.copyFileSync(src, tmp);
        const buf2 = fs.readFileSync(tmp);
        const wb = XLSX.read(buf2, { type: 'buffer', cellDates: false, cellNF: true, cellText: false });
        // best-effort cleanup
        fs.unlink(tmp, () => {});
        __usedTemp = true;
        __lastWorkbookPath = tmp;
        return wb;
      } catch (e2) {
        lastErr = e2;
      }
    }
    // brief backoff
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40);
  }

  const msg = `Unable to read Excel at ${src}. Last error: ${lastErr?.code || lastErr}`;
  throw new Error(msg);
}

export interface ParseReport {
  mapping?: any;
  counts: { boats:number; scheduled:number; actual:number };
  countsByModel?: Record<string,number>;
  countsByModelFlat?: Record<string,number>;
  flowIssues?: Array<{ boat_id:string; outOfOrder:string[] }>;
  weeksFirst6?: string[];
  warnings: string[];
  io?: { path: string; usedTemp: boolean };
}

const ONE_DAY = 86400000;
function excelSerialToDate(serial: number, is1904: boolean): Date {
  const base = is1904 ? Date.UTC(1904,0,1) : Date.UTC(1899,11,30);
  return new Date(base + Math.round(serial * ONE_DAY));
}
function isoMonday(d: Date): string {
  const wd = d.getUTCDay(); const back = (wd === 0 ? 6 : wd - 1);
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back));
  return m.toISOString().slice(0,10);
}
function parseEndOfWeekHeader(raw: any, yearHint: number, is1904: boolean): string | '' {
  // handles: Excel serials, "M/D", "M/D/YY", "M/D–M/D" or "M/D-M/D"
  let end: Date | null = null;
  if (typeof raw === 'number' && isFinite(raw)) end = excelSerialToDate(raw, is1904);
  if (!end && typeof raw === 'string') {
    const s = raw.trim();
    let m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/); // M/D/Y
    if (m) end = new Date(Date.UTC(+(+m[3] < 100 ? 2000 + +m[3] : +m[3]), +m[1]-1, +m[2]));
    if (!end) {
      m = s.match(/(\d{1,2})[\/-](\d{1,2})\s*[–-]\s*(\d{1,2})[\/-](\d{1,2})/); // M/D–M/D
      if (m) end = new Date(Date.UTC(yearHint, +m[3]-1, +m[4])); // RIGHT date is end-of-week
    }
    if (!end) {
      m = s.match(/^(\d{1,2})[\/-](\d{1,2})$/); // M/D
      if (m) end = new Date(Date.UTC(yearHint, +m[1]-1, +m[2]));
    }
  }
  if (!end) return '';
  const monday = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - 4)); // Friday→Mon
  return monday.toISOString().slice(0,10);
}
function splitTokens(raw: any): string[] {
  const s = String(raw ?? '').replace(/\r/g,'\n');
  return s.split(/[\n,;|]+/).map(t => t.trim()).filter(t => t && t !== '?');
}
const plus7 = (iso: string) => {
  const d = new Date(iso); d.setUTCDate(d.getUTCDate()+7);
  return d.toISOString().slice(0,10);
};



export async function parseScheduleWithReport(): Promise<{ data: ScheduleData; report: ParseReport }> {
  const data = await parseSchedule();
  const weeksFirst6 = Array.from(new Set([
    ...data.scheduled.map(s=>s.week_start),
    ...data.actual.map(a=>a.start_week),
  ])).sort((a,b)=>a.localeCompare(b)).slice(0,6);

  // counts by model (presence in 40 vs 26 blocks inferred from name patterns; optional)
  const byModel: Record<string, number> = {};
  for (const a of data.actual) {
    const m = a.boat_id.match(/\b(40|26)[-\s]?\d+\b/i);
    const key = m ? m[1] : 'name';
    byModel[key] = (byModel[key]||0)+1;
  }

  // Simple flow validator (lam→assembly→finishing→rigging→qc) by first seen week
  const order = ['lamination','assembly','finishing','rigging','qc'] as const;
  const firstSeen = new Map<string, Partial<Record<Dept,string>>>();
  for (const r of data.actual) {
    const m = firstSeen.get(r.boat_id) || {};
    if (!m[r.dept] || r.start_week < (m[r.dept] as string)) m[r.dept] = r.start_week;
    firstSeen.set(r.boat_id, m);
  }
  const flowIssues: Array<{ boat_id:string; outOfOrder:string[] }> = [];
  for (const [boat, m] of firstSeen) {
    const probs: string[] = [];
    for (let i=1;i<order.length;i++) {
      const prev = m[order[i-1]]; const cur = m[order[i]];
      if (cur && prev && cur < prev) probs.push(`${order[i]} before ${order[i-1]}`);
    }
    if (probs.length) flowIssues.push({ boat_id: boat, outOfOrder: probs });
  }

  // Calculate counts by model using expanded runs
  const flat = expandRuns(data.actual);
  const byModelFlat = flat.reduce((acc, r) => {
    const k = r.model || '??';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const report: ParseReport = {
    mapping: { SHEET_NAME, FIRST_WEEK_COLUMN, ROWMAP },
    counts: { boats: new Set(data.boats.map(b=>b.boat_id)).size, scheduled: data.scheduled.length, actual: data.actual.length },
    countsByModel: byModel,
    countsByModelFlat: byModelFlat,
    flowIssues,
    weeksFirst6,
    warnings: [],
    io: { path: __lastWorkbookPath, usedTemp: __usedTemp },
  };
  return { data, report };
}

export async function parseSchedule(): Promise<ScheduleData> {
  let wb: XLSX.WorkBook;
  try {
    wb = readWorkbookSafe();
  } catch (error) {
    console.error('Error reading Excel file:', error);
    return { boats: [], scheduled: [], actual: [] };
  }
  const is1904 = !!wb?.Workbook?.WBProps?.date1904;
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) return { boats: [], scheduled: [], actual: [] };

  const sheetYear = Number(SHEET_NAME) || new Date().getFullYear();
  const firstCol = XLSX.utils.decode_col(FIRST_WEEK_COLUMN);

  const scheduled: ScheduledRow[] = [];
  const actualEvents: Array<{ boat_id:string; dept:Dept; iso:string; model:'40'|'26' }> = [];

  for (const model of Object.keys(ROWMAP) as Array<'40' | '26'>) {
    const { headerRow1, rows } = ROWMAP[model];
    const headerRow0 = Math.max(0, headerRow1 - 1);
    const modelTag = model as '40'|'26';

    // 1) Build week columns from header row
    const weekCols: Array<{ col:number; iso:string }> = [];
    for (let c = firstCol; c < firstCol + 300; c++) {
      const raw = getCellRaw(ws, headerRow0, c);
      if (raw == null || raw === '') break;
      const iso = parseEndOfWeekHeader(raw, sheetYear, is1904);
      if (!iso) continue;
      const y = +iso.slice(0,4);
      if (Math.abs(y - sheetYear) > 1) continue; // reject crazy years
      weekCols.push({ col: c, iso });
    }
    // de-dup & sort ISO weeks
    const isoWeeks = Array.from(new Set(weekCols.map(w => w.iso))).sort((a,b)=>a.localeCompare(b));
    const colToIso = new Map(weekCols.map(w => [w.col, w.iso]));

    // 2) For each dept lane row → read scheduled & actual
    const mapDept = (k: keyof typeof rows): Dept | 'detail' =>
      (k === 'detail' ? 'detail' : (k as Dept));

    for (const k of Object.keys(rows) as Array<keyof typeof rows>) {
      const laneRows = rows[k];
      const deptKey = mapDept(k);
      const toDept: Dept = (deptKey === 'detail' ? 'qc' : deptKey) as Dept;

      // scheduled
      const schedRow0 = Math.max(0, laneRows.scheduled - 1);
      for (const { col } of weekCols) {
        const raw = getCellRaw(ws, schedRow0, col);
        if (!raw) continue;
        const boats = splitTokens(raw);
        const iso = colToIso.get(col)!;
        for (const boat_id of boats) {
          scheduled.push({ week_start: iso, dept: toDept, boat_id, model: modelTag });
        }
      }
      // actual → collect events (one per week); runs stitched later
      const actualRow0 = Math.max(0, laneRows.actual - 1);
      for (const { col } of weekCols) {
        const raw = getCellRaw(ws, actualRow0, col);
        if (!raw) continue;
        const boats = splitTokens(raw);
        const iso = colToIso.get(col)!;
        for (const boat_id of boats) {
          actualEvents.push({ boat_id, dept: toDept, iso, model: modelTag });
        }
      }
    }
  }

  // 3) Stitch contiguous weeks into runs per (boat, dept, model)
  const byBoatDeptModel = new Map<string, { weeks: Set<string>; model: '40'|'26' }>();
  for (const e of actualEvents) {
    const key = `${e.boat_id}||${e.dept}||${e.model}`;
    if (!byBoatDeptModel.has(key)) {
      byBoatDeptModel.set(key, { weeks: new Set(), model: e.model });
    }
    byBoatDeptModel.get(key)!.weeks.add(e.iso);
  }
  const actual: ActualRow[] = [];
  for (const [key, data] of byBoatDeptModel) {
    const [boat_id, dept, model] = key.split('||');
    const weeks = Array.from(data.weeks).sort((a,b)=>a.localeCompare(b));
    let i = 0;
    while (i < weeks.length) {
      let start = weeks[i]; let run = 1;
      while (i + 1 < weeks.length && weeks[i+1] === plus7(weeks[i])) { i++; run++; }
      actual.push({ start_week: start, dept: dept as Dept, boat_id, run_weeks: run, model: model as '40'|'26' });
      i++;
    }
  }

  // 4) Boats list (for colors) from unique ids
  const boatIds = Array.from(new Set([...scheduled.map(s=>s.boat_id), ...actual.map(a=>a.boat_id)]));
  const boats = boatIds.map(b => ({ boat_id: b }));

  return { boats, scheduled, actual };
}