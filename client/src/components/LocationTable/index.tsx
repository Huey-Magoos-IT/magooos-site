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

// Define the location type
export interface Location {
  id: string;
  name: string;
}

// Hard-coded locations for now
// In the future, this will come from DynamoDB
const SAMPLE_LOCATIONS: Location[] = [
  { id: "1767", name: "San Francisco Main" },
  { id: "1825", name: "Seattle Downtown" },
  { id: "4045", name: "Chicago Loop" },
  { id: "4046", name: "Portland Central" },
  { id: "4077", name: "Austin HQ" },
  { id: "4078", name: "Denver Office" },
  { id: "4120", name: "New York Midtown" },
  { id: "4145", name: "Boston Harbor" },
  { id: "4146", name: "Miami Beach" },
  { id: "4147", name: "Dallas Center" },
  { id: "4148", name: "Los Angeles West" },
  { id: "4149", name: "San Diego Coast" },
  { id: "4150", name: "Atlanta Downtown" },
  { id: "4165", name: "Philadelphia Main" },
  { id: "4166", name: "Las Vegas Strip" },
  { id: "4167", name: "Phoenix Central" },
  { id: "4225", name: "Minneapolis North" },
  { id: "4237", name: "Detroit East" },
  { id: "4238", name: "Houston Medical" },
  { id: "4241", name: "Nashville Music" },
  { id: "4242", name: "Pittsburgh Steel" },
  { id: "4243", name: "Cincinnati River" },
  { id: "4244", name: "Cleveland Lakefront" },
  { id: "4245", name: "St. Louis Arch" },
  { id: "4246", name: "Kansas City BBQ" },
  { id: "4247", name: "Indianapolis Speedway" },
  { id: "4248", name: "Columbus Capital" },
  { id: "4249", name: "Salt Lake City Mountains" },
  { id: "4250", name: "Louisville Derby" },
  { id: "4251", name: "Milwaukee Brewery" },
  { id: "4252", name: "Oklahoma City Thunder" },
  { id: "4253", name: "Buffalo Wings" },
  { id: "4254", name: "Sacramento Capitol" },
  { id: "4255", name: "Orlando Theme" },
  { id: "4256", name: "Raleigh Research" },
  { id: "4258", name: "Tucson Desert" },
  { id: "4259", name: "Albuquerque Heights" },
  { id: "4260", name: "Omaha Steaks" },
  { id: "4261", name: "Tulsa Oil" },
  // Adding more sample locations
  { id: "4350", name: "Honolulu Beach" },
  { id: "4799", name: "Anchorage North" },
  { id: "4814", name: "Boise Mountain" },
  { id: "4849", name: "Charleston Historic" },
  { id: "4867", name: "Santa Fe Art" },
  { id: "4868", name: "Memphis Blues" },
  { id: "4872", name: "Savannah Historic" },
  { id: "4878", name: "Providence College" },
  { id: "4884", name: "Asheville Mountains" },
  { id: "4885", name: "Portland Maine" },
  { id: "4886", name: "Baton Rouge Cajun" },
  { id: "4887", name: "Madison Lakes" },
  { id: "5346", name: "Richmond Historic" },
  { id: "5359", name: "Des Moines River" },
  { id: "5559", name: "Jackson Capital" },
  { id: "5561", name: "Birmingham Steel" },
  { id: "5563", name: "Little Rock Capital" },
  { id: "5691", name: "Columbia River" },
  { id: "5765", name: "Spokane Falls" },
  { id: "5805", name: "Lexington Horses" },
  { id: "5865", name: "Fargo North" },
  { id: "6658", name: "Cheyenne Frontier" },
  { id: "6705", name: "Eugene College" },
  { id: "6778", name: "Fort Worth Stockyards" },
  { id: "6785", name: "Rochester Medical" },
  { id: "6809", name: "Wichita Plains" },
  { id: "7025", name: "Sioux Falls" },
  { id: "7027", name: "Montgomery Capital" },
  { id: "9559", name: "Knoxville Mountain" },
  { id: "9591", name: "Fort Collins Brewery" },
  { id: "9905", name: "Dayton Aviation" },
  { id: "9999", name: "Huntsville Rocket" },
  { id: "10093", name: "Mobile Bay" },
  { id: "10150", name: "Chattanooga River" }
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