'use client';

import Link from 'next/link';
import { useRole, Role } from './role-context';

export default function Navbar() {
  const { role, setRole, can } = useRole();
  
  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
  };

  // Navigation pages by role - SAFELIST ONLY
  const getVisiblePages = () => {
    const pages = [];
    
    // Admin: all safelist pages including admin imports
    if (role === 'admin') {
      return ['production-schedule', 'admin/imports', 'lamination', 'assembly', 'finishing', 'rigging-26', 'rigging-40', 'stockroom', 'purchasing'];
    }
    
    // Plant Manager: all production pages
    if (role === 'plant_manager') {
      return ['production-schedule', 'lamination', 'assembly', 'finishing', 'rigging-26', 'rigging-40'];
    }
    
    // Stockroom: their dashboard + production view
    if (role === 'stockroom') {
      return ['production-schedule', 'stockroom'];
    }
    
    // Floor Manager: production schedule only
    if (role === 'floor_manager') {
      return ['production-schedule'];
    }
    
    // Employee: production schedule only
    return ['production-schedule'];
  };

  const visiblePages = getVisiblePages();

  return (
    <nav className="bg-sky-700 text-white p-4 mb-6 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex gap-6 items-center">
          <Link href="/" className="font-bold text-xl hover:text-sky-200 transition-colors">
            Foresight
          </Link>
          
          
          {visiblePages.includes('production-schedule') && (
            <Link href="/production-schedule" className="hover:text-sky-200 transition-colors">
              Production Schedule
            </Link>
          )}
          
          {visiblePages.includes('admin/imports') && (
            <Link href="/admin/imports" className="hover:text-sky-200 transition-colors">
              Import CSV
            </Link>
          )}
          
          {visiblePages.includes('lamination') && (
            <Link href="/lamination" className="hover:text-sky-200 transition-colors">
              Lamination
            </Link>
          )}
          
          {visiblePages.includes('assembly') && (
            <Link href="/assembly" className="hover:text-sky-200 transition-colors">
              Assembly
            </Link>
          )}
          
          {visiblePages.includes('finishing') && (
            <Link href="/finishing" className="hover:text-sky-200 transition-colors">
              Finishing
            </Link>
          )}
          
          {visiblePages.includes('rigging-26') && (
            <Link href="/rigging-26" className="hover:text-sky-200 transition-colors">
              Rigging 26
            </Link>
          )}
          
          {visiblePages.includes('rigging-40') && (
            <Link href="/rigging-40" className="hover:text-sky-200 transition-colors">
              Rigging 40
            </Link>
          )}
          
          {visiblePages.includes('stockroom') && (
            <Link href="/stockroom" className="hover:text-sky-200 transition-colors">
              Stockroom
            </Link>
          )}
          
          {visiblePages.includes('purchasing') && (
            <Link href="/purchasing" className="hover:text-sky-200 transition-colors">
              Purchasing
            </Link>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Role Selection - only show if SHOW_ROLE_SELECTOR is true */}
          {process.env.NEXT_PUBLIC_SHOW_ROLE_SELECTOR === 'true' ? (
            <div className="text-sm">
              <span className="text-sky-200">Role:</span>
              <select 
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as Role)}
                className="ml-2 bg-sky-600 border border-sky-500 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="employee">Employee</option>
                <option value="stockroom">Stockroom</option>
                <option value="floor_manager">Floor Manager</option>
                <option value="plant_manager">Plant Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          ) : (
            /* Read-only role badge */
            <div className="text-sm">
              <span className="text-sky-200 bg-sky-800 px-2 py-1 rounded text-xs">
                {role.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
