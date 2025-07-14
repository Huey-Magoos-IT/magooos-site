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

// Simplified approach: scan CSV and organize data for cross-location price comparison
export const parseCrossLocationPriceData = async (csvString: string): Promise<{
  items: CrossLocationPriceItem[];
  locations: LocationInfo[];
}> => {
  // Handle both old and new CSV formats
  type CsvRow = {
    "price_group_id": string;
    "price_group_name": string;
    "location_id"?: string;      // Old format: single location per row
    "location_ids"?: string;     // New format: pipe-separated locations
    "priceId": string;
    "reportTitle": string;
    "value": string;
    [key: string]: any;
  };

  const parsedCsv: ParsedCSVData<CsvRow> = await parseCSV<CsvRow>(csvString, true);
  
  if (parsedCsv.errors.length > 0) {
    console.error("CSV parsing errors:", parsedCsv.errors);
  }

  // Simple data structure: item_name -> { price_group_id, location_id -> price }
  const itemData = new Map<string, {
    priceGroupId: string;
    priceGroupName: string;
    priceId: string;
    locationPrices: Map<string, number>;
    category?: string;
    isOriginal?: boolean;
    sauceUnitCount?: number;
  }>();
  
  const locationMap = new Map<string, LocationInfo>();

  // Scan all CSV rows and collect data
  parsedCsv.data.forEach((row, index) => {
    const priceGroupId = row["price_group_id"];
    const priceGroupName = row["price_group_name"];
    const priceId = row["priceId"];
    const itemName = row["reportTitle"];
    const currentPriceStr = row["value"];

    if (!priceGroupId || !itemName || currentPriceStr === undefined || !priceId) {
      return; // Skip invalid rows silently
    }

    const currentPrice = parseFloat(String(currentPriceStr));
    if (isNaN(currentPrice)) {
      return; // Skip rows with invalid price
    }

    // Determine which format we're dealing with
    let locationIds: string[] = [];
    
    if (row["location_ids"]) {
      // New format: pipe-separated location IDs
      locationIds = String(row["location_ids"]).split('|').map(id => id.trim()).filter(id => id);
    } else if (row["location_id"]) {
      // Old format: single location ID
      locationIds = [String(row["location_id"]).trim()];
    }

    if (locationIds.length === 0) {
      return; // Skip if no valid location IDs
    }

    // Add locations to location map
    locationIds.forEach(locationId => {
      if (!locationMap.has(locationId)) {
        let displayName = locationId;
        if (priceGroupName && priceGroupName.includes(' - ')) {
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

    // Get or create item data
    if (!itemData.has(itemName)) {
      itemData.set(itemName, {
        priceGroupId: priceGroupId,
        priceGroupName: priceGroupName,
        priceId: priceId,
        locationPrices: new Map<string, number>()
      });
    }

    const item = itemData.get(itemName)!;
    
    // Add price for each location
    locationIds.forEach(locationId => {
      item.locationPrices.set(locationId, currentPrice);
    });
  });

  // Convert to CrossLocationPriceItem format
  const items: CrossLocationPriceItem[] = [];
  
  for (const [itemName, data] of itemData.entries()) {
    // Determine category using enhanced logic - focus on item name analysis since price_group_name is generic
    let categoryValue = "uncategorized";
    const lowerName = itemName.toLowerCase();
    
    // Use enhanced item name analysis (price_group_name is just "Huey Magoo's" so not useful)
    // Check for 3PD suffix first (highest priority)
    if (lowerName.includes("-3pd") || lowerName.includes(" 3pd") || lowerName.endsWith("3pd")) {
      categoryValue = "3pd";
    }
    // Check for EZ Cater suffix
    else if (lowerName.includes("-ezcatr") || lowerName.includes("ezcatr") || lowerName.includes("ez cater")) {
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
             lowerName.includes("party pack") || lowerName.includes("lunch boxes") ||
             lowerName.includes("tender bites sauced") || lowerName.includes("tender bites- ez cater")) {
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
             lowerName.includes("cheese sauce") || lowerName.includes("dip") ||
             lowerName.includes("baked beans")) {
      categoryValue = "sides";
    }
    else if (lowerName.startsWith("drink-") || lowerName.includes("tea") ||
             lowerName.includes("lemonade") || lowerName.includes("bottled water") ||
             lowerName.includes("gallon") || lowerName.includes("apple juice")) {
      categoryValue = "craft_drinks";
    }
    else if (lowerName.startsWith("meals-fam-") || lowerName.includes("family")) {
      categoryValue = "tenders_for_the_fam";
    }
    // Enhanced patterns for better categorization
    else if (lowerName.includes("tenders") && (lowerName.includes("50") || lowerName.includes("75") || lowerName.includes("100"))) {
      categoryValue = "instore_catering";
    }
    else if (lowerName.includes("bites") && (lowerName.includes("20") || lowerName.includes("25") || lowerName.includes("35") || lowerName.includes("45") || lowerName.includes("70"))) {
      categoryValue = "by_the_piece";
    }
    // Catch-all for items that don't fit standard categories
    else if (lowerName.includes("championship") || lowerName.includes("game day") ||
             lowerName.includes("overtime") || lowerName.includes("tailgate") ||
             lowerName.includes("addon") || lowerName.includes("freebie") ||
             lowerName.includes("promo") || lowerName.includes("bag of ice") ||
             lowerName.includes("breakfast") || lowerName.includes("concessions") ||
             lowerName.includes("99 cent") || lowerName.includes("50 for $50")) {
      categoryValue = "odds_and_ends";
    }

    // Determine if original item
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

    // Convert Map to object for locationPrices
    const locationPrices: { [locationId: string]: number } = {};
    for (const [locationId, price] of data.locationPrices.entries()) {
      locationPrices[locationId] = price;
    }

    const crossLocationItem: CrossLocationPriceItem = {
      id: data.priceId,
      name: itemName,
      category: categoryValue,
      isOriginal: isOriginal,
      sauceUnitCount: sauceUnitCount,
      originalId: undefined, // Will be set in second pass
      locationPrices: locationPrices,
      priceGroupId: data.priceGroupId
    };

    items.push(crossLocationItem);
  }

  // Second pass to link originalId for sauced items
  const finalItems = items.map(item => {
    if (!item.isOriginal) {
      let potentialOriginalName = item.name
        .replace(/-Sauced/gi, '')
        .replace(/ Sauced/gi, '')
        .replace(/ Mixed Sauce/gi, '')
        .trim();
      
      const originalItem = items.find(
        org => org.isOriginal &&
               org.category === item.category &&
               org.name.trim().toLowerCase() === potentialOriginalName.toLowerCase()
      );
      if (originalItem) {
        return { ...item, originalId: originalItem.id };
      }
    }
    return item;
  });

  // Debug categorization
  const categoryStats = new Map<string, number>();
  finalItems.forEach(item => {
    const count = categoryStats.get(item.category) || 0;
    categoryStats.set(item.category, count + 1);
  });
  
  console.log(`Processed ${finalItems.length} unique items across ${locationMap.size} locations`);
  console.log('Category breakdown:', Object.fromEntries(categoryStats.entries()));
  
  // Debug sample items and their categorization
  console.log('Sample items with categories:', finalItems.slice(0, 10).map(item => ({
    name: item.name,
    category: item.category,
    priceGroupName: itemData.get(item.name)?.priceGroupName
  })));

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