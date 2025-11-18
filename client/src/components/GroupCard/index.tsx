"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Edit, Trash2, Users, UserPlus } from "lucide-react"; // Added UserPlus
import { Group, User, useRemoveUserFromGroupMutation } from "@/state/api";

interface GroupCardProps {
  group: Group;
  onEdit?: (group: Group) => void;
  onDelete?: (groupId: number) => void;
  onManageUsers?: (group: Group) => void;
  onCreateLocationUser?: (group: Group) => void; // New prop
  isAdmin: boolean;
  isLocationAdmin?: boolean; // New prop
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  onEdit,
  onDelete,
  onManageUsers,
  onCreateLocationUser, // New prop
  isAdmin,
  isLocationAdmin // New prop
}) => {
  const [expanded, setExpanded] = useState(false);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  // Add the remove user mutation
  const [removeUserFromGroup] = useRemoveUserFromGroupMutation();
  
  // Handle removing a user from the group
  const handleRemoveUser = async (userId: number | undefined) => {
    if (!userId) {
      console.error("Cannot remove user: userId is undefined");
      return;
    }
    
    if (window.confirm("Are you sure you want to remove this user from the group?")) {
      try {
        await removeUserFromGroup({ userId });
      } catch (error) {
        console.error("Error removing user from group:", error);
      }
    }
  };
  
  return (
    <div className="bg-[var(--theme-surface)] rounded-lg shadow-md border border-[var(--theme-border)] overflow-hidden mb-6 transition-all hover:shadow-lg">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-5">
            <div className="h-16 w-16 rounded-full overflow-hidden text-[var(--theme-text-on-primary)] flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, var(--theme-primary), var(--theme-secondary))' }}>
              <span className="font-bold text-xl">{getInitials(group.name)}</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[var(--theme-text)]">{group.name}</h3>
              <p className="text-sm text-[var(--theme-text-muted)]">ID: {group.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <>
                {onEdit && (
                  <button
                    onClick={() => onEdit(group)}
                    className="p-2 rounded-full hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)]"
                    aria-label="Edit Group"
                    title="Edit Group"
                  >
                    <Edit size={16} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(group.id)}
                    className="p-2 rounded-full hover:bg-[var(--theme-surface-hover)] text-[var(--theme-error)]"
                    aria-label="Delete Group"
                    title="Delete Group"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                {onManageUsers && (
                  <button
                    onClick={() => onManageUsers(group)}
                    className="p-2 rounded-full hover:bg-[var(--theme-surface-hover)] text-[var(--theme-primary)]"
                    aria-label="Manage Users"
                    title="Manage Users"
                  >
                    <Users size={16} />
                  </button>
                )}
              </>
            )}
            {isLocationAdmin && !isAdmin && onCreateLocationUser && (
              <button
                onClick={() => onCreateLocationUser(group)}
                className="p-2 rounded-full hover:bg-[var(--theme-surface-hover)] text-[var(--theme-success)]"
                aria-label="Create Location User"
                title="Create Location User"
              >
                <UserPlus size={16} />
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-full hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text)]"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>
        
        {group.description && (
          <div className="mt-3">
            <p className="text-sm text-[var(--theme-text-secondary)]">{group.description}</p>
          </div>
        )}

        <div className="mt-5">
          <div className="text-sm font-medium text-[var(--theme-text-secondary)] mb-2">Locations</div>
          <div className="flex flex-wrap gap-2">
            {group.locationIds.length > 0 ? (
              group.locationIds.map((locationId) => (
                <span
                  key={locationId}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] shadow-sm"
                >
                  {locationId}
                </span>
              ))
            ) : (
              <span className="text-sm text-[var(--theme-text-muted)]">No locations assigned</span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--theme-border)] p-6 bg-[var(--theme-surface-hover)]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-[var(--theme-text-secondary)]">Users</h4>
            {isAdmin && (
              <button
                onClick={() => onManageUsers && onManageUsers(group)}
                className="text-xs text-[var(--theme-primary)] hover:opacity-80 flex items-center"
              >
                <span>Manage Users</span>
              </button>
            )}
            {isLocationAdmin && !isAdmin && onCreateLocationUser && (
                 <button
                onClick={() => onCreateLocationUser(group)}
                className="text-xs text-[var(--theme-success)] hover:opacity-80 flex items-center"
              >
                <UserPlus size={14} className="mr-1" />
                <span>Create Location User</span>
              </button>
            )}
          </div>
          {group.users && group.users.length > 0 ? (
            <div className="space-y-3">
              {group.users.map((user: User) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-[var(--theme-surface-active)] flex items-center justify-center shadow-sm">
                      <span className="text-xs font-medium text-[var(--theme-text)]">
                        {user.username ? getInitials(user.username) : '?'}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-[var(--theme-text)]">
                      {user.username}
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveUser(user.userId)}
                      className="text-xs text-[var(--theme-error)] hover:opacity-80"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-[var(--theme-text-muted)]">No users assigned</span>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupCard;