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
  SelectChangeEvent
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import LocationTable, { Location } from "@/components/LocationTable";
import CSVDataTable from "@/components/CSVDataTable";
import {
  fetchFiles as fetchS3Files,
  filterFilesByDateAndType,
  processMultipleCSVs,
  CSVProcessingConfig
} from "@/lib/csvProcessing";
import { DatePreset, datePresets, getDateRangeForPreset } from "@/lib/utils";
import { toast } from "react-hot-toast";

const S3_DATA_LAKE = process.env.NEXT_PUBLIC_DATA_LAKE_S3_URL || "https://data-lake-magooos-site.s3.us-east-2.amazonaws.com";
const NET_SALES_DATA_FOLDER = "net-sales-pool/";

// Order Channel mapping from the specification
const ORDER_CHANNELS = [
  { id: 1985, name: 'In Store' },
  { id: 1986, name: 'Web' },
  { id: 1987, name: 'UberEats' },
  { id: 1988, name: 'Doordash' },
  { id: 1989, name: 'Grubhub' },
  { id: 2077, name: 'Catering' },
  { id: 2288, name: 'Web Catering' },
  { id: 3471, name: 'ezCater' },
  { id: 5867, name: 'Off-Premise' },
];

const NetSalesReportPage = () => {
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
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);

  // Client-side processing state
  const [allS3Files, setAllS3Files] = useState<string[]>([]);
  const [csvData, setCSVData] = useState<any[]>([]);
  const [csvLoading, setCSVLoading] = useState(false);
  const [csvError, setCSVError] = useState<string|null>(null);
  const [processingProgress, setProcessingProgress] = useState<string>("");

  // Derived state for just the location IDs
  const selectedLocationIds = selectedLocations.map(loc => loc.id);

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

  const handleToggleChannel = (channelId: number) => {
    setSelectedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleSelectAllChannels = () => {
    setSelectedChannels(ORDER_CHANNELS.map(c => c.id));
  };

  const handleClearChannels = () => {
    setSelectedChannels([]);
  };

  // Fetch S3 files for client-side processing
  const fetchFiles = async () => {
    try {
      console.log("NET SALES PAGE - Fetching files from:", S3_DATA_LAKE, NET_SALES_DATA_FOLDER);
      const fileList = await fetchS3Files(S3_DATA_LAKE, NET_SALES_DATA_FOLDER);
      console.log("NET SALES PAGE - Files found:", fileList);
      setAllS3Files(fileList);
    } catch (err) {
      console.error("File fetch failed:", err);
      setCSVError("Failed to load data files from S3 bucket");
    }
  };

  // Client-side CSV data processing
  const processCSVData = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (selectedLocations.length === 0) {
      toast.error("Please select at least one location");
      return;
    }

    setCSVLoading(true);
    setCSVError(null);
    setProcessingProgress("Filtering files by date...");
    setCSVData([]);

    try {
      // Filter files by date range - files are named net_sales_report_MM-DD-YYYY.csv
      const matchingFiles = filterFilesByDateAndType(
        allS3Files,
        startDate,
        endDate,
        'net_sales_report' // File prefix pattern
      );

      if (matchingFiles.length === 0) {
        setCSVError("No files found matching the selected date range");
        setCSVLoading(false);
        return;
      }

      setProcessingProgress(`Processing ${matchingFiles.length} file(s)...`);

      // Create full URLs for the files
      const fileUrls = matchingFiles.map(filename => `${S3_DATA_LAKE}/${NET_SALES_DATA_FOLDER}${filename}`);

      // Process all files (fetch and parse)
      const combinedData = await processMultipleCSVs(fileUrls);

      setProcessingProgress("Filtering data by location and channel...");

      // Get selected location names for filtering
      const selectedLocationNames = selectedLocations.map(loc => loc.name);

      // Get selected channel names for filtering
      const selectedChannelNames = selectedChannels.length > 0
        ? ORDER_CHANNELS.filter(c => selectedChannels.includes(c.id)).map(c => c.name)
        : []; // Empty means all channels

      console.log("NET SALES PAGE - Selected locations:", selectedLocationNames);
      console.log("NET SALES PAGE - Selected channels:", selectedChannelNames);
      console.log("NET SALES PAGE - Sample data:", combinedData.slice(0, 3));

      // Filter data by location and order channel
      let filteredData = combinedData.filter(row => {
        // Filter by Restaurant Name
        const restaurantName = row['Restaurant Name'] || '';
        const locationMatches = selectedLocationNames.some(locName => {
          const locLower = locName.toLowerCase().trim();
          const rowLower = restaurantName.toLowerCase().trim();
          // Exact match or partial match
          return rowLower === locLower ||
                 rowLower.includes(locLower) ||
                 locLower.includes(rowLower);
        });

        if (!locationMatches) {
          return false;
        }

        // Filter by Order Channel (if channels are selected)
        if (selectedChannelNames.length > 0) {
          const orderChannel = row['Order Channel'] || '';
          const channelMatches = selectedChannelNames.some(channelName =>
            orderChannel.toLowerCase().trim() === channelName.toLowerCase().trim()
          );
          if (!channelMatches) {
            return false;
          }
        }

        return true;
      });

      console.log(`NET SALES PAGE - Filtered from ${combinedData.length} to ${filteredData.length} rows`);

      setCSVData(filteredData);
      setProcessingProgress("");
    } catch (error) {
      console.error("Error processing CSV files:", error);
      setCSVError(`Error processing CSV files: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCSVLoading(false);
    }
  };

  // Handler for preset dropdown change
  const handlePresetChange = (event: SelectChangeEvent<DatePreset | ''>) => {
    const preset = event.target.value as DatePreset | '';
    setSelectedPreset(preset);
    if (preset) {
      const { startDate: newStartDate, endDate: newEndDate } = getDateRangeForPreset(preset);
      setStartDate(newStartDate);
      setEndDate(newEndDate);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  if (isLoading) {
    return <div className="m-5 p-4 text-[var(--theme-text)]">Loading...</div>;
  }

  if (error) {
    return <div className="m-5 p-4 text-[var(--theme-text)]">Error: {error.toString()}</div>;
  }

  // Check if user's team has REPORTING role access
  const hasAccess = userTeam && (userTeam.isAdmin || hasRole(userTeam.teamRoles, 'REPORTING'));

  if (!hasAccess) {
    return (
      <div className="m-5 p-4">
        <div className="bg-red-500/10 p-4 rounded-md mb-4 border-l-4 border-red-500 text-red-600 shadow-md">
          <p className="font-medium">Access Denied: This page is only accessible to teams with REPORTING role access.</p>
          <Link href="/teams" className="text-[var(--theme-primary)] hover:text-[var(--theme-primary-dark)] hover:underline mt-2 inline-block font-medium">
            Go to Teams Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="m-5 p-4">
      <Header name="Net Sales Report" />
      <div className="mt-4 p-4 bg-[var(--theme-surface)] rounded-lg shadow-md border border-[var(--theme-border)]">
        <div className="bg-[var(--theme-success)]/10 p-5 rounded-lg mb-6 border-l-4 border-[var(--theme-success)] shadow-sm">
          <h3 className="font-semibold mb-2 text-[var(--theme-success)]">REPORTING Access Granted</h3>
          <p className="text-[var(--theme-text-secondary)]">Team: {userTeam.teamName}</p>
          <p className="text-[var(--theme-text-muted)] text-sm mt-1">
            Net Sales = Total - Add-on Tax - Service Charge Total (actual product revenue after discounts)
          </p>
        </div>

        {/* Data Generation Form */}
        <div className="mt-4 mb-8 p-4 border rounded-md shadow-sm border-[var(--theme-border)]" style={{ overflow: 'visible' }}>
          <h3 className="text-lg font-semibold mb-4 text-[var(--theme-text)] border-b pb-2 border-[var(--theme-border)]">Generate Net Sales Report</h3>

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

                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => {
                      setStartDate(newValue);
                      setSelectedPreset('');
                  }}
                  format="MMddyyyy"
                  className="bg-[var(--theme-surface-hover)] w-full rounded-md shadow-sm border border-[var(--theme-border)]"
                  minDate={new Date(new Date().getFullYear(), 0, 1, 12, 0, 0)}
                  maxDate={(() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (endDate) {
                      return endDate < yesterday ? endDate : yesterday;
                    }
                    return yesterday;
                  })()}
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
                  format="MMddyyyy"
                  className="bg-[var(--theme-surface-hover)] w-full rounded-md shadow-sm border border-[var(--theme-border)]"
                  minDate={(() => {
                    const minAllowedDate = new Date(new Date().getFullYear(), 0, 1, 12, 0, 0);
                    if (startDate) {
                      return startDate > minAllowedDate ? startDate : minAllowedDate;
                    }
                    return minAllowedDate;
                  })()}
                  maxDate={(() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    return yesterday;
                  })()}
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
                      : "No locations selected"}
                  </Typography>
                </div>

                {/* Order Channel Filter */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Typography className="font-medium text-[var(--theme-text)]">Order Channels</Typography>
                    <div className="flex gap-2">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleClearChannels}
                        disabled={selectedChannels.length === 0}
                        sx={{
                          color: 'var(--theme-text-muted)',
                          borderColor: 'var(--theme-border)',
                          '&:hover': { backgroundColor: 'var(--theme-surface-hover)' }
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleSelectAllChannels}
                        disabled={selectedChannels.length === ORDER_CHANNELS.length}
                        color="success"
                      >
                        Select All
                      </Button>
                    </div>
                  </div>
                  <Box className="p-3 bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded-md shadow-inner">
                    <div className="flex flex-wrap gap-2">
                      {ORDER_CHANNELS.map((channel) => (
                        <Chip
                          key={channel.id}
                          label={channel.name}
                          onClick={() => handleToggleChannel(channel.id)}
                          sx={{
                            backgroundColor: selectedChannels.includes(channel.id)
                              ? 'var(--theme-primary)'
                              : 'var(--theme-surface)',
                            color: selectedChannels.includes(channel.id)
                              ? 'var(--theme-text-on-primary)'
                              : 'var(--theme-text)',
                            border: '1px solid var(--theme-border)',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: selectedChannels.includes(channel.id)
                                ? 'var(--theme-primary-dark)'
                                : 'var(--theme-surface-active)'
                            }
                          }}
                        />
                      ))}
                    </div>
                  </Box>
                  <Typography className="text-xs text-[var(--theme-text-muted)] mt-1">
                    {selectedChannels.length > 0
                      ? `${selectedChannels.length} channel${selectedChannels.length !== 1 ? 's' : ''} selected`
                      : "All channels will be included"}
                  </Typography>
                </div>

                {/* Process Data Button */}
                <div className="mt-4">
                  <Button
                    variant="contained"
                    onClick={processCSVData}
                    disabled={csvLoading || !startDate || !endDate || selectedLocations.length === 0}
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
                    {csvLoading ? (
                      <div className="flex items-center justify-center">
                        <CircularProgress size={20} className="text-white mr-2" />
                        <span>Processing...</span>
                      </div>
                    ) : "Generate Report"}
                  </Button>

                  {/* Progress message */}
                  {processingProgress && (
                    <div className="mt-2 p-2 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-md border border-[var(--theme-primary)]/30 text-sm shadow-sm">
                      {processingProgress}
                    </div>
                  )}

                  {/* Processing errors */}
                  {csvError && (
                    <div className="mt-2 p-3 bg-red-500/10 text-red-600 rounded-md border-l-4 border-red-500">
                      <p className="font-semibold">Error Processing Data:</p>
                      <p className="text-sm overflow-auto max-h-24">{csvError}</p>
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

        {/* Data Table */}
        <div className="mt-8 mb-8">
          <CSVDataTable
            data={csvData}
            isLoading={csvLoading}
            error={csvError}
            selectedLocationIds={selectedLocationIds}
            selectedDiscountIds={[]}
            reportType="net_sales_report"
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>
    </div>
  );
};

export default NetSalesReportPage;
