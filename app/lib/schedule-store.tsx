"use client";
import { createContext, useCallback, useContext, useMemo, useReducer } from "react";

export type DeptKey = "lamination" | "finishing" | "rigging" | "assembly";
export type CanonicalStatus = "not_started" | "in_progress" | "done" | "complete" | "finished" | "shipped" | string;

export type ScheduleTask = {
  id: string;
  boatId: string;
  department: DeptKey;
  title: string;
  status: CanonicalStatus;
  week: number;        // ISO week or your current integer week
  position: number;    // order within week for that dept
  meta?: Record<string, any>;
};

export type ScheduleBar = {
  id: string;
  boat: string;
  model: '26' | '40';
  dept: 'LAM' | 'ASM' | 'FIN' | 'RIG';
  start: string;  // ISO date string
  duration: number; // in weeks
  note?: string;
  weekNotes?: Record<string, string>; // weekIso -> note content
};

type State = {
  byId: Record<string, ScheduleTask>;
  bars: ScheduleBar[];
};

type Action =
  | { type: "BOOTSTRAP"; tasks: ScheduleTask[] }
  | { type: "MOVE"; ids: string[]; week: number }
  | { type: "REORDER"; dept: DeptKey; week: number; orderedIds: string[] }
  | { type: "TOGGLE"; id: string; done: boolean }
  | { type: "ADD_BARS"; bars: ScheduleBar[] }
  | { type: "SET_BARS"; bars: ScheduleBar[] }
  | { type: "UPDATE_BAR"; id: string; updates: Partial<ScheduleBar> }
  | { type: "UPDATE_WEEK_NOTE"; barId: string; weekIso: string; note: string }
  | { type: "ADD_WEEK"; barId: string; afterWeek: number }
  | { type: "SPLIT_BAR"; barId: string; splits: number[] }
  | { type: "MERGE_BAR"; barIds: string[] };

function isDone(status?: CanonicalStatus | null): boolean {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return s === "done" || s === "complete" || s === "finished" || s === "shipped";
}

function toCanonical(done: boolean): CanonicalStatus {
  return done ? "done" : "not_started";
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "BOOTSTRAP": {
      // idempotent merge; existing wins
      const byId = { ...state.byId };
      for (const t of action.tasks) {
        if (!byId[t.id]) byId[t.id] = t;
      }
      return { ...state, byId };
    }
    case "MOVE": {
      const byId = { ...state.byId };
      for (const id of action.ids) {
        const t = byId[id];
        if (!t) continue;
        byId[id] = { ...t, week: action.week };
      }
      return { ...state, byId };
    }
    case "REORDER": {
      // position is re-assigned based on orderedIds
      const byId = { ...state.byId };
      action.orderedIds.forEach((id, idx) => {
        const t = byId[id];
        if (!t) return;
        if (t.department !== action.dept || t.week !== action.week) return;
        byId[id] = { ...t, position: idx };
      });
      return { ...state, byId };
    }
    case "TOGGLE": {
      const byId = { ...state.byId };
      const t = byId[action.id];
      if (!t) return state;
      byId[action.id] = { ...t, status: toCanonical(action.done) };
      return { ...state, byId };
    }
    case "ADD_BARS": {
      return { ...state, bars: [...state.bars, ...action.bars] };
    }
    case "SET_BARS": {
      return { ...state, bars: action.bars };
    }
    case "UPDATE_BAR": {
      const bars = state.bars.map(bar => 
        bar.id === action.id ? { ...bar, ...action.updates } : bar
      );
      return { ...state, bars };
    }
    case "UPDATE_WEEK_NOTE": {
      const bars = state.bars.map(bar => {
        if (bar.id === action.barId) {
          const weekNotes = { ...bar.weekNotes };
          if (action.note.trim().length > 0) {
            weekNotes[action.weekIso] = action.note;
          } else {
            delete weekNotes[action.weekIso];
          }
          return { ...bar, weekNotes };
        }
        return bar;
      });
      return { ...state, bars };
    }
    case "ADD_WEEK": {
      // Add a week to a bar's duration and shift later bars
      const bars = state.bars.map(bar => {
        if (bar.id === action.barId) {
          return { ...bar, duration: bar.duration + 1 };
        }
        // Shift bars in same dept that start after this bar
        const targetBar = state.bars.find(b => b.id === action.barId);
        if (targetBar && bar.dept === targetBar.dept && bar.start > targetBar.start) {
          const newStart = new Date(bar.start);
          newStart.setDate(newStart.getDate() + 7);
          return { ...bar, start: newStart.toISOString().split('T')[0] };
        }
        return bar;
      });
      return { ...state, bars };
    }
    case "SPLIT_BAR": {
      const targetBar = state.bars.find(b => b.id === action.barId);
      if (!targetBar) return state;
      
      const bars = state.bars.filter(b => b.id !== action.barId);
      let currentStart = targetBar.start;
      
      action.splits.forEach((weeks, index) => {
        bars.push({
          ...targetBar,
          id: `${targetBar.id}-split-${index}`,
          start: currentStart,
          duration: weeks
        });
        const nextStart = new Date(currentStart);
        nextStart.setDate(nextStart.getDate() + weeks * 7);
        currentStart = nextStart.toISOString().split('T')[0];
      });
      
      return { ...state, bars };
    }
    case "MERGE_BAR": {
      if (action.barIds.length < 2) return state;
      
      const barsToMerge = state.bars.filter(b => action.barIds.includes(b.id));
      if (barsToMerge.length !== action.barIds.length) return state;
      
      const firstBar = barsToMerge.reduce((earliest, bar) => 
        bar.start < earliest.start ? bar : earliest
      );
      
      const totalDuration = barsToMerge.reduce((sum, bar) => sum + bar.duration, 0);
      
      const bars = state.bars.filter(b => !action.barIds.includes(b.id));
      bars.push({
        ...firstBar,
        id: firstBar.id.replace(/-split-\d+$/, ''),
        duration: totalDuration
      });
      
      return { ...state, bars };
    }
    default:
      return state;
  }
}

const ScheduleCtx = createContext<{
  state: State;
  bootstrap: (tasks: ScheduleTask[]) => void;
  moveTasks: (ids: string[], week: number) => void;
  reorder: (dept: DeptKey, week: number, orderedIds: string[]) => void;
  toggleDone: (id: string, done: boolean) => void;
  addBars: (bars: ScheduleBar[]) => void;
  setBars: (bars: ScheduleBar[]) => void;
  updateBar: (id: string, updates: Partial<ScheduleBar>) => void;
  updateWeekNote: (barId: string, weekIso: string, note: string) => void;
  addWeek: (barId: string, afterWeek: number) => void;
  splitBar: (barId: string, splits: number[]) => void;
  mergeBar: (barIds: string[]) => void;
} | null>(null);

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { byId: {}, bars: [] });

  const bootstrap = useCallback((tasks: ScheduleTask[]) => {
    if (!tasks?.length) return;
    dispatch({ type: "BOOTSTRAP", tasks });
  }, []);

  const moveTasks = useCallback((ids: string[], week: number) => {
    if (!ids?.length) return;
    dispatch({ type: "MOVE", ids, week });
  }, []);

  const reorder = useCallback((dept: DeptKey, week: number, orderedIds: string[]) => {
    dispatch({ type: "REORDER", dept, week, orderedIds });
  }, []);

  const toggleDone = useCallback((id: string, done: boolean) => {
    dispatch({ type: "TOGGLE", id, done });
  }, []);

  const addBars = useCallback((bars: ScheduleBar[]) => {
    if (!bars?.length) return;
    dispatch({ type: "ADD_BARS", bars });
  }, []);

  const setBars = useCallback((bars: ScheduleBar[]) => {
    dispatch({ type: "SET_BARS", bars });
  }, []);

  const updateBar = useCallback((id: string, updates: Partial<ScheduleBar>) => {
    dispatch({ type: "UPDATE_BAR", id, updates });
  }, []);

  const updateWeekNote = useCallback((barId: string, weekIso: string, note: string) => {
    dispatch({ type: "UPDATE_WEEK_NOTE", barId, weekIso, note });
  }, []);

  const addWeek = useCallback((barId: string, afterWeek: number) => {
    dispatch({ type: "ADD_WEEK", barId, afterWeek });
  }, []);

  const splitBar = useCallback((barId: string, splits: number[]) => {
    dispatch({ type: "SPLIT_BAR", barId, splits });
  }, []);

  const mergeBar = useCallback((barIds: string[]) => {
    dispatch({ type: "MERGE_BAR", barIds });
  }, []);

  const value = useMemo(() => ({ 
    state, bootstrap, moveTasks, reorder, toggleDone,
    addBars, setBars, updateBar, updateWeekNote, addWeek, splitBar, mergeBar 
  }), [state, bootstrap, moveTasks, reorder, toggleDone, addBars, setBars, updateBar, updateWeekNote, addWeek, splitBar, mergeBar]);
  return <ScheduleCtx.Provider value={value}>{children}</ScheduleCtx.Provider>;
}

export function useScheduleStore() {
  const ctx = useContext(ScheduleCtx);
  if (!ctx) throw new Error("useScheduleStore must be used within ScheduleProvider");
  return ctx;
}

export function useTasksByWeek(week: number) {
  const { state } = useScheduleStore();
  return useMemo(() => {
    return Object.values(state.byId)
      .filter(t => t.week === week)
      .sort((a, b) => a.department.localeCompare(b.department) || a.position - b.position);
  }, [state.byId, week]);
}

export function useTasksByDept(department: DeptKey) {
  const { state } = useScheduleStore();
  return useMemo(() => {
    return Object.values(state.byId)
      .filter(t => t.department === department)
      .sort((a, b) => a.week - b.week || a.position - b.position);
  }, [state.byId, department]);
}

export function useTask(id: string) {
  const { state } = useScheduleStore();
  return state.byId[id] ?? null;
}

export function useAllBars() {
  const { state } = useScheduleStore();
  return state.bars;
}

export function useBarsByDept(dept: 'LAM' | 'ASM' | 'FIN' | 'RIG') {
  const { state } = useScheduleStore();
  return useMemo(() => {
    return state.bars.filter(bar => bar.dept === dept);
  }, [state.bars, dept]);
}

// exporting helpers so pages can reuse consistent mapping if needed
export const scheduleHelpers = { isDone, toCanonical };