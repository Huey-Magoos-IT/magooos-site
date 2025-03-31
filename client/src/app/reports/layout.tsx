"use client";

import React from "react";
import { useGetAuthUserQuery } from "@/state/api";
import { hasRole } from "@/lib/accessControl";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: currentUser } = useGetAuthUserQuery({});
  const userTeam = currentUser?.userDetails?.team;
  const isAdmin = userTeam?.isAdmin;
  const teamRoles = userTeam?.teamRoles;
  
  // Check if user's team has REPORTING role access
  const hasAccess = userTeam && (userTeam.isAdmin || hasRole(teamRoles, 'REPORTING'));
  
  if (!hasAccess) {
    return (
      <div className="m-5 p-4">
        <div className="bg-red-50 p-4 rounded-md mb-4 border-l-4 border-red-500 text-red-700 shadow-md dark:bg-red-900/20 dark:border-red-700 dark:text-red-200">
          <p className="font-medium">Access Denied: This page is only accessible to teams with REPORTING role access.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {children}
    </div>
  );
}