'use client';
import { useState, useMemo, useRef } from 'react';
import { useScheduleStore, useTasksByDept, scheduleHelpers } from '../lib/schedule-store';
import type { ScheduleTask, DeptKey } from '../lib/schedule-store';
import { getAllDeptItems, getStatusDot } from '../lib/dept-schedule-utils';

const DEPT_KEY: DeptKey = 'assembly';

export default function ForesightAssemblyModule() {
  const { moveTasks, reorder } = useScheduleStore();
  const deptTasks = useTasksByDept(DEPT_KEY);

  const [isDense, setIsDense] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragRef = useRef<{ holdTimer: number | null, didDrag: boolean }>({ holdTimer: null, didDrag: false });

  // Group dept tasks by week
  const tasksByWeek = useMemo(() => {
    const grouped: Record<number, ScheduleTask[]> = {};
    deptTasks.forEach(task => {
      if (!grouped[task.week]) grouped[task.week] = [];
      grouped[task.week].push(task);
    });
    return grouped;
  }, [deptTasks]);

  const weeks = useMemo(() => Object.keys(tasksByWeek).map(Number).sort((a, b) => a - b), [tasksByWeek]);

  const handleMouseDown = (e: React.MouseEvent, taskId: string) => {
    dragRef.current.holdTimer = window.setTimeout(() => {
      if (e.ctrlKey || e.metaKey) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.has(taskId) ? next.delete(taskId) : next.add(taskId);
          return next;
        });
      } else {
        setSelectedIds(prev => prev.has(taskId) ? prev : new Set([taskId]));
      }
      setDraggingId(taskId);
      dragRef.current.didDrag = true;
    }, 180);
  };

  const handleMouseUp = (e: React.MouseEvent, taskId: string) => {
    if (dragRef.current.holdTimer) {
      clearTimeout(dragRef.current.holdTimer);
    }
    if (!dragRef.current.didDrag && !e.ctrlKey && !e.metaKey) {
        setSelectedIds(new Set()); // Clear selection on simple click
    }
    // Reset drag flag after a short delay
    setTimeout(() => { dragRef.current.didDrag = false; }, 50);
  };

  const handleDrop = (targetWeek: number, targetPosition: number) => {
    if (!draggingId) return;

    const sourceTask = Object.values(tasksByWeek).flat().find(t => t.id === draggingId);
    if (!sourceTask) return;

    const sourceWeek = sourceTask.week;
    const activeIds = Array.from(selectedIds);

    if (sourceWeek === targetWeek) {
      // Reorder within the same week
      const weekTasks = tasksByWeek[targetWeek].map(t => t.id);
      const filteredOrderedIds = weekTasks.filter(id => !activeIds.includes(id));
      
      let insertIndex = filteredOrderedIds.findIndex(id => tasksByWeek[targetWeek].find(t=>t.id === id)!.position >= targetPosition);
      if (insertIndex === -1) insertIndex = filteredOrderedIds.length;

      const finalOrderedIds = [
        ...filteredOrderedIds.slice(0, insertIndex),
        ...activeIds,
        ...filteredOrderedIds.slice(insertIndex)
      ];
      reorder(DEPT_KEY, targetWeek, finalOrderedIds);
    } else {
      // Move to a different week
      moveTasks(activeIds, targetWeek);
    }

    setDraggingId(null);
    setSelectedIds(new Set());
  };

  const MiniPartsList = ({ boatName, dept }: { boatName: string; dept: DeptKey }) => {
    const partsData = getAllDeptItems(boatName, dept);
    const parts = partsData[dept] || [];

    if (parts.length === 0) return null;

    return (
      <div className={`mt-2 ml-4 border-l-2 border-blue-200 pl-3 space-y-1`}>
        {parts.slice(0, 3).map((part, idx) => (
          <div key={idx} className="flex items-center text-xs text-gray-600">
            {getStatusDot(part.status, 'sm')}
            <span className="ml-2">{part.part}</span>
          </div>
        ))}
        {parts.length > 3 && <div className="text-xs text-gray-500 ml-5">+ {parts.length - 3} more...</div>}
      </div>
    );
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Assembly Schedule</h2>
        <div className="flex items-center space-x-4">
          <button className="text-sm font-medium text-blue-600 hover:text-blue-800">+ Add Parts</button>
          <label className="flex items-center text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={isDense} onChange={() => setIsDense(!isDense)} className="mr-2 h-4 w-4 rounded text-blue-600 focus:ring-blue-500" />
            Dense
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {weeks.map(week => (
          <div 
            key={week} 
            className="bg-gray-50 rounded-lg p-4 border border-gray-200" 
            onDragOver={(e) => e.preventDefault()} 
            onDrop={() => handleDrop(week, tasksByWeek[week]?.length || 0)}
          >
            <h3 className="font-semibold text-gray-700 mb-3">Week {week}</h3>
            <div className="space-y-2">
              {tasksByWeek[week].map((task, index) => (
                <div 
                  key={task.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDrop(week, task.position);
                  }}
                >
                  <div
                    draggable
                    onMouseDown={(e) => handleMouseDown(e, task.id)}
                    onMouseUp={(e) => handleMouseUp(e, task.id)}
                    onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', task.id);
                    }}
                    className={`p-3 rounded-lg shadow-sm cursor-grab ${isDense ? 'py-2' : ''} ${selectedIds.has(task.id) ? 'ring-2 ring-blue-500 bg-blue-100' : 'bg-white'} ${draggingId === task.id ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-800 text-sm">{task.title}</span>
                      <span className="text-xs text-gray-500">#{task.boatId.split('-')[1]}</span>
                    </div>
                    {!isDense && <MiniPartsList boatName={task.title} dept={DEPT_KEY} />}
                  </div>
                </div>
              ))}
              {tasksByWeek[week].length === 0 && (
                <div className="text-center py-4 text-sm text-gray-400 border-2 border-dashed rounded-lg">
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
