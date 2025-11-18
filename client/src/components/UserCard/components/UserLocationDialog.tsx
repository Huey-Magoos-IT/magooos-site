import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  Chip,
  CircularProgress
} from "@mui/material";
import { X } from "lucide-react";
import LocationTable, { Location } from "@/components/LocationTable";

interface UserLocationDialogProps {
  open: boolean;
  onClose: () => void;
  username: string;
  selectedLocations: Location[];
  lastAction: string;
  locationUpdateStatus: "success" | "error" | "pending" | null;
  onUndo: () => void;
  onClearAll: () => void;
  onAddAll: () => void;
  onRemoveLocation: (locationId: string) => void;
  onAddLocation: (location: Location) => void;
  onSave: () => void;
}

const UserLocationDialog: React.FC<UserLocationDialogProps> = ({
  open,
  onClose,
  username,
  selectedLocations,
  lastAction,
  locationUpdateStatus,
  onUndo,
  onClearAll,
  onAddAll,
  onRemoveLocation,
  onAddLocation,
  onSave,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Edit Locations for {username}
      </DialogTitle>
      <DialogContent>
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
                    onClick={onUndo}
                    disabled={!lastAction}
                    sx={{
                      color: 'var(--theme-primary)',
                      borderColor: 'var(--theme-border)',
                      '&:hover': { backgroundColor: 'var(--theme-surface-hover)' }
                    }}
                  >
                    <span className="mr-1">Undo</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 14 4 9l5-5"/>
                      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
                    </svg>
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={onClearAll}
                    disabled={selectedLocations.length === 0}
                    color="error"
                  >
                    <span className="mr-1">Clear All</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    onClick={onAddAll}
                    color="success"
                  >
                    <span className="mr-1">Add All</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        onClick={() => onRemoveLocation(location.id)}
                        onDelete={() => onRemoveLocation(location.id)}
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
              onLocationSelect={onAddLocation}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button
          onClick={onSave}
          color="primary"
          variant="contained"
          disabled={locationUpdateStatus === "pending"}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserLocationDialog;
