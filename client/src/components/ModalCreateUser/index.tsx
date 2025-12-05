"use client";
import React, { useState, useEffect } from "react";
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
  Chip,
  InputAdornment,
  IconButton
} from "@mui/material";
import { Grid } from "@mui/material";
import { Undo2, Trash2, CheckCircle, X, Eye, EyeOff } from "lucide-react";
import { useAppSelector } from "@/app/redux";
import { Team } from "@/state/api";
import { useGetLocationsQuery } from "@/state/lambdaApi";
import LocationTable, { Location } from "@/components/LocationTable";
import { useLocationSelection } from "@/hooks/useLocationSelection";

// Base form data shared by both variants
interface BaseFormData {
  username: string;
  email: string;
  tempPassword: string;
  teamId: number;
  locationIds: string[];
}

// Extended form data for location user variant
interface LocationUserFormData extends BaseFormData {
  groupId: number;
}

// Props for admin variant (can select any team, all locations)
interface AdminVariantProps {
  variant?: 'admin';
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: BaseFormData) => Promise<void>;
  teams: Team[];
}

// Props for location user variant (auto-assigns team, restricted locations)
interface LocationUserVariantProps {
  variant: 'locationUser';
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: LocationUserFormData) => Promise<void>;
  teams: Team[];
  groupLocationIds: string[];
  groupId: number;
}

type ModalCreateUserProps = AdminVariantProps | LocationUserVariantProps;

const ModalCreateUser: React.FC<ModalCreateUserProps> = (props) => {
  const { open, onClose, teams, variant = 'admin' } = props;

  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all locations
  const { data: allLocationsData } = useGetLocationsQuery();

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

  // Determine if this is a location user variant
  const isLocationUserVariant = variant === 'locationUser';
  const groupLocationIds = isLocationUserVariant ? (props as LocationUserVariantProps).groupLocationIds : [];
  const groupId = isLocationUserVariant ? (props as LocationUserVariantProps).groupId : 0;

  // Auto-assign team for location user variant
  useEffect(() => {
    if (open && isLocationUserVariant) {
      const locUserTeam = teams.find(team => team.teamName?.toLowerCase() === "location user");
      if (locUserTeam) {
        setSelectedTeamId(locUserTeam.id);
      } else {
        setError("Critical: 'Location User' team not found. Please contact an administrator.");
      }
      // Reset fields when modal opens
      setUsername("");
      setEmail("");
      setTempPassword("");
      resetLocations();
      if (error && !error.startsWith("Critical:")) {
        setError(null);
      }
    }
  }, [open, teams, isLocationUserVariant, error, resetLocations]);

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

    if (selectedTeamId === "") {
      const errorMsg = isLocationUserVariant
        ? "The 'Location User' team is not configured correctly. Please contact an administrator."
        : "Please select a team.";
      setError(errorMsg);
      setIsLoading(false);
      return;
    }

    if (selectedLocationIds.length === 0) {
      setError("Please select at least one location for the user.");
      setIsLoading(false);
      return;
    }

    try {
      if (isLocationUserVariant) {
        await (props as LocationUserVariantProps).onSubmit({
          username,
          email,
          tempPassword,
          teamId: selectedTeamId as number,
          locationIds: selectedLocationIds,
          groupId: groupId,
        });
      } else {
        await (props as AdminVariantProps).onSubmit({
          username,
          email,
          tempPassword,
          teamId: selectedTeamId as number,
          locationIds: selectedLocationIds,
        });
      }
      // Let parent handle close/clear
    } catch (err: any) {
      setError(err.message || `Failed to create ${isLocationUserVariant ? 'location ' : ''}user.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setUsername("");
      setEmail("");
      setTempPassword("");
      setSelectedTeamId("");
      resetLocations();
      setError(null);
      onClose();
    }
  };

  // Wrapper to add all locations (respects group restrictions for location user variant)
  const onAddAllLocations = () => {
    if (allLocationsData?.locations) {
      if (isLocationUserVariant) {
        const groupLocations = allLocationsData.locations.filter((loc: Location) =>
          groupLocationIds.includes(loc.id)
        );
        handleAddAllLocations(groupLocations);
      } else {
        handleAddAllLocations(allLocationsData.locations);
      }
    }
  };

  // Determine available locations for the LocationTable
  const availableLocationIds = isLocationUserVariant ? groupLocationIds : undefined;

  // Determine Add All button text and disabled state
  const addAllButtonText = isLocationUserVariant ? "Add All Group Locations" : "Add All";
  const addAllButtonDisabled = isLocationUserVariant
    ? groupLocationIds.length === 0
    : !allLocationsData?.locations || allLocationsData.locations.length === 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="create-user-modal-title"
    >
      <Box sx={modalStyle}>
        <Typography id="create-user-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
          {isLocationUserVariant ? "Create New Location User" : "Create New User"}
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
            InputLabelProps={{
              style: { color: 'var(--theme-text-secondary)' },
            }}
            InputProps={{
              style: { color: 'var(--theme-text)' },
            }}
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
            InputLabelProps={{
              style: { color: 'var(--theme-text-secondary)' },
            }}
            InputProps={{
              style: { color: 'var(--theme-text)' },
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="tempPassword"
            label="Temporary Password"
            type={showPassword ? "text" : "password"}
            id="tempPassword"
            autoComplete="new-password"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            disabled={isLoading}
            InputLabelProps={{
              style: { color: 'var(--theme-text-secondary)' },
            }}
            InputProps={{
              style: { color: 'var(--theme-text)' },
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-[var(--theme-text-muted)]" />
                    ) : (
                      <Eye className="h-5 w-5 text-[var(--theme-text-muted)]" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Team Select - only shown for admin variant */}
          {!isLocationUserVariant && (
            <FormControl fullWidth margin="normal" required disabled={isLoading}>
              <InputLabel id="team-select-label" sx={{ color: 'var(--theme-text-secondary)' }}>Team</InputLabel>
              <Select
                labelId="team-select-label"
                id="team-select"
                value={selectedTeamId}
                label="Team"
                onChange={(e) => setSelectedTeamId(e.target.value as number | "")}
                sx={{ color: 'var(--theme-text)' }}
              >
                <MenuItem value="">
                  <em>Select a team</em>
                </MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.teamName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Location Selection Section */}
          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
              {isLocationUserVariant ? "Assign Locations (from your group)" : "Assign Locations"}
            </Typography>
            <Grid container spacing={3}>
              {/* Left column - Selected Locations */}
              <Grid item xs={12} md={6}>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Typography className="font-medium text-[var(--theme-text)]">Selected Locations</Typography>
                    <div className="flex gap-2">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleUndo}
                        className="text-[var(--theme-primary)] border-[var(--theme-primary)]/30 hover:bg-[var(--theme-primary)]/10 py-1 min-w-0 px-2"
                        disabled={!lastAction}
                      >
                        <span className="mr-1">Undo</span>
                        <Undo2 size={16} />
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleClearAll}
                        className="text-[var(--theme-error)] border-[var(--theme-error)]/30 hover:bg-[var(--theme-error)]/10 py-1 min-w-0 px-2"
                        disabled={selectedLocationIds.length === 0}
                      >
                        <span className="mr-1">Clear All</span>
                        <Trash2 size={16} />
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={onAddAllLocations}
                        className="text-[var(--theme-success)] border-[var(--theme-success)]/30 hover:bg-[var(--theme-success)]/10 py-1 min-w-0 px-2"
                        disabled={addAllButtonDisabled}
                      >
                        <span className="mr-1">{addAllButtonText}</span>
                        <CheckCircle size={16} />
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
                    {selectedLocationIds.length > 0
                      ? `${selectedLocationIds.length} location${selectedLocationIds.length !== 1 ? 's' : ''} selected`
                      : "No locations selected"}
                  </Typography>
                </div>
              </Grid>

              {/* Right column - Location Table */}
              <Grid item xs={12} md={6}>
                <LocationTable
                  selectedLocationIds={selectedLocationIds}
                  onLocationSelect={handleAddLocation}
                  userLocationIds={availableLocationIds}
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
              disabled={isLoading || !username || !email || !tempPassword || selectedTeamId === "" || selectedLocationIds.length === 0}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isLoading ? "Creating..." : (isLocationUserVariant ? "Create Location User" : "Create User")}
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
};

export default ModalCreateUser;
