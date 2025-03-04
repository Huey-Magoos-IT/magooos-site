"use client";

import { useState, useMemo } from 'react';
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
  TableSortLabel,
  CircularProgress,
  Alert,
  Tooltip,
  Chip
} from '@mui/material';
import { ArrowUpDown, AlertCircle } from 'lucide-react';
import { Location, useGetLocationsQuery } from '../../state/lambdaApi';
import { SAMPLE_LOCATIONS } from './sampleLocations';

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

  // Fetch locations from DynamoDB
  const { data, error, isLoading } = useGetLocationsQuery();
  
  // Use sample data as fallback when API fails or is unavailable
  const isUsingSampleData = Boolean(error || (!data && !isLoading));
  
  // Filter out already selected locations
  const availableLocations = useMemo(() => {
    // If we have API data, use it
    if (data?.locations) {
      return data.locations.filter(location => !selectedLocationIds.includes(location.id));
    }
    
    // Otherwise, if there's an error or no data, use sample data as fallback
    if (isUsingSampleData) {
      return SAMPLE_LOCATIONS.filter(location => !selectedLocationIds.includes(location.id));
    }
    
    // If we're still loading, return empty array
    return [];
  }, [data, selectedLocationIds, isUsingSampleData]);

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
      className="rounded-lg overflow-hidden dark:bg-dark-secondary"
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      <Typography variant="h6" className="p-4 font-semibold bg-blue-50 dark:bg-dark-tertiary dark:text-white border-b flex justify-between items-center">
        <span>Available Locations</span>
        {isUsingSampleData && (
          <Tooltip title="Using sample data. API connection unavailable.">
            <Chip
              icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
              label="Sample Data"
              size="small"
              className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            />
          </Tooltip>
        )}
      </Typography>
      
      <TableContainer className="flex-grow" style={{ maxHeight: '400px' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell 
                className="cursor-pointer font-semibold dark:bg-dark-tertiary dark:text-neutral-300"
                onClick={() => handleRequestSort('name')}
              >
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                  IconComponent={() => (
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  )}
                >
                  Location Name
                </TableSortLabel>
              </TableCell>
              <TableCell 
                className="cursor-pointer font-semibold dark:bg-dark-tertiary dark:text-neutral-300"
                onClick={() => handleRequestSort('id')}
              >
                <TableSortLabel
                  active={orderBy === 'id'}
                  direction={orderBy === 'id' ? order : 'asc'}
                  onClick={() => handleRequestSort('id')}
                  IconComponent={() => (
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  )}
                >
                  ID
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8">
                  <Box className="flex justify-center items-center flex-col gap-2">
                    <CircularProgress size={32} />
                    <Typography variant="body2" className="text-gray-500 dark:text-neutral-400">
                      Loading locations...
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-4">
                  <Alert severity="warning" className="mx-4">
                    <div className="flex flex-col gap-1">
                      <div>
                        Error loading locations from API: {error instanceof Error ? error.message : 'Unknown error'}
                      </div>
                      <div className="text-sm font-medium mt-1">
                        Using sample data as fallback.
                      </div>
                    </div>
                  </Alert>
                </TableCell>
              </TableRow>
            ) : sortedLocations.length > 0 ? (
              sortedLocations.map((location) => (
                <TableRow
                  key={location.id}
                  hover
                  className="cursor-pointer transition-colors duration-200"
                  onClick={() => onLocationSelect(location)}
                  onMouseEnter={() => setHoveredRow(location.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  sx={{
                    backgroundColor: hoveredRow === location.id ? 'rgba(25, 118, 210, 0.08)' : 'inherit',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.12)',
                    },
                    '&:active': {
                      backgroundColor: 'rgba(25, 118, 210, 0.16)',
                    },
                  }}
                >
                  <TableCell className="dark:text-neutral-300">{location.name}</TableCell>
                  <TableCell className="dark:text-neutral-300">{location.id}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-4 text-gray-500 dark:text-neutral-400">
                  {data?.locations && data.locations.length > 0
                    ? "All locations have been selected"
                    : "No locations available"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box className="p-3 bg-blue-50 border-t flex justify-end items-center dark:bg-dark-tertiary dark:text-neutral-300">
        <Typography variant="body2" className="text-sm">
          {isLoading ? (
            "Loading locations..."
          ) : error ? (
            "Using sample data (API unavailable)"
          ) : (
            `${sortedLocations.length} location${sortedLocations.length !== 1 ? 's' : ''} available`
          )}
        </Typography>
      </Box>
    </Paper>
  );
};

export default LocationTable;