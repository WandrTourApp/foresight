'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from './role-context';
import { store } from './store';
import { useScheduleStore, ScheduleTask, DeptKey } from '../lib/schedule-store';

// Utility to check if gelcoat color should show alerts
const isGelcoatAlertColor = (color: string): boolean => {
  const noAlertColors = ['Matterhorn White', 'Dresdin Blue'];
  return !noAlertColors.includes(color);
};

interface BoatBlock {
  id: string;
  customer: string;
  model: string;
  weeks: string[];
  department: 'lamination' | 'assembly' | 'rigging' | 'finishing';
  tasks: Task[];
  gelcoat_color?: string;
  color_freeze_by?: string;
  gelcoat_ready?: boolean;
  vendor_late?: boolean;
  reopened?: boolean;
  color: {
    bg: string;
    light: string;
    text: string;
    border: string;
  };
}

interface Task {
  id: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'done';
  assignee?: string;
  notes?: string;
}

export default function ForesightInteractiveGantt() {
  const { role, can } = useRole();
  const router = useRouter();
  const { state, bootstrap, moveTasks } = useScheduleStore();
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [undoData, setUndoData] = useState<{taskIds: string[], fromWeek: number, toWeek: number} | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [selectedModal, setSelectedModal] = useState<ScheduleTask | null>(null);

  // Boat color assignments - consistent with existing timeline
  const boatColors = {
    'Sheffield': { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    'Songy': { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    'Goldman': { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    'Magrisso': { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    'Johnson Marine': { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' }
  };

  // Generate week columns (next 12 weeks)
  const generateWeekColumns = () => {
    const weeks = [];
    const now = new Date();
    for (let i = 1; i <= 12; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + (i * 7));
      const month = weekStart.getMonth() + 1;
      const day = weekStart.getDate();
      weeks.push({ weekNumber: i, label: `${month}/${day}` });
    }
    return weeks;
  };

  const weekColumns = generateWeekColumns();

  // Bootstrap schedule store with mock tasks on component mount
  useEffect(() => {
    const mockTasks: ScheduleTask[] = [
      // Johnson Marine 26' - Lamination weeks 1-3
      { id: 'johnson-lam-1', boatId: 'boat-1', department: 'lamination', title: 'Johnson Marine 26\'', status: 'in_progress', week: 1, position: 0, meta: { customer: 'Johnson Marine', model: '26', gelcoat_color: 'Matterhorn White', gelcoat_ready: true } },
      { id: 'johnson-lam-2', boatId: 'boat-1', department: 'lamination', title: 'Johnson Marine 26\'', status: 'not_started', week: 2, position: 0, meta: { customer: 'Johnson Marine', model: '26', gelcoat_color: 'Matterhorn White', gelcoat_ready: true } },
      { id: 'johnson-lam-3', boatId: 'boat-1', department: 'lamination', title: 'Johnson Marine 26\'', status: 'not_started', week: 3, position: 0, meta: { customer: 'Johnson Marine', model: '26', gelcoat_color: 'Matterhorn White', gelcoat_ready: true } },
      
      // Sheffield 40' - Assembly weeks 3-5
      { id: 'sheffield-asm-3', boatId: 'boat-2', department: 'assembly', title: 'Sheffield 40\'', status: 'not_started', week: 3, position: 1, meta: { customer: 'Sheffield', model: '40', gelcoat_ready: false, vendor_late: true } },
      { id: 'sheffield-asm-4', boatId: 'boat-2', department: 'assembly', title: 'Sheffield 40\'', status: 'not_started', week: 4, position: 0, meta: { customer: 'Sheffield', model: '40', gelcoat_ready: false, vendor_late: true } },
      { id: 'sheffield-asm-5', boatId: 'boat-2', department: 'assembly', title: 'Sheffield 40\'', status: 'not_started', week: 5, position: 0, meta: { customer: 'Sheffield', model: '40', gelcoat_ready: false, vendor_late: true } },
      
      // Goldman 26' - Rigging weeks 5-6
      { id: 'goldman-rig-5', boatId: 'boat-3', department: 'rigging', title: 'Goldman 26\'', status: 'in_progress', week: 5, position: 1, meta: { customer: 'Goldman', model: '26', gelcoat_color: 'Ice Blue', reopened: true } },
      { id: 'goldman-rig-6', boatId: 'boat-3', department: 'rigging', title: 'Goldman 26\'', status: 'not_started', week: 6, position: 0, meta: { customer: 'Goldman', model: '26', gelcoat_color: 'Ice Blue', reopened: true } }
    ];
    
    bootstrap(mockTasks);
  }, [bootstrap]);

  const departments = [
    { id: 'lamination', name: 'Lamination', color: 'bg-blue-50 border-blue-200' },
    { id: 'finishing', name: 'Finishing', color: 'bg-orange-50 border-orange-200' },
    { id: 'rigging', name: 'Rigging', color: 'bg-purple-50 border-purple-200' },
    { id: 'assembly', name: 'Assembly', color: 'bg-green-50 border-green-200' }
  ];

  const handleBlockClick = (taskKey: string) => {
    // Extract task info from the key format: "{dept}-{taskId}-{week}"
    const [dept, ...rest] = taskKey.split('-');
    const week = parseInt(rest.pop() || '0');
    const taskId = rest.join('-');
    
    const task = state.byId[taskId];
    if (task) {
      // Add additional properties for modal display
      const taskWithExtras = {
        ...task,
        customer: task.meta?.customer || 'Unknown',
        model: task.meta?.model || '',
        department: dept,
        week: week
      };
      setSelectedModal(taskWithExtras);
    }
  };

  // Note: Task status changes would be handled by Schedule Store's toggleDone
  // This function is kept for potential future use but not currently connected
  const handleTaskStatusChange = (taskId: string, newStatus: string) => {
    // Would use toggleDone from useScheduleStore if implementing task status changes
    console.log('Task status change:', taskId, newStatus);
  };

  const handleTaskSelect = (e: React.MouseEvent, taskKey: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setIsMultiSelectMode(true);
      setSelectedBlocks(prev => {
        const newSet = new Set(prev);
        if (newSet.has(taskKey)) {
          newSet.delete(taskKey);
        } else {
          newSet.add(taskKey);
        }
        return newSet;
      });
    } else if (!isMultiSelectMode) {
      // Plain click - open modal immediately
      handleBlockClick(taskKey);
    }
  };

  const handleTaskMouseDown = (e: React.MouseEvent, task: ScheduleTask, week: number) => {
    if (e.ctrlKey || e.metaKey) return; // Let ctrl+click handle selection
    
    const taskKey = `${task.department}-${task.id}-${week}`;
    
    // Clear any existing timer
    if (clickTimer) {
      clearTimeout(clickTimer);
      setClickTimer(null);
    }
    
    // Set timer for click & hold detection
    const timer = setTimeout(() => {
      // This is a drag start - prepare for drag
      setClickTimer(null);
    }, 180);
    
    setClickTimer(timer);
  };

  const handleTaskMouseUp = (e: React.MouseEvent, task: ScheduleTask, week: number) => {
    if (clickTimer) {
      // Short click - open modal
      clearTimeout(clickTimer);
      setClickTimer(null);
      const taskKey = `${task.department}-${task.id}-${week}`;
      handleTaskSelect(e, taskKey);
    }
  };

  const clearSelection = () => {
    setSelectedBlocks(new Set());
    setIsMultiSelectMode(false);
  };

  const handleDragStart = (e: React.DragEvent, task: ScheduleTask, specificWeek: number) => {
    if (!can('manage_schedule')) {
      e.preventDefault();
      return;
    }
    
    const taskKey = `${task.department}-${task.id}-${specificWeek}`;
    let tasksToMove: string[] = [];
    
    if (selectedBlocks.has(taskKey) && selectedBlocks.size > 1) {
      // Multi-select drag - extract task IDs from selected blocks
      tasksToMove = Array.from(selectedBlocks).map(key => {
        const parts = key.split('-');
        return parts.slice(1, -1).join('-'); // Remove dept and week, keep task ID
      });
    } else {
      // Single task drag
      tasksToMove = [task.id];
      clearSelection();
    }
    
    e.dataTransfer.setData("text/plain", JSON.stringify({
      taskIds: tasksToMove,
      isMultiSelect: tasksToMove.length > 1
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetWeek: number, targetDept: DeptKey) => {
    e.preventDefault();
    if (!can('manage_schedule')) return;

    const dragData = e.dataTransfer.getData("text/plain");
    if (!dragData) return;

    const { taskIds } = JSON.parse(dragData);
    
    // Get original week for undo
    const firstTaskId = taskIds[0];
    const firstTask = state.byId[firstTaskId];
    const originalWeek = firstTask?.week || 0;
    
    // Use the schedule store to move tasks to the target week
    moveTasks(taskIds, targetWeek);
    
    // Show undo toast
    setUndoData({
      taskIds,
      fromWeek: originalWeek,
      toWeek: targetWeek
    });
    setShowUndo(true);
    
    // Hide undo after 5 seconds
    setTimeout(() => {
      setShowUndo(false);
      setUndoData(null);
    }, 5000);
    
    // Clear selection after drop
    clearSelection();
    
    // Clear selection after move
    clearSelection();
  };

  const shiftSelectedTasks = (direction: 1 | -1) => {
    if (selectedBlocks.size === 0) return;
    
    const taskIds: string[] = [];
    selectedBlocks.forEach(blockKey => {
      const parts = blockKey.split('-');
      const taskId = parts.slice(1, -1).join('-'); // Remove dept and week
      taskIds.push(taskId);
    });
    
    // Get current weeks and shift them
    taskIds.forEach(taskId => {
      const task = state.byId[taskId];
      if (task) {
        const newWeek = Math.max(1, task.week + direction); // Don't go below week 1
        moveTasks([taskId], newWeek);
      }
    });
  };

  const handleUndo = () => {
    if (!undoData) return;
    
    // Move tasks back to original week
    moveTasks(undoData.taskIds, undoData.fromWeek);
    
    // Clear undo state
    setUndoData(null);
    setShowUndo(false);
  };

  const closeModal = () => {
    setSelectedModal(null);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done': 
      case 'complete':
      case 'finished':
      case 'shipped':
        return 'bg-green-100 text-green-800';
      case 'in_progress': 
        return 'bg-yellow-100 text-yellow-800';
      case 'not_started':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done':
      case 'complete':
      case 'finished':
      case 'shipped':
        return '✓';
      case 'in_progress': 
        return '⏳';
      case 'not_started':
      default:
        return '○';
    }
  };

  const getTasksForDeptWeek = (deptId: DeptKey, weekNumber: number) => {
    return Object.values(state.byId).filter(task => 
      task.department === deptId && task.week === weekNumber
    ).sort((a, b) => a.position - b.position);
  };

  const getChips = (task: ScheduleTask) => {
    const chips = [];
    const meta = task.meta || {};
    
    if (meta.gelcoat_ready === false) {
      chips.push(
        <span 
          key="gelcoat" 
          className="w-6 h-6 border-2 border-red-500 rounded-full flex items-center justify-center text-red-500 cursor-help" 
          title="Gelcoat Needed"
        >
          🎨
        </span>
      );
    }
    
    if (meta.vendor_late) {
      chips.push(
        <span 
          key="vendor" 
          className="w-6 h-6 border-2 border-orange-500 rounded-full flex items-center justify-center text-orange-500 cursor-help" 
          title="Vendor Late"
        >
          ⚠️
        </span>
      );
    }
    
    if (meta.reopened) {
      chips.push(
        <span 
          key="reopen" 
          className="w-6 h-6 border-2 border-yellow-500 rounded-full flex items-center justify-center text-yellow-500 cursor-help" 
          title="Reopened"
        >
          🔄
        </span>
      );
    }
    
    if (!meta.gelcoat_color && task.department === 'lamination') {
      chips.push(
        <span 
          key="color" 
          className="w-6 h-6 border-2 border-purple-500 rounded-full flex items-center justify-center text-purple-500 cursor-help" 
          title="Color Missing"
        >
          🎨
        </span>
      );
    }

    // Only show gelcoat alert for non-standard colors
    if (meta.gelcoat_color && isGelcoatAlertColor(meta.gelcoat_color)) {
      chips.push(
        <span 
          key="gelcoat-alert" 
          className="w-6 h-6 border-2 border-blue-500 rounded-full flex items-center justify-center text-blue-500 cursor-help" 
          title="Gelcoat Alert"
        >
          ⏰
        </span>
      );
    }
    
    return chips;
  };

  const canDrag = can('manage_schedule');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Production Schedule</h1>
          <div className="flex items-center space-x-4">
            {selectedBlocks.size > 0 && (
              <div className="flex items-center space-x-2">
                <div className="text-sm text-blue-600 font-medium">
                  {selectedBlocks.size} block{selectedBlocks.size !== 1 ? 's' : ''} selected
                </div>
                <button
                  onClick={() => shiftSelectedTasks(-1)}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  title="Shift selected tasks -1 week"
                >
                  ← Week
                </button>
                <button
                  onClick={() => shiftSelectedTasks(1)}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  title="Shift selected tasks +1 week"
                >
                  Week →
                </button>
                <button 
                  onClick={clearSelection}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Clear
                </button>
              </div>
            )}
            <div className="text-sm text-gray-600">
              {canDrag ? 'Drag blocks to reschedule • Ctrl+Click for multi-select' : 'Read-only view'}
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <div className="min-w-full">
            {/* Header with week columns */}
            <div className="flex border-b border-gray-200">
              <div className="w-40 p-4 bg-gray-50 font-semibold text-gray-800 border-r border-gray-200">
                Department
              </div>
              {weekColumns.map(week => (
                <div key={week.weekNumber} className="flex-1 min-w-32 p-2 bg-gray-50 text-center text-sm font-medium text-gray-600 border-r border-gray-200">
                  Week {week.label}
                </div>
              ))}
            </div>

            {/* Department rows */}
            {departments.map(dept => (
              <div key={dept.id} className="border-b border-gray-100">
                <div className="flex">
                  {/* Department label */}
                  <div className={`w-40 p-4 font-medium text-gray-800 border-r border-gray-200 ${dept.color}`}>
                    {dept.name}
                  </div>
                  
                  {/* Week cells */}
                  {weekColumns.map(week => {
                    const tasks = getTasksForDeptWeek(dept.id as DeptKey, week.weekNumber);
                    return (
                      <div 
                        key={`${dept.id}-${week.weekNumber}`}
                        className="flex-1 min-w-32 p-2 min-h-20 border-r border-gray-200 relative"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, week.weekNumber, dept.id as DeptKey)}
                      >
                        {tasks.map(task => {
                          const taskKey = `${dept.id}-${task.id}-${week.weekNumber}`;
                          const customer = task.meta?.customer || 'Unknown';
                          const model = task.meta?.model || '';
                          const color = boatColors[customer as keyof typeof boatColors] || boatColors['Johnson Marine'];
                          
                          return (
                            <div key={task.id} className="mb-2">
                              {/* Task Block */}
                              <div
                                className={`${color.light} ${color.border} border-2 rounded-md p-2 cursor-pointer hover:shadow-md transition-shadow ${
                                  canDrag ? 'cursor-grab hover:cursor-grabbing' : 'cursor-pointer'
                                } ${
                                  selectedBlocks.has(taskKey) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                                }`}
                                draggable={canDrag}
                                onDragStart={(e) => handleDragStart(e, task, week.weekNumber)}
                                onMouseDown={(e) => handleTaskMouseDown(e, task, week.weekNumber)}
                                onMouseUp={(e) => handleTaskMouseUp(e, task, week.weekNumber)}
                                onClick={(e) => handleTaskSelect(e, taskKey)}
                              >
                                <div className={`text-sm font-semibold ${color.text}`}>
                                  {customer}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {model}'
                                </div>
                                
                                {/* Chips */}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {getChips(task)}
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Status Chips</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Gelcoat Needed</span>
              <span className="text-gray-600">Missing gelcoat color or not ready</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Vendor Late</span>
              <span className="text-gray-600">Parts delivery delayed</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Reopened</span>
              <span className="text-gray-600">Configuration was reopened for changes</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">Color Missing</span>
              <span className="text-gray-600">Gelcoat color not specified</span>
            </div>
          </div>
        </div>

        {/* Undo Toast */}
        {showUndo && undoData && (
          <div className="fixed bottom-6 right-6 bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-4 z-50">
            <span className="text-sm">
              Moved {undoData.taskIds.length} task{undoData.taskIds.length !== 1 ? 's' : ''} from Week {undoData.fromWeek} to Week {undoData.toWeek}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleUndo}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Undo
              </button>
              <button
                onClick={() => router.push('/tracker?view=parts')}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Open Parts Tracker
              </button>
              <button
                onClick={() => setShowUndo(false)}
                className="px-2 py-1 text-gray-300 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Large Task Modal */}
        {selectedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModal}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Sticky Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white rounded-t-lg">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedModal.customer} - {selectedModal.model}' ({selectedModal.department})
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Task Overview */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Task Details</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedModal.status)}`}>
                            {selectedModal.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Week:</span>
                          <span className="font-medium">{selectedModal.week}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Department:</span>
                          <span className="font-medium capitalize">{selectedModal.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Position:</span>
                          <span className="font-medium">{selectedModal.position + 1}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Boat Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Customer:</span>
                          <span className="font-medium">{selectedModal.customer}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Model:</span>
                          <span className="font-medium">{selectedModal.model}' Center Console</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gelcoat:</span>
                          <span className="font-medium">{selectedModal.meta?.gelcoat_color || 'Not specified'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Alerts */}
                  {getChips(selectedModal).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Status Alerts</h3>
                      <div className="flex flex-wrap gap-2">
                        {getChips(selectedModal)}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => router.push(`/picklist?boat=${selectedModal.meta?.boatId || selectedModal.id}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Open Picklist
                    </button>
                    <button
                      onClick={() => router.push('/tracker?view=parts')}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Parts Tracker
                    </button>
                    <button
                      onClick={() => router.push(`/sales/options?boat=${selectedModal.meta?.boatId || selectedModal.id}`)}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      Configure Options
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}