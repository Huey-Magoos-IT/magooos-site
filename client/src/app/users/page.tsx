"use client";
import {
  useGetUsersQuery,
  useGetTeamsQuery,
  useUpdateUserTeamMutation,
  useGetAuthUserQuery
} from "@/state/api";
import React, { useMemo, useState } from "react";
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
import { AlertCircle, Check } from "lucide-react";

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
  
  // Check if current user is an admin
  const isUserAdmin = authData?.userDetails?.team?.isAdmin ||
    authData?.userDetails?.team?.teamRoles?.some(tr => tr.role.name === 'ADMIN');
  
  // Extract teams from teamsData
  const teams = teamsData?.teams || [];
  
  // Handle team change
  const handleTeamChange = async (event: SelectChangeEvent<number>, userId: number) => {
    const newTeamId = Number(event.target.value);
    
    // Set status to pending
    setUpdateStatus(prev => ({ ...prev, [userId]: 'pending' }));
    
    try {
      await updateUserTeam({ userId, teamId: newTeamId }).unwrap();
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
  
  // Define columns with TeamSelector for admin users
  const columns: GridColDef[] = useMemo(() => [
    { field: "userId", headerName: "ID", width: 70 },
    { field: "username", headerName: "Username", width: 150 },
    {
      field: "profilePictureUrl",
      headerName: "Profile Picture",
      width: 100,
      renderCell: (params) => (
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-9 w-9">
            <Image
              src={`https://huey-site-images.s3.us-east-2.amazonaws.com/${params.value}`}
              alt={params.row.username}
              width={100}
              height={50}
              className="h-full rounded-full object-cover"
            />
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
                onChange={(e) => handleTeamChange(e, userId)}
                className="dark:text-white"
                disabled={status === 'pending'}
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
    }
  ], [teams, isUserAdmin, updateStatus, handleTeamChange]);

  if (isUsersLoading || isTeamsLoading) return <div className="p-8">Loading...</div>;
  if (isUsersError || !users) return <div className="p-8">Error fetching users data</div>;

  return (
    <div className="flex w-full flex-col p-8">
      <Header name="Users" />
      
      {/* Team Assignment Instructions (for admins only) */}
      {isUserAdmin && (
        <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100">
          <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Team Assignment</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            As an administrator, you can assign users to teams using the dropdown selector in the Team column.
          </p>
        </div>
      )}
      
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
    </div>
  );
};

export default Users;
