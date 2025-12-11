import {
  Home,
  Users,
  User,
  FolderKanban,
  Layers3,
  FileText,
  TrendingUp,
  Activity,
  Database,
  LucideIcon,
} from "lucide-react";
import { TeamRole } from "@/state/api";
import { hasRole, hasAnyRole } from "./accessControl";

/**
 * Navigation Configuration
 *
 * Single source of truth for all navigation items.
 * Used by both Sidebar and Home page to ensure consistency.
 *
 * When adding a new page:
 * 1. Add entry here with appropriate canAccess function
 * 2. Both Sidebar and Home page will automatically reflect the change
 */

export interface AccessContext {
  isTrueAdmin: boolean;
  teamRoles: TeamRole[];
  groupId: number | null | undefined;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Returns true if user can access this item */
  canAccess: (context: AccessContext) => boolean;
  /** Whether to show in the Home page Quick Actions */
  showOnHome: boolean;
  /** Lower number = higher priority on home page (1-10) */
  homePriority?: number;
  /** Category for grouping in sidebar */
  category: 'main' | 'reports' | 'admin';
  /** Whether this is a sub-item (indented in sidebar) */
  isSubItem?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  // ============================================
  // MAIN NAVIGATION
  // ============================================
  {
    id: "home",
    label: "Home",
    href: "/home",
    icon: Home,
    canAccess: () => true,
    showOnHome: false, // Don't show "go to home" on home page
    category: "main",
  },
  {
    id: "teams",
    label: "Teams",
    href: "/teams",
    icon: Users,
    canAccess: () => true,
    showOnHome: true,
    homePriority: 4,
    category: "main",
  },
  {
    id: "groups",
    label: "Groups",
    href: "/groups",
    icon: FolderKanban,
    canAccess: ({ isTrueAdmin, teamRoles, groupId }) =>
      isTrueAdmin || (hasRole(teamRoles, "LOCATION_ADMIN") && !!groupId),
    showOnHome: true,
    homePriority: 5,
    category: "main",
  },

  // ============================================
  // ADMIN-ONLY NAVIGATION
  // ============================================
  {
    id: "users",
    label: "Users",
    href: "/users",
    icon: User,
    canAccess: ({ isTrueAdmin }) => isTrueAdmin,
    showOnHome: false, // Admin-only, not a quick action
    category: "admin",
  },
  {
    id: "price-users",
    label: "Price Users",
    href: "/price-users",
    icon: User,
    canAccess: ({ teamRoles }) => hasRole(teamRoles, "PRICE_ADMIN"),
    showOnHome: false,
    category: "admin",
  },

  // ============================================
  // REPORTS / DEPARTMENTS
  // ============================================
  {
    id: "rewards-transactions",
    label: "Rewards Transactions",
    href: "/departments/data",
    icon: FileText,
    canAccess: ({ isTrueAdmin, teamRoles }) =>
      isTrueAdmin || hasRole(teamRoles, "DATA"),
    showOnHome: true,
    homePriority: 1,
    category: "reports",
    isSubItem: true,
  },
  {
    id: "percent-of-scans",
    label: "% of Scans",
    href: "/departments/percent-of-scans",
    icon: Activity,
    canAccess: ({ isTrueAdmin, teamRoles }) =>
      isTrueAdmin || hasRole(teamRoles, "SCANS"),
    showOnHome: true,
    homePriority: 2,
    category: "reports",
    isSubItem: true,
  },
  {
    id: "red-flag-reports",
    label: "Red Flag Reports",
    href: "/departments/reporting",
    icon: Layers3,
    canAccess: ({ isTrueAdmin, teamRoles }) =>
      isTrueAdmin || hasRole(teamRoles, "REPORTING"),
    showOnHome: true,
    homePriority: 3,
    category: "reports",
    isSubItem: true,
  },
  {
    id: "raw-data",
    label: "Raw Data",
    href: "/departments/raw-data",
    icon: Database,
    canAccess: ({ isTrueAdmin, teamRoles }) =>
      isTrueAdmin || hasRole(teamRoles, "RAW_DATA"),
    showOnHome: false, // Less common, not a quick action
    category: "reports",
    isSubItem: true,
  },
  {
    id: "price-portal",
    label: "Price Portal",
    href: "/departments/price-portal",
    icon: TrendingUp,
    canAccess: ({ teamRoles }) =>
      hasAnyRole(teamRoles, ["LOCATION_ADMIN", "ADMIN", "PRICE_ADMIN"]),
    showOnHome: true,
    homePriority: 2,
    category: "reports",
    isSubItem: true,
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get navigation items filtered by access and category
 */
export function getAccessibleNavItems(
  context: AccessContext,
  category?: NavItem["category"]
): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    const hasAccess = item.canAccess(context);
    const matchesCategory = !category || item.category === category;
    return hasAccess && matchesCategory;
  });
}

/**
 * Get items for the Home page Quick Actions section
 * Returns only accessible items marked for home display, sorted by priority
 */
export function getHomeQuickActions(
  context: AccessContext,
  maxItems: number = 4
): NavItem[] {
  return NAV_ITEMS
    .filter((item) => item.showOnHome && item.canAccess(context))
    .sort((a, b) => (a.homePriority || 99) - (b.homePriority || 99))
    .slice(0, maxItems);
}

/**
 * Get main navigation items (non-report, non-admin)
 */
export function getMainNavItems(context: AccessContext): NavItem[] {
  return getAccessibleNavItems(context, "main");
}

/**
 * Get report/department navigation items
 */
export function getReportNavItems(context: AccessContext): NavItem[] {
  return getAccessibleNavItems(context, "reports");
}

/**
 * Get admin-only navigation items
 */
export function getAdminNavItems(context: AccessContext): NavItem[] {
  return getAccessibleNavItems(context, "admin");
}

/**
 * Check if a specific nav item is accessible
 */
export function canAccessNavItem(
  context: AccessContext,
  itemId: string
): boolean {
  const item = NAV_ITEMS.find((i) => i.id === itemId);
  return item ? item.canAccess(context) : false;
}
