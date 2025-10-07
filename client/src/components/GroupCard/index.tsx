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
    <div className="bg-white dark:bg-dark-secondary rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden mb-6 transition-all hover:shadow-lg">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-5">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-red-500 dark:from-orange-pastel dark:to-red-pastel text-white flex items-center justify-center shadow-md">
              <span className="font-bold text-xl">{getInitials(group.name)}</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{group.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">ID: {group.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <>
                {onEdit && (
                  <button
                    onClick={() => onEdit(group)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                    aria-label="Edit Group"
                    title="Edit Group"
                  >
                    <Edit size={16} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(group.id)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600 dark:text-red-400"
                    aria-label="Delete Group"
                    title="Delete Group"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                {onManageUsers && (
                  <button
                    onClick={() => onManageUsers(group)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-orange-600 dark:text-orange-pastel"
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
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-green-600 dark:text-green-400"
                aria-label="Create Location User"
                title="Create Location User"
              >
                <UserPlus size={16} />
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>
        
        {group.description && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">{group.description}</p>
          </div>
        )}
        
        <div className="mt-5">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Locations</div>
          <div className="flex flex-wrap gap-2">
            {group.locationIds.length > 0 ? (
              group.locationIds.map((locationId) => (
                <span
                  key={locationId}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-pastel shadow-sm"
                >
                  {locationId}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">No locations assigned</span>
            )}
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Users</h4>
            {isAdmin && (
              <button
                onClick={() => onManageUsers && onManageUsers(group)}
                className="text-xs text-orange-600 hover:text-orange-800 dark:text-orange-pastel dark:hover:text-orange-pastel-light flex items-center"
              >
                <span>Manage Users</span>
              </button>
            )}
            {isLocationAdmin && !isAdmin && onCreateLocationUser && (
                 <button
                onClick={() => onCreateLocationUser(group)}
                className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 flex items-center"
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
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center shadow-sm">
                      <span className="text-xs font-medium">
                        {user.username ? getInitials(user.username) : '?'}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {user.username}
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveUser(user.userId)}
                      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">No users assigned</span>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupCard;