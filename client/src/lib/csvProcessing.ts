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
    const csvUrl = `${EMPLOYEE_BUCKET_URL}/${EMPLOYEE_FILE_NAME}`;
    console.log(`Fetching employee data from ${csvUrl}`);
    const csvText = await fetchCSV(csvUrl);
    
    // Define a config for parsing employee data using processCSVWithMapping
    const employeeConfig: CSVProcessingConfig = {
      additionalFields: {
        loyaltyId: { sourceNames: ['Loyalty ID', 'CUSTOMER ID', 'customer_id'], dataType: 'string' },
        firstName: { sourceNames: ['First Name', 'FNAME', 'first_name'], dataType: 'string' },
        lastName: { sourceNames: ['Last Name', 'LNAME', 'last_name'], dataType: 'string' },
        // Add other fields you might need from this CSV in the future
      },
    };

    // Process the CSV using the generic mapping function
    // This assumes the employee CSV has a header
    const parsedEmployees = await processCSVWithMapping(csvText, employeeConfig, true);
    
    const employeeData: Record<string, string> = {};
    parsedEmployees.forEach(employee => {
      const loyaltyId = employee.loyaltyId;
      const firstName = employee.firstName || '';
      const lastName = employee.lastName || '';
      
      if (loyaltyId) {
        employeeData[loyaltyId] = `${firstName} ${lastName}`.trim();
      }
    });

    console.log(`Loaded ${Object.keys(employeeData).length} employee records`);
    
    // Debug: Log a sample of the employee data
    const sampleEntries = Object.entries(employeeData).slice(0, 5);
    console.log("Sample employee data mapping:",
      sampleEntries.map(([id, name]) => `${id}: ${name}`).join(', '));
    
    // Cache the data for future use
    employeeDataCache = employeeData;
    
    return employeeData;
  } catch (error) {
    console.error('Error fetching employee data:', error);
    // Return empty object on error to prevent cascading errors if employee data is non-critical
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

// Defines how to access a specific field within the CSV data,
// potentially looking for it under multiple header names.
export interface FieldAccessor {
  sourceNames: string | string[]; // Original CSV header(s) for this field. If array, uses the first one found.
  dataType?: 'string' | 'number' | 'date' | 'boolean'; // Optional: For explicit type coercion if PapaParse's dynamicTyping is insufficient for an operation.
  defaultValue?: any; // Optional: Default value if the field is not found or is empty after trimming.
}

/**
 * Configuration object to define how CSV data should be processed for specific needs.
 * This allows functions like filtering and data enhancement to dynamically find
 * the columns they need based on potential header names provided in the CSV.
 * 
 * Fields not explicitly defined in the config (e.g., via `additionalFields` or
 * specific operational fields like `locationIdentifierField`) are passed through
 * from the original CSV with their original header names.
 */
// Configuration for how to interpret a CSV for specific operational needs.
// Functions like filterData or enhanceCSVWithX will use this config
// to know which columns from the CSV correspond to the data they need.
// All other columns from the CSV are passed through as-is with their original header names.
export interface CSVProcessingConfig {
  // --- Fields for Core Operations (e.g., Filtering, Grouping) ---
  locationIdentifierField?: FieldAccessor; // How to find the location identifier (e.g., 'Store', 'Location ID')
  discountIdentifierField?: FieldAccessor; // How to find the discount identifier (e.g., 'DSCL ID', 'Order Type')
  employeeIdentifierField?: FieldAccessor; // How to find the employee/user identifier (e.g., 'Loyalty ID', 'Cashier Qu Backend ID')
  transactionDateField?: FieldAccessor;    // How to find the primary date for the record
  dailyUsageCountField?: FieldAccessor;  // How to find the daily usage count

  // --- Fields for Data Enhancement ---
  guestNameField?: FieldAccessor; // Which field represents the guest/customer name, to be potentially enhanced

  // --- General Purpose Fields ---
  // For columns that might be used for display or generic calculations,
  // allowing type hints or aliasing if needed, without being tied to a specific operation.
  // The key would be the desired output name if different, or original name if just for type hint.
  // Example: { 'checkTotalAmount': { sourceNames: 'CHK Total', dataType: 'number' } }
  // If not specified here, columns are used with their original names and PapaParse's dynamic typing.
  additionalFields?: {
    [outputFieldName: string]: FieldAccessor;
  };
}
/**
 * Helper function to retrieve and optionally type-coerce a field value from a row
 * based on a FieldAccessor.
 * @param row The data row (object with string keys).
 * @param accessor The FieldAccessor defining how to get the value.
 * @returns The retrieved and optionally coerced value, or undefined if not found.
 */
export const getFieldValue = (row: Record<string, any>, accessor?: FieldAccessor): any => {
  if (!accessor) {
    return undefined;
  }

  let rawValue: any;
  if (Array.isArray(accessor.sourceNames)) {
    for (const name of accessor.sourceNames) {
      if (row[name] !== undefined) {
        rawValue = row[name];
        break;
      }
    }
  } else {
    rawValue = row[accessor.sourceNames];
  }

  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    return accessor.defaultValue !== undefined ? accessor.defaultValue : undefined;
  }

  if (accessor.dataType) {
    switch (accessor.dataType) {
      case 'string':
        return String(rawValue);
      case 'number':
        const num = Number(rawValue);
        return isNaN(num) ? (accessor.defaultValue !== undefined ? accessor.defaultValue : undefined) : num;
      case 'boolean':
        if (typeof rawValue === 'string') {
          const lowerVal = rawValue.toLowerCase();
          if (lowerVal === 'true' || lowerVal === 'yes' || lowerVal === '1') return true;
          if (lowerVal === 'false' || lowerVal === 'no' || lowerVal === '0') return false;
        }
        return Boolean(rawValue);
      case 'date':
        const date = new Date(rawValue);
        // Check if date is valid
        return isNaN(date.getTime()) ? (accessor.defaultValue !== undefined ? accessor.defaultValue : undefined) : date;
      default:
        return rawValue; // Should not happen with defined types
    }
  }
  return rawValue; // Return raw value if no explicit dataType or if dynamicTyping from PapaParse is sufficient
};

// Use Papa.ParseResult directly or ensure ParsedCSVData matches its structure.
// For simplicity, let's align ParsedCSVData with Papa.ParseResult's relevant fields.
// Note: The actual type for data in ParseResult is T[], so any[] is a common usage.
export interface ParsedCSVData<T = any> {
  data: T[];
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
    // Add a cache-busting parameter to the URL
    const uniqueUrl = `${url}${url.includes('?') ? '&' : '?'}cacheBuster=${new Date().getTime()}`;
    const response = await fetch(uniqueUrl);
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
export const parseCSV = <T = any>(csvText: string, hasHeader = true): Promise<ParsedCSVData<T>> => {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(csvText, { // Specify the type for Papa.parse
      header: hasHeader,
      dynamicTyping: true, // Convert numerical values automatically
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<T>) => { // Use Papa.ParseResult<T>
        resolve({
          data: results.data,
          errors: results.errors,
          meta: results.meta
        });
      },
      error: (error: Error, file?: File | any) => { // Adjusted to match PapaParse's expected signature
        // The 'error' object here is a standard Error.
        // If Papa.ParseError has more specific fields, you might need to cast or check its type.
        // For now, we reject with the standard Error object.
        console.error("PapaParse Error:", error, "File:", file);
        reject(error);
      }
    });
  });
};

/**
/**
 * Parses CSV text and applies transformations based on a CSVProcessingConfig.
 * It prioritizes explicitly defined mappings in `config.additionalFields` for renaming
 * and type coercion. All other columns from the original CSV are passed through
 * with their original header names.
 *
 * @param csvText The raw CSV string.
 * @param config The CSVProcessingConfig to guide parsing and transformation.
 * @param hasHeader Indicates if the CSV has a header row.
 * @returns A Promise resolving to an array of processed row objects.
 */
export const processCSVWithMapping = async <T extends Record<string, any> = Record<string, any>>(
  csvText: string,
  config: CSVProcessingConfig,
  hasHeader = true
): Promise<T[]> => {
  const parseResult = await parseCSV<Record<string, any>>(csvText, hasHeader);

  if (parseResult.errors.length > 0) {
    console.error('Errors during CSV parsing:', parseResult.errors);
    // Optionally, you might want to throw an error or return an empty array
    // depending on how strictly you want to handle parsing errors.
    // For now, returning empty array if there are errors.
    // Consider if partial data is acceptable if errors are non-fatal.
    // Removed check for e.type === "Fatal" as "Fatal" is not a standard Papa.ParseError type.
    // The existing check for parseResult.data.length === 0 && parseResult.errors.length > 0
    // should suffice for handling cases where parsing yields no usable data due to errors.
    // If errors are not fatal, we might still proceed with data that was parsed,
    // or decide to throw if any error is present. For now, log and continue if not empty.
    if (parseResult.data.length === 0 && parseResult.errors.length > 0) {
        // If there's no data and there are errors, it's likely a more serious issue.
        console.error("CSV parsing resulted in no data and errors. Aborting processing for this file.");
        // Depending on desired strictness, could throw new Error('CSV parsing failed with no data.');
        return []; // Return empty array if parsing yields no data due to errors
    }
  }

  const processedData: T[] = [];

  for (const originalRow of parseResult.data) {
    const newRow: Record<string, any> = {};

    // First, copy all original fields to the new row.
    // This ensures any fields not explicitly mapped are preserved.
    for (const key in originalRow) {
      if (Object.prototype.hasOwnProperty.call(originalRow, key)) {
        newRow[key] = originalRow[key];
      }
    }

    // Then, process and potentially overwrite/add fields based on `config.additionalFields`.
    // This allows renaming and explicit type coercion for specific output fields.
    if (config.additionalFields) {
      for (const outputFieldName in config.additionalFields) {
        if (Object.prototype.hasOwnProperty.call(config.additionalFields, outputFieldName)) {
          const accessor = config.additionalFields[outputFieldName];
          const value = getFieldValue(originalRow, accessor);
          if (value !== undefined) {
            newRow[outputFieldName] = value;
          } else if (accessor.defaultValue !== undefined) {
            newRow[outputFieldName] = accessor.defaultValue;
          }
          // If value is undefined and no defaultValue, the field might not be set on newRow,
          // or it might be explicitly set to undefined if that's desired.
          // Current getFieldValue returns undefined if not found and no default.
        }
      }
    }
    processedData.push(newRow as T);
  }
  return processedData;
};

/**
 * Fetches and parses a CSV file from a URL
 * @param url URL of the CSV file to fetch and parse
 * @returns Promise resolving to the parsed data
 */
export const fetchAndParseCSV = async <T = any>(url: string): Promise<ParsedCSVData<T>> => {
  const csvText = await fetchCSV(url);
  return parseCSV<T>(csvText);
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
  // Look for pattern loyalty_scan_detail_MM-DD-YYYY.csv
  let dateMatch = filename.match(/loyalty_scan_detail_(\d{2})-(\d{2})-(\d{4})\.csv$/);
  if (dateMatch) {
    const month = dateMatch[1];
    const day = dateMatch[2];
    const year = dateMatch[3];
    return new Date(`${year}-${month}-${day}T00:00:00`); // Use ISO format for consistency
  }

  // Look for pattern loyalty_scan_summary_MM-DD-YYYY.csv
  dateMatch = filename.match(/loyalty_scan_summary_(\d{2})-(\d{2})-(\d{4})\.csv$/);
  if (dateMatch) {
    const month = dateMatch[1];
    const day = dateMatch[2];
    const year = dateMatch[3];
    return new Date(`${year}-${month}-${day}T00:00:00`); // Use ISO format for consistency
  }

  // Look for pattern of loyalty_data_MM-DD-YYYY.csv (original data page)
  dateMatch = filename.match(/loyalty_data_(\d{2})-(\d{2})-(\d{4})\.csv$/);
  if (dateMatch) {
    const month = dateMatch[1];
    const day = dateMatch[2];
    const year = dateMatch[3];
    return new Date(`${year}-${month}-${day}T00:00:00`); // Use ISO format for consistency
  }
  
  // Look for pattern of any-prefix-MM-DD-YYYY.csv (for general reporting page files)
  // This should be more specific if other types are added, or be the last resort.
  dateMatch = filename.match(/.*?-(\d{2})-(\d{2})-(\d{4})\.csv$/); // Made slightly more specific to catch hyphen before date
  if (dateMatch) {
    const month = dateMatch[1];
    const day = dateMatch[2];
    const year = dateMatch[3];
    // console.log(`Extracted date from general file: ${month}/${day}/${year} for ${filename}`);
    return new Date(`${year}-${month}-${day}T00:00:00`); // Use ISO format for consistency
  }
  
  // Look for pattern of 8 digits in a row which would be MMDDYYYY (legacy format)
  dateMatch = filename.match(/(\d{8})\.csv$/);
  if (dateMatch) {
    const dateStr = dateMatch[1];
    const month = dateStr.substring(0, 2);
    const day = dateStr.substring(2, 4);
    const year = dateStr.substring(4, 8);
    return new Date(`${year}-${month}-${day}T00:00:00`); // Use ISO format for consistency
  }
  
  console.warn(`Could not extract date from filename: ${filename}`); // Changed to warn
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
    // Check if filename starts with the specified dataType (e.g., "loyalty_scan_detail", "loyalty_scan_summary", "loyalty_data")
    const matchesDataType = filename.startsWith(dataType);

    if (!matchesDataType) {
      // console.log(`Filename ${filename} does not match dataType ${dataType}`); // Optional debug
      return false;
    }
    
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
 * @param config The CSVProcessingConfig to identify the location identifier field.
 * @returns Enhanced data with location names
 */
export const enhanceCSVWithLocationNames = (
  data: any[],
  locations: { id: string; name: string }[] = [],
  config: CSVProcessingConfig // Added config parameter
): any[] => {
  if (!data.length || !locations.length || !config.locationIdentifierField) {
    // If no data, locations, or locationIdentifierField in config, return original data
    return data;
  }
  
  // Create a mapping of location IDs to location names
  const locationMap: Record<string, string> = {};
  locations.forEach(loc => {
    locationMap[loc.id] = loc.name;
  });
  
  return data.map(row => {
    const newRow = { ...row };
    
    // Get the location identifier using the config and getFieldValue
    const storeIdValue = getFieldValue(row, config.locationIdentifierField);
    
    if (storeIdValue !== undefined) {
      const storeIdStr = String(storeIdValue);
      // Check if row has a valid numeric-like location ID and it exists in our locationMap
      if (!isNaN(Number(storeIdStr)) && locationMap[storeIdStr]) {
        newRow['Location Name'] = locationMap[storeIdStr]; // Standardized output column name
        // Ensure the original identifier (or the one found by accessor) is preserved if needed,
        // or decide if the newRow should only contain 'Location Name'.
        // For now, let's assume the original column used by accessor is already in newRow.
        // If `config.locationIdentifierField.sourceNames` was an array, `getFieldValue` used the first one found.
        // If a specific output name for the ID itself is desired, it should be in `additionalFields`.
      }
    }
    
    return newRow;
  });
};

/**
 * Filter data by location, discount IDs, and daily usage count
 * @param data Array of data objects
 * @param locationIds Array of location IDs to filter by
 * @param discountIds Array of discount IDs to filter by
 * @param locations Array of location objects with id and name properties for mapping IDs to names
 * @param dailyUsageCountFilter String representing the minimum daily usage count
 * @param config The CSVProcessingConfig to identify relevant fields.
 * @returns Filtered data
 */
export const filterData = (
  data: any[],
  locationIds: string[] = [],
  discountIds: number[] = [],
  locations: { id: string; name: string }[] = [],
  dailyUsageCountFilter: string = '',
  config: CSVProcessingConfig // Added config parameter
): any[] => {
  // Debug info (reduced for log bloat)
  console.log("FILTER DATA - Starting with rows:", data.length);
  console.log("FILTER DATA - Selected location IDs:", locationIds);
  console.log("FILTER DATA - Selected discount IDs:", discountIds);
  console.log("FILTER DATA - Config (partial):", {
    locationIdentifierField: config?.locationIdentifierField?.sourceNames,
    dailyUsageCountField: config?.dailyUsageCountField?.sourceNames,
    discountIdentifierField: config?.discountIdentifierField?.sourceNames
  });

  // Parse the usage count filter value once
  const minUsageCount = dailyUsageCountFilter ? parseInt(dailyUsageCountFilter, 10) : null;
  const isUsageFilterActive = minUsageCount !== null && !isNaN(minUsageCount) && minUsageCount >= 0;

  // If no filters applied AND no relevant config fields are set, log it.
  const noOperationalFilters = locationIds.length === 0 && discountIds.length === 0 && !isUsageFilterActive;
  const noConfigForFiltering = !config || (!config.locationIdentifierField && !config.discountIdentifierField && !config.dailyUsageCountField);

  if (noOperationalFilters && noConfigForFiltering) {
     console.log("FILTER DATA - No operational filters and no relevant config fields for filtering (no filter applied).");
  }

  // Create a mapping of location IDs to location names (used within filter logic)
  const locationNameMap: Record<string, string> = {};
  locations.forEach(loc => {
    locationNameMap[loc.id] = loc.name;
  });
  
  // Log sample row keys (less verbose)
  if (data.length > 0 && data[0]) {
    console.log("FILTER DATA - Sample row keys:", Object.keys(data[0]).slice(0, 5).join(', ') + (Object.keys(data[0]).length > 5 ? ', ...' : ''));
  }

  const filteredData = data.filter(row => {
    // Apply location filter if needed
    if (locationIds.length > 0) { // Only filter if locationIds are provided
      if (!config?.locationIdentifierField) {
        console.warn("FILTER DATA - Location filter active but no `locationIdentifierField` in config. Excluding row.");
        return false; // Exclude row if location filter is active but cannot be applied
      }

      const locationIdValue = getFieldValue(row, config.locationIdentifierField);
      const locationIdStr = locationIdValue !== undefined ? String(locationIdValue).trim() : '';

      // Debug: Log the first few comparisons to see what's happening
      if (data.indexOf(row) < 5) {
        console.log(`FILTER DATA - Row ${data.indexOf(row)}: Store='${locationIdStr}', Selected locations: [${locationIds.join(', ')}]`);
      }

      // Explicitly exclude TOTAL rows as per new requirements
      if (locationIdStr === 'TOTAL') {
        // console.log(`FILTER DATA - Excluding TOTAL row with Location ID: '${locationIdStr}'`); // Reduced bloat
        return false;
      }
      // If specific locations are selected, filter out rows that don't match those locations.
      // Handle both ID-based matching (for data page) and name-based matching (for reporting page)
      let locationMatches = false;
      
      // First try exact match - this works for both ID-based filtering and exact name matching
      if (locationIds.includes(locationIdStr)) {
        locationMatches = true;
      } else {
        // Try case-insensitive exact matching for location names
        // This handles cases where CSV might have slight case differences
        const storeLower = locationIdStr.toLowerCase().trim();
        for (const selectedLocation of locationIds) {
          const selectedLower = selectedLocation.toLowerCase().trim();
          if (storeLower === selectedLower) {
            locationMatches = true;
            break;
          }
        }
        
        // If still no match, try partial matching as fallback
        // This handles cases where there might be slight variations in naming
        if (!locationMatches) {
          for (const selectedLocation of locationIds) {
            const selectedLower = selectedLocation.toLowerCase().trim();
            const storeLower = locationIdStr.toLowerCase().trim();
            
            // Check if either contains the other (for cases like "Wildwood" vs "Beaumont/Wildwood, FL")
            if (storeLower.includes(selectedLower) || selectedLower.includes(storeLower)) {
              locationMatches = true;
              console.log(`FILTER DATA - Partial match found: '${locationIdStr}' matches '${selectedLocation}'`);
              break;
            }
          }
        }
      }
      
      if (!locationMatches) {
        console.log(`FILTER DATA - Row filtered out by location: Store '${locationIdStr}' not matching selected locations: [${locationIds.join(', ')}]`);
        return false;
      }
      // No need for a `return true;` here, as the flow continues to other filters.
    }
    
    // Apply discount ID filtering if needed. Only apply if config has the field.
    if (discountIds.length > 0 && config?.discountIdentifierField) {
      const usingDefaultDiscounts = discountIds.length === 7 &&
        discountIds.includes(77406) &&
        discountIds.includes(135733) &&
        discountIds.includes(135736) &&
        discountIds.includes(135737) &&
        discountIds.includes(135738) &&
        discountIds.includes(135739) &&
        discountIds.includes(135910);

      if (!usingDefaultDiscounts) {
        const discountValueRaw = getFieldValue(row, config.discountIdentifierField);
        
        if (discountValueRaw !== undefined && discountValueRaw !== null && String(discountValueRaw).trim() !== '') {
          const discountValueFromRow = Number(discountValueRaw);
          if (isNaN(discountValueFromRow) || !discountIds.includes(discountValueFromRow)) {
            return false; // Not a number or not in the selected discount IDs
          }
        } else {
          // If the discount identifier field is empty or not found, and filtering is active, exclude.
          return false;
        }
      }
    }
    
    // Apply Daily Usage Count filter if active and configured
    if (isUsageFilterActive && minUsageCount !== null && config?.dailyUsageCountField) {
      const usageCountValueRaw = getFieldValue(row, config.dailyUsageCountField);
      
      if (usageCountValueRaw === undefined || usageCountValueRaw === null || isNaN(Number(usageCountValueRaw))) {
        // If the configured usage count field is missing or not a number, exclude the row when filtering is active
        return false;
      }
      const rowUsageCount = Number(usageCountValueRaw);
      
      if (rowUsageCount < minUsageCount) {
        return false;
      }
    }
    
    // If the row passed all active filters, include it
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
 * @param config The CSVProcessingConfig to identify employee and guest name fields.
 * @returns Enhanced data with employee names
 */
export const enhanceCSVWithEmployeeNames = (
  data: any[],
  employeeData: Record<string, string> = {},
  config: CSVProcessingConfig // Added config parameter
): any[] => {
  if (!data.length || Object.keys(employeeData).length === 0 || !config.employeeIdentifierField) {
    console.log("DEBUG - No data, employee data, or employeeIdentifierField in config to enhance");
    return data;
  }
  
  const employeeIdAccessor = config.employeeIdentifierField;
  // Guest name field is optional for enhancement target
  const guestNameAccessor = config.guestNameField;
  // Determine the output column name for the guest name
  const guestNameOutputColumn = guestNameAccessor && typeof guestNameAccessor.sourceNames === 'string'
                                ? guestNameAccessor.sourceNames
                                : 'Guest Name'; // Default output column if not specified or complex

  console.log(`Enhancing CSV data with employee names (${data.length} rows, ${Object.keys(employeeData).length} employee records) using employee ID from ${JSON.stringify(employeeIdAccessor.sourceNames)} and guest name from ${guestNameOutputColumn}`);
  
  // Track statistics for debugging
  let totalRows = 0;
  let enhancedRows = 0;
  let unknownRows = 0;
  let missingLoyaltyIdRows = 0;
  
  const result = data.map(row => {
    totalRows++;
    const newRow = { ...row };
    
    const loyaltyIdValue = getFieldValue(row, employeeIdAccessor);
    const loyaltyId = loyaltyIdValue !== undefined ? String(loyaltyIdValue) : '';

    if (!loyaltyId) {
      missingLoyaltyIdRows++;
      return newRow;
    }
    
    const employeeName = getEmployeeName(loyaltyId, employeeData);
    
    if (employeeName.includes('Unknown')) {
      unknownRows++;
    } else {
      enhancedRows++;
    }
    
    // Get current guest name using accessor if available
    const currentGuestName = guestNameAccessor ? getFieldValue(row, guestNameAccessor) : newRow[guestNameOutputColumn];

    // Replace "Unknown" in the target Guest Name column or add it if it doesn't exist.
    if (currentGuestName && typeof currentGuestName === 'string' && currentGuestName.includes('Unknown')) {
      newRow[guestNameOutputColumn] = employeeName;
    } else if (currentGuestName === undefined || currentGuestName === null || String(currentGuestName).trim() === '') {
      // If the guest name field is empty or not present, add the employee name.
      newRow[guestNameOutputColumn] = employeeName;
    }
    // If guestNameAccessor was defined, the original source column(s) are preserved from the initial row copy.
    // We are specifically targeting the `guestNameOutputColumn` for the enhanced name.

    // Preserve the original loyalty ID field if its sourceName was different from employeeIdAccessor.sourceNames
    // This is generally handled by the initial spread `...row`.
    // If `employeeIdAccessor.sourceNames` was an array, `getFieldValue` used the first one found.
    // We can ensure the *identified* loyalty ID is present under a consistent key if desired,
    // but for now, the original column is preserved.
    // Example: newRow[typeof employeeIdAccessor.sourceNames === 'string' ? employeeIdAccessor.sourceNames : employeeIdAccessor.sourceNames[0]] = loyaltyId;
    
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

/**
 * Calculates daily totals for 'Total Checks', 'Loyalty Scans', and 'Scan Rate'
 * for each date in the provided data, and appends them as new rows.
 * Total rows are only generated if the date range spans more than one day.
 *
 * @param data Array of data objects (rows).
 * @param startDate The start date of the selected range.
 * @param endDate The end date of the selected range.
 * @param config The CSVProcessingConfig to identify relevant fields.
 * @returns The original data combined with dynamically calculated daily total rows, sorted by date.
 */

// Removed parseMMDDYYYYtoUTCDate and calculateDailyTotals functions
// as per new requirement to only filter out original TOTAL rows
// and not add any new calculated total rows.