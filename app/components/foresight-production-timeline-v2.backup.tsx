'use client';
import React, { useState, useEffect } from 'react';

// Simple color generator for boat names
function colorForBoat(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return `hsl(${h % 360} 85% 55%)`;
}

// Role state and RBAC
const ROLES = ['admin','plant_manager','floor_manager','employee','stockroom'] as const;
type Role = typeof ROLES[number];

// Types for schedule data
interface ScheduledRow {
  week_start: string;
  dept: string;
  boat_id: string;
  model?: '40' | '26';
}

interface ActualRow {
  start_week: string;
  dept: string;
  boat_id: string;
  run_weeks: number;
  model?: '40' | '26';
}

interface ScheduleData {
  scheduled: ScheduledRow[];
  actual: ActualRow[];
}

// Generate week dates
function generateWeeks(): string[] {
  const weeks = [];
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  
  for (let i = 0; i < 26; i++) {
    const weekStart = new Date(monday);
    weekStart.setDate(monday.getDate() + i * 7);
    weeks.push(weekStart.toISOString().split('T')[0]);
  }
  return weeks;
}

// Department configuration
const DEPTS = ['lamination', 'assembly', 'finishing', 'rigging', 'qc'] as const;
const DEPT_LABELS = {
  lamination: 'Lamination',
  assembly: 'Assembly', 
  finishing: 'Finishing',
  rigging: 'Rigging',
  qc: 'QC'
};

// Format week for display
function formatWeek(isoDate: string): string {
  const date = new Date(isoDate);
  const endDate = new Date(date);
  endDate.setDate(date.getDate() + 4);
  
  const format = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${format(date)}-${format(endDate)}`;
}

// Add Boat Modal
function AddBoatModal({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: (boat: ScheduledRow) => void; 
}) {
  const [formData, setFormData] = useState({
    boat_id: '',
    dept: 'lamination',
    week_start: '',
    model: '40' as '40' | '26'
  });

  const weeks = generateWeeks();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.boat_id && formData.dept && formData.week_start) {
      onAdd(formData);
      setFormData({ boat_id: '', dept: 'lamination', week_start: '', model: '40' });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
        <h2 className="text-lg font-semibold mb-4">Add Boat to Schedule</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Boat ID</label>
            <input
              type="text"
              value={formData.boat_id}
              onChange={(e) => setFormData({ ...formData, boat_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g., 40-22"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <select
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value as '40' | '26' })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="40">40 Footer</option>
              <option value="26">26 Footer</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <select
              value={formData.dept}
              onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              {DEPTS.map(dept => (
                <option key={dept} value={dept}>{DEPT_LABELS[dept]}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Week</label>
            <select
              value={formData.week_start}
              onChange={(e) => setFormData({ ...formData, week_start: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value="">Select Week</option>
              {weeks.slice(0, 10).map(week => (
                <option key={week} value={week}>{formatWeek(week)}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Boat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Boat chip component
function BoatChip({ 
  boat_id, 
  color, 
  onClick 
}: { 
  boat_id: string; 
  color: string; 
  onClick: () => void; 
}) {
  return (
    <div
      className="px-2 py-1 rounded text-white text-xs font-medium cursor-pointer hover:opacity-80"
      style={{ backgroundColor: color }}
      onClick={onClick}
    >
      {boat_id}
    </div>
  );
}

export default function ProductionTimelineV2() {
  const [schedule, setSchedule] = useState<ScheduleData>({ scheduled: [], actual: [] });
  const [weeks, setWeeks] = useState<string[]>([]);
  const [showAddBoatModal, setShowAddBoatModal] = useState(false);
  
  const [role, setRole] = useState<Role>(() => {
    if (typeof window === 'undefined') return 'employee';
    const saved = localStorage.getItem('foresight_role');
    return (ROLES as readonly string[]).includes(saved || '') ? (saved as Role) : 'employee';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('foresight_role', role);
  }, [role]);

  function canEditTimeline(): boolean {
    return role === 'admin' || role === 'plant_manager' || role === 'floor_manager';
  }
  
  const canEdit = canEditTimeline();

  // Create week index for grid positioning
  const weekIndex = React.useMemo(() => {
    const m = new Map<string, number>();
    weeks.forEach((w, i) => m.set(w, i));
    return m;
  }, [weeks]);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fs_inapp_schedule_v1');
      if (saved) {
        const data = JSON.parse(saved);
        setSchedule(data);
      }
    } catch (error) {
      console.error('Failed to load schedule from localStorage:', error);
    }
    
    setWeeks(generateWeeks());
  }, []);

  // Save data to localStorage whenever schedule changes
  useEffect(() => {
    try {
      localStorage.setItem('fs_inapp_schedule_v1', JSON.stringify(schedule));
    } catch (error) {
      console.error('Failed to save schedule to localStorage:', error);
    }
  }, [schedule]);

  // Add boat to schedule
  const addBoat = (boat: ScheduledRow) => {
    // Add to scheduled
    setSchedule(prev => ({
      ...prev,
      scheduled: [...prev.scheduled, boat]
    }));
    
    // Also create actual runs for the full production flow
    const startDate = new Date(boat.week_start);
    const deptSchedule = [
      { dept: 'lamination', weeks: 3 },
      { dept: 'assembly', weeks: 3 },
      { dept: 'finishing', weeks: 3 },
      { dept: 'rigging', weeks: 3 },
      { dept: 'qc', weeks: 1 }
    ];
    
    let currentWeek = new Date(startDate);
    const actualRuns: ActualRow[] = [];
    
    for (const { dept, weeks } of deptSchedule) {
      actualRuns.push({
        start_week: currentWeek.toISOString().split('T')[0],
        dept,
        boat_id: boat.boat_id,
        run_weeks: weeks,
        model: boat.model
      });
      currentWeek.setDate(currentWeek.getDate() + weeks * 7);
    }
    
    setSchedule(prev => ({
      ...prev,
      actual: [...prev.actual, ...actualRuns]
    }));
  };

  // Remove boat from schedule
  const removeBoat = (index: number) => {
    setSchedule(prev => ({
      ...prev,
      scheduled: prev.scheduled.filter((_, i) => i !== index)
    }));
  };

  // Get boats for a specific week and department
  const getBoatsForWeek = (dept: string, week: string, type: 'scheduled' | 'actual') => {
    const boats = schedule[type].filter(
      boat => boat.dept === dept && 
      (type === 'scheduled' ? 
        boat.week_start === week : 
        // For actual, check if week falls within the run
        (() => {
          const startDate = new Date(boat.start_week);
          const weekDate = new Date(week);
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + ((boat as ActualRow).run_weeks - 1) * 7);
          return weekDate >= startDate && weekDate <= endDate;
        })()
      )
    );
    return boats;
  };

  // Group boats by model for display
  const groupBoatsByModel = (boats: (ScheduledRow | ActualRow)[], modelType: '40' | '26') => {
    return boats.filter(boat => boat.model === modelType);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Production Timeline</h1>
            <p className="text-gray-600">In-app schedule management</p>
          </div>
        </div>
        
        <div className="mb-3 flex items-center gap-3">
          {canEdit && (
            <button
              onClick={() => setShowAddBoatModal(true)}
              className="px-3 py-1.5 rounded bg-black text-white hover:opacity-90"
            >
              Add Boat
            </button>
          )}
          <label className="text-sm flex items-center gap-2">
            Role:
            <select
              className="border rounded px-2 py-1"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Model 40 Block */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4 bg-blue-100 px-3 py-2 rounded">40 Footer Models</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white border-r border-gray-300 px-3 py-2 text-left font-medium w-40">
                  Department
                </th>
                {weeks.slice(0, 20).map(week => (
                  <th key={week} className="border-r border-gray-300 px-3 py-2 text-center font-medium min-w-[120px]">
                    {formatWeek(week)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEPTS.map(dept => (
                <React.Fragment key={dept}>
                  {/* Scheduled Row */}
                  <tr className="border-t border-gray-300">
                    <td className="sticky left-0 bg-gray-50 border-r border-gray-300 px-3 py-2 font-medium">
                      {DEPT_LABELS[dept]} - Scheduled
                    </td>
                    {weeks.slice(0, 20).map(week => {
                      const boats = groupBoatsByModel(getBoatsForWeek(dept, week, 'scheduled'), '40');
                      return (
                        <td key={week} className="border-r border-gray-300 px-2 py-2 h-16 align-top">
                          <div className="flex flex-wrap gap-1">
                            {boats.map((boat, idx) => (
                              <BoatChip
                                key={`${boat.boat_id}-${idx}`}
                                boat_id={boat.boat_id}
                                color={colorForBoat(boat.boat_id)}
                                onClick={() => {}}
                              />
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  
                  {/* Actual Row */}
                  <tr className="border-t border-gray-200">
                    <td className="sticky left-0 bg-white border-r border-gray-300 px-3 py-2 font-medium">
                      {DEPT_LABELS[dept]} - Actual
                    </td>
                    <td className="p-0 border-r border-gray-300" colSpan={20}>
                      <div
                        className="relative grid gap-1 p-1"
                        style={{ 
                          gridTemplateColumns: `repeat(20, minmax(120px, 1fr))`, 
                          gridAutoRows: '32px',
                          minHeight: '48px'
                        }}
                      >
                        {schedule.actual
                          .filter(r => r.model === '40' && r.dept === dept)
                          .map((r, i) => {
                            const startCol = (weekIndex.get(r.start_week) ?? -1) + 1;
                            if (startCol <= 0) return null;
                            const span = Math.max(1, Math.min(r.run_weeks, 20 - (startCol - 1)));
                            return (
                              <div
                                key={`${r.boat_id}-${i}`}
                                className="text-xs flex items-center px-2 rounded border overflow-hidden cursor-pointer hover:opacity-80"
                                style={{
                                  gridColumn: `${startCol} / span ${span}`,
                                  borderColor: colorForBoat(r.boat_id),
                                  backgroundColor: colorForBoat(r.boat_id),
                                  color: 'white',
                                  height: '30px',
                                  whiteSpace: 'nowrap'
                                }}
                                title={`${r.boat_id} — ${r.dept} (${r.run_weeks}w)`}
                                onClick={() => {}}
                              >
                                {r.boat_id}
                              </div>
                            );
                          })}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model 26 Block */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4 bg-green-100 px-3 py-2 rounded">26 Footer Models</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white border-r border-gray-300 px-3 py-2 text-left font-medium w-40">
                  Department
                </th>
                {weeks.slice(0, 20).map(week => (
                  <th key={week} className="border-r border-gray-300 px-3 py-2 text-center font-medium min-w-[120px]">
                    {formatWeek(week)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEPTS.map(dept => (
                <React.Fragment key={dept}>
                  {/* Scheduled Row */}
                  <tr className="border-t border-gray-300">
                    <td className="sticky left-0 bg-gray-50 border-r border-gray-300 px-3 py-2 font-medium">
                      {DEPT_LABELS[dept]} - Scheduled
                    </td>
                    {weeks.slice(0, 20).map(week => {
                      const boats = groupBoatsByModel(getBoatsForWeek(dept, week, 'scheduled'), '26');
                      return (
                        <td key={week} className="border-r border-gray-300 px-2 py-2 h-16 align-top">
                          <div className="flex flex-wrap gap-1">
                            {boats.map((boat, idx) => (
                              <BoatChip
                                key={`${boat.boat_id}-${idx}`}
                                boat_id={boat.boat_id}
                                color={colorForBoat(boat.boat_id)}
                                onClick={() => {}}
                              />
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  
                  {/* Actual Row */}
                  <tr className="border-t border-gray-200">
                    <td className="sticky left-0 bg-white border-r border-gray-300 px-3 py-2 font-medium">
                      {DEPT_LABELS[dept]} - Actual
                    </td>
                    <td className="p-0 border-r border-gray-300" colSpan={20}>
                      <div
                        className="relative grid gap-1 p-1"
                        style={{ 
                          gridTemplateColumns: `repeat(20, minmax(120px, 1fr))`, 
                          gridAutoRows: '32px',
                          minHeight: '48px'
                        }}
                      >
                        {schedule.actual
                          .filter(r => r.model === '26' && r.dept === dept)
                          .map((r, i) => {
                            const startCol = (weekIndex.get(r.start_week) ?? -1) + 1;
                            if (startCol <= 0) return null;
                            const span = Math.max(1, Math.min(r.run_weeks, 20 - (startCol - 1)));
                            return (
                              <div
                                key={`${r.boat_id}-${i}`}
                                className="text-xs flex items-center px-2 rounded border overflow-hidden cursor-pointer hover:opacity-80"
                                style={{
                                  gridColumn: `${startCol} / span ${span}`,
                                  borderColor: colorForBoat(r.boat_id),
                                  backgroundColor: colorForBoat(r.boat_id),
                                  color: 'white',
                                  height: '30px',
                                  whiteSpace: 'nowrap'
                                }}
                                title={`${r.boat_id} — ${r.dept} (${r.run_weeks}w)`}
                                onClick={() => {}}
                              >
                                {r.boat_id}
                              </div>
                            );
                          })}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddBoatModal
        isOpen={showAddBoatModal}
        onClose={() => setShowAddBoatModal(false)}
        onAdd={addBoat}
      />
    </div>
  );
}