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
import { toast } from "react-hot-toast";
import JsonView from '@uiw/react-json-view';
import { lightTheme } from '@uiw/react-json-view/light';

const S3_DATA_LAKE = process.env.NEXT_PUBLIC_DATA_LAKE_S3_URL || "https://data-lake-magooos-site.s3.us-east-2.amazonaws.com";
const RAW_LOYALTY_FOLDER = "raw-loyalty-pool/";

const RawLoyaltyPage = () => {
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
      console.log("RAW LOYALTY PAGE - Fetching files from:", S3_DATA_LAKE, RAW_LOYALTY_FOLDER);
      const fileList = await fetchS3Files(S3_DATA_LAKE, RAW_LOYALTY_FOLDER);
      const jsonFiles = fileList.filter(file => file.endsWith('.json'));
      console.log("RAW LOYALTY PAGE - JSON files found:", jsonFiles);
      setAllS3Files(jsonFiles);
    } catch (err) {
      console.error("File fetch failed:", err);
      setJsonError("Failed to load data files from S3 bucket");
    }
  };
  
  // Fetch and display the content of the selected JSON file
  const processJsonFile = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to display.");
      return;
    }

    setJsonLoading(true);
    setJsonError(null);
    setJsonData(null);

    try {
      const fileUrl = `${S3_DATA_LAKE}/${RAW_LOYALTY_FOLDER}${selectedFile}`;
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
    return <div className="m-5 p-4 text-[var(--theme-text)]">Loading...</div>;
  }

  if (error) {
    return <div className="m-5 p-4 text-[var(--theme-error)]">Error: {error.toString()}</div>;
  }

  const hasAccess = userTeam && (userTeam.isAdmin || hasRole(userTeam.teamRoles, 'RAW_LOYALTY_REPORTING'));

  if (!hasAccess) {
    return (
      <div className="m-5 p-4">
        <div className="bg-[var(--theme-error)]/10 p-4 rounded-md mb-4 border-l-4 border-[var(--theme-error)] text-[var(--theme-error)] shadow-md">
          <p className="font-medium">Access Denied: This page is only accessible to teams with RAW_LOYALTY_REPORTING role access.</p>
          <Link href="/teams" className="text-[var(--theme-primary)] hover:opacity-80 hover:underline mt-2 inline-block font-medium">
            Go to Teams Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="m-5 p-4">
      <Header name="Raw Rewards Data" />
      <div className="mt-4 p-4 bg-[var(--theme-surface)] rounded-lg shadow-md border border-[var(--theme-border)]">
        <h2 className="text-xl font-bold mb-4 text-[var(--theme-text)] border-b pb-2 border-[var(--theme-border)]">Raw Rewards Data Viewer</h2>
        <div className="bg-[var(--theme-success)]/10 p-4 rounded-md mb-4 border-l-4 border-[var(--theme-success)]">
          <h3 className="font-semibold mb-2 text-[var(--theme-success)]">RAW_LOYALTY_REPORTING Access Granted</h3>
          <p className="text-[var(--theme-text-secondary)]">Team: {userTeam.teamName}</p>
        </div>

        {/* File Selection Form */}
        <div className="mt-4 mb-8 p-4 border border-[var(--theme-border)] rounded-md shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-[var(--theme-text)] border-b pb-2 border-[var(--theme-border)]">Select Raw Data File</h3>
          <div className="flex items-center gap-4">
            <FormControl fullWidth variant="outlined" className="bg-[var(--theme-surface-hover)] rounded-md shadow-sm">
              <InputLabel className="text-[var(--theme-text-secondary)]">Data File</InputLabel>
              <Select
                value={selectedFile}
                onChange={handleFileChange}
                label="Data File"
                className="text-[var(--theme-text)]"
                disabled={allS3Files.length === 0}
              >
                {allS3Files.map((file) => (
                  <MenuItem key={file} value={file}>
                    {file}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText className="text-[var(--theme-text-muted)]">Select the raw data file to display.</FormHelperText>
            </FormControl>
            <Button
              variant="contained"
              onClick={processJsonFile}
              disabled={jsonLoading || !selectedFile}
              sx={{
                background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))',
                color: 'var(--theme-text-on-primary)',
                py: 1.5,
                height: 56,
                '&:disabled': {
                  background: 'var(--theme-surface-active)',
                  color: 'var(--theme-text-muted)'
                }
              }}
            >
              {jsonLoading ? <CircularProgress size={24} sx={{ color: 'var(--theme-text-on-primary)' }} /> : "View JSON"}
            </Button>
          </div>
          {jsonError && (
            <div className="mt-2 p-3 bg-[var(--theme-error)]/10 text-[var(--theme-error)] rounded-md border-l-4 border-[var(--theme-error)]">
              <p>{jsonError}</p>
            </div>
          )}
        </div>

        {/* JSON Data Viewer */}
        <div className="mt-8 mb-8">
            {jsonLoading && <CircularProgress sx={{ color: 'var(--theme-primary)' }} />}
            {jsonData && (
                <Box sx={{
                  "& .w-rjv-code": {
                    backgroundColor: 'transparent !important'
                  }
                }}>
                    <JsonView value={jsonData} style={lightTheme} />
                </Box>
            )}
        </div>
      </div>
    </div>
  );
};

export default RawLoyaltyPage;