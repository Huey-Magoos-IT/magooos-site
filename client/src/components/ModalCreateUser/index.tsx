"use client";
import React, { useState } from "react";
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
  // Checkbox,    // No longer needed for multi-select dropdown
  // ListItemText,// No longer needed for multi-select dropdown
  // OutlinedInput// No longer needed for multi-select dropdown
  Chip // For displaying selected locations
} from "@mui/material";
import { Grid } from "@mui/material"; // Import Grid for layout
import { Undo2, Trash2, CheckCircle, X } from "lucide-react"; // Import icons
// import { dataGridSxStyles } from "@/lib/utils"; // Not directly used now
import { useAppSelector } from "@/app/redux";
import { Team } from "@/state/api";
import { useGetLocationsQuery } from "@/state/lambdaApi"; // Import the query hook from the API slice
import LocationTable, { Location } from "@/components/LocationTable"; // Import LocationTable and Location type

interface ModalCreateUserProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: {
    username: string;
    email: string;
    tempPassword: string;
    teamId: number;
    locationIds: string[];
  }) => Promise<void>;
  teams: Team[];
  // locations: Location[]; // LocationTable fetches its own data
}

const ModalCreateUser: React.FC<ModalCreateUserProps> = ({
  open,
  onClose,
  onSubmit,
  teams,
  // locations, // LocationTable fetches its own data
}) => {
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<number | "">("");
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousLocationIds, setPreviousLocationIds] = useState<string[]>([]); // State for undo
  const [lastAction, setLastAction] = useState<string>(""); // State for undo action type

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
        setError("Please select a team.");
        setIsLoading(false);
        return;
    }
    try {
      await onSubmit({
        username, // Pass username
        email,
        tempPassword,
        teamId: selectedTeamId as number,
        locationIds: selectedLocationIds,
      });
      // Let parent handle close/clear
    } catch (err: any) {
      setError(err.message || "Failed to create user.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setUsername(""); // Reset username state
      setEmail("");
      setTempPassword("");
      setSelectedTeamId("");
      setSelectedLocationIds([]);
      setPreviousLocationIds([]); // Reset undo state
      setLastAction(""); // Reset undo state
      setError(null);
      onClose();
    }
  };

  const handleLocationSelect = (locationToAdd: Location) => {
    // Save current state for undo
    setPreviousLocationIds([...selectedLocationIds]);
    setLastAction("add");

    setSelectedLocationIds((prevIds) => {
      if (!prevIds.includes(locationToAdd.id)) {
        return [...prevIds, locationToAdd.id];
      }
      return prevIds;
    });
  };

  const handleLocationDeselect = (locationIdToRemove: string) => {
    // Save current state for undo
    setPreviousLocationIds([...selectedLocationIds]);
    setLastAction("remove");

    setSelectedLocationIds((prevIds) => prevIds.filter(id => id !== locationIdToRemove));
  };

  // Handle adding all available locations (requires fetching all locations first)
  // This will need to be implemented carefully, possibly by getting all locations from the table component or a separate query.
  // For now, let's assume we have access to all locations (e.g., passed as a prop or fetched here).
  // Since LocationTable fetches its own, we might need to adjust its props or fetch here.
  // Let's fetch locations here for simplicity in this modal.
  const { data: allLocationsData } = useGetLocationsQuery(); // Use the query hook directly

  const handleAddAllLocations = () => {
    if (allLocationsData?.locations) {
      // Save current state for undo
      setPreviousLocationIds([...selectedLocationIds]);
      setLastAction("addAll");
      setSelectedLocationIds(allLocationsData.locations.map((loc: Location) => loc.id)); // Explicitly type loc
    }
  };

  const handleClearAll = () => {
    // Save current state for undo
    setPreviousLocationIds([...selectedLocationIds]);
    setLastAction("clearAll");
    setSelectedLocationIds([]);
  };

  const handleUndo = () => {
    if (lastAction) {
      // Restore previous state
      setSelectedLocationIds(previousLocationIds);
      // Reset last action (optional, depending on desired undo depth)
      setLastAction("");
    }
  };


  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="create-user-modal-title"
      aria-describedby="create-user-modal-description"
    >
      <Box sx={modalStyle}>
        <Typography id="create-user-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
          Create New User
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
            type="password"
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
            }}
          />

          {/* Team Select */}
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

          {/* Location Selection Section */}
          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
              Assign Locations
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
                        onClick={handleAddAllLocations}
                        className="text-[var(--theme-success)] border-[var(--theme-success)]/30 hover:bg-[var(--theme-success)]/10 py-1 min-w-0 px-2"
                        disabled={!allLocationsData?.locations || allLocationsData.locations.length === 0}
                      >
                        <span className="mr-1">Add All</span>
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
                              onClick={() => handleLocationDeselect(id)}
                              onDelete={() => handleLocationDeselect(id)}
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
                  onLocationSelect={handleLocationSelect}
                  // userLocationIds={[]} // Not applicable for create user mode
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
              disabled={isLoading || !username || !email || !tempPassword || selectedTeamId === "" || selectedLocationIds.length === 0} // Require at least one location
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isLoading ? "Creating..." : "Create User"}
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
};

export default ModalCreateUser;