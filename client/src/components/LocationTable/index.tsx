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
      className="rounded-lg overflow-hidden bg-[var(--theme-surface)] border border-[var(--theme-border)]"
      sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      <div className="p-4 bg-[var(--theme-primary)]/10 border-b border-[var(--theme-primary)]/20">
        <Typography variant="h6" className="font-semibold text-[var(--theme-text)] mb-2">
          Available Locations
        </Typography>
        <TextField
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="outlined"
          size="small"
          fullWidth
          className="bg-[var(--theme-surface-hover)] rounded-md shadow-sm border border-[var(--theme-border)]"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search className="h-4 w-4 text-[var(--theme-text-muted)]" />
              </InputAdornment>
            ),
            className: "text-[var(--theme-text)]"
          }}
        />
      </div>
      
      {/*
        CONTROLLING TABLE HEIGHT:
        The `height` property below directly controls the visible height of the scrollable "Available Locations" table.
        Adjust this value (e.g., '540px', '600px', '70vh') to change how many locations are visible before scrolling is required.
        Do NOT try to control the height by styling the parent Paper or Grid components in the reporting page, as those attempts were ineffective.
        Focus modifications *here* in the TableContainer.
        Current height: 540px (original 400px + 35% increase requested in TASK-NEXTJS-...)
      */}
      <TableContainer sx={{ height: '540px', overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell
                className="cursor-pointer font-semibold bg-[var(--theme-surface-hover)] text-[var(--theme-text)] border-b-2 border-[var(--theme-primary)]/30"
                onClick={() => handleRequestSort('name')}
              >
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                  IconComponent={() => (
                    <ArrowUpDown className="h-4 w-4 ml-1 text-[var(--theme-primary)]" />
                  )}
                >
                  <span className="text-[var(--theme-text)]">Location Name</span>
                </TableSortLabel>
              </TableCell>
              <TableCell
                className="cursor-pointer font-semibold bg-[var(--theme-surface-hover)] text-[var(--theme-text)] border-b-2 border-[var(--theme-primary)]/30"
                onClick={() => handleRequestSort('id')}
              >
                <TableSortLabel
                  active={orderBy === 'id'}
                  direction={orderBy === 'id' ? order : 'asc'}
                  onClick={() => handleRequestSort('id')}
                  IconComponent={() => (
                    <ArrowUpDown className="h-4 w-4 ml-1 text-[var(--theme-primary)]" />
                  )}
                >
                  <span className="text-[var(--theme-text)]">ID</span>
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8">
                  <CircularProgress size={24} sx={{ color: 'var(--theme-primary)' }} />
                  <Typography className="ml-2 text-[var(--theme-text-muted)]">
                    Loading locations...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-4">
                  <div className="text-[var(--theme-error)] mb-2">
                    Error loading locations from DynamoDB.
                  </div>
                  {errorDetails && (
                    <div className="text-xs overflow-auto max-h-24 bg-[var(--theme-surface-hover)] p-2 rounded mb-2">
                      {errorDetails}
                    </div>
                  )}
                  <div className="flex gap-2 justify-center mt-2">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => refetch()}
                      startIcon={<RefreshCw className="h-4 w-4" />}
                      sx={{
                        color: 'var(--theme-primary)',
                        borderColor: 'var(--theme-primary)'
                      }}
                    >
                      Try Again
                    </Button>
                  </div>
                  <div className="text-xs text-[var(--theme-text-muted)] mt-2">
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
                    ${index % 2 === 0 ? 'bg-[var(--theme-surface)]' : 'bg-[var(--theme-surface-hover)]'}
                  `}
                  onClick={() => onLocationSelect(location)}
                  onMouseEnter={() => setHoveredRow(location.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  sx={{
                    backgroundColor: hoveredRow === location.id ? 'var(--theme-primary-light)' : 'inherit',
                    '&:hover': {
                      backgroundColor: 'var(--theme-primary-light)',
                    },
                    '&:active': {
                      backgroundColor: 'var(--theme-primary-light)',
                    },
                  }}
                >
                  <TableCell className="text-[var(--theme-text)]">{location.name}</TableCell>
                  <TableCell className="text-[var(--theme-text)]">{location.id}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-4 text-[var(--theme-text-muted)]">
                  All locations have been selected
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box className="p-3 bg-[var(--theme-primary)]/10 border-t border-[var(--theme-primary)]/20 flex justify-between items-center">
        {searchQuery.trim() && data?.locations && (
          <Typography variant="body2" className="text-sm text-[var(--theme-primary)]">
            {`Showing ${sortedLocations.length} of ${data.locations.filter(location => !selectedLocationIds.includes(location.id)).length} locations`}
          </Typography>
        )}
        <Typography variant="body2" className="text-sm font-medium text-[var(--theme-primary)] ml-auto">
          {isLoading ? 'Loading...' : `${sortedLocations.length} location${sortedLocations.length !== 1 ? 's' : ''} available`}
        </Typography>
      </Box>
    </Paper>
  );
};

export default LocationTable;