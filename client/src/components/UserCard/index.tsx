"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, User, X, Trash2, AlertTriangle, UserX, Edit, KeyRound } from "lucide-react"; // Added AlertTriangle & UserX
import RoleBadge from "../RoleBadge";
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Typography, Box, Chip, CircularProgress } from "@mui/material";
import { useGetLocationsQuery } from "@/state/lambdaApi";
import { useUpdateUserLocationsMutation, useGetAuthUserQuery } from "@/state/api";
import LocationTable, { Location } from "@/components/LocationTable";
import { S3_IMAGE_BUCKET_URL } from "@/lib/constants";

interface UserCardProps {
  user: {
    userId: number;
    username: string;
    email?: string;
    profilePictureUrl?: string;
    teamId?: number | null;
    locationIds?: string[];
    groupId?: number;
    isDisabled?: boolean; // Add isDisabled here
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
  onDisableUser?: (userId: number) => Promise<void>;
  onEnableUser?: (userId: number) => Promise<void>;
  onDeleteUser?: (user: UserCardProps['user']) => void;
  onEditEmail?: (user: UserCardProps['user']) => void;
  onResetPassword?: (user: UserCardProps['user']) => void;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  teams,
  roles,
  isAdmin,
  onTeamChange,
  updateStatus = {},
  onDisableUser,
  onEnableUser,
  onDeleteUser,
  onEditEmail,
  onResetPassword,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [previousLocations, setPreviousLocations] = useState<Location[]>([]);
  const [lastAction, setLastAction] = useState<string>("");
  const [locationUpdateStatus, setLocationUpdateStatus] = useState<"success" | "error" | "pending" | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEnableConfirm, setShowEnableConfirm] = useState(false); // For enable confirmation
  const [showHardDeleteConfirm, setShowHardDeleteConfirm] = useState(false); // For hard delete confirmation
  const [isDisabling, setIsDisabling] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false); // New state for loading enable
  const [isHardDeleting, setIsHardDeleting] = useState(false); // New state for hard delete

  // Get authenticated user data
  const { data: authData } = useGetAuthUserQuery({});

  // Get locations data
  const { data: locationsData } = useGetLocationsQuery();
  const [updateUserLocations] = useUpdateUserLocationsMutation();

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

  // Initialize selected locations when opening the dialog
  useEffect(() => {
    if (openLocationDialog && userLocations) {
      setSelectedLocations(userLocations);
    }
  }, [openLocationDialog, userLocations]);

  // Handle team change
  const handleTeamChange = (event: SelectChangeEvent<number | string>) => {
    const newTeamId = event.target.value === "" ? null : Number(event.target.value);
    onTeamChange(user.userId, newTeamId);
    // Note: Page reload is handled in the parent component after the API call completes
  };

  // Handle location selection from LocationTable
  const handleAddLocation = (location: Location) => {
    // Save current state for undo
    setPreviousLocations([...selectedLocations]);
    setLastAction("add");

    // Add the location
    setSelectedLocations(prev => [...prev, location]);
  };

  // Handle removing a location
  const handleRemoveLocation = (locationId: string) => {
    // Save current state for undo
    setPreviousLocations([...selectedLocations]);
    setLastAction("remove");

    // Remove the location
    setSelectedLocations(prev => prev.filter(loc => loc.id !== locationId));
  };

  // Handle adding all available locations
  const handleAddAllLocations = () => {
    // Save current state for undo
    setPreviousLocations([...selectedLocations]);
    setLastAction("addAll");

    if (locationsData?.locations) {
      // Add all available locations
      setSelectedLocations(locationsData.locations);
    }
  };

  // Handle clearing all locations
  const handleClearAll = () => {
    // Save current state for undo
    setPreviousLocations([...selectedLocations]);
    setLastAction("clearAll");

    // Clear all locations
    setSelectedLocations([]);
  };

  // Handle undo action
  const handleUndo = () => {
    if (lastAction) {
      // Restore previous state
      setSelectedLocations(previousLocations);

      // Reset last action
      setLastAction("");
    }
  };

  // Handle saving locations
  const handleSaveLocations = async () => {
    try {
      setLocationUpdateStatus("pending");

      // Get the authenticated user's ID to include in the request
      const requestingUserId = authData?.userDetails?.userId;

      if (!requestingUserId) {
        console.error("Authenticated user ID not found.");
        setLocationUpdateStatus("error");
        return;
      }

      // Include the requestingUserId in the request body
      await updateUserLocations({
        userId: user.userId,
        locationIds: selectedLocations.map(loc => loc.id),
        requestingUserId: requestingUserId // Pass the authenticated user's ID
      }).unwrap();

      setLocationUpdateStatus("success");

      // Close dialog after a short delay to show success message
      setTimeout(() => {
        setLocationUpdateStatus(null);
        setOpenLocationDialog(false);
      }, 1000);
    } catch (error) {
      console.error("Error updating user locations:", error);
      setLocationUpdateStatus("error");
    }
  };

  // Handle opening the location dialog
  const handleOpenLocationDialog = () => {
    setOpenLocationDialog(true);
  };

  // Handle closing the location dialog
  const handleCloseLocationDialog = () => {
    setOpenLocationDialog(false);
    setLocationUpdateStatus(null);
  };

  const openDeleteConfirmModal = () => {
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirmModal = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDisableUser = async () => {
    if (!onDisableUser) {
      console.error("onDisableUser prop is not provided to UserCard");
      return;
    }
    setIsDisabling(true);
    try {
      await onDisableUser(user.userId);
      // Optionally, handle success feedback here or rely on parent component
      console.log(`User ${user.userId} - ${user.username} disable process initiated.`);
    } catch (err) {
      console.error("Failed to disable user:", err);
      // Optionally, handle error feedback here
    } finally {
      setIsDisabling(false);
      closeDeleteConfirmModal();
    }
  };

  const openEnableConfirmModal = () => {
    setShowEnableConfirm(true);
  };

  const closeEnableConfirmModal = () => {
    setShowEnableConfirm(false);
  };

  const handleConfirmEnableUser = async () => {
    if (!onEnableUser) {
      console.error("onEnableUser prop is not provided to UserCard");
      return;
    }
    setIsEnabling(true);
    try {
      await onEnableUser(user.userId);
      console.log(`User ${user.userId} - ${user.username} enable process initiated.`); 
    } catch (err) {
      console.error("Failed to enable user:", err);
    } finally {
      setIsEnabling(false);
      closeEnableConfirmModal();
    }
  };

  const openHardDeleteConfirmModal = () => {
    setShowHardDeleteConfirm(true);
  };

  const closeHardDeleteConfirmModal = () => {
    setShowHardDeleteConfirm(false);
  };

  const handleConfirmHardDeleteUser = async () => {
    if (!onDeleteUser) {
      console.error("onDeleteUser prop is not provided to UserCard");
      return;
    }
    setIsHardDeleting(true);
    try {
      await onDeleteUser(user); // Pass the whole user object
      console.log(`User ${user.userId} - ${user.username} hard delete process initiated.`);
    } catch (err) {
      console.error("Failed to hard delete user:", err);
    } finally {
      setIsHardDeleting(false);
      closeHardDeleteConfirmModal();
    }
  };

  return (
    <div className={`bg-[var(--theme-surface)] rounded-lg shadow-sm border border-[var(--theme-border)] overflow-hidden mb-4 ${user.isDisabled ? 'opacity-70' : ''}`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-[var(--theme-surface-hover)] flex items-center justify-center">
              {user.profilePictureUrl ? (
                <Image
                  src={`${S3_IMAGE_BUCKET_URL}/${user.profilePictureUrl}`}
                  alt={user.username}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={24} className="text-[var(--theme-text-muted)]" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-[var(--theme-text)]">{user.username}</h3>
              <p className="text-sm text-[var(--theme-text-muted)]">
                {user.email || `ID: ${user.userId}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {isAdmin && onEditEmail && (
              <button
                onClick={() => onEditEmail(user)}
                className="p-1 rounded-full hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)]"
                aria-label="Edit Email"
              >
                <Edit size={18} />
              </button>
            )}
            {isAdmin && onResetPassword && (
              <button
                onClick={() => onResetPassword(user)}
                className="p-1 rounded-full hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)]"
                aria-label="Reset Password"
              >
                <KeyRound size={18} />
              </button>
            )}
            {isAdmin && !user.isDisabled && onDisableUser && (
              <button
                onClick={openDeleteConfirmModal}
                className="p-1 rounded-full hover:bg-[var(--theme-accent)]/20 text-[var(--theme-accent)]"
                aria-label="Disable User"
              >
                <UserX size={18} />
              </button>
            )}
            {isAdmin && user.isDisabled && onEnableUser && ( 
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={openEnableConfirmModal}
                className="p-1 text-xs" 
              >
                Enable User
              </Button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-full hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)]"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
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
            <span className="text-sm text-[var(--theme-text-muted)]">No roles assigned</span>
          )}
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium text-[var(--theme-text-secondary)] mb-1">Team</div>
          {isAdmin ? (
            <FormControl fullWidth size="small" className="bg-[var(--theme-surface-hover)] rounded">
              <Select
                value={user.teamId || ''}
                onChange={handleTeamChange}
                className="text-[var(--theme-text)]"
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
            <div className="text-sm text-[var(--theme-text)]">
              {currentTeam ? currentTeam.teamName : "No Team"}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--theme-border)] p-4 bg-[var(--theme-surface-hover)]">
          <h4 className="text-sm font-medium text-[var(--theme-text-secondary)] mb-2">Additional Information</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-[var(--theme-text-muted)]">Team Roles:</span>
              <span className="text-sm text-[var(--theme-text)]">
                {userRoles.map(r => r.name).join(", ") || "None"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[var(--theme-text-muted)]">Admin Access:</span>
              <span className="text-sm text-[var(--theme-text)]">
                {userRoles.some(r => r.name === "ADMIN") ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[var(--theme-text-muted)]">Data Access:</span>
              <span className="text-sm text-[var(--theme-text)]">
                {userRoles.some(r => r.name === "DATA" || r.name === "ADMIN") ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[var(--theme-text-muted)]">Reporting Access:</span>
              <span className="text-sm text-[var(--theme-text)]">
                {userRoles.some(r => r.name === "REPORTING" || r.name === "ADMIN") ? "Yes" : "No"}
              </span>
            </div>

            {/* Locations Section */}
            <div className="mt-4 pt-3 border-t border-[var(--theme-border)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--theme-text-secondary)]">Assigned Locations:</span>
                {isAdmin && (
                  <button
                    onClick={handleOpenLocationDialog}
                    className="text-xs bg-[var(--theme-primary)]/10 hover:bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mt-1">
                {userLocations.length > 0 ? (
                  userLocations.map(location => (
                    <span
                      key={location.id}
                      className="px-2 py-1 text-xs bg-[var(--theme-surface-active)] text-[var(--theme-text)] rounded-full"
                    >
                      {location.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[var(--theme-text-muted)]">No locations assigned</span>
                )}
              </div>
            </div>
            {/* Action buttons in expanded view */}
            {isAdmin && (
              <div className="mt-6 pt-4 border-t border-[var(--theme-border)] flex justify-end space-x-2">
                {!user.isDisabled && onDisableUser && (
                  <Button
                    variant="outlined"
                    color="warning" // Changed to warning for disable
                    startIcon={<UserX />} // Changed icon
                    onClick={openDeleteConfirmModal}
                    size="small"
                    disabled={isDisabling}
                  >
                    {isDisabling ? "Disabling..." : "Disable User"}
                  </Button>
                )}
                {user.isDisabled && onEnableUser && (
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={openEnableConfirmModal}
                    size="small"
                    disabled={isEnabling}
                  >
                    {isEnabling ? "Enabling..." : "Enable User"}
                  </Button>
                )}
                {/* Hard Delete Button */}
                {isAdmin && onDeleteUser && (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<AlertTriangle />}
                    onClick={openHardDeleteConfirmModal}
                    size="small"
                    disabled={isHardDeleting || isDisabling || isEnabling} // Disable if any action is in progress
                    sx={{ backgroundColor: '#d32f2f', '&:hover': { backgroundColor: '#b71c1c' } }} // More prominent red
                  >
                    {isHardDeleting ? "Deleting..." : "Delete Permanently"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location Selection Dialog */}
      <Dialog open={openLocationDialog} onClose={handleCloseLocationDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          Edit Locations for {user.username}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Left column - Selected Locations */}
            <Grid item xs={12} md={6}>
              {/* Selected Locations Display */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Typography className="font-medium text-[var(--theme-text)]">Selected Locations</Typography>
                  <div className="flex gap-2">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleUndo}
                      disabled={!lastAction}
                      sx={{
                        color: 'var(--theme-primary)',
                        borderColor: 'var(--theme-border)',
                        '&:hover': { backgroundColor: 'var(--theme-surface-hover)' }
                      }}
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
                      disabled={selectedLocations.length === 0}
                      color="error"
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
                      color="success"
                    >
                      <span className="mr-1">Add All</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </Button>
                  </div>
                </div>
                <Box className="p-3 bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded-md min-h-24 max-h-64 overflow-y-auto shadow-inner">
                  {selectedLocations.length === 0 ? (
                    <Typography className="text-[var(--theme-text-muted)] text-sm italic">
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
                          sx={{
                            backgroundColor: 'var(--theme-primary-light)',
                            color: 'var(--theme-primary)',
                            border: '1px solid var(--theme-border)',
                            cursor: 'pointer'
                          }}
                          deleteIcon={<X className="h-4 w-4" style={{ color: 'var(--theme-primary)' }} />}
                        />
                      ))}
                    </div>
                  )}
                </Box>
                <Typography className="text-xs text-[var(--theme-text-muted)] mt-1">
                  {selectedLocations.length > 0
                    ? `${selectedLocations.length} location${selectedLocations.length !== 1 ? 's' : ''} selected`
                    : "No locations selected"}
                </Typography>

                {/* Status Messages */}
                {locationUpdateStatus === "success" && (
                  <div className="mt-2 p-2 bg-[var(--theme-success)]/10 text-[var(--theme-success)] rounded text-sm">
                    Locations updated successfully!
                  </div>
                )}
                {locationUpdateStatus === "error" && (
                  <div className="mt-2 p-2 bg-red-500/10 text-red-500 rounded text-sm">
                    Error updating locations. Please try again.
                  </div>
                )}
                {locationUpdateStatus === "pending" && (
                  <div className="mt-2 p-2 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded text-sm">
                    Updating locations...
                  </div>
                )}
              </div>
            </Grid>

            {/* Right column - Location Table */}
            <Grid item xs={12} md={6}>
              <LocationTable
                selectedLocationIds={selectedLocations.map(loc => loc.id)}
                onLocationSelect={handleAddLocation}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLocationDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleSaveLocations}
            color="primary"
            variant="contained"
            disabled={locationUpdateStatus === "pending"}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onClose={closeDeleteConfirmModal}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <UserX className="mr-2 text-yellow-600" /> Confirm Disable User
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to disable the user &quot;{user.username}&quot;?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            This user will no longer be able to log in and will be moved to a disabled users list. They can be re-enabled later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteConfirmModal} disabled={isDisabling}>Cancel</Button>
          <Button
            onClick={handleConfirmDisableUser}
            color="warning"
            variant="contained"
            disabled={isDisabling}
            startIcon={isDisabling ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isDisabling ? "Disabling..." : "Disable User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enable Confirmation Dialog */}
      <Dialog open={showEnableConfirm} onClose={closeEnableConfirmModal}>
        <DialogTitle>Confirm Enable User</DialogTitle>
        <DialogContent>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <Typography>
            Are you sure you want to enable the user &quot;{user.username}&quot;?
            This will re-enable their account.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEnableConfirmModal} disabled={isEnabling}>Cancel</Button>
          <Button
            onClick={handleConfirmEnableUser}
            color="success"
            variant="contained"
            disabled={isEnabling}
            startIcon={isEnabling ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isEnabling ? "Enabling..." : "Enable User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hard Delete Confirmation Dialog */}
      <Dialog open={showHardDeleteConfirm} onClose={closeHardDeleteConfirmModal}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <AlertTriangle className="mr-2 text-red-600" /> Confirm Permanent Deletion
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you absolutely sure you want to permanently delete the user &quot;<strong>{user.username}</strong>&quot; (ID: {user.userId})?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            This action cannot be undone. All related data (tasks, comments, attachments etc., depending on server configuration) will be permanently removed or disassociated. The user will also be deleted from Cognito.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeHardDeleteConfirmModal} disabled={isHardDeleting}>Cancel</Button>
          <Button
            onClick={handleConfirmHardDeleteUser}
            color="error"
            variant="contained"
            disabled={isHardDeleting}
            startIcon={isHardDeleting ? <CircularProgress size={20} color="inherit" /> : <Trash2 />}
          >
            {isHardDeleting ? "Deleting..." : "Yes, Delete Permanently"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default UserCard;
