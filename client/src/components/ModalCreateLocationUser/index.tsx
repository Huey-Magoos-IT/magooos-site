"use client";
import React, { useState, useEffect } from "react"; // Added useEffect
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from "@mui/material";
import { Grid } from "@mui/material";
import { Undo2, Trash2, CheckCircle, X } from "lucide-react";
import { useAppSelector } from "@/app/redux";
import { Team, useGetTeamsQuery } from "@/state/api"; // Keep Team type, import useGetTeamsQuery from main api
import { useGetLocationsQuery } from "@/state/lambdaApi";
import LocationTable, { Location } from "@/components/LocationTable";
import { useLocationSelection } from "@/hooks/useLocationSelection";

interface ModalCreateLocationUserProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: {
    username: string;
    email: string;
    tempPassword: string;
    teamId: number; // This will be the "Location User" team ID
    locationIds: string[];
    groupId: number; // To associate user with the LA's group
  }) => Promise<void>;
  groupLocationIds: string[]; // Locations available to this LA's group
  groupId: number; // The ID of the group this LA manages
  allTeams: Team[]; // Pass all teams to find "Location User" team
}

const ModalCreateLocationUser: React.FC<ModalCreateLocationUserProps> = ({
  open,
  onClose,
  onSubmit,
  groupLocationIds,
  groupId,
  allTeams,
}) => {
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [locationUserTeamId, setLocationUserTeamId] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: allLocationsData } = useGetLocationsQuery(); // For "Add All" and displaying names

  // Use the location selection hook
  const {
    selectedLocationIds,
    lastAction,
    handleAddLocation,
    handleRemoveLocation,
    handleAddAllLocations,
    handleClearAll,
    handleUndo,
    reset: resetLocations,
  } = useLocationSelection();

  useEffect(() => {
    if (open) {
      // Find the "Location User" team
      const locUserTeam = allTeams.find(team => team.teamName?.toLowerCase() === "location user");
      if (locUserTeam) {
        setLocationUserTeamId(locUserTeam.id);
      } else {
        setError("Critical: 'Location User' team not found. Please contact an administrator.");
      }
      // Reset other fields when modal opens
      setUsername("");
      setEmail("");
      setTempPassword("");
      resetLocations();
      // Error related to team finding is set above, other errors cleared
      if (error && !error.startsWith("Critical:")) {
          setError(null);
      }
    }
  }, [open, allTeams, error, resetLocations]); // Add error to dependency array to avoid stale closure

  const modalStyle = {
    position: "absolute" as "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 900,
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    bgcolor: 'var(--theme-surface)',
    border: '2px solid var(--theme-border)',
    boxShadow: 24,
    p: 4,
    color: 'var(--theme-text)',
    borderRadius: '8px',
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (locationUserTeamId === "") {
        setError("The 'Location User' team is not configured correctly. Please contact an administrator.");
        setIsLoading(false);
        return;
    }
    if (selectedLocationIds.length === 0) {
        setError("Please select at least one location for the user.");
        setIsLoading(false);
        return;
    }

    try {
      await onSubmit({
        username,
        email,
        tempPassword,
        teamId: locationUserTeamId as number,
        locationIds: selectedLocationIds,
        groupId: groupId, // Pass the LA's group ID
      });
      // Parent will handle close & reset
    } catch (err: any) {
      setError(err.message || "Failed to create location user.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      // Resetting is now primarily handled by useEffect on `open`
      onClose();
    }
  };

  // Wrapper to add all group locations
  const onAddAllGroupLocations = () => {
    if (allLocationsData?.locations) {
      const groupLocations = allLocationsData.locations.filter((loc: Location) =>
        groupLocationIds.includes(loc.id)
      );
      handleAddAllLocations(groupLocations);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="create-location-user-modal-title"
    >
      <Box sx={modalStyle}>
        <Typography id="create-location-user-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
          Create New Location User
        </Typography>
        <form onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            InputLabelProps={{ style: { color: 'var(--theme-text-secondary)' }}}
            InputProps={{ style: { color: 'var(--theme-text)' }}}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            InputLabelProps={{ style: { color: 'var(--theme-text-secondary)' }}}
            InputProps={{ style: { color: 'var(--theme-text)' }}}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="tempPassword"
            label="Temporary Password"
            type="password"
            id="tempPassword"
            autoComplete="new-password"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            disabled={isLoading}
            InputLabelProps={{ style: { color: 'var(--theme-text-secondary)' }}}
            InputProps={{ style: { color: 'var(--theme-text)' }}}
          />

          {/* Team FormControl is now removed as it's auto-assigned and should not be visible */}

          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
              Assign Locations (from your group)
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Typography className="font-medium text-[var(--theme-text)]">Selected Locations</Typography>
                    <div className="flex gap-2">
                      <Button size="small" variant="outlined" onClick={handleUndo} className="text-[var(--theme-primary)] border-[var(--theme-primary)]/30 hover:bg-[var(--theme-primary)]/10 py-1 min-w-0 px-2" disabled={!lastAction}>
                        <span className="mr-1">Undo</span> <Undo2 size={16} />
                      </Button>
                      <Button size="small" variant="outlined" onClick={handleClearAll} className="text-[var(--theme-error)] border-[var(--theme-error)]/30 hover:bg-[var(--theme-error)]/10 py-1 min-w-0 px-2" disabled={selectedLocationIds.length === 0}>
                        <span className="mr-1">Clear All</span> <Trash2 size={16} />
                      </Button>
                      <Button size="small" variant="outlined" onClick={onAddAllGroupLocations} className="text-[var(--theme-success)] border-[var(--theme-success)]/30 hover:bg-[var(--theme-success)]/10 py-1 min-w-0 px-2" disabled={groupLocationIds.length === 0}>
                        <span className="mr-1">Add All Group Locations</span> <CheckCircle size={16} />
                      </Button>
                    </div>
                  </div>
                  <Box className="p-3 bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded-md min-h-24 max-h-64 overflow-y-auto shadow-inner">
                    {selectedLocationIds.length === 0 ? (
                      <Typography className="text-[var(--theme-text-muted)] text-sm italic">
                        Please select at least one location.
                      </Typography>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedLocationIds.map((id) => {
                          const location = allLocationsData?.locations?.find((loc: Location) => loc.id === id);
                          return (
                            <Chip
                              key={id}
                              label={location ? `${location.name} (${location.id})` : id}
                              onClick={() => handleRemoveLocation(id)}
                              onDelete={() => handleRemoveLocation(id)}
                              className="bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 cursor-pointer"
                              deleteIcon={<X className="h-4 w-4 text-[var(--theme-primary)]" />}
                            />
                          );
                        })}
                      </div>
                    )}
                  </Box>
                  <Typography className="text-xs text-[var(--theme-text-muted)] mt-1">
                    {selectedLocationIds.length > 0 ? `${selectedLocationIds.length} location${selectedLocationIds.length !== 1 ? 's' : ''} selected` : "No locations selected"}
                  </Typography>
                </div>
              </Grid>
              <Grid item xs={12} md={6}>
                <LocationTable
                  selectedLocationIds={selectedLocationIds}
                  onLocationSelect={handleAddLocation}
                  userLocationIds={groupLocationIds} // Restrict to LA's group locations
                />
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={handleClose} disabled={isLoading} color="secondary">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading || !username || !email || !tempPassword || locationUserTeamId === "" || selectedLocationIds.length === 0}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isLoading ? "Creating..." : "Create Location User"}
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
};

export default ModalCreateLocationUser;