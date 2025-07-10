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
  type CsvRow = {
    "price_group_id": string;
    "price_group_name": string;
    "location_ids": string;
    "priceId": string;
    "reportTitle": string;
    "value": string;
    [key: string]: any;
  };

  const parsedCsv: ParsedCSVData<CsvRow> = await parseCSV<CsvRow>(csvString, true);
  
  if (parsedCsv.errors.length > 0) {
    console.error("CSV parsing errors:", parsedCsv.errors);
  }

  let idCounter = 0;
  const rawPriceItems: PriceItem[] = [];

  // Process each row and expand it for each location
  parsedCsv.data.forEach((row, index) => {
    const priceGroupId = row["price_group_id"];
    const priceGroupName = row["price_group_name"];
    const locationIdsStr = row["location_ids"];
    const priceId = row["priceId"];
    const itemName = row["reportTitle"];
    const currentPriceStr = row["value"];

    if (!priceGroupId || !itemName || currentPriceStr === undefined || !locationIdsStr) {
      console.warn(`Skipping row ${index} due to missing required fields:`, {
        priceGroupId: !!priceGroupId,
        itemName: !!itemName,
        currentPriceStr: currentPriceStr !== undefined,
        locationIdsStr: !!locationIdsStr
      });
      return; // Skip invalid rows
    }

    const currentPrice = parseFloat(String(currentPriceStr));
    if (isNaN(currentPrice)) {
      console.warn(`Skipping row ${index} due to invalid price:`, currentPriceStr);
      return; // Skip rows with invalid price
    }

    // Split location_ids by pipe separator - ensure it's a string first
    const locationIds = String(locationIdsStr || '').split('|').map(id => id.trim()).filter(id => id);
    
    if (locationIds.length === 0) {
      console.warn(`Skipping row ${index} - no valid location IDs found in:`, locationIdsStr);
      return;
    }

    // Create a PriceItem for each location
    locationIds.forEach(locationId => {
      idCounter++;
      
      // Determine category from item name (simplified logic)
      let categoryValue = "uncategorized";
      const lowerName = itemName.toLowerCase();
      
      if (lowerName.includes("sandwich") || lowerName.includes("wrap")) {
        categoryValue = "sandwiches_wraps";
      } else if (lowerName.includes("tender") && (lowerName.includes("meal") || lowerName.includes("combo"))) {
        categoryValue = "tender_meals";
      } else if (lowerName.includes("tender") && lowerName.includes("piece")) {
        categoryValue = "by_the_piece";
      } else if (lowerName.includes("salad")) {
        categoryValue = "fresh_made_salads";
      } else if (lowerName.includes("side") || lowerName.includes("fries") || lowerName.includes("slaw")) {
        categoryValue = "sides";
      } else if (lowerName.includes("drink") || lowerName.includes("tea") || lowerName.includes("lemonade")) {
        categoryValue = "craft_drinks";
      } else if (lowerName.includes("kid") || lowerName.includes("little")) {
        categoryValue = "for_the_little_magoos";
      } else if (lowerName.includes("catering") || lowerName.includes("cat-")) {
        categoryValue = "instore_catering";
      }

      const idPrefix = categoryValue.length >= 2 ? categoryValue.substring(0, 2).toLowerCase() : 'un';
      const id = `${idPrefix}${idCounter.toString().padStart(3, '0')}`;

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

      rawPriceItems.push({
        id,
        name: itemName,
        category: categoryValue,
        currentPrice,
        isOriginal,
        sauceUnitCount,
        location_id: locationId,
      });
    });
  });

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