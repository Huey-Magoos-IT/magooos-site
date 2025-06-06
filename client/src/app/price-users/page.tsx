"use client";

import React, { useState } from "react";
import { useGetAuthUserQuery } from "@/state/api";
import { hasRole } from "@/lib/accessControl";
import Header from "@/components/Header";

interface PriceChangeReport {
  id: string;
  franchiseeId: string;
  franchiseeName: string;
  teamName: string;
  locationIds: string[];
  submittedDate: string;
  status: 'pending' | 'sent' | 'archived';
  changes: {
    itemName: string;
    locationId: string;
    oldPrice: number;
    newPrice: number;
  }[];
  totalChanges: number;
}

interface FranchiseeUser {
  id: string;
  username: string;
  email: string;
  teamName: string;
  locationIds: string[];
  priceDisabled: boolean;
  status: 'unlocked' | 'locked';
}

interface SendReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PriceChangeReport | null;
}

const SendReportModal: React.FC<SendReportModalProps> = ({ isOpen, onClose, report }) => {
  const [email, setEmail] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledDate, setScheduledDate] = useState('');

  if (!isOpen || !report) return null;

  const handleSendReport = () => {
    // TODO: Implement send report logic
    console.log('Sending report:', {
      reportId: report.id,
      email,
      locations: selectedLocations,
      scheduleType,
      scheduledDate
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Send Report - {report.teamName}
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
  const teamRoles = userData?.userDetails?.team?.teamRoles;
  
  // State management
  const [showArchived, setShowArchived] = useState(false);
  const [sendReportModal, setSendReportModal] = useState<{isOpen: boolean, report: PriceChangeReport | null}>({
    isOpen: false,
    report: null
  });

  // Check if user has ADMIN role (since this is admin functionality)
  const hasAdminAccess = hasRole(teamRoles, 'ADMIN');

  // Mock price change reports data (will be replaced with real API)
  const mockPriceReports: PriceChangeReport[] = [
    {
      id: 'report_1',
      franchiseeId: '1',
      franchiseeName: 'franchise_owner_1',
      teamName: 'Downtown Franchise',
      locationIds: ['101', '102'],
      submittedDate: '2024-01-15T10:30:00Z',
      status: 'pending',
      totalChanges: 5,
      changes: [
        { itemName: 'Buffalo Chicken Sandwich', locationId: '101', oldPrice: 12.99, newPrice: 13.49 },
        { itemName: '3 Tender Meal', locationId: '101', oldPrice: 10.99, newPrice: 11.49 },
        { itemName: 'Buffalo Chicken Sandwich', locationId: '102', oldPrice: 12.99, newPrice: 13.49 },
        { itemName: '3 Tender Meal', locationId: '102', oldPrice: 10.99, newPrice: 11.49 },
        { itemName: 'Sweet Tea', locationId: '101', oldPrice: 2.99, newPrice: 3.29 }
      ]
    },
    {
      id: 'report_2',
      franchiseeId: '2',
      franchiseeName: 'franchise_owner_2',
      teamName: 'Mall Locations',
      locationIds: ['103', '104'],
      submittedDate: '2024-01-14T14:15:00Z',
      status: 'sent',
      totalChanges: 3,
      changes: [
        { itemName: 'Kids 2 Tender Meal', locationId: '103', oldPrice: 7.99, newPrice: 8.49 },
        { itemName: 'Kids 2 Tender Meal', locationId: '104', oldPrice: 7.99, newPrice: 8.49 },
        { itemName: 'Sweet Tea', locationId: '103', oldPrice: 2.99, newPrice: 3.29 }
      ]
    },
    {
      id: 'report_3',
      franchiseeId: '3',
      franchiseeName: 'franchise_owner_3',
      teamName: 'Airport Franchise',
      locationIds: ['106'],
      submittedDate: '2024-01-10T09:00:00Z',
      status: 'archived',
      totalChanges: 2,
      changes: [
        { itemName: 'Buffalo Chicken Sandwich', locationId: '106', oldPrice: 12.99, newPrice: 14.99 },
        { itemName: '3 Tender Meal', locationId: '106', oldPrice: 10.99, newPrice: 12.99 }
      ]
    }
  ];

  // Mock franchisee users for lock/unlock functionality
  const mockFranchiseeUsers: FranchiseeUser[] = [
    {
      id: '1',
      username: 'franchise_owner_1',
      email: 'owner1@franchise.com',
      teamName: 'Downtown Franchise',
      locationIds: ['101', '102'],
      priceDisabled: false,
      status: 'unlocked'
    },
    {
      id: '2',
      username: 'franchise_owner_2',
      email: 'owner2@franchise.com',
      teamName: 'Mall Locations',
      locationIds: ['103', '104', '105'],
      priceDisabled: true,
      status: 'locked'
    }
  ];

  const pendingReports = mockPriceReports.filter(report => report.status === 'pending');
  const sentReports = mockPriceReports.filter(report => report.status === 'sent');
  const archivedReports = mockPriceReports.filter(report => report.status === 'archived');
  const displayReports = showArchived ? archivedReports : [...pendingReports, ...sentReports];

  const handleToggleLock = (userId: string) => {
    // TODO: Implement lock/unlock logic for franchisee users
    console.log('Toggle lock for user:', userId);
  };

  const handleArchiveReport = (reportId: string) => {
    // TODO: Implement archive report logic
    console.log('Archive report:', reportId);
  };

  const handleClearArchived = () => {
    // TODO: Implement clear all archived reports logic
    console.log('Clear all archived reports');
  };

  const handleSendReport = (report: PriceChangeReport) => {
    setSendReportModal({ isOpen: true, report });
  };

  const handleViewReport = (report: PriceChangeReport) => {
    // TODO: Implement view report details logic
    console.log('View report details:', report);
  };

  const getLocationNames = (locationIds: string[]) => {
    // Mock location mapping (will be replaced with real data)
    const locationMap: {[key: string]: string} = {
      '101': 'Downtown Main',
      '102': 'Downtown West',
      '103': 'Mall Food Court',
      '104': 'Mall Entrance',
      '105': 'Mall Upper Level',
      '106': 'Airport Terminal A'
    };
    
    return locationIds.map(id => locationMap[id] || `Location ${id}`).join(', ');
  };

  if (isLoading) {
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
          You need ADMIN role access to manage Price Users.
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {showArchived ? 'Archived Reports' : 'Active Reports'} ({displayReports.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Franchisee Team
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
                          {report.teamName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {report.franchiseeName}
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
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {report.totalChanges} items
                      </span>
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
                      {!showArchived && (
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
        </div>

        {/* Franchisee Lock/Unlock Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Franchisee Access Control
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Franchisee Team
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
                {mockFranchiseeUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.teamName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.username} • {user.email}
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
                        user.status === 'unlocked' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleLock(user.id)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-colors ${
                          user.status === 'locked'
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {user.status === 'locked' ? '🔒' : '🔓'}
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
      />
    </div>
  );
};

export default PriceUsersPage;