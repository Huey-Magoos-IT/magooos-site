"use client";

import { useGetAuthUserQuery } from "@/state/api";
import Header from "@/components/Header";
import Link from "next/link";
import { hasRole } from "@/lib/accessControl";

const DataPage = () => {
  const { data: authData, isLoading, error } = useGetAuthUserQuery({});
  const userTeam = authData?.userDetails?.team;
  
  // Check if user's team has DATA role access
  const hasAccess = userTeam && (userTeam.isAdmin || hasRole(userTeam.teamRoles, 'DATA'));

  if (isLoading) {
    return <div className="m-5 p-4">Loading...</div>;
  }

  if (error) {
    return <div className="m-5 p-4">Error: {error.toString()}</div>;
  }

  if (!hasAccess) {
    return (
      <div className="m-5 p-4">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 dark:bg-red-900 dark:text-red-100 dark:border-red-700">
          <p>Access Denied: This page is only accessible to teams with DATA role access.</p>
          <Link href="/teams" className="text-blue-500 hover:underline mt-2 inline-block dark:text-blue-300">
            Go to Teams Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="m-5 p-4">
      <Header name="Data Department" />
      <div className="mt-4 p-4 bg-white rounded shadow dark:bg-dark-secondary">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Welcome to Data Department</h2>
        <div className="bg-green-50 p-4 rounded mb-4 dark:bg-green-900 dark:text-green-100">
          <h3 className="font-semibold mb-2">DATA Access Successful</h3>
          <p className="dark:text-green-300">Team: {userTeam.teamName}</p>
          <div className="mt-2">
            <p className="text-green-600 dark:text-green-300">Roles:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {userTeam.teamRoles?.map(tr => (
                <span key={tr.id} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full dark:bg-green-800 dark:text-green-100">
                  {tr.role.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataPage;
