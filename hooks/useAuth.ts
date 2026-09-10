
import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export const useAuth = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AppProvider');
  }
  const { user, userData, login, register, vendorRegister, updateVendorProfile, logout } = context;
  return { user, userData, login, register, vendorRegister, updateVendorProfile, logout };
};
