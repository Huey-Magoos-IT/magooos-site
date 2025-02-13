"use client";

import { useGetAuthUserQuery } from "@/state/api";
import Header from "@/components/Header";

const DataPage = () => {
  const { data: authData, isLoading, error } = useGetAuthUserQuery({});
  const userTeam = authData?.userDetails?.team;

  if (isLoading) {
    return <div className="m-5 p-4">Loading...</div>;
  }

  if (error) {
    return <div className="m-5 p-4">Error: {error.toString()}</div>;
  }

  if (!userTeam) {
    return <div className="m-5 p-4">Error: No team assigned</div>;
  }

  if (!userTeam.isAdmin) {
    return <div className="m-5 p-4">Access Denied: Admin team access required</div>;
  }

  return (
    <div className="m-5 p-4">
      <Header name="Data Department" />
      <div className="mt-4 p-4 bg-white rounded shadow">
        <h2 className="text-xl font-bold mb-4">Welcome to Data Department</h2>
        <p className="text-gray-700">
          Test line for data page access control. Only admin team members can see this.
        </p>
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            Current user: {authData?.userDetails?.username}<br />
            Team: {userTeam.teamName}<br />
            Access Level: {userTeam.isAdmin ? 'Admin' : 'Regular'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataPage;