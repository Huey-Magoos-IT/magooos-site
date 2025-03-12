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
  filterData
} from "@/lib/csvProcessing";
import { 
  DEFAULT_DISCOUNT_IDS, 
  DEFAULT_LOCATION_IDS 
} from "@/lib/legacyLambdaProcessing";

const S3_DATA_BUCKET = process.env.NEXT_PUBLIC_S3_REPORTING_BUCKET_URL || "https://redflag-reporting.s3.us-east-2.amazonaws.com";

// Report types
const REPORT_TYPES = [
  { value: 'redflag-report', label: 'Red Flag Report' },
  { value: 'no-loyalty-discount', label: 'No Loyalty Discount' },
  { value: 'redflag-summary', label: 'Red Flag Summary' }
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

        {/* Data Generation Form */}
        <div className="mt-4 mb-8 p-4 border rounded dark:border-stroke-dark">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Generate Data Report</h3>
          
          <Grid container spacing={4}>
            {/* Left column - Form inputs */}
            <Grid item xs={12} md={6}>
              <div className="space-y-4">
                {/* Report Type Selector */}
                <FormControl fullWidth variant="outlined" className="bg-white dark:bg-dark-tertiary">
                  <InputLabel>Report Type</InputLabel>
                  <Select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as string)}
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

                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  format="MMddyyyy"
                  className="bg-white dark:bg-dark-tertiary w-full"
                  minDate={new Date(2025, 0, 13, 12, 0, 0)} // Jan 13, 2025 at noon
                  // Allow selection up to yesterday
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
                    onClick={processCSVData}
                    disabled={csvLoading || !startDate || !endDate}
                    fullWidth
                    className="bg-blue-500 hover:bg-blue-600 text-white py-3"
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
                    <div className="mt-2 p-2 bg-blue-50 text-blue-700 rounded text-sm">
                      {processingProgress}
                    </div>
                  )}
                  
                  {/* Processing errors */}
                  {csvError && (
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

        {/* Data Table */}
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
      </div>
    </div>
  );
};

export default ReportingPage;