import { Utilisateur } from '../types';

export function canPerformAction(user: Utilisateur | null, action: 'create' | 'modify' | 'delete' | 'manage_users' | 'sensitive_settings'): boolean {
  if (!user) return false;
  
  if (user.role === 'admin' || user.role === 'directeur') {
    return true; // Admin can do everything
  }

  if (user.role === 'comptable') {
    // Accountant can create/modify financial entries (ventes, achats, reglements) but cannot manage users or sensitive settings
    if (action === 'manage_users' || action === 'sensitive_settings') {
      return false;
    }
    return action === 'create' || action === 'modify';
  }

  if (user.role === 'caissier' || user.role === 'agent') {
    // Cashier can create sales, register payments, but cannot delete records, manage users, or modify sensitive settings
    if (action === 'delete' || action === 'manage_users' || action === 'sensitive_settings') {
      return false;
    }
    return action === 'create' || action === 'modify';
  }

  return false;
}

export function canAccessTab(user: Utilisateur | null, tabId: string): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'directeur') return true;

  if (user.role === 'comptable') {
    const allowed = ['dashboard', 'ventes', 'achats', 'credits', 'caisse'];
    return allowed.includes(tabId);
  }

  if (user.role === 'caissier' || user.role === 'agent') {
    const allowed = ['articles', 'stock', 'caisse', 'ventes', 'clients'];
    return allowed.includes(tabId);
  }

  return false;
}
