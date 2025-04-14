"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import { useGetAuthUserQuery, useGetProjectsQuery } from "@/state/api";
import { hasRole } from "@/lib/accessControl";
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
  const userTeam = currentUser?.userDetails?.team;
  const isAdmin = userTeam?.isAdmin;
  const teamRoles = userTeam?.teamRoles;
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

  const sidebarClassNames = `fixed flex flex-col h-[100%] justify-between shadow-xl
    transition-all duration-300 h-full z-40 dark:bg-black overflow-y-auto bg-white
    ${isSidebarCollapsed ? "w-0 hidden" : "w-64"}
  `;

  return (
    <div className={sidebarClassNames}>
      <div className="flex h-[100%] w-full flex-col justify-start">
        {/* TOP LOGO */}
        <div className="z-50 flex min-h-[70px] w-64 items-center justify-between border-b-[1.5px] border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-black">
          <div className="flex items-center gap-4">
            <Image
              src="https://huey-site-images.s3.us-east-2.amazonaws.com/g_with_tm_black-01.png"
              alt="Logo"
              width={40}
              height={40}
            />
            <div className="text-xl font-bold text-gray-800 dark:text-white">
              Huey Magoo&apos;s
            </div>
          </div>
          {isSidebarCollapsed ? null : (
            <button
              className="py-3"
              onClick={() => {
                dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
              }}
            >
              <X className="h-6 w-6 text-gray-800 hover:text-gray-500 dark:text-white" />
            </button>
          )}
        </div>
        {/* NAVBAR LINKS */}
        <nav className="z-10 w-full">
          <SidebarLink icon={Home} label="Home" href="/" />
          {/* Timeline link hidden as requested */}
          <SidebarLink icon={Search} label="Search" href="/search" />
          <SidebarLink icon={Settings} label="Settings" href="/settings" />
          <SidebarLink icon={User} label="Users" href="/users" />
          <SidebarLink icon={Users} label="Teams" href="/teams" />
          {/* Only show Groups link to admins and location admins */}
          {(isAdmin || hasRole(teamRoles, 'LOCATION_ADMIN')) && (
            <SidebarLink icon={FolderKanban} label="Groups" href="/groups" />
          )}
        </nav>

        {/* PROJECTS SECTION HIDDEN AS REQUESTED */}
        {/* Keeping the code commented out for future reference
        <button
          onClick={() => setShowProjects((prev) => !prev)}
          className="flex w-full items-center justify-between px-8 py-3 text-gray-500"
        >
          <span className="">Projects</span>
          {showProjects ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>
        {showProjects &&
          projects?.map((project) => (
            <SidebarLink
              key={project.id}
              icon={Briefcase}
              label={project.name}
              href={`/projects/${project.id}`}
            />
          ))}
        */}

        {/* DEPARTMENTS LINKS */}
        <button
          onClick={() => setShowDepartments((prev) => !prev)}
          className="flex w-full items-center justify-between px-8 py-3 text-gray-500"
        >
          <span className="">Departments</span>
          {showDepartments ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>
        {showDepartments && (
          <>
            {/* Show Data department if user has ADMIN or DATA role */}
            {(isAdmin || hasRole(teamRoles, 'DATA')) && (
              <SidebarLink
                icon={Layers3}
                label="Data"
                href="/departments/data"
              />
            )}
            
            {/* Show Reporting department if user has ADMIN or REPORTING role */}
            {(isAdmin || hasRole(teamRoles, 'REPORTING')) && (
              <SidebarLink
                icon={Layers3}
                label="Reporting"
                href="/departments/reporting"
              />
            )}
          </>
        )}
      </div>
      <div className="z-10 mt-32 flex w-full flex-col items-center gap-4 bg-white px-8 py-4 dark:bg-black md:hidden">
        <div className="flex w-full items-center">
          <div className="align-center flex h-9 w-9 justify-center">
            {!!currentUserDetails?.profilePictureUrl ? (
              <Image
                src={`https://huey-site-images.s3.us-east-2.amazonaws.com/${currentUserDetails?.profilePictureUrl}`}
                alt={currentUserDetails?.username || "User Profile Picture"}
                width={100}
                height={50}
                className="h-full rounded-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 cursor-pointer self-center rounded-full dark:text-white" />
            )}
          </div>
          <span className="mx-3 text-gray-800 dark:text-white">
            {currentUserDetails?.username}
          </span>
          <button
            className="self-start rounded bg-blue-400 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 md:block"
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
    <Link href={href} className="w-full">
      <div
        className={`
          relative flex cursor-pointer items-center gap-3 transition-colors
          hover:bg-blue-50 dark:hover:bg-blue-900/10
          ${isActive ? "bg-blue-100 dark:bg-blue-900/20" : ""}
          justify-start px-8 py-3
        `}
      >
        {isActive && (
          <div className="absolute left-0 top-0 h-[100%] w-[5px] bg-blue-500 dark:bg-blue-400" />
        )}

        <Icon className={`h-6 w-6 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-800 dark:text-gray-100"}`} />
        <span className={`font-medium ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-800 dark:text-gray-100"}`}>
          {label}
        </span>
      </div>
    </Link>
  );
};

export default Sidebar;
