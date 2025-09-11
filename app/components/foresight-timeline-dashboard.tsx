import { useState } from 'react';

export default function App() {
  // Boat color assignments - consistent throughout system
  const boatColors = {
    'Sheffield': { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    'Songy': { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    'Goldman': { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    'Magrisso': { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    'Brannan': { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    'McCarthy': { bg: 'bg-pink-500', light: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
    'Russ': { bg: 'bg-indigo-500', light: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
    'Faccibene': { bg: 'bg-teal-500', light: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
    'Swan': { bg: 'bg-cyan-500', light: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
    'Kennedy': { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' }
  };

  // Timeline data from your actual production schedule - 4 departments, 3 weeks each
  const [departments] = useState({
    lamination: [
      { weeks: ['1/10', '1/17', '1/24'], customer: 'Goldman', color: boatColors.Goldman },
      { weeks: ['1/31', '2/7', '2/14'], customer: 'Magrisso', color: boatColors.Magrisso },
      { weeks: ['2/21', '2/28', '3/7'], customer: 'Brannan', color: boatColors.Brannan },
      { weeks: ['3/14', '3/21', '3/28'], customer: 'McCarthy', color: boatColors.McCarthy },
      { weeks: ['4/4', '4/11', '4/18'], customer: 'Russ', color: boatColors.Russ }
    ],
    assembly: [
      { weeks: ['1/31', '2/7', '2/14'], customer: 'Goldman', color: boatColors.Goldman },
      { weeks: ['2/21', '2/28', '3/7'], customer: 'Magrisso', color: boatColors.Magrisso },
      { weeks: ['3/14', '3/21', '3/28'], customer: 'Brannan', color: boatColors.Brannan },
      { weeks: ['4/4', '4/11', '4/18'], customer: 'McCarthy', color: boatColors.McCarthy },
      { weeks: ['4/25', '5/2', '5/9'], customer: 'Russ', color: boatColors.Russ }
    ],
    finishing: [
      { weeks: ['2/21', '2/28', '3/7'], customer: 'Goldman', color: boatColors.Goldman },
      { weeks: ['3/14', '3/21', '3/28'], customer: 'Magrisso', color: boatColors.Magrisso },
      { weeks: ['4/4', '4/11', '4/18'], customer: 'Brannan', color: boatColors.Brannan },
      { weeks: ['4/25', '5/2', '5/9'], customer: 'McCarthy', color: boatColors.McCarthy },
      { weeks: ['5/16', '5/23', '5/30'], customer: 'Russ', color: boatColors.Russ }
    ],
    rigging: [
      { weeks: ['3/14', '3/21', '3/28'], customer: 'Goldman', color: boatColors.Goldman },
      { weeks: ['4/4', '4/11', '4/18'], customer: 'Magrisso', color: boatColors.Magrisso },
      { weeks: ['4/25', '5/2', '5/9'], customer: 'Brannan', color: boatColors.Brannan },
      { weeks: ['5/16', '5/23', '5/30'], customer: 'McCarthy', color: boatColors.McCarthy },
      { weeks: ['6/6', '6/13', '6/20'], customer: 'Russ', color: boatColors.Russ }
    ]
  });

  const allWeeks = ['1/10', '1/17', '1/24', '1/31', '2/7', '2/14', '2/21', '2/28', '3/7', '3/14', '3/21', '3/28', '4/4', '4/11', '4/18', '4/25'];

  const getCustomerForWeek = (department, week) => {
    const schedule = departments[department];
    const entry = schedule.find(item => item.weeks.includes(week));
    return entry || null;
  };

  const renderDepartmentRow = (department, title, bgColor) => (
    <div className={`${bgColor} p-4 rounded-lg mb-4`}>
      <h3 className="text-lg font-bold text-gray-800 mb-3">{title}</h3>
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {allWeeks.map((week, index) => {
          const customer = getCustomerForWeek(department, week);
          const isCurrentWeek = week === '1/31'; // Current week
          
          return (
            <div
              key={week}
              className={`min-w-20 h-16 flex flex-col items-center justify-center rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                isCurrentWeek ? 'ring-2 ring-yellow-400 border-yellow-400' : 'border-gray-300'
              } ${customer ? `${customer.color.light} ${customer.color.border}` : 'bg-white'}`}
              onClick={() => customer && alert(`Clicked ${customer.customer} for week ${week}`)}
            >
              <div className="text-xs font-medium text-gray-600 mb-1">{week}</div>
              {customer ? (
                <div className={`text-xs font-bold ${customer.color.text} text-center px-1`}>
                  {customer.customer}
                </div>
              ) : (
                <div className="text-gray-400 text-xs">—</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-sky-600 mb-8">
          Production Timeline Dashboard
        </h1>

        {/* Current Week Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Assembly This Week</h3>
            <p className={`font-medium text-lg px-2 py-1 rounded ${boatColors.Goldman.bg} text-white inline-block`}>Goldman</p>
            <p className="text-xs text-blue-600 mt-1">Hull, deck, liner assembly</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">Finishing This Week</h3>
            <p className={`font-medium text-lg px-2 py-1 rounded ${boatColors.Songy.bg} text-white inline-block`}>Songy</p>
            <p className="text-xs text-green-600 mt-1">Final trim and prep for rigging</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-2">Rigging This Week</h3>
            <p className="text-purple-700 font-medium text-lg">40-21</p>
            <p className="text-xs text-purple-600 mt-1">Electronics and systems install</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-800 mb-2">Delivery This Week</h3>
            <p className="text-orange-700 font-medium text-lg">No Deliveries</p>
            <p className="text-xs text-orange-600 mt-1">Next delivery: 3/28 (40-20)</p>
          </div>
        </div>

        {/* Horizontal Timeline */}
        {renderDepartmentRow('lamination', 'Lamination Department', 'bg-red-50')}
        {renderDepartmentRow('assembly', 'Assembly Department', 'bg-blue-50')}
        {renderDepartmentRow('finishing', 'Finishing Department', 'bg-green-50')}
        {renderDepartmentRow('rigging', 'Rigging Department', 'bg-purple-50')}

        {/* Boat Legend */}
        <div className="bg-white rounded-lg shadow-md mt-6 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Boat Color Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(boatColors).map(([customer, color]) => (
              <div key={customer} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded ${color.bg}`}></div>
                <span className="text-sm text-gray-700">{customer}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}