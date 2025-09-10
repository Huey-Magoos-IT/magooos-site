"use client";

import { useGetAuthUserQuery } from "@/state/api";
import Header from "@/components/Header";
import React from "react";

const Settings = () => {
  const { data: authData, isLoading } = useGetAuthUserQuery({});
  const userDetails = authData?.userDetails;

  const labelStyles = "block text-sm font-medium dark:text-white";
  const textStyles =
    "mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 dark:text-white";

  if (isLoading) {
    return (
      <div className="p-8">
        <Header name="Settings" />
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Header name="Settings" />
      <div className="space-y-4">
        <div>
          <label className={labelStyles}>Username</label>
          <div className={textStyles}>{userDetails?.username || 'Not set'}</div>
        </div>
        <div>
          <label className={labelStyles}>Team</label>
          <div className={textStyles}>{userDetails?.team?.teamName || 'No team'}</div>
        </div>
        <div>
          <label className={labelStyles}>Email</label>
          <div className={textStyles}>{userDetails?.email || 'Not available'}</div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
