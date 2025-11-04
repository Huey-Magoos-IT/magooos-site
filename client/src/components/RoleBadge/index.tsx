"use client";

import React from "react";
import { Tooltip } from "@mui/material";

interface RoleBadgeProps {
  roleName: string;
  description?: string;
  className?: string;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({
  roleName,
  description,
  className = "",
}) => {
  // Define colors based on role name
  const getRoleColor = (role: string): string => {
    const roleUpper = role.toUpperCase();
    switch (roleUpper) {
      case "ADMIN":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
      case "DATA":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200";
      case "REPORTING":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const badgeContent = (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(
        roleName
      )} ${className}`}
    >
      {roleName}
    </span>
  );

  // If there's a description, wrap in a tooltip
  if (description) {
    return (
      <Tooltip title={description} arrow placement="top">
        {badgeContent}
      </Tooltip>
    );
  }

  return badgeContent;
};

export default RoleBadge;