"use client";

import { useGetAuthUserQuery } from "@/state/api";
import { hasRole } from "@/lib/accessControl";
import Header from "@/components/Header";
import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  Button, 
  CircularProgress, 
  Box, 
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  SelectChangeEvent
} from "@mui/material";
import { fetchFiles as fetchS3Files } from "@/lib/csvProcessing";
import JsonView from '@uiw/react-json-view';
import { lightTheme } from '@uiw/react-json-view/light';

const S3_DATA_LAKE = process.env.NEXT_PUBLIC_DATA_LAKE_S3_URL || "https://data-lake-magooos-site.s3.us-east-2.amazonaws.com";
const RAW_DATA_FOLDER = "raw-loyalty-pool/";

const RawDataPage = () => {
  const { data: authData, isLoading, error } = useGetAuthUserQuery({});
  const userTeam = authData?.userDetails?.team;

  // State for file handling
  const [allS3Files, setAllS3Files] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [jsonData, setJsonData] = useState<any>(null);
  const [jsonLoading, setJsonLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string|null>(null);

  // Fetch available JSON files from S3
  const fetchFiles = async () => {
    try {
      console.log("RAW DATA PAGE - Fetching files from:", S3_DATA_LAKE, RAW_DATA_FOLDER);
      const fileList = await fetchS3Files(S3_DATA_LAKE, RAW_DATA_FOLDER);
      const jsonFiles = fileList.filter(file => file.endsWith('.json'));
      console.log("RAW DATA PAGE - JSON files found:", jsonFiles);
      setAllS3Files(jsonFiles);
    } catch (err) {
      console.error("File fetch failed:", err);
      setJsonError("Failed to load data files from S3 bucket");
    }
  };
  
  // Fetch and display the content of the selected JSON file
  const processJsonFile = async () => {
    if (!selectedFile) {
      alert("Please select a file to display.");
      return;
    }

    setJsonLoading(true);
    setJsonError(null);
    setJsonData(null);

    try {
      const fileUrl = `${S3_DATA_LAKE}/${RAW_DATA_FOLDER}${selectedFile}`;
      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const data = await response.json();
      setJsonData(data);

    } catch (error) {
      console.error("Error processing JSON file:", error);
      setJsonError(`Error processing JSON file: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setJsonLoading(false);
    }
  };

  // Handler for file dropdown change
  const handleFileChange = (event: SelectChangeEvent<string>) => {
    const file = event.target.value as string;
    setSelectedFile(file);
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

  const hasAccess = userTeam && (userTeam.isAdmin || hasRole(userTeam.teamRoles, 'RAW_DATA'));

  if (!hasAccess) {
    return (
      <div className="m-5 p-4">
        <div className="bg-red-50 p-4 rounded-md mb-4 border-l-4 border-red-500 text-red-700 shadow-md dark:bg-red-900/20 dark:border-red-700 dark:text-red-200">
          <p className="font-medium">Access Denied: This page is only accessible to teams with RAW_DATA role access.</p>
          <Link href="/teams" className="text-blue-500 hover:text-blue-600 hover:underline mt-2 inline-block dark:text-blue-300 dark:hover:text-blue-200 font-medium">
            Go to Teams Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="m-5 p-4">
      <Header name="Raw Data" />
      <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-100 dark:bg-dark-secondary dark:border-stroke-dark">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white border-b pb-2 border-gray-200 dark:border-stroke-dark">Raw Data Viewer</h2>
        <div className="bg-green-50 p-4 rounded-md mb-4 border-l-4 border-green-500 dark:bg-green-900/20 dark:border-green-700 dark:text-green-100">
          <h3 className="font-semibold mb-2 text-green-800 dark:text-green-200">RAW_DATA Access Granted</h3>
          <p className="dark:text-green-300">Team: {userTeam.teamName}</p>
        </div>

        {/* File Selection Form */}
        <div className="mt-4 mb-8 p-4 border rounded-md shadow-sm dark:border-stroke-dark">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white border-b pb-2 border-gray-200 dark:border-stroke-dark">Select Raw Data File</h3>
          <div className="flex items-center gap-4">
            <FormControl fullWidth variant="outlined" className="bg-white dark:bg-dark-tertiary rounded-md shadow-sm">
              <InputLabel className="text-gray-700 dark:text-gray-300">Data File</InputLabel>
              <Select
                value={selectedFile}
                onChange={handleFileChange}
                label="Data File"
                className="dark:text-white"
                disabled={allS3Files.length === 0}
              >
                {allS3Files.map((file) => (
                  <MenuItem key={file} value={file} className="dark:text-gray-200">
                    {file}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText className="dark:text-gray-300">Select the raw data file to display.</FormHelperText>
            </FormControl>
            <Button
              variant="contained"
              onClick={processJsonFile}
              disabled={jsonLoading || !selectedFile}
              className="bg-blue-500 hover:bg-blue-600 text-white py-3 shadow-md h-14"
            >
              {jsonLoading ? <CircularProgress size={24} color="inherit" /> : "View JSON"}
            </Button>
          </div>
          {jsonError && (
            <div className="mt-2 p-3 bg-red-50 text-red-700 rounded-md border-l-4 border-red-500 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200">
              <p>{jsonError}</p>
            </div>
          )}
        </div>

        {/* JSON Data Viewer */}
        <div className="mt-8 mb-8">
            {jsonLoading && <CircularProgress />}
            {jsonData && (
                <Box sx={{"& .w-rjv-code": {backgroundColor: 'transparent !important'}}}>
                    <JsonView value={jsonData} style={lightTheme} />
                </Box>
            )}
        </div>
      </div>
    </div>
  );
};

export default RawDataPage;