"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  IconButton,
  TableSortLabel,
  CircularProgress,
  Button,
  TextField,
  InputAdornment
} from '@mui/material';
import { ArrowUpDown, RefreshCw, Search } from 'lucide-react';
import { useGetLocationsQuery } from '../../state/lambdaApi';

// Define the location type based on DynamoDB schema
export interface Location {
  id: string;
  name: string;
  __typename?: string;
  createdAt?: string;
  updatedAt?: string;
}

type Order = 'asc' | 'desc';
type OrderBy = 'name' | 'id';

interface LocationTableProps {
  selectedLocationIds: string[];
  onLocationSelect: (location: Location) => void;
  userLocationIds?: string[]; // Add user's assigned location IDs
}

const LocationTable = ({ selectedLocationIds, onLocationSelect, userLocationIds }: LocationTableProps) => {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<OrderBy>('name');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Get locations from DynamoDB via the Lambda API Gateway
  const { data, isLoading, error, refetch } = useGetLocationsQuery();

  // Display error details if in development
  const errorDetails = useMemo(() => {
    if (!error) return null;
    if (typeof error === 'object') {
      return JSON.stringify(error, null, 2);
    }
    return String(error);
  }, [error]);

  // Filter out already selected locations, apply user location restrictions, and apply search filter
  const availableLocations = useMemo(() => {
    if (!data?.locations) return [];
    
    // First filter by user's location access if provided
    let accessibleLocations = data.locations;
    if (userLocationIds && userLocationIds.length > 0) {
      console.log("Filtering locations by user access:", userLocationIds);
      accessibleLocations = data.locations.filter(location =>
        userLocationIds.includes(location.id)
      );
    }
    
    // Then filter out already selected locations
    const unselectedLocations = accessibleLocations.filter(location =>
      !selectedLocationIds.includes(location.id)
    );
    
    // If no search query, return all unselected locations
    if (!searchQuery.trim()) return unselectedLocations;
    
    // Apply search filter (case-insensitive)
    const query = searchQuery.toLowerCase().trim();
    return unselectedLocations.filter(location =>
      location.name.toLowerCase().includes(query) ||
      location.id.toString().includes(query)
    );
  }, [data, selectedLocationIds, userLocationIds, searchQuery]);

  // Sort locations based on current order and orderBy
  const sortedLocations = useMemo(() => {
    return [...availableLocations].sort((a, b) => {
      const isAsc = order === 'asc';
      if (orderBy === 'name') {
        return isAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        return isAsc
          ? parseInt(a.id) - parseInt(b.id)
          : parseInt(b.id) - parseInt(a.id);
      }
    });
  }, [availableLocations, order, orderBy]);

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  return (
    <Paper
      elevation={2}
      className="rounded-lg overflow-hidden dark:bg-dark-secondary border border-gray-100 dark:border-stroke-dark"
      sx={{
        flexGrow: 1, // Changed from height: '100%'
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      <div className="p-4 bg-blue-50 dark:bg-dark-tertiary border-b border-blue-100 dark:border-blue-900/30">
        <Typography variant="h6" className="font-semibold dark:text-white mb-2">
          Available Locations
        </Typography>
        <TextField
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="outlined"
          size="small"
          fullWidth
          className="bg-white dark:bg-dark-tertiary rounded-md shadow-sm border border-gray-200 dark:border-stroke-dark"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </InputAdornment>
            ),
            className: "dark:text-white"
          }}
        />
      </div>
      
      {/* Removed maxHeight: '400px' to allow full stretching */}
      {/* Set height to 540px (original 400px + 35%) */}
      <TableContainer sx={{ height: '540px', overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell
                className="cursor-pointer font-semibold bg-gray-100 dark:bg-dark-tertiary dark:text-white border-b-2 border-blue-200 dark:border-blue-900/30"
                onClick={() => handleRequestSort('name')}
              >
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                  IconComponent={() => (
                    <ArrowUpDown className="h-4 w-4 ml-1 text-blue-500 dark:text-blue-400" />
                  )}
                  className="dark:text-white"
                >
                  <span className="dark:text-white">Location Name</span>
                </TableSortLabel>
              </TableCell>
              <TableCell
                className="cursor-pointer font-semibold bg-gray-100 dark:bg-dark-tertiary dark:text-white border-b-2 border-blue-200 dark:border-blue-900/30"
                onClick={() => handleRequestSort('id')}
              >
                <TableSortLabel
                  active={orderBy === 'id'}
                  direction={orderBy === 'id' ? order : 'asc'}
                  onClick={() => handleRequestSort('id')}
                  IconComponent={() => (
                    <ArrowUpDown className="h-4 w-4 ml-1 text-blue-500 dark:text-blue-400" />
                  )}
                  className="dark:text-white"
                >
                  <span className="dark:text-white">ID</span>
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8">
                  <CircularProgress size={24} />
                  <Typography className="ml-2 text-gray-500 dark:text-neutral-400">
                    Loading locations...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-4">
                  <div className="text-red-500 dark:text-red-400 mb-2">
                    Error loading locations from DynamoDB.
                  </div>
                  {errorDetails && (
                    <div className="text-xs overflow-auto max-h-24 bg-gray-100 dark:bg-dark-tertiary p-2 rounded mb-2">
                      {errorDetails}
                    </div>
                  )}
                  <div className="flex gap-2 justify-center mt-2">
                    <Button 
                      variant="outlined" 
                      color="primary" 
                      size="small"
                      onClick={() => refetch()}
                      startIcon={<RefreshCw className="h-4 w-4" />}
                    >
                      Try Again
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Note: The API Gateway requires proper authentication and permissions to access DynamoDB.
                  </div>
                </TableCell>
              </TableRow>
            ) : sortedLocations.length > 0 ? (
              sortedLocations.map((location, index) => (
                <TableRow
                  key={location.id}
                  hover
                  className={`
                    cursor-pointer transition-colors duration-200
                    ${index % 2 === 0 ? 'bg-white dark:bg-dark-secondary' : 'bg-gray-50 dark:bg-dark-tertiary/50'}
                  `}
                  onClick={() => onLocationSelect(location)}
                  onMouseEnter={() => setHoveredRow(location.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  sx={{
                    backgroundColor: hoveredRow === location.id ? 'rgba(59, 130, 246, 0.08)' : 'inherit',
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    },
                    '&:active': {
                      backgroundColor: 'rgba(59, 130, 246, 0.16)',
                    },
                  }}
                >
                  <TableCell className="dark:text-white">{location.name}</TableCell>
                  <TableCell className="dark:text-white">{location.id}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-4 text-gray-500 dark:text-neutral-400">
                  All locations have been selected
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box className="p-3 bg-blue-50 border-t border-blue-100 flex justify-between items-center dark:bg-dark-tertiary dark:border-blue-900/30 dark:text-white">
        {searchQuery.trim() && data?.locations && (
          <Typography variant="body2" className="text-sm text-blue-700 dark:text-blue-300">
            {`Showing ${sortedLocations.length} of ${data.locations.filter(location => !selectedLocationIds.includes(location.id)).length} locations`}
          </Typography>
        )}
        <Typography variant="body2" className="text-sm font-medium text-blue-700 dark:text-blue-300 ml-auto">
          {isLoading ? 'Loading...' : `${sortedLocations.length} location${sortedLocations.length !== 1 ? 's' : ''} available`}
        </Typography>
      </Box>
    </Paper>
  );
};

export default LocationTable;