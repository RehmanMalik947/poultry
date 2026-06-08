/**
 * Role permissions from Settings > Roles are loaded on login and stored in localStorage.
 * Use these helpers to enforce permissions in the app (sidebar already filters by them).
 */

const PERMISSIONS_KEY = 'permissions';

export function getStoredPermissions(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Returns true if user has the permission, or if user is Admin/ADMIN (full access). */
export function hasPermission(permissionId: string): boolean {
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  if (role === 'Admin' || role === 'ADMIN') return true;
  const permissions = getStoredPermissions();
  return permissions.includes(permissionId);
}

/** Returns true if user has any of the given permissions, or if user is Admin/ADMIN. */
export function hasAnyPermission(permissionIds: ReadonlyArray<string> | null): boolean {
  if (permissionIds == null || permissionIds.length === 0) return true;
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  if (role === 'Admin' || role === 'ADMIN') return true;
  const permissions = getStoredPermissions();
  return permissionIds.some((id) => permissions.includes(id));
}

/** Returns true if user is Admin or Manager (can edit/delete). Use for View + Edit + Delete actions. */
export function canManage(): boolean {
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  return role === 'Admin' || role === 'ADMIN' || role === 'Manager';
}