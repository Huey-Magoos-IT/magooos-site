"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, User, Trash2, AlertTriangle, UserX, Edit, KeyRound } from "lucide-react";
import RoleBadge from "../RoleBadge";
import { FormControl, MenuItem, Select, SelectChangeEvent, Button } from "@mui/material";
import { useGetLocationsQuery } from "@/state/lambdaApi";
import { useUpdateUserLocationsMutation, useGetAuthUserQuery } from "@/state/api";
import { Location } from "@/components/LocationTable";
import { S3_IMAGE_BUCKET_URL } from "@/lib/constants";
import UserLocationDialog from "./components/UserLocationDialog";
import UserActionDialogs from "./components/UserActionDialogs";

interface UserCardProps {
  user: {
    userId: number;
    username: string;
    email?: string;
    profilePictureUrl?: string;
    teamId?: number | null;
    locationIds?: string[];
    groupId?: number;
    isDisabled?: boolean;
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
  // UI state
  const [expanded, setExpanded] = useState(false);
  const [openLocationDialog, setOpenLocationDialog] = useState(false);

  // Location state
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [previousLocations, setPreviousLocations] = useState<Location[]>([]);
  const [lastAction, setLastAction] = useState<string>("");
  const [locationUpdateStatus, setLocationUpdateStatus] = useState<"success" | "error" | "pending" | null>(null);

  // Dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEnableConfirm, setShowEnableConfirm] = useState(false);
  const [showHardDeleteConfirm, setShowHardDeleteConfirm] = useState(false);

  // Loading state
  const [isDisabling, setIsDisabling] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isHardDeleting, setIsHardDeleting] = useState(false);

  // API hooks
  const { data: authData } = useGetAuthUserQuery({});
  const { data: locationsData } = useGetLocationsQuery();
  const [updateUserLocations] = useUpdateUserLocationsMutation();

  // Derived data
  const currentTeam = teams.find(team => team.id === user.teamId);
  const userRoles = currentTeam?.teamRoles?.map(tr => tr.role) || [];

  const userLocations = useMemo(() => {
    if (locationsData?.locations && user.locationIds) {
      return locationsData.locations.filter(
        location => user.locationIds?.includes(location.id)
      );
    }
    return [];
  }, [locationsData, user.locationIds]);

  // Initialize selected locations when opening dialog
  useEffect(() => {
    if (openLocationDialog && userLocations) {
      setSelectedLocations(userLocations);
    }
  }, [openLocationDialog, userLocations]);

  // Team change handler
  const handleTeamChange = (event: SelectChangeEvent<number | string>) => {
    const newTeamId = event.target.value === "" ? null : Number(event.target.value);
    onTeamChange(user.userId, newTeamId);
  };

  // Location handlers
  const handleAddLocation = (location: Location) => {
    setPreviousLocations([...selectedLocations]);
    setLastAction("add");
    setSelectedLocations(prev => [...prev, location]);
  };

  const handleRemoveLocation = (locationId: string) => {
    setPreviousLocations([...selectedLocations]);
    setLastAction("remove");
    setSelectedLocations(prev => prev.filter(loc => loc.id !== locationId));
  };

  const handleAddAllLocations = () => {
    setPreviousLocations([...selectedLocations]);
    setLastAction("addAll");
    if (locationsData?.locations) {
      setSelectedLocations(locationsData.locations);
    }
  };

  const handleClearAll = () => {
    setPreviousLocations([...selectedLocations]);
    setLastAction("clearAll");
    setSelectedLocations([]);
  };

  const handleUndo = () => {
    if (lastAction) {
      setSelectedLocations(previousLocations);
      setLastAction("");
    }
  };

  const handleSaveLocations = async () => {
    try {
      setLocationUpdateStatus("pending");
      const requestingUserId = authData?.userDetails?.userId;

      if (!requestingUserId) {
        console.error("Authenticated user ID not found.");
        setLocationUpdateStatus("error");
        return;
      }

      await updateUserLocations({
        userId: user.userId,
        locationIds: selectedLocations.map(loc => loc.id),
        requestingUserId: requestingUserId
      }).unwrap();

      setLocationUpdateStatus("success");
      setTimeout(() => {
        setLocationUpdateStatus(null);
        setOpenLocationDialog(false);
      }, 1000);
    } catch (error) {
      console.error("Error updating user locations:", error);
      setLocationUpdateStatus("error");
    }
  };

  // Dialog handlers
  const handleCloseLocationDialog = () => {
    setOpenLocationDialog(false);
    setLocationUpdateStatus(null);
  };

  // User action handlers
  const handleConfirmDisableUser = async () => {
    if (!onDisableUser) return;
    setIsDisabling(true);
    try {
      await onDisableUser(user.userId);
    } catch (err) {
      console.error("Failed to disable user:", err);
    } finally {
      setIsDisabling(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleConfirmEnableUser = async () => {
    if (!onEnableUser) return;
    setIsEnabling(true);
    try {
      await onEnableUser(user.userId);
    } catch (err) {
      console.error("Failed to enable user:", err);
    } finally {
      setIsEnabling(false);
      setShowEnableConfirm(false);
    }
  };

  const handleConfirmHardDeleteUser = async () => {
    if (!onDeleteUser) return;
    setIsHardDeleting(true);
    try {
      await onDeleteUser(user);
    } catch (err) {
      console.error("Failed to hard delete user:", err);
    } finally {
      setIsHardDeleting(false);
      setShowHardDeleteConfirm(false);
    }
  };

  return (
    <div className={`bg-[var(--theme-surface)] rounded-lg shadow-sm border border-[var(--theme-border)] overflow-hidden mb-4 ${user.isDisabled ? 'opacity-70' : ''}`}>
      {/* Main card content */}
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
                onClick={() => setShowDeleteConfirm(true)}
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
                onClick={() => setShowEnableConfirm(true)}
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

        {/* Role badges */}
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

        {/* Team selector */}
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

      {/* Expanded section */}
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
                    onClick={() => setOpenLocationDialog(true)}
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
                    color="warning"
                    startIcon={<UserX />}
                    onClick={() => setShowDeleteConfirm(true)}
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
                    onClick={() => setShowEnableConfirm(true)}
                    size="small"
                    disabled={isEnabling}
                  >
                    {isEnabling ? "Enabling..." : "Enable User"}
                  </Button>
                )}
                {isAdmin && onDeleteUser && (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<AlertTriangle />}
                    onClick={() => setShowHardDeleteConfirm(true)}
                    size="small"
                    disabled={isHardDeleting || isDisabling || isEnabling}
                    sx={{ backgroundColor: '#d32f2f', '&:hover': { backgroundColor: '#b71c1c' } }}
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
      <UserLocationDialog
        open={openLocationDialog}
        onClose={handleCloseLocationDialog}
        username={user.username}
        selectedLocations={selectedLocations}
        lastAction={lastAction}
        locationUpdateStatus={locationUpdateStatus}
        onUndo={handleUndo}
        onClearAll={handleClearAll}
        onAddAll={handleAddAllLocations}
        onRemoveLocation={handleRemoveLocation}
        onAddLocation={handleAddLocation}
        onSave={handleSaveLocations}
      />

      {/* Action Confirmation Dialogs */}
      <UserActionDialogs
        username={user.username}
        userId={user.userId}
        showDisableConfirm={showDeleteConfirm}
        isDisabling={isDisabling}
        onCloseDisable={() => setShowDeleteConfirm(false)}
        onConfirmDisable={handleConfirmDisableUser}
        showEnableConfirm={showEnableConfirm}
        isEnabling={isEnabling}
        onCloseEnable={() => setShowEnableConfirm(false)}
        onConfirmEnable={handleConfirmEnableUser}
        showHardDeleteConfirm={showHardDeleteConfirm}
        isHardDeleting={isHardDeleting}
        onCloseHardDelete={() => setShowHardDeleteConfirm(false)}
        onConfirmHardDelete={handleConfirmHardDeleteUser}
      />
    </div>
  );
};

export default UserCard;
