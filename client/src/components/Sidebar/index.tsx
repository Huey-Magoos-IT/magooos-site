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

  const sidebarClassNames = `fixed left-0 top-0 h-screen z-40 
    transition-all duration-300 ease-in-out
    bg-gradient-to-b from-cream-100 via-orange-50/30 to-cream-100
    dark:from-dark-secondary dark:via-dark-tertiary/50 dark:to-dark-secondary
    border-r border-orange-200/50 dark:border-orange-500/20
    shadow-xl
    ${isSidebarCollapsed ? "w-0 -translate-x-full" : "w-64 translate-x-0"}
  `;

  return (
    <div className={sidebarClassNames}>
      <div className="flex h-full w-full flex-col">
        {/* Logo Section */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-orange-200/50 dark:border-orange-500/20">
          <Link href="/home" className="flex items-center gap-3 group">
            <div className="relative">
              <Image
                src="https://huey-site-images.s3.us-east-2.amazonaws.com/g_with_tm_black-01.png"
                alt="Logo"
                width={32}
                height={32}
                className="block dark:hidden group-hover:scale-110 transition-transform duration-300"
              />
              <Image
                src="https://huey-site-images.s3.us-east-2.amazonaws.com/g_with_tm_white-01.png"
                alt="Logo"
                width={32}
                height={32}
                className="hidden dark:block group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <span className="text-lg font-bold gradient-text-orange">
              Huey Magoo&apos;s
            </span>
          </Link>
        </div>

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
                       text-charcoal-600 dark:text-charcoal-300
                       hover:text-orange-600 dark:hover:text-orange-400
                       rounded-xl transition-all duration-200
                       hover:bg-orange-50/50 dark:hover:bg-orange-900/10
                       group"
            >
              <span className="text-xs font-semibold uppercase tracking-wider">
                Departments
              </span>
              <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${
                showDepartments ? 'rotate-90' : ''
              }`} />
            </button>
            
            {showDepartments && (
              <div className="mt-2 space-y-1 animate-fade-in-down">
                {(isTrueAdmin || hasRole(teamRoles, 'DATA')) && (
                  <SidebarLink icon={Layers3} label="Data" href="/departments/data" sub />
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
        <div className="border-t border-orange-200/50 dark:border-orange-500/20 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full overflow-hidden
                            border-2 border-orange-400 dark:border-orange-500">
                {!!currentUserDetails?.profilePictureUrl ? (
                  <Image
                    src={`https://huey-site-images.s3.us-east-2.amazonaws.com/${currentUserDetails?.profilePictureUrl}`}
                    alt={currentUserDetails?.username || "User"}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full
                                bg-gradient-to-br from-orange-400 to-red-500">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 
                            bg-green-500 rounded-full 
                            border-2 border-cream-100 dark:border-dark-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-charcoal-900 dark:text-cream-100 truncate text-sm">
                {currentUserDetails?.username}
              </div>
              <div className="text-xs text-charcoal-600 dark:text-charcoal-400">
                Online
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                     bg-gradient-to-r from-orange-500 to-red-500
                     hover:from-orange-600 hover:to-red-600
                     text-white text-sm font-semibold rounded-xl
                     shadow-md hover:shadow-glow-orange
                     transition-all duration-300 transform hover:scale-105"
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
            ? 'bg-gradient-to-r from-orange-100 to-red-50 dark:from-orange-900/30 dark:to-red-900/20 shadow-sm' 
            : 'hover:bg-orange-50 dark:hover:bg-orange-900/10'
          }
        `}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 
                        bg-gradient-to-b from-orange-500 to-red-500 rounded-r-full
                        shadow-glow-orange" />
        )}

        <Icon className={`h-5 w-5 transition-all duration-200 ${
          isActive 
            ? 'text-orange-600 dark:text-orange-400 scale-110' 
            : 'text-charcoal-600 dark:text-charcoal-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:scale-110'
        }`} />
        
        <span className={`font-medium transition-colors duration-200 ${
          isActive 
            ? 'text-orange-700 dark:text-orange-300' 
            : 'text-charcoal-700 dark:text-charcoal-300 group-hover:text-orange-700 dark:group-hover:text-orange-300'
        }`}>
          {label}
        </span>

        {isActive && (
          <div className="ml-auto h-2 w-2 rounded-full bg-orange-500 dark:bg-orange-400 
                        animate-pulse shadow-glow-orange" />
        )}
      </div>
    </Link>
  );
};

export default Sidebar;
