"use client";

import { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  CircularProgress,
  Button,
  Box,
  Typography,
  Tooltip
} from '@mui/material';
import { Download, ArrowUpDown, Maximize2, Minimize2 } from 'lucide-react';
import { downloadCSV } from '@/lib/csvProcessing';

interface CSVDataTableProps {
  data: any[];
  isLoading: boolean;
  error: string | null;
  selectedLocationIds: string[];
  selectedDiscountIds: number[];
  reportType: string;
}

type OrderDirection = 'asc' | 'desc';

const CSVDataTable = ({
  data,
  isLoading,
  error,
  selectedLocationIds,
  selectedDiscountIds,
  reportType
}: CSVDataTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [orderDirection, setOrderDirection] = useState<OrderDirection>('asc');
  const [columns, setColumns] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Reset to first page when data changes
    setPage(0);
    
    // Determine columns from the first data item
    if (data.length > 0) {
      setColumns(Object.keys(data[0]));
    } else {
      setColumns([]);
    }
  }, [data]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (column: string) => {
    const isAsc = orderBy === column && orderDirection === 'asc';
    setOrderDirection(isAsc ? 'desc' : 'asc');
    setOrderBy(column);
  };

  const sortData = (data: any[]) => {
    if (!orderBy) return data;

    return [...data].sort((a, b) => {
      const valueA = a[orderBy];
      const valueB = b[orderBy];
      
      // Handle different data types
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return orderDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }
      
      // Convert to strings for comparison
      const strA = String(valueA ?? '');
      const strB = String(valueB ?? '');
      
      return orderDirection === 'asc' 
        ? strA.localeCompare(strB) 
        : strB.localeCompare(strA);
    });
  };

  const handleDownload = () => {
    // Generate timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${reportType}-${timestamp}.csv`;
    downloadCSV(data, filename);
  };

  if (isLoading) {
    return (
      <Box className="flex items-center justify-center p-8">
        <CircularProgress size={40} />
        <Typography className="ml-4 text-gray-600 dark:text-gray-300">
          Loading CSV data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="p-4 text-center text-red-600 dark:text-red-400">
        <Typography variant="h6">Error loading data</Typography>
        <Typography className="mt-2">{error}</Typography>
      </Box>
    );
  }

  if (!data.length) {
    return (
      <Box className="p-4 text-center text-gray-600 dark:text-gray-300">
        <Typography>No data available. Please select a different date range or report type.</Typography>
      </Box>
    );
  }

  // Apply sorting and pagination
  const sortedData = sortData(data);
  const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Filter info text
  const getFilterInfoText = () => {
    const locationFilter = selectedLocationIds.length > 0 
      ? `${selectedLocationIds.length} location(s) selected` 
      : 'All locations';
    
    const discountFilter = selectedDiscountIds.length > 0 
      ? `${selectedDiscountIds.length} discount ID(s) selected` 
      : 'All discounts';
    
    return `${locationFilter}, ${discountFilter}`;
  };

  return (
    <Paper className="overflow-hidden rounded-lg dark:bg-dark-secondary">
      <Box className="flex items-center justify-between bg-blue-50 p-3 dark:bg-dark-tertiary">
        <div>
          <Typography variant="h6" className="font-semibold dark:text-white">
            Data Preview
          </Typography>
          <Typography variant="body2" className="text-gray-600 dark:text-gray-300">
            {getFilterInfoText()}
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outlined"
            onClick={() => setIsExpanded(!isExpanded)}
            className="border-blue-400 hover:border-blue-500 dark:border-blue-600 dark:hover:border-blue-500"
            size="small"
            startIcon={isExpanded ? (
              <Minimize2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <Maximize2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
          >
            {isExpanded ? "Collapse Table" : "Show All Rows"}
          </Button>
          <Button
            variant="contained"
            startIcon={<Download className="h-4 w-4" />}
            onClick={handleDownload}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Download CSV
          </Button>
        </div>
      </Box>

      <TableContainer
        style={{
          maxHeight: isExpanded ? 'none' : 440,
          transition: 'max-height 0.3s ease-in-out'
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column}
                  className="cursor-pointer font-semibold dark:bg-dark-tertiary dark:text-neutral-300"
                  onClick={() => handleSort(column)}
                >
                  <TableSortLabel
                    active={orderBy === column}
                    direction={orderBy === column ? orderDirection : 'asc'}
                    onClick={() => handleSort(column)}
                    IconComponent={() => <ArrowUpDown className="ml-1 h-4 w-4" />}
                  >
                    {column}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                hover
                className="transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-dark-tertiary"
              >
                {columns.map((column) => (
                  <TableCell key={`${rowIndex}-${column}`} className="dark:text-neutral-300">
                    {row[column] !== null && row[column] !== undefined ? String(row[column]) : ''}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <div className="border-t dark:border-stroke-dark">
        <div className="flex items-center justify-between px-2">
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={data.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            className="dark:bg-dark-secondary dark:text-neutral-300"
          />
          {isExpanded && (
            <Typography variant="caption" className="pr-4 text-blue-600 dark:text-blue-400 flex items-center">
              <Maximize2 className="h-3 w-3 mr-1" /> Showing all rows
            </Typography>
          )}
        </div>
      </div>
    </Paper>
  );
};

export default CSVDataTable;