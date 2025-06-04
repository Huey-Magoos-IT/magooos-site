"use client";

import React from "react";
import { useGetAuthUserQuery } from "@/state/api";
import { hasRole } from "@/lib/accessControl";
import Header from "@/components/Header";

const PriceUsersPage = () => {
  const { data: userData, isLoading } = useGetAuthUserQuery({});
  const teamRoles = userData?.userDetails?.team?.teamRoles;

  // Check if user has PRICE_ADMIN role
  const hasPriceAdminAccess = hasRole(teamRoles, 'PRICE_ADMIN');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!hasPriceAdminAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-xl font-semibold text-red-600">Access Denied</div>
        <div className="text-gray-600">
          You need PRICE_ADMIN role access to view this content.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Header name="Price Users" />
      <div className="mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Price Users Management
          </h2>
          <div className="text-gray-600 dark:text-gray-300">
            <p>This page is under development.</p>
            <p className="mt-2">
              Here you will be able to manage users with price-related permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceUsersPage;