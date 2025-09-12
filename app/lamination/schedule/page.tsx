'use client';

import React, { useEffect, useMemo, useState, useCallback } from "react";

// ------------------------------------------------------------
// Foresight ERP — Parts Page Prototype (React + Tailwind)
// Weekly view + optional stacked weeks • Filters with labels • Organize by (None / Boat / Lamination Type / Due Week)
// Reorder within current group via drag-and-drop ONLY (no Position column)
// Persistence: saves field edits + row order per (view, week, group) using localStorage (prototype)
// No cross-boat moves • Boat-colored row border • Stage-colored select
// ------------------------------------------------------------

// Types
export type Stage =
  | "Unscheduled"
  | "Scheduled"
  | "In Mold"
  | "Pulled"
  | "Cutter"
  | "Finished";

export type LamType = "Skin" | "Core" | "Infusion" | "Hand Layup";

export type Part = {
  id: string;
  name: string;
  boat: { id: string; label: string; length: 26 | 40; colorHex: string; shipWeek: string };
  lamType: LamType;
  gelcoat: string;
  qtyNeeded: number;
  qtyDone: number;
  stage: Stage;
  dueDate: string; // ISO date
  scheduledWeek?: string; // ISO date of Monday of scheduled week - can differ from due date
  assignee?: string;
  notes?: string;
  history?: Array<{ ts: string; action: string; by: string }>;
};

// Stage → color mapping (match Timeline stack colors)
const STAGE_COLORS: Record<Stage, string> = {
  Unscheduled: "bg-gray-200 text-gray-900",
  Scheduled: "bg-blue-200 text-blue-900",
  "In Mold": "bg-amber-200 text-amber-900",
  Pulled: "bg-lime-200 text-lime-900",
  Cutter: "bg-violet-200 text-violet-900",
  Finished: "bg-emerald-200 text-emerald-900",
};

// Utility
const fmtPct = (n: number) => `${Math.round(n * 100)}%`;
const cls = (...s: (string | false | null | undefined)[]) => s.filter(Boolean).join(" ");
const iso = (d: Date) => d.toISOString().slice(0, 10);

// Monday start helpers
function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function weekBucketLabel(isoDate: string) {
  const monday = startOfWeek(new Date(isoDate));
  return `Week of ${monday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function weekRangeFromOffset(offset: number) {
  const monday = startOfWeek(new Date());
  monday.setDate(monday.getDate() + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return { start: monday, end: sunday };
}

// localStorage helpers (prototype persistence)
const LS_PATCH_KEY = "fs:parts:patches:v1";
const LS_ORDER_KEY = "fs:parts:order:v1";

const hasWindow = typeof window !== "undefined";
function lsGet<T = any>(key: string): T | null {
  if (!hasWindow) return null;
  try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) as T : null; } catch { return null; }
}
function lsSet(key: string, val: any) {
  if (!hasWindow) return;
  try { window.localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function savePartPatch(id: string, patch: Partial<Part>) {
  const map = lsGet<Record<string, Partial<Part>>>(LS_PATCH_KEY) || {};
  map[id] = { ...(map[id] || {}), ...patch };
  lsSet(LS_PATCH_KEY, map);
}
function loadPatches(): Record<string, Partial<Part>> {
  return lsGet<Record<string, Partial<Part>>>(LS_PATCH_KEY) || {};
}
function applyPatches(list: Part[], patches: Record<string, Partial<Part>>): Part[] {
  return list.map((p) => (patches[p.id] ? { ...p, ...patches[p.id] } as Part : p));
}

function ordViewKey(organize: Organizer) {
  if (organize === "Boat") return "boat";
  if (organize === "Lamination Type") return "lam";
  return null; // we only persist order for Boat/Lam views
}
function saveGroupOrder(organize: Organizer, weekStartISO: string, groupKey: string, ids: string[]) {
  const vk = ordViewKey(organize); if (!vk) return;
  const store = lsGet<Record<string, Record<string, string[]>>>(LS_ORDER_KEY) || {};
  store[vk] = store[vk] || {};
  const bucket = `${groupKey}__${weekStartISO}`;
  store[vk][bucket] = ids;
  lsSet(LS_ORDER_KEY, store);
}
function loadGroupOrder(organize: Organizer, weekStartISO: string, groupKey: string): string[] | null {
  const vk = ordViewKey(organize); if (!vk) return null;
  const store = lsGet<Record<string, Record<string, string[]>>>(LS_ORDER_KEY) || {};
  const bucket = `${groupKey}__${weekStartISO}`;
  return store[vk]?.[bucket] || null;
}
function applySavedOrder(rows: Part[], organize: Organizer, weekStartISO: string, groupKey: string): Part[] {
  const ord = loadGroupOrder(organize, weekStartISO, groupKey);
  if (!ord || ord.length === 0) return rows;
  const idx = new Map<string, number>(ord.map((id, i) => [id, i]));
  return rows.slice().sort((a, b) => (idx.has(a.id) ? idx.get(a.id)! : 1e9) - (idx.has(b.id) ? idx.get(b.id)! : 1e9));
}

// Default empty parts array - will be loaded from API
const defaultParts: Part[] = [];

// Filters & organize
type Filters = {
  q: string;
  stage: Stage | "All";
  lam: LamType | "All";
  gel: string | "All";
  dueRange: "All" | "This Week" | "Next Week" | "Overdue";
  hideCompleted: boolean;
  hidePastWeeks: boolean;
};

const defaultFilters: Filters = { q: "", stage: "All", lam: "All", gel: "All", dueRange: "All", hideCompleted: false, hidePastWeeks: false };

type Organizer = "None" | "Boat" | "Lamination Type" | "Due Week";

// Drawer (right)
function Drawer({ part, onClose }: { part: Part | null; onClose: () => void }) {
  return (
    <div className={cls("fixed inset-0 z-30", part ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!part}>
      <div className={cls("absolute inset-0 bg-black/30 transition-opacity", part ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cls("absolute right-0 top-0 h-full w-[380px] bg-white shadow-xl border-l transition-transform", part ? "translate-x-0" : "translate-x-full")}>
        {part && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b flex items-start gap-3">
              <div className="h-10 w-10 rounded-full" style={{ backgroundColor: part.boat.colorHex }} />
              <div>
                <div className="text-sm text-gray-500">{part.boat.label} • {part.boat.shipWeek}</div>
                <div className="font-semibold">{part.name} <span className="text-gray-400">({part.sku})</span></div>
                <div className="text-xs text-gray-500">{part.lamType} • Gel: {part.gelcoat}</div>
              </div>
              <button className="ml-auto text-gray-500 hover:text-gray-900" onClick={onClose}>✕</button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Current</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-gray-500">Stage</div>
                    <div className={cls("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", STAGE_COLORS[part.stage])}>{part.stage}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Due</div>
                    <div>{part.dueDate}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Qty</div>
                    <div>{part.qtyDone} / {part.qtyNeeded}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Assignee</div>
                    <div>{part.assignee ?? "—"}</div>
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</h3>
                <div className="text-sm whitespace-pre-wrap min-h-[48px] p-2 border rounded-md bg-gray-50">{part.notes ?? "—"}</div>
              </section>
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">History</h3>
                <ul className="space-y-2 text-sm">
                  {part.history?.map((h, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-gray-300" />
                      <div>
                        <div className="font-medium">{h.action}</div>
                        <div className="text-xs text-gray-500">{new Date(h.ts).toLocaleString()} • {h.by}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Toast
function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 2000); return () => clearTimeout(t); }, [onClose]);
  return (<div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-3 py-2 rounded-md shadow-lg">{msg}</div>);
}

// New Part Form Dialog
function NewPartForm({ isOpen, onClose, onSubmit }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (part: Omit<Part, 'id' | 'history'>) => void; 
}) {
  const [formData, setFormData] = useState<Omit<Part, 'id' | 'history'>>({
    name: '',
    boat: { 
      id: 'B-26-NEW', 
      label: 'NEW • 26-ft', 
      length: 26, 
      colorHex: '#22c55e',
      shipWeek: 'TBD'
    },
    lamType: 'Skin',
    gelcoat: 'White',
    qtyNeeded: 1,
    qtyDone: 0,
    stage: 'Unscheduled',
    dueDate: iso(new Date()),
    assignee: '',
    notes: '',
    scheduledWeek: iso(startOfWeek(new Date())) // Default to current week
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Part name is required');
      return;
    }
    onSubmit(formData);
    onClose();
    // Reset form
    setFormData({
      name: '',
      boat: { 
        id: 'B-26-NEW', 
        label: 'NEW • 26-ft', 
        length: 26, 
        colorHex: '#22c55e',
        shipWeek: 'TBD'
      },
      lamType: 'Skin',
      gelcoat: 'White',
      qtyNeeded: 1,
      qtyDone: 0,
      stage: 'Unscheduled',
      dueDate: iso(new Date()),
      assignee: '',
      notes: '',
      scheduledWeek: iso(startOfWeek(new Date())) // Default to current week
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Add New Part</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Part Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border rounded-md px-3 py-2"
                placeholder="Hull Bottom"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Boat</label>
                <select
                  value={formData.boat.id}
                  onChange={(e) => {
                    const isBoat40 = e.target.value.includes('40');
                    const newBoat = {
                      id: e.target.value,
                      label: isBoat40 ? `${e.target.value.split('-')[2]} • 40‑ft` : `${e.target.value.split('-')[2]} • 26‑ft`,
                      length: isBoat40 ? 40 : 26,
                      colorHex: isBoat40 ? "#0ea5e9" : "#f97316",
                      shipWeek: "TBD"
                    };
                    setFormData({...formData, boat: newBoat});
                  }}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="B-26-NEW">NEW • 26‑ft</option>
                  <option value="B-26-37211">37211 • 26‑ft</option>
                  <option value="B-40-48881">48881 • 40‑ft</option>
                  <option value="B-26-12345">12345 • 26‑ft</option>
                  <option value="B-40-67890">67890 • 40‑ft</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lamination Type</label>
                <select
                  value={formData.lamType}
                  onChange={(e) => setFormData({...formData, lamType: e.target.value as LamType})}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="Skin">Skin</option>
                  <option value="Core">Core</option>
                  <option value="Infusion">Infusion</option>
                  <option value="Hand Layup">Hand Layup</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gelcoat</label>
                <input
                  type="text"
                  value={formData.gelcoat}
                  onChange={(e) => setFormData({...formData, gelcoat: e.target.value})}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="White, Black, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData({...formData, stage: e.target.value as Stage})}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="Unscheduled">Unscheduled</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Mold">In Mold</option>
                  <option value="Pulled">Pulled</option>
                  <option value="Cutter">Cutter</option>
                  <option value="Finished">Finished</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qty Needed</label>
                <input
                  type="number"
                  min="1"
                  value={formData.qtyNeeded}
                  onChange={(e) => setFormData({...formData, qtyNeeded: Number(e.target.value) || 1})}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                <input
                  type="text"
                  value={formData.assignee}
                  onChange={(e) => setFormData({...formData, assignee: e.target.value})}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="AG"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full border rounded-md px-3 py-2"
                rows={3}
                placeholder="Any special notes or requirements..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Create Part
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Grouping & reorder helpers
function groupKeyFor(part: Part, organize: Organizer): string {
  switch (organize) {
    case "Boat":
      return part.boat.id;
    case "Lamination Type":
      return part.lamType;
    case "Due Week":
      return weekBucketLabel(part.dueDate);
    default:
      return "ALL";
  }
}

function sameWeek(a: Part, b: Part): boolean {
  return weekBucketLabel(a.dueDate) === weekBucketLabel(b.dueDate);
}

function reorderWithinGroup(parts: Part[], srcId: string, dstId: string, organize: Organizer, enforceSameWeek: boolean): Part[] {
  if (srcId === dstId) return parts;
  const srcIdx = parts.findIndex((p) => p.id === srcId);
  const dstIdx = parts.findIndex((p) => p.id === dstId);
  if (srcIdx === -1 || dstIdx === -1) return parts;
  const src = parts[srcIdx];
  const dst = parts[dstIdx];
  if (groupKeyFor(src, organize) !== groupKeyFor(dst, organize)) return parts;
  if (enforceSameWeek && !sameWeek(src, dst)) return parts;
  const next = parts.slice();
  next.splice(srcIdx, 1);
  next.splice(dstIdx, 0, src);
  return next;
}

function movePartToWeek(parts: Part[], partId: string, targetWeekStart: string): Part[] {
  return parts.map((p) => {
    if (p.id === partId) {
      return { ...p, scheduledWeek: targetWeekStart };
    }
    return p;
  });
}

// Runtime tests (console)
function runDevTests() {
  const results: Array<{ name: string; pass: boolean; detail?: string }> = [];
  const stageOpts = ["All", "Unscheduled", "Scheduled", "In Mold", "Pulled", "Cutter", "Finished"] as const;
  const lamOpts = ["All", "Skin", "Core", "Infusion", "Hand Layup"] as const;
  const gelOpts = ["All", "Snow White", "Seafoam", "Shark Grey"] as const;
  const dueOpts = ["All", "This Week", "Next Week", "Overdue"] as const;
  results.push({ name: "Stage options length", pass: stageOpts.length === 7 });
  results.push({ name: "Lam options length", pass: lamOpts.length === 5 });
  results.push({ name: "Gel options length", pass: gelOpts.length === 4 });
  results.push({ name: "Due options length", pass: dueOpts.length === 4 });
  const stages: Stage[] = ["Unscheduled", "Scheduled", "In Mold", "Pulled", "Cutter", "Finished"];
  results.push({ name: "Stage color mapping complete", pass: stages.every((s) => STAGE_COLORS[s] !== undefined) });
  const sample: Part = { id: "t1", name: "Test", boat: { id: "B", label: "B", length: 26, colorHex: "#000", shipWeek: "WK" }, lamType: "Skin", gelcoat: "Snow White", qtyNeeded: 3, qtyDone: 1, stage: "Pulled", dueDate: iso(new Date()) };
  const canFinish = !(sample.qtyDone < sample.qtyNeeded);
  results.push({ name: "Finish guard blocks incomplete qty", pass: !canFinish });
  results.push({ name: "groupKey Boat", pass: groupKeyFor(sample, "Boat") === "B" });
  results.push({ name: "groupKey Lamination", pass: groupKeyFor(sample, "Lamination Type") === "Skin" });
  const wk = weekBucketLabel(sample.dueDate);
  results.push({ name: "groupKey Due Week", pass: groupKeyFor(sample, "Due Week") === wk });
  const a: Part = { ...sample, id: "A", boat: { ...sample.boat, id: "B1" } };
  const b: Part = { ...sample, id: "B", boat: { ...sample.boat, id: "B2" } };
  const arr = [a, b];
  const res = reorderWithinGroup(arr, "A", "B", "Boat", true);
  results.push({ name: "DnD blocked across boats", pass: res[0].id === "A" && res[1].id === "B" });
  const c: Part = { ...sample, id: "C", boat: { ...sample.boat, id: "B1" } };
  const arr2 = [a, c, b];
  const res2 = reorderWithinGroup(arr2, "C", "A", "Boat", true);
  results.push({ name: "DnD allowed within same boat", pass: res2[0].id === "C" && res2[1].id === "A" });
  // Lamination type reordering within same lam group
  const l1: Part = { ...sample, id: "L1", lamType: "Skin" };
  const l2: Part = { ...sample, id: "L2", lamType: "Skin" };
  const l3: Part = { ...sample, id: "L3", lamType: "Core" };
  const larr = [l1, l2, l3];
  const lres = reorderWithinGroup(larr, "L2", "L1", "Lamination Type", true);
  results.push({ name: "DnD allowed within same lam type", pass: lres[0].id === "L2" && lres[1].id === "L1" });
  // EnforceSameWeek should block cross-week reorder
  const w1: Part = { ...sample, id: "W1", dueDate: iso(weekRangeFromOffset(0).start) };
  const w2: Part = { ...sample, id: "W2", dueDate: iso(weekRangeFromOffset(1).start) };
  const warr = [w1, w2];
  const wres = reorderWithinGroup(warr, "W2", "W1", "Boat", true);
  results.push({ name: "DnD blocked across weeks when enforced", pass: wres[0].id === "W1" && wres[1].id === "W2" });
  // Persistence: order apply test
  const orderRows: Part[] = [
    { ...sample, id: "O1" },
    { ...sample, id: "O2" },
    { ...sample, id: "O3" },
  ];
  saveGroupOrder("Boat", "2099-01-01", "B", ["O2", "O1"]);
  const applied = applySavedOrder(orderRows, "Boat", "2099-01-01", "B");
  results.push({ name: "applySavedOrder respects stored ids", pass: applied[0].id === "O2" && applied[1].id === "O1" });

  const allPass = results.every((r) => r.pass);
  if (!allPass) {
    console.group("[PartsPagePrototype tests]");
    results.forEach((r) => console[r.pass ? "log" : "error"](`${r.pass ? "PASS" : "FAIL"} — ${r.name}${r.detail ? ": " + r.detail : ""}`));
    console.groupEnd();
  }
}

// Main component
export default function PartsPagePrototype() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [organize, setOrganize] = useState<Organizer>("Boat");
  const [parts, setParts] = useState<Part[]>([]);
  const [open, setOpen] = useState<Part | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = this week
  const [stackWeeks, setStackWeeks] = useState<boolean>(false);
  const [stackCount, setStackCount] = useState<number>(3);
  const [showNewPartForm, setShowNewPartForm] = useState<boolean>(false);
  const [editingParts, setEditingParts] = useState<Set<string>>(new Set());

  // Load parts from API on mount
  useEffect(() => { 
    runDevTests();
    loadPartsFromAPI();
  }, []);

  // Load parts from API
  const loadPartsFromAPI = async () => {
    try {
      const response = await fetch('/api/lamination-parts');
      if (response.ok) {
        const data = await response.json();
        setParts(data.parts || []);
      }
    } catch (error) {
      console.error('Failed to load parts:', error);
    }
  };

  // Save all parts to API
  const savePartsToAPI = async () => {
    try {
      const response = await fetch('/api/lamination-parts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts })
      });
      if (response.ok) {
        setToast('All changes saved');
      }
    } catch (error) {
      console.error('Failed to save parts:', error);
      setToast('Failed to save');
    }
  };

  // Add new part from form
  const addNewPart = (partData: Omit<Part, 'id' | 'history'>) => {
    const newPart: Part = {
      ...partData,
      id: `P-${Date.now()}`,
      history: [{
        ts: new Date().toISOString(),
        action: 'Part created',
        by: 'User'
      }]
    };
    setParts(prev => [...prev, newPart]);
    setToast('New part created successfully');
  };

  // Filter base list by general filters (not week yet)
  const filteredBase = useMemo(() => {
    const q = filters.q.toLowerCase();
    const curWeek = weekRangeFromOffset(0);
    const nextWeek = weekRangeFromOffset(1);

    return parts.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (filters.stage !== "All" && p.stage !== filters.stage) return false;
      if (filters.lam !== "All" && p.lamType !== filters.lam) return false;
      if (filters.gel !== "All" && !p.gelcoat.toLowerCase().includes(filters.gel.toLowerCase())) return false;
      if (filters.dueRange !== "All") {
        const due = new Date(p.dueDate);
        if (filters.dueRange === "Overdue" && !(due < curWeek.start)) return false;
        if (filters.dueRange === "This Week" && !(due >= curWeek.start && due <= curWeek.end)) return false;
        if (filters.dueRange === "Next Week" && !(due >= nextWeek.start && due <= nextWeek.end)) return false;
      }
      if (filters.hideCompleted && p.stage === "Finished") return false;
      return true;
    });
  }, [filters, parts]);

  // Build week sections (either single selected week or stacked)
  const weekSections = useMemo(() => {
    const count = stackWeeks ? stackCount : 1;
    const currentWeekStart = startOfWeek(new Date()); // Use consistent week start calculation
    
    return Array.from({ length: count }).map((_, i) => {
      const off = weekOffset + i;
      // Use consistent startOfWeek calculation for all week boundaries
      const weekStart = startOfWeek(new Date());
      weekStart.setDate(weekStart.getDate() + (off * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const range = { start: weekStart, end: weekEnd };
      const weekStartISO = iso(weekStart);
      
      const list = filteredBase.filter((p) => {
        // Use scheduledWeek if available, otherwise fall back to dueDate
        const dateToCheck = p.scheduledWeek ? new Date(p.scheduledWeek) : new Date(p.dueDate);
        const partWeekStart = startOfWeek(dateToCheck);
        const partWeekStartISO = iso(partWeekStart);
        
        return partWeekStartISO === weekStartISO;
      });
      return { key: `w${off}`, offset: off, range, items: list };
    }).filter(section => {
      // Filter out past weeks if hidePastWeeks is enabled
      if (filters.hidePastWeeks) {
        return section.range.end >= currentWeekStart;
      }
      return true;
    });
  }, [filteredBase, weekOffset, stackWeeks, stackCount, filters.hidePastWeeks]);

  // Derived stats for visible parts
  const visibleParts = useMemo(() => weekSections.flatMap((s) => s.items), [weekSections]);
  const stats = useMemo(() => {
    const total = visibleParts.length;
    const finished = visibleParts.filter((p) => p.stage === "Finished").length;
    const blockers = visibleParts.filter((p) => p.notes?.toLowerCase().includes("hold")).length;
    const dueSoon = visibleParts.filter((p) => {
      const d = new Date(p.dueDate); const now = new Date();
      const diff = (d.getTime() - now.getTime()) / 86400000; return diff >= 0 && diff <= 7; }).length;
    const overdue = visibleParts.filter((p) => new Date(p.dueDate) < new Date() && p.stage !== "Finished").length;
    return { total, pct: total ? finished / total : 0, blockers, dueSoon, overdue };
  }, [visibleParts]);

  // Group rows by organizer for a given list
  function groupRows(rows: Part[]): Array<[string, Part[]]> {
    const map = new Map<string, Part[]>();
    rows.forEach((p) => {
      const k = groupKeyFor(p, organize);
      const arr = map.get(k) || [];
      arr.push(p);
      map.set(k, arr);
    });
    return Array.from(map.entries());
  }

  // Update helper (persists)
  const updatePart = useCallback(async (id: string, patch: Partial<Part>) => {
    // Update local state immediately and get the updated part
    let updatedPart: Part | null = null;
    setParts((prev) => {
      const newParts = prev.map((p) => {
        if (p.id === id) {
          updatedPart = { ...p, ...patch };
          return updatedPart;
        }
        return p;
      });
      return newParts;
    });
    
    // Save to API
    if (updatedPart) {
      try {
        const response = await fetch('/api/lamination-parts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedPart)
        });
        if (response.ok) {
          setToast("Saved");
        }
      } catch (error) {
        console.error('Failed to save part:', error);
        setToast("Failed to save");
      }
    }
  }, []);

  // Header week label
  const currentRange = weekRangeFromOffset(weekOffset);
  const currentWeekLabel = `Week of ${currentRange.start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  // Fixed column count with Edit column (removed SKU and Updated)
  const COL_COUNT = 8;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 rounded-md border" onClick={() => setWeekOffset((x) => x - 1)}>← Prev</button>
              <button className="px-2 py-1 rounded-md border" onClick={() => setWeekOffset(0)}>This Week</button>
              <button className="px-2 py-1 rounded-md border" onClick={() => setWeekOffset((x) => x + 1)}>Next →</button>
              <span className="ml-2 text-sm text-gray-600">{currentWeekLabel}</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button 
                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                onClick={() => setShowNewPartForm(true)}
              >
                + Add New Part
              </button>
              <button 
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                onClick={() => savePartsToAPI()}
              >
                Save All Changes
              </button>
              <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={stackWeeks} onChange={(e) => setStackWeeks(e.target.checked)} /> Stack weeks
              </label>
              {stackWeeks && (
                <div className="flex items-center gap-2 text-sm">
                  <span>Show</span>
                  <input type="number" min={1} max={8} value={stackCount} onChange={(e) => setStackCount(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} className="w-14 border rounded-md px-2 py-1" />
                  <span>weeks</span>
                </div>
              )}
            </div>
          </div>
          {/* Stats */}
          <div className="mt-3 grid grid-cols-5 gap-4">
            <div className="text-center"><div className="text-xs text-gray-500">Parts</div><div className="text-lg font-semibold">{stats.total}</div></div>
            <div className="text-center"><div className="text-xs text-gray-500">Complete</div><div className="text-lg font-semibold">{fmtPct(stats.pct)}</div></div>
            <div className="text-center"><div className="text-xs text-gray-500">Overdue</div><div className="text-lg font-semibold">{stats.overdue}</div></div>
            <div className="text-center"><div className="text-xs text-gray-500">Due ≤ 7d</div><div className="text-lg font-semibold">{stats.dueSoon}</div></div>
            <div className="text-center"><div className="text-xs text-gray-500">Blocked</div><div className="text-lg font-semibold">{stats.blockers}</div></div>
          </div>
        </div>
      </div>

      {/* Filters + Organize (with labels above) */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Search</label>
            <input className="border rounded-md px-3 py-2 text-sm w-64" placeholder="Find part or SKU…" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Status</label>
            <select className="border rounded-md px-2 py-2 text-sm" value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value as Filters["stage"] })}>{(["All", "Unscheduled", "Scheduled", "In Mold", "Pulled", "Cutter", "Finished"] as const).map((opt) => (<option key={opt} value={opt}>{opt}</option>))}</select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Lamination Type</label>
            <select className="border rounded-md px-2 py-2 text-sm" value={filters.lam} onChange={(e) => setFilters({ ...filters, lam: e.target.value as Filters["lam"] })}>{(["All", "Skin", "Core", "Infusion", "Hand Layup"] as const).map((opt) => (<option key={opt} value={opt}>{opt}</option>))}</select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Gelcoat</label>
            <input 
              className="border rounded-md px-3 py-2 text-sm w-32" 
              placeholder="Filter by gelcoat..." 
              value={filters.gel === "All" ? "" : filters.gel} 
              onChange={(e) => setFilters({ ...filters, gel: e.target.value || "All" })} 
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Due Range</label>
            <select className="border rounded-md px-2 py-2 text-sm" value={filters.dueRange} onChange={(e) => setFilters({ ...filters, dueRange: e.target.value as Filters["dueRange"] })}>{(["All", "This Week", "Next Week", "Overdue"] as const).map((opt) => (<option key={opt} value={opt}>{opt}</option>))}</select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input 
                type="checkbox" 
                checked={filters.hideCompleted} 
                onChange={(e) => setFilters({ ...filters, hideCompleted: e.target.checked })}
                className="rounded" 
              />
              Hide Completed
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input 
                type="checkbox" 
                checked={filters.hidePastWeeks} 
                onChange={(e) => setFilters({ ...filters, hidePastWeeks: e.target.checked })}
                className="rounded" 
              />
              Hide Past Weeks
            </label>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Organize by</label>
            <select className="border rounded-md px-2 py-2 text-sm" value={organize} onChange={(e) => setOrganize(e.target.value as Organizer)}>{(["None", "Boat", "Lamination Type", "Due Week"] as Organizer[]).map((opt) => (<option key={opt} value={opt}>{opt}</option>))}</select>
          </div>
          <button className="ml-auto text-sm px-3 py-2 rounded-md border hover:bg-gray-50" onClick={() => { setFilters(defaultFilters); setOrganize("Boat"); setWeekOffset(0); }}>Reset</button>
        </div>
      </div>

      {/* Week Sections */}
      <div className="max-w-7xl mx-auto px-6 pb-24 space-y-6">
        {weekSections.map((section) => {
          const weekLabel = `Week of ${section.range.start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
          const grouped = groupRows(section.items);
          const weekStartISO = iso(section.range.start);
          return (
            <div key={section.key} className="rounded-xl border">
              <div 
                className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedId = draggingId || e.dataTransfer.getData("text/id");
                  if (!draggedId) return;
                  
                  const targetWeekStart = iso(section.range.start); // range.start is already the Monday
                  setParts((prev) => {
                    const updated = movePartToWeek(prev, draggedId, targetWeekStart);
                    return updated;
                  });
                  setDraggingId(null);
                  setOverId(null);
                  setToast("Part moved to " + weekLabel);
                }}
              >
                <div className="text-sm font-semibold">{weekLabel}</div>
                <div className="text-xs text-gray-500">{section.items.length} parts</div>
              </div>

              <table className="w-full text-sm">
                <thead className="bg-white">
                  <tr className="border-b">
                    <th className="p-2 text-left">Part</th>
                    <th className="p-2 text-left">Lam Type</th>
                    <th className="p-2 text-left">Gelcoat</th>
                    <th className="p-2 text-left">Stage</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-left">Due</th>
                    <th className="p-2 text-left">Assignee</th>
                    <th className="p-2 text-left">Notes</th>
                    <th className="p-2 text-left">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {organize !== "None" && grouped.map(([key, rawRows]) => {
                    const groupKey = rawRows[0] ? groupKeyFor(rawRows[0], organize) : key;
                    const rows = applySavedOrder(rawRows, organize, weekStartISO, groupKey);
                    return (
                      <React.Fragment key={key}>
                        <tr className="bg-gray-50/70 border-b">
                          <td colSpan={COL_COUNT} className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            {organize === "Boat" && (
                              <span className="inline-flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: rows[0]?.boat.colorHex }} />
                                {rows[0]?.boat.label} ({rows.length})
                              </span>
                            )}
                            {organize === "Lamination Type" && <span>{rows[0]?.lamType} ({rows.length})</span>}
                            {organize === "Due Week" && <span>{weekLabel} ({rows.length})</span>}
                          </td>
                        </tr>

                        {rows.map((p) => {
                          const overdue = new Date(p.dueDate) < new Date() && p.stage !== "Finished";
                          const finished = p.stage === "Finished";
                          const dragging = draggingId === p.id;
                          const over = overId === p.id;
                          const isEditing = editingParts.has(p.id);
                          return (
                            <tr key={p.id}
                              draggable
                              onDragStart={(e) => { setDraggingId(p.id); e.dataTransfer.setData("text/id", p.id); e.dataTransfer.effectAllowed = "move"; }}
                              onDragOver={(e) => { e.preventDefault(); setOverId(p.id); }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const src = draggingId || e.dataTransfer.getData("text/id");
                                if (!src) return;
                                setParts((prev) => {
                                  const next = reorderWithinGroup(prev, src, p.id, organize, stackWeeks);
                                  // Persist new order for this (view, week, group)
                                  if (organize === "Boat" || organize === "Lamination Type") {
                                    const orderIds = next
                                      .filter((q) => {
                                        const d = new Date(q.dueDate);
                                        return d >= section.range.start && d <= section.range.end && groupKeyFor(q, organize) === groupKey;
                                      })
                                      .map((q) => q.id);
                                    saveGroupOrder(organize, weekStartISO, groupKey, orderIds);
                                  }
                                  return next;
                                });
                                setDraggingId(null);
                                setOverId(null);
                                setToast("Saved");
                              }}
                              onDragEnd={() => { setDraggingId(null); setOverId(null); }}
                              className={cls("border-b hover:bg-gray-50", dragging && "opacity-60", over && "ring-2 ring-blue-300", finished && "line-through opacity-60")}
                              style={{ borderLeft: `4px solid ${p.boat.colorHex}` }}
                            >
                              <td className="p-2 align-middle">
                                <button className="text-left" onClick={() => setOpen(p)}>
                                  <div className="font-medium flex items-center gap-2">
                                    <span>{p.name}</span>
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: p.boat.colorHex }}>
                                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.boat.colorHex }} />
                                      {p.boat.length}‑ft
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500">Boat: {p.boat.label}</div>
                                </button>
                              </td>
                              <td className="p-2 align-middle">{p.lamType}</td>
                              <td className="p-2 align-middle">{p.gelcoat}</td>
                              <td className="p-2 align-middle">
                                {isEditing ? (
                                  <select className={cls("rounded-md px-2 py-1 border font-medium", STAGE_COLORS[p.stage], finished && "opacity-70")} value={p.stage}
                                    onChange={(e) => { const next = e.target.value as Stage; if (next === "Finished" && p.qtyDone < p.qtyNeeded) { setToast("Finish blocked: qty not complete"); return; } updatePart(p.id, { stage: next }); }}>
                                    {(["Unscheduled", "Scheduled", "In Mold", "Pulled", "Cutter", "Finished"] as Stage[]).map((s) => (<option key={s} value={s}>{s}</option>))}
                                  </select>
                                ) : (
                                  <span className={cls("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium", STAGE_COLORS[p.stage])}>{p.stage}</span>
                                )}
                              </td>
                              <td className="p-2 align-middle text-right">
                                {isEditing ? (
                                  <div className="inline-flex items-center gap-1">
                                    <input type="number" min={0} max={p.qtyNeeded} value={p.qtyDone} className="w-16 border rounded-md px-2 py-1 text-right"
                                      onChange={(e) => { const v = Math.max(0, Math.min(Number(e.target.value || 0), p.qtyNeeded)); updatePart(p.id, { qtyDone: v }); }} />
                                    <span className="text-gray-400">/ {p.qtyNeeded}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm">{p.qtyDone} / {p.qtyNeeded}</span>
                                )}
                              </td>
                              <td className="p-2 align-middle">
                                {isEditing ? (
                                  <input type="date" className={cls("border rounded-md px-2 py-1", overdue && "border-red-400 bg-red-50")} value={p.dueDate}
                                    onChange={(e) => { const next = e.target.value; const movedBack = new Date(next) < new Date(p.dueDate); if (movedBack) { const reason = prompt("Reason for moving due date earlier?") || "Updated"; updatePart(p.id, { dueDate: next, notes: p.notes ? p.notes + `\nDue moved: ${reason}` : `Due moved: ${reason}` }); } else { updatePart(p.id, { dueDate: next }); } }} />
                                ) : (
                                  <div className="flex flex-col">
                                    <span className={cls("text-sm", overdue && "text-red-600 font-semibold")}>{new Date(p.dueDate).toLocaleDateString()}</span>
                                    {p.scheduledWeek && p.scheduledWeek !== iso(startOfWeek(new Date(p.dueDate))) && (
                                      <span className="text-xs text-blue-600">Scheduled: {new Date(p.scheduledWeek).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="p-2 align-middle">
                                {isEditing ? (
                                  <input className="border rounded-md px-2 py-1 w-24" placeholder="AG" value={p.assignee ?? ""} onChange={(e) => updatePart(p.id, { assignee: e.target.value })} />
                                ) : (
                                  <span className="text-sm">{p.assignee || "—"}</span>
                                )}
                              </td>
                              <td className="p-2 align-middle">
                                {isEditing ? (
                                  <input className="border rounded-md px-2 py-1 w-56" placeholder="Add note…" value={p.notes ?? ""} onChange={(e) => updatePart(p.id, { notes: e.target.value })} />
                                ) : (
                                  <span className="text-sm text-gray-600">{p.notes ? (p.notes.length > 50 ? p.notes.substring(0, 50) + '...' : p.notes) : "—"}</span>
                                )}
                              </td>
                              <td className="p-2 align-middle">
                                <button
                                  className={`px-2 py-1 text-xs rounded ${isEditing ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                  onClick={() => {
                                    const newEditingParts = new Set(editingParts);
                                    if (isEditing) {
                                      newEditingParts.delete(p.id);
                                    } else {
                                      newEditingParts.add(p.id);
                                    }
                                    setEditingParts(newEditingParts);
                                  }}
                                >
                                  {isEditing ? '✓ Save' : '✏️ Edit'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}

                  {organize === "None" && (() => {
                    const rows = applySavedOrder(section.items, "Boat", weekStartISO, "ALL"); // no real grouping, keep natural order
                    return rows.map((p) => {
                      const overdue = new Date(p.dueDate) < new Date() && p.stage !== "Finished";
                      const finished = p.stage === "Finished";
                      const dragging = draggingId === p.id; const over = overId === p.id;
                      const isEditing = editingParts.has(p.id);
                      return (
                        <tr key={p.id}
                          draggable
                          onDragStart={(e) => { setDraggingId(p.id); e.dataTransfer.setData("text/id", p.id); e.dataTransfer.effectAllowed = "move"; }}
                          onDragOver={(e) => { e.preventDefault(); setOverId(p.id); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const src = draggingId || e.dataTransfer.getData("text/id"); if (!src) return;
                            setParts((prev) => reorderWithinGroup(prev, src, p.id, organize, stackWeeks));
                            setDraggingId(null); setOverId(null); setToast("Saved");
                          }}
                          onDragEnd={() => { setDraggingId(null); setOverId(null); }}
                          className={cls("border-b hover:bg-gray-50", dragging && "opacity-60", over && "ring-2 ring-blue-300", finished && "line-through opacity-60")} style={{ borderLeft: `4px solid ${p.boat.colorHex}` }}>
                          <td className="p-2 align-middle">
                            {isEditing ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <input 
                                    className="font-medium border rounded px-2 py-1 min-w-0 flex-1" 
                                    value={p.name} 
                                    onChange={(e) => updatePart(p.id, { name: e.target.value })}
                                    placeholder="Part name"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <select 
                                    className="text-xs border rounded px-2 py-1 text-gray-600"
                                    value={p.boat.id}
                                    onChange={(e) => {
                                      const isBoat40 = e.target.value.includes('40');
                                      const newBoat = {
                                        id: e.target.value,
                                        label: isBoat40 ? `${e.target.value.split('-')[2]} • 40‑ft` : `${e.target.value.split('-')[2]} • 26‑ft`,
                                        length: isBoat40 ? 40 : 26,
                                        colorHex: isBoat40 ? "#0ea5e9" : "#f97316",
                                        shipWeek: "TBD"
                                      };
                                      updatePart(p.id, { boat: newBoat });
                                    }}
                                  >
                                    <option value="B-26-NEW">NEW • 26‑ft</option>
                                    <option value="B-26-37211">37211 • 26‑ft</option>
                                    <option value="B-40-48881">48881 • 40‑ft</option>
                                    <option value="B-26-12345">12345 • 26‑ft</option>
                                    <option value="B-40-67890">67890 • 40‑ft</option>
                                  </select>
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: p.boat.colorHex }}>
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.boat.colorHex }} />
                                    {p.boat.length}‑ft
                                  </span>
                                  <button className="text-xs text-blue-600 hover:text-blue-800" onClick={() => setOpen(p)}>
                                    Details →
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button className="text-left" onClick={() => setOpen(p)}>
                                <div className="font-medium flex items-center gap-2">
                                  <span>{p.name}</span>
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: p.boat.colorHex }}>
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.boat.colorHex }} />
                                    {p.boat.length}‑ft
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">Boat: {p.boat.label}</div>
                              </button>
                            )}
                          </td>
                          <td className="p-2 align-middle">
                            {isEditing ? (
                              <select 
                                className="border rounded px-2 py-1 text-sm"
                                value={p.lamType}
                                onChange={(e) => updatePart(p.id, { lamType: e.target.value as LamType })}
                              >
                                <option value="Skin">Skin</option>
                                <option value="Core">Core</option>
                                <option value="Infusion">Infusion</option>
                                <option value="Hand Layup">Hand Layup</option>
                              </select>
                            ) : (
                              <span className="text-sm">{p.lamType}</span>
                            )}
                          </td>
                          <td className="p-2 align-middle">
                            {isEditing ? (
                              <input 
                                type="text"
                                className="border rounded px-2 py-1 text-sm w-24"
                                value={p.gelcoat}
                                onChange={(e) => updatePart(p.id, { gelcoat: e.target.value })}
                                placeholder="White, Black, etc."
                              />
                            ) : (
                              <span className="text-sm">{p.gelcoat}</span>
                            )}
                          </td>
                          <td className="p-2 align-middle">
                            {isEditing ? (
                              <select className={cls("rounded-md px-2 py-1 border font-medium", STAGE_COLORS[p.stage], finished && "opacity-70")} value={p.stage}
                                onChange={(e) => { const next = e.target.value as Stage; if (next === "Finished" && p.qtyDone < p.qtyNeeded) { setToast("Finish blocked: qty not complete"); return; } updatePart(p.id, { stage: next }); }}>
                                {(["Unscheduled", "Scheduled", "In Mold", "Pulled", "Cutter", "Finished"] as Stage[]).map((s) => (<option key={s} value={s}>{s}</option>))}
                              </select>
                            ) : (
                              <span className={cls("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium", STAGE_COLORS[p.stage])}>{p.stage}</span>
                            )}
                          </td>
                          <td className="p-2 align-middle text-right">
                            {isEditing ? (
                              <div className="inline-flex items-center gap-1">
                                <input type="number" min={0} max={p.qtyNeeded} value={p.qtyDone} className="w-16 border rounded-md px-2 py-1 text-right" onChange={(e) => { const v = Math.max(0, Math.min(Number(e.target.value || 0), p.qtyNeeded)); updatePart(p.id, { qtyDone: v }); }} />
                                <span className="text-gray-400">/ {p.qtyNeeded}</span>
                              </div>
                            ) : (
                              <span className="text-sm">{p.qtyDone} / {p.qtyNeeded}</span>
                            )}
                          </td>
                          <td className="p-2 align-middle">
                            {isEditing ? (
                              <input type="date" className={cls("border rounded-md px-2 py-1", overdue && "border-red-400 bg-red-50")} value={p.dueDate}
                                onChange={(e) => { const next = e.target.value; const movedBack = new Date(next) < new Date(p.dueDate); if (movedBack) { const reason = prompt("Reason for moving due date earlier?") || "Updated"; updatePart(p.id, { dueDate: next, notes: p.notes ? p.notes + `\nDue moved: ${reason}` : `Due moved: ${reason}` }); } else { updatePart(p.id, { dueDate: next }); } }} />
                            ) : (
                              <div className="flex flex-col">
                                <span className={cls("text-sm", overdue && "text-red-600 font-semibold")}>{new Date(p.dueDate).toLocaleDateString()}</span>
                                {p.scheduledWeek && p.scheduledWeek !== iso(startOfWeek(new Date(p.dueDate))) && (
                                  <span className="text-xs text-blue-600">Scheduled: {new Date(p.scheduledWeek).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-2 align-middle">
                            {isEditing ? (
                              <input className="border rounded-md px-2 py-1 w-24" placeholder="AG" value={p.assignee ?? ""} onChange={(e) => updatePart(p.id, { assignee: e.target.value })} />
                            ) : (
                              <span className="text-sm">{p.assignee || "—"}</span>
                            )}
                          </td>
                          <td className="p-2 align-middle">
                            {isEditing ? (
                              <input className="border rounded-md px-2 py-1 w-56" placeholder="Add note…" value={p.notes ?? ""} onChange={(e) => updatePart(p.id, { notes: e.target.value })} />
                            ) : (
                              <span className="text-sm text-gray-600">{p.notes ? (p.notes.length > 50 ? p.notes.substring(0, 50) + '...' : p.notes) : "—"}</span>
                            )}
                          </td>
                          <td className="p-2 align-middle">
                            <button
                              className={`px-2 py-1 text-xs rounded ${isEditing ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                              onClick={() => {
                                const newEditingParts = new Set(editingParts);
                                if (isEditing) {
                                  newEditingParts.delete(p.id);
                                } else {
                                  newEditingParts.add(p.id);
                                }
                                setEditingParts(newEditingParts);
                              }}
                            >
                              {isEditing ? '✓ Save' : '✏️ Edit'}
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}

                  {section.items.length === 0 && (
                    <tr 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedId = draggingId || e.dataTransfer.getData("text/id");
                        if (!draggedId) return;
                        
                        const targetWeekStart = iso(section.range.start); // range.start is already the Monday
                        setParts((prev) => {
                          const updated = movePartToWeek(prev, draggedId, targetWeekStart);
                          return updated;
                        });
                        setDraggingId(null);
                        setOverId(null);
                        const weekLabel = `Week of ${section.range.start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
                        setToast("Part moved to " + weekLabel);
                      }}
                    >
                      <td colSpan={COL_COUNT} className="p-8 text-center text-gray-500 border-2 border-dashed border-transparent hover:border-blue-300 transition-colors">
                        Drop parts here or no parts scheduled this week.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Drawer + Toast + New Part Form */}
      <Drawer part={open} onClose={() => setOpen(null)} />
      <NewPartForm 
        isOpen={showNewPartForm}
        onClose={() => setShowNewPartForm(false)}
        onSubmit={addNewPart}
      />
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
