"use client";

import React, { useState, useEffect } from "react";
import { useGetAuthUserQuery } from "@/state/api";
import { hasAnyRole } from "@/lib/accessControl";
import Header from "@/components/Header";
import { PriceItem, parsePriceDataFromCsv, extractUniqueCategories } from "@/lib/priceDataUtils";

// CSV data embedded as a string for simulation
const csvDataString = `Category,Item Name,Current Price
Sandwiches & Wraps,MEALS-SANDW-Buffalo Sandwich,9.99
Sandwiches & Wraps,MEALS-SANDW-Buffalo Sandwich-AlaCarte,7.99
Sandwiches & Wraps,MEALS-SANDW-Buffalo Wrap-AlaCarte,7.99
Sandwiches & Wraps,MEALS-SANDW-Hot Chicken Sandwich,9.99
Sandwiches & Wraps,MEALS-SANDW-Magoo Sandwich-AlaCarte,7.19
Sandwiches & Wraps,MEALS-SANDW-Magoo Wrap-AlaCarte,7.99
Sandwiches & Wraps,MEALS-SANDW-Magoo's Sandwich,8.99
Sandwiches & Wraps,MEALS-SANDW-Sweet Caroline Sandwich,9.99
Sandwiches & Wraps,MEALS-SANDW-Sweet Caroline Sandwich-AlaCarte,7.99
Sandwiches & Wraps,MEALS-WRAP-Buffalo Wrap,9.99
Sandwiches & Wraps,MEALS-WRAP-Magoo's Wrap,9.99
For The Little Magoo's,Apple Juice,1.29
For The Little Magoo's,DRINK- Kids upgrade to Btld Water,1.30
For The Little Magoo's,DRINK- Kids upgrade to Large,0.60
For The Little Magoo's,DRINK- Kids upgrade to Regular,0.00
For The Little Magoo's,Kids- Goldfish Grahams,0.99
For The Little Magoo's,MEALS-KID-2 Piece,6.99
For The Little Magoo's,MEALS-KID-2 Piece-Sauced,7.49
Craft Drinks,DRINK-Bottled Water,2.59
Craft Drinks,DRINK-Gallon,7.99
Craft Drinks,DRINK-Gallon-Lemonade,7.99
Craft Drinks,DRINK-Gallon-Specialty Lemonade,9.99
Craft Drinks,DRINK-Large,2.99
Craft Drinks,DRINK-Large Lemonade,3.19
Craft Drinks,DRINK-Regular,2.69
Craft Drinks,DRINK-Regular Lemonade,2.69
Craft Drinks,DRINK-Water cup,0.00
Tender Meals,MEALS- 8 Bites Sauced Special,9.99
Tender Meals,MEALS- 8 Bites Special,8.99
Tender Meals,MEALS-10 Bites Original,10.49
Tender Meals,MEALS-10 Bites Sauced,11.49
Tender Meals,MEALS-3 Original,7.99
Tender Meals,MEALS-3 Sauced,8.74
Tender Meals,Meals-4 Original,10.49
Tender Meals,Meals-4 Sauced,11.49
Tender Meals,MEALS-5 Original,10.99
Tender Meals,MEALS-5 Sauced,12.24
Tender Meals,MEALS-7 Original,12.99
Tender Meals,MEALS-7 Sauced,14.74
Tender Meals,MEALS-8 Original,16.99
Tender Meals,MEALS-8 Sauced,18.99
Tenders For The Fam,FAMILY-Side Salad Upgrade,5.99
Tenders For The Fam,MEALS-FAM-20 Original,39.99
Tenders For The Fam,MEALS-FAM-30 Original,59.99
Tenders For The Fam,MEALS-FAM-SaucedTender,2.50
By The Piece,BTP- 3 Original Bites,0.00
By The Piece,BTP-1 Original,1.69
By The Piece,BTP-1 Sauced,1.94
By The Piece,BTP-10 Original,15.99
By The Piece,BTP-10 Sauced,18.49
By The Piece,BTP-20 Original,31.99
By The Piece,BTP-20 Sauced,36.99
By The Piece,BTP-5 Bites Original_Nona_LMary,100.00
By The Piece,BTP-5 Bites Sauced_Nona_LMary,100.00
By The Piece,BTP-6 Original,9.99
By The Piece,BTP-6 Sauced,11.49
By The Piece,By The Piece- 5 Original Bites,3.75
By The Piece,By The Piece- 5 Sauced Bites,4.25
Fresh-Made Salads,SAL-4Tenders-ORG,7.56
Fresh-Made Salads,SAL-4Tenders-Sauced,8.56
Fresh-Made Salads,SAL-Buffalo,10.99
Fresh-Made Salads,SAL-ExtraTender-ORG,2.78
Fresh-Made Salads,SAL-ExtraTender-Sauced,3.18
Fresh-Made Salads,SAL-Farm Fresh,10.99
Fresh-Made Salads,SAL-Magoo's Favorite,10.99
Fresh-Made Salads,SAL-Side Salad,4.99
Fresh-Made Salads,"SAL-Side Salad, LG",6.99
Fresh-Made Salads,Salad/SandW-Mods,0.59
Sides,Side Salad Upgrade,2.00
Sides,"SIDE-Cheese Sauce, Personal",1.39
Sides,"SIDE-Cheese Sauce, Regular",2.49
Sides,"SIDE-Cole Slaw, Large",3.99
Sides,"SIDE-Cole Slaw, Regular",2.99
Sides,"SIDE-Crinkle Cut Fries, Large",3.99
Sides,"SIDE-Crinkle Cut Fries, Regular",2.99
Sides,SIDE-DIP-2OZ,0.79
Sides,SIDE-DIP-2OZ-HOMEMADE,0.59
Sides,SIDE-DIP-LG,5.99
Sides,"SIDE-Fresh Cut Chips, Large",3.99
Sides,"SIDE-Fresh Cut Chips, Regular",2.99
Sides,"SIDE-Texas Toast, 1 Piece",1.39
Sides,"SIDE-Texas Toast, 3 Piece",4.17
InStore Catering,CAT- 125 Tender Bites,69.99
InStore Catering,CAT- Tender Bites Box,10.99
InStore Catering,CAT-100 Tenders,139.99
InStore Catering,CAT-250 Tender Bites,125.99
InStore Catering,CAT-50 Tenders,79.99
InStore Catering,CAT-75 Tenders,109.99
InStore Catering,CAT-Bottled Water,2.59
InStore Catering,CAT-DES-Banana Pudding,39.99
InStore Catering,CAT-DES-Cookies,20.99
InStore Catering,CAT-Fries,100.00
InStore Catering,CAT-Gallon Drink,7.99
InStore Catering,CAT-Garden Salad,39.99
InStore Catering,CAT-Lunch Boxes,10.99
InStore Catering,CAT-Mac and Ch,54.99
InStore Catering,CAT-Party Pack 15,199.99
InStore Catering,CAT-Party Pack 25,299.99
InStore Catering,CAT-SIDE-Baked Beans,25.99
InStore Catering,CAT-SIDE-Cole Slaw,20.99
InStore Catering,CAT-SIDE-Dip,4.19
InStore Catering,CAT-SIDE-Fresh Cut Chips,20.99
InStore Catering,CAT-SIDE-Fries,20.99
InStore Catering,CAT-SIDE-Texas Toast,14.99
InStore Catering,CAT-Snack Wraps,79.99
InStore Catering,CAT-Tailgate Box (10),99.00
InStore Catering,CAT-Wrap Pack,179.99
EZ Cater,100 Tenders-EZCATR,155.99
EZ Cater,16 OZ Dips-EZCATR,5.99
EZ Cater,50 Tenders-EZCATR,95.99
EZ Cater,75 Tenders-EZCATR,119.99
EZ Cater,Baked Beans-EZCATR,31.19
EZ Cater,Banana Pudding-EZCATR,41.99
EZ Cater,Bottled Water-EZCATR,2.39
EZ Cater,CAT- Tender Bites Box- EZCATR,10.99
EZ Cater,Cole Slaw-EZCATR,25.19
EZ Cater,Cookies-EZCATR,25.19
EZ Cater,Fresh Cut CHips-EZCATR,25.19
EZ Cater,Garden Salad-EZCATR,47.99
EZ Cater,Iced Tea-EZCATR,9.59
EZ Cater,Lunch Boxes-EZCATR,12.99
EZ Cater,Party Pack 15-EZCATR,215.99
EZ Cater,Party Pack 25-EZCATR,359.99
EZ Cater,Snack Wraps-EZCATR,65.99
EZ Cater,Texas Toast-EZCATR,19.19
EZ Cater,Wrap Pack-EZCATR,179.99
3PD,BTP-1 Original-3PD,100.00
3PD,"SAL-Side Salad, LG-3PD",7.99
3PD,"SIDE-Cheese Sauce, Personal-3PD",1.69
3PD,100 Tenders-3PD,180.99
3PD,45 Bites 3pd,39.99
3PD,50 Tenders-3PD,106.49
3PD,70 Bites- 3pd,59.99
3PD,75 Tenders-3PD,143.99
3PD,BTP-1 Sauced-3PD,100.00
3PD,BTP-10 Original-3PD,17.99
3PD,BTP-10 Sauced-3PD,20.49
3PD,BTP-20 Original-3PD,39.99
3PD,BTP-20 Sauced-3PD,44.99
3PD,BTP-6 Original-3PD,11.49
3PD,BTP-6 Sauced-3PD,12.99
3PD,By Piece - 10 Bites Original-3PD,9.10
3PD,"By The Piece- 5 Original Bites- 3PD",4.50
3PD,"By The Piece- 5 Sauced Bites- 3PD",5.10
3PD,CAT-Gallon Drink - 3pd,8.99
3PD,DES-Banana Pudding-Large-3PD,8.99
3PD,DES-Banana Pudding-Reg-3PD,3.99
3PD,DES-Cookies-3PD,1.99
3PD,DES-Cookies-4-3PD,7.96
3PD,DES-Cookies-6-3PD,11.94
3PD,DRINK-Bottled Water-3PD,2.79
3PD,DRINK-Large-3PD,3.29
3PD,DRINK-Regular-3PD,2.99
3PD,FAMILY-Side Salad Upgrade-3PD,7.49
3PD,"MEALS-10 Bites Original- 3PD",12.59
3PD,"MEALS-10 Bites Sauced- 3PD",13.79
3PD,MEALS-3 Original-3PD,9.59
3PD,MEALS-3 Sauced-3PD,10.34
3PD,Meals-4 Original-3PD,13.49
3PD,Meals-4 Sauced-3pd,100.00
3PD,MEALS-5 Original-3PD,12.49
3PD,MEALS-5 Sauced-3PD,13.74
3PD,MEALS-7 Original-3PD,14.99
3PD,MEALS-7 Sauced-3PD,16.74
3PD,MEALS-8 Original-3PD,18.99
3PD,MEALS-8 Sauced-3PD,20.99
3PD,MEALS-FAM-20 Original-3PD,46.99
3PD,MEALS-FAM-30 Original-3PD,69.99
3PD,MEALS-KID-2 Piece-3PD,7.99
3PD,MEALS-KID-2 Piece-sauced-3PD,8.49
3PD,MEALS-SANDW-Buffalo Sandwich-3PD,11.49
3PD,MEALS-SANDW-Buffalo Sandwich-AlaCarte-3PD,9.49
3PD,MEALS-SANDW-Buffalo Wrap-AlaCarte-3PD,9.49
3PD,MEALS-SANDW-Magoo Sandwich-AlaCarte-3PD,8.99
3PD,MEALS-SANDW-Magoo Wrap-AlaCarte-3PD,9.49
3PD,MEALS-SANDW-Magoo's Sandwich-3PD,9.99
3PD,MEALS-SANDW-Sweet Caroline Sandwich-3PD,11.49
3PD,MEALS-SANDW-Sweet Caroline Sandwich-AlaCarte-3PD,9.49
3PD,MEALS-WRAP-Buffalo Wrap-3PD,11.49
3PD,MEALS-WRAP-Magoo's Wrap-3PD,11.49
3PD,SAL-Buffalo-3PD,12.99
3PD,SAL-ExtraTender-ORG-3PD,3.34
3PD,SAL-ExtraTender-Sauced-3PD,3.82
3PD,SAL-Farm Fresh-3PD,12.99
3PD,SAL-Magoo's Favorite-3PD,12.99
3PD,SAL-Side Salad-3PD,5.99
3PD,"Side Salad Upgrade - 3PD",2.00
3PD,"SIDE-Cheese Sauce, Regular-3PD",2.99
3PD,"SIDE-Cole Slaw, Large-3PD",4.49
3PD,"SIDE-Cole Slaw, Regular-3PD",3.49
3PD,"SIDE-Crinkle Cut Fries, Large-3PD",4.49
3PD,"SIDE-Crinkle Cut Fries, Regular-3PD",3.49
3PD,SIDE-DIP-2OZ-3PD,0.89
3PD,SIDE-DIP-2OZ-HOMEMADE-3PD,0.59
3PD,SIDE-DIP-LG-3PD,6.99
3PD,"SIDE-Fresh Cut Chips, Large-3PD",4.49
3PD,"SIDE-Fresh Cut Chips, Regular-3PD",3.49
3PD,"SIDE-Texas Toast, 1 Piece-3PD",1.69
3PD,"SIDE-Texas Toast, 3 Piece - 3PD",5.07
3PD,"SSW Mods - 3PD",0.69
Odds and Ends,CAT- 125 Tender Bites Sauced,82.49
Odds and Ends,CAT- 250 Tender Bites Sauced,150.99
Odds and Ends,"125 Sauced Tender Bites- EZ Cater",99.99
Odds and Ends,"125 Tender Bites- EZ Cater",85.99
Odds and Ends,20 Sauced Bites,2.00
Odds and Ends,25 Sauced Bites,2.50
Odds and Ends,"250 Sauced Tender Bites- EZ Cater",169.99
Odds and Ends,"250 Tender Bites- EZ Cater",139.99
Odds and Ends,35 Sauced Bites,3.50
Odds and Ends,45 Bites,31.99
Odds and Ends,50 for $50,50.00
Odds and Ends,70 Bites,47.99
Odds and Ends,"8 BITES MIXED SAUCE- (No Bev)",6.99
Odds and Ends,"8 BITES ORIGINAL- (No Bev)",5.99
Odds and Ends,99 Cent Bev Promo,0.99
Odds and Ends,ADDON- 3 tenders,0.75
Odds and Ends,ADDON-SaladTenders,1.00
Odds and Ends,Addon-Sauced 50 Tenders,12.50
Odds and Ends,Addon-Sauced25Tenders,6.25
Odds and Ends,"Addon-Sauced25Tenders-3 PD",8.50
Odds and Ends,Bag of Ice,1.00
Odds and Ends,Breakfast Bowl,10.00
Odds and Ends,Breakfast Burrito,10.00
Odds and Ends,By Piece - 10 Bites Original,7.50
Odds and Ends,Championship Platter,1799.99
Odds and Ends,Concessions Meal,4.00
Odds and Ends,"Cup of Ice - Large",1.50
Odds and Ends,"Cup of Ice - Regular",1.00
Odds and Ends,DES-Banana Pudding-Large,8.49
Odds and Ends,DES-Banana Pudding-Reg,3.49
Odds and Ends,DES-Cookies,1.89
Odds and Ends,Des-Cookies-4,7.56
Odds and Ends,Des-Cookies-6,11.34
Odds and Ends,"Freebie- LM/LN- 45 BITES",8.00
Odds and Ends,"Freebie- LM/LN-70 BITES",16.00
Odds and Ends,Game Day Platter,719.19
Odds and Ends,IncludedDip-Digital,0.00
Odds and Ends,Overtime Platter,1199.99
Odds and Ends,Tailgate Package,99.99
Odds and Ends,Tailgate Package Sauced,112.49
`;

const PricePortalPage = () => {
  const { data: userData, isLoading: userIsLoading } = useGetAuthUserQuery({});
  const teamRoles = userData?.userDetails?.team?.teamRoles;
  const user = userData?.userDetails;
  
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [categoryList, setCategoryList] = useState<{ value: string, label: string }[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const CURRENT_SAUCE_PRICE = 0.50; 
  const [newSaucedPrice, setNewSaucedPrice] = useState<number>(CURRENT_SAUCE_PRICE);
  const [priceChanges, setPriceChanges] = useState<{[key: string]: number}>({});
  const [syncedItems, setSyncedItems] = useState<{[key: string]: boolean}>({});
  const [syncAll, setSyncAll] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);
      try {
        const parsedItems = await parsePriceDataFromCsv(csvDataString);
        setPriceItems(parsedItems);
        const uniqueCategories = extractUniqueCategories(parsedItems);
        setCategoryList(uniqueCategories);
      } catch (error) {
        console.error("Error loading or parsing price data:", error);
        // Handle error appropriately, e.g., set an error state
      } finally {
        setDataLoading(false);
      }
    };
    loadData();
  }, []); // Runs once on mount

  useEffect(() => {
    if (categoryList.length > 0) {
      const initialExpansionState: {[key: string]: boolean} = {};
      categoryList.forEach(cat => {
        if (cat.value !== 'all') { 
          initialExpansionState[cat.label] = true; 
        }
      });
      setExpandedCategories(initialExpansionState);
    }
  }, [categoryList]);


  const hasAccess = hasAnyRole(teamRoles, ['LOCATION_ADMIN', 'ADMIN', 'PRICE_ADMIN']);
  const isPriceDisabled = false; 

  const userLocations = [
    { id: '101', name: 'Downtown Location' },
    { id: '102', name: 'Mall Location' }
  ];

  const filteredItems: PriceItem[] = selectedCategory === 'all'
    ? priceItems // Use state variable
    : priceItems.filter(item => item.category === selectedCategory);
  
  const sortedItems: PriceItem[] = [...filteredItems].sort((a, b) => {
    return sortOrder === 'asc'
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name);
  });

  const groupedItems = sortedItems.reduce((acc: {[key: string]: PriceItem[]}, item: PriceItem) => {
    const categoryInfo = categoryList.find(c => c.value === item.category); // Use categoryList state
    const categoryLabel = categoryInfo?.label || 'Uncategorized';
    if (!acc[categoryLabel]) {
      acc[categoryLabel] = [];
    }
    acc[categoryLabel].push(item);
    return acc;
  }, {} as {[key: string]: PriceItem[]});

  const toggleCategoryExpansion = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const handlePriceChange = (itemLocationKey: string, newRegularPrice: number) => {
    setPriceChanges(prevChanges => {
      const updatedChanges = {
        ...prevChanges,
        [itemLocationKey]: newRegularPrice
      };

      const [itemId] = itemLocationKey.split('-'); // locationId not used here currently for update logic
      const changedItem = priceItems.find(pItem => pItem.id === itemId); // Use priceItems state

      if (changedItem && changedItem.isOriginal) {
        const saucedItem = priceItems.find(pItem => pItem.originalId === itemId); // Use priceItems state
        
        if (saucedItem) {
          const unitCount = changedItem.sauceUnitCount || 1;
          const calculatedSaucedItemPrice = newRegularPrice + (unitCount * newSaucedPrice);
          
          // Need to find all locations for this sauced item if we are to update them all
          // For now, this logic assumes the itemLocationKey implies the specific sauced item instance to update
          // This might need refinement if a single price change for an original should update sauced items across all locations shown
          const locationId = itemLocationKey.substring(itemId.length + 1); // Extract locationId
          const saucedItemKey = `${saucedItem.id}-${locationId}`;
          updatedChanges[saucedItemKey] = parseFloat(calculatedSaucedItemPrice.toFixed(2));
        }
      }
      return updatedChanges;
    });
  };

  const handleSyncToggle = (itemId: string) => {
    setSyncedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleSubmitChanges = () => {
    console.log('Submitting price changes:', priceChanges);
  };

  if (userIsLoading || dataLoading) { // Check both user loading and data loading
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading page data...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-xl font-semibold text-red-600">Access Denied</div>
        <div className="text-gray-600">
          You need LOCATION_ADMIN, ADMIN, or PRICE_ADMIN role access to view this content.
        </div>
      </div>
    );
  }

  if (isPriceDisabled) {
    return (
      <div className="p-6">
        <Header name="Price Portal" />
        <div className="mt-6">
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <div className="text-red-600 dark:text-red-400 text-xl font-bold mb-2">
              Price Management Disabled
            </div>
            <div className="text-red-700 dark:text-red-300 mb-4">
              Your price management access has been temporarily disabled.
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              Contact your administrator for assistance: admin@hueymagoos.com
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Header name={`Price Portal - ${user?.username || 'User'}`} />
      
      <div className="mt-6 space-y-6">
        {/* User Locations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Your Locations
          </h2>
          <div className="flex flex-wrap gap-2">
            {userLocations.map(location => (
              <span
                key={location.id}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
              >
                {location.name}
              </span>
            ))}
          </div>
        </div>

        {/* Sauced Tender Price Control */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 max-w-lg mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
            Sauced Tender Price Control
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-md border">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Current Per Tender Sauce Price:
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                ${CURRENT_SAUCE_PRICE.toFixed(2)}
              </span>
            </div>
            <div>
              <div className="flex items-center mb-2">
                <label htmlFor="newSaucedPriceInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  NEW Per Tender Sauced Price:
                </label>
                <div className="relative ml-2 group">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-700 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                    This is the additional upcharge for making a tender meal &lsquo;sauced&rsquo;. Modifying this value will be used to calculate prices for &ldquo;Sauced&rdquo; menu items if automatic calculation is implemented.
                    <svg className="absolute text-gray-700 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                  </div>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  id="newSaucedPriceInput"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newSaucedPrice}
                  onChange={(e) => setNewSaucedPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filtering and Sorting Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {categoryList.map(category => ( // Use categoryList state
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="asc">A-Z</option>
                <option value="desc">Z-A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Price Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Price Management
              </h3>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={syncAll}
                  onChange={(e) => setSyncAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Sync All Locations</span>
              </label>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sync
                  </th>
                  {userLocations.map(location => (
                    <th key={location.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                      {location.name.toUpperCase()}
                    </th>
                  ))}
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">
                    {/* Empty for item name column */}
                  </th>
                  <th className="px-6 py-2">
                    {/* Empty for sync column */}
                  </th>
                  {userLocations.map(location => (
                    <th key={location.id} className="px-6 py-2">
                      <div className="flex justify-center items-center space-x-8 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        <span className="w-16 text-center">Current</span>
                        <span className="w-16 text-center">New</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {Object.entries(groupedItems).map(([categoryName, itemsInCategory]) => (
                  <React.Fragment key={categoryName}>
                    <tr
                      className="bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 cursor-pointer border-t border-b border-gray-300 dark:border-gray-600"
                      onClick={() => toggleCategoryExpansion(categoryName)}
                    >
                      <td colSpan={2 + userLocations.length} className="px-6 py-3 text-left">
                        <div className="flex items-center">
                          <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                            {expandedCategories[categoryName] ? '▼' : '►'} {categoryName} ({itemsInCategory.length})
                          </span>
                        </div>
                      </td>
                    </tr>
                    {expandedCategories[categoryName] && itemsInCategory.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700/50 last:border-b-0">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={syncedItems[item.id] || false}
                            onChange={() => handleSyncToggle(item.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        {userLocations.map(location => (
                          <td key={location.id} className="px-6 py-4 text-center">
                            <div className="flex justify-center items-center space-x-4">
                              <div className="w-16 text-center">
                                <span className="inline-block px-2 py-1 text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-600 rounded">
                                  ${item.currentPrice.toFixed(2)}
                                </span>
                              </div>
                              <div className="w-16">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder={item.currentPrice.toFixed(2)}
                                  value={priceChanges[`${item.id}-${location.id}`] || ''}
                                  onChange={(e) => handlePriceChange(`${item.id}-${location.id}`, parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  disabled={syncedItems[item.id] && location.id !== userLocations[0]?.id}
                                />
                              </div>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSubmitChanges}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Submit Price Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricePortalPage;