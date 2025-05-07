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
// import { dataGridSxStyles } from "@/lib/utils"; // Not directly used now
import { useAppSelector } from "@/app/redux";
import { Team } from "@/state/api";
import LocationTable, { Location } from "@/components/LocationTable"; // Import LocationTable and its Location type

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

  const modalStyle = {
    position: "absolute" as "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 700, // Increased width for the table
    maxHeight: '90vh', // Add maxHeight to prevent overflow
    overflowY: 'auto', // Allow modal content to scroll if needed
    bgcolor: isDarkMode ? "rgb(31 41 55)" : "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
    color: isDarkMode ? "white" : "black",
    borderRadius: '8px', // Added border radius
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
      setError(null);
      onClose();
    }
  };

  const handleLocationSelect = (locationToAdd: Location) => {
    setSelectedLocationIds((prevIds) => {
      if (!prevIds.includes(locationToAdd.id)) {
        return [...prevIds, locationToAdd.id];
      }
      return prevIds;
    });
  };

  const handleLocationDeselect = (locationIdToRemove: string) => {
    setSelectedLocationIds((prevIds) => prevIds.filter(id => id !== locationIdToRemove));
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
              style: { color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined },
            }}
            InputProps={{
              style: { color: isDarkMode ? 'white' : undefined },
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
              style: { color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined },
            }}
            InputProps={{
              style: { color: isDarkMode ? 'white' : undefined },
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
              style: { color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined },
            }}
            InputProps={{
              style: { color: isDarkMode ? 'white' : undefined },
            }}
          />

          {/* Team Select */}
          <FormControl fullWidth margin="normal" required disabled={isLoading}>
            <InputLabel id="team-select-label" sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined }}>Team</InputLabel>
            <Select
              labelId="team-select-label"
              id="team-select"
              value={selectedTeamId}
              label="Team"
              onChange={(e) => setSelectedTeamId(e.target.value as number | "")}
              sx={{ color: isDarkMode ? 'white' : undefined }}
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

          {/* Selected Locations Display */}
          {selectedLocationIds.length > 0 && (
            <Box sx={{ my: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }}>
                Selected Locations:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selectedLocationIds.map((id) => (
                  <Chip
                    key={id}
                    label={id} // Ideally, we'd show names here. Needs access to full location objects.
                               // For now, showing IDs. This can be improved later.
                    onDelete={() => handleLocationDeselect(id)}
                    size="small"
                    sx={{
                        bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                        color: isDarkMode ? 'white' : 'inherit',
                        '.MuiChip-deleteIcon': {
                            color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.54)',
                            '&:hover': {
                                color: isDarkMode ? 'white' : 'rgba(0,0,0,0.87)',
                            }
                        }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Location Table */}
          <Box sx={{ mt: 2, mb: 2, maxHeight: 300, overflowY: 'auto', border: isDarkMode ? '1px solid rgba(255,255,255,0.23)' : '1px solid rgba(0,0,0,0.23)', borderRadius: '4px' }}>
            <LocationTable
              selectedLocationIds={selectedLocationIds}
              onLocationSelect={handleLocationSelect}
              // userLocationIds={[]} // Not applicable for create user mode
            />
          </Box>


          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={handleClose} disabled={isLoading} color="secondary">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading || !username || !email || !tempPassword || selectedTeamId === ""} // Add username to disabled check
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