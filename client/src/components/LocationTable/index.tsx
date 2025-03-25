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
  Button
} from '@mui/material';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
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
}

const LocationTable = ({ selectedLocationIds, onLocationSelect }: LocationTableProps) => {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<OrderBy>('name');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  
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

  // Filter out already selected locations
  const availableLocations = useMemo(() => {
    if (!data?.locations) return [];
    return data.locations.filter(location => !selectedLocationIds.includes(location.id));
  }, [data, selectedLocationIds]);

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
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      <Typography variant="h6" className="p-4 font-semibold bg-blue-50 dark:bg-dark-tertiary dark:text-white border-b border-blue-100 dark:border-blue-900/30">
        Available Locations
      </Typography>
      
      <TableContainer className="flex-grow" style={{ maxHeight: '400px' }}>
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
      
      <Box className="p-3 bg-blue-50 border-t border-blue-100 flex justify-end items-center dark:bg-dark-tertiary dark:border-blue-900/30 dark:text-white">
        <Typography variant="body2" className="text-sm font-medium text-blue-700 dark:text-blue-300">
          {isLoading ? 'Loading...' : `${sortedLocations.length} location${sortedLocations.length !== 1 ? 's' : ''} available`}
        </Typography>
      </Box>
    </Paper>
  );
};

export default LocationTable;