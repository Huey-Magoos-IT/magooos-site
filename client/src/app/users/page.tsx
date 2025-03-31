"use client";
import {
  useGetUsersQuery,
  useGetTeamsQuery,
  useUpdateUserTeamMutation,
  useGetAuthUserQuery
} from "@/state/api";
import React, { useMemo, useState, useEffect } from "react";
import { useAppSelector } from "../redux";
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
  CircularProgress
} from "@mui/material";
import { AlertCircle, Check, User } from "lucide-react";
import ViewToggle, { ViewType } from "@/components/ViewToggle";
import RoleBadge from "@/components/RoleBadge";
import UserCard from "@/components/UserCard";

const CustomToolbar = () => (
  <GridToolbarContainer className="toolbar flex gap-2">
    <GridToolbarFilterButton />
    <GridToolbarExport />
  </GridToolbarContainer>
);

const Users = () => {
  const { data: users, isLoading: isUsersLoading, isError: isUsersError, refetch: refetchUsers } = useGetUsersQuery();
  const { data: teamsData, isLoading: isTeamsLoading } = useGetTeamsQuery();
  const { data: authData } = useGetAuthUserQuery({});
  const [updateUserTeam, { isLoading: isUpdating }] = useUpdateUserTeamMutation();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  
  const [updateStatus, setUpdateStatus] = useState<{[key: number]: 'success' | 'error' | 'pending' | null}>({});
  const [viewType, setViewType] = useState<ViewType>("grid");
  
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
  
  // Check if current user is an admin
  const isUserAdmin = authData?.userDetails?.team?.isAdmin ||
    authData?.userDetails?.team?.teamRoles?.some(tr => tr.role.name === 'ADMIN') || false;
  
  // Extract teams and roles from teamsData using useMemo to prevent re-renders
  const teams = useMemo(() => teamsData?.teams || [], [teamsData?.teams]);
  const availableRoles = useMemo(() => teamsData?.availableRoles || [], [teamsData?.availableRoles]);
  
  // Handle team change
  const handleTeamChange = async (userId: number, newTeamId: number | null) => {
    // Set status to pending
    setUpdateStatus(prev => ({ ...prev, [userId]: 'pending' }));
    
    try {
      // If newTeamId is null, use 0 as a placeholder for "no team"
      await updateUserTeam({ userId, teamId: newTeamId ?? 0 }).unwrap();
      // Set success status
      setUpdateStatus(prev => ({ ...prev, [userId]: 'success' }));
      
      // Clear success status after 3 seconds
      setTimeout(() => {
        setUpdateStatus(prev => ({ ...prev, [userId]: null }));
      }, 3000);
    } catch (error) {
      console.error('Error updating user team:', error);
      // Set error status
      setUpdateStatus(prev => ({ ...prev, [userId]: 'error' }));
      
      // Clear error status after 3 seconds
      setTimeout(() => {
        setUpdateStatus(prev => ({ ...prev, [userId]: null }));
      }, 3000);
    }
  };
  
  // Handle team change from dropdown
  const handleTeamChangeEvent = React.useCallback((event: SelectChangeEvent<number | string>, userId: number) => {
    const newTeamId = event.target.value === "" ? null : Number(event.target.value);
    handleTeamChange(userId, newTeamId);
  }, [handleTeamChange]);
  
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
              <InputLabel id={`team-select-label-${userId}`} className="dark:text-white">Team</InputLabel>
              <Select
                labelId={`team-select-label-${userId}`}
                value={currentTeamId || ''}
                label="Team"
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

  if (isUsersLoading || isTeamsLoading) return <div className="p-8">Loading...</div>;
  if (isUsersError || !users) return <div className="p-8">Error fetching users data</div>;

  return (
    <div className="flex w-full flex-col p-8">
      <div className="flex justify-between items-center mb-4">
        <Header name="Users" />
        <ViewToggle currentView={viewType} onChange={setViewType} />
      </div>
      
      {/* Team Assignment Instructions (for admins only) */}
      {isUserAdmin && (
        <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100">
          <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Team Assignment</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            As an administrator, you can assign users to teams using the dropdown selector in the Team column.
          </p>
        </div>
      )}
      
      {viewType === "grid" ? (
        <div style={{ height: 650, width: "100%" }}>
          <DataGrid
            rows={users || []}
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
          {users.map(user => (
            <UserCard
              key={user.userId}
              user={{
                userId: user.userId as number,
                username: user.username as string,
                profilePictureUrl: user.profilePictureUrl,
                teamId: user.teamId
              }}
              teams={teams}
              roles={availableRoles}
              isAdmin={isUserAdmin}
              onTeamChange={handleTeamChange}
              updateStatus={updateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Users;
