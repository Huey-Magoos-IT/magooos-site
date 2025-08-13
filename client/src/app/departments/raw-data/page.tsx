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
  Typography
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import LocationTable, { Location } from "@/components/LocationTable";
import { fetchFiles as fetchS3Files } from "@/lib/csvProcessing";
import { format } from 'date-fns';

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
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);

  // Processing State
  const [allS3Files, setAllS3Files] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState("");

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
    setSelectedLocations(prev => [...prev, location]);
  };

  const handleRemoveLocation = (locationId: string) => {
    setSelectedLocations(prev => prev.filter(loc => loc.id !== locationId));
  };
  
  const handleClearAll = () => {
      setSelectedLocations([]);
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate || selectedLocations.length === 0) {
      alert("Please select a start date, end date, and at least one location.");
      return;
    }

    setLoading(true);
    setProcessingError(null);
    setProcessingProgress("Starting report generation...");

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

      // 2. Process files one-by-one
      let finalData: any[] = [];
      for (let i = 0; i < matchingFiles.length; i++) {
        const filename = matchingFiles[i];
        setProcessingProgress(`Processing file ${i + 1} of ${matchingFiles.length}: ${filename}`);
        
        const fileUrl = `${S3_DATA_LAKE}/${RAW_DATA_FOLDER}${filename}`;
        const response = await fetch(fileUrl);
        if (!response.ok) {
          console.error(`Failed to fetch ${filename}. Skipping.`);
          continue; // Skip to next file
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

      // 4. Trigger download
      if (finalData.length === 0) {
        setProcessingError("No records found for the selected locations in the given date range.");
      } else {
        const startDateStr = format(startDate, "MM-dd-yyyy");
        const endDateStr = format(endDate, "MM-dd-yyyy");
        downloadJson(finalData, `raw_data_report_${startDateStr}_to_${endDateStr}.json`);
      }

    } catch (err) {
      console.error("An error occurred during report generation:", err);
      setProcessingError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
      setProcessingProgress("");
    }
  };


  if (isLoading) return <div className="m-5 p-4">Loading...</div>;
  if (error) return <div className="m-5 p-4">Error: {error.toString()}</div>;

  const hasAccess = userTeam && (userTeam.isAdmin || hasRole(userTeam.teamRoles, 'RAW_DATA'));
  if (!hasAccess) {
    return (
      <div className="m-5 p-4">
        <div className="bg-red-50 p-4 rounded-md mb-4 border-l-4 border-red-500 text-red-700 shadow-md dark:bg-red-900/20 dark:border-red-700 dark:text-red-200">
          <p className="font-medium">Access Denied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="m-5 p-4">
      <Header name="Raw Data Report" />
      <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-100 dark:bg-dark-secondary dark:border-stroke-dark">
        <h2 className="text-xl font-bold mb-4">Generate Raw Data Report</h2>

        <div className="mt-4 mb-8 p-4 border rounded-md shadow-sm">
          <Grid container spacing={4}>
            {/* Left column - Form inputs */}
            <Grid item xs={12} md={6}>
              <div className="space-y-4">
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={setStartDate}
                  format="MM/dd/yyyy"
                />
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={setEndDate}
                  format="MM/dd/yyyy"
                />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Typography className="font-medium">Selected Locations</Typography>
                    <Button size="small" variant="outlined" onClick={handleClearAll} disabled={selectedLocations.length === 0}>
                      Clear All
                    </Button>
                  </div>
                  <Box className="p-3 bg-gray-50 border rounded-md min-h-24 max-h-64 overflow-y-auto">
                    {selectedLocations.length === 0 ? (
                      <Typography className="text-gray-500 italic">Select locations from the table.</Typography>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedLocations.map((location) => (
                          <Chip
                            key={location.id}
                            label={location.name}
                            onDelete={() => handleRemoveLocation(location.id)}
                            deleteIcon={<X className="h-4 w-4" />}
                          />
                        ))}
                      </div>
                    )}
                  </Box>
                </div>

                <Button
                  variant="contained"
                  onClick={handleGenerateReport}
                  disabled={loading || !startDate || !endDate || selectedLocations.length === 0}
                  fullWidth
                  className="py-3"
                >
                  {loading ? <CircularProgress size={24} /> : "Generate and Download Report"}
                </Button>

                {processingProgress && (
                  <div className="p-2 bg-blue-50 text-blue-700 rounded-md">
                    {processingProgress}
                  </div>
                )}
                {processingError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-md">
                    {processingError}
                  </div>
                )}
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