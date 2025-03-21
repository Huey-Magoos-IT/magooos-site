"use client";

import { useGetAuthUserQuery } from "@/state/api";
import Header from "@/components/Header";
import Link from "next/link";
import { hasRole } from "@/lib/accessControl";
import { useEffect, useState } from "react";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { CircularProgress } from "@mui/material";

const S3_DATA_BUCKET = process.env.NEXT_PUBLIC_S3_DATA_BUCKET_URL || "https://huey-site-summary-data.s3.us-east-2.amazonaws.com";
const ITEMS_PER_PAGE = 15;

const DataPage = () => {
  const { data: authData, isLoading, error } = useGetAuthUserQuery({});
  const userTeam = authData?.userDetails?.team;
  const [files, setFiles] = useState<string[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState<string|null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Check if user's team has DATA role access
  console.log("DATA PAGE - User team:", userTeam);
  console.log("DATA PAGE - Team roles:", userTeam?.teamRoles);
  console.log("DATA PAGE - Is Admin:", userTeam?.isAdmin);
  
  const hasAccess = userTeam && (userTeam.isAdmin || hasRole(userTeam.teamRoles, 'DATA'));
  console.log("DATA PAGE - Has Access:", hasAccess);

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
      // Get files and reverse the order so newest files appear first
      const fileList = Array.from(keys)
        .map(key => key.textContent || "")
        .filter(Boolean)
        .reverse(); // Reverse to show newest files first
      
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

  if (!hasAccess) {
    return (
      <div className="m-5 p-4">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 dark:bg-red-900 dark:text-red-100 dark:border-red-700">
          <p>Access Denied: This page is only accessible to teams with DATA role access.</p>
          <Link href="/teams" className="text-blue-500 hover:underline mt-2 inline-block dark:text-blue-300">
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
        <div className="bg-green-50 p-4 rounded mb-4 dark:bg-green-900 dark:text-green-100">
          <h3 className="font-semibold mb-2">DATA Access Successful</h3>
          <p className="dark:text-green-300">Team: {userTeam.teamName}</p>
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
                    {currentFiles.map((file, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 dark:hover:bg-dark-tertiary"
                      >
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
