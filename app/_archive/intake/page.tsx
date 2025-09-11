'use client';

import { useState } from 'react';
import { useRole } from '../contexts/RoleContext';
import { store } from '../lib/store';
import { Boat, StationName } from '../lib/types';
import { uiKit, cn } from '../lib/ui-kit';

export default function IntakePage() {
  const { role, permissions } = useRole();
  const [formData, setFormData] = useState({
    customer: '',
    model: '26 Open',
    dueDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Helper to compute freeze-by date (48h before Lamination start)
  const computeFreezeByDate = (laminationStartDate: string): string => {
    const startDate = new Date(laminationStartDate);
    const freezeBy = new Date(startDate.getTime() - (48 * 60 * 60 * 1000)); // 48 hours before
    return freezeBy.toISOString();
  };

  // Helper to generate station schedule (Lamination starts in ~7 days)
  const generateStationSchedule = (dueDate: string) => {
    const due = new Date(dueDate);
    
    // Work backwards from due date
    const finishEnd = new Date(due.getTime() - (5 * 24 * 60 * 60 * 1000)); // 5 days before due
    const finishStart = new Date(finishEnd.getTime() - (20 * 24 * 60 * 60 * 1000)); // 20 days for finish
    
    const riggingEnd = new Date(finishStart.getTime() - (1 * 24 * 60 * 60 * 1000)); // 1 day buffer
    const riggingStart = new Date(riggingEnd.getTime() - (14 * 24 * 60 * 60 * 1000)); // 14 days for rigging
    
    const assemblyEnd = new Date(riggingStart.getTime() - (1 * 24 * 60 * 60 * 1000)); // 1 day buffer  
    const assemblyStart = new Date(assemblyEnd.getTime() - (19 * 24 * 60 * 60 * 1000)); // 19 days for assembly
    
    const laminationEnd = new Date(assemblyStart.getTime() - (1 * 24 * 60 * 60 * 1000)); // 1 day buffer
    const laminationStart = new Date(laminationEnd.getTime() - (5 * 24 * 60 * 60 * 1000)); // 5 days for lamination

    return [
      { name: 'Lamination' as StationName, start_date: laminationStart.toISOString(), end_date: laminationEnd.toISOString(), status: 'pending' as const },
      { name: 'Assembly' as StationName, start_date: assemblyStart.toISOString(), end_date: assemblyEnd.toISOString(), status: 'pending' as const },
      { name: 'Rigging' as StationName, start_date: riggingStart.toISOString(), end_date: riggingEnd.toISOString(), status: 'pending' as const },
      { name: 'Finish' as StationName, start_date: finishStart.toISOString(), end_date: finishEnd.toISOString(), status: 'pending' as const }
    ];
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear any existing messages when user starts typing
    if (message) {
      setMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer.trim() || !formData.dueDate) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    // Basic date validation
    const dueDate = new Date(formData.dueDate);
    const today = new Date();
    if (dueDate <= today) {
      setMessage({ type: 'error', text: 'Due date must be in the future' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      // Generate station schedule
      const stations = generateStationSchedule(formData.dueDate);
      const laminationStart = stations.find(s => s.name === 'Lamination')?.start_date;
      
      if (!laminationStart) {
        throw new Error('Failed to generate lamination schedule');
      }

      // Create new boat
      const newBoat = store.addBoat({
        customer: formData.customer.trim(),
        model: formData.model,
        due_date: formData.dueDate,
        stations,
        config_stage: 'base_scheduled',
        gelcoat_color: null,
        color_freeze_by: computeFreezeByDate(laminationStart),
        selected_options: []
      });

      setMessage({ 
        type: 'success', 
        text: `Boat added successfully! ID: ${newBoat.id}. Lamination scheduled to start ${new Date(laminationStart).toLocaleDateString()}.`
      });

      // Reset form
      setFormData({
        customer: '',
        model: '26 Open',
        dueDate: '',
      });

    } catch (error) {
      console.error('Error adding boat:', error);
      setMessage({ type: 'error', text: 'Failed to add boat. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className={uiKit.layout.container}>
      <div className={uiKit.layout.section}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Boat Intake</h1>
          <div className={cn(uiKit.badge.base, uiKit.badge.blue)}>
            Role: {role}
          </div>
        </div>

        {message && (
          <div className={cn(
            "p-4 rounded-md mb-6",
            message.type === 'success' ? "bg-green-50 text-green-800 border border-green-200" : 
            "bg-red-50 text-red-800 border border-red-200"
          )}>
            {message.text}
          </div>
        )}

        <div className="max-w-2xl">
          <div className={uiKit.card.padded}>
            <h2 className="text-xl font-semibold mb-6">Add New Boat</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Name */}
              <div>
                <label htmlFor="customer" className={uiKit.input.label}>
                  Customer Name *
                </label>
                <input
                  type="text"
                  id="customer"
                  value={formData.customer}
                  onChange={(e) => handleInputChange('customer', e.target.value)}
                  className={uiKit.input.base}
                  placeholder="Enter customer name..."
                  required
                />
              </div>

              {/* Model Selection */}
              <div>
                <label htmlFor="model" className={uiKit.input.label}>
                  Model *
                </label>
                <select
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  className={uiKit.input.base}
                  required
                >
                  <option value="26 Open">26 Open</option>
                  <option value="40 HPC">40 HPC</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label htmlFor="dueDate" className={uiKit.input.label}>
                  Delivery Due Date *
                </label>
                <input
                  type="date"
                  id="dueDate"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  className={uiKit.input.base}
                  min={minDate}
                  required
                />
                <p className="mt-1 text-sm text-gray-600">
                  The system will automatically schedule stations working backwards from this date.
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">What happens next:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Lamination will be auto-scheduled in the optimal timeframe</li>
                  <li>• Base template BOM will be applied</li>
                  <li>• Gelcoat color will be set to "TBD"</li>
                  <li>• Color freeze-by date will be set to 48 hours before lamination</li>
                  <li>• Configuration stage will be "Base Scheduled"</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    uiKit.button.primary,
                    uiKit.button.large,
                    isSubmitting && uiKit.button.disabled
                  )}
                >
                  {isSubmitting ? 'Adding Boat...' : 'Add Base Boat'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData({ customer: '', model: '26 Open', dueDate: '' });
                    setMessage(null);
                  }}
                  className={cn(uiKit.button.secondary, uiKit.button.large)}
                  disabled={isSubmitting}
                >
                  Clear Form
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Recent Boats */}
        <div className="mt-8">
          <div className={uiKit.card.padded}>
            <h2 className="text-xl font-semibold mb-4">Recent Boats</h2>
            <RecentBoatsList />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentBoatsList() {
  const [boats] = useState(() => store.getBoats());
  
  // Sort by most recent (assuming ID contains timestamp)
  const recentBoats = boats.slice(-5).reverse();

  if (recentBoats.length === 0) {
    return (
      <p className="text-gray-600 text-center py-4">
        No boats added yet.
      </p>
    );
  }

  return (
    <div className={uiKit.table.container}>
      <table className={uiKit.table.table}>
        <thead className={uiKit.table.header}>
          <tr>
            <th className={uiKit.table.headerCell}>Customer</th>
            <th className={uiKit.table.headerCell}>Model</th>
            <th className={uiKit.table.headerCell}>Due Date</th>
            <th className={uiKit.table.headerCell}>Status</th>
            <th className={uiKit.table.headerCell}>Gelcoat</th>
          </tr>
        </thead>
        <tbody className={uiKit.table.body}>
          {recentBoats.map(boat => (
            <tr key={boat.id} className={uiKit.table.row}>
              <td className={uiKit.table.cell}>{boat.customer}</td>
              <td className={uiKit.table.cellSecondary}>{boat.model}</td>
              <td className={uiKit.table.cellSecondary}>
                {new Date(boat.due_date).toLocaleDateString()}
              </td>
              <td className={uiKit.table.cell}>
                <span className={cn(
                  uiKit.badge.base,
                  boat.config_stage === 'finalized' ? uiKit.badge.green : uiKit.badge.yellow
                )}>
                  {boat.config_stage === 'finalized' ? 'Finalized' : 'Base Scheduled'}
                </span>
              </td>
              <td className={uiKit.table.cellSecondary}>
                {boat.gelcoat_color || 'TBD'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}