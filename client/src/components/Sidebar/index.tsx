"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import { useGetAuthUserQuery } from "@/state/api";
import { hasRole, hasAnyRole } from "@/lib/accessControl";
import { signOut } from "aws-amplify/auth";
import {
  Home,
  Users,
  FolderKanban,
  User,
  Layers3,
  LucideIcon,
  ChevronRight,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { S3_IMAGE_BUCKET_URL } from "@/lib/constants";

const Sidebar = () => {
  const [showDepartments, setShowDepartments] = useState(true);
  const { data: currentUser } = useGetAuthUserQuery({});
  const userDetails = currentUser?.userDetails;
  const userTeam = userDetails?.team;
  const teamRoles = userTeam?.teamRoles || [];
  const currentUserGroupId = userDetails?.groupId;

  const isTrueAdmin = userTeam?.isAdmin || teamRoles.some(tr => tr.role.name === 'ADMIN');
  const isLocationAdminRolePresent = teamRoles.some(tr => tr.role.name === 'LOCATION_ADMIN');

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
          <SidebarLink icon={Home} label="Home" href="/home" />

          {isTrueAdmin && (
            <SidebarLink icon={User} label="Users" href="/users" />
          )}

          <SidebarLink icon={Users} label="Teams" href="/teams" />

          {(isTrueAdmin || (isLocationAdminRolePresent && !!currentUserGroupId)) && (
            <SidebarLink icon={FolderKanban} label="Groups" href="/groups" />
          )}

          {hasRole(teamRoles, 'PRICE_ADMIN') && (
            <SidebarLink icon={User} label="Price Users" href="/price-users" />
          )}

          {/* Departments Section */}
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
                {(isTrueAdmin || hasRole(teamRoles, 'DATA')) && (
                  <SidebarLink icon={Layers3} label="Rewards Transactions" href="/departments/data" sub />
                )}

                {(isTrueAdmin || hasRole(teamRoles, 'SCANS')) && (
                  <SidebarLink icon={Layers3} label="% of Scans" href="/departments/percent-of-scans" sub />
                )}

                {(isTrueAdmin || hasRole(teamRoles, 'REPORTING')) && (
                  <SidebarLink icon={Layers3} label="Reporting" href="/departments/reporting" sub />
                )}

                {(isTrueAdmin || hasRole(teamRoles, 'RAW_DATA')) && (
                  <SidebarLink icon={Layers3} label="Raw Data" href="/departments/raw-data" sub />
                )}

                {hasAnyRole(teamRoles, ['LOCATION_ADMIN', 'ADMIN', 'PRICE_ADMIN']) && (
                  <SidebarLink icon={Layers3} label="Price Portal" href="/departments/price-portal" sub />
                )}
              </div>
            )}
          </div>
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
