"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useGetAuthUserQuery, useGetUsersQuery, useToggleUserStatusMutation, useGetTeamsQuery } from "@/state/api";
import { useGetLocationsQuery } from "@/state/lambdaApi";
import { hasRole, isPriceAdmin } from "@/lib/accessControl";
import Header from "@/components/Header";
import { fetchFiles, fetchCSV } from "@/lib/csvProcessing";
import { parsePriceChangeCSV, PriceChangeReport, ReportChangeDetail } from "@/lib/reportUtils";
import {
    PriceChangeReport as UtilPriceChangeReport,
    PriceChange as UtilPriceChange
} from "@/lib/priceChangeUtils";

const S3_DATA_LAKE = process.env.NEXT_PUBLIC_DATA_LAKE_S3_URL || "https://data-lake-magooos-site.s3.us-east-2.amazonaws.com";

interface PriceUser {
  id: string;
  username: string;
  email: string;
  groupName: string;
  locationIds: string[];
  isLocked: boolean; // Replaces priceDisabled
  status: 'unlocked' | 'locked';
}

interface SendReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PriceChangeReport | null;
  onSendReport?: (report: PriceChangeReport, email: string, selectedLocations: string[], scheduleType: 'immediate' | 'scheduled', scheduledDate?: string) => void;
}

const SendReportModal: React.FC<SendReportModalProps> = ({ isOpen, onClose, report, onSendReport }) => {
  const [email, setEmail] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledDate, setScheduledDate] = useState('');

  if (!isOpen || !report) return null;

  const handleSendReport = () => {
    if (onSendReport) {
      onSendReport(report, email, selectedLocations, scheduleType, scheduledDate);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Send Report - {report.groupName}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Locations
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {report.locationIds.map(locationId => (
                <label key={locationId} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(locationId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLocations([...selectedLocations, locationId]);
                      } else {
                        setSelectedLocations(selectedLocations.filter(id => id !== locationId));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Location {locationId}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Schedule Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="immediate"
                  checked={scheduleType === 'immediate'}
                  onChange={(e) => setScheduleType(e.target.value as 'immediate')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Send Immediately</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="scheduled"
                  checked={scheduleType === 'scheduled'}
                  onChange={(e) => setScheduleType(e.target.value as 'scheduled')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Schedule for Date and Time</span>
              </label>
            </div>
          </div>

          {scheduleType === 'scheduled' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Scheduled Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendReport}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            Send Report
          </button>
        </div>
      </div>
    </div>
  );
};

const PriceUsersPage = () => {
  const { data: userData, isLoading } = useGetAuthUserQuery({});
  const { data: locationsData, isLoading: locationsIsLoading } = useGetLocationsQuery();
  const { data: allUsers, isLoading: usersLoading, refetch: refetchUsers } = useGetUsersQuery();
  const [toggleUserStatus] = useToggleUserStatusMutation();
  const { data: teamsData, isLoading: teamsLoading } = useGetTeamsQuery();
  const teamRoles = userData?.userDetails?.team?.teamRoles;
  
  // State management
  const [showArchived, setShowArchived] = useState(false);
  const [priceReports, setPriceReports] = useState<PriceChangeReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [sendReportModal, setSendReportModal] = useState<{isOpen: boolean, report: PriceChangeReport | null}>({
    isOpen: false,
    report: null
  });
  const [changesModalData, setChangesModalData] = useState<{
    isOpen: boolean;
    changes: ReportChangeDetail[] | null;
    reportGroupName: string;
  }>({
    isOpen: false,
    changes: null,
    reportGroupName: ''
  });
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });

  // Check if user has PRICE_ADMIN or ADMIN role
  const hasAdminAccess = isPriceAdmin(teamRoles) || hasRole(teamRoles, 'ADMIN');

  // Load price change reports from S3
  useEffect(() => {
    const loadPriceReports = async () => {
      if (!hasAdminAccess) return;
      
      setIsLoadingReports(true);
      try {
        // Fetch files from the active-price-reports directory
        const files = await fetchFiles(S3_DATA_LAKE, 'active-price-reports/');
        console.log('Found price change files:', files);
        
        if (files.length === 0) {
          console.log('No price change reports found in S3');
          setPriceReports([]);
          return;
        }
        
        const reports: PriceChangeReport[] = [];
        
        // Process each CSV file
        for (const fileName of files) {
          try {
            const csvData = await fetchCSV(`${S3_DATA_LAKE}/active-price-reports/${fileName}`);
            const report = await parsePriceChangeCSV(csvData, fileName);
            if (report) {
              reports.push(report);
            }
          } catch (error) {
            console.error(`Error processing file ${fileName}:`, error);
          }
        }
        
        // Sort reports by submitted date (newest first)
        reports.sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());
        
        setPriceReports(reports);
        console.log(`Loaded ${reports.length} price change reports from S3`);
      } catch (error) {
        console.error('Error loading price reports from S3:', error);
        // Fallback to empty array on error
        setPriceReports([]);
      } finally {
        setIsLoadingReports(false);
      }
    };

    loadPriceReports();
  }, [hasAdminAccess]);

  // Filter users with PRICE_USER role and transform to expected format
  const priceUsers = useMemo(() => {
    if (!allUsers || !teamsData?.teams) return [];
    
    const teams = teamsData.teams;

    return allUsers.filter(user => {
      // Find the team the user belongs to
      const userTeam = teams.find(team => team.id === user.teamId);
      if (!userTeam || !userTeam.teamRoles) {
        return false;
      }
      
      // Check if any of the team's roles is 'PRICE_USER'
      return userTeam.teamRoles.some(tr => tr.role.name === 'PRICE_USER');
    });
  }, [allUsers, teamsData]);
  
  const priceUsersList: PriceUser[] = priceUsers.map(user => ({
    id: String(user.userId),
    username: user.username,
    email: user.email || `${user.username}@example.com`, // Fallback email if not provided
    groupName: user.group?.name || 'No Group Assigned',
    locationIds: user.locationIds || [],
      isLocked: user.isLocked || false,
    status: user.isLocked ? 'locked' : 'unlocked'
  }));

  const pendingReports = priceReports.filter(report => report.status === 'pending');
  const sentReports = priceReports.filter(report => report.status === 'sent');
  const archivedReports = priceReports.filter(report => report.status === 'archived');
  const displayReports = showArchived ? archivedReports : [...pendingReports, ...sentReports];

  const handleToggleLock = async (userId: string) => {
    try {
      console.log('Toggling lock status for user:', userId);
      
      const result = await toggleUserStatus({ userId: parseInt(userId) }).unwrap();
      
      console.log('Toggle result:', result);
      
      setStatusModal({
        isOpen: true,
        title: 'Status Updated',
        message: result.message,
      });
      
      // Refetch the price users to update the UI
      refetchUsers();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      
      const errorMessage = error?.data?.message || error?.message || 'Failed to toggle user status';
      setStatusModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
      });
    }
  };

  const handleArchiveReport = (reportId: string) => {
    // TODO: Implement archive report logic
    console.log('Archive report:', reportId);
  };

  const handleClearArchived = () => {
    // TODO: Implement clear all archived reports logic
    console.log('Clear all archived reports');
  };

  const handleClearSingleReport = (reportId: string) => {
    // TODO: Implement clear single archived report logic
    console.log('Clear single archived report:', reportId);
  };

  const handleSendReport = (report: PriceChangeReport) => {
    setSendReportModal({ isOpen: true, report });
  };

  const handleActualSendReport = async (
    report: PriceChangeReport,
    email: string,
    selectedLocations: string[],
    scheduleType: 'immediate' | 'scheduled',
    scheduledDate?: string
  ) => {
    try {
      // Import the utility functions
      const { convertPriceChangesToCSV, uploadPriceChangeReport } = await import('@/lib/priceChangeUtils');
      
      // Get user information from auth data
      const currentUser = userData?.userDetails;
      const userInfo = {
        id: String(currentUser?.userId || 'admin'),
        username: currentUser?.username || 'Admin User'
      };
      
      // Filter changes to only include selected locations if specified
      const filteredChanges = selectedLocations.length > 0
        ? report.changes.filter(change => selectedLocations.includes(change.locationId))
        : report.changes;

      // Transform to UtilPriceChange format with required fields
      const transformedChanges: UtilPriceChange[] = filteredChanges.map(change => ({
        itemName: change.itemName,
        locationId: change.locationId,
        locationName: getLocationNames([change.locationId]),
        oldPrice: change.oldPrice,
        newPrice: change.newPrice,
        timestamp: new Date().toISOString()
      }));

      // Convert to CSV
      const csvContent = convertPriceChangesToCSV(transformedChanges, {
        groupName: report.groupName,
        submittedDate: report.submittedDate,
        reportId: report.id
      });

      // Upload to S3
      const uploadResult = await uploadPriceChangeReport(
        csvContent,
        report.id,
        report.groupName,
        userInfo.id,
        userInfo.username
      );

      if (uploadResult.success) {
        // Update report status to 'sent'
        setPriceReports(prev => prev.map(r =>
          r.id === report.id ? { ...r, status: 'sent' as const } : r
        ));

        alert(`Report sent successfully!\nEmail: ${email}\nLocations: ${selectedLocations.length || 'All'}\nSchedule: ${scheduleType}`);
        
        // Log the action
        console.log('Report sent:', {
          reportId: report.id,
          email,
          selectedLocations,
          scheduleType,
          scheduledDate,
          uploadUrl: uploadResult.url
        });
      } else {
        alert(`Failed to send report: ${uploadResult.error}`);
      }
    } catch (error) {
      console.error('Error sending report:', error);
      alert('An error occurred while sending the report. Please try again.');
    }
  };

  const handleViewReport = (report: PriceChangeReport) => {
    setChangesModalData({
      isOpen: true,
      changes: report.changes,
      reportGroupName: report.groupName || report.franchiseeName
    });
  };

  const closeChangesModal = () => {
    setChangesModalData({ isOpen: false, changes: null, reportGroupName: '' });
  };

  const getLocationNames = (locationIds: string[]) => {
    // Real location mapping from the provided list
    const locationMap: {[key: string]: string} = {
      '4146': 'Altamonte Springs, FL',
      '4149': 'Apopka, FL (Hunt Club)',
      '4244': 'Arden, NC',
      '4885': 'Auburndale, FL',
      '10497': 'Battlefield, MO',
      '4814': 'Beaumont/Wildwood, FL',
      '10093': 'Bellefontaine',
      '6778': 'Boca Raton, FL',
      '5359': 'Brookhaven, MS',
      '4350': 'Brooksville/Spring Hill, FL'
    };
    
    return locationIds.map(id => locationMap[id] || `Location ${id}`).join(', ');
  };

  if (isLoading || usersLoading || teamsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-xl font-semibold text-red-600">Access Denied</div>
        <div className="text-gray-600">
          You need PRICE_ADMIN or ADMIN role access to manage Price Users.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Header name="Price Users Management" />
      
      <div className="mt-6 space-y-6">
        {/* Control Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Price Change Reports
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Review and manage submitted price change reports from franchisees
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/price-users/item-mappings">
                  <button className="px-4 py-2 rounded-lg font-medium transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300">
                      Manage Item Mappings
                  </button>
              </Link>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showArchived
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300'
                }`}
              >
                {showArchived ? 'Show Active Reports' : 'Show Archived'}
              </button>
              
              {showArchived && (
                <button
                  onClick={handleClearArchived}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Clear All Archived
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {showArchived ? 'Archived Reports' : 'Active Reports'} ({displayReports.length})
              </h3>
              {isLoadingReports && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading reports from S3...
                </div>
              )}
            </div>
          </div>
          
          {isLoadingReports ? (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-500 dark:text-gray-400">Loading price change reports...</div>
            </div>
          ) : displayReports.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-500 dark:text-gray-400">
                {showArchived ? 'No archived reports found.' : 'No active price change reports found.'}
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Reports will appear here when franchisees submit price changes.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Group
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Uploaded By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Locations
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Changes
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      View Report
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Send Report
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Archive
                    </th>
                  </tr>
                </thead>
                <tbody className={`bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 ${showArchived ? 'opacity-70' : ''}`}>
                  {displayReports.map(report => (
                  <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {report.franchiseeName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {report.groupName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {report.username || 'Unknown User'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {report.userId || 'unknown'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs">
                        <div className="truncate" title={getLocationNames(report.locationIds)}>
                          {getLocationNames(report.locationIds)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {report.locationIds.length} location{report.locationIds.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(report.submittedDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(report.submittedDate).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleViewReport(report)}
                        className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                        title="View changed items"
                      >
                        {report.totalChanges} items
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        report.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : report.status === 'sent'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleViewReport(report)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleSendReport(report)}
                        className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                        disabled={report.status === 'archived'}
                      >
                        Send Report
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {showArchived ? (
                        <button
                          onClick={() => handleClearSingleReport(report.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                        >
                          Clear
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchiveReport(report.id)}
                          className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                        >
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Price User Lock/Unlock Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Price User Access Control
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Locations
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Lock/Unlock
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {priceUsersList.map((user: PriceUser) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.username}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.groupName} • {user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs">
                        <div className="truncate" title={getLocationNames(user.locationIds)}>
                          {getLocationNames(user.locationIds)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user.locationIds.length} location{user.locationIds.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isLocked
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleLock(user.id)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                          user.status === 'locked'
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {user.status === 'locked' ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Send Report Modal */}
      <SendReportModal
        isOpen={sendReportModal.isOpen}
        onClose={() => setSendReportModal({ isOpen: false, report: null })}
        report={sendReportModal.report}
        onSendReport={handleActualSendReport}
      />

      {/* Report Changes Modal */}
      <ReportChangesModal
        isOpen={changesModalData.isOpen}
        onClose={closeChangesModal}
        changes={changesModalData.changes}
        reportGroupName={changesModalData.reportGroupName}
        locationMap={locationMap}
      />

      {/* Status Modal for Lock/Unlock actions */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {statusModal.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {statusModal.message}
            </p>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStatusModal({ isOpen: false, title: '', message: '' })}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Define locationMap outside the component if it's static, or pass as prop if dynamic
// For this example, it's defined within PriceUsersPage scope, so we'll pass it.
const locationMap: {[key: string]: string} = {
  '4146': 'Altamonte Springs, FL',
  '4149': 'Apopka, FL (Hunt Club)',
  '4244': 'Arden, NC',
  '4885': 'Auburndale, FL',
  '10497': 'Battlefield, MO',
  '4814': 'Beaumont/Wildwood, FL',
  '10093': 'Bellefontaine',
  '6778': 'Boca Raton, FL',
  '5359': 'Brookhaven, MS',
  '4350': 'Brooksville/Spring Hill, FL'
};

interface ReportChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  changes: ReportChangeDetail[] | null;
  reportGroupName: string;
  locationMap: {[key: string]: string};
}

const ReportChangesModal: React.FC<ReportChangesModalProps> = ({
  isOpen,
  onClose,
  changes,
  reportGroupName,
  locationMap
}) => {
  if (!isOpen || !changes) return null;

  const getLocationName = (locationId: string) => {
    return locationMap[locationId] || `ID: ${locationId}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Price Changes: {reportGroupName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        {changes.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No specific item changes found in this report.</p>
        ) : (
          <div className="overflow-y-auto flex-grow">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                <tr>
                  <th scope="col" className="px-4 py-3">Item Name</th>
                  <th scope="col" className="px-4 py-3">Location</th>
                  <th scope="col" className="px-4 py-3 text-right">Old Price</th>
                  <th scope="col" className="px-4 py-3 text-right">New Price</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {changes.map((change, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{change.itemName}</td>
                    <td className="px-4 py-3">{getLocationName(change.locationId)}</td>
                    <td className="px-4 py-3 text-right">${change.oldPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">${change.newPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceUsersPage;