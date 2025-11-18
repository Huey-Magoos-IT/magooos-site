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
import { DEFAULT_DISCOUNT_IDS } from '@/lib/constants';

interface CSVDataTableProps {
  data: any[];
  isLoading: boolean;
  error: string | null;
  selectedLocationIds: string[];
  selectedDiscountIds: number[];
  reportType: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

type OrderDirection = 'asc' | 'desc';

const CSVDataTable = ({
  data,
  isLoading,
  error,
  selectedLocationIds,
  selectedDiscountIds,
  reportType,
  startDate,
  endDate
}: CSVDataTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [orderDirection, setOrderDirection] = useState<OrderDirection>('asc');
  const [columns, setColumns] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  // Function to parse and render cell content, including hyperlinks
  const renderCellContent = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // Check if the value is an Excel-style hyperlink formula
    // Format: =HYPERLINK("URL","text")
    const hyperlinkMatch = stringValue.match(/=HYPERLINK\("([^"]+)","([^"]+)"\)/);

    if (hyperlinkMatch) {
      const url = hyperlinkMatch[1];
      const text = hyperlinkMatch[2];

      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--theme-primary)] hover:opacity-80 hover:underline"
        >
          {text}
        </a>
      );
    }

    return stringValue;
  };

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
    // Helper function to format date as MM-DD-YYYY
    const formatDate = (date: Date | null | undefined) => {
      if (!date) return null;
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}-${day}-${year}`;
    };
    
    // Use start and end dates if available, otherwise use current date
    let dateStr = '';
    
    if (startDate && endDate) {
      const startFormatted = formatDate(startDate);
      const endFormatted = formatDate(endDate);
      
      // If start and end dates are the same, use single date format
      if (startFormatted === endFormatted) {
        dateStr = `_${startFormatted}`;
      } else {
        // Otherwise use range format
        dateStr = `_${startFormatted}_to_${endFormatted}`;
      }
    } else {
      // Fallback to current date if no date range provided
      const now = new Date();
      const formattedDate = formatDate(now);
      dateStr = `_${formattedDate}`;
    }
    
    // Add filter indicator if locations or discounts are selected
    if ((selectedLocationIds && selectedLocationIds.length > 0) ||
        (selectedDiscountIds && selectedDiscountIds.length > 0 &&
         !isDefaultDiscountSelection(selectedDiscountIds))) {
      dateStr += '_filtered';
    }
    
    // Use the correct naming convention: loyalty_data_MM-DD-YYYY.csv
    const filename = reportType === 'loyalty_data'
      ? `loyalty_data${dateStr}.csv`
      : `${reportType}${dateStr}.csv`;
      
    // Call downloadCSV with reloadAfterDownload=true to ensure page reloads after download
    downloadCSV(data, filename, true);
  };
  
  // Helper function to check if using default discount IDs
  const isDefaultDiscountSelection = (discountIds: number[]) => {
    // Compare against the centralized default discount IDs
    if (discountIds.length !== DEFAULT_DISCOUNT_IDS.length) return false;
    return DEFAULT_DISCOUNT_IDS.every(id => discountIds.includes(id));
  };

  if (isLoading) {
    return (
      <Box className="flex items-center justify-center p-8">
        <CircularProgress size={40} sx={{ color: 'var(--theme-primary)' }} />
        <Typography className="ml-4 text-[var(--theme-text-secondary)]">
          Loading CSV data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="p-4 text-center text-[var(--theme-error)]">
        <Typography variant="h6">Error loading data</Typography>
        <Typography className="mt-2">{error}</Typography>
      </Box>
    );
  }

  if (!data.length) {
    return (
      <Box className="p-4 text-center text-[var(--theme-text-secondary)]">
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
    <Paper className="overflow-hidden rounded-lg border border-[var(--theme-border)] shadow-md bg-[var(--theme-surface)]">
      <Box className="flex items-center justify-between bg-[var(--theme-primary)]/10 p-3 border-b border-[var(--theme-primary)]/20">
        <div>
          <Typography variant="h6" className="font-semibold text-[var(--theme-text)]">
            Data Preview
          </Typography>
          <Typography variant="body2" className="text-[var(--theme-primary)] font-medium">
            {getFilterInfoText()}
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outlined"
            onClick={() => setIsExpanded(!isExpanded)}
            size="small"
            startIcon={isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
            sx={{
              color: 'var(--theme-primary)',
              borderColor: 'var(--theme-primary)',
              '&:hover': {
                backgroundColor: 'var(--theme-primary-light)',
                borderColor: 'var(--theme-primary)'
              }
            }}
          >
            {isExpanded ? "Collapse Table" : "Show All Rows"}
          </Button>
          <Button
            variant="contained"
            startIcon={<Download className="h-4 w-4" />}
            onClick={handleDownload}
            sx={{
              background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))',
              color: 'var(--theme-text-on-primary)',
              py: 1,
              '&:hover': {
                boxShadow: 4
              }
            }}
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
                  className="cursor-pointer font-semibold bg-[var(--theme-surface-hover)] text-[var(--theme-text)] border-b-2 border-[var(--theme-primary)]/30"
                  onClick={() => handleSort(column)}
                >
                  <TableSortLabel
                    active={orderBy === column}
                    direction={orderBy === column ? orderDirection : 'asc'}
                    onClick={() => handleSort(column)}
                    IconComponent={() => <ArrowUpDown className="ml-1 h-4 w-4 text-[var(--theme-primary)]" />}
                  >
                    <span className="text-[var(--theme-text)]">{column}</span>
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
                className={`
                  transition-colors duration-200
                  ${rowIndex % 2 === 0 ? 'bg-[var(--theme-surface)]' : 'bg-[var(--theme-surface-hover)]'}
                `}
                sx={{
                  '&:hover': {
                    backgroundColor: 'var(--theme-primary-light) !important'
                  }
                }}
              >
                {columns.map((column) => (
                  <TableCell key={`${rowIndex}-${column}`} className="text-[var(--theme-text)]">
                    {renderCellContent(row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <div className="border-t border-[var(--theme-border)]">
        <div className="flex items-center justify-between px-2">
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={data.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              color: 'var(--theme-text)',
              '& .MuiTablePagination-selectLabel': {
                color: 'var(--theme-text)'
              },
              '& .MuiTablePagination-displayedRows': {
                color: 'var(--theme-text)'
              },
              '& .MuiTablePagination-select': {
                color: 'var(--theme-text)'
              },
              '& .MuiTablePagination-selectIcon': {
                color: 'var(--theme-text)'
              },
              '& .MuiIconButton-root': {
                color: 'var(--theme-text)'
              }
            }}
            labelRowsPerPage={<span className="text-[var(--theme-text)]">Rows per page:</span>}
          />
          {isExpanded && (
            <Typography variant="caption" className="pr-4 text-[var(--theme-primary)] flex items-center font-medium">
              <Maximize2 className="h-3 w-3 mr-1" /> Showing all rows
            </Typography>
          )}
        </div>
      </div>
    </Paper>
  );
};

export default CSVDataTable;