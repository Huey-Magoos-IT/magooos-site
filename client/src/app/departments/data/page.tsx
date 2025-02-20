"use client";

import { useGetAuthUserQuery } from "@/state/api";
import Header from "@/components/Header";
import Link from "next/link";
import { useEffect, useState } from "react";

const S3_DATA_BUCKET = process.env.NEXT_PUBLIC_S3_DATA_BUCKET_URL || "https://huey-site-summary-data.s3.us-east-2.amazonaws.com";

const DataPage = () => {
  const { data: authData, isLoading, error } = useGetAuthUserQuery({});
  const userTeam = authData?.userDetails?.team;
  const [files, setFiles] = useState<string[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState<string|null>(null);

  useEffect(() => {
    setFilesLoading(true);
    fetch(S3_DATA_BUCKET)
      .then(response => response.text())
      .then(str => {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(str, "text/xml");
          
          if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
            throw new Error("Invalid XML response from S3");
          }

          const keys = xmlDoc.getElementsByTagName("Key");
          const fileList = Array.from(keys).map(key => key.textContent || "").filter(Boolean);
          setFiles(fileList);
          setFilesError(null);
        } catch (parseError) {
          console.error("XML parsing failed:", parseError);
          setFilesError("Failed to parse file list");
        }
      })
      .catch(err => {
        console.error("File fetch failed:", err);
        setFilesError("Failed to load data files");
      })
      .finally(() => setFilesLoading(false));
  }, []);

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
      <div className="mt-4 p-4 bg-white rounded shadow">
        <h2 className="text-xl font-bold mb-4">Welcome to Data Department</h2>
        <div className="bg-green-50 p-4 rounded mb-4">
          <h3 className="font-semibold mb-2">Admin Access Granted</h3>
          <p>Team: {userTeam.teamName}</p>
          <p className="text-green-600">Access Level: Admin</p>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Available Data Files</h3>
          {filesLoading && (
            <div className="text-gray-500 text-center py-4">Loading files...</div>
          )}

          {filesError && (
            <div className="text-red-500 text-center py-4">{filesError}</div>
          )}

          {!filesLoading && !filesError && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
                <tbody className="divide-y divide-gray-200">
                  {files.map((file, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {file}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <a
                          href={`${S3_DATA_BUCKET}/${file}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                  {files.length === 0 && (
                    <tr>
                      <td colSpan={2} className="text-center py-4 text-gray-500">
                        No data files available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataPage;
