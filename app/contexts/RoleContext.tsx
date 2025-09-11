'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole, UserPermissions } from '../lib/types';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  permissions: UserPermissions;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// Permission mapping based on role
const getPermissions = (role: UserRole): UserPermissions => {
  switch (role) {
    case 'employee':
      return {
        canEditOptions: false,
        canMoveDates: false, 
        canFinalizeConfig: false,
        canViewPicklist: true,
        canPickItems: true,
      };
    case 'floor_manager':
      return {
        canEditOptions: false,
        canMoveDates: true,
        canFinalizeConfig: false,
        canViewPicklist: true,
        canPickItems: true,
      };
    case 'admin':
      return {
        canEditOptions: true,
        canMoveDates: true,
        canFinalizeConfig: true,
        canViewPicklist: true,
        canPickItems: true,
      };
  }
};

interface RoleProviderProps {
  children: ReactNode;
}

export function RoleProvider({ children }: RoleProviderProps) {
  const [role, setRole] = useState<UserRole>('employee');
  const permissions = getPermissions(role);

  return (
    <RoleContext.Provider value={{ role, setRole, permissions }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}