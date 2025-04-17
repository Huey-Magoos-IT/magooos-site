"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, User } from "lucide-react";
import RoleBadge from "../RoleBadge";
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";

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

import { useGetLocationsQuery } from "@/state/lambdaApi";
import { useUpdateUserLocationsMutation } from "@/state/api";
import { Location } from "@/components/LocationTable";

const UserCard: React.FC<UserCardProps> = ({
  user,
  teams,
  roles,
  isAdmin,
  onTeamChange,
  updateStatus = {},
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [newLocationInput, setNewLocationInput] = useState("");
  const [locationUpdateStatus, setLocationUpdateStatus] = useState<"success" | "error" | "pending" | null>(null);
  
  // Get locations data
  const { data: locationsData } = useGetLocationsQuery();
  const [updateUserLocations] = useUpdateUserLocationsMutation();
  
  // Find current team
  const currentTeam = teams.find(team => team.id === user.teamId);
  
  // Get roles from current team
  const userRoles = currentTeam?.teamRoles?.map(tr => tr.role) || [];
  
  // Initialize selected locations when user data changes
  useEffect(() => {
    if (locationsData?.locations && user.locationIds) {
      const userLocations = locationsData.locations.filter(
        location => user.locationIds?.includes(location.id)
      );
      setSelectedLocations(userLocations);
    }
  }, [locationsData, user.locationIds]);
  
  // Handle team change
  const handleTeamChange = (event: SelectChangeEvent<number | string>) => {
    const newTeamId = event.target.value === "" ? null : Number(event.target.value);
    onTeamChange(user.userId, newTeamId);
    // Note: Page reload is handled in the parent component after the API call completes
  };
  
  // Handle location selection
  const handleLocationSelect = (location: Location) => {
    if (!selectedLocations.some(loc => loc.id === location.id)) {
      setSelectedLocations([...selectedLocations, location]);
    }
  };
  
  // Handle location removal
  const handleRemoveLocation = (locationId: string) => {
    setSelectedLocations(selectedLocations.filter(loc => loc.id !== locationId));
  };
  
  // Handle manual location input
  const handleAddManualLocation = () => {
    if (newLocationInput.trim() && locationsData?.locations) {
      // Check if location exists in the available locations
      const existingLocation = locationsData.locations.find(
        loc => loc.name.toLowerCase() === newLocationInput.trim().toLowerCase() ||
              loc.id === newLocationInput.trim()
      );
      
      if (existingLocation && !selectedLocations.some(loc => loc.id === existingLocation.id)) {
        setSelectedLocations([...selectedLocations, existingLocation]);
        setNewLocationInput("");
      } else if (!existingLocation) {
        // Show error or message that location doesn't exist
        alert("Location not found. Please enter a valid location name or ID.");
      }
    }
  };
  
  // Save updated locations
  const handleSaveLocations = async () => {
    try {
      setLocationUpdateStatus("pending");
      await updateUserLocations({
        userId: user.userId,
        locationIds: selectedLocations.map(loc => loc.id)
      }).unwrap();
      setLocationUpdateStatus("success");
      setTimeout(() => {
        setLocationUpdateStatus(null);
        setShowLocationSelector(false);
      }, 1500);
    } catch (error) {
      console.error("Error updating user locations:", error);
      setLocationUpdateStatus("error");
      setTimeout(() => {
        setLocationUpdateStatus(null);
      }, 3000);
    }
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
            
            {/* Locations Section */}
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned Locations:</span>
                {isAdmin && !showLocationSelector && (
                  <button
                    onClick={() => setShowLocationSelector(true)}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800 px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                )}
              </div>
              
              {!showLocationSelector ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedLocations.length > 0 ? (
                    selectedLocations.map(location => (
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
              ) : (
                <div className="mt-2 space-y-3">
                  {/* Selected Locations */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedLocations.map(location => (
                      <div
                        key={location.id}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 text-xs rounded-full"
                      >
                        <span>{location.name}</span>
                        <button
                          onClick={() => handleRemoveLocation(location.id)}
                          className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Location Search Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLocationInput}
                      onChange={(e) => setNewLocationInput(e.target.value)}
                      placeholder="Enter location name or ID"
                      className="flex-grow p-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <button
                      onClick={handleAddManualLocation}
                      disabled={!newLocationInput.trim()}
                      className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  
                  {/* Save/Cancel Buttons */}
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => setShowLocationSelector(false)}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveLocations}
                      disabled={locationUpdateStatus === "pending"}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded disabled:opacity-50"
                    >
                      {locationUpdateStatus === "pending" ? "Saving..." : "Save"}
                    </button>
                  </div>
                  
                  {/* Status Messages */}
                  {locationUpdateStatus === "success" && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                      Locations updated successfully!
                    </div>
                  )}
                  {locationUpdateStatus === "error" && (
                    <div className="text-xs text-red-600 dark:text-red-400">
                      Error updating locations. Please try again.
                    </div>
                  )}
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
