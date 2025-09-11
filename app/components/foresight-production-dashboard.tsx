import { useState, useMemo, useCallback } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Timeline data from your production schedule
  const [timeline] = useState({
    weeks: [
      { week: '1/31', assembly: 'Goldman', finishing: 'Songy', rigging: '40-21', delivery: null },
      { week: '2/7', assembly: 'Goldman', finishing: 'Songy', rigging: '40-21', delivery: null },
      { week: '2/14', assembly: 'Goldman', finishing: 'Songy', rigging: '40-22', delivery: null },
      { week: '2/21', assembly: 'Magrisso', finishing: 'Goldman', rigging: '40-22', delivery: null },
      { week: '2/28', assembly: 'Magrisso', finishing: 'Goldman', rigging: '40-22', delivery: null },
      { week: '3/7', assembly: 'Brannan', finishing: 'Goldman', rigging: '40-22', delivery: null },
      { week: '3/14', assembly: 'Brannan', finishing: 'Magrisso', rigging: '40-22', delivery: null },
      { week: '3/21', assembly: 'Brannan', finishing: 'Magrisso', rigging: '40-22', delivery: null },
      { week: '3/28', assembly: null, finishing: 'Magrisso', rigging: '40-22', delivery: '40-20' },
      { week: '4/4', assembly: 'McCarthy', finishing: null, rigging: '40-22', delivery: '40-22' },
      { week: '4/11', assembly: 'McCarthy', finishing: 'Brannan', rigging: '40-23', delivery: null },
      { week: '4/18', assembly: 'McCarthy', finishing: 'Brannan', rigging: '40-23', delivery: null },
      { week: '4/25', assembly: 'McCarthy', finishing: 'Brannan', rigging: '40-23', delivery: null },
      { week: '5/2', assembly: 'Russ', finishing: 'McCarthy', rigging: '40-23', delivery: null },
      { week: '5/9', assembly: 'Russ', finishing: 'McCarthy', rigging: '40-23', delivery: null },
      { week: '5/16', assembly: 'Russ', finishing: 'McCarthy', rigging: '40-23', delivery: null }
    ]
  });

  // Real boat data from your production schedule
  const [boats, setBoats] = useState({
    'sheffield': {
      id: 'sheffield',
      customer: 'Sheffield',
      model: '26 Open',
      hull: 'Sheffield-26-001',
      priority: 'high',
      assemblyWeek: 'Complete',
      finishingWeek: '1/10-1/24',
      riggingWeek: 'Complete',
      deliveryWeek: 'Complete',
      gelCoat: 'Ice White',
      parts: {
        console: { status: 'finished', hours: 39.1, location: 'Ready', dueDate: '2025-01-15', gelCoat: 'Ice White' },
        consoleLiner: { status: 'finished', hours: 26.65, location: 'Ready', dueDate: '2025-01-16', gelCoat: 'Ice White' },
        hardtop: { status: 'finished', hours: 37.65, location: 'Ready', dueDate: '2025-01-18', gelCoat: 'Ice White' },
        leaningPost: { status: 'finished', hours: 25.8, location: 'Ready', dueDate: '2025-01-14', gelCoat: 'Ice White' }
      }
    },
    'songy': {
      id: 'songy',
      customer: 'Songy',
      model: '26 Open', 
      hull: 'Songy-26-002',
      priority: 'high',
      assemblyWeek: '1/3-1/24',
      finishingWeek: '1/31-2/14',
      riggingWeek: 'Complete',
      deliveryWeek: 'Complete',
      gelCoat: 'Matterhorn White',
      parts: {
        console: { status: 'finished', hours: 38.66, location: 'Ready', dueDate: '2025-02-01', gelCoat: 'Matterhorn White' },
        consoleLiner: { status: 'finished', hours: 19.33, location: 'Ready', dueDate: '2025-02-02', gelCoat: 'Matterhorn White' },
        hardtop: { status: 'finished', hours: 45.5, location: 'Ready', dueDate: '2025-02-05', gelCoat: 'Matterhorn White' },
        upperHelm: { status: 'finished', hours: 15.5, location: 'Ready', dueDate: '2025-02-08', gelCoat: 'Matterhorn White' }
      }
    },
    'goldman': {
      id: 'goldman',
      customer: 'Goldman',
      model: '26 Open',
      hull: 'Goldman-26-003',
      priority: 'high',
      assemblyWeek: '1/31-2/14',
      finishingWeek: '2/21-3/7',
      riggingWeek: 'Not Started',
      deliveryWeek: 'Not Started',
      gelCoat: 'Matterhorn White',
      parts: {
        console: { status: 'not_finished', hours: 39.1, location: 'Finishing Bay', dueDate: '2025-02-25', gelCoat: 'Matterhorn White' },
        consoleLiner: { status: 'not_finished', hours: 26.65, location: 'Finishing Bay', dueDate: '2025-02-26', gelCoat: 'Matterhorn White' },
        hardtop: { status: 'in_mold', hours: 0, location: 'Lam Bay', dueDate: '2025-03-01', gelCoat: 'Ice Blue' },
        leaningPost: { status: 'scheduled', hours: 0, location: '', dueDate: '2025-03-05', gelCoat: 'Matterhorn White' }
      }
    },
    'magrisso': {
      id: 'magrisso',
      customer: 'Magrisso',
      model: '26 CB',
      hull: 'Magrisso-26-004',
      priority: 'high',
      assemblyWeek: '2/21-3/7',
      finishingWeek: '3/14-4/4',
      riggingWeek: 'Not Started',
      deliveryWeek: 'Not Started',
      gelCoat: 'Matterhorn White',
      parts: {
        console: { status: 'not_finished', hours: 39.1, location: 'Assembly Bay', dueDate: '2025-03-10', gelCoat: 'Matterhorn White' },
        consoleLiner: { status: 'finished', hours: 19.33, location: 'Ready', dueDate: '2025-02-28', gelCoat: 'Matterhorn White' },
        tubs: { status: 'in_mold', hours: 28.5, location: 'Lam Bay', dueDate: '2025-03-01', gelCoat: 'Matterhorn White' },
        liner: { status: 'in_mold', hours: 45.3, location: 'Lam Bay', dueDate: '2025-02-15', gelCoat: 'Matterhorn White' },
        deck: { status: 'in_mold', hours: 52.1, location: 'Lam Bay', dueDate: '2025-02-15', gelCoat: 'Matterhorn White' }
      }
    },
    'brannan': {
      id: 'brannan',
      customer: 'Brannan',
      model: '26 Open',
      hull: 'Brannan-26-005',
      priority: 'medium',
      assemblyWeek: '3/7-3/28',
      finishingWeek: '4/11-4/25',
      riggingWeek: 'Not Started',
      deliveryWeek: 'Not Started',
      gelCoat: 'Dresden Blue',
      parts: {
        liner: { status: 'scheduled', hours: 45.3, location: '', dueDate: '2025-02-28', gelCoat: 'Dresden Blue' },
        deck: { status: 'scheduled', hours: 52.1, location: '', dueDate: '2025-02-28', gelCoat: 'Dresden Blue' },
        hull: { status: 'scheduled', hours: 68.2, location: '', dueDate: '2025-02-28', gelCoat: 'Dresden Blue' },
        tubs: { status: 'not_scheduled', hours: 0, location: '', dueDate: '2025-02-25', gelCoat: 'Dresden Blue' },
        console: { status: 'not_scheduled', hours: 0, location: '', dueDate: '2025-03-15', gelCoat: 'Dresden Blue' }
      }
    },
    'mccarthy': {
      id: 'mccarthy',
      customer: 'McCarthy',
      model: '26 Open',
      hull: 'McCarthy-26-006',
      priority: 'medium',
      assemblyWeek: '4/4-4/25',
      finishingWeek: '4/28-5/16',
      riggingWeek: 'Not Started',
      deliveryWeek: 'Not Started',
      gelCoat: 'Mahogany OG',
      parts: {
        liner: { status: 'scheduled', hours: 45.3, location: '', dueDate: '2025-03-21', gelCoat: 'Mahogany OG' },
        deck: { status: 'scheduled', hours: 52.1, location: '', dueDate: '2025-03-21', gelCoat: 'Mahogany OG' },
        hull: { status: 'scheduled', hours: 68.2, location: '', dueDate: '2025-03-28', gelCoat: 'Mahogany OG' },
        console: { status: 'not_scheduled', hours: 0, location: '', dueDate: '2025-04-15', gelCoat: 'Mahogany OG' }
      }
    }
  });

  // Lamination schedule from your data
  const [lamSchedule] = useState({
    '2/10-2/13': [
      { part: 'Goldman Console', color: 'Matterhorn White', customer: 'Goldman' },
      { part: 'Brennan Liner', color: 'Matterhorn White', customer: 'Brennan' },
      { part: 'Brennan Deck', color: 'Matterhorn White', customer: 'Brennan' },
      { part: 'Magrisso #3 x 1 + 1 sims', color: 'Matterhorn White', customer: 'Magrisso' },
      { part: 'Sheffield Console Door Trim', color: '', customer: 'Sheffield' },
      { part: 'Magrisso Speaker Rings', color: 'Matterhorn White', customer: 'Magrisso' },
      { part: 'Magrisso Console Liner', color: 'Matterhorn White', customer: 'Magrisso' }
    ],
    '2/17-2/20': [
      { part: 'Magrisso C Hatch', color: 'Matterhorn White', customer: 'Magrisso' },
      { part: 'Magrisso LP', color: 'Matterhorn White', customer: 'Magrisso' },
      { part: 'Goldman Door Trim', color: 'Matterhorn White', customer: 'Goldman' },
      { part: 'Goldman Hardtop Top', color: 'Matterhorn White', customer: 'Goldman' },
      { part: 'Goldman Hardtop Bottom', color: 'Ice Blue-new', customer: 'Goldman' },
      { part: 'Goldman Hardtop Pie Plates', color: 'Ice Blue-new', customer: 'Goldman' },
      { part: 'Brennan Tubs', color: 'Dresden Blue', customer: 'Brennan' }
    ],
    '2/24-2/27': [
      { part: 'Sheffield Console', color: 'Key West Blue', customer: 'Sheffield' },
      { part: 'Sheffield Hull', color: 'Key West Blue', customer: 'Sheffield' }
    ]
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'finished': return 'bg-green-500 text-white border-green-600';
      case 'not_finished': return 'bg-yellow-500 text-black border-yellow-600';
      case 'in_mold': return 'bg-orange-500 text-white border-orange-600';
      case 'scheduled': return 'bg-red-500 text-white border-red-600';
      case 'not_scheduled': return 'bg-gray-500 text-white border-gray-600';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 font-bold';
      case 'medium': return 'text-orange-600 font-medium';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const formatPartName = (partKey) => {
    return partKey.replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const isOverdue = useCallback((part) => {
    const today = new Date();
    const dueDate = new Date(part.dueDate);
    return dueDate < today && part.status !== 'finished';
  }, []);

  // Calculate overall statistics
  const stats = useMemo(() => {
    const boatList = Object.values(boats);
    const totalParts = boatList.reduce((sum, boat) => sum + Object.keys(boat.parts).length, 0);
    const finishedParts = boatList.reduce((sum, boat) => 
      sum + Object.values(boat.parts).filter(part => part.status === 'finished').length, 0
    );
    const notFinishedParts = boatList.reduce((sum, boat) => 
      sum + Object.values(boat.parts).filter(part => part.status === 'not_finished').length, 0
    );
    const inMoldParts = boatList.reduce((sum, boat) => 
      sum + Object.values(boat.parts).filter(part => part.status === 'in_mold').length, 0
    );
    const scheduledParts = boatList.reduce((sum, boat) => 
      sum + Object.values(boat.parts).filter(part => part.status === 'scheduled').length, 0
    );
    const notScheduledParts = boatList.reduce((sum, boat) => 
      sum + Object.values(boat.parts).filter(part => part.status === 'not_scheduled').length, 0
    );
    
    // Calculate overdue parts
    const today = new Date();
    const overdueParts = boatList.reduce((sum, boat) => 
      sum + Object.values(boat.parts).filter(part => new Date(part.dueDate) < today && part.status !== 'finished').length, 0
    );

    const totalHours = boatList.reduce((sum, boat) => 
      sum + Object.values(boat.parts).reduce((partSum, part) => partSum + part.hours, 0), 0
    );

    return {
      totalBoats: boatList.length,
      totalParts,
      finishedParts,
      notFinishedParts,
      inMoldParts,
      scheduledParts,
      notScheduledParts,
      overdueParts,
      completionRate: Math.round((finishedParts / totalParts) * 100),
      totalHours: Math.round(totalHours)
    };
  }, [boats]);

  const updatePartStatus = useCallback((boatId, partKey, newStatus, location = '') => {
    setBoats(prev => ({
      ...prev,
      [boatId]: {
        ...prev[boatId],
        parts: {
          ...prev[boatId].parts,
          [partKey]: {
            ...prev[boatId].parts[partKey],
            status: newStatus,
            location: location || prev[boatId].parts[partKey].location
          }
        }
      }
    }));
  }, []);

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <p className="text-2xl font-bold text-sky-600">{stats.totalBoats}</p>
          <p className="text-sm text-gray-600">Active Boats</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <p className="text-2xl font-bold text-green-600">{stats.finishedParts}</p>
          <p className="text-sm text-gray-600">Finished</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.notFinishedParts}</p>
          <p className="text-sm text-gray-600">Not Finished</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.inMoldParts}</p>
          <p className="text-sm text-gray-600">In Mold</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <p className="text-2xl font-bold text-red-600">{stats.scheduledParts}</p>
          <p className="text-sm text-gray-600">Scheduled</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center border-2 border-red-500">
          <p className="text-2xl font-bold text-red-600">{stats.overdueParts}</p>
          <p className="text-sm text-red-600 font-semibold">OVERDUE</p>
        </div>
      </div>

      {/* Boats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.values(boats).map((boat) => (
          <div key={boat.id} className="bg-white rounded-lg shadow-md">
            {/* Boat Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{boat.customer}</h3>
                  <p className="text-gray-600">{boat.model} - {boat.hull}</p>
                  <p className="text-sm text-gray-500">Due: {boat.deliveryDate}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(boat.priority)}`}>
                    {boat.priority.toUpperCase()}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">Main: {boat.gelCoat}</p>
                </div>
              </div>
            </div>

            {/* Parts List */}
            <div className="p-4">
              <div className="space-y-2">
                {Object.entries(boat.parts).map(([partKey, part]) => (
                  <div 
                    key={partKey} 
                    className={`flex justify-between items-center p-3 rounded-lg border-2 ${getStatusColor(part.status)} ${
                      isOverdue(part) ? 'ring-4 ring-red-500 ring-opacity-75' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{formatPartName(partKey)}</p>
                        {isOverdue(part) && (
                          <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full font-bold">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        {part.location && (
                          <span className="text-sm opacity-80">{part.location}</span>
                        )}
                        <span className="px-2 py-1 bg-white bg-opacity-90 text-blue-800 rounded text-xs font-medium">
                          {part.gelCoat}
                        </span>
                        <span className="text-xs opacity-75">Due: {part.dueDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {part.hours > 0 && (
                        <span className="text-sm opacity-80">{part.hours}h</span>
                      )}
                      <select
                        value={part.status}
                        onChange={(e) => updatePartStatus(boat.id, partKey, e.target.value)}
                        className="text-sm px-2 py-1 rounded border bg-white text-gray-800 font-medium"
                      >
                        <option value="not_scheduled">Not Scheduled</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="in_mold">In Mold</option>
                        <option value="not_finished">Not Finished</option>
                        <option value="finished">Finished</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLamSchedule = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Lamination Schedule</h2>
      </div>

      {Object.entries(lamSchedule).map(([week, parts]) => (
        <div key={week} className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Week of {week}</h3>
          </div>
          <div className="p-4">
            <div className="grid gap-3">
              {parts.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{item.part}</p>
                    <p className="text-sm text-gray-600">Customer: {item.customer}</p>
                  </div>
                  <div className="text-right">
                    {item.color ? (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {item.color}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm">
                        No Color
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-sky-600 mb-8">
          Foresight Production Dashboard
        </h1>
        
        {/* Navigation */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'dashboard' 
                ? 'bg-sky-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Production Overview
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'schedule' 
                ? 'bg-sky-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Lamination Schedule
          </button>
        </div>

        {/* Content */}
        {activeTab === 'dashboard' ? renderDashboard() : renderLamSchedule()}
      </div>
    </div>
  );
}