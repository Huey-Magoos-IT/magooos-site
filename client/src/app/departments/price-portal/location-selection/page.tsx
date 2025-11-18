"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGetAuthUserQuery } from "@/state/api";
import { useGetLocationsQuery, Location } from "@/state/lambdaApi";
import { hasAnyRole, hasLocationAccess } from "@/lib/accessControl";
import Header from "@/components/Header";
import LocationTable, { Location as LocationTableLocation } from "@/components/LocationTable";
import { toast } from "react-hot-toast";

const LocationSelectionPage = () => {
  const router = useRouter();
  const { data: authData, isLoading: userIsLoading } = useGetAuthUserQuery({});
  const { data: locationsData, isLoading: locationsIsLoading } = useGetLocationsQuery();

  const teamRoles = authData?.userDetails?.team?.teamRoles;
  const user = authData?.userDetails;
  
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);

  // Get user's accessible locations
  const userLocations: Location[] = useMemo(() => {
    if (!user?.locationIds || !locationsData?.locations) return [];
    return locationsData.locations.filter((location: Location) => 
      hasLocationAccess(user.locationIds, location.id)
    );
  }, [user?.locationIds, locationsData?.locations]);

  const hasAccess = hasAnyRole(teamRoles, ['LOCATION_ADMIN', 'ADMIN', 'PRICE_ADMIN']);

  // Initialize with previously selected locations from sessionStorage
  useEffect(() => {
    const storedLocationIds = sessionStorage.getItem('selectedLocationIds');
    if (storedLocationIds && locationsData?.locations) {
      try {
        const parsedIds = JSON.parse(storedLocationIds);
        if (Array.isArray(parsedIds)) {
          // Validate that stored locations are still accessible to user
          const validIds = parsedIds.filter(id =>
            hasLocationAccess(user?.locationIds || [], id)
          );
          setSelectedLocationIds(validIds);
          
          // Set selected locations objects
          const selectedLocs = locationsData.locations.filter(loc =>
            validIds.includes(loc.id)
          );
          setSelectedLocations(selectedLocs);
        }
      } catch (error) {
        console.error('Error parsing stored location IDs:', error);
      }
    }
    // Don't auto-select all locations - user must manually choose
  }, [userLocations, locationsData, user?.locationIds]);

  const handleLocationSelect = (location: LocationTableLocation) => {
    // Convert LocationTableLocation to Location for consistency
    const locationObj: Location = {
      id: location.id,
      name: location.name,
      __typename: location.__typename || "Location"
    };
    setSelectedLocationIds(prev => [...prev, location.id]);
    setSelectedLocations(prev => [...prev, locationObj]);
  };

  const handleLocationRemove = (locationId: string) => {
    setSelectedLocationIds(prev => prev.filter(id => id !== locationId));
    setSelectedLocations(prev => prev.filter(loc => loc.id !== locationId));
  };

  const handleSelectAll = () => {
    const allLocationIds = userLocations.map(loc => loc.id);
    setSelectedLocationIds(allLocationIds);
    setSelectedLocations(userLocations);
  };

  const handleClearAll = () => {
    setSelectedLocationIds([]);
    setSelectedLocations([]);
  };

  const handleContinue = () => {
    if (selectedLocationIds.length === 0) {
      toast.error('Please select at least one location to continue.');
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
        <div className="text-lg text-[var(--theme-text)]">Loading locations...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-xl font-semibold text-[var(--theme-error)]">Access Denied</div>
        <div className="text-[var(--theme-text-secondary)]">
          You need LOCATION_ADMIN, ADMIN, or PRICE_ADMIN role access to view this content.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Header name="Price Portal - Location Selection" />
      
      <div className="mt-6 space-y-6">
        {/* User Info */}
        <div className="bg-[var(--theme-primary)]/10 rounded-lg shadow-sm border border-[var(--theme-primary)]/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--theme-text)] text-lg">
                Choose which locations you want to load price data for.
              </p>
            </div>
            <div className="text-right space-y-1">
              <div className="text-sm text-[var(--theme-text-secondary)]">
                <span className="font-semibold">{user?.username}</span>
              </div>
              <div className="text-sm text-[var(--theme-primary)] font-medium">
                {userLocations.length} location{userLocations.length !== 1 ? 's' : ''} available
              </div>
            </div>
          </div>
        </div>

        {/* Selection Summary */}
        <div className="bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[var(--theme-primary)]">
                Selected Locations ({selectedLocationIds.length})
              </h3>
              <p className="text-sm text-[var(--theme-text-secondary)]">
                {selectedLocationIds.length === 0
                  ? 'No locations selected'
                  : `${selectedLocationIds.length} of ${userLocations.length} locations selected`
                }
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSelectAll}
                disabled={selectedLocationIds.length === userLocations.length}
                className="px-3 py-1 text-sm bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded hover:opacity-90 disabled:bg-[var(--theme-surface-active)] disabled:text-[var(--theme-text-muted)] disabled:cursor-not-allowed transition-colors"
              >
                Select All
              </button>
              <button
                onClick={handleClearAll}
                disabled={selectedLocationIds.length === 0}
                className="px-3 py-1 text-sm bg-[var(--theme-surface-active)] text-[var(--theme-text)] rounded hover:opacity-90 disabled:bg-[var(--theme-surface-active)] disabled:text-[var(--theme-text-muted)] disabled:cursor-not-allowed transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Selected Locations */}
          <div className="bg-[var(--theme-surface)] rounded-lg shadow">
            <div className="px-6 py-4 border-b border-[var(--theme-border)]">
              <h3 className="text-lg font-medium text-[var(--theme-text)]">
                Selected Locations ({selectedLocations.length})
              </h3>
            </div>
            <div className="p-6">
              {selectedLocations.length === 0 ? (
                <div className="text-center py-8 text-[var(--theme-text-muted)]">
                  No locations selected. Choose locations from the table on the right.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedLocations.map((location) => (
                    <div
                      key={location.id}
                      onClick={() => handleLocationRemove(location.id)}
                      className="flex items-center justify-between p-3 bg-[var(--theme-success)]/10 border border-[var(--theme-success)]/30 rounded-lg cursor-pointer hover:bg-[var(--theme-success)]/20 transition-colors"
                      title="Click to remove location"
                    >
                      <div>
                        <div className="font-medium text-[var(--theme-text)]">
                          {location.name}
                        </div>
                        <div className="text-sm text-[var(--theme-text-muted)]">
                          ID: {location.id}
                        </div>
                      </div>
                      <div className="text-[var(--theme-error)]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Available Locations Table */}
          <div className="bg-[var(--theme-surface)] rounded-lg shadow">
            <LocationTable
              selectedLocationIds={selectedLocationIds}
              onLocationSelect={handleLocationSelect}
              userLocationIds={user?.locationIds}
            />
          </div>
        </div>

        {/* Performance Warning */}
        {selectedLocationIds.length > 5 && (
          <div className="bg-[var(--theme-warning)]/10 border border-[var(--theme-warning)]/30 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-[var(--theme-warning)] mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-[var(--theme-warning)]">
                  Performance Notice
                </h4>
                <p className="text-sm text-[var(--theme-text-secondary)]">
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
            className="px-6 py-3 border border-[var(--theme-border)] text-[var(--theme-text-secondary)] bg-[var(--theme-surface)] rounded-lg hover:bg-[var(--theme-surface-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={selectedLocationIds.length === 0}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              selectedLocationIds.length > 0
                ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] hover:opacity-90'
                : 'bg-[var(--theme-surface-active)] text-[var(--theme-text-muted)] cursor-not-allowed'
            }`}
          >
            Continue to Price Portal ({selectedLocationIds.length} location{selectedLocationIds.length !== 1 ? 's' : ''})
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationSelectionPage;