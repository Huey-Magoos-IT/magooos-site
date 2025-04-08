"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Edit, Trash2, Users } from "lucide-react";
import { Group, User } from "@/state/api";

interface GroupCardProps {
  group: Group;
  onEdit?: (group: Group) => void;
  onDelete?: (groupId: number) => void;
  onManageUsers?: (group: Group) => void;
  isAdmin: boolean;
}

const GroupCard: React.FC<GroupCardProps> = ({ 
  group, 
  onEdit, 
  onDelete, 
  onManageUsers,
  isAdmin 
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

  return (
    <div className="bg-white dark:bg-dark-secondary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-primary text-white flex items-center justify-center">
              <span className="font-medium">{getInitials(group.name)}</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">{group.name}</h3>
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
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400"
                    aria-label="Manage Users"
                    title="Manage Users"
                  >
                    <Users size={16} />
                  </button>
                )}
              </>
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
        
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Locations</div>
          <div className="flex flex-wrap gap-2">
            {group.locationIds.length > 0 ? (
              group.locationIds.map((locationId) => (
                <span 
                  key={locationId} 
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
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
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Users</h4>
          {group.users && group.users.length > 0 ? (
            <div className="space-y-2">
              {group.users.map((user: User) => (
                <div key={user.userId} className="flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {user.username ? getInitials(user.username) : '?'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {user.username}
                  </span>
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