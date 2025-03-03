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
  TableSortLabel
} from '@mui/material';
import { ArrowUpDown } from 'lucide-react';

// Define the location type based on DynamoDB schema
export interface Location {
  id: string;
  name: string;
  __typename?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Hard-coded locations from DynamoDB data - all 78 locations
// This will eventually be fetched from DynamoDB directly
const SAMPLE_LOCATIONS: Location[] = [
  { id: "4145", name: "Englewood", __typename: "Location", createdAt: "2024-10-25T13:46:14", updatedAt: "2024-10-25T13:46:14" },
  { id: "4849", name: "Starke, FL", __typename: "Location", createdAt: "2024-10-25T13:46:19", updatedAt: "2024-10-25T13:46:19" },
  { id: "5561", name: "Ozark, MO", __typename: "Location", createdAt: "2024-10-25T13:46:18", updatedAt: "2024-10-25T13:46:18" },
  { id: "9905", name: "Huey Magoo's", __typename: "Location", createdAt: "2024-11-14T01:57:00", updatedAt: "2024-11-14T01:57:00" },
  { id: "4167", name: "Dacula, GA", __typename: "Location", createdAt: "2024-10-25T13:46:13", updatedAt: "2024-10-25T13:46:13" },
  { id: "4249", name: "Huey Magoo's", __typename: "Location", createdAt: "2024-11-14T01:57:00", updatedAt: "2024-11-14T01:57:00" },
  { id: "4885", name: "Auburndale", __typename: "Location", createdAt: "2024-10-25T13:46:11", updatedAt: "2024-10-25T13:46:11" },
  { id: "7025", name: "Longwood", __typename: "Location", createdAt: "2024-10-25T13:46:16", updatedAt: "2024-10-25T13:46:16" },
  { id: "4255", name: "Largo, FL", __typename: "Location", createdAt: "2024-10-25T13:46:15", updatedAt: "2024-10-25T13:46:15" },
  { id: "4878", name: "Springfield", __typename: "Location", createdAt: "2024-10-25T13:46:19", updatedAt: "2024-10-25T13:46:19" },
  { id: "4045", name: "Oakland Park", __typename: "Location", createdAt: "2024-10-25T13:46:18", updatedAt: "2024-10-25T13:46:18" },
  { id: "4872", name: "Cooper City", __typename: "Location", createdAt: "2024-10-25T13:46:13", updatedAt: "2024-10-25T13:46:13" },
  { id: "4166", name: "St. Augustine", __typename: "Location", createdAt: "2024-10-25T13:46:19", updatedAt: "2024-10-25T13:46:19" },
  { id: "4868", name: "Pearl, MS", __typename: "Location", createdAt: "2024-10-25T13:46:18", updatedAt: "2024-10-25T13:46:18" },
  { id: "4887", name: "Covington", __typename: "Location", createdAt: "2024-10-25T13:46:13", updatedAt: "2024-10-25T13:46:13" },
  { id: "7027", name: "Ocala, FL", __typename: "Location", createdAt: "2024-10-25T13:46:20", updatedAt: "2024-10-25T13:46:20" },
  { id: "4245", name: "Sandlake", __typename: "Location", createdAt: "2024-10-25T13:46:19", updatedAt: "2024-10-25T13:46:19" },
  { id: "5563", name: "Morganton", __typename: "Location", createdAt: "2024-10-25T13:46:17", updatedAt: "2024-10-25T13:46:17" },
  { id: "6785", name: "Monroe, GA", __typename: "Location", createdAt: "2024-10-25T13:46:17", updatedAt: "2024-10-25T13:46:17" },
  { id: "10533", name: "Huey Magoo's", __typename: "Location", createdAt: "2025-02-12T07:00:06", updatedAt: "2025-02-12T07:00:06" },
  { id: "4258", name: "Oakwood", __typename: "Location", createdAt: "2024-10-25T13:46:18", updatedAt: "2024-10-25T13:46:18" },
  { id: "4046", name: "Winter Garden", __typename: "Location", createdAt: "2024-10-25T13:46:20", updatedAt: "2024-10-25T13:46:20" },
  { id: "5765", name: "Marion, IL", __typename: "Location", createdAt: "2024-10-25T13:46:15", updatedAt: "2024-10-25T13:46:15" },
  { id: "4148", name: "Oviedo, FL", __typename: "Location", createdAt: "2024-10-25T13:46:18", updatedAt: "2024-10-25T13:46:18" },
  { id: "4886", name: "Prattville, AL", __typename: "Location", createdAt: "2024-10-25T13:46:19", updatedAt: "2024-10-25T13:46:19" },
  { id: "4243", name: "Pineville, NC", __typename: "Location", createdAt: "2024-10-25T13:46:14", updatedAt: "2024-10-25T13:46:14" },
  { id: "4814", name: "Beaumont", __typename: "Location", createdAt: "2024-10-25T13:46:12", updatedAt: "2024-10-25T13:46:12" },
  { id: "4884", name: "Morristown", __typename: "Location", createdAt: "2024-10-25T13:46:17", updatedAt: "2024-10-25T13:46:17" },
  { id: "4261", name: "Loganville", __typename: "Location", createdAt: "2024-10-25T13:46:16", updatedAt: "2024-10-25T13:46:16" },
  { id: "4120", name: "Mandeville", __typename: "Location", createdAt: "2024-10-25T13:46:15", updatedAt: "2024-10-25T13:46:15" },
  { id: "10477", name: "Huey Magoo's", __typename: "Location", createdAt: "2025-02-12T07:00:06", updatedAt: "2025-02-12T07:00:06" },
  { id: "4147", name: "Winter Springs", __typename: "Location", createdAt: "2024-10-25T13:46:20", updatedAt: "2024-10-25T13:46:20" },
  { id: "4260", name: "Huey Magoo's", __typename: "Location", createdAt: "2024-11-14T01:57:00", updatedAt: "2024-11-14T01:57:00" },
  { id: "4242", name: "Huey Magoo's", __typename: "Location", createdAt: "2024-11-14T01:56:59", updatedAt: "2024-11-14T01:56:59" },
  { id: "5805", name: "Statesboro", __typename: "Location", createdAt: "2024-10-25T13:46:19", updatedAt: "2024-10-25T13:46:19" },
  { id: "4350", name: "Brooksville", __typename: "Location", createdAt: "2024-10-25T13:46:12", updatedAt: "2024-10-25T13:46:12" },
  { id: "6809", name: "Worthington", __typename: "Location", createdAt: "2024-10-25T13:46:20", updatedAt: "2024-10-25T13:46:20" },
  { id: "5559", name: "Centerville", __typename: "Location", createdAt: "2024-10-25T13:46:12", updatedAt: "2024-10-25T13:46:12" },
  { id: "4252", name: "Coral Springs", __typename: "Location", createdAt: "2024-10-25T13:46:13", updatedAt: "2024-10-25T13:46:13" },
  { id: "4146", name: "Altamonte", __typename: "Location", createdAt: "2024-10-21T05:11:50", updatedAt: "2024-10-21T05:11:50" },
  { id: "10448", name: "Downtown", __typename: "Location", createdAt: "2024-11-18T07:00:06", updatedAt: "2024-11-18T07:00:06" },
  { id: "4165", name: "Orlando Oakwood", __typename: "Location", createdAt: "2024-10-25T13:46:18", updatedAt: "2024-10-25T13:46:18" },
  { id: "10534", name: "Huey Magoo's", __typename: "Location", createdAt: "2025-02-12T07:00:06", updatedAt: "2025-02-12T07:00:06" },
  { id: "6705", name: "Flowwood", __typename: "Location", createdAt: "2024-10-25T13:46:14", updatedAt: "2024-10-25T13:46:14" },
  { id: "5691", name: "Goose Creek", __typename: "Location", createdAt: "2024-10-25T13:46:14", updatedAt: "2024-10-25T13:46:14" },
  { id: "4238", name: "Montgomery", __typename: "Location", createdAt: "2024-10-25T13:46:17", updatedAt: "2024-10-25T13:46:17" },
  { id: "10497", name: "Huey Magoo's", __typename: "Location", createdAt: "2025-02-12T07:00:06", updatedAt: "2025-02-12T07:00:06" },
  { id: "4867", name: "Ocoee, FL", __typename: "Location", createdAt: "2024-10-25T13:46:18", updatedAt: "2024-10-25T13:46:18" },
  { id: "9559", name: "Circleville", __typename: "Location", createdAt: "2024-10-25T13:46:13", updatedAt: "2024-10-25T13:46:13" },
  { id: "4256", name: "Gainesville", __typename: "Location", createdAt: "2024-10-25T13:46:15", updatedAt: "2024-10-25T13:46:15" },
  { id: "10150", name: "Huey Magoo's", __typename: "Location", createdAt: "2024-11-18T07:00:06", updatedAt: "2024-11-18T07:00:06" },
  // Additional locations from the list provided
  { id: "10093", name: "Mobile Bay", __typename: "Location", createdAt: "2024-10-25T13:46:15", updatedAt: "2024-10-25T13:46:15" },
  { id: "4250", name: "Louisville", __typename: "Location", createdAt: "2024-10-25T13:46:19", updatedAt: "2024-10-25T13:46:19" },
  { id: "4150", name: "Atlanta", __typename: "Location", createdAt: "2024-10-25T13:46:18", updatedAt: "2024-10-25T13:46:18" },
  { id: "4259", name: "Albuquerque", __typename: "Location", createdAt: "2024-10-25T13:46:16", updatedAt: "2024-10-25T13:46:16" },
  { id: "4253", name: "Buffalo", __typename: "Location", createdAt: "2024-10-25T13:46:16", updatedAt: "2024-10-25T13:46:16" },
  { id: "4225", name: "Minneapolis", __typename: "Location", createdAt: "2024-10-25T13:46:14", updatedAt: "2024-10-25T13:46:14" },
  { id: "5359", name: "Des Moines", __typename: "Location", createdAt: "2024-10-25T13:46:12", updatedAt: "2024-10-25T13:46:12" },
  { id: "4254", name: "Sacramento", __typename: "Location", createdAt: "2024-10-25T13:46:16", updatedAt: "2024-10-25T13:46:16" },
  { id: "10476", name: "Huey Magoo's", __typename: "Location", createdAt: "2025-02-12T07:00:06", updatedAt: "2025-02-12T07:00:06" },
  { id: "5346", name: "Richmond", __typename: "Location", createdAt: "2024-10-25T13:46:16", updatedAt: "2024-10-25T13:46:16" },
  { id: "9591", name: "Huey Magoo's", __typename: "Location", createdAt: "2024-11-14T01:57:00", updatedAt: "2024-11-14T01:57:00" },
  { id: "9999", name: "Huey Magoo's", __typename: "Location", createdAt: "2024-11-14T01:57:00", updatedAt: "2024-11-14T01:57:00" },
  { id: "4078", name: "Denver", __typename: "Location", createdAt: "2024-10-25T13:46:15", updatedAt: "2024-10-25T13:46:15" },
  { id: "4251", name: "Milwaukee", __typename: "Location", createdAt: "2024-10-25T13:46:17", updatedAt: "2024-10-25T13:46:17" },
  { id: "5865", name: "Fargo", __typename: "Location", createdAt: "2024-10-25T13:46:12", updatedAt: "2024-10-25T13:46:12" },
  { id: "1825", name: "Seattle", __typename: "Location", createdAt: "2024-10-25T13:46:15", updatedAt: "2024-10-25T13:46:15" },
  { id: "4799", name: "Anchorage", __typename: "Location", createdAt: "2024-10-25T13:46:17", updatedAt: "2024-10-25T13:46:17" },
  { id: "4077", name: "Austin", __typename: "Location", createdAt: "2024-10-25T13:46:14", updatedAt: "2024-10-25T13:46:14" },
  { id: "4247", name: "Indianapolis", __typename: "Location", createdAt: "2024-10-25T13:46:19", updatedAt: "2024-10-25T13:46:19" },
  { id: "4241", name: "Nashville", __typename: "Location", createdAt: "2024-10-25T13:46:19", updatedAt: "2024-10-25T13:46:19" },
  { id: "6658", name: "Cheyenne", __typename: "Location", createdAt: "2024-10-25T13:46:17", updatedAt: "2024-10-25T13:46:17" },
  { id: "4244", name: "Cleveland", __typename: "Location", createdAt: "2024-10-25T13:46:11", updatedAt: "2024-10-25T13:46:11" },
  { id: "4248", name: "Columbus", __typename: "Location", createdAt: "2024-10-25T13:46:13", updatedAt: "2024-10-25T13:46:13" },
  { id: "6778", name: "Fort Worth", __typename: "Location", createdAt: "2024-10-25T13:46:12", updatedAt: "2024-10-25T13:46:12" },
  { id: "4237", name: "Detroit", __typename: "Location", createdAt: "2024-10-25T13:46:14", updatedAt: "2024-10-25T13:46:14" },
  { id: "4149", name: "San Diego", __typename: "Location", createdAt: "2024-10-25T13:46:11", updatedAt: "2024-10-25T13:46:11" },
  { id: "4246", name: "Kansas City", __typename: "Location", createdAt: "2024-10-25T13:46:16", updatedAt: "2024-10-25T13:46:16" }
];

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

  // Filter out already selected locations
  const availableLocations = useMemo(() => {
    return SAMPLE_LOCATIONS.filter(location => !selectedLocationIds.includes(location.id));
  }, [selectedLocationIds]);

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
      <Typography variant="h6" className="p-4 font-semibold bg-blue-50 dark:bg-dark-tertiary dark:text-white border-b">
        Available Locations
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
            {sortedLocations.length > 0 ? (
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
                  All locations have been selected
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box className="p-3 bg-blue-50 border-t flex justify-end items-center dark:bg-dark-tertiary dark:text-neutral-300">
        <Typography variant="body2" className="text-sm">
          {sortedLocations.length} location{sortedLocations.length !== 1 ? 's' : ''} available
        </Typography>
      </Box>
    </Paper>
  );
};

export default LocationTable;