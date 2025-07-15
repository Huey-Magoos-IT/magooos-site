import { Role, TeamRole } from "@/state/api";

// Check if user's team has required role
export const hasRole = (teamRoles: TeamRole[] | undefined, requiredRole: string): boolean => {
  if (!teamRoles || teamRoles.length === 0) return false;
  
  // Make case-insensitive comparison
  const normalizedRequiredRole = requiredRole.toUpperCase();
  
  return teamRoles.some(tr => {
    const roleName = tr.role.name.toUpperCase();
    return roleName === normalizedRequiredRole || roleName === 'ADMIN';  // ADMIN always has access
  });
};

// Check if user's team has any of the required roles
export const hasAnyRole = (teamRoles: TeamRole[] | undefined, requiredRoles: string[]): boolean => {
  if (!teamRoles || teamRoles.length === 0) return false;
  
  // Make case-insensitive comparison
  const normalizedRequiredRoles = requiredRoles.map(role => role.toUpperCase());
  
  return teamRoles.some(tr => {
    const roleName = tr.role.name.toUpperCase();
    return normalizedRequiredRoles.includes(roleName) || roleName === 'ADMIN';  // ADMIN always has access
  });
};

// Check if user has access to a specific location
export const hasLocationAccess = (userLocations: string[] | undefined, locationId: string): boolean => {
  if (!userLocations || userLocations.length === 0) return false;
  return userLocations.includes(locationId);
};

// Check if locationAdmin has access to a specific group
export const hasGroupAccess = (userGroupId: number | null | undefined, groupId: number): boolean => {
  if (!userGroupId) return false;
  return userGroupId === groupId;
};

// Check if user is a LocationAdmin
export const isLocationAdmin = (teamRoles: TeamRole[] | undefined): boolean => {
  if (!teamRoles || teamRoles.length === 0) return false;
  return teamRoles.some(tr => tr.role.name === 'LOCATION_ADMIN' || tr.role.name === 'ADMIN');
};

// Check if user is a LocationUser
export const isLocationUser = (teamRoles: TeamRole[] | undefined): boolean => {
  if (!teamRoles || teamRoles.length === 0) return false;
  return teamRoles.some(tr => tr.role.name === 'LOCATION_USER');
};

// Check if user is a PriceUser
export const isPriceUser = (teamRoles: TeamRole[] | undefined): boolean => {
  if (!teamRoles || teamRoles.length === 0) return false;
  return teamRoles.some(tr => tr.role.name === 'PRICE_USER');
};

// Check if user is a PriceAdmin
export const isPriceAdmin = (teamRoles: TeamRole[] | undefined): boolean => {
  if (!teamRoles || teamRoles.length === 0) return false;
  return teamRoles.some(tr => tr.role.name === 'PRICE_ADMIN' || tr.role.name === 'ADMIN');
};