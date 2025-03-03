"use client";

import { useGetAuthUserQuery } from "@/state/api";
import Header from "@/components/Header";
import Link from "next/link";

const DataPage = () => {
  const { data: authData, isLoading, error } = useGetAuthUserQuery({});
  const userTeam = authData?.userDetails?.team;

  if (isLoading) {
    return <div className="m-5 p-4">Loading...</div>;
  }

  if (error) {
    return <div className="m-5 p-4">Error: {error.toString()}</div>;
  }

  if (!userTeam?.isAdmin) {
    return (
      <div className="m-5 p-4">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>Access Denied: This page is only accessible to admin team members.</p>
          <Link href="/teams" className="text-blue-500 hover:underline mt-2 inline-block">
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
        <div className="bg-green-50 p-4 rounded mb-4 dark:bg-dark-tertiary">
          <h3 className="font-semibold mb-2 dark:text-white">Admin Access Successful</h3>
          <p className="dark:text-neutral-400">Team: {userTeam.teamName}</p>
          <p className="text-green-600 dark:text-green-400">Access Level: Admin</p>
        </div>
      </div>
    </div>
  );
};

export default DataPage;
