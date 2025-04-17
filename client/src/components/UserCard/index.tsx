"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, User } from "lucide-react";
import RoleBadge from "../RoleBadge";
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { useGetLocationsQuery } from "@/state/lambdaApi";
import { Location } from "@/components/LocationTable";

interface UserCardProps {
  user: {
    userId: number;
    username: string;
    profilePictureUrl?: string;
    teamId?: number | null;
    locationIds?: string[];
    groupId?: number;
  };
  teams: Array<{
    id: number;
    teamName: string;
    teamRoles?: Array<{
      id: number;
      role: {
        id: number;
        name: string;
        description?: string;
      };
    }>;
  }>;
  roles?: Array<{
    id: number;
    name: string;
    description?: string;
  }>;
  isAdmin: boolean;
  onTeamChange: (userId: number, teamId: number | null) => void;
  updateStatus?: {
    [key: number]: "success" | "error" | "pending" | null;
  };
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  teams,
  roles,
  isAdmin,
  onTeamChange,
  updateStatus = {},
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Get locations data
  const { data: locationsData } = useGetLocationsQuery();
  
  // Find current team
  const currentTeam = teams.find(team => team.id === user.teamId);
  
  // Get roles from current team
  const userRoles = currentTeam?.teamRoles?.map(tr => tr.role) || [];
  
  // Get user's locations from the locations data
  const userLocations = useMemo(() => {
    if (locationsData?.locations && user.locationIds) {
      return locationsData.locations.filter(
        location => user.locationIds?.includes(location.id)
      );
    }
    return [];
  }, [locationsData, user.locationIds]);
  
  // Handle team change
  const handleTeamChange = (event: SelectChangeEvent<number | string>) => {
    const newTeamId = event.target.value === "" ? null : Number(event.target.value);
    onTeamChange(user.userId, newTeamId);
    // Note: Page reload is handled in the parent component after the API call completes
  };

  return (
    <div className="bg-white dark:bg-dark-secondary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              {user.profilePictureUrl ? (
                <Image
                  src={`https://huey-site-images.s3.us-east-2.amazonaws.com/${user.profilePictureUrl}`}
                  alt={user.username}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={24} className="text-gray-500 dark:text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">{user.username}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">ID: {user.userId}</p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          {userRoles.length > 0 ? (
            userRoles.map(role => (
              <RoleBadge
                key={role.id}
                roleName={role.name}
                description={role.description}
              />
            ))
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">No roles assigned</span>
          )}
        </div>
        
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team</div>
          {isAdmin ? (
            <FormControl fullWidth size="small" className="dark:bg-dark-tertiary rounded">
              <Select
                value={user.teamId || ''}
                onChange={handleTeamChange}
                className="dark:text-white"
                disabled={updateStatus[user.userId] === 'pending'}
              >
                <MenuItem value="">
                  <em>No Team</em>
                </MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.teamName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <div className="text-sm text-gray-800 dark:text-gray-200">
              {currentTeam ? currentTeam.teamName : "No Team"}
            </div>
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Information</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Team Roles:</span>
              <span className="text-sm text-gray-800 dark:text-gray-200">
                {userRoles.map(r => r.name).join(", ") || "None"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Admin Access:</span>
              <span className="text-sm text-gray-800 dark:text-gray-200">
                {userRoles.some(r => r.name === "ADMIN") ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Data Access:</span>
              <span className="text-sm text-gray-800 dark:text-gray-200">
                {userRoles.some(r => r.name === "DATA" || r.name === "ADMIN") ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Reporting Access:</span>
              <span className="text-sm text-gray-800 dark:text-gray-200">
                {userRoles.some(r => r.name === "REPORTING" || r.name === "ADMIN") ? "Yes" : "No"}
              </span>
            </div>
            
            {/* Locations Section - Read-only display */}
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned Locations:</span>
                {isAdmin && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    Managed via Groups
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1 mt-1">
                {userLocations.length > 0 ? (
                  userLocations.map(location => (
                    <span 
                      key={location.id} 
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full"
                    >
                      {location.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">No locations assigned</span>
                )}
              </div>
              
              {isAdmin && (
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <p>Note: Locations are assigned through Groups. To modify a user's locations, assign them to the appropriate Group.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserCard;
