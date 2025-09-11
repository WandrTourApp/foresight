'use client';

import { useState, useCallback } from 'react';
import { useScheduleStore, DeptKey } from '../lib/schedule-store';
import { store } from './store';

interface SchedulerProps {
  onScheduleChange?: () => void;
}

export default function ProductionScheduler({ onScheduleChange }: SchedulerProps) {
  const { bootstrap } = useScheduleStore();
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedulingResults, setSchedulingResults] = useState<any>(null);

  // Get boats from the store for scheduling
  const boats = store.listBoats().filter(boat => boat.config_stage === 'finalized');

  const handleAutoSchedule = useCallback(async () => {
    setIsScheduling(true);
    setSchedulingResults(null);
    
    try {
      // Simulate scheduling algorithm
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock scheduling results - in real implementation this would be a sophisticated algorithm
      const mockScheduledTasks = boats.flatMap((boat, boatIndex) => {
        const departments: DeptKey[] = ['lamination', 'assembly', 'rigging', 'finishing'];
        return departments.map((dept, deptIndex) => ({
          id: `${boat.id}-${dept}`,
          boatId: boat.id,
          department: dept,
          title: `${boat.customer} ${boat.model}'`,
          status: 'not_started',
          week: boatIndex * 4 + deptIndex + 1, // Sequential scheduling
          position: 0,
          meta: {
            customer: boat.customer,
            model: boat.model,
            scheduledBy: 'auto-scheduler',
            scheduledAt: new Date().toISOString()
          }
        }));
      });

      // Bootstrap the schedule with new tasks
      bootstrap(mockScheduledTasks);
      
      setSchedulingResults({
        totalBoats: boats.length,
        totalTasks: mockScheduledTasks.length,
        weeksUsed: Math.max(...mockScheduledTasks.map(t => t.week)),
        departments: ['lamination', 'assembly', 'rigging', 'finishing']
      });
      
      onScheduleChange?.();
    } catch (error) {
      console.error('Scheduling failed:', error);
    } finally {
      setIsScheduling(false);
    }
  }, [boats, bootstrap, onScheduleChange]);

  const handleClearSchedule = useCallback(() => {
    bootstrap([]);
    setSchedulingResults(null);
    onScheduleChange?.();
  }, [bootstrap, onScheduleChange]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Production Scheduler</h2>
        <div className="text-sm text-gray-500">
          v1.0 - Prototype
        </div>
      </div>

      <div className="space-y-6">
        {/* Available Boats */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Available Boats for Scheduling</h3>
          {boats.length === 0 ? (
            <p className="text-gray-500">No finalized boats available for scheduling. Configure boats in the Sales module first.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {boats.map(boat => (
                <div key={boat.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="font-medium text-gray-900">{boat.customer}</div>
                  <div className="text-sm text-gray-600">{boat.model}' {boat.model_type}</div>
                  <div className="text-xs text-blue-600 mt-1">Finalized</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scheduling Actions */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Scheduling Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAutoSchedule}
              disabled={boats.length === 0 || isScheduling}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isScheduling ? 'Scheduling...' : 'Auto Schedule All Boats'}
            </button>
            
            <button
              onClick={handleClearSchedule}
              disabled={isScheduling}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Clear Schedule
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            Auto-scheduling will assign production tasks across departments in optimal sequence.
          </p>
        </div>

        {/* Scheduling Results */}
        {schedulingResults && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Scheduling Results</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-700">{schedulingResults.totalBoats}</div>
                  <div className="text-sm text-green-600">Boats Scheduled</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-700">{schedulingResults.totalTasks}</div>
                  <div className="text-sm text-green-600">Tasks Created</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-700">{schedulingResults.weeksUsed}</div>
                  <div className="text-sm text-green-600">Weeks Planned</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-700">{schedulingResults.departments.length}</div>
                  <div className="text-sm text-green-600">Departments</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-green-700">
                ✅ Schedule successfully generated! Check the Timeline to view the planned production sequence.
              </div>
            </div>
          </div>
        )}

        {/* Future Features Placeholder */}
        <div className="border-t pt-6 text-sm text-gray-500">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Future Features</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Capacity-based scheduling with resource constraints</li>
            <li>Customer priority weighting and due date optimization</li>
            <li>Dependency management (e.g., gelcoat lead times)</li>
            <li>What-if scenario planning and comparison</li>
            <li>Integration with vendor delivery schedules</li>
            <li>Labor allocation and skill-based assignment</li>
          </ul>
        </div>
      </div>
    </div>
  );
}