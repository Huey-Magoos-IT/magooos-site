"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGetAuthUserQuery } from "@/state/api";
import { useGetLocationsQuery, Location } from "@/state/lambdaApi";
import { hasAnyRole, hasLocationAccess } from "@/lib/accessControl";
import Header from "@/components/Header";

interface LocationSelectionState {
  selectedLocationIds: string[];
  availableLocations: Location[];
  isLoading: boolean;
}

const LocationSelectionPage = () => {
  const router = useRouter();
  const { data: authData, isLoading: userIsLoading } = useGetAuthUserQuery({});
  const { data: locationsData, isLoading: locationsIsLoading } = useGetLocationsQuery();

  const teamRoles = authData?.userDetails?.team?.teamRoles;
  const user = authData?.userDetails;
  
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Get user's accessible locations
  const userLocations: Location[] = useMemo(() => {
    if (!user?.locationIds || !locationsData?.locations) return [];
    return locationsData.locations.filter((location: Location) => 
      hasLocationAccess(user.locationIds, location.id)
    );
  }, [user?.locationIds, locationsData?.locations]);

  const hasAccess = hasAnyRole(teamRoles, ['LOCATION_ADMIN', 'ADMIN', 'PRICE_ADMIN']);

  // Initialize with all locations selected by default
  useEffect(() => {
    if (userLocations.length > 0 && selectedLocationIds.length === 0) {
      const allLocationIds = userLocations.map(loc => loc.id);
      setSelectedLocationIds(allLocationIds);
      setSelectAll(true);
    }
  }, [userLocations, selectedLocationIds.length]);

  const handleLocationToggle = (locationId: string) => {
    setSelectedLocationIds(prev => {
      const newSelection = prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId];
      
      // Update select all state
      setSelectAll(newSelection.length === userLocations.length);
      
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLocationIds([]);
      setSelectAll(false);
    } else {
      const allLocationIds = userLocations.map(loc => loc.id);
      setSelectedLocationIds(allLocationIds);
      setSelectAll(true);
    }
  };

  const handleContinue = () => {
    if (selectedLocationIds.length === 0) {
      alert('Please select at least one location to continue.');
      return;
    }

    // Store selected locations in sessionStorage for the price portal
    sessionStorage.setItem('selectedLocationIds', JSON.stringify(selectedLocationIds));
    
    // Navigate to the main price portal
    router.push('/departments/price-portal');
  };

  const handleCancel = () => {
    router.push('/departments');
  };

  if (userIsLoading || locationsIsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading locations...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-xl font-semibold text-red-600">Access Denied</div>
        <div className="text-gray-600">
          You need LOCATION_ADMIN, ADMIN, or PRICE_ADMIN role access to view this content.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Header name="Price Portal - Location Selection" />
      
      <div className="mt-6 max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Select Locations for Price Management
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Choose which locations you want to load price data for. Selecting fewer locations will improve loading performance.
            </p>
          </div>

          {/* User Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Logged in as: {user?.username}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You have access to {userLocations.length} location{userLocations.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Selected: {selectedLocationIds.length} / {userLocations.length}
                </div>
              </div>
            </div>
          </div>

          {/* Select All Toggle */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Location Selection
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Select the locations you want to manage prices for
              </p>
            </div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select All Locations
              </span>
            </label>
          </div>

          {/* Location Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {userLocations.map((location) => (
              <div
                key={location.id}
                className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  selectedLocationIds.includes(location.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
                onClick={() => handleLocationToggle(location.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {location.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {location.id}
                    </p>
                  </div>
                  <div className="ml-3">
                    <input
                      type="checkbox"
                      checked={selectedLocationIds.includes(location.id)}
                      onChange={() => handleLocationToggle(location.id)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                {selectedLocationIds.includes(location.id) && (
                  <div className="absolute top-2 right-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Performance Warning */}
          {selectedLocationIds.length > 5 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Performance Notice
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Loading {selectedLocationIds.length} locations may take longer. Consider selecting fewer locations for better performance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleCancel}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              disabled={selectedLocationIds.length === 0}
              className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                selectedLocationIds.length > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
              }`}
            >
              Continue to Price Portal ({selectedLocationIds.length} location{selectedLocationIds.length !== 1 ? 's' : ''})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSelectionPage;