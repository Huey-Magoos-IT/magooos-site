import { CrossLocationPriceItem, LocationInfo } from './priceDataUtils';
import { convertToCSV } from './csvProcessing';

// Interface for tracking individual price changes
export interface PriceChange {
  itemName: string;
  locationId: string;
  locationName: string;
  oldPrice: number;
  newPrice: number;
  timestamp: string;
}

// Interface for a complete price change report
export interface PriceChangeReport {
  id: string;
  userId: string;
  username: string;
  groupName: string;
  locationIds: string[];
  submittedDate: string;
  status: 'pending' | 'sent' | 'archived';
  changes: PriceChange[];
  totalChanges: number;
}

// Interface for tracking price changes in the portal
export interface PriceChangeTracker {
  originalData: CrossLocationPriceItem[];
  changes: { [key: string]: number }; // key format: "itemName|locationId"
  availableLocations: LocationInfo[];
}

/**
 * Extracts price changes from the current state
 * @param originalData Original price data
 * @param priceChanges Current price changes object
 * @param availableLocations Available locations for name mapping
 * @returns Array of PriceChange objects
 */
export const extractPriceChanges = (
  originalData: CrossLocationPriceItem[],
  priceChanges: { [key: string]: number },
  availableLocations: LocationInfo[]
): PriceChange[] => {
  const changes: PriceChange[] = [];
  const locationMap = availableLocations.reduce((map, loc) => {
    map[loc.id] = loc.displayName;
    return map;
  }, {} as { [key: string]: string });

  Object.entries(priceChanges).forEach(([key, newPrice]) => {
    const [itemName, locationId] = key.split('|');
    
    // Find the original item and price
    const originalItem = originalData.find(item => item.name === itemName);
    if (originalItem && originalItem.locationPrices[locationId] !== undefined) {
      const oldPrice = originalItem.locationPrices[locationId];
      
      // Only include if price actually changed
      if (oldPrice !== newPrice) {
        changes.push({
          itemName,
          locationId,
          locationName: locationMap[locationId] || `Location ${locationId}`,
          oldPrice,
          newPrice,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  return changes;
};

/**
 * Creates a price change report
 * @param changes Array of price changes
 * @param userInfo User information
 * @param locationIds User's location IDs
 * @returns PriceChangeReport object
 */
export const createPriceChangeReport = (
  changes: PriceChange[],
  userInfo: { id: string; username: string; groupName?: string },
  locationIds: string[]
): PriceChangeReport => {
  return {
    id: `PRICE-${Date.now()}-${userInfo.id}`,
    userId: userInfo.id,
    username: userInfo.username,
    groupName: userInfo.groupName || 'Unknown Group',
    locationIds,
    submittedDate: new Date().toISOString(),
    status: 'pending',
    changes,
    totalChanges: changes.length
  };
};

/**
 * Converts price changes to CSV format for export
 * @param changes Array of price changes
 * @param reportInfo Report metadata
 * @returns CSV string
 */
export const convertPriceChangesToCSV = (
  changes: PriceChange[],
  reportInfo: { groupName: string; submittedDate: string; reportId: string }
): string => {
  const csvData = changes.map(change => ({
    'Report ID': reportInfo.reportId,
    'Group Name': reportInfo.groupName,
    'Submitted Date': new Date(reportInfo.submittedDate).toLocaleDateString(),
    'Item Name': change.itemName,
    'Location ID': change.locationId,
    'Location Name': change.locationName,
    'Old Price': change.oldPrice.toFixed(2),
    'New Price': change.newPrice.toFixed(2),
    'Price Difference': (change.newPrice - change.oldPrice).toFixed(2),
    'Change Timestamp': new Date(change.timestamp).toLocaleString()
  }));

  return convertToCSV(csvData);
};

/**
 * Uploads price change report to S3
 * @param csvContent CSV content to upload
 * @param reportId Report ID for filename
 * @param groupName Group name for filename
 * @param userId User ID for filename and tracking
 * @param username Username for filename
 * @returns Promise resolving to upload success
 */
export const uploadPriceChangeReport = async (
  csvContent: string,
  reportId: string,
  groupName: string,
  userId: string,
  username: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedGroupName = groupName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${timestamp}_${sanitizedGroupName}_${sanitizedUsername}_${userId}_${reportId}.csv`;
    
    const S3_DATA_LAKE = process.env.NEXT_PUBLIC_DATA_LAKE_S3_URL || "https://data-lake-magooos-site.s3.us-east-2.amazonaws.com";
    
    // Create the full URL for the new active-price-reports folder
    const uploadUrl = `${S3_DATA_LAKE}/active-price-reports/${filename}`;
    
    console.log('Uploading price change report to:', uploadUrl);
    console.log('CSV content preview:', csvContent.substring(0, 200) + '...');
    
    // Create a blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv' });
    
    // Attempt to upload using PUT request (S3 REST API)
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Length': blob.size.toString()
      }
    });
    
    if (response.ok) {
      console.log('Price change report uploaded successfully');
      return {
        success: true,
        url: uploadUrl
      };
    } else {
      console.error('Upload failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      return {
        success: false,
        error: `Upload failed: ${response.status} ${response.statusText}`
      };
    }
  } catch (error) {
    console.error('Error uploading price change report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Groups price changes by location for better display
 * @param changes Array of price changes
 * @returns Grouped changes by location
 */
export const groupChangesByLocation = (changes: PriceChange[]): { [locationName: string]: PriceChange[] } => {
  return changes.reduce((groups, change) => {
    const locationName = change.locationName;
    if (!groups[locationName]) {
      groups[locationName] = [];
    }
    groups[locationName].push(change);
    return groups;
  }, {} as { [locationName: string]: PriceChange[] });
};

/**
 * Validates price changes before submission
 * @param changes Array of price changes
 * @returns Validation result
 */
export const validatePriceChanges = (changes: PriceChange[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (changes.length === 0) {
    errors.push('No price changes detected');
  }
  
  changes.forEach((change, index) => {
    if (change.newPrice < 0) {
      errors.push(`Invalid price for ${change.itemName} at ${change.locationName}: Price cannot be negative`);
    }
    
    if (change.newPrice > 999.99) {
      errors.push(`Invalid price for ${change.itemName} at ${change.locationName}: Price too high (max $999.99)`);
    }
    
    if (Math.abs(change.newPrice - change.oldPrice) > 50) {
      errors.push(`Large price change for ${change.itemName} at ${change.locationName}: ${change.oldPrice.toFixed(2)} → ${change.newPrice.toFixed(2)}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};