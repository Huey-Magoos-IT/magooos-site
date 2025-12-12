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
 * Navigation Configuration - Single Source of Truth
 *
 * This file controls what appears in BOTH the Sidebar and Home page Quick Actions.
 * When you add/modify entries here, both components automatically update.
 *
 * ============================================================================
 * HOW TO ADD A NEW PAGE
 * ============================================================================
 *
 * 1. Import the icon at the top of this file (from lucide-react)
 * 2. Add a new entry to the NAV_ITEMS array with the following properties:
 *
 * EXAMPLE - Adding a new report that requires the "INVENTORY" role:
 *
 *   {
 *     id: "inventory-report",           // Unique identifier (kebab-case)
 *     label: "Inventory Report",        // Display name in UI
 *     href: "/departments/inventory",   // Route path
 *     icon: Package,                    // Lucide icon component
 *     canAccess: ({ isTrueAdmin, teamRoles }) =>
 *       isTrueAdmin || hasRole(teamRoles, "INVENTORY"),
 *     showOnHome: true,                 // Show in Home page Quick Actions?
 *     homePriority: 3,                  // Lower = higher priority (1-10)
 *     category: "reports",              // "main" | "reports" | "admin"
 *     isSubItem: true,                  // Indent in sidebar (for reports)
 *   },
 *
 * ============================================================================
 * PROPERTY REFERENCE
 * ============================================================================
 *
 * id           - Unique string identifier for the nav item
 * label        - Text displayed in sidebar and home page
 * href         - The route/URL path
 * icon         - Lucide React icon component
 * canAccess    - Function that returns true if user can see this item
 *                Receives: { isTrueAdmin, teamRoles, groupId }
 * showOnHome   - Whether to display in Home page Quick Actions
 * homePriority - Order in Quick Actions (1 = first, higher = later)
 * category     - Determines where it appears in sidebar:
 *                - "main": Top section (Home, Teams, Groups)
 *                - "admin": Admin section (Users, Price Users)
 *                - "reports": Collapsible Reports section
 * isSubItem    - If true, indented in sidebar (use for reports)
 *
 * ============================================================================
 * ACCESS CONTROL PATTERNS
 * ============================================================================
 *
 * Everyone can access:
 *   canAccess: () => true
 *
 * Admin only:
 *   canAccess: ({ isTrueAdmin }) => isTrueAdmin
 *
 * Specific role (admins always have access via hasRole):
 *   canAccess: ({ isTrueAdmin, teamRoles }) =>
 *     isTrueAdmin || hasRole(teamRoles, "ROLE_NAME")
 *
 * Multiple roles (any of):
 *   canAccess: ({ teamRoles }) =>
 *     hasAnyRole(teamRoles, ["ROLE_A", "ROLE_B", "ADMIN"])
 *
 * Role + condition (e.g., Location Admin with assigned group):
 *   canAccess: ({ isTrueAdmin, teamRoles, groupId }) =>
 *     isTrueAdmin || (hasRole(teamRoles, "LOCATION_ADMIN") && !!groupId)
 *
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
      hasAnyRole(teamRoles, ["PRICE_USER", "PRICE_ADMIN", "ADMIN"]),
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
