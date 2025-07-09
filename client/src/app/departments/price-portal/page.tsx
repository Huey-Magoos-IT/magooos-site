"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useGetAuthUserQuery } from "@/state/api";
import { useGetPriceDataMutation, useGetLocationsQuery, Location } from "@/state/lambdaApi";
import { hasAnyRole, hasLocationAccess } from "@/lib/accessControl";
import Header from "@/components/Header";
import { PriceItem, extractUniqueCategories } from "@/lib/priceDataUtils";

const PricePortalPage = () => {
    const { data: authData, isLoading: userIsLoading } = useGetAuthUserQuery({});
    const { data: locationsData, isLoading: locationsIsLoading } = useGetLocationsQuery();
    const [
        getPriceData,
        { isLoading: isPriceDataLoading, error: priceDataError },
    ] = useGetPriceDataMutation();

    const teamRoles = authData?.userDetails?.team?.teamRoles;
    const user = authData?.userDetails;
    
    const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
    const [categoryList, setCategoryList] = useState<{ value: string, label: string }[]>([]);
    
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [newSaucedPrice, setNewSaucedPrice] = useState<number>(0.50);
    const [priceChanges, setPriceChanges] = useState<{[key: string]: number}>({});
    const [syncedItems, setSyncedItems] = useState<{[key: string]: boolean}>({});
    const [syncAll, setSyncAll] = useState<boolean>(false);
    const [expandedCategories, setExpandedCategories] = useState<{[key: string]: boolean}>({});

    useEffect(() => {
        const loadAndProcessData = async () => {
            // Ensure we have the necessary data before proceeding
            if (user?.locationIds && locationsData?.locations) {
                try {
                    const result = await getPriceData({ s3_key: 'price-pool/2025-07-07-prices.csv' }).unwrap();
                    
                    if (result.data) {
                        const allItems: PriceItem[] = result.data;
                        // Filter items based on the user's location access
                        const accessibleItems = allItems.filter((item: PriceItem) => 
                            hasLocationAccess(user.locationIds, item.location_id)
                        );
                        setPriceItems(accessibleItems);
                        const uniqueCategories = extractUniqueCategories(accessibleItems);
                        setCategoryList(uniqueCategories);
                    }
                } catch (error) {
                    console.error("Error loading or parsing price data:", error);
                }
            }
        };
        loadAndProcessData();
    }, [user, locationsData, getPriceData]);

    useEffect(() => {
        if (categoryList.length > 0) {
            const initialExpansionState: {[key: string]: boolean} = {};
            categoryList.forEach((cat: { value: string, label: string }) => {
                if (cat.value !== 'all') {
                    initialExpansionState[cat.label] = true;
                }
            });
            setExpandedCategories(initialExpansionState);
        }
    }, [categoryList]);

    const userLocations: Location[] = useMemo(() => {
        if (!user?.locationIds || !locationsData?.locations) return [];
        // The user.locationIds is an array of strings. We need to find the full location objects.
        return locationsData.locations.filter((location: Location) => user.locationIds!.includes(location.id));
    }, [user?.locationIds, locationsData?.locations]);

    const hasAccess = hasAnyRole(teamRoles, ['LOCATION_ADMIN', 'ADMIN', 'PRICE_ADMIN']);
    const isPriceDisabled = false;

    const filteredItems: PriceItem[] = selectedCategory === 'all'
        ? priceItems
        : priceItems.filter((item: PriceItem) => item.category === selectedCategory);
  
    const sortedItems: PriceItem[] = [...filteredItems].sort((a: PriceItem, b: PriceItem) => {
        return sortOrder === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
    });

    const groupedItems = sortedItems.reduce((acc: {[key: string]: PriceItem[]}, item: PriceItem) => {
        const categoryLabel = categoryList.find((c: {value: string}) => c.value === item.category)?.label || 'Uncategorized';
        if (!acc[categoryLabel]) {
            acc[categoryLabel] = [];
        }
        acc[categoryLabel].push(item);
        return acc;
    }, {} as {[key: string]: PriceItem[]});

    const toggleCategoryExpansion = (categoryName: string) => {
        setExpandedCategories(prev => ({ ...prev, [categoryName]: !prev[categoryName] }));
    };

    const handlePriceChange = (itemLocationKey: string, newRegularPrice: number) => {
        setPriceChanges(prevChanges => {
            const updatedChanges = { ...prevChanges, [itemLocationKey]: newRegularPrice };
            const [itemId] = itemLocationKey.split('-');
            const changedItem = priceItems.find((pItem: PriceItem) => pItem.id === itemId);

            if (changedItem?.isOriginal) {
                const saucedItem = priceItems.find((pItem: PriceItem) => pItem.originalId === itemId);
                if (saucedItem) {
                    const unitCount = changedItem.sauceUnitCount || 1;
                    const calculatedSaucedItemPrice = newRegularPrice + (unitCount * newSaucedPrice);
                    const locationId = itemLocationKey.substring(itemId.length + 1);
                    const saucedItemKey = `${saucedItem.id}-${locationId}`;
                    updatedChanges[saucedItemKey] = parseFloat(calculatedSaucedItemPrice.toFixed(2));
                }
            }
            return updatedChanges;
        });
    };

    const handleSyncToggle = (itemId: string) => {
        setSyncedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    const handleSubmitChanges = () => {
        console.log('Submitting price changes:', priceChanges);
    };

    if (userIsLoading || locationsIsLoading || isPriceDataLoading) {
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

    // Main component render
    return (
        <div className="p-6">
            <Header name={`Price Portal - ${user?.username || 'User'}`} />
            
            <div className="mt-6 space-y-6">
                {/* User Locations Display */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Locations</h2>
                    <div className="flex flex-wrap gap-2">
                        {userLocations.map((location: Location) => (
                            <span key={location.id} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                                {location.name}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Price Management Table & Controls */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    { priceDataError && <div className="p-4 text-red-500">Error loading price data.</div> }
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item Name</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sync</th>
                                    {userLocations.map((location: Location) => (
                                        <th key={location.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                                            {location.name.toUpperCase()}
                                        </th>
                                    ))}
                                </tr>
                                {/* Sub-headers for Current/New */}
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800">
                                {Object.entries(groupedItems).map(([categoryName, itemsInCategory]) => (
                                    <React.Fragment key={categoryName}>
                                        <tr className="bg-gray-100 dark:bg-gray-700/50 cursor-pointer" onClick={() => toggleCategoryExpansion(categoryName)}>
                                            <td colSpan={2 + userLocations.length} className="px-6 py-3 text-left font-semibold">
                                                {expandedCategories[categoryName] ? '▼' : '►'} {categoryName} ({itemsInCategory.length})
                                            </td>
                                        </tr>
                                        {expandedCategories[categoryName] && itemsInCategory.map((item: PriceItem) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.name}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <input type="checkbox" checked={syncedItems[item.id] || false} onChange={() => handleSyncToggle(item.id)} />
                                                </td>
                                                {userLocations.map((location: Location) => {
                                                    // Find the specific price item for this location
                                                    const locationItem = priceItems.find(p => p.id === item.id && p.location_id === location.id) || item;
                                                    return (
                                                        <td key={location.id} className="px-6 py-4 text-center">
                                                            <div className="flex justify-center items-center space-x-4">
                                                                <span className="inline-block px-2 py-1 text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-600 rounded">
                                                                    ${locationItem.currentPrice.toFixed(2)}
                                                                </span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    placeholder={locationItem.currentPrice.toFixed(2)}
                                                                    value={priceChanges[`${item.id}-${location.id}`] || ''}
                                                                    onChange={(e) => handlePriceChange(`${item.id}-${location.id}`, parseFloat(e.target.value) || 0)}
                                                                    className="w-24 px-2 py-1 text-sm border rounded"
                                                                    disabled={syncedItems[item.id] && userLocations[0] && location.id !== userLocations[0].id}
                                                                />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button onClick={handleSubmitChanges} className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Submit Price Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PricePortalPage;