"use client";

import { useGetAuthUserQuery } from "@/state/api";
import Header from "@/components/Header";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Autocomplete, TextField, Chip } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format } from "date-fns";

const S3_DATA_BUCKET = process.env.NEXT_PUBLIC_S3_DATA_BUCKET_URL || "https://huey-site-summary-data.s3.us-east-2.amazonaws.com";
const ITEMS_PER_PAGE = 15;

// Default values
const DEFAULT_LOCATION_IDS = [
  "1767","1825","4045","4046","4077","4078","4120","4145","4146","4147","4148",
  "4149","4150","4165","4166","4167","4225","4237","4238","4241","4242","4243",
  "4244","4245","4246","4247","4248","4249","4250","4251","4252","4253","4254",
  "4255","4256","4258","4259","4260","4261","4350","4799","4814","4849","4867",
  "4868","4872","4878","4884","4885","4886","4887","5346","5359","5559","5561",
  "5563","5691","5765","5805","5865","6658","6705","6778","6785","6809","7025",
  "7027","9559","9591","9905","9999","10093","10150"
];

const DEFAULT_DISCOUNT_IDS = [77406, 135733, 135736, 135737, 135738, 135739, 135910];

const DataPage = () => {
  const { data: authData, isLoading, error } = useGetAuthUserQuery({});
  const userTeam = authData?.userDetails?.team;
  const [files, setFiles] = useState<string[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState<string|null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Form state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(DEFAULT_LOCATION_IDS);
  const [discountIds, setDiscountIds] = useState<number[]>(DEFAULT_DISCOUNT_IDS);
  const [newDiscountId, setNewDiscountId] = useState("");

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

  const formatDateForApi = (date: Date | null) => {
    return date ? format(date, "MMddyyyy") : "";
  };

  const getFormData = () => ({
    start_date: formatDateForApi(startDate),
    end_date: formatDateForApi(endDate),
    output_bucket: "huey-site-summary-data",
    location_id: selectedLocations.join(","),
    discount_ids: discountIds
  });

  const fetchFiles = async () => {
    setFilesLoading(true);
    try {
      const response = await fetch(S3_DATA_BUCKET);
      const str = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(str, "text/xml");
      
      if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        throw new Error("Invalid XML response from S3");
      }

      const keys = xmlDoc.getElementsByTagName("Key");
      const fileList = Array.from(keys).map(key => key.textContent || "").filter(Boolean);
      setFiles(fileList);
      setFilesError(null);
    } catch (err) {
      console.error("File fetch failed:", err);
      setFilesError("Failed to load data files");
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
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

  if (!userTeam?.isAdmin) {
    return (
      <div className="m-5 p-4">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>Access Denied: This page is only accessible to admin team members.</p>
          <Link href="/teams" className="text-blue-500 hover:underline mt-2 inline-block">
            Go to Teams Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="m-5 p-4">
      <Header name="Data Department" />
      <div className="mt-4 p-4 bg-white rounded shadow dark:bg-dark-secondary">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Welcome to Data Department</h2>
        <div className="bg-green-50 p-4 rounded mb-4 dark:bg-dark-tertiary">
          <h3 className="font-semibold mb-2 dark:text-white">Admin Access Granted</h3>
          <p className="dark:text-neutral-400">Team: {userTeam.teamName}</p>
          <p className="text-green-600 dark:text-green-400">Access Level: Admin</p>
        </div>

        {/* Data Generation Form */}
        <div className="mt-8 mb-8 p-4 border rounded dark:border-stroke-dark">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Generate Data Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              format="MMddyyyy"
              className="bg-white dark:bg-dark-tertiary"
              slotProps={{
                textField: {
                  variant: "outlined",
                  fullWidth: true,
                }
              }}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              format="MMddyyyy"
              className="bg-white dark:bg-dark-tertiary"
              slotProps={{
                textField: {
                  variant: "outlined",
                  fullWidth: true,
                }
              }}
            />

            <div className="md:col-span-2">
              <Autocomplete
                multiple
                options={DEFAULT_LOCATION_IDS}
                value={selectedLocations}
                onChange={(_, newValue) => setSelectedLocations(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Location IDs"
                    variant="outlined"
                    className="bg-white dark:bg-dark-tertiary"
                  />
                )}
              />
            </div>

            <div className="md:col-span-2">
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
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* File List */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold dark:text-white">Available Data Files</h3>
            <button
              onClick={fetchFiles}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              disabled={filesLoading}
            >
              <RefreshCw className={`h-4 w-4 ${filesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {filesLoading && (
            <div className="text-gray-500 text-center py-4 dark:text-neutral-400">Loading files...</div>
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
                    {currentFiles.map((file, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors duration-200 dark:hover:bg-dark-tertiary">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-neutral-300">
                          {file}
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
                    ))}
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
      </div>
    </div>
  );
};

export default DataPage;
