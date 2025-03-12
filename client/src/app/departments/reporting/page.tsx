"use client";

import { useGetAuthUserQuery } from "@/state/api";
import { hasRole } from "@/lib/accessControl";
import { useProcessDataMutation } from "@/state/lambdaApi";
import Header from "@/components/Header";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCw, ChevronLeft, ChevronRight, CheckCircle, X, Download } from "lucide-react";
import { 
  Autocomplete, 
  TextField, 
  Chip, 
  Button, 
  CircularProgress, 
  Grid, 
  Box, 
  Typography,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format } from "date-fns";
import LocationTable, { Location } from "@/components/LocationTable";
import CSVDataTable from "@/components/CSVDataTable";
import {
  fetchFiles as fetchS3Files,
  filterFilesByDateAndType,
  processMultipleCSVs,
  filterData
} from "@/lib/csvProcessing";

const S3_DATA_BUCKET = process.env.NEXT_PUBLIC_S3_REPORTING_BUCKET_URL || "https://redflag-reporting.s3.us-east-2.amazonaws.com";
const ITEMS_PER_PAGE = 15;

// Default values from DynamoDB - all 78 locations
const DEFAULT_LOCATION_IDS = [
  "4145","4849","5561","9905","4167","4249","4885","7025","4255","4878","4045",
  "4872","4166","4868","4887","7027","4245","5563","6785","10533","4258","4046",
  "5765","4148","4886","4243","4814","4884","4261","4120","10477","4147","4260",
  "4242","5805","4350","6809","5559","4252","4146","10448","4165","10534","6705",
  "5691","4238","10497","4867","9559","4256","10150","10093","4250","4150","4259",
  "4253","4225","5359","4254","10476","5346","9591","9999","4078","4251","5865",
  "1825","4799","4077","4247","4241","6658","4244","4248","6778","4237","4149","4246"
];

const DEFAULT_DISCOUNT_IDS = [77406, 135733, 135736, 135737, 135738, 135739, 135910];

// Report types
const REPORT_TYPES = [
  { value: 'redflag-report', label: 'Red Flag Report' },
  { value: 'no-loyalty-discount', label: 'No Loyalty Discount' },
  { value: 'redflag-summary', label: 'Red Flag Summary' }
];

const ReportingPage = () => {
  const { data: authData, isLoading, error } = useGetAuthUserQuery({});
  const userTeam = authData?.userDetails?.team;

  // Original Lambda approach state
  const [files, setFiles] = useState<string[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState<string|null>(null);
  const [lambdaError, setLambdaError] = useState<string|null>(null);
  const [reportStatus, setReportStatus] = useState<string|null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [newFilePattern, setNewFilePattern] = useState<string|null>(null);
  const [highlightedFile, setHighlightedFile] = useState<string|null>(null);
  
  // Initialize the Lambda function mutation hook
  const [processData, { isLoading: isProcessing }] = useProcessDataMutation();

  // Form state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [discountIds, setDiscountIds] = useState<number[]>(DEFAULT_DISCOUNT_IDS);
  const [newDiscountId, setNewDiscountId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // New client-side processing state
  const [useClientProcessing, setUseClientProcessing] = useState(false);
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

  const formatDateForApi = (date: Date | null) => {
    return date ? format(date, "MMddyyyy") : "";
  };

  // Original Lambda approach
  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    setIsGenerating(true);
    setLambdaError(null);
    setReportStatus(null);
    
    // If no locations are selected, use all default locations
    const locationIds = selectedLocations.length > 0
      ? selectedLocations.map(loc => loc.id).join(",")
      : DEFAULT_LOCATION_IDS.join(",");
    
    const formData = {
      start_date: formatDateForApi(startDate),
      end_date: formatDateForApi(endDate),
      output_bucket: "redflag-reporting",
      location_id: locationIds,
      discount_ids: discountIds
    };

    console.log("Generating report with data:", formData);
    
    try {
      // Add timing for diagnostic purposes
      const startTime = performance.now();
      
      // Call the Lambda function via API Gateway
      const result = await processData(formData).unwrap();
      
      // Calculate request duration for diagnostic purposes
      const duration = Math.round(performance.now() - startTime);
      console.log(`Lambda function result (took ${duration}ms):`, result);
      
      // Set success message
      setReportStatus("Report generation initiated successfully! Check the file list below for your report once it's ready.");
      
      // Create a pattern to identify the new file based on the date range
      const filePattern = `${formatDateForApi(startDate)}${formatDateForApi(endDate)}`;
      setNewFilePattern(filePattern);
      setHighlightedFile(null);
      
      // Refresh the file list after a short delay to show the new file
      setTimeout(() => {
        fetchFiles();
      }, 5000); // Wait 5 seconds before refreshing
    } catch (error: any) {
      console.error("Error calling Lambda function:", error);
      
      // Improved error handling with special case for timeout errors
      if (error?.status === 504 || (error?.toString && error.toString().includes("timeout"))) {
        setLambdaError("Gateway Timeout (504): The report generation request took too long to complete and timed out.");
        setReportStatus(`Error: Request timed out. The report may involve too much data. Try the suggestions below.`);
      } else if (error?.data?.message) {
        // Use the formatted error message from our API
        setLambdaError(error.data.message);
        setReportStatus(`Error: Failed to process data. See details below.`);
      } else {
        // Fallback for general errors
        setLambdaError(typeof error === 'object' && error !== null ? error.toString() : String(error));
        setReportStatus(`Error: Failed to process data. Please check the console for details.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Original S3 files listing approach
  const fetchFiles = async () => {
    setFilesLoading(true);
    try {
      // Use the renamed fetchS3Files utility from csvProcessing
      const fileList = await fetchS3Files(S3_DATA_BUCKET);
      
      // If we have a pattern to look for, find any files that match it
      if (newFilePattern) {
        const potentialNewFile = fileList.find((file: string) => file.includes(newFilePattern || ''));
        
        if (potentialNewFile && potentialNewFile !== highlightedFile) {
          // Found a potential new file
          setHighlightedFile(potentialNewFile);
          
          // Find which page the new file is on
          const fileIndex = fileList.indexOf(potentialNewFile);
          const filePage = Math.floor(fileIndex / ITEMS_PER_PAGE) + 1;
          
          // Set current page to show the new file
          setCurrentPage(filePage);
          
          // Scroll to the file after a short delay
          setTimeout(() => {
            const fileRow = document.getElementById(`file-row-${potentialNewFile}`);
            if (fileRow) {
              fileRow.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 500);
        }
      }
      
      setFiles(fileList);
      setAllS3Files(fileList); // Also store for client-side processing
      setFilesError(null);
    } catch (err) {
      console.error("File fetch failed:", err);
      setFilesError("Failed to load data files");
    } finally {
      setFilesLoading(false);
    }
  };
// Client-side CSV data processing approach
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

    setCSVData(filteredData);
    setProcessingProgress("");
      setProcessingProgress("");
    } catch (error) {
      console.error("Error processing CSV files:", error);
      setCSVError(`Error processing CSV files: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCSVLoading(false);
    }
  };

  useEffect(() => {
    // Set default start date to January 13th, 2025
    setStartDate(new Date(2025, 0, 13, 12, 0, 0));
    
    // Set default end date to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setEndDate(yesterday);
    
    // Fetch available files
    fetchFiles();
  }, []);

  const totalPages = Math.ceil(files.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentFiles = files.slice(startIndex, endIndex);

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
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 dark:bg-red-900 dark:text-red-100 dark:border-red-700">
          <p>Access Denied: This page is only accessible to teams with REPORTING role access.</p>
          <Link href="/teams" className="text-blue-500 hover:underline mt-2 inline-block dark:text-blue-300">
            Go to Teams Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="m-5 p-4">
      <Header name="Reporting Department" />
      <div className="mt-4 p-4 bg-white rounded shadow dark:bg-dark-secondary">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Welcome to Reporting Department</h2>
        <div className="bg-green-50 p-4 rounded mb-4 dark:bg-dark-tertiary">
          <h3 className="font-semibold mb-2 dark:text-white">REPORTING Access Granted</h3>
          <p className="dark:text-neutral-400">Team: {userTeam.teamName}</p>
          <div className="mt-2">
            <p className="text-green-600 dark:text-green-300">Roles:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {userTeam.teamRoles?.map(tr => (
                <span key={tr.id} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full dark:bg-green-800 dark:text-green-100">
                  {tr.role.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Processing mode toggle */}
        <div className="my-4 px-1">
          <FormControlLabel
            control={
              <Switch
                checked={useClientProcessing}
                onChange={(e) => setUseClientProcessing(e.target.checked)}
                color="primary"
              />
            }
            label={
              <div>
                <span className="font-medium">
                  {useClientProcessing ? "Client-side Processing (New)" : "Lambda Processing (Legacy)"}
                </span>
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  {useClientProcessing 
                    ? "Process data in browser (faster for small reports)" 
                    : "Process data on server (for large reports)"}
                </span>
              </div>
            }
          />
        </div>

        {/* Data Generation Form */}
        <div className="mt-4 mb-8 p-4 border rounded dark:border-stroke-dark">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Generate Data Report</h3>
          
          <Grid container spacing={4}>
            {/* Left column - Form inputs */}
            <Grid item xs={12} md={6}>
              <div className="space-y-4">
                {/* Report Type Selector - only shown in client-side mode */}
                {useClientProcessing && (
                  <FormControl fullWidth variant="outlined" className="bg-white dark:bg-dark-tertiary">
                    <InputLabel>Report Type</InputLabel>
                    <Select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      label="Report Type"
                    >
                      {REPORT_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>Select the type of report to generate</FormHelperText>
                  </FormControl>
                )}

                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  format="MMddyyyy"
                  className="bg-white dark:bg-dark-tertiary w-full"
                  minDate={new Date(2025, 0, 13, 12, 0, 0)} // Jan 13, 2025 at noon
                  maxDate={new Date(2025, 1, 28, 23, 59, 59)} // Feb 28, 2025 end of day
                  slotProps={{
                    textField: {
                      variant: "outlined",
                      fullWidth: true,
                      className: "bg-white dark:bg-dark-tertiary",
                      helperText: "Range: Jan 13, 2025 - Feb 28, 2025"
                    }
                  }}
                />
                
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  format="MMddyyyy"
                  className="bg-white dark:bg-dark-tertiary w-full"
                  minDate={new Date(2025, 0, 13, 12, 0, 0)} // Jan 13, 2025 at noon
                  // Calculate yesterday by creating a new date and setting it to yesterday
                  maxDate={(() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    return yesterday;
                  })()} // Yesterday's date for both processing methods
                  slotProps={{
                    textField: {
                      variant: "outlined",
                      fullWidth: true,
                      className: "bg-white dark:bg-dark-tertiary",
                      helperText: "Range: Jan 13, 2025 - Yesterday"
                    }
                  }}
                />

                <div>
                  <Typography className="font-medium mb-2 dark:text-white">Selected Locations</Typography>
                  <Box className="p-3 bg-gray-50 border rounded min-h-24 max-h-64 overflow-y-auto dark:bg-dark-tertiary dark:border-stroke-dark">
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
                            onDelete={() => handleRemoveLocation(location.id)}
                            className="bg-blue-50 dark:bg-blue-900/30 dark:text-blue-200"
                            deleteIcon={<X className="h-4 w-4" />}
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
                  <div className="mb-2">
                    <TextField
                      label="Add Discount ID"
                      value={newDiscountId}
                      onChange={(e) => setNewDiscountId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddDiscountId()}
                      variant="outlined"
                      className="bg-white dark:bg-dark-tertiary"
                      fullWidth
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {discountIds.map((id) => (
                      <Chip
                        key={id}
                        label={id}
                        onDelete={() => handleRemoveDiscountId(id)}
                        className="bg-blue-100 dark:bg-dark-tertiary"
                        deleteIcon={<X className="h-4 w-4" />}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    variant="contained"
                    onClick={useClientProcessing ? processCSVData : handleGenerateReport}
                    disabled={(useClientProcessing ? csvLoading : isGenerating) || !startDate || !endDate}
                    fullWidth
                    className="bg-blue-500 hover:bg-blue-600 text-white py-3"
                  >
                    {(useClientProcessing ? csvLoading : isGenerating) ? (
                      <div className="flex items-center justify-center">
                        <CircularProgress size={20} className="text-white mr-2" />
                        <span>{useClientProcessing ? "Processing..." : "Generating..."}</span>
                      </div>
                    ) : useClientProcessing ? "Process Data" : "Generate Report"}
                  </Button>
                  
                  {/* Progress message for client-side processing */}
                  {useClientProcessing && processingProgress && (
                    <div className="mt-2 p-2 bg-blue-50 text-blue-700 rounded text-sm">
                      {processingProgress}
                    </div>
                  )}
                  
                  {/* Status message for Lambda approach */}
                  {!useClientProcessing && reportStatus && (
                    <div className={`mt-4 p-3 rounded flex items-start ${reportStatus.includes("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {!reportStatus.includes("Error") && <CheckCircle className="h-5 w-5 mr-2 mt-0.5" />}
                      <div>
                        {reportStatus}
                        {!reportStatus.includes("Error") && (
                          <p className="text-sm mt-1">The file will appear in the list below once processing is complete.</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Lambda error details */}
                  {!useClientProcessing && lambdaError && (
                    <div className="mt-2 p-3 bg-red-100 text-red-700 rounded">
                      <p className="font-semibold">Error Details:</p>
                      <p className="text-sm overflow-auto max-h-24">{lambdaError}</p>
                      
                      {/* Add recommendations for Gateway Timeout errors */}
                      {lambdaError.includes("Gateway Timeout") || lambdaError.includes("timeout") && (
                        <div className="mt-3 p-2 bg-blue-50 text-blue-700 rounded text-sm">
                          <p className="font-semibold">API Gateway Timeout Limit:</p>
                          <p className="mb-2">The API Gateway has a hard limit of 29 seconds for request processing. Reports with all locations or large date ranges cannot complete within this constraint.</p>
                          <p className="font-semibold mt-2">Recommendations:</p>
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Reduce the number of selected locations (try 5-10 instead of all 78)</li>
                            <li>Select a smaller date range (1-3 days instead of weeks)</li>
                            <li>Break your request into multiple smaller reports (e.g., generate one day at a time)</li>
                            <li>Switch to client-side processing mode for immediate data viewing</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Client-side processing errors */}
                  {useClientProcessing && csvError && (
                    <div className="mt-2 p-3 bg-red-100 text-red-700 rounded">
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

        {/* Client-side data table (only shown when in client-side mode and has data) */}
        {useClientProcessing && (
          <div className="mt-8 mb-8">
            <CSVDataTable
              data={csvData}
              isLoading={csvLoading}
              error={csvError}
              selectedLocationIds={selectedLocationIds}
              selectedDiscountIds={discountIds}
              reportType={reportType}
            />
          </div>
        )}
        
        {/* File List (only shown in Lambda mode) */}
        {!useClientProcessing && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold dark:text-white">Available Data Files</h3>
              <button
                onClick={fetchFiles}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled={filesLoading}
              >
                <RefreshCw className={`h-4 w-4 ${filesLoading ? 'animate-spin' : ''}`} />
                Refresh Files
              </button>
            </div>

            {filesLoading && (
              <div className="text-gray-500 text-center py-4 dark:text-neutral-400">
                <div className="flex justify-center items-center">
                  <CircularProgress size={24} className="mr-2" />
                  <span>Loading files...</span>
                </div>
              </div>
            )}

            {filesError && (
              <div className="text-red-500 text-center py-4">{filesError}</div>
            )}

            {!filesLoading && !filesError && (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border rounded-lg dark:bg-dark-secondary">
                    <thead className="bg-gray-50 dark:bg-dark-tertiary">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-neutral-400">
                          File Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-neutral-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-stroke-dark">
                      {currentFiles.map((file, index) => {
                        const isHighlighted = file === highlightedFile;
                        return (
                          <tr
                            id={`file-row-${file}`}
                            key={index}
                            className={`transition-colors duration-300 ${
                              isHighlighted
                                ? "bg-yellow-100 dark:bg-yellow-900/30"
                                : "hover:bg-gray-50 dark:hover:bg-dark-tertiary"
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-neutral-300">
                              {file}
                              {isHighlighted && (
                                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full dark:bg-green-900 dark:text-green-300">
                                  New
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <a
                                href={`${S3_DATA_BUCKET}/${file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                Download
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                      {currentFiles.length === 0 && (
                        <tr>
                          <td colSpan={2} className="text-center py-4 text-gray-500 dark:text-neutral-400">
                            No data files available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-sm text-gray-700 dark:text-neutral-400">
                      Showing {startIndex + 1} to {Math.min(endIndex, files.length)} of {files.length} files
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-stroke-dark dark:hover:bg-dark-tertiary"
                      >
                        <ChevronLeft className="h-5 w-5 dark:text-neutral-400" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-stroke-dark dark:hover:bg-dark-tertiary"
                      >
                        <ChevronRight className="h-5 w-5 dark:text-neutral-400" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportingPage;