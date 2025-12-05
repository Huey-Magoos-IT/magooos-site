import { useState, useCallback, useMemo } from 'react';
import { Location } from '@/components/LocationTable';

// Stable empty array references to prevent unnecessary re-renders
const EMPTY_STRING_ARRAY: string[] = [];
const EMPTY_LOCATION_ARRAY: Location[] = [];

interface UseLocationSelectionOptions {
  initialLocationIds?: string[];
  allLocations?: Location[];
}

interface UseLocationSelectionReturn {
  selectedLocationIds: string[];
  selectedLocations: Location[];
  previousLocationIds: string[];
  lastAction: string;
  handleAddLocation: (location: Location) => void;
  handleRemoveLocation: (locationId: string) => void;
  handleAddAllLocations: (locations: Location[]) => void;
  handleClearAll: () => void;
  handleUndo: () => void;
  setSelectedLocationIds: React.Dispatch<React.SetStateAction<string[]>>;
  reset: () => void;
}

/**
 * Custom hook for managing location selection with undo support.
 * Consolidates duplicate location selection logic used across multiple components.
 */
export function useLocationSelection(
  options: UseLocationSelectionOptions = {}
): UseLocationSelectionReturn {
  // Use stable empty arrays as defaults to prevent reset function from being recreated
  const initialLocationIds = options.initialLocationIds ?? EMPTY_STRING_ARRAY;
  const allLocations = options.allLocations ?? EMPTY_LOCATION_ARRAY;

  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(initialLocationIds);
  const [previousLocationIds, setPreviousLocationIds] = useState<string[]>([]);
  const [lastAction, setLastAction] = useState<string>('');

  // Derive selected locations from IDs and available locations
  const selectedLocations = allLocations.filter(loc =>
    selectedLocationIds.includes(loc.id)
  );

  const handleAddLocation = useCallback((location: Location) => {
    setPreviousLocationIds([...selectedLocationIds]);
    setLastAction('add');

    setSelectedLocationIds(prev => {
      if (!prev.includes(location.id)) {
        return [...prev, location.id];
      }
      return prev;
    });
  }, [selectedLocationIds]);

  const handleRemoveLocation = useCallback((locationId: string) => {
    setPreviousLocationIds([...selectedLocationIds]);
    setLastAction('remove');

    setSelectedLocationIds(prev => prev.filter(id => id !== locationId));
  }, [selectedLocationIds]);

  const handleAddAllLocations = useCallback((locations: Location[]) => {
    setPreviousLocationIds([...selectedLocationIds]);
    setLastAction('addAll');

    setSelectedLocationIds(locations.map(loc => loc.id));
  }, [selectedLocationIds]);

  const handleClearAll = useCallback(() => {
    setPreviousLocationIds([...selectedLocationIds]);
    setLastAction('clearAll');

    setSelectedLocationIds([]);
  }, [selectedLocationIds]);

  const handleUndo = useCallback(() => {
    if (lastAction) {
      setSelectedLocationIds(previousLocationIds);
      setLastAction('');
    }
  }, [lastAction, previousLocationIds]);

  const reset = useCallback(() => {
    setSelectedLocationIds(initialLocationIds);
    setPreviousLocationIds([]);
    setLastAction('');
  }, [initialLocationIds]);

  return {
    selectedLocationIds,
    selectedLocations,
    previousLocationIds,
    lastAction,
    handleAddLocation,
    handleRemoveLocation,
    handleAddAllLocations,
    handleClearAll,
    handleUndo,
    setSelectedLocationIds,
    reset,
  };
}

export default useLocationSelection;
