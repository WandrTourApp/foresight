import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Clock, AlertTriangle, CheckCircle, Circle, RefreshCw, Filter, Search, StickyNote, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useRole } from './role-context';
import { 
  FG_STATUS_LABEL,
  ISSUE_ICONS,
  computeOverallPercentFromFiberglass,
  getBoatColorHex,
  type FGStatus
} from '../lib/build-utils';

// Mock data - in a real app, this would come from an API
const mockBoats = [
  {
    id: 'B26-WELLGUIDED',
    customer: 'Well Guided',
    model: '26 Open',
    status: 'lamination',
    notes: ['Customer requested custom leaning post.'],
    parts: [
      { name: '26\' Hull', category: 'Hull', status: 'in-progress', department: 'lamination' },
      { name: 'Open Deck', category: 'Deck', status: 'waiting', department: 'lamination' },
    ]
  },
  {
    id: 'B25-001',
    customer: 'Johnson, Steve',
    model: '26 Open',
    status: 'assembly',
    notes: [],
    parts: [
      { name: '26\' Hull', category: 'Hull', status: 'complete', department: 'lamination' },
      { name: 'Open Deck', category: 'Deck', status: 'complete', department: 'lamination' },
      { name: 'Open Liner w/ Fwd Seating', category: 'Liner', status: 'in-progress', department: 'assembly' },
      { name: 'Console', category: 'Console', status: 'waiting', department: 'assembly' },
    ]
  },
  {
    id: 'B25-002',
    customer: 'Goldman Marine',
    model: '26 Open',
    status: 'finishing',
    notes: ['Color mismatch on console reported.', 'Awaiting sign-off on rework.'],
    parts: [
        { name: '26\' Hull', category: 'Hull', status: 'complete', department: 'lamination' },
        { name: 'Open Deck', category: 'Deck', status: 'complete', department: 'lamination' },
        { name: 'Open Liner Standard', category: 'Liner', status: 'complete', department: 'assembly' },
        { name: 'Console', category: 'Console', status: 'problem', department: 'finishing' },
    ]
  },
];

const PART_CATEGORIES = {
  'Hull': ['26\' Hull', '40\' Hull XL'],
  'Deck': ['Open Deck', 'Bay Deck XL'],
  'Liner': ['Open Liner Standard', 'Open Liner w/ Forward Seating'],
  'Console': ['Console', 'Console Door', 'Console Liner'],
  // Add other categories as needed
};

const statusIcons = {
  'waiting': <Circle className="text-gray-400" />,
  'in-progress': <RefreshCw className="text-blue-500 animate-spin" />,
  'complete': <CheckCircle className="text-green-500" />,
  'problem': <AlertTriangle className="text-red-500" />,
};

const BoatCard = ({ boat, onToggle, isExpanded, onOpenNotes }) => {
    const { role } = useRole();
    const canEditNotes = role === 'admin' || role === 'plant_manager' || role === 'floor_manager';
    const colorHex = getBoatColorHex(boat.color);
    
    // Mock data - in real app would compute from actual parts data
    const mockFgLines = [{ status: 'in_mold' as FGStatus }];
    const overallPercent = computeOverallPercentFromFiberglass(mockFgLines);
    
    // Other Parts Missing calculation (non-fiberglass)
    const mockOtherParts = { missing: 15, total: 45 }; // Would be computed from BOM
    
    // Calculate issue icons based on boat issues
    const issues = [
        boat.issueMissingParts && ISSUE_ICONS.missing,
        boat.issueGelcoat && ISSUE_ICONS.gelcoat,
        boat.issueOtherDelay && ISSUE_ICONS.other
    ].filter(Boolean);

    const partsByCategory = (boat.parts || []).reduce((acc, part) => {
        const category = part.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(part);
        return acc;
    }, {});

    return (
        <div id={`boat-${boat.id}`} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="p-4 cursor-pointer hover:bg-gray-50" onClick={onToggle}>
                <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3 flex-1">
                        <div className="w-4 h-4 rounded-full bg-blue-500 mt-0.5" style={colorHex ? {backgroundColor: colorHex} : {}}></div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-800">{boat.customer}</h3>
                            <p className="text-sm text-gray-600">{boat.id} - {boat.model}</p>
                            
                            <div className="mt-2 flex items-center space-x-4">
                                <div className="text-sm font-medium text-gray-700">
                                    {overallPercent}% complete
                                </div>
                                <div className="text-sm text-gray-600">
                                    Other Parts Missing: {mockOtherParts.missing} / {mockOtherParts.total}
                                </div>
                                {issues.length > 0 && (
                                    <div className="flex space-x-1">
                                        {issues.map((icon, idx) => (
                                            <span key={idx} className="text-sm">{icon}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-2">
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
                                    {boat.status || 'In Progress'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                        {isExpanded ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                    {/* Summary Section */}
                    <div className="p-4 border-b border-gray-200 bg-white">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-md text-gray-700">Summary</h4>
                            <button className="text-xs text-gray-500 hover:text-gray-700">
                                {isExpanded ? 'Collapse' : 'Expand'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-2xl font-bold text-blue-600">{overallPercent}%</div>
                                <div className="text-sm text-gray-600">Overall Progress</div>
                            </div>
                            <div>
                                <div className="text-lg font-semibold text-gray-800">{mockOtherParts.missing} / {mockOtherParts.total}</div>
                                <div className="text-sm text-gray-600">Other Parts Missing</div>
                            </div>
                        </div>
                        {issues.length > 0 && (
                            <div className="mt-3 p-2 bg-red-50 rounded-md">
                                <div className="text-xs font-medium text-red-800 mb-1">Issues:</div>
                                <div className="flex flex-wrap gap-2 text-xs text-red-700">
                                    {boat.issueMissingParts && <span>• Missing parts</span>}
                                    {boat.issueGelcoat && <span>• Gelcoat issues</span>}
                                    {boat.issueOtherDelay && <span>• Other delays</span>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Collapsible Sections */}
                    <div className="divide-y divide-gray-200">
                        {/* Fiberglass Section */}
                        <CollapsibleSection title="Fiberglass" defaultOpen={true}>
                            <div className="mb-3">
                                <div className="flex space-x-2 mb-3">
                                    <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded">All</button>
                                    <button className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Remaining</button>
                                    <button className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Finished</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {/* Mock fiberglass parts with 5 statuses */}
                                {[
                                    { name: '26\' Hull', status: 'in_mold' as FGStatus },
                                    { name: 'Deck Mold', status: 'finished' as FGStatus },
                                    { name: 'Console Base', status: 'scheduled' as FGStatus },
                                ].map((part, idx) => {
                                    const statusColor = {
                                        'not_scheduled': 'bg-gray-100 text-gray-800',
                                        'scheduled': 'bg-yellow-100 text-yellow-800',
                                        'in_mold': 'bg-blue-100 text-blue-800',
                                        'out_of_mold': 'bg-purple-100 text-purple-800',
                                        'finished': 'bg-green-100 text-green-800'
                                    }[part.status] || 'bg-gray-100 text-gray-800';
                                    
                                    return (
                                        <div key={idx} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded border">
                                            <span>{part.name}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>
                                                {FG_STATUS_LABEL[part.status]}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CollapsibleSection>

                        {/* Other Parts Section */}
                        <CollapsibleSection title={`Other Parts (${mockOtherParts.missing} / ${mockOtherParts.total} Missing)`} defaultOpen={false}>
                            <div className="mb-3">
                                <div className="flex space-x-2 mb-3">
                                    <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded">Missing</button>
                                    <button className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">All</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {/* Mock other parts with different statuses */}
                                {[
                                    { name: 'Engine Mount', status: 'Not Received' },
                                    { name: 'Steering Wheel', status: 'Received' },
                                    { name: 'Navigation Lights', status: 'Not Received' },
                                    { name: 'Bilge Pump', status: 'Staged' },
                                ].map((part, idx) => {
                                    const statusColor = {
                                        'Not Received': 'bg-red-100 text-red-800',
                                        'Received': 'bg-yellow-100 text-yellow-800',
                                        'Staged': 'bg-blue-100 text-blue-800',
                                        'Installed': 'bg-green-100 text-green-800'
                                    }[part.status] || 'bg-gray-100 text-gray-800';
                                    
                                    return (
                                        <div key={idx} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded border">
                                            <span>{part.name}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>
                                                {part.status}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CollapsibleSection>

                        {/* Notes Section */}
                        <CollapsibleSection title="Notes" defaultOpen={false}>
                            <div className="text-sm text-gray-800 space-y-1 mb-3">
                                {(boat.notes && boat.notes.length > 0) ? (
                                    boat.notes.map((note, i) => <p key={i}>• {note}</p>)
                                ) : (
                                    <p className="text-gray-500 italic">No notes for this boat.</p>
                                )}
                            </div>
                            {canEditNotes && (
                                <button 
                                    onClick={() => onOpenNotes(boat.id, boat.notes)}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center">
                                    <StickyNote className="w-4 h-4 mr-2" />
                                    Edit Notes
                                </button>
                            )}
                        </CollapsibleSection>
                    </div>
                </div>
            )}
        </div>
    );
};

const CollapsibleSection = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
        <div>
            <div 
                className="p-3 bg-gray-100 cursor-pointer hover:bg-gray-200 flex justify-between items-center"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="font-medium text-gray-700 text-sm">{title}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </div>
            {isOpen && (
                <div className="p-3">
                    {children}
                </div>
            )}
        </div>
    );
};

const NotesModal = ({ boatId, initialNotes, onSave, onCancel }) => {
    const [text, setText] = useState(initialNotes.join('\n'));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                <div className="p-4 border-b">
                    <h2 className="text-lg font-bold">Edit Notes for {boatId}</h2>
                </div>
                <div className="p-4">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full h-40 p-2 border rounded-md"
                        placeholder="Enter notes, one per line..."
                    />
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2">
                    <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button onClick={() => onSave(boatId, text.split('\n').filter(n => n.trim()))} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Save Notes</button>
                </div>
            </div>
        </div>
    );
};

export default function BoatPartsTracker() {
    const [boats, setBoats] = useState(mockBoats);
    const [expandedBoat, setExpandedBoat] = useState<string | null>(null);
    const [editingNotes, setEditingNotes] = useState<{ boatId: string; notes: string[] } | null>(null);
    const searchParams = useSearchParams();

    // Handle deep-linking
    useEffect(() => {
        const boatParam = searchParams.get('boat');
        if (boatParam) {
            // Find boat by name (case-insensitive)
            const targetBoat = boats.find(b => 
                b.customer.toLowerCase() === boatParam.toLowerCase() ||
                b.id.toLowerCase() === boatParam.toLowerCase()
            );
            if (targetBoat) {
                setExpandedBoat(targetBoat.id);
                // Update document title
                document.title = `Boat Tracker - ${targetBoat.customer}`;
                // Scroll to boat (small delay to ensure rendering)
                setTimeout(() => {
                    const element = document.getElementById(`boat-${targetBoat.id}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);
            }
        } else {
            document.title = 'Boat Tracker';
        }
    }, [searchParams, boats]);

    const handleToggleBoat = (boatId: string) => {
        setExpandedBoat(prev => (prev === boatId ? null : boatId));
    };

    const handleOpenNotes = (boatId: string, notes: string[]) => {
        setEditingNotes({ boatId, notes });
    };

    const handleSaveNotes = (boatId: string, newNotes: string[]) => {
        setBoats(prev => prev.map(b => b.id === boatId ? { ...b, notes: newNotes } : b));
        setEditingNotes(null);
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Boat Tracker</h1>
                </div>

                <div className="space-y-4">
                    {boats.map(boat => (
                        <BoatCard 
                            key={boat.id} 
                            boat={boat} 
                            isExpanded={expandedBoat === boat.id}
                            onToggle={() => handleToggleBoat(boat.id)}
                            onOpenNotes={handleOpenNotes}
                        />
                    ))}
                </div>
            </div>

            {editingNotes && (
                <NotesModal 
                    boatId={editingNotes.boatId}
                    initialNotes={editingNotes.notes}
                    onSave={handleSaveNotes}
                    onCancel={() => setEditingNotes(null)}
                />
            )}
        </div>
    );
}
