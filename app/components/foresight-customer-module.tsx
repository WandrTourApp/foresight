import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRole } from './role-context';
import { store } from './store';
import CustomerPrintablesPanel from './customer-printables-panel';

type ViewType = 'active' | 'leads' | 'delivered' | 'archived';

export default function CustomerModule() {
  const { role, can } = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<ViewType>('active');
  const [selectedBoat, setSelectedBoat] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<any>(null);

  // Dynamic leads state
  const [leads, setLeads] = useState([
    { id: 1, name: 'John Smith', email: 'john@email.com', phone: '(555) 123-4567', status: 'lead', source: 'Website', updated: '2025-08-30' },
    { id: 2, name: 'Sarah Johnson', email: 'sarah@email.com', phone: '(555) 987-6543', status: 'quote', source: 'Referral', updated: '2025-08-29' },
    { id: 3, name: 'Mike Wilson', email: 'mike@email.com', phone: '(555) 456-7890', status: 'lead', source: 'Boat Show', updated: '2025-08-28' }
  ]);

  const mockActiveBoats = store.listBoats();
  
  // Expand mock data for different views
  const mockAllBoats = [
    ...mockActiveBoats.map(boat => ({ ...boat, status: boat.config_stage === 'finalized' ? 'signed' : 'in_production', updated: '2025-08-30' })),
    { id: 'delivered-1', customer: 'Thompson Marine', model: '32', status: 'delivered', due_date: '2025-07-15', updated: '2025-07-15' },
    { id: 'delivered-2', customer: 'Harbor Yacht', model: '26', status: 'delivered', due_date: '2025-06-30', updated: '2025-06-30' },
    { id: 'archived-1', customer: 'Old Customer', model: '40', status: 'archived', due_date: '2025-05-01', updated: '2025-05-01' },
    { id: 'cancelled-1', customer: 'Cancelled Order', model: '26', status: 'cancelled', due_date: '2025-08-01', updated: '2025-08-01' }
  ];

  // Check for success message from finalize flow
  useEffect(() => {
    const successData = sessionStorage.getItem('salesSuccessMessage');
    if (successData) {
      const success = JSON.parse(successData);
      setSuccessMessage(success);
      sessionStorage.removeItem('salesSuccessMessage');
      
      // Auto-select the boat if provided
      if (success.boatId) {
        setSelectedBoat(success.boatId);
      }
    }
    
    // Check URL params for view and boat
    const view = searchParams.get('view') as ViewType;
    const boat = searchParams.get('boat');
    
    if (view) setActiveView(view);
    if (boat) setSelectedBoat(boat);
  }, [searchParams]);

  // Hide sales tabs for non-permitted roles
  const canAccessSales = role === 'admin' || role === 'plant_manager';

  const handleConvertLead = (leadId: number) => {
    // Create a real draft boat instead of just navigating
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      const newBoatId = `boat-${Date.now()}`;
      const newBoat = {
        id: newBoatId,
        customer: lead.name,
        model: '26',
        config_stage: 'draft',
        status: 'lead',
        created_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        selected_options: [],
        gelcoat_color: null
      };
      
      // Add to store (in real app)
      store.setBoat(newBoatId, newBoat);
      
      // Navigate to options page for configuration
      router.push(`/sales/options?boat=${newBoatId}`);
    }
  };

  const createNewLead = () => {
    // Create new lead that becomes a real draft boat
    const leadName = prompt('Enter customer name:');
    if (leadName) {
      const newLeadId = Date.now();
      const newLead = {
        id: newLeadId,
        name: leadName,
        email: '',
        phone: '',
        status: 'lead',
        source: 'Manual Entry',
        updated: new Date().toISOString().split('T')[0]
      };
      
      // Optimistically add to leads
      setLeads(prev => [newLead, ...prev]);
      setActiveView('leads');
      
      // Show success toast
      setSuccessMessage({
        message: `New lead "${leadName}" created successfully!`,
        boatId: null
      });
      
      // Auto-hide toast after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };



  // Filter boats based on current view
  const getBoatsForView = (view: ViewType) => {
    switch (view) {
      case 'active':
        // signed + in_production (acts as "Active folder")
        return mockAllBoats.filter(boat => ['signed', 'in_production'].includes(boat.status));
      case 'leads':
        // lead + quote
        return leads;
      case 'delivered':
        return mockAllBoats.filter(boat => boat.status === 'delivered');
      case 'archived':
        return mockAllBoats.filter(boat => ['archived', 'cancelled'].includes(boat.status));
      default:
        return mockAllBoats;
    }
  };

  const visibleBoats = getBoatsForView(activeView);

  // Don't show sales interface for unauthorized roles
  if (!canAccessSales) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Restricted</h1>
          <p className="text-gray-600">Sales module is only accessible to Admin and Plant Manager roles.</p>
          <p className="text-sm text-gray-500 mt-2">Contact your administrator for access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Success Toast */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-green-800 font-medium">Configuration Finalized!</h3>
                <p className="text-green-700 text-sm mt-1">{successMessage.message}</p>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => router.push('/timeline-v2')}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Open Production Schedule
                  </button>
                  <button
                    onClick={() => router.push(`/picklist?boat=${successMessage.boatId}`)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Open Picklist
                  </button>
                  <button
                    onClick={() => setSuccessMessage(null)}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                  >
                    Stay on Customer
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-600 hover:text-green-800 text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Sales</h1>
          
          <div className="flex space-x-3">
            {can('create_lead') && (
              <button 
                onClick={createNewLead}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                + New Lead
              </button>
            )}
            
            {role === 'admin' && (
              <>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 mb-6">
              <div className="flex space-x-1">
                {[
                  { key: 'active', label: 'Active', count: getBoatsForView('active').length },
                  { key: 'leads', label: 'Leads', count: getBoatsForView('leads').length },
                  { key: 'delivered', label: 'Delivered', count: getBoatsForView('delivered').length },
                  { key: 'archived', label: 'Archived', count: getBoatsForView('archived').length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveView(tab.key as ViewType)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === tab.key
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label} {tab.count > 0 && <span className="ml-1 text-xs">({tab.count})</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                {activeView === 'leads' && 'Customer Leads'}
                {activeView === 'active' && 'Active Boats'}
                {activeView === 'delivered' && 'Delivered Boats'}
                {activeView === 'archived' && 'Archived Boats'}
              </h2>
              
              {visibleBoats.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">📋</div>
                  <p>No {activeView} items found.</p>
                  {activeView === 'leads' && can('create_lead') && (
                    <p className="text-sm mt-2">Create your first lead to get started.</p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {activeView === 'leads' ? 'Contact' : 'Model'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {activeView === 'leads' ? 'Source' : 'Due Date'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {visibleBoats.map((item: any) => (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-gray-50 cursor-pointer ${selectedBoat === item.id ? 'bg-blue-50' : ''}`}
                          onClick={() => setSelectedBoat(selectedBoat === item.id ? null : item.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {activeView === 'leads' ? item.name : item.customer}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {activeView === 'leads' ? (
                              <div>
                                <div>{item.email || 'No email'}</div>
                                <div>{item.phone || 'No phone'}</div>
                              </div>
                            ) : (
                              `${item.model}' Center Console`
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {activeView === 'leads' ? 
                              item.source : 
                              new Date(item.due_date).toLocaleDateString()
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.status === 'lead' ? 'bg-green-100 text-green-800' :
                              item.status === 'quote' ? 'bg-yellow-100 text-yellow-800' :
                              item.status === 'signed' ? 'bg-blue-100 text-blue-800' :
                              item.status === 'in_production' ? 'bg-purple-100 text-purple-800' :
                              item.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.status || item.config_stage}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {activeView === 'leads' && can('convert_lead') && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConvertLead(item.id);
                                }}
                                className="text-green-600 hover:text-green-900"
                              >
                                Convert
                              </button>
                            )}
                            {activeView === 'active' && can('edit_order') && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/sales/options?boat=${item.id}`);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Configure
                              </button>
                            )}
                            {activeView === 'delivered' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Open records/paperwork panel
                                  alert('Records/paperwork panel - not yet implemented');
                                }}
                                className="text-green-600 hover:text-green-900"
                              >
                                Records
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Fast Clicks Rail (Right Sidebar) */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Quick Access</h3>
              
              <div className="space-y-3">
                <div className="p-2">
                  <div className="text-xs text-gray-500 mb-2">Recently Updated (5)</div>
                  {visibleBoats.slice(0, 5).map((item: any) => (
                    <div 
                      key={item.id}
                      className="text-xs text-gray-600 py-1 cursor-pointer hover:text-blue-600"
                      onClick={() => setSelectedBoat(item.id)}
                    >
                      {activeView === 'leads' ? item.name : item.customer} • {item.updated}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Customer Printables Panel */}
            {selectedBoat && activeView !== 'leads' && (
              <CustomerPrintablesPanel boat={visibleBoats.find((b: any) => b.id === selectedBoat)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}