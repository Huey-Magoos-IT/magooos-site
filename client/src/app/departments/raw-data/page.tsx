"use client";

import { useGetAuthUserQuery } from "@/state/api";
import { useGetLocationsQuery } from "@/state/lambdaApi";
import { hasRole } from "@/lib/accessControl";
import Header from "@/components/Header";
import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { 
  Chip, 
  Button, 
  CircularProgress, 
  Grid, 
  Box, 
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  SelectChangeEvent,
  LinearProgress
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import LocationTable, { Location } from "@/components/LocationTable";
import { fetchFiles as fetchS3Files } from "@/lib/csvProcessing";
import { format } from 'date-fns';
import { DatePreset, datePresets, getDateRangeForPreset } from "@/lib/utils";

const S3_DATA_LAKE = process.env.NEXT_PUBLIC_DATA_LAKE_S3_URL || "https://data-lake-magooos-site.s3.us-east-2.amazonaws.com";
const RAW_DATA_FOLDER = "raw-loyalty-pool/";

// Helper to extract date from raw_data_MM-DD-YYYY.json format
const extractDateFromRawFilename = (filename: string): Date | null => {
  const dateMatch = filename.match(/raw_data_(\d{2})-(\d{2})-(\d{4})\.json$/);
  if (dateMatch) {
    const month = dateMatch[1];
    const day = dateMatch[2];
    const year = dateMatch[3];
    return new Date(`${year}-${month}-${day}T00:00:00`);
  }
  return null;
};

// Helper to download the generated JSON
const downloadJson = (data: any[], filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const RawDataPage = () => {
  const { data: authData, isLoading, error } = useGetAuthUserQuery({});
  const { data: locationsData } = useGetLocationsQuery();
  const userTeam = authData?.userDetails?.team;
  const userLocationIds = authData?.userDetails?.locationIds || [];
  const userIsAdmin = userTeam?.isAdmin || false;

  // Form state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset | ''>('');
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [previousLocations, setPreviousLocations] = useState<Location[]>([]);
  const [lastAction, setLastAction] = useState<string>("");

  // Processing State
  const [allS3Files, setAllS3Files] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState("");
  const [progressPercentage, setProgressPercentage] = useState(0);

  const selectedLocationIds = selectedLocations.map(loc => loc.id);

  // Fetch S3 files on mount
  useEffect(() => {
    const fetchInitialFiles = async () => {
      try {
        const fileList = await fetchS3Files(S3_DATA_LAKE, RAW_DATA_FOLDER);
        setAllS3Files(fileList.filter(file => file.endsWith('.json')));
      } catch (err) {
        setProcessingError("Failed to load file list from S3.");
      }
    };
    fetchInitialFiles();
  }, []);

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
      let availableLocations = locationsData.locations;
      if (!userIsAdmin && userLocationIds.length > 0) {
        availableLocations = locationsData.locations.filter((location: Location) =>
          userLocationIds.includes(location.id)
        );
      }
      setSelectedLocations(availableLocations);
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

  const handlePresetChange = (event: SelectChangeEvent<DatePreset | ''>) => {
    const preset = event.target.value as DatePreset | '';
    setSelectedPreset(preset);
    if (preset) {
      const { startDate: newStartDate, endDate: newEndDate } = getDateRangeForPreset(preset);
      setStartDate(newStartDate);
      setEndDate(newEndDate);
    }
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate || selectedLocations.length === 0) {
      alert("Please select a start date, end date, and at least one location.");
      return;
    }

    setLoading(true);
    setProcessingError(null);
    setProcessingProgress("Initializing report generation...");
    setProgressPercentage(0);

    try {
      // 1. Filter filenames by date range
      const matchingFiles = allS3Files.filter(filename => {
        const fileDate = extractDateFromRawFilename(filename);
        if (!fileDate) return false;
        
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        return fileDate >= start && fileDate <= end;
      });

      if (matchingFiles.length === 0) {
        setProcessingError("No data files found for the selected date range.");
        setLoading(false);
        return;
      }

      // 2. Process files one-by-one with progress tracking
      let finalData: any[] = [];
      const totalFiles = matchingFiles.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const filename = matchingFiles[i];
        const currentFileNum = i + 1;
        const percentComplete = Math.round((currentFileNum / totalFiles) * 100);
        
        setProcessingProgress(`Processing file ${currentFileNum} of ${totalFiles}: ${filename}`);
        setProgressPercentage(percentComplete);
        
        const fileUrl = `${S3_DATA_LAKE}/${RAW_DATA_FOLDER}${filename}`;
        const response = await fetch(fileUrl);
        if (!response.ok) {
          console.error(`Failed to fetch ${filename}. Skipping.`);
          continue;
        }
        
        const fileJson = await response.json();

        // 3. Filter data within the file
        if (Array.isArray(fileJson)) {
          const locationIdStrings = selectedLocationIds.map(String);
          const filteredForFile = fileJson.filter(record => 
            record && locationIdStrings.includes(String(record.req_location_id))
          );
          finalData = finalData.concat(filteredForFile);
        }
      }

      setProcessingProgress("Finalizing report...");
      setProgressPercentage(100);

      // 4. Trigger download
      if (finalData.length === 0) {
        setProcessingError("No records found for the selected locations in the given date range.");
      } else {
        const startDateStr = format(startDate, "MM-dd-yyyy");
        const endDateStr = format(endDate, "MM-dd-yyyy");
        downloadJson(finalData, `raw_data_report_${startDateStr}_to_${endDateStr}.json`);
        setProcessingProgress("✅ Report generated successfully!");
      }

    } catch (err) {
      console.error("An error occurred during report generation:", err);
      setProcessingError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
      setTimeout(() => {
        setProcessingProgress("");
        setProgressPercentage(0);
      }, 3000);
    }
  };

  if (isLoading) return <div className="m-5 p-4 text-[var(--theme-text)]">Loading...</div>;
  if (error) return <div className="m-5 p-4 text-[var(--theme-text)]">Error: {error.toString()}</div>;

  const hasAccess = userTeam && (userTeam.isAdmin || hasRole(userTeam.teamRoles, 'RAW_DATA'));
  if (!hasAccess) {
    return (
      <div className="m-5 p-4">
        <div className="bg-red-500/10 p-4 rounded-md mb-4 border-l-4 border-red-500 text-red-600 shadow-md">
          <p className="font-medium">Access Denied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="m-5 p-4">
      <Header name="Raw Data Report" />
      <div className="mt-4 p-4 bg-[var(--theme-surface)] rounded-lg shadow-md border border-[var(--theme-border)]">

        <div className="mt-4 mb-8 p-4 border rounded-md shadow-sm border-[var(--theme-border)]" style={{ overflow: 'visible' }}>
          <Grid container spacing={4} sx={{ alignItems: 'stretch', display: 'flex' }}>
            {/* Left column - Form inputs */}
            <Grid item xs={12} md={6}>
              <div className="space-y-4 flex flex-col">
                {/* Date Preset Dropdown */}
                <FormControl fullWidth variant="outlined" className="bg-[var(--theme-surface-hover)] rounded-md shadow-sm border border-[var(--theme-border)]">
                  <InputLabel className="text-[var(--theme-text-secondary)]">Date Range Preset</InputLabel>
                  <Select
                    value={selectedPreset}
                    onChange={handlePresetChange}
                    label="Date Range Preset"
                    className="border-[var(--theme-border)] text-[var(--theme-text)]"
                  >
                    <MenuItem value=""><em>Custom Range</em></MenuItem>
                    {datePresets.map((preset) => (
                      <MenuItem key={preset} value={preset}>
                        {preset}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText className="text-[var(--theme-text-muted)]">Select a preset or choose dates manually</FormHelperText>
                </FormControl>

                {/* Date Pickers */}
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => {
                    setStartDate(newValue);
                    setSelectedPreset('');
                  }}
                  format="MM/dd/yyyy"
                  className="bg-[var(--theme-surface-hover)] w-full rounded-md shadow-sm border border-[var(--theme-border)]"
                  slotProps={{
                    textField: {
                      variant: "outlined",
                      fullWidth: true,
                      className: "bg-[var(--theme-surface-hover)]"
                    }
                  }}
                />

                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => {
                    setEndDate(newValue);
                    setSelectedPreset('');
                  }}
                  format="MM/dd/yyyy"
                  className="bg-[var(--theme-surface-hover)] w-full rounded-md shadow-sm border border-[var(--theme-border)]"
                  slotProps={{
                    textField: {
                      variant: "outlined",
                      fullWidth: true,
                      className: "bg-[var(--theme-surface-hover)]"
                    }
                  }}
                />

                {/* Selected Locations */}
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        onClick={handleAddAllLocations}
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
                        Please select a location.
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
                      : userIsAdmin
                        ? "All locations will be used"
                        : userLocationIds.length > 0
                          ? `Your ${userLocationIds.length} assigned location${userLocationIds.length !== 1 ? 's' : ''} will be used`
                          : "No locations selected"}
                  </Typography>
                </div>

                {/* Generate Button */}
                <div className="mt-4">
                  <Button
                    variant="contained"
                    onClick={handleGenerateReport}
                    disabled={loading || !startDate || !endDate || selectedLocations.length === 0}
                    fullWidth
                    sx={{
                      background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))',
                      color: 'var(--theme-text-on-primary)',
                      py: 1.5,
                      '&:hover': {
                        background: 'linear-gradient(to right, var(--theme-primary-dark), var(--theme-secondary))',
                      },
                      '&:disabled': {
                        background: 'var(--theme-surface-active)',
                        color: 'var(--theme-text-muted)'
                      }
                    }}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <CircularProgress size={20} className="text-white mr-2" />
                        <span>Processing...</span>
                      </div>
                    ) : "Generate and Download Report"}
                  </Button>

                  {/* Enhanced Progress Display */}
                  {processingProgress && (
                    <div className="mt-4 space-y-2">
                      <div className="p-3 bg-[var(--theme-primary)]/10 rounded-lg border border-[var(--theme-primary)]/30 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <Typography className="text-sm font-medium text-[var(--theme-primary)]">
                            {processingProgress}
                          </Typography>
                          {progressPercentage > 0 && (
                            <Typography className="text-sm font-bold text-[var(--theme-primary)]">
                              {progressPercentage}%
                            </Typography>
                          )}
                        </div>
                        {progressPercentage > 0 && progressPercentage < 100 && (
                          <LinearProgress
                            variant="determinate"
                            value={progressPercentage}
                            className="h-2 rounded-full"
                            sx={{
                              backgroundColor: 'var(--theme-surface-hover)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: 'var(--theme-primary)',
                                borderRadius: '9999px',
                              }
                            }}
                          />
                        )}
                        {progressPercentage === 100 && processingProgress.includes("✅") && (
                          <div className="flex items-center mt-2">
                            <svg className="w-5 h-5 text-[var(--theme-success)] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <Typography className="text-sm text-[var(--theme-success)] font-medium">
                              Download started!
                            </Typography>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {processingError && (
                    <div className="mt-4 p-3 bg-red-500/10 text-red-600 rounded-lg border-l-4 border-red-500 shadow-sm">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="font-semibold">Error</p>
                          <p className="text-sm mt-1">{processingError}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Grid>

            {/* Right column - Location Table */}
            <Grid item xs={12} md={6}>
              <LocationTable
                selectedLocationIds={selectedLocationIds}
                onLocationSelect={handleAddLocation}
                userLocationIds={userIsAdmin ? undefined : userLocationIds}
              />
            </Grid>
          </Grid>
        </div>
      </div>
    </div>
  );
};

export default RawDataPage;