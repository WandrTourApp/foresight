import { useState, useEffect } from 'react';
import { useRole } from './role-context';
import { getDeptSchedule, getAllDeptItems, getStatusDot, type DepartmentType } from '../lib/dept-schedule-utils';

export default function ForesightUnifiedSchedules() {
  const { role } = useRole();
  const [selectedBoat, setSelectedBoat] = useState<string | null>(null);
  const [scheduleItems, setScheduleItems] = useState<any[]>([]);

  // Status options - keep lamination detailed, others simple
  const getStatusOptions = (department: string) => {
    if (department === 'Lamination') {
      return ['Not Started', 'In Mold', 'Out of Mold', 'Trimming', 'Complete'];
    }
    return ['Not Done', 'Done'];
  };

  // Unified boat schedules across all departments
  const boatSchedules = [
    { id: 'Goldman-26', customer: 'Goldman', model: '26', week: 'Week 35', department: 'Lamination' },
    { id: 'Marina-40', customer: 'Marina Corp', model: '40', week: 'Week 36', department: 'Lamination' },
    { id: 'Sheffield-26', customer: 'Sheffield', model: '26', week: 'Week 35', department: 'Finishing' },
    { id: 'Brennan-40', customer: 'Brennan', model: '40', week: 'Week 36', department: 'Finishing' },
    { id: 'Songy-26', customer: 'Songy', model: '26', week: 'Week 35', department: 'Rigging' },
    { id: 'Magrisso-40', customer: 'Magrisso', model: '40', week: 'Week 36', department: 'Rigging' },
    { id: 'Russ-26', customer: 'Russ', model: '26', week: 'Week 35', department: 'Assembly' },
    { id: 'Kennedy-40', customer: 'Kennedy', model: '40', week: 'Week 36', department: 'Assembly' }
  ];

  // Generate schedule items for each boat
  useEffect(() => {
    const items = boatSchedules.flatMap(boat => {
      const deptType = boat.department.toLowerCase() as DepartmentType;
      const allItems = getAllDeptItems(boat.id, boat.week);
      
      return Object.entries(allItems).flatMap(([dept, parts]: [string, any[]]) => 
        parts.map(part => ({
          ...part,
          boatId: boat.id,
          customer: boat.customer,
          boatModel: boat.model,
          week: boat.week,
          department: boat.department,
          // Keep lamination detailed, simplify others
          simpleStatus: boat.department === 'Lamination' 
            ? (part.status === 'complete' ? 'Complete' : 
               part.status === 'in-progress' ? 'In Mold' : 'Not Started')
            : (part.status === 'complete' || part.status === 'done' ? 'Done' : 'Not Done')
        }))
      );
    });
    
    setScheduleItems(items);
  }, []);

  const updateItemStatus = (itemId: string, newStatus: string) => {
    setScheduleItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, simpleStatus: newStatus }
          : item
      )
    );
  };

  const canModify = role === 'admin' || role === 'plant_manager' || role === 'floor_manager';

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case 'Lamination': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'Finishing': return 'bg-green-50 border-green-200 text-green-800';
      case 'Rigging': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'Assembly': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done':
      case 'Complete':
        return 'bg-green-500 text-white';
      case 'In Mold':
        return 'bg-blue-500 text-white';
      case 'Out of Mold':
        return 'bg-yellow-500 text-white';
      case 'Trimming':
        return 'bg-orange-500 text-white';
      case 'Not Started':
      case 'Not Done':
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const groupedByBoat = scheduleItems.reduce((acc, item) => {
    const key = `${item.customer} ${item.boatModel}'`;
    if (!acc[key]) {
      acc[key] = {
        customer: item.customer,
        model: item.boatModel,
        week: item.week,
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-sky-600 mb-2">
            Production Schedules
          </h1>
          <p className="text-gray-600">
            Unified view of all departments - Click boats to expand details
          </p>
        </div>

        {/* Boat Schedule Cards */}
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Object.entries(groupedByBoat).map(([boatKey, boat]) => {
            const isExpanded = selectedBoat === boatKey;
            const doneCount = boat.items.filter((item: any) => 
              item.simpleStatus === 'Done' || item.simpleStatus === 'Complete'
            ).length;
            const totalCount = boat.items.length;
            const progress = Math.round((doneCount / totalCount) * 100);

            return (
              <div 
                key={boatKey}
                className="bg-white rounded-lg shadow-lg p-6 cursor-pointer transition-all hover:shadow-xl"
                onClick={() => setSelectedBoat(isExpanded ? null : boatKey)}
              >
                {/* Boat Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{boat.customer}</h3>
                    <p className="text-blue-600 font-medium">{boat.model}' Boat</p>
                    <p className="text-sm text-gray-500">{boat.week}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{progress}%</div>
                    <div className="text-xs text-gray-500">Complete</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{doneCount} done</span>
                    <span>{totalCount - doneCount} remaining</span>
                  </div>
                </div>

                {/* Department Summary */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Lamination', 'Finishing', 'Rigging', 'Assembly'].map(dept => {
                    const deptItems = boat.items.filter((item: any) => item.department === dept);
                    const deptDone = deptItems.filter((item: any) => 
                      item.simpleStatus === 'Done' || item.simpleStatus === 'Complete'
                    ).length;
                    
                    if (deptItems.length === 0) return null;
                    
                    return (
                      <span key={dept} className={`px-2 py-1 rounded text-xs ${getDepartmentColor(dept)}`}>
                        {dept}: {deptDone}/{deptItems.length}
                      </span>
                    );
                  })}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">All Schedule Items</h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {boat.items.map((item: any) => (
                        <div 
                          key={item.id}
                          className={`p-3 rounded-lg border-l-4 ${getDepartmentColor(item.department)}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{item.part}</div>
                              <div className="text-sm text-gray-600">{item.department} • {item.hours}h</div>
                              <div className="text-xs text-gray-500">
                                Priority: {item.priority} • Due: Week 36
                              </div>
                            </div>
                            
                            <div className="ml-4">
                              {canModify ? (
                                <select
                                  value={item.simpleStatus}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateItemStatus(item.id, e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`px-3 py-1 rounded text-sm font-medium border ${getStatusColor(item.simpleStatus)}`}
                                >
                                  {getStatusOptions(item.department).map(status => (
                                    <option key={status} value={status}>{status}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(item.simpleStatus)}`}>
                                  {item.simpleStatus}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Mark all as done - use appropriate status per department
                          boat.items.forEach((item: any) => {
                            const completeStatus = item.department === 'Lamination' ? 'Complete' : 'Done';
                            updateItemStatus(item.id, completeStatus);
                          });
                        }}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        disabled={!canModify}
                      >
                        Mark All Complete
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Reset all to not done - use appropriate status per department
                          boat.items.forEach((item: any) => {
                            const startStatus = item.department === 'Lamination' ? 'Not Started' : 'Not Done';
                            updateItemStatus(item.id, startStatus);
                          });
                        }}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                        disabled={!canModify}
                      >
                        Reset All
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Lamination', 'Finishing', 'Rigging', 'Assembly'].map(dept => {
              const deptItems = scheduleItems.filter(item => item.department === dept);
              const deptDone = deptItems.filter(item => 
                item.simpleStatus === 'Done' || item.simpleStatus === 'Complete'
              ).length;
              const deptProgress = deptItems.length > 0 ? Math.round((deptDone / deptItems.length) * 100) : 0;
              
              return (
                <div key={dept} className={`p-4 rounded-lg ${getDepartmentColor(dept)}`}>
                  <div className="text-2xl font-bold mb-1">{deptProgress}%</div>
                  <div className="text-sm font-medium">{dept}</div>
                  <div className="text-xs opacity-75">{deptDone}/{deptItems.length} complete</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}