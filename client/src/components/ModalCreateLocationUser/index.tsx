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
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousLocationIds, setPreviousLocationIds] = useState<string[]>([]);
  const [lastAction, setLastAction] = useState<string>("");

  const { data: allLocationsData } = useGetLocationsQuery(); // For "Add All" and displaying names

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
      setSelectedLocationIds([]);
      setPreviousLocationIds([]);
      setLastAction("");
      // Error related to team finding is set above, other errors cleared
      if (error && !error.startsWith("Critical:")) {
          setError(null);
      }
    }
  }, [open, allTeams, error]); // Add error to dependency array to avoid stale closure

  const modalStyle = {
    position: "absolute" as "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 900,
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    bgcolor: isDarkMode ? "rgb(31 41 55)" : "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
    color: isDarkMode ? "white" : "black",
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

  const handleLocationSelect = (locationToAdd: Location) => {
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
    setPreviousLocationIds([...selectedLocationIds]);
    setLastAction("remove");
    setSelectedLocationIds((prevIds) => prevIds.filter(id => id !== locationIdToRemove));
  };

  const handleAddAllGroupLocations = () => {
    setPreviousLocationIds([...selectedLocationIds]);
    setLastAction("addAllGroup");
    setSelectedLocationIds([...groupLocationIds]); // Add all locations from the LA's group
  };

  const handleClearAll = () => {
    setPreviousLocationIds([...selectedLocationIds]);
    setLastAction("clearAll");
    setSelectedLocationIds([]);
  };

  const handleUndo = () => {
    if (lastAction) {
      setSelectedLocationIds(previousLocationIds);
      setLastAction("");
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
            InputLabelProps={{ style: { color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined }}}
            InputProps={{ style: { color: isDarkMode ? 'white' : undefined }}}
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
            InputLabelProps={{ style: { color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined }}}
            InputProps={{ style: { color: isDarkMode ? 'white' : undefined }}}
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
            InputLabelProps={{ style: { color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined }}}
            InputProps={{ style: { color: isDarkMode ? 'white' : undefined }}}
          />

          <FormControl fullWidth margin="normal" required disabled>
            <InputLabel id="team-select-label-loc-user" sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined }}>Team</InputLabel>
            <Select
              labelId="team-select-label-loc-user"
              value={locationUserTeamId}
              label="Team"
              readOnly
              sx={{ color: isDarkMode ? 'white' : undefined }}
            >
              {locationUserTeamId !== "" ? (
                <MenuItem value={locationUserTeamId}>
                  {allTeams.find(t => t.id === locationUserTeamId)?.teamName || "Location User"} (Auto-assigned)
                </MenuItem>
              ) : (
                <MenuItem value="">
                  <em>&apos;Location User&apos; team not found</em>
                </MenuItem>
              )}
            </Select>
          </FormControl>

          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
              Assign Locations (from your group)
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Typography className="font-medium text-gray-800 dark:text-white">Selected Locations</Typography>
                    <div className="flex gap-2">
                      <Button size="small" variant="outlined" onClick={handleUndo} className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/10 py-1 min-w-0 px-2" disabled={!lastAction}>
                        <span className="mr-1">Undo</span> <Undo2 size={16} />
                      </Button>
                      <Button size="small" variant="outlined" onClick={handleClearAll} className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/10 py-1 min-w-0 px-2" disabled={selectedLocationIds.length === 0}>
                        <span className="mr-1">Clear All</span> <Trash2 size={16} />
                      </Button>
                      <Button size="small" variant="outlined" onClick={handleAddAllGroupLocations} className="text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/10 py-1 min-w-0 px-2" disabled={groupLocationIds.length === 0}>
                        <span className="mr-1">Add All Group Locations</span> <CheckCircle size={16} />
                      </Button>
                    </div>
                  </div>
                  <Box className="p-3 bg-gray-50 border border-gray-200 rounded-md min-h-24 max-h-64 overflow-y-auto dark:bg-dark-tertiary dark:border-stroke-dark shadow-inner">
                    {selectedLocationIds.length === 0 ? (
                      <Typography className="text-gray-500 dark:text-neutral-400 text-sm italic">
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
                              className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200 border border-blue-100 dark:border-blue-900/30 cursor-pointer"
                              deleteIcon={<X className="h-4 w-4 text-blue-500 dark:text-blue-300" />}
                            />
                          );
                        })}
                      </div>
                    )}
                  </Box>
                  <Typography className="text-xs text-gray-500 mt-1 dark:text-neutral-500">
                    {selectedLocationIds.length > 0 ? `${selectedLocationIds.length} location${selectedLocationIds.length !== 1 ? 's' : ''} selected` : "No locations selected"}
                  </Typography>
                </div>
              </Grid>
              <Grid item xs={12} md={6}>
                <LocationTable
                  selectedLocationIds={selectedLocationIds}
                  onLocationSelect={handleLocationSelect}
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