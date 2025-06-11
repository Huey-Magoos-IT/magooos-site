"use client";

import React, { useState, useEffect } from "react";
import { useGetAuthUserQuery } from "@/state/api";
import { hasAnyRole } from "@/lib/accessControl";
import Header from "@/components/Header";

interface PriceItem {
  id: string;
  name: string;
  category: string;
  currentPrice: number;
  isOriginal: boolean;
  sauceUnitCount?: number;
  originalId?: string;
}

const PricePortalPage = () => {
  const { data: userData, isLoading } = useGetAuthUserQuery({});
  const teamRoles = userData?.userDetails?.team?.teamRoles;
  const user = userData?.userDetails;
  
  // State for price management
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const CURRENT_SAUCE_PRICE = 0.50; // Define current sauce price
  const [newSaucedPrice, setNewSaucedPrice] = useState<number>(CURRENT_SAUCE_PRICE); // Initialize with current price
  const [priceChanges, setPriceChanges] = useState<{[key: string]: number}>({});
  const [syncedItems, setSyncedItems] = useState<{[key: string]: boolean}>({});
  const [syncAll, setSyncAll] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<{[key: string]: boolean}>({});

  // Mock price categories - Moved up
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'sandwiches', label: 'Sandwiches & Wraps' },
    { value: 'tenders', label: 'Tender Meals' },
    { value: 'kids', label: 'For The Little Magoos' },
    { value: 'drinks', label: 'Craft Drinks' },
    { value: 'family', label: 'Tenders For The Fam' },
    { value: 'piece', label: 'By The Piece' },
    { value: 'salads', label: 'Fresh-Made Salads' },
    { value: 'sides', label: 'Sides' },
    { value: 'catering', label: 'InStore Catering' }
    // Note: The user's larger list implies more categories.
    // This `categories` array will need to be updated when the large item list is integrated.
    // For now, using the existing small set for the useEffect dependency.
  ];

  // Initialize expandedCategories state once categories are available
  useEffect(() => {
    const initialExpansionState: {[key: string]: boolean} = {};
    categories.forEach(cat => {
      if (cat.value !== 'all') { // 'all' is not a displayable category group
        initialExpansionState[cat.label] = true; // Default to all expanded
      }
    });
    setExpandedCategories(initialExpansionState);
  }, [categories]); // Add categories to dependency array


  // Check if user has access to price portal
  const hasAccess = hasAnyRole(teamRoles, ['LOCATION_ADMIN', 'ADMIN', 'PRICE_ADMIN']);
  
  // Mock check for if user's price access is disabled (will be replaced with real API)
  const isPriceDisabled = false; // TODO: Get from user.priceDisabled or API

  // Mock user locations (will be replaced with real user.locationIds)
  const userLocations = [
    { id: '101', name: 'Downtown Location' },
    { id: '102', name: 'Mall Location' }
  ];

  // Mock price items (will be replaced with real API data)
  const mockPriceItems: PriceItem[] = [
    { id: '1', name: 'Buffalo Chicken Sandwich', category: 'sandwiches', currentPrice: 12.99, isOriginal: true, sauceUnitCount: 1 },
    { id: '2', name: 'Buffalo Chicken Sandwich - Sauced', category: 'sandwiches', currentPrice: 13.99, isOriginal: false, originalId: '1' },
    { id: '3', name: '3 Tender Meal', category: 'tenders', currentPrice: 10.99, isOriginal: true, sauceUnitCount: 3 },
    { id: '4', name: '3 Tender Meal - Sauced', category: 'tenders', currentPrice: 11.99, isOriginal: false, originalId: '3' },
    { id: '5', name: 'Kids 2 Tender Meal', category: 'kids', currentPrice: 7.99, isOriginal: true, sauceUnitCount: 2 },
    { id: '6', name: 'Sweet Tea', category: 'drinks', currentPrice: 2.99, isOriginal: true }, // No sauceUnitCount needed as it's not sauced
  ];

  const filteredItems: PriceItem[] = selectedCategory === 'all'
    ? mockPriceItems
    : mockPriceItems.filter(item => item.category === selectedCategory);
  
  const sortedItems: PriceItem[] = [...filteredItems].sort((a, b) => {
    return sortOrder === 'asc'
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name);
  });

  // Group items by category
  const groupedItems = sortedItems.reduce((acc: {[key: string]: PriceItem[]}, item: PriceItem) => {
    const categoryLabel = categories.find(c => c.value === item.category)?.label || 'Uncategorized';
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

      const [itemId, locationId] = itemLocationKey.split('-');
      const changedItem = mockPriceItems.find(pItem => pItem.id === itemId);

      // If the changed item is an original item, try to update its sauced version
      if (changedItem && changedItem.isOriginal) {
        const saucedItem = mockPriceItems.find(pItem => pItem.originalId === itemId);
        
        if (saucedItem) {
          // Use sauceUnitCount from the item data, default to 1 if not specified
          const unitCount = (changedItem as any).sauceUnitCount || 1;
          // newSaucedPrice state holds the per-tender sauce upcharge
          const calculatedSaucedItemPrice = newRegularPrice + (unitCount * newSaucedPrice);
          
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
    // TODO: Implement price submission logic
    console.log('Submitting price changes:', priceChanges);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
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
                {categories.map(category => (
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