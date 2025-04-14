"use client";

import React, { useState } from "react";
import { useGetGroupsQuery, useCreateGroupMutation, useUpdateGroupMutation, useDeleteGroupMutation, useGetUsersQuery, useAssignGroupToUserMutation, Group } from "@/state/api";
import { useGetAuthUserQuery } from "@/state/api";
import { hasRole } from "@/lib/accessControl";
import GroupCard from "@/components/GroupCard";
import LocationTable, { Location } from "@/components/LocationTable";
import Header from "@/components/Header";
import { X } from "lucide-react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box,
  Typography,
  Grid,
  OutlinedInput,
  SelectChangeEvent
} from "@mui/material";
import { Plus } from "lucide-react";

const GroupsPage = () => {
  const { data: authData } = useGetAuthUserQuery({});
  const { data: groups = [], isLoading: isLoadingGroups } = useGetGroupsQuery();
  const { data: users = [], isLoading: isLoadingUsers } = useGetUsersQuery();
  const [createGroup] = useCreateGroupMutation();
  const [updateGroup] = useUpdateGroupMutation();
  const [deleteGroup] = useDeleteGroupMutation();
  const [assignGroupToUser] = useAssignGroupToUserMutation();

  const [openDialog, setOpenDialog] = useState(false);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    locationIds: [] as string[]
  });
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);

  // Check if user is admin
  const userRoles = authData?.userDetails?.team?.teamRoles || [];
  const isAdmin = hasRole(userRoles, "ADMIN");
  // Check if user is admin or location admin
  const isLocationAdmin = hasRole(userRoles, "LOCATION_ADMIN");

  // Get available locations from all groups
  const allLocations = Array.from(
    new Set(
      groups.flatMap(group => group.locationIds || [])
    )
  ).sort();

  // Handle dialog open for create/edit
  const handleOpenDialog = (group?: Group) => {
    if (group) {
      setCurrentGroup(group);
      setFormData({
        name: group.name,
        description: group.description || "",
        locationIds: group.locationIds || []
      });
      // Convert location IDs to Location objects for the selected locations display
      setSelectedLocations(
        group.locationIds?.map(id => ({ id, name: id })) || []
      );
    } else {
      setCurrentGroup(null);
      setFormData({
        name: "",
        description: "",
        locationIds: []
      });
      setSelectedLocations([]);
    }
    setOpenDialog(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentGroup(null);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle location selection from LocationTable
  const handleAddLocation = (location: Location) => {
    setSelectedLocations(prev => [...prev, location]);
    setFormData(prev => ({
      ...prev,
      locationIds: [...prev.locationIds, location.id]
    }));
  };

  // Handle removing a location
  const handleRemoveLocation = (locationId: string) => {
    setSelectedLocations(prev => prev.filter(loc => loc.id !== locationId));
    setFormData(prev => ({
      ...prev,
      locationIds: prev.locationIds.filter(id => id !== locationId)
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      if (currentGroup) {
        // Update existing group
        await updateGroup({
          id: currentGroup.id,
          ...formData
        });
      } else {
        // Create new group
        await createGroup(formData);
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving group:", error);
    }
  };

  // Handle group deletion
  const handleDeleteGroup = async (groupId: number) => {
    if (window.confirm("Are you sure you want to delete this group? This will remove all user associations.")) {
      try {
        await deleteGroup(groupId);
      } catch (error) {
        console.error("Error deleting group:", error);
      }
    }
  };

  // Handle user management dialog
  const handleOpenUserDialog = (group: Group) => {
    setCurrentGroup(group);
    setSelectedUserId("");
    setOpenUserDialog(true);
  };

  // Handle user assignment
  const handleAssignUser = async () => {
    if (currentGroup && selectedUserId !== "") {
      try {
        await assignGroupToUser({
          userId: selectedUserId as number,
          groupId: currentGroup.id
        });
        setOpenUserDialog(false);
      } catch (error) {
        console.error("Error assigning user to group:", error);
      }
    }
  };

  // Filter users who can be assigned to groups (LocationAdmin role)
  const locationAdminUsers = users.filter(user => {
    // Get the user's team roles
    const userTeamRoles = user.team?.teamRoles || [];
    
    // Check if user has LOCATION_ADMIN role (case insensitive)
    return userTeamRoles.some(tr =>
      tr.role.name.toUpperCase() === "LOCATION_ADMIN"
    );
  });

  // Filter out users already assigned to the current group
  const availableUsers = locationAdminUsers.filter(user => {
    // A user can be assigned to multiple groups, so we only need to check
    // if they're not already assigned to this specific group
    return user.groupId !== currentGroup?.id;
  });

  // Debug log to see available users and their roles
  console.log("Available users for group assignment:", locationAdminUsers.map(user => ({
    username: user.username,
    userId: user.userId,
    teamRoles: user.team?.teamRoles?.map(tr => tr.role.name)
  })));

  // Debug log to see available users and their roles
  console.log("Available users for group assignment:", availableUsers.map(user => ({
    username: user.username,
    userId: user.userId,
    teamRoles: user.team?.teamRoles?.map(tr => tr.role.name)
  })));

  if (isLoadingGroups || isLoadingUsers) {
    return <div className="p-6">Loading...</div>;
  }

  // We already determined if the user is a LocationAdmin above
  
  // Only admins can see the Assign Admin dialog, LocationAdmins will have a different UI
  return (
    <div className="flex w-full flex-col p-8">
      <div className="flex flex-col space-y-4 mb-4">
        <div className="flex justify-between items-center">
          <Header name="Groups" />
          {isAdmin && (
            <button
              onClick={() => handleOpenDialog()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="mr-1" size={20} />
              Create Group
            </button>
          )}
        </div>
        
        {/* Admin Instructions */}
        {isAdmin && (
          <div className="p-4 bg-blue-50 rounded border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100">
            <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Group Management</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              As an administrator, you can create, edit, and delete groups, as well as assign Location Admin users to groups.
            </p>
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="bg-white dark:bg-dark-secondary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">No groups found</p>
          {isAdmin && (
            <button
              onClick={() => handleOpenDialog()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create your first group
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              isAdmin={isAdmin}
              onEdit={isAdmin ? (group) => handleOpenDialog(group) : undefined}
              onDelete={isAdmin ? handleDeleteGroup : undefined}
              onManageUsers={isAdmin ? handleOpenUserDialog : undefined}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Group Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {currentGroup ? "Edit Group" : "Create Group"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Left column - Form inputs */}
            <Grid item xs={12} md={6}>
              <TextField
                autoFocus
                margin="dense"
                name="name"
                label="Group Name"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.name}
                onChange={handleInputChange}
                required
                sx={{ mb: 2, mt: 1 }}
              />
              <TextField
                margin="dense"
                name="description"
                label="Description"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.description}
                onChange={handleInputChange}
                multiline
                rows={3}
                sx={{ mb: 2 }}
              />
              
              {/* Selected Locations Display */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Typography className="font-medium text-gray-800 dark:text-white">Selected Locations</Typography>
                  {selectedLocations.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          // Remove the last added location (undo functionality)
                          if (selectedLocations.length > 0) {
                            const lastLocation = selectedLocations[selectedLocations.length - 1];
                            handleRemoveLocation(lastLocation.id);
                          }
                        }}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/10 py-1 min-w-0 px-2"
                      >
                        <span className="mr-1">Undo</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-undo-2">
                          <path d="M9 14 4 9l5-5"/>
                          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
                        </svg>
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          // Clear all selected locations
                          setSelectedLocations([]);
                          setFormData(prev => ({
                            ...prev,
                            locationIds: []
                          }));
                        }}
                        className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/10 py-1 min-w-0 px-2"
                      >
                        <span className="mr-1">Clear All</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
                          <path d="M3 6h18"/>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          <line x1="10" x2="10" y1="11" y2="17"/>
                          <line x1="14" x2="14" y1="11" y2="17"/>
                        </svg>
                      </Button>
                    </div>
                  )}
                </div>
                <Box className="p-3 bg-gray-50 border border-gray-200 rounded-md min-h-24 max-h-64 overflow-y-auto dark:bg-dark-tertiary dark:border-stroke-dark shadow-inner">
                  {selectedLocations.length === 0 ? (
                    <Typography className="text-gray-500 dark:text-neutral-400 text-sm italic">
                      Select locations from the table on the right.
                    </Typography>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedLocations.map((location) => (
                        <Chip
                          key={location.id}
                          label={`${location.name} (${location.id})`}
                          onClick={() => handleRemoveLocation(location.id)}
                          onDelete={() => handleRemoveLocation(location.id)}
                          className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200 border border-blue-100 dark:border-blue-900/30 cursor-pointer"
                          deleteIcon={<X className="h-4 w-4 text-blue-500 dark:text-blue-300" />}
                        />
                      ))}
                    </div>
                  )}
                </Box>
                <Typography className="text-xs text-gray-500 mt-1 dark:text-neutral-500">
                  {selectedLocations.length > 0
                    ? `${selectedLocations.length} location${selectedLocations.length !== 1 ? 's' : ''} selected`
                    : "No locations selected"}
                </Typography>
              </div>
            </Grid>
            
            {/* Right column - Location Table */}
            <Grid item xs={12} md={6}>
              <LocationTable
                selectedLocationIds={formData.locationIds}
                onLocationSelect={handleAddLocation}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            color="primary"
            variant="contained"
            disabled={!formData.name.trim()}
          >
            {currentGroup ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Admin Dialog - Only shown to regular admins */}
      {isAdmin && (
        <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Assign Admin to {currentGroup?.name}
          </DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel id="user-label">Select Location Admin</InputLabel>
              <Select
                labelId="user-label"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value as number)}
                label="Location Admin User"
              >
                <MenuItem value="">
                  <em>Select a user</em>
                </MenuItem>
                {availableUsers.map((user) => (
                  <MenuItem key={user.userId} value={user.userId}>
                    {user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {availableUsers.length === 0 && (
              <p className="text-amber-600 mt-2 text-sm">
                No available Location Admin users found. Users must have the LOCATION_ADMIN role assigned to their team to be assigned to a group.
              </p>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenUserDialog(false)} color="primary">
              Cancel
            </Button>
            <Button
              onClick={handleAssignUser}
              color="primary"
              variant="contained"
              disabled={selectedUserId === ""}
            >
              Assign
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
};

export default GroupsPage;