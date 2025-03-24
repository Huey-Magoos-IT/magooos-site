import Papa from 'papaparse';

/**
 * Fetches a list of files from an S3 bucket URL
 * @param bucketUrl URL to the S3 bucket
 * @param folderPath Optional folder path within the bucket (e.g., "loyalty-data-pool/")
 * @returns Promise resolving to an array of filenames
 */
export const fetchFiles = async (bucketUrl: string, folderPath: string = ""): Promise<string[]> => {
  try {
    // Ensure the URL ends with a slash if a folder path is provided
    const baseUrl = bucketUrl.endsWith('/') ? bucketUrl : `${bucketUrl}/`;
    // Make the request to the specific folder
    const response = await fetch(`${baseUrl}${folderPath}`);
    const str = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(str, "text/xml");
    
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("Invalid XML response from S3");
    }

    const keys = xmlDoc.getElementsByTagName("Key");
    // Get files and reverse the order so newest files appear first
    // Filter to only include files within the specified folder
    const fileList = Array.from(keys)
      .map(key => key.textContent || "")
      .filter(key => folderPath ? key.startsWith(folderPath) : true)
      // Remove the folder prefix to get just the filename if a folder path is provided
      .map(key => folderPath ? key.substring(folderPath.length) : key)
      .filter(Boolean)
      .reverse(); // Reverse to show newest files first
    
    return fileList;
  } catch (error) {
    console.error("Error fetching files from S3:", error);
    throw error;
  }
};

export interface ParsedCSVData {
  data: any[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
}

/**
 * Fetches a CSV file from a URL
 * @param url URL of the CSV file to fetch
 * @returns The CSV file content as a string
 */
export const fetchCSV = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error fetching CSV:', error);
    throw error;
  }
};

/**
 * Parses a CSV string to an array of objects
 * @param csvText The CSV content as a string
 * @param hasHeader Whether the CSV has a header row
 * @returns Promise resolving to the parsed data
 */
export const parseCSV = (csvText: string, hasHeader = true): Promise<ParsedCSVData> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: hasHeader,
      dynamicTyping: true, // Convert numerical values automatically
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          data: results.data,
          errors: results.errors,
          meta: results.meta
        });
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
};

/**
 * Fetches and parses a CSV file from a URL
 * @param url URL of the CSV file to fetch and parse
 * @returns Promise resolving to the parsed data
 */
export const fetchAndParseCSV = async (url: string): Promise<ParsedCSVData> => {
  const csvText = await fetchCSV(url);
  return parseCSV(csvText);
};

/**
 * Process multiple CSV files and combine their data
 * @param urls Array of URLs to CSV files or an array of filenames
 * @param bucketUrl Optional S3 bucket URL
 * @param folderPath Optional folder path within the bucket
 * @returns Promise resolving to the combined data from all CSVs
 */
export const processMultipleCSVs = async (
  urls: string[],
  bucketUrl?: string,
  folderPath?: string
): Promise<any[]> => {
  try {
    // Process files sequentially to avoid overwhelming the browser
    let allData: any[] = [];
    
    for (const urlOrFilename of urls) {
      // If bucketUrl and folderPath are provided, construct the full URL
      const url = bucketUrl && folderPath
        ? `${bucketUrl}/${folderPath}${urlOrFilename}`
        : urlOrFilename;
        
      const result = await fetchAndParseCSV(url);
      allData = [...allData, ...result.data];
    }
    
    return allData;
  } catch (error) {
    console.error('Error processing multiple CSVs:', error);
    throw error;
  }
};

/**
 * Converts parsed data back to CSV string for download
 * @param data Array of objects representing CSV data
 * @returns CSV string
 */
export const convertToCSV = (data: any[]): string => {
  return Papa.unparse(data);
};

/**
 * Creates and triggers download of a CSV file
 * @param data Array of objects to convert to CSV
 * @param filename Name for the downloaded file
 */
export const downloadCSV = (data: any[], filename: string): void => {
  const csvContent = convertToCSV(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename || 'export.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Extracts date from filename in various formats
 * @param filename Filename containing date
 * @returns Date object or null if no date found
 */
export const extractDateFromFilename = (filename: string): Date | null => {
  // Look for pattern of loyalty_data_MM-DD-YYYY.csv
  let dateMatch = filename.match(/loyalty_data_(\d{2})-(\d{2})-(\d{4})\.csv$/);
  if (dateMatch) {
    const month = dateMatch[1];
    const day = dateMatch[2];
    const year = dateMatch[3];
    return new Date(`${month}/${day}/${year}`);
  }
  
  // Look for pattern of 8 digits in a row which would be MMDDYYYY (legacy format)
  dateMatch = filename.match(/(\d{8})\.csv$/);
  if (dateMatch) {
    const dateStr = dateMatch[1];
    const month = dateStr.substring(0, 2);
    const day = dateStr.substring(2, 4);
    const year = dateStr.substring(4, 8);
    return new Date(`${month}/${day}/${year}`);
  }
  
  return null;
};

/**
 * Filter a list of files by date range and data type
 * @param files Array of filenames
 * @param startDate Start date for filtering
 * @param endDate End date for filtering
 * @param dataType Type of data ('loyalty_data', 'location-data', etc.)
 * @param department Optional department prefix for filtering (e.g., 'data', 'reporting')
 * @returns Array of filtered filenames
 */
export const filterFilesByDateAndType = (
  files: string[],
  startDate: Date | null,
  endDate: Date | null,
  dataType: string,
  department?: string
): string[] => {
  if (!startDate || !endDate) return [];
  
  return files.filter(filename => {
    // Check if filename matches the data type pattern
    // Handle both formats: loyalty_data_MM-DD-YYYY.csv and legacy format
    const isLoyaltyData = filename.startsWith('loyalty_data_');
    const legacyPattern = department ? `${department}-${dataType}` : dataType;
    const matchesPattern = isLoyaltyData || filename.startsWith(legacyPattern);
    
    if (!matchesPattern) return false;
    
    // Extract and check date
    const fileDate = extractDateFromFilename(filename);
    if (!fileDate) return false;
    
    // Check if file date is within the selected range
    // Note: setHours(0,0,0,0) to ignore time component in comparison
    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    const end = new Date(endDate);
    end.setHours(23,59,59,999);
    
    return fileDate >= start && fileDate <= end;
  });
};

/**
 * Filter data by location and discount IDs
 * @param data Array of data objects
 * @param locationIds Array of location IDs to filter by
 * @param discountIds Array of discount IDs to filter by
 * @param locations Array of location objects with id and name properties for mapping IDs to names
 * @returns Filtered data
 */
export const filterData = (
  data: any[],
  locationIds: string[] = [],
  discountIds: number[] = [],
  locations: { id: string; name: string }[] = []
): any[] => {
  // If no filters applied, return all data
  if (locationIds.length === 0 && discountIds.length === 0) {
    return data;
  }

  // Create a mapping of location IDs to location names
  const locationNameMap: Record<string, string> = {};
  locations.forEach(loc => {
    locationNameMap[loc.id] = loc.name;
  });
  
  // Get location names that correspond to the selected location IDs
  const locationNames = locationIds
    .map(id => locationNameMap[id])
    .filter(Boolean);
  
  return data.filter(row => {
    
    // Apply location filter if needed
    if (locationIds.length > 0 && locationNames.length > 0) {
      // Check if the 'Store' field in CSV matches any of our location names
      const storeValue = row['Store'];
      if (!storeValue) return false;
      
      // Do a partial match since CSV data might have additional formatting
      const locationMatches = locationNames.some(name =>
        storeValue.includes(name) ||
        // Also check for case where name is like "Winter Garden" but CSV has "Winter Garden, FL"
        (name.includes(',') ? storeValue.includes(name.split(',')[0].trim()) : false)
      );
      
      if (!locationMatches) return false;
    }
    
    /**
     * Apply discount ID filtering if needed
     *
     * IMPORTANT: We handle default discount IDs as a special case:
     * When a user has the default discount IDs selected (which is the initial state),
     * we assume they want to see ALL records regardless of discount.
     *
     * This approach was chosen because:
     * 1. It's more intuitive for users - selecting defaults = show everything
     * 2. It handles the mismatch between discount IDs and percentage strings in the data
     * 3. It preserves backward compatibility with existing reports
     */
    if (discountIds.length > 0) {
      // Detect if we're using the default set of discount IDs
      const usingDefaultDiscounts = discountIds.length === 7 &&
        discountIds.includes(77406) &&
        discountIds.includes(135733) &&
        discountIds.includes(135736) &&
        discountIds.includes(135737) &&
        discountIds.includes(135738) &&
        discountIds.includes(135739) &&
        discountIds.includes(135910);
      
      // Only apply discount filtering if the user has changed the defaults
      if (!usingDefaultDiscounts) {
        // Look for exact discount ID matches in relevant columns
        const discountIdMatches =
          (row['Discount ID'] && discountIds.includes(Number(row['Discount ID']))) ||
          (row['DiscountId'] && discountIds.includes(Number(row['DiscountId'])));
        
        if (!discountIdMatches) return false;
      }
    }
    
    return true;
  });
};