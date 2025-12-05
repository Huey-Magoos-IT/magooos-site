"use client";

import { useGetAuthUserQuery } from "@/state/api";
import { useGetLocationsQuery } from "@/state/lambdaApi";
import { hasRole } from "@/lib/accessControl";
import Header from "@/components/Header";
import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { 
  TextField, 
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
  SelectChangeEvent // Added import
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import LocationTable, { Location } from "@/components/LocationTable";
import CSVDataTable from "@/components/CSVDataTable";
import {
  fetchFiles as fetchS3Files,
  filterFilesByDateAndType,
  processMultipleCSVs,
  filterData,
  fetchEmployeeData,
  enhanceCSVWithEmployeeNames,
  CSVProcessingConfig // Import the new type
} from "@/lib/csvProcessing";
import {
  DEFAULT_DISCOUNT_IDS,
  DEFAULT_LOCATION_IDS
} from "@/lib/legacyLambdaProcessing";
import { DatePreset, datePresets, getDateRangeForPreset } from "@/lib/utils"; // Added import
import { toast } from "react-hot-toast";

const S3_DATA_LAKE = process.env.NEXT_PUBLIC_DATA_LAKE_S3_URL || "https://data-lake-magooos-site.s3.us-east-2.amazonaws.com";
const REPORTING_DATA_FOLDER = process.env.NEXT_PUBLIC_REPORTING_DATA_FOLDER || "reporting-data-pool/";

// Report types
const REPORT_TYPES = [
  { value: 'redflag-report', label: 'Red Flag Transactions' },
  { value: 'no-loyalty-discount', label: 'Discount without Rewards ID' }
  // { value: 'redflag-summary', label: 'Red Flag Summary' } // Hidden per requirements
];

const ReportingPage = () => {
  const { data: authData, isLoading, error } = useGetAuthUserQuery({});
  const { data: locationsData } = useGetLocationsQuery();
  const userTeam = authData?.userDetails?.team;
  const userLocationIds = authData?.userDetails?.locationIds || [];
  const userIsAdmin = userTeam?.isAdmin || false;

  // Form state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset | ''>(''); // Added state for preset
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [previousLocations, setPreviousLocations] = useState<Location[]>([]);
  const [lastAction, setLastAction] = useState<string>("");
  const [discountIds, setDiscountIds] = useState<number[]>(DEFAULT_DISCOUNT_IDS);
  const [newDiscountId, setNewDiscountId] = useState("");
  const [dailyUsageCountFilter, setDailyUsageCountFilter] = useState<string>(''); // Added state for usage count filter
  
  // Client-side processing state
  const [reportType, setReportType] = useState<string>(REPORT_TYPES[0].value);
  const [allS3Files, setAllS3Files] = useState<string[]>([]);
  const [csvData, setCSVData] = useState<any[]>([]);
  const [csvLoading, setCSVLoading] = useState(false);
  const [csvError, setCSVError] = useState<string|null>(null);
  const [processingProgress, setProcessingProgress] = useState<string>("");
  
  // Derived state for just the location IDs
  const selectedLocationIds = selectedLocations.map(loc => loc.id);

  const handleAddDiscountId = () => {
    const id = parseInt(newDiscountId);
    if (!isNaN(id) && !discountIds.includes(id)) {
      setDiscountIds([...discountIds, id]);
      setNewDiscountId("");
    }
  };

  const handleRemoveDiscountId = (id: number) => {
    setDiscountIds(discountIds.filter(x => x !== id));
  };

  const handleAddLocation = (location: Location) => {
    // Save current state for undo
    setPreviousLocations([...selectedLocations]);
    setLastAction("add");
    
    // Add the location
    setSelectedLocations(prev => [...prev, location]);
  };

  const handleRemoveLocation = (locationId: string) => {
    // Save current state for undo
    setPreviousLocations([...selectedLocations]);
    setLastAction("remove");
    
    // Remove the location
    setSelectedLocations(prev => prev.filter(loc => loc.id !== locationId));
  };

  // Handle adding all available locations
  const handleAddAllLocations = () => {
    // Save current state for undo
    setPreviousLocations([...selectedLocations]);
    setLastAction("addAll");
    
    if (locationsData?.locations) {
      // Filter to only include locations the user has access to
      let availableLocations = locationsData.locations;
      if (!userIsAdmin && userLocationIds.length > 0) {
        availableLocations = locationsData.locations.filter((location: Location) =>
          userLocationIds.includes(location.id)
        );
      }
      // Add all available locations
      setSelectedLocations(availableLocations);
    }
  };

  // Handle clearing all locations
  const handleClearAll = () => {
    // Save current state for undo
    setPreviousLocations([...selectedLocations]);
    setLastAction("clearAll");
    
    // Clear all locations
    setSelectedLocations([]);
  };

  // Handle undo action
  const handleUndo = () => {
    if (lastAction) {
      // Restore previous state
      setSelectedLocations(previousLocations);
      // Reset last action
      setLastAction("");
    }
  };

  // Fetch S3 files for client-side processing
  const fetchFiles = async () => {
    try {
      // Use the fetchS3Files utility from csvProcessing
      // Use the fetchS3Files utility from csvProcessing with the folder path
      console.log("REPORTING PAGE - Fetching files from:", S3_DATA_LAKE, REPORTING_DATA_FOLDER);
      const fileList = await fetchS3Files(S3_DATA_LAKE, REPORTING_DATA_FOLDER);
      console.log("REPORTING PAGE - Files found:", fileList);
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

    setCSVLoading(true);
    setCSVError(null);
    setProcessingProgress("Filtering files by date and type...");
    setCSVData([]);

    try {
      // Filter files by date range and report type
      const matchingFiles = filterFilesByDateAndType(
        allS3Files,
        startDate,
        endDate,
        reportType
      );

      if (matchingFiles.length === 0) {
        setCSVError("No files found matching the selected date range and report type");
        setCSVLoading(false);
        return;
      }

      setProcessingProgress(`Processing ${matchingFiles.length} file(s)...`);

      // Create full URLs for the files
      // Create full URLs for the files including the folder path
      const fileUrls = matchingFiles.map(filename => `${S3_DATA_LAKE}/${REPORTING_DATA_FOLDER}${filename}`);

      // Process all files (fetch and parse)
      const combinedData = await processMultipleCSVs(fileUrls);
      
      // Apply filters - ALWAYS filter by user's location access unless they're an admin
      let filteredData = combinedData;
      
      // Determine which location IDs to use for filtering
      let effectiveLocationIds = selectedLocationIds;
      
      // If no locations are selected but user has assigned locations and is not an admin,
      // use the user's assigned locations
      if (selectedLocationIds.length === 0 && userLocationIds.length > 0 && !userIsAdmin) {
        console.log("No locations selected, using user's assigned locations:", userLocationIds);
        effectiveLocationIds = userLocationIds;
      }
      
      // Define a config for this page's CSV processing needs *before* filtering/enhancing
      const reportingPageCsvConfig: CSVProcessingConfig = {
        locationIdentifierField: {
          sourceNames: ['Store', 'LocationID', 'Location ID'] // Potential location columns
        },
        discountIdentifierField: {
          sourceNames: ['Order Type', 'DSCL ID', 'Discount ID', 'DiscountId'] // Potential discount columns
        },
        dailyUsageCountField: { // Define how to find the usage count
          sourceNames: 'Daily Usage Count',
          dataType: 'number', // Explicitly hint it should be a number
          defaultValue: 0 // Treat missing/empty as 0 for filtering
        },
        employeeIdentifierField: {
          sourceNames: 'Loyalty ID'
        },
        guestNameField: {
          sourceNames: 'Guest Name'
        }
        // Add other field accessors as needed for reporting
      };

      // Apply location, discount, and usage count filters
      setProcessingProgress("Filtering data by location, discount, and usage count...");
      
      // For reporting data, we need to filter by location names from the CSV "Store" column
      // The CSV "Store" column contains location names that should match our location.name exactly
      const selectedLocationNames = selectedLocations.map(loc => loc.name);
      
      console.log("REPORTING PAGE - Selected locations objects:", selectedLocations);
      console.log("REPORTING PAGE - Selected location names for filtering:", selectedLocationNames);
      console.log("REPORTING PAGE - Sample CSV data (first 3 rows):", combinedData.slice(0, 3));
      
      // Apply filtering with location names for exact matching against CSV "Store" column
      filteredData = filterData(
        combinedData,
        selectedLocationNames, // Use exact location names for matching CSV "Store" column
        discountIds, // Re-enabled discount filtering
        selectedLocations,    // Pass selectedLocations as before
        dailyUsageCountFilter, // Use the dailyUsageCountFilter state
        reportingPageCsvConfig // Pass the config object
      );
      // The enhanceCSVWithLocationNames is not currently called on this page,
      // but if it were, it would use the reportingPageCsvConfig.

      // Fetch employee data and enhance CSV with employee names
      setProcessingProgress("Fetching employee data...");
      const employeeData = await fetchEmployeeData();
      
      // Debug log for employee data
      console.log(`DEBUG - Employee data fetched: ${Object.keys(employeeData).length} records`);
      
      // Sample the first few loyalty IDs from the data for debugging
      if (filteredData.length > 0) {
        const sampleLoyaltyIds = filteredData.slice(0, 5).map(row => row['Loyalty ID'] || 'N/A');
        console.log(`DEBUG - Sample loyalty IDs from data: ${sampleLoyaltyIds.join(', ')}`);
        
        // Check if these sample IDs exist in the employee data
        sampleLoyaltyIds.forEach(id => {
          if (id !== 'N/A') {
            console.log(`DEBUG - Sample ID "${id}" exists in employee data: ${Boolean(employeeData[id])}`);
          }
        });
      }
      
      // Enhance CSV data with employee names
      setProcessingProgress("Enhancing data with employee names...");
      // Use the same config object defined earlier
      filteredData = enhanceCSVWithEmployeeNames(filteredData, employeeData, reportingPageCsvConfig);

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
    // Fetch available files on component mount
    fetchFiles();
  }, []);

  if (isLoading) {
    return <div className="m-5 p-4 text-[var(--theme-text)]">Loading...</div>;
  }

  if (error) {
    return <div className="m-5 p-4 text-[var(--theme-text)]">Error: {error.toString()}</div>;
  }

  // Check if user's team has REPORTING role access
  console.log("REPORTING PAGE - User team:", userTeam);
  console.log("REPORTING PAGE - Team roles:", userTeam?.teamRoles);
  console.log("REPORTING PAGE - Is Admin:", userTeam?.isAdmin);
  
  const hasAccess = userTeam && (userTeam.isAdmin || hasRole(userTeam.teamRoles, 'REPORTING'));
  console.log("REPORTING PAGE - Has Access:", hasAccess);

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
      <Header name="Reporting Department" />
      <div className="mt-4 p-4 bg-[var(--theme-surface)] rounded-lg shadow-md border border-[var(--theme-border)]">
        <div className="bg-[var(--theme-success)]/10 p-5 rounded-lg mb-6 border-l-4 border-[var(--theme-success)] shadow-sm">
          <h3 className="font-semibold mb-2 text-[var(--theme-success)]">REPORTING Access Granted</h3>
          <p className="text-[var(--theme-text-secondary)]">Team: {userTeam.teamName}</p>
          <div className="mt-2">
            <p className="text-[var(--theme-success)]">Roles:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {userTeam.teamRoles?.map(tr => (
                <span key={tr.id} className="px-2 py-0.5 bg-[var(--theme-success)]/20 text-[var(--theme-success)] text-xs rounded-full shadow-sm">
                  {tr.role.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Data Generation Form */}
        <div className="mt-4 mb-8 p-4 border rounded-md shadow-sm border-[var(--theme-border)]" style={{ overflow: 'visible' }}>
          <h3 className="text-lg font-semibold mb-4 text-[var(--theme-text)] border-b pb-2 border-[var(--theme-border)]">Generate Data Report</h3>
          
          {/* Restored MUI Grid container with align-items: stretch to ensure bottom alignment */}
          <Grid container spacing={4} sx={{ alignItems: 'stretch', display: 'flex' }}>
            {/* Left column - Form inputs */}
            {/* Restored Grid item */}
            <Grid item xs={12} md={6}>
              {/* Restored original inner div */}
              <div className="space-y-4 flex flex-col">
                {/* Report Type Selector */}
                <FormControl fullWidth variant="outlined" className="bg-[var(--theme-surface-hover)] rounded-md shadow-sm border border-[var(--theme-border)]">
                  <InputLabel className="text-[var(--theme-text-secondary)]">Report Type</InputLabel>
                  <Select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as string)}
                    label="Report Type"
                    className="border-[var(--theme-border)] text-[var(--theme-text)]"
                  >
                    {REPORT_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText className="text-[var(--theme-text-muted)]">Select the type of report to generate</FormHelperText>
                </FormControl>

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
                      setSelectedPreset(''); // Clear preset on manual change
                  }}
                  format="MMddyyyy"
                  className="bg-[var(--theme-surface-hover)] w-full rounded-md shadow-sm border border-[var(--theme-border)]"
                  minDate={new Date(new Date().getFullYear(), 0, 13, 12, 0, 0)} // Jan 13 of current year at noon
                  // Max date is either yesterday or the end date (if set), whichever is earlier
                  maxDate={(() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    // If end date is set, don't allow selecting a start date after it
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
                      setSelectedPreset(''); // Clear preset on manual change
                  }}
                  format="MMddyyyy"
                  className="bg-[var(--theme-surface-hover)] w-full rounded-md shadow-sm border border-[var(--theme-border)]"
                  // Min date is either Jan 13, 2025 or the start date (if set), whichever is later
                  minDate={(() => {
                    const minAllowedDate = new Date(new Date().getFullYear(), 0, 13, 12, 0, 0); // Jan 13 of current year at noon
                    
                    // If start date is set, don't allow selecting an end date before it
                    if (startDate) {
                      return startDate > minAllowedDate ? startDate : minAllowedDate;
                    }
                    
                    return minAllowedDate;
                  })()}
                  // Max date is yesterday
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-undo-2">
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle">
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
                
                {/* Daily Usage Count Filter - Added */}
                {reportType === 'redflag-report' && ( // Only show for the relevant report
                  <div className="mt-4">
                    <TextField
                      label="Min Daily Usage Count"
                      type="number"
                      value={dailyUsageCountFilter}
                      onChange={(e) => setDailyUsageCountFilter(e.target.value)}
                      variant="outlined"
                      fullWidth
                      className="bg-[var(--theme-surface-hover)] rounded-md shadow-sm border border-[var(--theme-border)]"
                      InputProps={{
                        inputProps: { min: 0 }, // Prevent negative numbers
                        className: "text-[var(--theme-text)]"
                      }}
                      InputLabelProps={{
                        className: "text-[var(--theme-text-secondary)]"
                      }}
                      helperText="Show transactions with usage count >= this value"
                    />
                  </div>
                )}

                {(userTeam?.isAdmin || hasRole(userTeam.teamRoles, 'ADMIN')) && (
                  <div className="mt-4">
                    <div className="mb-2">
                      <TextField
                        label="Add Discount ID"
                        value={newDiscountId}
                        onChange={(e) => setNewDiscountId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDiscountId()}
                        variant="outlined"
                        className="bg-[var(--theme-surface-hover)] rounded-md shadow-sm border border-[var(--theme-border)]"
                        InputProps={{
                          className: "text-[var(--theme-text)]"
                        }}
                        InputLabelProps={{
                          className: "text-[var(--theme-text-secondary)]"
                        }}
                        fullWidth
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {discountIds.map((id) => (
                        <Chip
                          key={id}
                          label={id}
                          onDelete={() => handleRemoveDiscountId(id)}
                          sx={{
                            backgroundColor: 'var(--theme-primary-light)',
                            color: 'var(--theme-primary)',
                            border: '1px solid var(--theme-border)'
                          }}
                          deleteIcon={<X className="h-4 w-4" style={{ color: 'var(--theme-primary)' }} />}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className={`${(userTeam?.isAdmin || hasRole(userTeam.teamRoles, 'ADMIN')) ? 'mt-4' : 'mt-2'}`}>
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
                    ) : "Process Data"}
                  </Button>

                  {/* Progress message for processing */}
                  {processingProgress && (
                    <div className="mt-2 p-2 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-md border border-[var(--theme-primary)]/30 text-sm shadow-sm">
                      {processingProgress}
                    </div>
                  )}

                  {/* Processing errors */}
                  {csvError && (
                    <div className="mt-2 p-3 bg-red-500/10 text-red-600 rounded-md border-l-4 border-red-500">
                      <p className="font-semibold">Error Processing CSV Data:</p>
                      <p className="text-sm overflow-auto max-h-24">{csvError}</p>
                    </div>
                  )}
                </div>
              </div>
            </Grid> {/* Added missing closing tag */}
            
            {/* Right column - Location Table */}
            {/* Restored Grid item */}
            <Grid item xs={12} md={6}>
              {/* Removed wrapper div */}
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
            selectedDiscountIds={discountIds}
            reportType={reportType}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>
    </div>
  );
};

export default ReportingPage;