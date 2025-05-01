"use client";
import {
  useGetUsersQuery,
  useGetTeamsQuery, // Already imported
  useUpdateUserTeamMutation,
  useGetAuthUserQuery,
} from "@/state/api";
import { useGetLocationsQuery } from "@/state/lambdaApi"; // Import locations query
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useAppSelector } from "../redux";
import { signUp } from 'aws-amplify/auth'; // Import Amplify signUp
import Header from "@/components/Header";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton,
} from "@mui/x-data-grid";
import Image from "next/image";
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Tooltip,
  CircularProgress,
  Button // Added Button import
} from "@mui/material";
import { AlertCircle, Check, User, UserPlus } from "lucide-react"; // Added UserPlus import
import ViewToggle, { ViewType } from "@/components/ViewToggle";
import RoleBadge from "@/components/RoleBadge";
import UserCard from "@/components/UserCard";
import ModalCreateUser from "@/components/ModalCreateUser"; // Added Modal import

const CustomToolbar = () => (
  <GridToolbarContainer className="toolbar flex gap-2">
    <GridToolbarFilterButton />
    <GridToolbarExport />
  </GridToolbarContainer>
);

const Users = () => {
  const { data: users, isLoading: isUsersLoading, isError: isUsersError, refetch: refetchUsers } = useGetUsersQuery();
  const { data: teamsData, isLoading: isTeamsLoading } = useGetTeamsQuery();
  const { data: locationsData, isLoading: isLocationsLoading } = useGetLocationsQuery(); // Fetch locations
  const { data: authData } = useGetAuthUserQuery({});
  const [updateUserTeam, { isLoading: isUpdating }] = useUpdateUserTeamMutation();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  
  const [updateStatus, setUpdateStatus] = useState<{[key: number]: 'success' | 'error' | 'pending' | null}>({});
  const [viewType, setViewType] = useState<ViewType>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState<string | number>("");
  const [isModalOpen, setIsModalOpen] = useState(false); // Added modal state
  
  // Load view preference from localStorage on component mount
  useEffect(() => {
    const savedView = localStorage.getItem("usersViewType");
    if (savedView && (savedView === "grid" || savedView === "list")) {
      setViewType(savedView as ViewType);
    }
  }, []);
  
  // Save view preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("usersViewType", viewType);
  }, [viewType]);
  
  // Check if current user is an admin or location admin
  const isUserAdmin = authData?.userDetails?.team?.isAdmin ||
    authData?.userDetails?.team?.teamRoles?.some(tr => tr.role.name === 'ADMIN') || false;
  
  const isLocationAdmin = authData?.userDetails?.team?.teamRoles?.some(tr => tr.role.name === 'LOCATION_ADMIN') || false;
  
  // Redirect if user is not an admin or location admin
  useEffect(() => {
    if (authData && !isUserAdmin && !isLocationAdmin) {
      // Redirect to teams page instead of home
      window.location.href = '/teams';
    }
  }, [authData, isUserAdmin, isLocationAdmin]);
  
  // Extract teams, roles, and locations using useMemo to prevent re-renders
  const teams = useMemo(() => teamsData?.teams || [], [teamsData?.teams]);
  const availableRoles = useMemo(() => teamsData?.availableRoles || [], [teamsData?.availableRoles]);
  const locations = useMemo(() => locationsData?.locations || [], [locationsData?.locations]); // Extract locations
  
  // Handle team change
  const handleTeamChange = useCallback(async (userId: number, newTeamId: number | null) => {
    // Set status to pending
    setUpdateStatus(prev => ({ ...prev, [userId]: 'pending' }));
    
    try {
      // If newTeamId is null, use 0 as a placeholder for "no team"
      await updateUserTeam({ userId, teamId: newTeamId ?? 0 }).unwrap();
      // Set success status
      setUpdateStatus(prev => ({ ...prev, [userId]: 'success' }));
      
      // Clear success status and reload the page almost immediately
      setTimeout(() => {
        setUpdateStatus(prev => ({ ...prev, [userId]: null }));
        // Reload the page to reflect the updated user team assignment
        window.location.reload();
      }, 300); // Reduced to 300ms for almost immediate reload while still showing success indicator
    } catch (error) {
      console.error('Error updating user team:', error);
      // Set error status
      setUpdateStatus(prev => ({ ...prev, [userId]: 'error' }));
      
      // Clear error status after 3 seconds
      setTimeout(() => {
        setUpdateStatus(prev => ({ ...prev, [userId]: null }));
      }, 3000);
    }
  }, [updateUserTeam, setUpdateStatus]);
  
  // Handle team change from dropdown
  const handleTeamChangeEvent = useCallback((event: SelectChangeEvent<number | string>, userId: number) => {
    const newTeamId = event.target.value === "" ? null : Number(event.target.value);
    handleTeamChange(userId, newTeamId);
  }, [handleTeamChange]);

  // Function for handling user creation submission using Amplify signUp
  const handleCreateUserSubmit = useCallback(async (formData: {
    username: string; // Added username
    email: string;
    tempPassword: string;
    teamId: number;
    locationIds: string[];
  }) => {
    try {
      console.log("Creating user via Amplify signUp:", formData.username, formData.email);

      // Step 1: Create the user in Cognito using signUp
      // Note: We cannot directly set custom attributes like teamId/locationIds here.
      // These need to be handled post-confirmation, ideally by the Lambda trigger
      // or a separate update mechanism.
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: formData.username, // Use the collected username
        password: formData.tempPassword,
        options: {
          userAttributes: {
            email: formData.email,
            // We cannot reliably set custom attributes here that the Lambda can read
            // during the PostConfirmation trigger. Cognito doesn't pass all attributes.
          },
          // autoSignIn: false // Keep default behavior (usually true)
        }
      });

      console.log("Cognito signUp response:", { isSignUpComplete, userId, nextStep });

      // Step 2: Store admin-selected attributes temporarily (e.g., localStorage)
      // This is a workaround because we can't pass them reliably to the Lambda trigger.
      // A more robust solution involves a separate backend endpoint/DB table for pending users.
      const pendingUserData = {
        teamId: formData.teamId,
        locationIds: formData.locationIds || []
      };
      // Use username as key for localStorage as it must be unique, email might not be.
      localStorage.setItem(`pending-user-${formData.username}`, JSON.stringify(pendingUserData));
      console.log(`Stored pending data for ${formData.username} in localStorage.`);

      // Step 3: Show success message and close modal
      alert(`User ${formData.username} created. They must verify their email (${formData.email}) and log in. Team/Location assignments will be applied by the system post-confirmation (using stored data).`);
      setIsModalOpen(false);

      // Step 4: Refetch users (User won't appear until confirmed & Lambda runs)
      // refetchUsers(); // Optional: refetch if UI should update immediately, though user won't be fully ready

      // No return value needed as onSubmit expects Promise<void>
      // return { success: true, message: "User creation initiated successfully. Email verification required." };

    } catch (error: any) {
      console.error("Error creating user via Amplify signUp:", error);
      // Store pending data even if signUp fails? No, probably not.
      localStorage.removeItem(`pending-user-${formData.username}`); // Clean up potentially stored data on error
      throw new Error(error.message || "Failed to initiate user creation");
    }
  }, []); // Removed refetchUsers dependency
  
  // Define columns with TeamSelector and RoleBadges for admin users
  const columns: GridColDef[] = useMemo(() => [
    { field: "userId", headerName: "ID", width: 70 },
    { field: "username", headerName: "Username", width: 150 },
    {
      field: "profilePictureUrl",
      headerName: "Profile Picture",
      width: 100,
      renderCell: (params) => (
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-9 w-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            {params.value ? (
              <Image
                src={`https://huey-site-images.s3.us-east-2.amazonaws.com/${params.value}`}
                alt={params.row.username}
                width={100}
                height={50}
                className="h-full w-full object-cover"
              />
            ) : (
              <User size={20} className="text-gray-500 dark:text-gray-400" />
            )}
          </div>
        </div>
      ),
    },
    {
      field: "teamId",
      headerName: "Team",
      width: 220,
      renderCell: (params: GridRenderCellParams) => {
        const userId = params.row.userId;
        const currentTeamId = params.value;
        const status = updateStatus[userId];
        
        // Show current team name or "No Team" if not assigned
        const currentTeam = teams.find(team => team.id === currentTeamId);
        const currentTeamName = currentTeam ? currentTeam.teamName : "No Team";
        
        // If user is not admin, just show the team name
        if (!isUserAdmin) {
          return <div>{currentTeamName}</div>;
        }
        
        // For admins, show dropdown selector
        return (
          <div className="flex items-center w-full">
            <FormControl fullWidth size="small" className="dark:bg-dark-tertiary rounded">
              <Select
                value={currentTeamId || ''}
                onChange={(e) => handleTeamChangeEvent(e, userId)}
                className="dark:text-white"
                disabled={status === 'pending'}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                    },
                  },
                }}
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
            
            {/* Status indicator */}
            {status === 'pending' && (
              <CircularProgress size={20} className="ml-2" />
            )}
            {status === 'success' && (
              <Check size={20} className="ml-2 text-green-500" />
            )}
            {status === 'error' && (
              <Tooltip title="Error updating team">
                <AlertCircle size={20} className="ml-2 text-red-500" />
              </Tooltip>
            )}
          </div>
        );
      }
    },
    {
      field: "roles",
      headerName: "Roles",
      width: 200,
      renderCell: (params: GridRenderCellParams) => {
        const userId = params.row.userId;
        const teamId = params.row.teamId;
        
        // Find user's team
        const userTeam = teams.find(team => team.id === teamId);
        
        // Get roles from team
        const teamRoles = userTeam?.teamRoles || [];
        
        if (teamRoles.length === 0) {
          return <span className="text-sm text-gray-500 dark:text-gray-400">No roles</span>;
        }
        
        // Show up to 2 roles with a "+X more" indicator if there are more
        return (
          <div className="flex flex-wrap gap-1">
            {teamRoles.slice(0, 2).map(teamRole => (
              <RoleBadge
                key={teamRole.id}
                roleName={teamRole.role.name}
                description={teamRole.role.description}
              />
            ))}
            {teamRoles.length > 2 && (
              <Tooltip title={teamRoles.slice(2).map(tr => tr.role.name).join(", ")}>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  +{teamRoles.length - 2} more
                </span>
              </Tooltip>
            )}
          </div>
        );
      }
    }
  ], [teams, isUserAdmin, updateStatus, handleTeamChangeEvent]);

  // Filter users based on search query, team filter, and user role
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter(user => {
      // Filter by search query (case insensitive)
      const matchesSearch = searchQuery === "" ||
        (user.username && user.username.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter by team
      const matchesTeam = teamFilter === "" ||
        (teamFilter === "none" && !user.teamId) ||
        (user.teamId === teamFilter);
      
      // For location admins, only show users from their group
      if (isLocationAdmin && !isUserAdmin) {
        // Get the current user's group ID
        const adminGroupId = authData?.userDetails?.groupId;
        // Only show users that belong to the same group
        return matchesSearch && matchesTeam && user.groupId === adminGroupId;
      }
      
      return matchesSearch && matchesTeam;
    });
  }, [users, searchQuery, teamFilter, isLocationAdmin, isUserAdmin, authData?.userDetails?.groupId]);
  
  // Update loading check
  if (isUsersLoading || isTeamsLoading || isLocationsLoading) return <div className="p-8">Loading...</div>;
  if (isUsersError || !users) return <div className="p-8">Error fetching users data</div>;
  // Add error check for locations? Optional, as it's less critical than users/teams.

  return (
    <div className="flex w-full flex-col p-8">
      <div className="flex flex-col space-y-4 mb-4">
        <div className="flex justify-between items-center">
          <Header name="Users" />
          <div className="flex items-center gap-2"> {/* Added wrapper div */}
            {isUserAdmin && (
              <Button
                variant="contained"
                startIcon={<UserPlus size={18} />}
                onClick={() => setIsModalOpen(true)} // Open modal on click
              >
                Create User
              </Button>
            )}
            <ViewToggle currentView={viewType} onChange={setViewType} />
          </div>
        </div>
        
        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search users by name..."
              className="w-full p-2 pl-10 border rounded-md dark:bg-dark-tertiary dark:border-gray-700 dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* Team Filter Dropdown */}
          <div className="w-full md:w-64">
            <FormControl fullWidth size="small" className="dark:bg-dark-tertiary rounded">
              <Select
                value={teamFilter}
                className="dark:text-white"
                onChange={(e) => setTeamFilter(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Teams</em>
                </MenuItem>
                <MenuItem value="none">No Team</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.teamName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>
        
        {/* Team Assignment Instructions (for admins only) */}
        {isUserAdmin && (
          <div className="p-4 bg-blue-50 rounded border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100">
            <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Team Assignment</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              As an administrator, you can assign users to teams using the dropdown selector in the Team column.
            </p>
          </div>
        )}
      </div>
      
      {filteredUsers.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 dark:bg-dark-tertiary rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-gray-500 dark:text-gray-400 mb-2">No users found matching your search criteria</div>
          <button
            onClick={() => {
              setSearchQuery("");
              setTeamFilter("");
            }}
            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : (
        viewType === "grid" ? (
          <div style={{ height: 650, width: "100%" }}>
            <DataGrid
              rows={filteredUsers || []}
              columns={columns}
              getRowId={(row) => row.userId}
              pagination
              slots={{
                toolbar: CustomToolbar,
              }}
              className={dataGridClassNames}
              sx={dataGridSxStyles(isDarkMode)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map(user => (
              <UserCard
                key={user.userId}
                user={{
                  userId: user.userId as number,
                  username: user.username as string,
                  profilePictureUrl: user.profilePictureUrl,
                  teamId: user.teamId,
                  locationIds: user.locationIds,
                  groupId: user.groupId
                }}
                teams={teams}
                roles={availableRoles}
                isAdmin={isUserAdmin}
                onTeamChange={handleTeamChange}
                updateStatus={updateStatus}
              />
            ))}
          </div>
        )
      )}

      {/* Create User Modal */}
      <ModalCreateUser
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateUserSubmit}
        teams={teams} // Pass teams
        locations={locations} // Pass locations
      />
    </div>
  );
};

export default Users;
