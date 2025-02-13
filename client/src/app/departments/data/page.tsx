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
      <div className="mt-4 p-4 bg-white rounded shadow">
        <h2 className="text-xl font-bold mb-4">Welcome to Data Department</h2>
        <div className="bg-green-50 p-4 rounded mb-4">
          <h3 className="font-semibold mb-2">Admin Access Granted</h3>
          <p>Team: {userTeam.teamName}</p>
          <p className="text-green-600">Access Level: Admin</p>
        </div>
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Confidential Data</h3>
          <p className="text-gray-700">
            This is a restricted page only visible to admin team members.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataPage;
