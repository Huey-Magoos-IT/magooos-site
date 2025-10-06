"use client";

import { useGetAuthUserQuery } from "@/state/api";
import { useGetLocationsQuery } from "@/state/lambdaApi";
import { hasRole } from "@/lib/accessControl";
import Header from "@/components/Header";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation"; // Added useRouter and usePathname
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
const LOYALTY_DATA_FOLDER = "loyalty-scan-pool/"; // Updated based on user input

// Data file types for this page, allowing selection between detail, summary, and rolled up summary
const DATA_TYPES = [
  { value: 'loyalty_scan_detail', label: 'Loyalty Scan Detail' },
  { value: 'loyalty_scan_summary', label: 'Loyalty Scan Summary' },
  { value: 'loyalty_scan_rolled_up', label: 'Rolled Up Summary' }
];

// NOTE: This page handles filenames that follow patterns:
// loyalty_scan_detail_MM-DD-YYYY.csv
// loyalty_scan_summary_MM-DD-YYYY.csv
// Rolled Up Summary uses summary files but aggregates data across the date range

const PercentOfScansPage = () => {
  // Removed router and pathname as page navigation dropdown is removed from this page
  const { data: authData, isLoading, error } = useGetAuthUserQuery({});
  const { data: locationsData } = useGetLocationsQuery();
  const userTeam = authData?.userDetails?.team;
  const userLocationIds = authData?.userDetails?.locationIds || [];
  const userIsAdmin = userTeam?.isAdmin || false;

  // Form state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset | ''>('');
  // Removed selectedDepartmentPage state
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
      console.log("PERCENT OF SCANS PAGE - Fetching files from:", S3_DATA_LAKE, LOYALTY_DATA_FOLDER); // Updated log
      const fileList = await fetchS3Files(S3_DATA_LAKE, LOYALTY_DATA_FOLDER);
      console.log("PERCENT OF SCANS PAGE - Files found:", fileList); // Updated log
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
    console.log("PERCENT OF SCANS PAGE - processCSVData dataType check. Actual state value:", dataType); // Diagnostic log

    try {
      // For rolled up summary, use the summary files
      const fileTypeForFiltering = dataType === 'loyalty_scan_rolled_up' ? 'loyalty_scan_summary' : dataType;
      
      // Filter files by date range and data type
      const matchingFiles = filterFilesByDateAndType(
        allS3Files,
        startDate,
        endDate,
        fileTypeForFiltering
      );

      if (matchingFiles.length === 0) {
        setCSVError("No files found matching the selected date range and data type");
        setCSVLoading(false);
        return;
      }

      setProcessingProgress(`Processing ${matchingFiles.length} file(s)...`);
      
      // Create full URLs for the files
      const fileUrls = matchingFiles.map(filename => `${S3_DATA_LAKE}/${LOYALTY_DATA_FOLDER}${filename}`);
      
      setProcessingProgress(`Processing ${matchingFiles.length} file(s)...`);
      const combinedData = await processMultipleCSVs(fileUrls);
      
      if (combinedData.length > 0) {
        console.log("PERCENT OF SCANS PAGE - Sample CSV Data:", combinedData[0]); // Updated log
      }
      
      let filteredData = combinedData;
      
      let effectiveLocationIds = selectedLocationIds;
      
      if (selectedLocationIds.length === 0 && userLocationIds.length > 0 && !userIsAdmin) {
        console.log("PERCENT OF SCANS PAGE - No locations selected, using user's assigned locations:", userLocationIds); // Updated log
        effectiveLocationIds = userLocationIds;
      }
      
      let percentOfScansCsvConfig: CSVProcessingConfig;

      if (dataType === 'loyalty_scan_detail') {
        percentOfScansCsvConfig = {
          // For loyalty_scan_detail report:
          locationIdentifierField: { sourceNames: ['Location ID', 'LocationId', 'Location_ID'], dataType: 'string' },
          employeeIdentifierField: { sourceNames: ['Employee ID', 'EmployeeId', 'Employee_ID'], dataType: 'string' },
          transactionDateField: { sourceNames: ['Date'], dataType: 'string' }, // Keep as string for filtering then process, or make date to be strict
          dailyUsageCountField: { sourceNames: ['Total Checks'], dataType: 'number' }, // For 'daily usage count' filter
        };
      } else if (dataType === 'loyalty_scan_summary') {
        percentOfScansCsvConfig = {
          // For loyalty_scan_summary report:
          locationIdentifierField: { sourceNames: ['Location ID', 'LocationId', 'Location_ID', 'Location'], dataType: 'string' }, // Prioritize ID fields
          transactionDateField: { sourceNames: ['Date'], dataType: 'string' },
          dailyUsageCountField: { sourceNames: ['Total Checks'], dataType: 'number' },
          additionalFields: {
            'Loyalty Scans': { sourceNames: ['Loyalty Scans'], dataType: 'number' },
            'Scan Rate': { sourceNames: ['Scan Rate'], dataType: 'string' }
          },
        };
      } else { // For 'loyalty_scan_rolled_up'
        percentOfScansCsvConfig = {
          // For rolled up summary - use summary data but aggregate across dates
          locationIdentifierField: { sourceNames: ['Location ID', 'LocationId', 'Location_ID', 'Location'], dataType: 'string' },
          transactionDateField: { sourceNames: ['Date'], dataType: 'string' },
          dailyUsageCountField: { sourceNames: ['Total Checks'], dataType: 'number' },
          additionalFields: {
            'Loyalty Scans': { sourceNames: ['Loyalty Scans'], dataType: 'number' },
            'Scan Rate': { sourceNames: ['Scan Rate'], dataType: 'string' }
          },
        };
      }
      
      console.log("PERCENT OF SCANS PAGE - CSV Config based on dataType:", dataType, percentOfScansCsvConfig);

      if (effectiveLocationIds.length > 0 || discountIds.length > 0) {
        // Discount filter will effectively not apply if discountIdentifierField is not in config for the current dataType
        setProcessingProgress("Applying filters...");
        filteredData = filterData(combinedData, effectiveLocationIds, discountIds, selectedLocations, '', percentOfScansCsvConfig);
      }
      
      setProcessingProgress("Enhancing data with location information (if applicable)...");
      // This adds 'Location Name' based on the 'Location' column (ID or name) from CSV.
      // It does not affect the 'Employee' column.
      filteredData = enhanceCSVWithLocationNames(filteredData, selectedLocations, percentOfScansCsvConfig);
      
      // Handle rolled up summary aggregation
      let finalData = filteredData;
      
      if (dataType === 'loyalty_scan_rolled_up') {
        setProcessingProgress("Aggregating data for rolled up summary...");
        
        // Group data by location and aggregate totals
        const locationGroups: { [key: string]: any } = {};
        
        filteredData.forEach(row => {
          const locationId = row['Location ID'] || row['Location'];
          const locationName = row['Location Name'] || locationId;
          const key = `${locationId}-${locationName}`;
          
          if (!locationGroups[key]) {
            locationGroups[key] = {
              'Location ID': locationId,
              'Location Name': locationName,
              'Total Checks': 0,
              'Loyalty Scans': 0,
              'Days': 0
            };
          }
          
          // Aggregate the values
          locationGroups[key]['Total Checks'] += Number(row['Total Checks']) || 0;
          locationGroups[key]['Loyalty Scans'] += Number(row['Loyalty Scans']) || 0;
          locationGroups[key]['Days'] += 1;
        });
        
        // Convert back to array and calculate averages
        finalData = Object.values(locationGroups).map(group => {
          const avgTotalChecks = group['Days'] > 0 ? group['Total Checks'] / group['Days'] : 0;
          const avgLoyaltyScans = group['Days'] > 0 ? group['Loyalty Scans'] / group['Days'] : 0;
          const scanRate = avgTotalChecks > 0 ? ((avgLoyaltyScans / avgTotalChecks) * 100).toFixed(2) + '%' : '0%';
          
          return {
            'Location ID': group['Location ID'],
            'Location Name': group['Location Name'],
            'Avg Total Checks': Math.round(avgTotalChecks * 100) / 100, // Round to 2 decimal places
            'Avg Loyalty Scans': Math.round(avgLoyaltyScans * 100) / 100,
            'Avg Scan Rate': scanRate,
            'Days in Period': group['Days']
          };
        });
        
        console.log(`PERCENT OF SCANS PAGE - Rolled up summary complete: ${finalData.length} locations aggregated.`);
      }

      console.log(`PERCENT OF SCANS PAGE - Processing complete: ${finalData.length} rows after filtering and processing.`);

      setCSVData(finalData);
      setProcessingProgress("");
    } catch (error) {
      console.error("Error processing CSV files:", error);
      setCSVError(`Error processing CSV files: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCSVLoading(false);
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

  // Removed handleDepartmentPageChange handler

  useEffect(() => {
    fetchFiles();
    // Removed pathname dependency and setSelectedDepartmentPage
  }, []);

  if (isLoading) {
    return <div className="m-5 p-4">Loading...</div>;
  }

  if (error) {
    return <div className="m-5 p-4">Error: {error.toString()}</div>;
  }

  console.log("PERCENT OF SCANS PAGE - User team:", userTeam); // Updated log
  console.log("PERCENT OF SCANS PAGE - Team roles:", userTeam?.teamRoles); // Updated log
  console.log("PERCENT OF SCANS PAGE - Is Admin:", userTeam?.isAdmin); // Updated log
  
  const hasAccess = userTeam && (userTeam.isAdmin || hasRole(userTeam.teamRoles, 'SCANS'));
  console.log("PERCENT OF SCANS PAGE - Has Access:", hasAccess); // Updated log

  if (!hasAccess) {
    return (
      <div className="m-5 p-4">
        <div className="bg-red-50 p-4 rounded-md mb-4 border-l-4 border-red-500 text-red-700 shadow-md dark:bg-red-900/20 dark:border-red-700 dark:text-red-200">
          <p className="font-medium">Access Denied: This page is only accessible to teams with SCANS role access.</p>
          <Link href="/teams" className="text-blue-500 hover:text-blue-600 hover:underline mt-2 inline-block dark:text-blue-300 dark:hover:text-blue-200 font-medium">
            Go to Teams Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="m-5 p-4">
      <Header name="% of Scans Department" /> {/* Updated Header */}
      <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-100 dark:bg-dark-secondary dark:border-stroke-dark">
        <div className="bg-emerald-50 p-5 rounded-lg mb-6 border-l-4 border-emerald-500 dark:bg-emerald-900/20 dark:border-emerald-700 shadow-sm">
          <h3 className="font-semibold mb-2 text-green-800 dark:text-green-200">SCANS Access Successful</h3>
          <p className="dark:text-green-300">Team: {userTeam.teamName}</p>
          <div className="mt-2">
            <p className="text-green-600 dark:text-green-300">Roles:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {userTeam.teamRoles?.map(tr => (
                <span key={tr.id} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full dark:bg-green-800 dark:text-green-100 shadow-sm">
                  {tr.role.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Data Generation Form */}
        <div className="mt-4 mb-8 p-4 border rounded-md shadow-sm dark:border-stroke-dark">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white border-b pb-2 border-gray-200 dark:border-stroke-dark">Generate % of Scans Report</h3> {/* Updated Title */}
          
          <Grid container spacing={4}>
            {/* Left column - Form inputs */}
            <Grid item xs={12} md={6}>
              <div className="space-y-4 flex flex-col h-full justify-center">
                {/* Removed Department Page Selector */}

                {/* File Content Type Selector (Updated to choose between detail and summary) */}
                <FormControl fullWidth variant="outlined" className="bg-white dark:bg-dark-tertiary rounded-md shadow-sm border border-gray-200 dark:border-stroke-dark">
                  <InputLabel className="text-gray-700 dark:text-gray-300">File Content Type</InputLabel>
                  <Select
                    value={dataType}
                    onChange={(e) => setDataType(e.target.value as string)}
                    label="File Content Type"
                    className="border-gray-200 dark:border-stroke-dark dark:text-white"
                  >
                    {DATA_TYPES.map((type) => ( // DATA_TYPES now includes detail and summary
                      <MenuItem key={type.value} value={type.value} className="dark:text-gray-200">
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText className="dark:text-gray-300">Detail: Individual scans, Summary: Daily totals, Rolled Up: Averaged across date range</FormHelperText>
                </FormControl>

                {/* Date Preset Dropdown */}
                <FormControl fullWidth variant="outlined" className="bg-white dark:bg-dark-tertiary rounded-md shadow-sm border border-gray-200 dark:border-stroke-dark">
                  <InputLabel className="text-gray-700 dark:text-gray-300">Date Range Preset</InputLabel>
                  <Select
                    value={selectedPreset}
                    onChange={handlePresetChange}
                    label="Date Range Preset"
                    className="border-gray-200 dark:border-stroke-dark dark:text-white"
                  >
                    <MenuItem value="" className="dark:text-gray-200"><em>Custom Range</em></MenuItem>
                    {datePresets.map((preset) => (
                      <MenuItem key={preset} value={preset} className="dark:text-gray-200">
                        {preset}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText className="dark:text-gray-300">Select a preset or choose dates manually</FormHelperText>
                </FormControl>

                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue: Date | null) => {
                      setStartDate(newValue);
                      setSelectedPreset(''); 
                      if (newValue && endDate && endDate < newValue) {
                        setEndDate(newValue);
                      }
                  }}
                  format="MMddyyyy"
                  className="bg-white dark:bg-dark-tertiary w-full rounded-md shadow-sm border border-gray-200 dark:border-stroke-dark"
                  minDate={new Date(new Date().getFullYear(), 0, 13, 12, 0, 0)}
                  maxDate={(() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    yesterday.setHours(23, 59, 59, 999); 

                    if (endDate) {
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
                      className: "bg-white dark:bg-dark-tertiary"
                    }
                  }}
                />
                
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue: Date | null) => {
                      setEndDate(newValue);
                      setSelectedPreset(''); 
                  }}
                  format="MMddyyyy"
                  className="bg-white dark:bg-dark-tertiary w-full rounded-md shadow-sm border border-gray-200 dark:border-stroke-dark"
                  minDate={(() => {
                    const minAllowedDate = new Date(new Date().getFullYear(), 0, 13, 12, 0, 0);
                    
                    if (startDate) {
                      const startOfDayStartDate = new Date(startDate);
                      startOfDayStartDate.setHours(0, 0, 0, 0);
                      return startOfDayStartDate > minAllowedDate ? startOfDayStartDate : minAllowedDate;
                    }
                    
                    return minAllowedDate;
                  })()}
                  maxDate={(() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    yesterday.setHours(23, 59, 59, 999); 
                    return yesterday;
                  })()}
                  slotProps={{
                    textField: {
                      variant: "outlined",
                      fullWidth: true,
                      className: "bg-white dark:bg-dark-tertiary"
                    }
                  }}
                />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Typography className="font-medium text-gray-800 dark:text-white">Selected Locations</Typography>
                    <div className="flex gap-2">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleUndo}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/10 py-1 min-w-0 px-2"
                        disabled={!lastAction}
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
                        className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/10 py-1 min-w-0 px-2"
                        disabled={selectedLocations.length === 0}
                      >
                        <span className="mr-1">Clear All</span>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleAddAllLocations}
                        className="text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/10 py-1 min-w-0 px-2"
                      >
                        <span className="mr-1">Add All</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      </Button>
                    </div>
                  </div>
                  <Box className="p-3 bg-gray-50 border border-gray-200 rounded-md min-h-24 max-h-64 overflow-y-auto dark:bg-dark-tertiary dark:border-stroke-dark shadow-inner">
                    {selectedLocations.length === 0 ? (
                      <Typography className="text-gray-500 dark:text-neutral-400 text-sm italic">
                        Please select a location.
                      </Typography>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedLocations.map((location) => (
                          <Chip
                            key={location.id}
                            label={`${location.name} (${location.id})`}
                            onDelete={() => handleRemoveLocation(location.id)}
                            className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200 border border-blue-100 dark:border-blue-900/30"
                            deleteIcon={<X className="h-4 w-4 text-blue-500 dark:text-blue-300" />}
                          />
                        ))}
                      </div>
                    )}
                  </Box>
                  <Typography className="text-xs text-gray-500 mt-1 dark:text-neutral-500">
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
                        className="bg-white dark:bg-dark-tertiary rounded-md shadow-sm border border-gray-200 dark:border-stroke-dark"
                        InputProps={{
                          className: "dark:text-white"
                        }}
                        InputLabelProps={{
                          className: "dark:text-gray-300"
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
                          className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200 border border-blue-100 dark:border-blue-900/30"
                          deleteIcon={<X className="h-4 w-4 text-blue-500 dark:text-blue-300" />}
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
                    className="bg-blue-500 hover:bg-blue-600 text-white py-3 shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
                  >
                    {csvLoading ? (
                      <div className="flex items-center justify-center">
                        <CircularProgress size={20} className="text-white mr-2" />
                        <span>Processing...</span>
                      </div>
                    ) : "Process Data"}
                  </Button>
                  
                  {processingProgress && (
                    <div className="mt-2 p-2 bg-blue-50 text-blue-700 rounded-md border border-blue-100 text-sm shadow-sm dark:bg-blue-900/10 dark:text-blue-300 dark:border-blue-900/30">
                      {processingProgress}
                    </div>
                  )}
                  
                  {csvError && (
                    <div className="mt-2 p-3 bg-red-50 text-red-700 rounded-md border-l-4 border-red-500 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200">
                      <p className="font-semibold">Error Processing CSV Data:</p>
                      <p className="text-sm overflow-auto max-h-24">{csvError}</p>
                    </div>
                  )}
                </div>
              </div>
            </Grid>
            
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
            reportType={dataType} // This will be 'loyalty_scan_summary'
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>
    </div>
  );
};

export default PercentOfScansPage;