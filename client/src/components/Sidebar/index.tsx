"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import { useGetAuthUserQuery, useGetProjectsQuery } from "@/state/api";
import { hasRole, hasAnyRole } from "@/lib/accessControl";
import { signOut } from "aws-amplify/auth";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Briefcase,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Home,
  Layers3,
  LockIcon,
  LucideIcon,
  Search,
  Settings,
  ShieldAlert,
  User,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

const Sidebar = () => {
  const [showProjects, setShowProjects] = useState(true);
  const [showDepartments, setShowDepartments] = useState(true);
  const { data: currentUser } = useGetAuthUserQuery({});
  const { data: projects } = useGetProjectsQuery();
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

  const sidebarClassNames = `fixed flex flex-col h-[100%] justify-between shadow-2xl
    transition-all duration-300 h-full z-40 overflow-y-auto
    bg-gradient-to-b from-white via-blue-50/30 to-white
    dark:from-dark-bg dark:via-dark-secondary dark:to-dark-bg
    border-r border-gray-200/50 dark:border-stroke-dark/50
    ${isSidebarCollapsed ? "w-0 hidden" : "w-64"}
  `;

  return (
    <div className={sidebarClassNames}>
      <div className="flex h-[100%] w-full flex-col justify-start">
        {/* TOP LOGO */}
        <div className="z-50 flex min-h-[70px] w-64 items-center justify-between 
                      border-b border-gray-200/70 dark:border-stroke-dark/70 
                      bg-white/90 dark:bg-dark-bg/90 backdrop-blur-sm
                      px-6 py-3 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Image
                src="https://huey-site-images.s3.us-east-2.amazonaws.com/g_with_tm_black-01.png"
                alt="Logo"
                width={40}
                height={40}
                className="block dark:hidden transition-transform duration-300 hover:scale-110"
              />
              <Image
                src="https://huey-site-images.s3.us-east-2.amazonaws.com/g_with_tm_white-01.png"
                alt="Logo"
                width={40}
                height={40}
                className="hidden dark:block transition-transform duration-300 hover:scale-110"
              />
              <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl opacity-0 
                           group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 
                          dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Huey Magoo&apos;s
            </div>
          </div>
          {isSidebarCollapsed ? null : (
            <button
              className="py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
                       transition-all duration-200 group"
              onClick={() => {
                dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
              }}
            >
              <X className="h-6 w-6 text-gray-600 dark:text-gray-400 
                          group-hover:text-gray-900 dark:group-hover:text-white 
                          group-hover:rotate-90 transition-all duration-300" />
            </button>
          )}
        </div>

        {/* NAVBAR LINKS */}
        <nav className="z-10 w-full px-3 py-4 space-y-1">
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
        </nav>

        {/* DEPARTMENTS LINKS */}
        <div className="px-3">
          <button
            onClick={() => setShowDepartments((prev) => !prev)}
            className="flex w-full items-center justify-between px-5 py-3 
                     text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white
                     rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50
                     transition-all duration-200 group"
          >
            <span className="font-medium">Departments</span>
            {showDepartments ? (
              <ChevronUp className="h-5 w-5 group-hover:translate-y-[-2px] transition-transform duration-200" />
            ) : (
              <ChevronDown className="h-5 w-5 group-hover:translate-y-[2px] transition-transform duration-200" />
            )}
          </button>
          
          {showDepartments && (
            <div className="mt-1 space-y-1 animate-fade-in-down">
              {(isTrueAdmin || hasRole(teamRoles, 'DATA')) && (
                <SidebarLink
                  icon={Layers3}
                  label="Data"
                  href="/departments/data"
                />
              )}
              
              {(isTrueAdmin || hasRole(teamRoles, 'SCANS')) && (
                <SidebarLink
                  icon={Layers3}
                  label="% of Scans"
                  href="/departments/percent-of-scans"
                />
              )}
              
              {(isTrueAdmin || hasRole(teamRoles, 'REPORTING')) && (
                <SidebarLink
                  icon={Layers3}
                  label="Reporting"
                  href="/departments/reporting"
                />
              )}
              
              {(isTrueAdmin || hasRole(teamRoles, 'RAW_DATA')) && (
                <SidebarLink
                  icon={Layers3}
                  label="Raw Data"
                  href="/departments/raw-data"
                />
              )}

              {hasAnyRole(teamRoles, ['LOCATION_ADMIN', 'ADMIN', 'PRICE_ADMIN']) && (
                <SidebarLink
                  icon={Layers3}
                  label="Price Portal"
                  href="/departments/price-portal"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* USER SECTION AT BOTTOM */}
      <div className="z-10 mt-auto flex w-full flex-col items-center gap-4 
                    bg-gradient-to-t from-white via-blue-50/30 to-transparent
                    dark:from-dark-bg dark:via-dark-secondary/50 dark:to-transparent
                    px-4 py-4 border-t border-gray-200/50 dark:border-stroke-dark/50
                    backdrop-blur-sm md:hidden">
        <div className="flex w-full items-center gap-3">
          <div className="relative">
            <div className="align-center flex h-10 w-10 justify-center rounded-full 
                          border-2 border-blue-200 dark:border-blue-800 overflow-hidden
                          shadow-md hover:shadow-lg transition-all duration-300
                          hover:scale-110">
              {!!currentUserDetails?.profilePictureUrl ? (
                <Image
                  src={`https://huey-site-images.s3.us-east-2.amazonaws.com/${currentUserDetails?.profilePictureUrl}`}
                  alt={currentUserDetails?.username || "User Profile Picture"}
                  width={100}
                  height={50}
                  className="h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full 
                              bg-gradient-to-br from-blue-400 to-indigo-500">
                  <User className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 
                          rounded-full border-2 border-white dark:border-dark-bg" />
          </div>
          <span className="flex-1 font-medium text-gray-800 dark:text-white truncate">
            {currentUserDetails?.username}
          </span>
          <button
            className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 
                     px-4 py-2 text-xs font-bold text-white 
                     hover:from-blue-600 hover:to-indigo-700
                     shadow-md hover:shadow-lg
                     transition-all duration-200 transform hover:scale-105"
            onClick={handleSignOut}
          >
            Sign out
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
}

const SidebarLink = ({ href, icon: Icon, label }: SidebarLinkProps) => {
  const pathname = usePathname();
  const isActive =
    pathname === href || (pathname === "/" && href === "/dashboard");

  return (
    <Link href={href} className="w-full block">
      <div
        className={`
          relative flex cursor-pointer items-center gap-3 
          transition-all duration-200 rounded-lg
          hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50
          dark:hover:from-blue-900/20 dark:hover:to-indigo-900/10
          ${isActive 
            ? "bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/20 shadow-sm" 
            : ""
          }
          justify-start px-5 py-3 group
        `}
      >
        {isActive && (
          <>
            <div className="absolute left-0 top-0 h-[100%] w-[4px] bg-gradient-to-b from-blue-500 to-indigo-600 
                          dark:from-blue-400 dark:to-indigo-500 rounded-r-full
                          shadow-glow-blue" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 
                          dark:from-blue-400/10 dark:to-indigo-400/5 rounded-lg" />
          </>
        )}

        <div className={`relative transition-all duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
          <Icon className={`h-5 w-5 transition-colors duration-200
            ${isActive 
              ? "text-blue-600 dark:text-blue-400" 
              : "text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
            }`} 
          />
          {isActive && (
            <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-full" />
          )}
        </div>
        
        <span className={`font-medium transition-colors duration-200
          ${isActive 
            ? "text-blue-700 dark:text-blue-300 font-semibold" 
            : "text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-300"
          }`}
        >
          {label}
        </span>

        {isActive && (
          <div className="ml-auto">
            <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400 
                          animate-pulse shadow-glow-blue" />
          </div>
        )}
      </div>
    </Link>
  );
};

export default Sidebar;
