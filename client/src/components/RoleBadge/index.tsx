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
        return "bg-[var(--theme-error)]/20 text-[var(--theme-error)]";
      case "DATA":
        return "bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]";
      case "REPORTING":
        return "bg-[var(--theme-success)]/20 text-[var(--theme-success)]";
      default:
        return "bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)]";
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