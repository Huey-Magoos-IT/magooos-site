import Papa from 'papaparse';

// S3 bucket for employee data
const EMPLOYEE_BUCKET_URL = process.env.NEXT_PUBLIC_EMPLOYEE_BUCKET_URL || "https://employee-list-incentivio.s3.us-east-2.amazonaws.com";
const EMPLOYEE_FILE_NAME = "Customer_Export.csv";

// Cache for employee data to avoid fetching it multiple times
let employeeDataCache: Record<string, string> | null = null;

/**
 * Fetches and parses employee data from S3
 * @returns Promise resolving to a mapping of loyalty IDs to employee names
 */
export const fetchEmployeeData = async (): Promise<Record<string, string>> => {
  // Return cached data if available
  if (employeeDataCache) {
    console.log("Using cached employee data");
    return employeeDataCache;
  }

  try {
    console.log(`Fetching employee data from ${EMPLOYEE_BUCKET_URL}/${EMPLOYEE_FILE_NAME}`);
    const csvText = await fetchCSV(`${EMPLOYEE_BUCKET_URL}/${EMPLOYEE_FILE_NAME}`);
    
    // Parse CSV manually to match Python implementation exactly
    const lines = csvText.split('\n');
    const employeeData: Record<string, string> = {};
    
    console.log(`Total lines in employee data: ${lines.length}`);
    console.log(`Header: ${lines[0]}`);
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Split by comma and clean up values - exactly like Python implementation
      const parts = line.split(',');
      if (parts.length >= 3) {
        const loyaltyId = parts[0].trim().replace(/"/g, '');
        const firstName = parts[1].trim().replace(/"/g, '');
        const lastName = parts[2].trim().replace(/"/g, '');
        
        // Only add entries with valid loyalty IDs
        if (loyaltyId) {
          employeeData[loyaltyId] = `${firstName} ${lastName}`.trim();
        }
      }
    }
    
    console.log(`Loaded ${Object.keys(employeeData).length} employee records`);
    
    // Debug: Log a sample of the employee data
    const sampleEntries = Object.entries(employeeData).slice(0, 5);
    console.log("Sample employee data mapping:",
      sampleEntries.map(([id, name]) => `${id}: ${name}`).join(', '));
    
    console.log(`Loaded ${Object.keys(employeeData).length} employee records`);
    
    // Cache the data for future use
    employeeDataCache = employeeData;
    
    return employeeData;
  } catch (error) {
    console.error('Error fetching employee data:', error);
    // Return empty object on error
    return {};
  }
};

/**
 * Gets employee name from loyalty ID
 * @param loyaltyId Loyalty ID to look up
 * @param employeeData Employee data mapping
 * @returns Employee name or "Unknown (ID: xyz)" if not found
 */
export const getEmployeeName = (loyaltyId: string, employeeData: Record<string, string>): string => {
  // Exact match with the Python implementation
  const result = employeeData[loyaltyId] || `Unknown (ID: ${loyaltyId})`;
  
  // Debug logging for unknown IDs
  if (result.includes('Unknown')) {
    console.log(`DEBUG - Unknown employee: Loyalty ID "${loyaltyId}" not found in employee data`);
  }
  
  return result;
};

/**
 * Fetches a list of files from an S3 bucket URL
 * @param bucketUrl URL to the S3 bucket
 * @param folderPath Optional folder path within the bucket (e.g., "loyalty-data-pool/")
 * @returns Promise resolving to an array of filenames
 */
export const fetchFiles = async (bucketUrl: string, folderPath: string = ""): Promise<string[]> => {
  try {
    // Ensure the URL ends with a slash
    const baseUrl = bucketUrl.endsWith('/') ? bucketUrl : `${bucketUrl}/`;
    
    // For S3 bucket listing with a prefix (folder), we need to use the correct query parameter
    const url = folderPath
      ? `${baseUrl}?list-type=2&prefix=${encodeURIComponent(folderPath)}`
      : baseUrl;
      
    console.log("Fetching S3 files from URL:", url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`S3 request failed: ${response.status} ${response.statusText}`);
    }
    
    const str = await response.text();
    console.log("S3 response:", str.substring(0, 200) + "..."); // Log first 200 chars for debugging
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(str, "text/xml");
    
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("Invalid XML response from S3");
    }

    // S3 XML response format changed in list-type=2, so we need to look for Contents/Key
    const contents = xmlDoc.getElementsByTagName("Contents");
    const fileList = Array.from(contents)
      .map(content => {
        const keyElement = content.getElementsByTagName("Key")[0];
        return keyElement ? keyElement.textContent || "" : "";
      })
      .filter(Boolean)
      // If folder path is provided, filter to only include files within that folder and remove the prefix
      .filter(key => folderPath ? key.startsWith(folderPath) : true)
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
 * @param reloadAfterDownload Whether to reload the page after download (default: true)
 */
export const downloadCSV = (data: any[], filename: string, reloadAfterDownload: boolean = true): void => {
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
  
  // Reload the page after a short delay to ensure download has started
  if (reloadAfterDownload) {
    setTimeout(() => {
      window.location.reload();
    }, 1000); // 1 second delay should be sufficient for the download to begin
  }
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
  
  // Look for pattern of any-prefix-MM-DD-YYYY.csv (for reporting page files)
  dateMatch = filename.match(/.*?-(\d{2})-(\d{2})-(\d{4})\.csv$/);
  if (dateMatch) {
    const month = dateMatch[1];
    const day = dateMatch[2];
    const year = dateMatch[3];
    console.log(`Extracted date from reporting file: ${month}/${day}/${year}`);
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
  
  console.log(`Could not extract date from filename: ${filename}`);
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
 * Enhance CSV data with location names
 * Maps numeric location IDs to actual location names in the data
 * @param data Array of data objects
 * @param locations Array of location objects with id and name properties
 * @returns Enhanced data with location names
 */
export const enhanceCSVWithLocationNames = (
  data: any[],
  locations: { id: string; name: string }[] = []
): any[] => {
  if (!data.length || !locations.length) return data;
  
  // Create a mapping of location IDs to location names
  const locationMap: Record<string, string> = {};
  locations.forEach(loc => {
    locationMap[loc.id] = loc.name;
  });
  
  return data.map(row => {
    const newRow = { ...row };
    
    // Check if row has numeric location ID but no location name
    const storeId = row['LocationID'] || row['Location ID'] || row['Store'];
    if (storeId && !isNaN(Number(storeId)) && locationMap[String(storeId)]) {
      // Add a new column with the proper location name
      newRow['Location Name'] = locationMap[String(storeId)];
      // Keep the original ID for reference
      newRow['LocationID'] = storeId;
    }
    
    return newRow;
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
  // Debug info
  console.log("FILTER DATA - Starting with rows:", data.length);
  console.log("FILTER DATA - Selected location IDs:", locationIds);
  console.log("FILTER DATA - Selected discount IDs:", discountIds);
  
  // If no filters applied, return all data
  if (locationIds.length === 0 && discountIds.length === 0) {
    console.log("FILTER DATA - No filters applied, returning all data");
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
  
  console.log("FILTER DATA - Location names for filtering:", locationNames);
  
  // Sample the first row to see what columns are available
  if (data.length > 0) {
    console.log("FILTER DATA - Sample row columns:", Object.keys(data[0]));
    console.log("FILTER DATA - Sample Store value:", data[0]['Store']);
  }
  
  const filteredData = data.filter(row => {
    
    // Apply location filter if needed
    if (locationIds.length > 0) {
      // Get the store value from the CSV row (might be a name or an ID)
      const storeValue = row['Store'] || row['Location'] || row['LocationID'] || row['Location ID'] || '';
      const storeValueStr = String(storeValue).trim();
      
      if (!storeValueStr) return false;
      
      // Check for match using multiple strategies
      let locationMatch = false;
      
      // Strategy 1: Direct ID match (CSV record has a location ID as a string)
      if (!locationMatch) {
        locationMatch = locationIds.some(id => storeValueStr === id);
        if (locationMatch) {
          console.log(`FILTER DATA - Direct ID match: ${storeValueStr} === ${locationIds.find(id => storeValueStr === id)}`);
        }
      }
      
      // Strategy 2: Name match (CSV record has a location name)
      if (!locationMatch && locationNames.length > 0) {
        locationMatch = locationNames.some(name => {
          if (!name) return false;
          const nameStr = String(name);
          
          const matches = (
            storeValueStr.includes(nameStr) ||
            // Also check for case where name is like "Winter Garden" but CSV has "Winter Garden, FL"
            (nameStr.includes(',') ? storeValueStr.includes(nameStr.split(',')[0].trim()) : false)
          );
          
          if (matches) {
            console.log(`FILTER DATA - Name match: ${storeValueStr} includes ${nameStr}`);
          }
          
          return matches;
        });
      }
      
      // Strategy 3: Numeric location code match (CSV has numeric codes like "1825")
      if (!locationMatch) {
        // In case the CSV has numeric location codes (IDs without leading/trailing text)
        // that match our locationIds
        locationMatch = locationIds.includes(storeValueStr);
        if (locationMatch) {
          console.log(`FILTER DATA - Numeric code match: ${storeValueStr} in locationIds`);
        }
      }
      
      if (!locationMatch) return false;
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
      
      console.log("FILTER DATA - Using default discounts:", usingDefaultDiscounts);
      
      // Only apply discount filtering if the user has changed the defaults
      if (!usingDefaultDiscounts) {
        // Look for exact discount ID matches in relevant columns
        // Safely convert discount IDs to numbers for comparison
        const discountIdMatches = (() => {
          try {
            const discountId1 = row['Discount ID'] ? Number(row['Discount ID']) : null;
            const discountId2 = row['DiscountId'] ? Number(row['DiscountId']) : null;
            const discountId3 = row['DISCL ID'] ? Number(row['DISCL ID']) : null;
            
            // Log the discount IDs found in the row
            if (discountId1 !== null || discountId2 !== null || discountId3 !== null) {
              console.log(`FILTER DATA - Row discount IDs: ${discountId1}, ${discountId2}, ${discountId3}`);
            }
            
            const matches = (
              (discountId1 !== null && !isNaN(discountId1) && discountIds.includes(discountId1)) ||
              (discountId2 !== null && !isNaN(discountId2) && discountIds.includes(discountId2)) ||
              (discountId3 !== null && !isNaN(discountId3) && discountIds.includes(discountId3))
            );
            
            return matches;
          } catch (e) {
            console.warn('Error comparing discount IDs:', e);
            return false;
          }
        })();
        
        if (!discountIdMatches) return false;
      }
    }
    
    return true;
  });
  
  console.log(`FILTER DATA - Filtered from ${data.length} to ${filteredData.length} rows`);
  return filteredData;
};

/**
 * Enhance CSV data with employee names
 * Maps loyalty IDs to actual employee names in the data
 * @param data Array of data objects
 * @param employeeData Mapping of loyalty IDs to employee names
 * @returns Enhanced data with employee names
 */
export const enhanceCSVWithEmployeeNames = (
  data: any[],
  employeeData: Record<string, string> = {}
): any[] => {
  if (!data.length || Object.keys(employeeData).length === 0) {
    console.log("DEBUG - No data or employee data to enhance");
    return data;
  }
  
  console.log(`Enhancing CSV data with employee names (${data.length} rows, ${Object.keys(employeeData).length} employee records)`);
  
  // Track statistics for debugging
  let totalRows = 0;
  let enhancedRows = 0;
  let unknownRows = 0;
  let missingLoyaltyIdRows = 0;
  
  const result = data.map(row => {
    totalRows++;
    const newRow = { ...row };
    
    // Check for loyalty ID in various possible column names - exactly like Python implementation
    const loyaltyId = row['Loyalty ID'] || '';
    
    if (!loyaltyId) {
      missingLoyaltyIdRows++;
      console.log(`DEBUG - Row ${totalRows}: Missing loyalty ID`);
      return newRow;
    }
    
    // Get employee name using the exact same function as Python
    const employeeName = getEmployeeName(loyaltyId, employeeData);
    
    // Track if this was an unknown employee
    if (employeeName.includes('Unknown')) {
      unknownRows++;
    } else {
      enhancedRows++;
    }
    
    // Replace "Unknown" in Guest Name column with actual employee name
    if (row['Guest Name'] && row['Guest Name'].includes('Unknown')) {
      newRow['Guest Name'] = employeeName;
    }
    
    // If there's no Guest Name column, add it
    if (!row['Guest Name']) {
      newRow['Guest Name'] = employeeName;
    }
    
    // Keep the original loyalty ID for reference
    newRow['Loyalty ID'] = loyaltyId;
    
    return newRow;
  });
  
  // Log statistics for debugging
  console.log(`DEBUG - CSV Enhancement Stats:
  - Total rows processed: ${totalRows}
  - Rows with enhanced names: ${enhancedRows}
  - Rows with unknown names: ${unknownRows}
  - Rows missing loyalty IDs: ${missingLoyaltyIdRows}
  - Success rate: ${enhancedRows > 0 ? Math.round((enhancedRows / (enhancedRows + unknownRows)) * 100) : 0}%`);
  
  return result;
};