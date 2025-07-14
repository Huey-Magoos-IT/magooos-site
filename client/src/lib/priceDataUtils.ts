import { parseCSV, ParsedCSVData } from './csvProcessing'; // Assuming ParsedCSVData is exported or use Papa.ParseResult

export interface PriceItem {
  id: string;
  name: string;
  category: string;
  currentPrice: number;
  isOriginal: boolean;
  sauceUnitCount?: number;
  originalId?: string;
  location_id: string;
}

// New interface for cross-location price comparison
export interface CrossLocationPriceItem {
  id: string;
  name: string;
  category: string;
  isOriginal: boolean;
  sauceUnitCount?: number;
  originalId?: string;
  locationPrices: { [locationId: string]: number }; // locationId -> price mapping
  priceGroupId?: string; // For syncing prices across locations
}

// Interface for location information
export interface LocationInfo {
  id: string;
  name: string;
  displayName: string;
}

// Mapping from CSV category display names to internal category values
const categoryDisplayNameToValueMap: { [key: string]: string } = {
  "Sandwiches & Wraps": "sandwiches_wraps",
  "For The Little Magoo's": "for_the_little_magoos",
  "Craft Drinks": "craft_drinks",
  "Tender Meals": "tender_meals",
  "Tenders For The Fam": "tenders_for_the_fam",
  "By The Piece": "by_the_piece",
  "Fresh-Made Salads": "fresh_made_salads",
  "Sides": "sides",
  "InStore Catering": "instore_catering",
  "EZ Cater": "ez_cater",
  "3PD": "3pd",
  "Odds and Ends": "odds_and_ends",
};

// Helper to get internal category value from CSV display name
const getCategoryValueFromDisplayName = (displayName: string): string => {
  return categoryDisplayNameToValueMap[displayName.trim()] || "uncategorized";
};

// Helper to determine sauceUnitCount (similar to previous logic)
const determineSauceUnitCount = (name: string, categoryValue: string): number | undefined => {
  const lowerName = name.toLowerCase();
  
  const pieceMatch = lowerName.match(/(\d+)\s*(piece|tender|bite|tenders|bites)/);
  if (pieceMatch && pieceMatch[1]) {
    const count = parseInt(pieceMatch[1], 10);
    if (!isNaN(count)) return count;
  }

  if (lowerName.includes("sandwich") || lowerName.includes("wrap")) {
    return 1;
  }
  
  if (categoryValue === "fresh_made_salads") {
    const saladTenderMatch = lowerName.match(/(\d+)\s*tenders/);
    if (saladTenderMatch && saladTenderMatch[1]) {
        const count = parseInt(saladTenderMatch[1], 10);
        if (!isNaN(count)) return count;
    }
    if (!lowerName.includes("side salad") && !lowerName.includes("mods")) {
        return 1;
    }
  }
  
  if (lowerName.startsWith("cat-lunch boxes") || lowerName.startsWith("cat-snack wraps") || 
      lowerName.startsWith("lunch boxes-ezcatr") || lowerName.startsWith("snack wraps-ezcatr") ||
      lowerName.includes("addon-saladtenders") || lowerName.startsWith("cat- tender bites box")) {
    return 1;
  }
  if (lowerName.includes("tailgate box (10)") || lowerName.includes("tailgate package")) return 10;
  if (lowerName.includes("50 for $50")) return 50;

  return undefined; 
};

export const parsePriceDataFromCsv = async (csvString: string): Promise<PriceItem[]> => {
  // PapaParse result type for a row when header is true
  // The actual data structure is: price_group_id | price_group_name | location_id | priceId | reportTitle | value
  type CsvRow = {
    "price_group_id": string;
    "price_group_name": string;
    "location_id": string;
    "priceId": string;
    "reportTitle": string;
    "value": string;
    [key: string]: any;
  };

  const parsedCsv: ParsedCSVData<CsvRow> = await parseCSV<CsvRow>(csvString, true);
  
  if (parsedCsv.errors.length > 0) {
    console.error("CSV parsing errors:", parsedCsv.errors);
  }

  // Use a Map to deduplicate items by unique key (priceId + locationId)
  const itemMap = new Map<string, PriceItem>();

  // Process each row - each row is already one item for one location
  parsedCsv.data.forEach((row, index) => {
    const priceGroupId = row["price_group_id"];
    const priceGroupName = row["price_group_name"];
    const locationId = row["location_id"];
    const priceId = row["priceId"];
    const itemName = row["reportTitle"];
    const currentPriceStr = row["value"];

    if (!priceGroupId || !itemName || currentPriceStr === undefined || !locationId || !priceId) {
      console.warn(`Skipping row ${index} due to missing required fields:`, {
        priceGroupId: !!priceGroupId,
        itemName: !!itemName,
        currentPriceStr: currentPriceStr !== undefined,
        locationId: !!locationId,
        priceId: !!priceId
      });
      return; // Skip invalid rows
    }

    const currentPrice = parseFloat(String(currentPriceStr));
    if (isNaN(currentPrice)) {
      console.warn(`Skipping row ${index} due to invalid price:`, currentPriceStr);
      return; // Skip rows with invalid price
    }

    // Create unique key for deduplication using priceId + locationId
    // This ensures the same item (same priceId) can exist for different locations
    const uniqueKey = `${priceId.trim()}|${locationId.trim()}`;
    
    // Skip if we already have this item for this location
    if (itemMap.has(uniqueKey)) {
      console.warn(`Duplicate found for priceId ${priceId} at location ${locationId}, skipping`);
      return;
    }
    
    // Determine category from price_group_name first, then fallback to item name analysis
    let categoryValue = "uncategorized";
    const lowerName = itemName.toLowerCase();
    const lowerGroupName = (priceGroupName || '').toLowerCase();
    
    // First, try to use price_group_name if it contains recognizable category info
    if (priceGroupName && priceGroupName.trim()) {
      const groupNameValue = getCategoryValueFromDisplayName(priceGroupName.trim());
      if (groupNameValue !== "uncategorized") {
        categoryValue = groupNameValue;
      }
    }
    
    // If still uncategorized, use enhanced item name analysis
    if (categoryValue === "uncategorized") {
      // Check for 3PD suffix
      if (lowerName.includes("-3pd") || lowerName.includes(" 3pd")) {
        categoryValue = "3pd";
      }
      // Check for EZ Cater suffix
      else if (lowerName.includes("-ezcatr") || lowerName.includes("ezcatr")) {
        categoryValue = "ez_cater";
      }
      // Check for specific prefixes and patterns
      else if (lowerName.startsWith("meals-kid-") || lowerName.includes("apple juice") ||
               lowerName.includes("kids-") || lowerName.includes("goldfish")) {
        categoryValue = "for_the_little_magoos";
      }
      else if (lowerName.startsWith("btp-") || lowerName.includes("by the piece") ||
               lowerName.includes("by piece")) {
        categoryValue = "by_the_piece";
      }
      else if (lowerName.startsWith("cat-") || lowerName.includes("catering") ||
               lowerName.includes("party pack") || lowerName.includes("lunch boxes")) {
        categoryValue = "instore_catering";
      }
      else if (lowerName.startsWith("meals-sandw-") || lowerName.startsWith("meals-wrap-") ||
               lowerName.includes("sandwich") || lowerName.includes("wrap")) {
        categoryValue = "sandwiches_wraps";
      }
      else if (lowerName.startsWith("meals-") && !lowerName.includes("sandw") && !lowerName.includes("wrap")) {
        categoryValue = "tender_meals";
      }
      else if (lowerName.startsWith("sal-") || lowerName.includes("salad")) {
        categoryValue = "fresh_made_salads";
      }
      else if (lowerName.startsWith("side-") || lowerName.includes("fries") ||
               lowerName.includes("slaw") || lowerName.includes("texas toast") ||
               lowerName.includes("cheese sauce") || lowerName.includes("dip")) {
        categoryValue = "sides";
      }
      else if (lowerName.startsWith("drink-") || lowerName.includes("tea") ||
               lowerName.includes("lemonade") || lowerName.includes("bottled water") ||
               lowerName.includes("gallon")) {
        categoryValue = "craft_drinks";
      }
      else if (lowerName.startsWith("meals-fam-") || lowerName.includes("family")) {
        categoryValue = "tenders_for_the_fam";
      }
      // Catch-all for items that don't fit standard categories
      else if (lowerName.includes("championship") || lowerName.includes("game day") ||
               lowerName.includes("overtime") || lowerName.includes("tailgate") ||
               lowerName.includes("addon") || lowerName.includes("freebie") ||
               lowerName.includes("promo") || lowerName.includes("bag of ice") ||
               lowerName.includes("breakfast") || lowerName.includes("concessions")) {
        categoryValue = "odds_and_ends";
      }
    }

    // Use priceId as the item ID - this ensures same items across locations have the same ID
    const id = priceId;

    let isOriginal = true;
    if (itemName.toLowerCase().includes("-sauced") ||
        itemName.toLowerCase().includes(" sauced") ||
        itemName.toLowerCase().includes(" mixed sauce")) {
      isOriginal = false;
    }

    let sauceUnitCount: number | undefined = undefined;
    if (isOriginal) {
      sauceUnitCount = determineSauceUnitCount(itemName, categoryValue);
    }

    const priceItem: PriceItem = {
      id,
      name: itemName,
      category: categoryValue,
      currentPrice,
      isOriginal,
      sauceUnitCount,
      location_id: locationId,
    };

    // Store in map for deduplication - this automatically prevents duplicates
    itemMap.set(uniqueKey, priceItem);
  });

  // Convert Map values to array to get deduplicated items
  const rawPriceItems: PriceItem[] = Array.from(itemMap.values());

  // Second pass to link originalId
  const finalPriceItems: PriceItem[] = rawPriceItems.map(item => {
    if (!item.isOriginal) {
      let potentialOriginalName = item.name
        .replace(/-Sauced/gi, '')
        .replace(/ Sauced/gi, '')
        .replace(/ Mixed Sauce/gi, '')
        .trim();
      
      // Specific fixes based on observed patterns
      if (item.name === "MEALS-KID-2 Piece-sauced-3PD") potentialOriginalName = "MEALS-KID-2 Piece-3PD";
      else if (item.name === "MEALS-KID-2 Piece-Sauced") potentialOriginalName = "MEALS-KID-2 Piece";

      const originalItem = rawPriceItems.find(
        org => org.isOriginal &&
               org.category === item.category &&
               org.location_id === item.location_id && // Match same location
               (org.name.trim().toLowerCase() === potentialOriginalName.toLowerCase() ||
                (item.name.toLowerCase().startsWith(org.name.trim().toLowerCase() + "-") &&
                 (item.name.toLowerCase().includes("sauced") || item.name.toLowerCase().includes("mixed sauce"))
                )
               )
      );
      if (originalItem) {
        return { ...item, originalId: originalItem.id };
      } else {
        // console.warn(`CSV: Could not find original for sauced item: ${item.name} (tried: ${potentialOriginalName}) in category ${item.category}`);
      }
    }
    return item;
  });

  return finalPriceItems;
};

export const extractUniqueCategories = (priceItems: PriceItem[]): { value: string, label: string }[] => {
  const uniqueCategoriesMap = new Map<string, string>();

  // Helper to get display name from category value
  const getDisplayNameFromValue = (catValue: string): string => {
    for (const displayName in categoryDisplayNameToValueMap) {
      if (categoryDisplayNameToValueMap[displayName] === catValue) {
        return displayName;
      }
    }
    if (catValue === 'uncategorized') return 'Uncategorized';
    // Fallback: format the value itself (e.g., 'sandwiches_wraps' -> 'Sandwiches Wraps')
    return catValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  priceItems.forEach(item => {
    if (item.category) {
      if (!uniqueCategoriesMap.has(item.category)) {
        uniqueCategoriesMap.set(item.category, getDisplayNameFromValue(item.category));
      }
    }
  });

  const sortedCategories = Array.from(uniqueCategoriesMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return [
    { value: 'all', label: 'All Categories' },
    ...sortedCategories
  ];
};

// New function for cross-location price comparison
export const parseCrossLocationPriceData = async (csvString: string): Promise<{
  items: CrossLocationPriceItem[];
  locations: LocationInfo[];
}> => {
  // Parse the new CSV format directly (with location_ids field containing pipe-separated values)
  type NewCsvRow = {
    "price_group_id": string;
    "price_group_name": string;
    "location_ids": string; // Pipe-separated location IDs
    "priceId": string;
    "reportTitle": string;
    "value": string;
    [key: string]: any;
  };

  const parsedCsv: ParsedCSVData<NewCsvRow> = await parseCSV<NewCsvRow>(csvString, true);
  
  if (parsedCsv.errors.length > 0) {
    console.error("CSV parsing errors:", parsedCsv.errors);
  }

  const itemMap = new Map<string, CrossLocationPriceItem>();
  const locationMap = new Map<string, LocationInfo>();

  // Process each row - each row represents one item with prices for multiple locations
  parsedCsv.data.forEach((row, index) => {
    const priceGroupId = row["price_group_id"];
    const priceGroupName = row["price_group_name"];
    const locationIdsStr = row["location_ids"];
    const priceId = row["priceId"];
    const itemName = row["reportTitle"];
    const currentPriceStr = row["value"];

    if (!priceGroupId || !itemName || currentPriceStr === undefined || !locationIdsStr || !priceId) {
      console.warn(`Skipping row ${index} due to missing required fields:`, {
        priceGroupId: !!priceGroupId,
        itemName: !!itemName,
        currentPriceStr: currentPriceStr !== undefined,
        locationIdsStr: !!locationIdsStr,
        priceId: !!priceId
      });
      return; // Skip invalid rows
    }

    const currentPrice = parseFloat(String(currentPriceStr));
    if (isNaN(currentPrice)) {
      console.warn(`Skipping row ${index} due to invalid price:`, currentPriceStr);
      return; // Skip rows with invalid price
    }

    // Parse location IDs (pipe-separated)
    const locationIds = String(locationIdsStr).split('|').map(id => id.trim()).filter(id => id);
    
    if (locationIds.length === 0) {
      console.warn(`Skipping row ${index} due to no valid location IDs:`, locationIdsStr);
      return;
    }

    // Add locations to location map
    locationIds.forEach(locationId => {
      if (!locationMap.has(locationId)) {
        // Extract location name from price_group_name if possible, otherwise use locationId
        let displayName = locationId;
        if (priceGroupName && priceGroupName.includes(' - ')) {
          // Try to extract location name from price group name like "HM - Englewood, OH"
          const parts = priceGroupName.split(' - ');
          if (parts.length > 1) {
            displayName = parts[1].trim();
          }
        }
        
        locationMap.set(locationId, {
          id: locationId,
          name: displayName,
          displayName: displayName
        });
      }
    });

    // Determine category from price_group_name first, then fallback to item name analysis
    let categoryValue = "uncategorized";
    const lowerName = itemName.toLowerCase();
    
    // First, try to use price_group_name if it contains recognizable category info
    if (priceGroupName && priceGroupName.trim()) {
      const groupNameValue = getCategoryValueFromDisplayName(priceGroupName.trim());
      if (groupNameValue !== "uncategorized") {
        categoryValue = groupNameValue;
      }
    }
    
    // If still uncategorized, use enhanced item name analysis
    if (categoryValue === "uncategorized") {
      // Check for 3PD suffix
      if (lowerName.includes("-3pd") || lowerName.includes(" 3pd")) {
        categoryValue = "3pd";
      }
      // Check for EZ Cater suffix
      else if (lowerName.includes("-ezcatr") || lowerName.includes("ezcatr")) {
        categoryValue = "ez_cater";
      }
      // Check for specific prefixes and patterns
      else if (lowerName.startsWith("meals-kid-") || lowerName.includes("apple juice") ||
               lowerName.includes("kids-") || lowerName.includes("goldfish")) {
        categoryValue = "for_the_little_magoos";
      }
      else if (lowerName.startsWith("btp-") || lowerName.includes("by the piece") ||
               lowerName.includes("by piece")) {
        categoryValue = "by_the_piece";
      }
      else if (lowerName.startsWith("cat-") || lowerName.includes("catering") ||
               lowerName.includes("party pack") || lowerName.includes("lunch boxes")) {
        categoryValue = "instore_catering";
      }
      else if (lowerName.startsWith("meals-sandw-") || lowerName.startsWith("meals-wrap-") ||
               lowerName.includes("sandwich") || lowerName.includes("wrap")) {
        categoryValue = "sandwiches_wraps";
      }
      else if (lowerName.startsWith("meals-") && !lowerName.includes("sandw") && !lowerName.includes("wrap")) {
        categoryValue = "tender_meals";
      }
      else if (lowerName.startsWith("sal-") || lowerName.includes("salad")) {
        categoryValue = "fresh_made_salads";
      }
      else if (lowerName.startsWith("side-") || lowerName.includes("fries") ||
               lowerName.includes("slaw") || lowerName.includes("texas toast") ||
               lowerName.includes("cheese sauce") || lowerName.includes("dip")) {
        categoryValue = "sides";
      }
      else if (lowerName.startsWith("drink-") || lowerName.includes("tea") ||
               lowerName.includes("lemonade") || lowerName.includes("bottled water") ||
               lowerName.includes("gallon")) {
        categoryValue = "craft_drinks";
      }
      else if (lowerName.startsWith("meals-fam-") || lowerName.includes("family")) {
        categoryValue = "tenders_for_the_fam";
      }
      // Catch-all for items that don't fit standard categories
      else if (lowerName.includes("championship") || lowerName.includes("game day") ||
               lowerName.includes("overtime") || lowerName.includes("tailgate") ||
               lowerName.includes("addon") || lowerName.includes("freebie") ||
               lowerName.includes("promo") || lowerName.includes("bag of ice") ||
               lowerName.includes("breakfast") || lowerName.includes("concessions")) {
        categoryValue = "odds_and_ends";
      }
    }

    // Determine if this is an original item
    let isOriginal = true;
    if (itemName.toLowerCase().includes("-sauced") ||
        itemName.toLowerCase().includes(" sauced") ||
        itemName.toLowerCase().includes(" mixed sauce")) {
      isOriginal = false;
    }

    let sauceUnitCount: number | undefined = undefined;
    if (isOriginal) {
      sauceUnitCount = determineSauceUnitCount(itemName, categoryValue);
    }

    // Create cross-location item (one item with prices for all locations)
    const itemKey = itemName; // Group by item name
    
    if (!itemMap.has(itemKey)) {
      // Create new cross-location item
      const crossLocationItem: CrossLocationPriceItem = {
        id: priceId,
        name: itemName,
        category: categoryValue,
        isOriginal: isOriginal,
        sauceUnitCount: sauceUnitCount,
        originalId: undefined, // Will be set in second pass
        locationPrices: {},
        priceGroupId: priceGroupId
      };

      // Set the same price for all locations (since they're synchronized in the same price group)
      locationIds.forEach(locationId => {
        crossLocationItem.locationPrices[locationId] = currentPrice;
      });

      itemMap.set(itemKey, crossLocationItem);
    } else {
      console.warn(`Duplicate item found: ${itemName}, skipping`);
    }
  });

  // Second pass to link originalId for sauced items
  const items = Array.from(itemMap.values());
  const finalItems = items.map(item => {
    if (!item.isOriginal) {
      let potentialOriginalName = item.name
        .replace(/-Sauced/gi, '')
        .replace(/ Sauced/gi, '')
        .replace(/ Mixed Sauce/gi, '')
        .trim();
      
      // Specific fixes based on observed patterns
      if (item.name === "MEALS-KID-2 Piece-sauced-3PD") potentialOriginalName = "MEALS-KID-2 Piece-3PD";
      else if (item.name === "MEALS-KID-2 Piece-Sauced") potentialOriginalName = "MEALS-KID-2 Piece";

      const originalItem = items.find(
        org => org.isOriginal &&
               org.category === item.category &&
               (org.name.trim().toLowerCase() === potentialOriginalName.toLowerCase() ||
                (item.name.toLowerCase().startsWith(org.name.trim().toLowerCase() + "-") &&
                 (item.name.toLowerCase().includes("sauced") || item.name.toLowerCase().includes("mixed sauce"))
                )
               )
      );
      if (originalItem) {
        return { ...item, originalId: originalItem.id };
      }
    }
    return item;
  });

  return {
    items: finalItems,
    locations: Array.from(locationMap.values())
  };
};

// Helper function to extract unique categories from cross-location items
export const extractUniqueCategoriesFromCrossLocation = (items: CrossLocationPriceItem[]): { value: string, label: string }[] => {
  const uniqueCategoriesMap = new Map<string, string>();

  // Helper to get display name from category value
  const getDisplayNameFromValue = (catValue: string): string => {
    for (const displayName in categoryDisplayNameToValueMap) {
      if (categoryDisplayNameToValueMap[displayName] === catValue) {
        return displayName;
      }
    }
    if (catValue === 'uncategorized') return 'Uncategorized';
    // Fallback: format the value itself (e.g., 'sandwiches_wraps' -> 'Sandwiches Wraps')
    return catValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  items.forEach(item => {
    if (item.category) {
      if (!uniqueCategoriesMap.has(item.category)) {
        uniqueCategoriesMap.set(item.category, getDisplayNameFromValue(item.category));
      }
    }
  });

  const sortedCategories = Array.from(uniqueCategoriesMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return [
    { value: 'all', label: 'All Categories' },
    ...sortedCategories
  ];
};