"use client";

import { useGetAuthUserQuery } from "@/state/api";
import { useGetLocationsQuery } from "@/state/lambdaApi";
import { hasRole } from "@/lib/accessControl";
import Header from "@/components/Header";
import Link from "next/link";
// Removed useRouter and usePathname as they are no longer needed here
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
  SelectChangeEvent
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import LocationTable, { Location } from "@/components/LocationTable";
import CSVDataTable from "@/components/CSVDataTable";
import {
  fetchFiles as fetchS3Files,
  filterFilesByDateAndType,
  processMultipleCSVs,
  filterData,
  enhanceCSVWithLocationNames,
  fetchEmployeeData,
  enhanceCSVWithEmployeeNames,
  CSVProcessingConfig // Import the new type
} from "@/lib/csvProcessing";
import {
  DEFAULT_DISCOUNT_IDS,
  DEFAULT_LOCATION_IDS
} from "@/lib/legacyLambdaProcessing";
import { DatePreset, datePresets, getDateRangeForPreset } from "@/lib/utils"; // Added import

const S3_DATA_LAKE = process.env.NEXT_PUBLIC_DATA_LAKE_S3_URL || "https://data-lake-magooos-site.s3.us-east-2.amazonaws.com";
const LOYALTY_DATA_FOLDER = process.env.NEXT_PUBLIC_LOYALTY_DATA_FOLDER || "loyalty-data-pool/";

// Data file types based on the new loyalty_data_MM-DD-YYYY.csv format
const DATA_TYPES = [
  { value: 'loyalty_data', label: 'Loyalty Data' }
];

// NOTE: The current implementation handles filenames that follow the pattern: loyalty_data_MM-DD-YYYY.csv

const DataPage = () => {
  // Removed router and pathname
  const { data: authData, isLoading, error } = useGetAuthUserQuery({});
  const { data: locationsData } = useGetLocationsQuery();
  const userTeam = authData?.userDetails?.team;
  const userLocationIds = authData?.userDetails?.locationIds || [];
  const userIsAdmin = userTeam?.isAdmin || false;

  // Form state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset | ''>(''); // Removed selectedDepartmentPage
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [previousLocations, setPreviousLocations] = useState<Location[]>([]);
  const [lastAction, setLastAction] = useState<string>("");
  const [discountIds, setDiscountIds] = useState<number[]>(DEFAULT_DISCOUNT_IDS);
  const [newDiscountId, setNewDiscountId] = useState("");
  
  // Client-side processing state
  const [dataType, setDataType] = useState<string>(DATA_TYPES[0].value);
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
      // Use the fetchS3Files utility from csvProcessing with the folder path
      console.log("DATA PAGE - Fetching files from:", S3_DATA_LAKE, LOYALTY_DATA_FOLDER);
      const fileList = await fetchS3Files(S3_DATA_LAKE, LOYALTY_DATA_FOLDER);
      console.log("DATA PAGE - Files found:", fileList);
      setAllS3Files(fileList);
    } catch (err) {
      console.error("File fetch failed:", err);
      setCSVError("Failed to load data files from S3 bucket");
    }
  };

  // Client-side CSV data processing
  const processCSVData = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    setCSVLoading(true);
    setCSVError(null);
    setProcessingProgress("Filtering files by date and type...");
    setCSVData([]);

    try {
      // Filter files by date range and data type
      const matchingFiles = filterFilesByDateAndType(
        allS3Files,
        startDate,
        endDate,
        dataType
      );

      if (matchingFiles.length === 0) {
        setCSVError("No files found matching the selected date range and data type");
        setCSVLoading(false);
        return;
      }

      setProcessingProgress(`Processing ${matchingFiles.length} file(s)...`);
      
      // Create full URLs for the files - matching the Reporting page approach
      const fileUrls = matchingFiles.map(filename => `${S3_DATA_LAKE}/${LOYALTY_DATA_FOLDER}${filename}`);
      
      // Process all files (fetch and parse) - same as Reporting page
      setProcessingProgress(`Processing ${matchingFiles.length} file(s)...`);
      const combinedData = await processMultipleCSVs(fileUrls);
      
      // Log sample data for debugging
      if (combinedData.length > 0) {
        console.log("DATA PAGE - Sample CSV Data:", combinedData[0]);
      }
      
      // Apply filters - ALWAYS filter by user's location access unless they're an admin
      let filteredData = combinedData;
      
      // Determine which location IDs to use for filtering
      let effectiveLocationIds = selectedLocationIds;
      
      // If no locations are selected but user has assigned locations and is not an admin,
      // use the user's assigned locations
      if (selectedLocationIds.length === 0 && userLocationIds.length > 0 && !userIsAdmin) {
        console.log("DATA PAGE - No locations selected, using user's assigned locations:", userLocationIds);
        effectiveLocationIds = userLocationIds;
      }
      
      // Define a config for this page's CSV processing needs *before* filtering/enhancing
      const dataPageCsvConfig: CSVProcessingConfig = {
        locationIdentifierField: {
          sourceNames: ['Store', 'LocationID', 'Location ID'] // CSVs might use any of these for location
        },
        discountIdentifierField: { // Define how to find the discount ID for filtering
          sourceNames: ['DSCL ID', 'Discount ID', 'DiscountId', 'Order Type'] // Added 'Order Type' as potential source
        },
        employeeIdentifierField: {
          sourceNames: 'Loyalty ID'
        },
        guestNameField: {
          sourceNames: 'Guest Name'
        }
        // Add other field accessors as needed for this page
      };

      // Apply location and discount filters
      if (effectiveLocationIds.length > 0 || discountIds.length > 0) {
        setProcessingProgress("Applying filters...");
        // Pass the config to filterData
        // Pass empty string '' for dailyUsageCountFilter as it's not used here
        filteredData = filterData(combinedData, effectiveLocationIds, discountIds, selectedLocations, '', dataPageCsvConfig);
      }
      
      // Enhance the CSV data with location names AFTER filtering
      setProcessingProgress("Enhancing data with location information...");
      // Pass the config to enhanceCSVWithLocationNames
      filteredData = enhanceCSVWithLocationNames(filteredData, selectedLocations, dataPageCsvConfig);
      
      // Fetch employee data and enhance CSV with employee names
      setProcessingProgress("Fetching employee data...");
      const employeeData = await fetchEmployeeData();
      
      // Debug log for employee data
      console.log(`DEBUG - Data Department - Employee data fetched: ${Object.keys(employeeData).length} records`);
      
      // Sample the first few loyalty IDs from the data for debugging
      if (filteredData.length > 0) {
        const sampleLoyaltyIds = filteredData.slice(0, 5).map(row => row['Loyalty ID'] || 'N/A');
        console.log(`DEBUG - Data Department - Sample loyalty IDs from data: ${sampleLoyaltyIds.join(', ')}`);
        
        // Check if these sample IDs exist in the employee data
        sampleLoyaltyIds.forEach(id => {
          if (id !== 'N/A') {
            console.log(`DEBUG - Data Department - Sample ID "${id}" exists in employee data: ${Boolean(employeeData[id])}`);
          }
        });
      }
      
      // Enhance CSV data with employee names
      setProcessingProgress("Enhancing data with employee names...");
      // Pass the dataPageCsvConfig here
      filteredData = enhanceCSVWithEmployeeNames(filteredData, employeeData, dataPageCsvConfig);

      // Additional debugging
      console.log(`DATA PAGE - Processing complete: ${filteredData.length} rows after filtering`);
      
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

  // Removed handleDepartmentPageChange

  useEffect(() => {
    // Fetch available files on component mount
    fetchFiles();
    // Removed pathname dependency and setSelectedDepartmentPage
  }, []);

  if (isLoading) {
    return <div className="m-5 p-4 text-[var(--theme-text)]">Loading...</div>;
  }

  if (error) {
    return <div className="m-5 p-4 text-[var(--theme-text)]">Error: {error.toString()}</div>;
  }

  // Check if user's team has DATA role access
  console.log("DATA PAGE - User team:", userTeam);
  console.log("DATA PAGE - Team roles:", userTeam?.teamRoles);
  console.log("DATA PAGE - Is Admin:", userTeam?.isAdmin);
  
  const hasAccess = userTeam && (userTeam.isAdmin || hasRole(userTeam.teamRoles, 'DATA'));
  console.log("DATA PAGE - Has Access:", hasAccess);

  if (!hasAccess) {
    return (
      <div className="m-5 p-4">
        <div className="bg-red-500/10 p-4 rounded-md mb-4 border-l-4 border-red-500 text-red-600 shadow-md">
          <p className="font-medium">Access Denied: This page is only accessible to teams with DATA role access.</p>
          <Link href="/teams" className="text-[var(--theme-primary)] hover:text-[var(--theme-primary-dark)] hover:underline mt-2 inline-block font-medium">
            Go to Teams Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="m-5 p-4">
      <Header name="Data Department" />
      <div className="mt-4 p-4 bg-[var(--theme-surface)] rounded-lg shadow-md border border-[var(--theme-border)]">
        <div className="bg-[var(--theme-success)]/10 p-5 rounded-lg mb-6 border-l-4 border-[var(--theme-success)] shadow-sm">
          <h3 className="font-semibold mb-2 text-[var(--theme-success)]">DATA Access Successful</h3>
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
        <div className="mt-4 mb-8 p-4 border rounded-md shadow-sm border-[var(--theme-border)]">
          <h3 className="text-lg font-semibold mb-4 text-[var(--theme-text)] border-b pb-2 border-[var(--theme-border)]">Generate Data Report</h3>
          
          <Grid container spacing={4}>
            {/* Left column - Form inputs */}
            <Grid item xs={12} md={6}>
              <div className="space-y-4 flex flex-col h-full justify-center">
                {/* Removed Department Page Selector */}

                {/* Data Type Selector (Original - specific to this page) */}
                <FormControl fullWidth variant="outlined" className="bg-[var(--theme-surface-hover)] rounded-md shadow-sm border border-[var(--theme-border)]">
                  <InputLabel className="text-[var(--theme-text-secondary)]">Data Type</InputLabel>
                  <Select
                    value={dataType}
                    onChange={(e) => setDataType(e.target.value as string)}
                    label="Data Type"
                    className="border-[var(--theme-border)] text-[var(--theme-text)]"
                  >
                    {DATA_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText className="text-[var(--theme-text-muted)]">Select the type of data to generate</FormHelperText>
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
                  onChange={(newValue: Date | null) => {
                      setStartDate(newValue);
                      setSelectedPreset(''); // Clear preset on manual change
                      // If an end date is already selected and it's before the new start date, adjust end date.
                      if (newValue && endDate && endDate < newValue) {
                        setEndDate(newValue);
                      }
                  }}
                  format="MMddyyyy"
                  className="bg-[var(--theme-surface-hover)] w-full rounded-md shadow-sm border border-[var(--theme-border)]"
                  minDate={new Date(new Date().getFullYear(), 0, 13, 12, 0, 0)} // Jan 13 of current year at noon
                  // Max date is either yesterday or the end date (if set), whichever is earlier
                  maxDate={(() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    yesterday.setHours(23, 59, 59, 999); // Set to end of day

                    if (endDate) {
                      // Ensure endDate is also at the end of its day for comparison
                      const endOfDayEndDate = new Date(endDate);
                      endOfDayEndDate.setHours(23, 59, 59, 999);
                      return endOfDayEndDate < yesterday ? endOfDayEndDate : yesterday;
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
                  onChange={(newValue: Date | null) => {
                      setEndDate(newValue);
                      setSelectedPreset(''); // Clear preset on manual change
                  }}
                  format="MMddyyyy"
                  className="bg-[var(--theme-surface-hover)] w-full rounded-md shadow-sm border border-[var(--theme-border)]"
                  // Min date is either Jan 13, 2025 or the start date (if set), whichever is later
                  minDate={(() => {
                    const minAllowedDate = new Date(new Date().getFullYear(), 0, 13, 12, 0, 0);
                    
                    if (startDate) {
                      // Ensure startDate is at the beginning of its day for comparison
                      const startOfDayStartDate = new Date(startDate);
                      startOfDayStartDate.setHours(0, 0, 0, 0);
                      return startOfDayStartDate > minAllowedDate ? startOfDayStartDate : minAllowedDate;
                    }
                    
                    return minAllowedDate;
                  })()}
                  // Max date is yesterday
                  maxDate={(() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    yesterday.setHours(23, 59, 59, 999); // Set to end of day
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
                        <X className="h-4 w-4" />
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
                            onDelete={() => handleRemoveLocation(location.id)}
                            sx={{
                              backgroundColor: 'var(--theme-primary-light)',
                              color: 'var(--theme-primary)',
                              border: '1px solid var(--theme-border)'
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

                {(userTeam?.isAdmin || hasRole(userTeam.teamRoles, 'ADMIN')) && (
                  <div>
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
            selectedDiscountIds={discountIds}
            reportType={dataType}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>
    </div>
  );
};

export default DataPage;
