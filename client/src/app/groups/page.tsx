"use client";

import React, { useState } from "react";
import { useGetLocationsQuery } from "@/state/lambdaApi";
import {
  useGetGroupsQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useGetUsersQuery,
  useGetTeamsQuery,
  useAssignGroupToUserMutation,
  Group,
  User,
  Team,
  TeamRole
} from "@/state/api";
import { useGetAuthUserQuery } from "@/state/api";
import { hasRole } from "@/lib/accessControl";
import GroupCard from "@/components/GroupCard";
import LocationTable, { Location } from "@/components/LocationTable";
import ModalCreateLocationUser from "@/components/ModalCreateLocationUser"; // Import new modal
import Header from "@/components/Header";
import { X } from "lucide-react";
import { signUp } from 'aws-amplify/auth'; // Import signUp
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
  const { data: locationsData } = useGetLocationsQuery();
  const [createGroup] = useCreateGroupMutation();
  const [updateGroup] = useUpdateGroupMutation();
  const [deleteGroup] = useDeleteGroupMutation();
  const [assignGroupToUser] = useAssignGroupToUserMutation();

  const [openDialog, setOpenDialog] = useState(false);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [openLocationUserDialog, setOpenLocationUserDialog] = useState(false); // New state for location user modal
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    locationIds: [] as string[]
  });
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [previousLocations, setPreviousLocations] = useState<Location[]>([]);
  const [lastAction, setLastAction] = useState<string>("");

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
    // Save current state for undo
    setPreviousLocations([...selectedLocations]);
    setLastAction("add");
    
    // Add the location
    setSelectedLocations(prev => [...prev, location]);
    setFormData(prev => ({
      ...prev,
      locationIds: [...prev.locationIds, location.id]
    }));
  };

  // Handle removing a location
  const handleRemoveLocation = (locationId: string) => {
    // Save current state for undo
    setPreviousLocations([...selectedLocations]);
    const previousLocationIds = [...formData.locationIds];
    setLastAction("remove");
    
    // Remove the location
    setSelectedLocations(prev => prev.filter(loc => loc.id !== locationId));
    setFormData(prev => ({
      ...prev,
      locationIds: prev.locationIds.filter(id => id !== locationId)
    }));
  };

  // Handle adding all available locations
  const handleAddAllLocations = () => {
    // Save current state for undo
    setPreviousLocations([...selectedLocations]);
    const previousLocationIds = [...formData.locationIds];
    setLastAction("addAll");
    
    if (locationsData?.locations) {
      // Add all available locations
      setSelectedLocations(locationsData.locations);
      setFormData(prev => ({
        ...prev,
        locationIds: locationsData.locations.map(loc => loc.id)
      }));
    }
  };

  // Handle clearing all locations
  const handleClearAll = () => {
    // Save current state for undo
    setPreviousLocations([...selectedLocations]);
    const previousLocationIds = [...formData.locationIds];
    setLastAction("clearAll");
    
    // Clear all locations
    setSelectedLocations([]);
    setFormData(prev => ({
      ...prev,
      locationIds: []
    }));
  };

  // Handle undo action
  const handleUndo = () => {
    if (lastAction) {
      // Restore previous state
      setSelectedLocations(previousLocations);
      setFormData(prev => ({
        ...prev,
        locationIds: previousLocations.map(loc => loc.id)
      }));
      
      // Reset last action
      setLastAction("");
    }
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

  // Handle Location User creation dialog
  const handleOpenLocationUserDialog = (group: Group) => {
    setCurrentGroup(group); // Set the group context for creating the user
    setOpenLocationUserDialog(true);
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

  // Handler for submitting the new location user
  const handleSubmitLocationUser = async (formData: {
    username: string;
    email: string;
    tempPassword: string;
    teamId: number; // This will be the "Location User" team ID
    locationIds: string[];
    groupId: number;
  }) => {
    try {
      console.log("Creating location user via Amplify signUp:", formData.username, formData.email);
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: formData.username,
        password: formData.tempPassword,
        options: {
          userAttributes: {
            email: formData.email,
            'custom:teamId': String(formData.teamId),
            'custom:locationIds': JSON.stringify(formData.locationIds || []),
            'custom:groupId': String(formData.groupId), // Add groupId as custom attribute
          },
        }
      });
      console.log("Cognito signUp response for location user:", { isSignUpComplete, userId, nextStep });
      alert(`Location User ${formData.username} created. They must verify their email (${formData.email}) via the link sent. Once verified and logged in, their database record will be created.`);
      setOpenLocationUserDialog(false); // Close the modal on success
    } catch (error: any) {
      console.error("Error creating location user via Amplify signUp:", error);
      throw new Error(error.message || "Failed to initiate location user creation");
    }
  };

  // Get all teams from the API
  const { data: teamsData } = useGetTeamsQuery();
  const allTeams = teamsData?.teams || []; // Ensure allTeams is always an array for the modal
  
  // Find teams that have the LOCATION_ADMIN role
  const teamsWithLocationAdminRole = teamsData?.teams?.filter((team: Team) =>
    team.teamRoles?.some((tr: TeamRole) =>
      tr.role.name.toUpperCase() === "LOCATION_ADMIN"
    )
  ) || [];
  
  console.log("Teams with LOCATION_ADMIN role:", teamsWithLocationAdminRole.map((team: Team) => ({
    id: team.id,
    name: team.teamName,
    roles: team.teamRoles?.map((tr: TeamRole) => tr.role.name)
  })));
  
  // Get all users from teams with LOCATION_ADMIN role
  const locationAdminUsers = teamsWithLocationAdminRole.flatMap((team: Team) => {
    // Based on the JSON you provided, the property might be called 'user' in the API response
    // but TypeScript expects a different property name
    return (team as any).user || [];
  });
  
  console.log("Users from teams with LOCATION_ADMIN role:", locationAdminUsers.map((user: any) => ({
    userId: user.userId,
    username: user.username
  })));
  
  // Filter out users already assigned to the current group
  const availableUsers = locationAdminUsers.filter((user: any) => {
    const fullUser = users.find((u: User) => u.userId === user.userId);
    return fullUser?.groupId !== currentGroup?.id;
  });
  
  console.log("Available users for group assignment:", availableUsers.map((user: any) => ({
    userId: user.userId,
    username: user.username
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
              isLocationAdmin={isLocationAdmin && authData?.userDetails?.groupId === group.id} // Pass isLocationAdmin only if they manage THIS group
              onEdit={isAdmin ? (group) => handleOpenDialog(group) : undefined}
              onDelete={isAdmin ? handleDeleteGroup : undefined}
              onManageUsers={isAdmin ? handleOpenUserDialog : undefined}
              onCreateLocationUser={isLocationAdmin && authData?.userDetails?.groupId === group.id ? handleOpenLocationUserDialog : undefined} // Pass handler
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
                  <div className="flex gap-2">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleUndo}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/10 py-1 min-w-0 px-2"
                      disabled={!lastAction}
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
                      onClick={handleClearAll}
                      className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/10 py-1 min-w-0 px-2"
                      disabled={selectedLocations.length === 0}
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
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleAddAllLocations}
                      className="text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/10 py-1 min-w-0 px-2"
                    >
                      <span className="mr-1">Add All</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </Button>
                  </div>
                </div>
                <Box className="p-3 bg-gray-50 border border-gray-200 rounded-md min-h-24 max-h-64 overflow-y-auto dark:bg-dark-tertiary dark:border-stroke-dark shadow-inner">
                  {selectedLocations.length === 0 ? (
                    <Typography className="text-gray-500 dark:text-neutral-400 text-sm italic">
                      Please select at least one location.
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
            disabled={!formData.name.trim() || formData.locationIds.length === 0}
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
                {availableUsers.map((user: any) => (
                  <MenuItem key={user.userId} value={user.userId}>
                    {user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {availableUsers.length === 0 && (
              <p className="text-amber-600 mt-2 text-sm">
                No available Location Admin users found. Users must be in a team that has the LOCATION_ADMIN role to be assigned to a group.
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

      {/* Create Location User Dialog */}
      {currentGroup && (
        <ModalCreateLocationUser
          open={openLocationUserDialog}
          onClose={() => setOpenLocationUserDialog(false)}
          onSubmit={handleSubmitLocationUser}
          groupLocationIds={currentGroup.locationIds || []}
          groupId={currentGroup.id}
          allTeams={allTeams}
        />
      )}
    </div>
  );
};

export default GroupsPage;