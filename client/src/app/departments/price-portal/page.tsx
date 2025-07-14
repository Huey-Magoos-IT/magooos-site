"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useGetAuthUserQuery } from "@/state/api";
import { useGetLocationsQuery, Location } from "@/state/lambdaApi";
import { hasAnyRole, hasLocationAccess } from "@/lib/accessControl";
import Header from "@/components/Header";
import { PriceItem, CrossLocationPriceItem, LocationInfo, extractUniqueCategories, extractUniqueCategoriesFromCrossLocation, parsePriceDataFromCsv, parseCrossLocationPriceData } from "@/lib/priceDataUtils";
import { fetchFiles, fetchCSV } from "@/lib/csvProcessing";
import {
    extractPriceChanges,
    createPriceChangeReport,
    convertPriceChangesToCSV,
    uploadPriceChangeReport,
    validatePriceChanges,
    PriceChange,
    PriceChangeReport
} from "@/lib/priceChangeUtils";

const S3_DATA_LAKE = process.env.NEXT_PUBLIC_DATA_LAKE_S3_URL || "https://data-lake-magooos-site.s3.us-east-2.amazonaws.com";

const PricePortalPage = () => {
    const { data: authData, isLoading: userIsLoading } = useGetAuthUserQuery({});
    const { data: locationsData, isLoading: locationsIsLoading } = useGetLocationsQuery();

    const teamRoles = authData?.userDetails?.team?.teamRoles;
    const user = authData?.userDetails;
    
    const [crossLocationItems, setCrossLocationItems] = useState<CrossLocationPriceItem[]>([]);
    const [originalCrossLocationItems, setOriginalCrossLocationItems] = useState<CrossLocationPriceItem[]>([]);
    const [availableLocations, setAvailableLocations] = useState<LocationInfo[]>([]);
    const [categoryList, setCategoryList] = useState<{ value: string, label: string }[]>([]);
    const [isPriceDataLoading, setIsPriceDataLoading] = useState(false);
    const [priceDataError, setPriceDataError] = useState<string | null>(null);
    
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const CURRENT_SAUCE_PRICE = 0.50; 
    const [newSaucedPrice, setNewSaucedPrice] = useState<number>(CURRENT_SAUCE_PRICE);
    const [priceChanges, setPriceChanges] = useState<{[key: string]: number}>({});
    const [syncedItems, setSyncedItems] = useState<{[key: string]: boolean}>({});
    const [syncAll, setSyncAll] = useState<boolean>(false);
    const [expandedCategories, setExpandedCategories] = useState<{[key: string]: boolean}>({});

    useEffect(() => {
        const loadAndProcessData = async () => {
            if (user?.locationIds && locationsData?.locations) {
                try {
                    setIsPriceDataLoading(true);
                    setPriceDataError(null);
                    
                    // Fetch files from the price-pool directory
                    const files = await fetchFiles(S3_DATA_LAKE, 'price-pool/');
                    console.log('Found files in price-pool:', files);
                    
                    if (files.length === 0) {
                        setPriceDataError('No price data files found');
                        return;
                    }
                    
                    // For now, use the first file found (you can modify this logic)
                    // In production, you might want to use the latest file or allow user selection
                    const latestFile = files[0];
                    console.log('Using file:', latestFile);
                    
                    // Fetch and parse the CSV data
                    const csvData = await fetchCSV(`${S3_DATA_LAKE}/price-pool/${latestFile}`);
                    console.log('CSV data length:', csvData.length);
                    console.log('CSV data preview:', csvData.substring(0, 500));
                    
                    const { items, locations } = await parseCrossLocationPriceData(csvData);
                    console.log('Cross-location items count:', items.length);
                    console.log('Available locations:', locations);
                    console.log('Cross-location items sample:', items.slice(0, 3));
                    
                    // Filter items based on user's location access
                    const accessibleItems = items.filter(item => {
                        return Object.keys(item.locationPrices).some(locationId =>
                            hasLocationAccess(user.locationIds, locationId)
                        );
                    });
                    
                    // Filter locations to only show those the user has access to
                    const accessibleLocations = locations.filter(location =>
                        hasLocationAccess(user.locationIds, location.id)
                    );
                    
                    setCrossLocationItems(accessibleItems);
                    setOriginalCrossLocationItems(accessibleItems); // Store original data for change tracking
                    setAvailableLocations(accessibleLocations);
                    
                    // Extract unique categories for filtering
                    const uniqueCategories = extractUniqueCategoriesFromCrossLocation(accessibleItems);
                    setCategoryList(uniqueCategories);
                    
                } catch (error) {
                    console.error("Error loading price data from S3:", error);
                    setPriceDataError('Failed to load price data');
                } finally {
                    setIsPriceDataLoading(false);
                }
            }
        };
        loadAndProcessData();
    }, [user, locationsData]);

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
        return locationsData.locations.filter((location: Location) => user.locationIds!.includes(location.id));
    }, [user?.locationIds, locationsData?.locations]);

    const hasAccess = hasAnyRole(teamRoles, ['LOCATION_ADMIN', 'ADMIN', 'PRICE_ADMIN']);
    const isPriceDisabled = false;

    const filteredItems: CrossLocationPriceItem[] = selectedCategory === 'all'
        ? crossLocationItems
        : crossLocationItems.filter((item: CrossLocationPriceItem) => item.category === selectedCategory);
  
    const sortedItems: CrossLocationPriceItem[] = [...filteredItems].sort((a: CrossLocationPriceItem, b: CrossLocationPriceItem) => {
        return sortOrder === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
    });

    const groupedItems = sortedItems.reduce((acc: {[key: string]: CrossLocationPriceItem[]}, item: CrossLocationPriceItem) => {
        const categoryLabel = categoryList.find((c: {value: string}) => c.value === item.category)?.label || 'Uncategorized';
        if (!acc[categoryLabel]) {
            acc[categoryLabel] = [];
        }
        acc[categoryLabel].push(item);
        return acc;
    }, {} as {[key: string]: CrossLocationPriceItem[]});

    const toggleCategoryExpansion = (categoryName: string) => {
        setExpandedCategories(prev => ({ ...prev, [categoryName]: !prev[categoryName] }));
    };

    const handlePriceChange = (itemLocationKey: string, newRegularPrice: number) => {
        setPriceChanges(prevChanges => {
            const updatedChanges = { ...prevChanges, [itemLocationKey]: newRegularPrice };
            const [itemName, locationId] = itemLocationKey.split('|');
            const changedItem = crossLocationItems.find((item: CrossLocationPriceItem) => item.name === itemName);

            if (changedItem?.isOriginal) {
                const saucedItem = crossLocationItems.find((item: CrossLocationPriceItem) => item.originalId === changedItem.id);
                if (saucedItem) {
                    const unitCount = changedItem.sauceUnitCount || 1;
                    const calculatedSaucedItemPrice = newRegularPrice + (unitCount * newSaucedPrice);
                    const saucedItemKey = `${saucedItem.name}|${locationId}`;
                    updatedChanges[saucedItemKey] = parseFloat(calculatedSaucedItemPrice.toFixed(2));
                }
            }
            return updatedChanges;
        });
    };

    const handleSyncToggle = (itemName: string) => {
        setSyncedItems(prev => ({ ...prev, [itemName]: !prev[itemName] }));
    };

    const handleSubmitChanges = async () => {
        try {
            // Extract price changes from current state
            const changes = extractPriceChanges(originalCrossLocationItems, priceChanges, availableLocations);
            
            // Validate changes
            const validation = validatePriceChanges(changes);
            if (!validation.isValid) {
                alert(`Validation errors:\n${validation.errors.join('\n')}`);
                return;
            }
            
            // Create price change report
            const userInfo = {
                id: String(user?.userId || 'unknown'),
                username: user?.username || 'Unknown User',
                groupName: userLocations.length > 0 ? userLocations[0].name : 'Unknown Group'
            };
            
            const report = createPriceChangeReport(changes, userInfo, user?.locationIds || []);
            
            // Convert to CSV
            const csvContent = convertPriceChangesToCSV(changes, {
                groupName: report.groupName,
                submittedDate: report.submittedDate,
                reportId: report.id
            });
            
            // Upload to S3
            const uploadResult = await uploadPriceChangeReport(csvContent, report.id, report.groupName);
            
            if (uploadResult.success) {
                alert(`Price changes submitted successfully!\nReport ID: ${report.id}\nTotal changes: ${changes.length}`);
                
                // Reset price changes after successful submission
                setPriceChanges({});
                
                // Log the submission
                console.log('Price change report submitted:', {
                    reportId: report.id,
                    totalChanges: changes.length,
                    uploadUrl: uploadResult.url
                });
            } else {
                alert(`Failed to submit price changes: ${uploadResult.error}`);
            }
            
        } catch (error) {
            console.error('Error submitting price changes:', error);
            alert('An error occurred while submitting price changes. Please try again.');
        }
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

    return (
        <div className="p-6">
            <Header name={`Price Portal - ${user?.username || 'User'}`} />
            
            <div className="mt-6 space-y-6">
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

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 max-w-lg mx-auto">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">Sauced Tender Price Control</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-md border">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Per Tender Sauce Price:</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">${CURRENT_SAUCE_PRICE.toFixed(2)}</span>
                        </div>
                        <div>
                            <div className="flex items-center mb-2">
                                <label htmlFor="newSaucedPriceInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300">NEW Per Tender Sauced Price:</label>
                                <div className="relative ml-2 group">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-700 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                                        This is the additional upcharge for making a tender meal ‘sauced’. Modifying this value will be used to calculate prices for “Sauced” menu items if automatic calculation is implemented.
                                        <svg className="absolute text-gray-700 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                                <input id="newSaucedPriceInput" type="number" step="0.01" min="0" value={newSaucedPrice} onChange={(e) => setNewSaucedPrice(parseFloat(e.target.value) || 0)} className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0.00" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                {categoryList.map(category => (<option key={category.value} value={category.value}>{category.label}</option>))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort</label>
                            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                <option value="asc">A-Z</option>
                                <option value="desc">Z-A</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Price Management</h3>
                            <label className="flex items-center space-x-2">
                                <input type="checkbox" checked={syncAll} onChange={(e) => setSyncAll(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Sync All Locations</span>
                            </label>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item Name</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sync</th>
                                    {availableLocations.map(location => (<th key={location.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">{location.displayName.toUpperCase()}</th>))}
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300"></th>
                                    <th className="px-6 py-2"></th>
                                    {availableLocations.map(location => (<th key={location.id} className="px-6 py-2"><div className="flex justify-center items-center space-x-8 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"><span className="w-16 text-center">Current</span><span className="w-16 text-center">New</span></div></th>))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800">
                                {Object.entries(groupedItems).map(([categoryName, itemsInCategory]) => (
                                    <React.Fragment key={categoryName}>
                                        <tr className="bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 cursor-pointer border-t border-b border-gray-300 dark:border-gray-600" onClick={() => toggleCategoryExpansion(categoryName)}>
                                            <td colSpan={2 + availableLocations.length} className="px-6 py-3 text-left">
                                                <div className="flex items-center">
                                                    <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">{expandedCategories[categoryName] ? '▼' : '►'} {categoryName} ({itemsInCategory.length})</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedCategories[categoryName] && itemsInCategory.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700/50 last:border-b-0">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <input type="checkbox" checked={syncedItems[item.name] || false} onChange={() => handleSyncToggle(item.name)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                                </td>
                                                {availableLocations.map(location => {
                                                    const currentPrice = item.locationPrices[location.id];
                                                    const priceChangeKey = `${item.name}|${location.id}`;
                                                    return (
                                                        <td key={location.id} className="px-6 py-4 text-center">
                                                            <div className="flex justify-center items-center space-x-4">
                                                                <div className="w-16 text-center">
                                                                    <span className="inline-block px-2 py-1 text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-600 rounded">
                                                                        {currentPrice !== undefined ? `$${currentPrice.toFixed(2)}` : 'N/A'}
                                                                    </span>
                                                                </div>
                                                                <div className="w-16">
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        placeholder={currentPrice !== undefined ? currentPrice.toFixed(2) : '0.00'}
                                                                        value={priceChanges[priceChangeKey] || ''}
                                                                        onChange={(e) => handlePriceChange(priceChangeKey, parseFloat(e.target.value) || 0)}
                                                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                        disabled={currentPrice === undefined || (syncedItems[item.name] && availableLocations[0] && location.id !== availableLocations[0].id)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Price Changes Summary */}
                {Object.keys(priceChanges).length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                    Pending Price Changes
                                </h4>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    {Object.keys(priceChanges).length} item{Object.keys(priceChanges).length !== 1 ? 's' : ''} modified
                                </p>
                            </div>
                            <button
                                onClick={() => setPriceChanges({})}
                                className="text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 underline"
                            >
                                Clear All Changes
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex justify-center">
                    <button
                        onClick={handleSubmitChanges}
                        disabled={Object.keys(priceChanges).length === 0}
                        className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                            Object.keys(priceChanges).length > 0
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                        }`}
                    >
                        Submit Price Changes {Object.keys(priceChanges).length > 0 && `(${Object.keys(priceChanges).length})`}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default PricePortalPage;