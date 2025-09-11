'use client';

import { useState, useEffect } from 'react';
import { useRole } from './role-context';

interface CustomOption {
  id: string;
  customer: string;
  model: string;
  submittedBy: string;
  submittedDate: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'needs_redesign' | 'info_requested' | 'not_possible';
  priority: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  estimatedCost?: number;
  comments: {
    id: string;
    author: string;
    message: string;
    timestamp: string;
    type: 'note' | 'info_request' | 'response';
  }[];
  attachments?: string[];
}

const defaultOptions: CustomOption[] = [
    {
      id: 'opt-001',
      customer: 'Goldman',
      model: '26',
      submittedBy: 'Sarah M.',
      submittedDate: '2/8/2025',
      title: 'Custom Rod Holder Configuration',
      description: 'Customer wants 6 custom rod holders arranged in a specific pattern on the gunwale, with integrated tackle storage beneath each holder.',
      status: 'pending',
      priority: 'medium',
      comments: []
    },
    {
      id: 'opt-002',
      customer: 'Sheffield',
      model: '40',
      submittedBy: 'Mike R.',
      submittedDate: '2/7/2025',
      title: 'Integrated Ice Machine',
      description: 'Customer requests a built-in ice machine in the console area with custom plumbing and electrical work.',
      status: 'info_requested',
      priority: 'high',
      estimatedHours: 40,
      estimatedCost: 8500,
      comments: [
        {
          id: 'c1',
          author: 'Plant Manager',
          message: 'Need more details on power requirements and preferred location. Also need to verify cooling system compatibility.',
          timestamp: '2/8/2025 10:30 AM',
          type: 'info_request'
        },
        {
          id: 'c2',
          author: 'Sarah M.',
          message: 'Customer prefers 110V unit, location should be port side of console. They have a specific model in mind: Marine Ice Pro 2000.',
          timestamp: '2/8/2025 2:15 PM',
          type: 'response'
        }
      ]
    },
    {
      id: 'opt-003',
      customer: 'Magrisso',
      model: '32',
      submittedBy: 'Tom K.',
      submittedDate: '2/6/2025',
      title: 'Custom T-Top with Speakers',
      description: 'Non-standard T-top design with integrated speaker system and LED lighting, different from our standard offerings.',
      status: 'approved',
      priority: 'low',
      estimatedHours: 25,
      estimatedCost: 4200,
      comments: [
        {
          id: 'c3',
          author: 'Plant Manager',
          message: 'Approved. Standard fabrication process can accommodate this. Schedule for production.',
          timestamp: '2/7/2025 9:00 AM',
          type: 'note'
        }
      ]
    }
];

export default function CustomOptionsReview() {
  const { role, can } = useRole();

  // Initialize state with localStorage data or default data
  const [customOptions, setCustomOptions] = useState<CustomOption[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customOptions');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing custom options from localStorage:', e);
        }
      }
    }
    return defaultOptions;
  });

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [showInfoRequest, setShowInfoRequest] = useState(false);

  // Save to localStorage whenever customOptions changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('customOptions', JSON.stringify(customOptions));
    }
  }, [customOptions]);

  const handleStatusChange = (optionId: string, newStatus: CustomOption['status']) => {
    setCustomOptions(prev => prev.map(option => 
      option.id === optionId ? { ...option, status: newStatus } : option
    ));
    
    if (newStatus === 'info_requested') {
      setShowInfoRequest(true);
    }
  };

  const handleAddComment = (optionId: string, message: string, type: 'note' | 'info_request') => {
    const comment = {
      id: `c${Date.now()}`,
      author: 'Plant Manager',
      message,
      timestamp: new Date().toLocaleString(),
      type
    };

    setCustomOptions(prev => prev.map(option => 
      option.id === optionId 
        ? { ...option, comments: [...option.comments, comment] }
        : option
    ));

    setNewComment('');
    setShowInfoRequest(false);
  };

  const getPriorityColor = (priority: CustomOption['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
    }
  };

  const getStatusColor = (status: CustomOption['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'needs_redesign': return 'bg-orange-100 text-orange-800';
      case 'info_requested': return 'bg-blue-100 text-blue-800';
      case 'not_possible': return 'bg-red-100 text-red-800';
    }
  };

  const pendingOptions = customOptions.filter(opt => opt.status === 'pending');
  const inProgressOptions = customOptions.filter(opt => opt.status === 'info_requested');
  const completedOptions = customOptions.filter(opt => 
    ['approved', 'needs_redesign', 'not_possible'].includes(opt.status)
  );

  if (!can('review_custom_options')) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Access Restricted</h2>
          <p className="text-gray-600">Only Plant Managers can access the Custom Options Review panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Custom Option Review</h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{pendingOptions.length}</span> pending review
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-800 mb-2">Pending Review</h3>
            <div className="text-3xl font-bold text-yellow-600">{pendingOptions.length}</div>
            <p className="text-sm text-yellow-600 mt-1">Awaiting PM decision</p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-800 mb-2">Info Requested</h3>
            <div className="text-3xl font-bold text-blue-600">{inProgressOptions.length}</div>
            <p className="text-sm text-blue-600 mt-1">Waiting for sales response</p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-800 mb-2">Completed</h3>
            <div className="text-3xl font-bold text-green-600">{completedOptions.length}</div>
            <p className="text-sm text-green-600 mt-1">Decisions made</p>
          </div>
        </div>

        {/* Pending Options */}
        {pendingOptions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">⏳ Pending Review</h2>
            <div className="space-y-4">
              {pendingOptions.map(option => (
                <div key={option.id} className="bg-white rounded-lg shadow-md border-l-4 border-yellow-400">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">{option.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span><strong>Customer:</strong> {option.customer} - {option.model}'</span>
                          <span><strong>Submitted:</strong> {option.submittedDate}</span>
                          <span><strong>By:</strong> {option.submittedBy}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(option.priority)}`}>
                          {option.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-6">{option.description}</p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleStatusChange(option.id, 'approved')}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleStatusChange(option.id, 'needs_redesign')}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        🔄 Needs Redesign
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOption(option.id);
                          setShowInfoRequest(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        ❓ Request Info
                      </button>
                      <button
                        onClick={() => handleStatusChange(option.id, 'not_possible')}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        ✕ Not Possible
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Request Modal */}
        {showInfoRequest && selectedOption && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Request Additional Information</h3>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="What additional information do you need from sales?"
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowInfoRequest(false);
                    setNewComment('');
                    setSelectedOption(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newComment.trim() && selectedOption) {
                      handleAddComment(selectedOption, newComment, 'info_request');
                      handleStatusChange(selectedOption, 'info_requested');
                      setSelectedOption(null);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Requested Options */}
        {inProgressOptions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">📨 Information Requested</h2>
            <div className="space-y-4">
              {inProgressOptions.map(option => (
                <div key={option.id} className="bg-white rounded-lg shadow-md border-l-4 border-blue-400">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">{option.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span><strong>Customer:</strong> {option.customer} - {option.model}'</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(option.status)}`}>
                            INFO REQUESTED
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Comment Thread */}
                    <div className="space-y-3 mb-4">
                      {option.comments.map(comment => (
                        <div key={comment.id} className={`p-3 rounded-lg ${
                          comment.type === 'info_request' ? 'bg-blue-50 border-l-4 border-blue-400' : 
                          comment.type === 'response' ? 'bg-green-50 border-l-4 border-green-400' : 
                          'bg-gray-50'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-sm text-gray-800">{comment.author}</span>
                            <span className="text-xs text-gray-500">{comment.timestamp}</span>
                          </div>
                          <p className="text-gray-700 text-sm">{comment.message}</p>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons for items with responses */}
                    {option.comments.some(c => c.type === 'response') && (
                      <div className="flex flex-wrap gap-2 pt-4 border-t">
                        <button
                          onClick={() => handleStatusChange(option.id, 'approved')}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange(option.id, 'needs_redesign')}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                          🔄 Needs Redesign
                        </button>
                        <button
                          onClick={() => handleStatusChange(option.id, 'not_possible')}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                          ✕ Not Possible
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Options */}
        {completedOptions.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">✅ Completed Reviews</h2>
            <div className="space-y-4">
              {completedOptions.map(option => (
                <div key={option.id} className={`bg-white rounded-lg shadow-md border-l-4 ${
                  option.status === 'approved' ? 'border-green-400' :
                  option.status === 'needs_redesign' ? 'border-orange-400' :
                  'border-red-400'
                }`}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">{option.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span><strong>Customer:</strong> {option.customer} - {option.model}'</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(option.status)}`}>
                        {option.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    {option.estimatedHours && option.estimatedCost && (
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Estimate:</strong> {option.estimatedHours}h | ${option.estimatedCost.toLocaleString()}
                      </div>
                    )}

                    {option.comments.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm text-gray-600 italic">
                          "{option.comments[option.comments.length - 1].message}"
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}