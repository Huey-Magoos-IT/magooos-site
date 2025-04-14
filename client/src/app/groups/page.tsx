"use client";

import React, { useState } from "react";
import { useGetGroupsQuery, useCreateGroupMutation, useUpdateGroupMutation, useDeleteGroupMutation, useGetUsersQuery, useAssignGroupToUserMutation, Group } from "@/state/api";
import { useGetAuthUserQuery } from "@/state/api";
import { hasRole } from "@/lib/accessControl";
import GroupCard from "@/components/GroupCard";
import LocationTable, { Location } from "@/components/LocationTable";
import Header from "@/components/Header";
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

  // Check if user is admin
  const userRoles = authData?.userDetails?.team?.teamRoles || [];
  const isAdmin = hasRole(userRoles, "ADMIN");
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
    } else {
      setCurrentGroup(null);
      setFormData({
        name: "",
        description: "",
        locationIds: []
      });
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

  // Handle location selection
  const handleLocationChange = (event: SelectChangeEvent<string[]>) => {
    const { value } = event.target;
    setFormData(prev => ({
      ...prev,
      locationIds: typeof value === 'string' ? value.split(',') : value
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
    const userTeamRoles = user.team?.teamRoles || [];
    return userTeamRoles.some(tr => tr.role.name === "LOCATION_ADMIN");
  });

  // Filter out users already assigned to the current group
  const availableUsers = locationAdminUsers.filter(user => {
    return user.groupId !== currentGroup?.id;
  });

  if (isLoadingGroups || isLoadingUsers) {
    return <div className="p-6">Loading...</div>;
  }

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
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentGroup ? "Edit Group" : "Create Group"}
        </DialogTitle>
        <DialogContent>
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
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="locations-label">Locations</InputLabel>
            <Select
              labelId="locations-label"
              multiple
              value={formData.locationIds}
              onChange={handleLocationChange}
              input={<OutlinedInput id="select-multiple-locations" label="Locations" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {allLocations.map((location) => (
                <MenuItem key={location} value={location}>
                  {location}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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

      {/* Assign User Dialog */}
      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign User to {currentGroup?.name}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="user-label">Location Admin User</InputLabel>
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
              No available Location Admin users found. Users must have the LOCATION_ADMIN role to be assigned to a group.
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
    </div>
  );
};

export default GroupsPage;