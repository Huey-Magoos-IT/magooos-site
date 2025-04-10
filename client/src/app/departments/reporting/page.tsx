"use client";

import { useGetAuthUserQuery } from "@/state/api";
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
  FormHelperText
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
  enhanceCSVWithEmployeeNames
} from "@/lib/csvProcessing";
import { 
  DEFAULT_DISCOUNT_IDS, 
  DEFAULT_LOCATION_IDS 
} from "@/lib/legacyLambdaProcessing";

const S3_DATA_BUCKET = process.env.NEXT_PUBLIC_S3_REPORTING_BUCKET_URL || "https://redflag-reporting.s3.us-east-2.amazonaws.com";

// Report types
const REPORT_TYPES = [
  { value: 'redflag-report', label: 'Red Flag Report' },
  { value: 'no-loyalty-discount', label: 'No Loyalty Discount' }
  // { value: 'redflag-summary', label: 'Red Flag Summary' } // Hidden per requirements
];

const ReportingPage = () => {
  const { data: authData, isLoading, error } = useGetAuthUserQuery({});
  const userTeam = authData?.userDetails?.team;

  // Form state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [discountIds, setDiscountIds] = useState<number[]>(DEFAULT_DISCOUNT_IDS);
  const [newDiscountId, setNewDiscountId] = useState("");
  
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
    setSelectedLocations(prev => [...prev, location]);
  };

  const handleRemoveLocation = (locationId: string) => {
    setSelectedLocations(prev => prev.filter(loc => loc.id !== locationId));
  };

  // Fetch S3 files for client-side processing
  const fetchFiles = async () => {
    try {
      // Use the fetchS3Files utility from csvProcessing
      const fileList = await fetchS3Files(S3_DATA_BUCKET);
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
      const fileUrls = matchingFiles.map(filename => `${S3_DATA_BUCKET}/${filename}`);

      // Process all files (fetch and parse)
      const combinedData = await processMultipleCSVs(fileUrls);
      
      // Apply filters if selected
      let filteredData = combinedData;
      if (selectedLocationIds.length > 0 || discountIds.length > 0) {
        setProcessingProgress("Applying filters...");
        // Pass the full locations array for mapping IDs to names
        filteredData = filterData(combinedData, selectedLocationIds, discountIds, selectedLocations);
      }
      
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
      filteredData = enhanceCSVWithEmployeeNames(filteredData, employeeData);

      setCSVData(filteredData);
      setProcessingProgress("");
    } catch (error) {
      console.error("Error processing CSV files:", error);
      setCSVError(`Error processing CSV files: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCSVLoading(false);
    }
  };

  useEffect(() => {
    // Fetch available files on component mount
    fetchFiles();
  }, []);

  if (isLoading) {
    return <div className="m-5 p-4">Loading...</div>;
  }

  if (error) {
    return <div className="m-5 p-4">Error: {error.toString()}</div>;
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
        <div className="bg-red-50 p-4 rounded-md mb-4 border-l-4 border-red-500 text-red-700 shadow-md dark:bg-red-900/20 dark:border-red-700 dark:text-red-200">
          <p className="font-medium">Access Denied: This page is only accessible to teams with REPORTING role access.</p>
          <Link href="/teams" className="text-blue-500 hover:text-blue-600 hover:underline mt-2 inline-block dark:text-blue-300 dark:hover:text-blue-200 font-medium">
            Go to Teams Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="m-5 p-4">
      <Header name="Reporting Department" />
      <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-100 dark:bg-dark-secondary dark:border-stroke-dark">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white border-b pb-2 border-gray-200 dark:border-stroke-dark">Welcome to Reporting Department</h2>
        <div className="bg-green-50 p-4 rounded-md mb-4 border-l-4 border-green-500 dark:bg-green-900/20 dark:border-green-700 dark:text-green-100">
          <h3 className="font-semibold mb-2 text-green-800 dark:text-green-200">REPORTING Access Granted</h3>
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
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white border-b pb-2 border-gray-200 dark:border-stroke-dark">Generate Data Report</h3>
          
          <Grid container spacing={4}>
            {/* Left column - Form inputs */}
            <Grid item xs={12} md={6}>
              <div className="space-y-4">
                {/* Report Type Selector */}
                <FormControl fullWidth variant="outlined" className="bg-white dark:bg-dark-tertiary rounded-md shadow-sm border border-gray-200 dark:border-stroke-dark">
                  <InputLabel className="text-gray-700 dark:text-gray-300">Report Type</InputLabel>
                  <Select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as string)}
                    label="Report Type"
                    className="border-gray-200 dark:border-stroke-dark dark:text-white"
                  >
                    {REPORT_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value} className="dark:text-gray-200">
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText className="dark:text-gray-300">Select the type of report to generate</FormHelperText>
                </FormControl>

                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  format="MMddyyyy"
                  className="bg-white dark:bg-dark-tertiary w-full rounded-md shadow-sm border border-gray-200 dark:border-stroke-dark"
                  minDate={new Date(2025, 0, 13, 12, 0, 0)} // Jan 13, 2025 at noon
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
                      className: "bg-white dark:bg-dark-tertiary"
                    }
                  }}
                />
                
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  format="MMddyyyy"
                  className="bg-white dark:bg-dark-tertiary w-full rounded-md shadow-sm border border-gray-200 dark:border-stroke-dark"
                  // Min date is either Jan 13, 2025 or the start date (if set), whichever is later
                  minDate={(() => {
                    const minAllowedDate = new Date(2025, 0, 13, 12, 0, 0); // Jan 13, 2025 at noon
                    
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
                      className: "bg-white dark:bg-dark-tertiary"
                    }
                  }}
                />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Typography className="font-medium text-gray-800 dark:text-white">Selected Locations</Typography>
                    {selectedLocations.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            // Remove the last added location (undo functionality)
                            setSelectedLocations(prev => prev.slice(0, -1));
                          }}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/10 py-1 min-w-0 px-2"
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
                          onClick={() => {
                            // Clear all selected locations
                            setSelectedLocations([]);
                          }}
                          className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/10 py-1 min-w-0 px-2"
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
                      </div>
                    )}
                  </div>
                  <Box className="p-3 bg-gray-50 border border-gray-200 rounded-md min-h-24 max-h-64 overflow-y-auto dark:bg-dark-tertiary dark:border-stroke-dark shadow-inner">
                    {selectedLocations.length === 0 ? (
                      <Typography className="text-gray-500 dark:text-neutral-400 text-sm italic">
                        Leave blank for all locations. Or select specific locations from the table.
                      </Typography>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedLocations.map((location) => (
                          <Chip
                            key={location.id}
                            label={`${location.name} (${location.id})`}
                            onClick={() => handleRemoveLocation(location.id)}
                            onDelete={() => handleRemoveLocation(location.id)}
                            className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200 border border-blue-100 dark:border-blue-900/30 cursor-pointer"
                            deleteIcon={<X className="h-4 w-4 text-blue-500 dark:text-blue-300" />}
                          />
                        ))}
                      </div>
                    )}
                  </Box>
                  <Typography className="text-xs text-gray-500 mt-1 dark:text-neutral-500">
                    {selectedLocations.length > 0
                      ? `${selectedLocations.length} location${selectedLocations.length !== 1 ? 's' : ''} selected`
                      : "All locations will be used"}
                  </Typography>
                </div>

                <div>
                  {(userTeam?.isAdmin || hasRole(userTeam.teamRoles, 'ADMIN')) ? (
                    <>
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
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {discountIds.map((id) => (
                        <Chip
                          key={id}
                          label={id}
                          className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200 border border-blue-100 dark:border-blue-900/30"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <Button
                    variant="contained"
                    onClick={processCSVData}
                    disabled={csvLoading || !startDate || !endDate}
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
                  
                  {/* Progress message for processing */}
                  {processingProgress && (
                    <div className="mt-2 p-2 bg-blue-50 text-blue-700 rounded-md border border-blue-100 text-sm shadow-sm dark:bg-blue-900/10 dark:text-blue-300 dark:border-blue-900/30">
                      {processingProgress}
                    </div>
                  )}
                  
                  {/* Processing errors */}
                  {csvError && (
                    <div className="mt-2 p-3 bg-red-50 text-red-700 rounded-md border-l-4 border-red-500 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200">
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