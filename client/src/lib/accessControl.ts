import { Role, TeamRole } from "@/state/api";

// Check if user's team has required role
export const hasRole = (teamRoles: TeamRole[] | undefined, requiredRole: string): boolean => {
  if (!teamRoles || teamRoles.length === 0) return false;
  
  console.log("Checking roles:", teamRoles.map(tr => tr.role.name));
  console.log("Required role:", requiredRole);
  
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
  
  return teamRoles.some(tr => 
    requiredRoles.includes(tr.role.name) || tr.role.name === 'ADMIN'  // ADMIN always has access
  );
};