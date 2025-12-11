"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import { useGetAuthUserQuery } from "@/state/api";
import { signOut } from "aws-amplify/auth";
import {
  LucideIcon,
  ChevronRight,
  LogOut,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useMemo } from "react";
import { S3_IMAGE_BUCKET_URL } from "@/lib/constants";
import {
  getMainNavItems,
  getAdminNavItems,
  getReportNavItems,
  AccessContext,
} from "@/lib/navigation";

const Sidebar = () => {
  const [showDepartments, setShowDepartments] = useState(true);
  const { data: currentUser } = useGetAuthUserQuery({});
  const userDetails = currentUser?.userDetails;
  const userTeam = userDetails?.team;
  const teamRoles = userTeam?.teamRoles || [];
  const currentUserGroupId = userDetails?.groupId;

  const isTrueAdmin = userTeam?.isAdmin || teamRoles.some(tr => tr.role.name === 'ADMIN');

  // Build access context for navigation filtering
  const accessContext: AccessContext = useMemo(() => ({
    isTrueAdmin,
    teamRoles,
    groupId: currentUserGroupId,
  }), [isTrueAdmin, teamRoles, currentUserGroupId]);

  // Get filtered navigation items from centralized config
  const mainNavItems = useMemo(() => getMainNavItems(accessContext), [accessContext]);
  const adminNavItems = useMemo(() => getAdminNavItems(accessContext), [accessContext]);
  const reportNavItems = useMemo(() => getReportNavItems(accessContext), [accessContext]);

  const dispatch = useAppDispatch();
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed,
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (!currentUser) return null;
  const currentUserDetails = currentUser?.userDetails;

  return (
    <div
      className={`fixed left-0 top-0 h-screen z-40
        transition-all duration-300 ease-in-out
        bg-[var(--theme-background)]
        border-r border-[var(--theme-border)]
        shadow-xl
        ${isSidebarCollapsed ? "w-0 -translate-x-full" : "w-64 translate-x-0"}
      `}
    >
      <div className="flex h-full w-full flex-col">
        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
          {/* Main Navigation Items (Home, Teams, Groups) */}
          {mainNavItems.map((item) => (
            <SidebarLink
              key={item.id}
              icon={item.icon}
              label={item.label}
              href={item.href}
            />
          ))}

          {/* Admin Navigation Items (Users, Price Users) */}
          {adminNavItems.map((item) => (
            <SidebarLink
              key={item.id}
              icon={item.icon}
              label={item.label}
              href={item.href}
            />
          ))}

          {/* Reports/Departments Section */}
          {reportNavItems.length > 0 && (
            <div className="pt-4">
              <button
                onClick={() => setShowDepartments(!showDepartments)}
                className="w-full flex items-center justify-between px-4 py-2.5
                         text-[var(--theme-text-secondary)]
                         hover:text-[var(--theme-primary)]
                         rounded-xl transition-all duration-200
                         hover:bg-[var(--theme-surface-hover)]
                         group"
              >
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Reports
                </span>
                <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${
                  showDepartments ? 'rotate-90' : ''
                }`} />
              </button>

              {showDepartments && (
                <div className="mt-2 space-y-1 animate-fade-in-down">
                  {reportNavItems.map((item) => (
                    <SidebarLink
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      href={item.href}
                      sub={item.isSubItem}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User Section */}
        <div className="border-t border-[var(--theme-border)] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full overflow-hidden
                            border-2 border-[var(--theme-primary)]">
                {!!currentUserDetails?.profilePictureUrl ? (
                  <Image
                    src={`${S3_IMAGE_BUCKET_URL}/${currentUserDetails?.profilePictureUrl}`}
                    alt={currentUserDetails?.username || "User"}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="flex items-center justify-center w-full h-full"
                    style={{ background: `linear-gradient(to bottom right, var(--theme-primary), var(--theme-secondary))` }}
                  >
                    <User className="h-5 w-5 text-[var(--theme-text-on-primary)]" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3
                            bg-[var(--theme-success)] rounded-full
                            border-2 border-[var(--theme-background)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[var(--theme-text)] truncate text-sm">
                {currentUserDetails?.username}
              </div>
              <div className="text-xs text-[var(--theme-text-muted)]">
                Online
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                     text-[var(--theme-text-on-primary)] text-sm font-semibold rounded-xl
                     shadow-md
                     transition-all duration-300 transform hover:scale-105"
            style={{ background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))` }}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

interface SidebarLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  sub?: boolean;
}

const SidebarLink = ({ href, icon: Icon, label, sub = false }: SidebarLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} className="block">
      <div
        className={`
          relative flex items-center gap-3 px-4 py-3 rounded-xl
          transition-all duration-200 group
          ${sub ? 'ml-4' : ''}
          ${isActive
            ? 'bg-[var(--theme-surface-active)] shadow-sm'
            : 'hover:bg-[var(--theme-surface-hover)]'
          }
        `}
      >
        {isActive && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
            style={{
              background: `linear-gradient(to bottom, var(--theme-primary), var(--theme-secondary))`,
              boxShadow: `0 0 10px var(--theme-glow-color)`
            }}
          />
        )}

        <Icon className={`h-5 w-5 transition-all duration-200 ${
          isActive
            ? 'text-[var(--theme-primary)] scale-110'
            : 'text-[var(--theme-text-muted)] group-hover:text-[var(--theme-primary)] group-hover:scale-110'
        }`} />

        <span className={`font-medium transition-colors duration-200 ${
          isActive
            ? 'text-[var(--theme-primary)]'
            : 'text-[var(--theme-text-secondary)] group-hover:text-[var(--theme-primary)]'
        }`}>
          {label}
        </span>

        {isActive && (
          <div
            className="ml-auto h-2 w-2 rounded-full animate-pulse"
            style={{
              backgroundColor: 'var(--theme-primary)',
              boxShadow: `0 0 10px var(--theme-glow-color)`
            }}
          />
        )}
      </div>
    </Link>
  );
};

export default Sidebar;
