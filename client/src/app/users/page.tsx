"use client";
import {
  useGetUsersQuery,
  useGetTeamsQuery,
  useUpdateUserTeamMutation,
  useGetAuthUserQuery,
  useDisableUserMutation,
  useEnableUserMutation,
  useDeleteUserMutation,
  useListCognitoUsersQuery,
  useResendVerificationLinkMutation,
  useDeleteCognitoUserMutation,
  type User as ApiUser, // Alias the User interface from API
  type CognitoUser,
} from "@/state/api";
import { useGetLocationsQuery } from "@/state/lambdaApi";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast"; // Added for error notifications
import { useAppSelector } from "../redux";
import { signUp } from 'aws-amplify/auth'; // Revert back to signUp
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
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from "@mui/material";
import { AlertCircle, Check, User as UserIcon, UserPlus } from "lucide-react"; // Alias the User icon
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
  const [updateUserTeam, { isLoading: isUpdatingTeam }] = useUpdateUserTeamMutation();
  const [disableUser, { isLoading: isDisablingUser }] = useDisableUserMutation();
  const [enableUser, { isLoading: isEnablingUser }] = useEnableUserMutation();
  const [deleteUserMutation, { isLoading: isDeletingUser }] = useDeleteUserMutation();
  
  // Cognito user management hooks
  const { data: cognitoUsersData, isLoading: isCognitoUsersLoading, refetch: refetchCognitoUsers } = useListCognitoUsersQuery({
    filter: 'cognito:user_status = "UNCONFIRMED"'
  });
  const [resendVerificationLink, { isLoading: isResendingVerification }] = useResendVerificationLinkMutation();
  const [deleteCognitoUser, { isLoading: isDeletingCognitoUser }] = useDeleteCognitoUserMutation();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  
  const [updateStatus, setUpdateStatus] = useState<{[key: number]: 'success' | 'error' | 'pending' | null}>({});
  const [viewType, setViewType] = useState<ViewType>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState<string | number>("");
  const [isModalOpen, setIsModalOpen] = useState(false); // Added modal state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteCognitoDialogOpen, setIsDeleteCognitoDialogOpen] = useState(false);
  const [cognitoUserToDelete, setCognitoUserToDelete] = useState<string | null>(null);
  const [isResendDialogOpen, setIsResendDialogOpen] = useState(false);
  const [cognitoUserToResend, setCognitoUserToResend] = useState<string | null>(null);
  // The user object passed from UserCard will match its internal prop structure
  const [userToDelete, setUserToDelete] = useState<{
    userId: number;
    username: string;
    profilePictureUrl?: string;
    teamId?: number | null;
    locationIds?: string[];
    groupId?: number;
    isDisabled?: boolean;
  } | null>(null);
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
  
  // Redirect if user is not a true admin
  useEffect(() => {
    if (authData && !isUserAdmin) { // Only allow if isUserAdmin (true ADMIN)
      // Redirect non-admins to home page or another appropriate page
      if (typeof window !== "undefined") {
        window.location.href = '/home';
      }
    }
  }, [authData, isUserAdmin]);
  
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
  // NOTE: This requires the user to verify their email before the DB record is created by the Lambda.
  const handleCreateUserSubmit = useCallback(async (formData: {
    username: string;
    email: string;
    tempPassword: string;
    teamId: number;
    locationIds: string[];
  }) => {
    try {
      console.log("Creating user via Amplify signUp:", formData.username, formData.email);

      // Step 1: Create the user in Cognito using signUp
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: formData.username,
        password: formData.tempPassword,
        options: {
          userAttributes: {
            email: formData.email,
            'custom:teamId': String(formData.teamId),
            'custom:locationIds': JSON.stringify(formData.locationIds || [])
          },
          // autoSignIn: false // Let user sign in after confirmation
        }
      });
      console.log("Cognito signUp response:", { isSignUpComplete, userId, nextStep });

      // Step 2: Show success message and close modal
      alert(`User ${formData.username} created. They must verify their email (${formData.email}) via the link sent. Once verified and logged in, their database record will be created with the assigned team and locations, and they will appear in the list.`);
      setIsModalOpen(false);

      // Step 3: No refetch needed immediately.

    } catch (error: any) {
      console.error("Error creating user via Amplify signUp:", error);
      // localStorage.removeItem(`pending-user-${formData.username}`); // Clean up stored data on error - No longer needed
      throw new Error(error.message || "Failed to initiate user creation");
    }
  }, []);

  const handleDisableUser = useCallback(async (userId: number) => {
    setUpdateStatus(prev => ({ ...prev, [userId]: 'pending' }));
    try {
      console.log(`Attempting to disable user ID: ${userId}`);
      await disableUser({ userId }).unwrap(); // Actual API call
      toast.success("User disabled successfully!"); // Success feedback
      setUpdateStatus(prev => ({ ...prev, [userId]: 'success' }));
      refetchUsers(); // Refetch users to update the list
      setTimeout(() => {
        setUpdateStatus(prev => ({ ...prev, [userId]: null }));
      }, 2000); // Clear success indicator
    } catch (error: any) {
      console.error('Error disabling user:', error);
      const errorMessage = error.data?.message || error.message || "Failed to disable user. Please check console for details.";
      toast.error(errorMessage);
      setUpdateStatus(prev => ({ ...prev, [userId]: 'error' }));
      setTimeout(() => {
        setUpdateStatus(prev => ({ ...prev, [userId]: null }));
      }, 3000); // Clear error indicator
    }
  }, [disableUser, refetchUsers, setUpdateStatus]);

  const handleEnableUser = useCallback(async (userId: number) => {
    setUpdateStatus(prev => ({ ...prev, [userId]: 'pending' }));
    try {
      console.log(`Attempting to enable user ID: ${userId}`); 
      await enableUser({ userId }).unwrap();
      toast.success("User enabled successfully!");
      setUpdateStatus(prev => ({ ...prev, [userId]: 'success' }));
      refetchUsers(); // Refetch users to update the list
      setTimeout(() => {
        setUpdateStatus(prev => ({ ...prev, [userId]: null }));
      }, 2000);
    } catch (error: any) {
      console.error('Error enabling user:', error);
      const errorMessage = error.data?.message || error.message || "Failed to enable user.";
      toast.error(errorMessage);
      setUpdateStatus(prev => ({ ...prev, [userId]: 'error' }));
      setTimeout(() => {
        setUpdateStatus(prev => ({ ...prev, [userId]: null }));
      }, 3000);
    }
  }, [enableUser, refetchUsers, setUpdateStatus]);

  const openDeleteConfirmationDialog = (user: {
    userId: number;
    username: string;
    profilePictureUrl?: string;
    teamId?: number | null;
    locationIds?: string[];
    groupId?: number;
    isDisabled?: boolean;
  }) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteConfirmationDialog = () => {
    setUserToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const handleDeleteUser = useCallback(async () => {
    if (!userToDelete || !userToDelete.userId) return;

    const userId = userToDelete.userId;
    setUpdateStatus(prev => ({ ...prev, [userId]: 'pending' }));
    try {
      console.log(`Attempting to delete user ID: ${userId}`);
      await deleteUserMutation({ userId }).unwrap();
      toast.success(`User ${userToDelete.username} deleted successfully!`);
      setUpdateStatus(prev => ({ ...prev, [userId]: 'success' }));
      refetchUsers();
      closeDeleteConfirmationDialog();
      setTimeout(() => {
        setUpdateStatus(prev => ({ ...prev, [userId]: null }));
      }, 2000);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      const errorMessage = error.data?.message || error.message || "Failed to delete user.";
      toast.error(errorMessage);
      setUpdateStatus(prev => ({ ...prev, [userId]: 'error' }));
      closeDeleteConfirmationDialog();
      setTimeout(() => {
        setUpdateStatus(prev => ({ ...prev, [userId]: null }));
      }, 3000);
    }
  }, [deleteUserMutation, refetchUsers, setUpdateStatus, userToDelete]);

  // Handle opening resend confirmation dialog
  const openResendConfirmationDialog = (username: string) => {
    setCognitoUserToResend(username);
    setIsResendDialogOpen(true);
  };

  const closeResendConfirmationDialog = () => {
    setCognitoUserToResend(null);
    setIsResendDialogOpen(false);
  };

  // Handle resending verification link
  const handleResendVerification = useCallback(async () => {
    if (!cognitoUserToResend) return;
    
    try {
      console.log(`Resending verification link for: ${cognitoUserToResend}`);
      await resendVerificationLink({ username: cognitoUserToResend }).unwrap();
      toast.success(`Verification link resent to ${cognitoUserToResend}`);
      refetchCognitoUsers(); // Refresh the list
      closeResendConfirmationDialog();
    } catch (error: any) {
      console.error('Error resending verification link:', error);
      const errorMessage = error.data?.message || error.message || "Failed to resend verification link";
      toast.error(errorMessage);
      closeResendConfirmationDialog();
    }
  }, [resendVerificationLink, refetchCognitoUsers, cognitoUserToResend]);

  // Handle opening delete confirmation dialog for Cognito user
  const openDeleteCognitoConfirmationDialog = (username: string) => {
    setCognitoUserToDelete(username);
    setIsDeleteCognitoDialogOpen(true);
  };

  const closeDeleteCognitoConfirmationDialog = () => {
    setCognitoUserToDelete(null);
    setIsDeleteCognitoDialogOpen(false);
  };

  // Handle deleting unconfirmed Cognito user
  const handleDeleteCognitoUser = useCallback(async () => {
    if (!cognitoUserToDelete) return;
    
    try {
      console.log(`Deleting unconfirmed Cognito user: ${cognitoUserToDelete}`);
      await deleteCognitoUser({ username: cognitoUserToDelete }).unwrap();
      toast.success(`User ${cognitoUserToDelete} deleted successfully`);
      
      // Force immediate refresh of the Cognito users list
      await refetchCognitoUsers();
      
      // Close dialog
      closeDeleteCognitoConfirmationDialog();
      
      // Also refresh after a short delay to ensure consistency
      setTimeout(() => {
        refetchCognitoUsers();
      }, 1000);
    } catch (error: any) {
      console.error('Error deleting Cognito user:', error);
      const errorMessage = error.data?.message || error.message || "Failed to delete user";
      toast.error(errorMessage);
      closeDeleteCognitoConfirmationDialog();
    }
  }, [deleteCognitoUser, refetchCognitoUsers, cognitoUserToDelete]);
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
              <UserIcon size={20} className="text-gray-500 dark:text-gray-400" /> // Use aliased UserIcon
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
  const { activeUsers, disabledUsers } = useMemo(() => {
    if (!users) return { activeUsers: [], disabledUsers: [] };

    const allFilteredUsers = users.filter(user => {
      const matchesSearch = searchQuery === "" ||
        (user.username && user.username.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesTeam = teamFilter === "" ||
        (teamFilter === "none" && !user.teamId) ||
        (user.teamId === teamFilter);
      
      if (isLocationAdmin && !isUserAdmin) {
        const adminGroupId = authData?.userDetails?.groupId;
        return matchesSearch && matchesTeam && user.groupId === adminGroupId;
      }
      return matchesSearch && matchesTeam;
    });

    return {
      activeUsers: allFilteredUsers.filter(user => !user.isDisabled),
      disabledUsers: allFilteredUsers.filter(user => user.isDisabled)
    };
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
      
      {/* Active Users Section */}
      <h2 className="text-xl font-semibold mb-3 dark:text-white">Active Users</h2>
      {activeUsers.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 dark:bg-dark-tertiary rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-gray-500 dark:text-gray-400 mb-2">No active users found matching your search criteria.</div>
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
              rows={activeUsers || []}
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
            {activeUsers.map(user => (
              <UserCard
                key={user.userId}
                user={{
                  userId: user.userId as number,
                  username: user.username as string,
                  profilePictureUrl: user.profilePictureUrl,
                  teamId: user.teamId,
                  locationIds: user.locationIds,
                  groupId: user.groupId,
                  isDisabled: user.isDisabled, // Pass isDisabled status
                }}
                teams={teams}
                roles={availableRoles}
                isAdmin={isUserAdmin}
                onTeamChange={handleTeamChange}
                onDisableUser={handleDisableUser}
                onEnableUser={handleEnableUser}
                onDeleteUser={openDeleteConfirmationDialog}
                updateStatus={updateStatus}
              />
            ))}
          </div>
        )
      )}

      {/* Disabled Users Section */}
      {disabledUsers.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-3 dark:text-white">Disabled Users</h2>
          {/* Placeholder for how disabled users might be displayed. For now, identical to active. */}
          {/* Consider a different card or reduced info for disabled users later. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {disabledUsers.map(user => (
              <UserCard
                key={user.userId}
                user={{
                  userId: user.userId as number,
                  username: user.username as string,
                  profilePictureUrl: user.profilePictureUrl,
                  teamId: user.teamId,
                  locationIds: user.locationIds,
                  groupId: user.groupId,
                  isDisabled: user.isDisabled, // Pass isDisabled status
                }}
                teams={teams}
                roles={availableRoles}
                isAdmin={isUserAdmin}
                onTeamChange={handleTeamChange}
                onDisableUser={handleDisableUser} // For active users - though this card is for disabled users
                onEnableUser={handleEnableUser} // For disabled users
                onDeleteUser={openDeleteConfirmationDialog}
                updateStatus={updateStatus}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unconfirmed Cognito Users Section */}
      {isUserAdmin && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-3 dark:text-white">Unconfirmed Cognito Users</h2>
          <div className="mb-4 p-4 bg-yellow-50 rounded border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-100">
            <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">Unconfirmed Users</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              These users have been created in Cognito but haven&apos;t verified their email addresses yet. You can resend verification links or delete them if needed.
            </p>
          </div>
          
          {isCognitoUsersLoading ? (
            <div className="p-8 text-center">
              <CircularProgress size={24} className="mr-2" />
              Loading unconfirmed users...
            </div>
          ) : cognitoUsersData?.users && cognitoUsersData.users.length > 0 ? (
            <div className="space-y-3">
              {cognitoUsersData.users.map((cognitoUser) => (
                <div
                  key={cognitoUser.Username}
                  className="p-4 bg-white dark:bg-dark-secondary rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <UserIcon size={20} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {cognitoUser.Username}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {cognitoUser.Email || 'No email available'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              {cognitoUser.UserStatus}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Created: {cognitoUser.CreatedDate ? new Date(cognitoUser.CreatedDate).toLocaleDateString() : 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => openResendConfirmationDialog(cognitoUser.Username!)}
                        disabled={isResendingVerification}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-900/20"
                      >
                        {isResendingVerification ? (
                          <CircularProgress size={16} className="mr-1" />
                        ) : null}
                        Resend Link
                      </Button>
                      
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => openDeleteCognitoConfirmationDialog(cognitoUser.Username!)}
                        disabled={isDeletingCognitoUser}
                        className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900/20"
                      >
                        {isDeletingCognitoUser ? (
                          <CircularProgress size={16} className="mr-1" />
                        ) : null}
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-50 dark:bg-dark-tertiary rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 mb-2">No unconfirmed users found.</div>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                All created users have verified their email addresses.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create User Modal */}
      <ModalCreateUser
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateUserSubmit}
        teams={teams} // Pass teams
        // locations={locations} // This prop is no longer needed as LocationTable fetches its own data
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={closeDeleteConfirmationDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {`Permanently delete user "${userToDelete?.username || ''}"?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This action cannot be undone. All data associated with this user that cannot be reassigned (like authored tasks, comments, and attachments, depending on system setup) will be permanently deleted. The user will also be removed from Cognito.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteConfirmationDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained" autoFocus disabled={isDeletingUser}>
            {isDeletingUser ? <CircularProgress size={24} color="inherit" /> : "Delete User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Cognito User Confirmation Dialog */}
      <Dialog
        open={isDeleteCognitoDialogOpen}
        onClose={closeDeleteCognitoConfirmationDialog}
        aria-labelledby="cognito-delete-dialog-title"
        aria-describedby="cognito-delete-dialog-description"
      >
        <DialogTitle id="cognito-delete-dialog-title">
          {`Delete unconfirmed user "${cognitoUserToDelete || ''}"?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="cognito-delete-dialog-description">
            This will permanently delete the unconfirmed user from Cognito. This action cannot be undone. The user will need to be recreated if they want to access the system.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteCognitoConfirmationDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteCognitoUser} color="error" variant="contained" autoFocus disabled={isDeletingCognitoUser}>
            {isDeletingCognitoUser ? <CircularProgress size={24} color="inherit" /> : "Delete User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resend Verification Confirmation Dialog */}
      <Dialog
        open={isResendDialogOpen}
        onClose={closeResendConfirmationDialog}
        aria-labelledby="resend-dialog-title"
        aria-describedby="resend-dialog-description"
      >
        <DialogTitle id="resend-dialog-title">
          {`Resend verification link to "${cognitoUserToResend || ''}"?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="resend-dialog-description">
            This will send a new verification email to the user. They will receive a link to verify their email address and complete their account setup.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeResendConfirmationDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleResendVerification} color="primary" variant="contained" autoFocus disabled={isResendingVerification}>
            {isResendingVerification ? <CircularProgress size={24} color="inherit" /> : "Send Link"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Users;
