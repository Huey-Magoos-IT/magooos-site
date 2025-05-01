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
  FormControl, // Added
  InputLabel,  // Added
  Select,      // Added
  MenuItem,    // Added
  Checkbox,    // Added for multi-select locations
  ListItemText,// Added for multi-select locations
  OutlinedInput// Added for multi-select locations
} from "@mui/material";
import { dataGridSxStyles } from "@/lib/utils"; // Reusing styles for consistency
import { useAppSelector } from "@/app/redux";
import { Team } from "@/state/api"; // Added Team import
import { Location } from "@/state/lambdaApi"; // Added Location import

interface ModalCreateUserProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: {
    username: string; // Added username
    email: string;
    tempPassword: string;
    teamId: number;
    locationIds: string[];
  }) => Promise<void>;
  teams: Team[];
  locations: Location[];
}

const ModalCreateUser: React.FC<ModalCreateUserProps> = ({
  open,
  onClose,
  onSubmit,
  teams,
  locations,
}) => {
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const [username, setUsername] = useState(""); // Added state for username
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
    width: 400,
    bgcolor: isDarkMode ? "rgb(31 41 55)" : "background.paper", // dark:bg-gray-800 equivalent
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
            autoFocus // Focus username first
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
            // autoFocus // Removed autofocus from email
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            InputLabelProps={{
              style: { color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined },
            }}
            InputProps={{
              style: { color: isDarkMode ? 'white' : undefined },
            }}
            // sx={dataGridSxStyles(isDarkMode).root} // Removed incorrect sx prop
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
            // sx={dataGridSxStyles(isDarkMode).root} // Removed incorrect sx prop
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

          {/* Location Multi-Select */}
          <FormControl fullWidth margin="normal" disabled={isLoading}>
            <InputLabel id="location-select-label" sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined }}>Locations (Optional)</InputLabel>
            <Select
              labelId="location-select-label"
              id="location-select"
              multiple
              value={selectedLocationIds}
              onChange={(e) => setSelectedLocationIds(e.target.value as string[])}
              input={<OutlinedInput label="Locations (Optional)" />}
              renderValue={(selected) => selected.map(id => locations.find(loc => loc.id === id)?.name || id).join(', ')}
              sx={{ color: isDarkMode ? 'white' : undefined }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 224, // Limit dropdown height
                  },
                },
              }}
            >
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  <Checkbox checked={selectedLocationIds.indexOf(location.id) > -1} />
                  <ListItemText primary={location.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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