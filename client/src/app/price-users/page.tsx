"use client";

import React, { useState } from "react";
import { useGetAuthUserQuery } from "@/state/api";
import { hasRole } from "@/lib/accessControl";
import Header from "@/components/Header";

interface FranchiseeUser {
  id: string;
  username: string;
  email: string;
  teamName: string;
  locationIds: string[];
  priceDisabled: boolean;
  lastPriceChange?: string;
  status: 'unlocked' | 'locked' | 'history';
}

interface SendReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  franchisee: FranchiseeUser | null;
}

const SendReportModal: React.FC<SendReportModalProps> = ({ isOpen, onClose, franchisee }) => {
  const [email, setEmail] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledDate, setScheduledDate] = useState('');

  if (!isOpen || !franchisee) return null;

  const handleSendReport = () => {
    // TODO: Implement send report logic
    console.log('Sending report:', {
      franchisee: franchisee.id,
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
          Send Report - {franchisee.teamName}
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
              {franchisee.locationIds.map(locationId => (
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
  const [showHistory, setShowHistory] = useState(false);
  const [sendReportModal, setSendReportModal] = useState<{isOpen: boolean, franchisee: FranchiseeUser | null}>({
    isOpen: false,
    franchisee: null
  });

  // Check if user has ADMIN role (since this is admin functionality)
  const hasAdminAccess = hasRole(teamRoles, 'ADMIN');

  // Mock franchisee users data (will be replaced with real API)
  const mockFranchiseeUsers: FranchiseeUser[] = [
    {
      id: '1',
      username: 'franchise_owner_1',
      email: 'owner1@franchise.com',
      teamName: 'Downtown Franchise',
      locationIds: ['101', '102'],
      priceDisabled: false,
      lastPriceChange: '2024-01-15',
      status: 'unlocked'
    },
    {
      id: '2',
      username: 'franchise_owner_2',
      email: 'owner2@franchise.com',
      teamName: 'Mall Locations',
      locationIds: ['103', '104', '105'],
      priceDisabled: true,
      lastPriceChange: '2024-01-10',
      status: 'locked'
    },
    {
      id: '3',
      username: 'franchise_owner_3',
      email: 'owner3@franchise.com',
      teamName: 'Airport Franchise',
      locationIds: ['106'],
      priceDisabled: false,
      lastPriceChange: '2024-01-12',
      status: 'history'
    }
  ];

  const activeUsers = mockFranchiseeUsers.filter(user => user.status !== 'history');
  const historyUsers = mockFranchiseeUsers.filter(user => user.status === 'history');
  const displayUsers = showHistory ? historyUsers : activeUsers;

  const handleToggleLock = (userId: string) => {
    // TODO: Implement lock/unlock logic
    console.log('Toggle lock for user:', userId);
  };

  const handleComplete = (userId: string) => {
    // TODO: Implement complete (move to history) logic
    console.log('Complete user:', userId);
  };

  const handleRestore = (userId: string) => {
    // TODO: Implement restore from history logic
    console.log('Restore user:', userId);
  };

  const handleClearHistory = () => {
    // TODO: Implement clear all history logic
    console.log('Clear all history');
  };

  const handleSendReport = (franchisee: FranchiseeUser) => {
    setSendReportModal({ isOpen: true, franchisee });
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
                Franchisee Price Management
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Manage price access and reports for franchisee teams
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showHistory
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300'
                }`}
              >
                {showHistory ? 'Show Active Users' : 'Show History'}
              </button>
              
              {showHistory && (
                <button
                  onClick={handleClearHistory}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Clear All History
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {showHistory ? 'History' : 'Active Franchisees'} ({displayUsers.length})
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
                    Price Portal
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Lock
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {showHistory ? 'Restore' : 'Complete'}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Send Report
                  </th>
                </tr>
              </thead>
              <tbody className={`bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 ${showHistory ? 'opacity-70' : ''}`}>
                {displayUsers.map(user => (
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
                          : user.status === 'locked'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <a
                        href={`/departments/price-portal`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                      >
                        View Portal
                      </a>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {!showHistory && (
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
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => showHistory ? handleRestore(user.id) : handleComplete(user.id)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-colors ${
                          showHistory
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : user.status === 'locked'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600'
                        }`}
                        disabled={!showHistory && user.status !== 'locked'}
                      >
                        {showHistory ? '↩️' : '✔️'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleSendReport(user)}
                        className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                      >
                        Send Report
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
        onClose={() => setSendReportModal({ isOpen: false, franchisee: null })}
        franchisee={sendReportModal.franchisee}
      />
    </div>
  );
};

export default PriceUsersPage;