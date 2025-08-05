"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGetAuthUserQuery, useToggleUserStatusMutation } from "@/state/api";
import { useGetLocationsQuery, Location } from "@/state/lambdaApi";
import { hasAnyRole, hasLocationAccess } from "@/lib/accessControl";
import Header from "@/components/Header";
import { PriceItem, CrossLocationPriceItem, LocationInfo, extractUniqueCategories, extractUniqueCategoriesFromCrossLocation, parsePriceDataFromCsv, parseCrossLocationPriceData } from "@/lib/priceDataUtils";
import { parsePriceChangeCSV, PriceChangeReport as ActiveReport, ReportChangeDetail } from "@/lib/reportUtils";
import {
    extractPriceChanges,
    createPriceChangeReport,
    convertPriceChangesToCSV,
    uploadPriceChangeReport,
    validatePriceChanges,
    PriceChange,
    PriceChangeReport
} from "@/lib/priceChangeUtils";
import { fetchFiles, fetchCSV } from "@/lib/csvProcessing";

const S3_DATA_LAKE = process.env.NEXT_PUBLIC_DATA_LAKE_S3_URL || "https://data-lake-magooos-site.s3.us-east-2.amazonaws.com";

// Function to check for active reports for a user
const checkForActiveReport = async (userId: string): Promise<ActiveReport | null> => {
    try {
        const files = await fetchFiles(S3_DATA_LAKE, 'active-price-reports/');
        const userReportFile = files.find(file => file.includes(`_${userId}_`));

        if (userReportFile) {
            const csvData = await fetchCSV(`${S3_DATA_LAKE}/active-price-reports/${userReportFile}`);
            return await parsePriceChangeCSV(csvData, userReportFile);
        }
        return null;
    } catch (error) {
        console.error('Error checking for active reports:', error);
        return null;
    }
};

// Define the props interface for PricePortalContent
interface PricePortalContentProps {
    user: any; // User type from auth query
    locationsData: any; // Locations data from query
    hasAccess: boolean;
    locationsIsLoading: boolean;
    isPriceDataLoading: boolean;
}

const PricePortalContent: React.FC<PricePortalContentProps> = ({
    user,
    locationsData,
    hasAccess,
    locationsIsLoading,
    isPriceDataLoading: initialIsPriceDataLoading
}) => {
    const router = useRouter();
    const [toggleUserStatus] = useToggleUserStatusMutation();

    // State management
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
    const [crossLocationItems, setCrossLocationItems] = useState<CrossLocationPriceItem[]>([]);
    const [originalCrossLocationItems, setOriginalCrossLocationItems] = useState<CrossLocationPriceItem[]>([]);
    const [availableLocations, setAvailableLocations] = useState<LocationInfo[]>([]);
    const [categoryList, setCategoryList] = useState<{ value: string, label: string }[]>([]);
    const [isPriceDataLoading, setIsPriceDataLoading] = useState(initialIsPriceDataLoading);
    const [priceDataError, setPriceDataError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const CURRENT_SAUCE_PRICE = 0.50; 
    const [newSaucedPrice, setNewSaucedPrice] = useState<number>(CURRENT_SAUCE_PRICE);
    const [priceChanges, setPriceChanges] = useState<{[key: string]: number}>({});
    const [syncedItems, setSyncedItems] = useState<{[key: string]: boolean}>({});
    const [syncAll, setSyncAll] = useState<boolean>(false);
    const [expandedCategories, setExpandedCategories] = useState<{[key: string]: boolean}>({});
    const [allExpanded, setAllExpanded] = useState<boolean>(true);
    const [showBackToTop, setShowBackToTop] = useState<boolean>(false);
    const [submissionModal, setSubmissionModal] = useState<{
        isOpen: boolean;
        success: boolean;
        reportId?: string;
        totalChanges?: number;
        error?: string;
    }>({ isOpen: false, success: false });
    
    const [validationModal, setValidationModal] = useState<{
        isOpen: boolean;
        errors: string[];
    }>({ isOpen: false, errors: [] });

    // State to track submitted report for "report in progress" screen
    const [submittedReport, setSubmittedReport] = useState<PriceChangeReport | null>(null);

    // Clear location selection on page refresh (session-only persistence)
    useEffect(() => {
        const handleBeforeUnload = () => {
            sessionStorage.removeItem('selectedLocationIds');
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);
    
    // Check for selected locations and redirect if none found
    useEffect(() => {
        if (user?.locationIds && locationsData?.locations && hasAccess) {
            const storedLocationIds = sessionStorage.getItem('selectedLocationIds');
            if (!storedLocationIds) {
                router.push('/departments/price-portal/location-selection');
                return;
            }
            
            try {
                const parsedLocationIds = JSON.parse(storedLocationIds);
                if (!Array.isArray(parsedLocationIds) || parsedLocationIds.length === 0) {
                    router.push('/departments/price-portal/location-selection');
                    return;
                }
                
                const validLocationIds = parsedLocationIds.filter(locationId =>
                    hasLocationAccess(user.locationIds, locationId)
                );
                
                if (validLocationIds.length === 0) {
                    sessionStorage.removeItem('selectedLocationIds');
                    router.push('/departments/price-portal/location-selection');
                    return;
                }
                
                setSelectedLocationIds(validLocationIds);
            } catch (error) {
                console.error('Error parsing selected location IDs:', error);
                sessionStorage.removeItem('selectedLocationIds');
                router.push('/departments/price-portal/location-selection');
            }
        }
    }, [user, locationsData, hasAccess, router]);

    useEffect(() => {
        const loadAndProcessData = async () => {
            if (user?.locationIds && locationsData?.locations && selectedLocationIds.length > 0) {
                try {
                    setIsPriceDataLoading(true);
                    setPriceDataError(null);
                    
                    const files = await fetchFiles(S3_DATA_LAKE, 'price-pool/');
                    if (files.length === 0) {
                        setPriceDataError('No price data files found');
                        return;
                    }
                    
                    const latestFile = files[0];
                    const csvData = await fetchCSV(`${S3_DATA_LAKE}/price-pool/${latestFile}`);
                    
                    const { items, locations } = await parseCrossLocationPriceData(csvData);
                    
                    const accessibleItems = items.filter(item => {
                        return Object.keys(item.locationPrices).some(locationId =>
                            selectedLocationIds.includes(locationId)
                        );
                    });
                    
                    const realSelectedLocations = locationsData.locations.filter((location: Location) =>
                        selectedLocationIds.includes(location.id)
                    );
                    
                    const accessibleLocations: LocationInfo[] = realSelectedLocations.map((location: Location) => ({
                        id: location.id,
                        name: location.name,
                        displayName: location.name
                    }));
                    
                    setCrossLocationItems(accessibleItems);
                    setOriginalCrossLocationItems(accessibleItems);
                    setAvailableLocations(accessibleLocations);
                    
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
    }, [user, locationsData, selectedLocationIds]);

    useEffect(() => {
        if (categoryList.length > 0) {
            const initialExpansionState: {[key: string]: boolean} = {};
            categoryList.forEach((cat: { value: string, label: string }) => {
                if (cat.value !== 'all') {
                    initialExpansionState[cat.label] = true;
                }
            });
            setExpandedCategories(initialExpansionState);
            setAllExpanded(true);
        }
    }, [categoryList]);

    // Scroll event handling for floating elements
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setShowBackToTop(scrollTop > 100);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const userLocations: Location[] = useMemo(() => {
        if (!user?.locationIds || !locationsData?.locations) return [];
        return locationsData.locations.filter((location: Location) => user.locationIds!.includes(location.id));
    }, [user?.locationIds, locationsData?.locations]);

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

    const toggleAllCategories = () => {
        const newExpandedState = !allExpanded;
        setAllExpanded(newExpandedState);
        
        const newExpandedCategories: {[key: string]: boolean} = {};
        categoryList.forEach((cat: { value: string, label: string }) => {
            if (cat.value !== 'all') {
                newExpandedCategories[cat.label] = newExpandedState;
            }
        });
        setExpandedCategories(newExpandedCategories);
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const handlePriceChange = (itemLocationKey: string, newRegularPrice: number) => {
        const limitedPrice = isNaN(newRegularPrice) ? 0 : parseFloat(newRegularPrice.toFixed(2));
        const [itemName, locationId] = itemLocationKey.split('|');
        const isSynced = syncedItems[itemName];

        setPriceChanges(prevChanges => {
            let updatedChanges = { ...prevChanges };

            if (isSynced) {
                // If synced, apply the price change to all selected locations for this item
                availableLocations.forEach(loc => {
                    const key = `${itemName}|${loc.id}`;
                    updatedChanges[key] = limitedPrice;

                    const changedItem = crossLocationItems.find(item => item.name === itemName);
                    if (changedItem?.isOriginal) {
                        const saucedItem = crossLocationItems.find(item => item.originalId === changedItem.id);
                        if (saucedItem) {
                            const unitCount = changedItem.sauceUnitCount || 1;
                            const calculatedSaucedItemPrice = limitedPrice + (unitCount * newSaucedPrice);
                            const saucedItemKey = `${saucedItem.name}|${loc.id}`;
                            updatedChanges[saucedItemKey] = parseFloat(calculatedSaucedItemPrice.toFixed(2));
                        }
                    }
                });
            } else {
                // Not synced, just update the single item
                updatedChanges[itemLocationKey] = limitedPrice;
                const changedItem = crossLocationItems.find(item => item.name === itemName);
                if (changedItem?.isOriginal) {
                    const saucedItem = crossLocationItems.find(item => item.originalId === changedItem.id);
                    if (saucedItem) {
                        const unitCount = changedItem.sauceUnitCount || 1;
                        const calculatedSaucedItemPrice = limitedPrice + (unitCount * newSaucedPrice);
                        const saucedItemKey = `${saucedItem.name}|${locationId}`;
                        updatedChanges[saucedItemKey] = parseFloat(calculatedSaucedItemPrice.toFixed(2));
                    }
                }
            }
            return updatedChanges;
        });
    };

    const handleSyncToggle = (itemName: string) => {
        const isBecomingSynced = !syncedItems[itemName];
        const newSyncedItems = { ...syncedItems, [itemName]: isBecomingSynced };
        setSyncedItems(newSyncedItems);

        // If a user types a price then hits sync, propagate the price.
        if (isBecomingSynced && availableLocations.length > 0) {
            const masterInputKey = `${itemName}|${availableLocations[0].id}`;
            const masterPrice = priceChanges[masterInputKey];

            if (masterPrice !== undefined) {
                // Re-trigger price change with the existing master price to propagate it.
                handlePriceChange(masterInputKey, masterPrice);
            }
        }
    };

    const handleToggleSyncAll = (checked: boolean) => {
        setSyncAll(checked);
        const newSyncedItems: { [key: string]: boolean } = {};
        if (checked) {
            sortedItems.forEach(item => {
                newSyncedItems[item.name] = true;
            });
        }
        setSyncedItems(newSyncedItems);
    };

    const handlePriceInputFocus = (priceChangeKey: string, currentPrice: number | undefined) => {
        // If input is empty and has a current price, populate it on focus.
        if (priceChanges[priceChangeKey] === undefined && currentPrice !== undefined) {
            setPriceChanges(prev => ({ ...prev, [priceChangeKey]: currentPrice }));
        }
    };

    const handleSubmitChanges = async () => {
        try {
            const changes = extractPriceChanges(originalCrossLocationItems, priceChanges, availableLocations);
            
            const validation = validatePriceChanges(changes);
            if (!validation.isValid) {
                setValidationModal({
                    isOpen: true,
                    errors: validation.errors
                });
                return;
            }
            
            const userInfo = {
                id: String(user?.userId || 'unknown'),
                username: user?.username || 'Unknown User',
                groupName: userLocations.length > 0 ? userLocations[0].name : 'Unknown Group'
            };
            
            const report = createPriceChangeReport(changes, userInfo, user?.locationIds || []);
            
            const csvContent = convertPriceChangesToCSV(changes, {
                groupName: report.groupName,
                submittedDate: report.submittedDate,
                reportId: report.id
            });
            
            const uploadResult = await uploadPriceChangeReport(
                csvContent,
                report.id,
                report.groupName,
                userInfo.id,
                userInfo.username
            );
            
            if (uploadResult.success) {
                try {
                    await toggleUserStatus({ userId: user?.userId! });
                    console.log('User locked successfully after price submission');
                } catch (lockError) {
                    console.error('Failed to lock user after submission:', lockError);
                }

                setSubmittedReport(report);
                setSubmissionModal({
                    isOpen: true,
                    success: true,
                    reportId: report.id,
                    totalChanges: changes.length
                });
                setPriceChanges({});
            } else {
                setSubmissionModal({
                    isOpen: true,
                    success: false,
                    error: uploadResult.error
                });
            }
            
        } catch (error) {
            console.error('Error submitting price changes:', error);
            setSubmissionModal({
                isOpen: true,
                success: false,
                error: 'An error occurred while submitting price changes. Please try again.'
            });
        }
    };

    useEffect(() => {
        // When the user changes filters (sortedItems changes), check if all visible items are synced
        // and update the "Sync All" checkbox accordingly.
        if (sortedItems.length > 0) {
            const allVisibleItemsSynced = sortedItems.every(item => syncedItems[item.name] || syncAll);
            if (syncAll && !allVisibleItemsSynced) {
                // If syncAll is on but some items are not, it means we need to sync them
                const newSyncedItems = { ...syncedItems };
                sortedItems.forEach(item => {
                    if(!newSyncedItems[item.name]) newSyncedItems[item.name] = true;
                });
                setSyncedItems(newSyncedItems);
            } else if (!syncAll && allVisibleItemsSynced) {
                 //This case is handled by individual toggle
            }
            else {
                const effectiveSyncAll = sortedItems.every(item => syncedItems[item.name]);
                if (syncAll !== effectiveSyncAll) {
                    setSyncAll(effectiveSyncAll);
                }
            }
        } else if (syncAll) {
            setSyncAll(false);
        }
    }, [sortedItems, syncedItems, syncAll]);

    if (locationsIsLoading || isPriceDataLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading price data...</div>
            </div>
        );
    }
    
    return (
        <div className="p-6">
            <Header name={`Price Portal - ${user?.username || 'User'}`} />
            
            <div className="mt-6 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Selected Locations</h2>
                        <button
                            onClick={() => router.push('/departments/price-portal/location-selection')}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            Change Locations
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {availableLocations.map((location: LocationInfo) => (
                            <span key={location.id} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                                {location.displayName}
                            </span>
                        ))}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Showing price data for {availableLocations.length} selected location{availableLocations.length !== 1 ? 's' : ''}
                    </p>
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
                                <input id="newSaucedPriceInput" type="number" step="0.01" min="0" value={newSaucedPrice} onChange={(e) => setNewSaucedPrice(parseFloat(e.target.value) || 0)} onBlur={(e) => { const value = parseFloat(e.target.value); if (!isNaN(value)) { setNewSaucedPrice(parseFloat(value.toFixed(2))); } }} className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0.00" />
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categories</label>
                            <button
                                onClick={toggleAllCategories}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors duration-200 flex items-center space-x-2"
                                aria-label={allExpanded ? "Collapse all categories" : "Expand all categories"}
                            >
                                <span className="text-sm font-medium">
                                    {allExpanded ? 'Collapse All' : 'Expand All'}
                                </span>
                                <svg
                                    className={`w-4 h-4 transition-transform duration-200 ${allExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Price Management</h3>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={syncAll}
                                    onChange={(e) => handleToggleSyncAll(e.target.checked)}
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
                                                <input
                                                     type="checkbox"
                                                     checked={syncedItems[item.name] || syncAll}
                                                     onChange={() => handleSyncToggle(item.name)}
                                                     className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                 />
                                                </td>
                                                {availableLocations.map((location, index) => {
                                                    const currentPrice = item.locationPrices[location.id];
                                                    const priceChangeKey = `${item.name}|${location.id}`;
                                                    const isSynced = syncedItems[item.name] || syncAll;
                                                    const isMasterInput = isSynced && index === 0;
                                                    const isSyncedFollower = isSynced && index > 0;

                                                    return (
                                                        <td key={location.id} className="px-6 py-4 text-center">
                                                            <div className="flex justify-center items-center space-x-4">
                                                                <div className="w-16 text-center">
                                                                    <span className="inline-block px-2 py-1 text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-600 rounded">
                                                                        {currentPrice !== undefined ? `$${currentPrice.toFixed(2)}` : 'N/A'}
                                                                    </span>
                                                                </div>
                                                                <div className="w-16 relative">
                                                                    <input
                                                                        type="number"
                                                                        step="0.10"
                                                                        min="0"
                                                                        placeholder={currentPrice !== undefined ? currentPrice.toFixed(2) : '0.00'}
                                                                        value={priceChanges[priceChangeKey] ?? ''}
                                                                        onFocus={() => handlePriceInputFocus(priceChangeKey, currentPrice)}
                                                                        onChange={(e) => handlePriceChange(priceChangeKey, parseFloat(e.target.value))}
                                                                        onBlur={(e) => {
                                                                            const value = parseFloat(e.target.value);
                                                                            if (!isNaN(value)) {
                                                                                handlePriceChange(priceChangeKey, value);
                                                                            }
                                                                        }}
                                                                        className={`w-full px-2 py-1 text-sm border rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                                            isSyncedFollower 
                                                                                ? 'bg-gray-200 dark:bg-gray-600 cursor-not-allowed' 
                                                                                : 'bg-white dark:bg-gray-700'
                                                                        } border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white`}
                                                                        disabled={currentPrice === undefined || isSyncedFollower}
                                                                    />
                                                                     {isMasterInput && (
                                                                        <span title="Sync Master" className="absolute -right-1 -top-1 flex h-3 w-3">
                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                                                                        </span>
                                                                    )}
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

                <div id="submit-section" className="flex justify-center pt-6">
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
            
            {/* --- FLOATING ACTION BUTTONS --- */}
            {showBackToTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 z-50 bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 text-white rounded-full h-12 w-12 flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110 animate-fade-in"
                    aria-label="Scroll to top"
                    title="Back to top"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                </button>
            )}

            {/* Validation Error Modal */}
            {validationModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                </svg>
                            </div>
                        </div>
                        
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Validation Errors
                            </h3>
                            
                            <div className="text-left space-y-2 text-sm text-gray-600 dark:text-gray-300 max-h-60 overflow-y-auto">
                                {validationModal.errors.map((error, index) => (
                                    <div key={index} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                        <div className="flex items-start">
                                            <svg className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-red-700 dark:text-red-300">{error}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={() => setValidationModal({ isOpen: false, errors: [] })}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Fix Issues
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Submission Result Modal */}
            {submissionModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                        <div className="flex items-center justify-center mb-4">
                            {submissionModal.success ? (
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </div>
                            ) : (
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </div>
                            )}
                        </div>
                        
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {submissionModal.success ? 'Price Changes Submitted!' : 'Submission Failed'}
                            </h3>
                            
                            {submissionModal.success ? (
                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                    <p>Your price changes have been successfully submitted and exported to the data lake.</p>
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mt-3">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Report Details:</div>
                                        <div className="font-mono text-xs">
                                            <div>ID: {submissionModal.reportId}</div>
                                            <div>Changes: {submissionModal.totalChanges} item{submissionModal.totalChanges !== 1 ? 's' : ''}</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {submissionModal.error}
                                </p>
                            )}
                        </div>
                        
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={() => {
                                    setSubmissionModal({ isOpen: false, success: false });
                                    if (submissionModal.success) {
                                        // Redirect to report in progress screen by forcing a page refresh
                                        // The user will now be locked and see the locked screen
                                        window.location.reload();
                                    }
                                }}
                                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                                    submissionModal.success
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                            >
                                {submissionModal.success ? 'Continue' : 'Try Again'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PricePortalPage = () => {
    const { data: authData, isLoading: userIsLoading } = useGetAuthUserQuery({});
    const { data: locationsData, isLoading: locationsIsLoading } = useGetLocationsQuery();
    const [activeReport, setActiveReport] = useState<ActiveReport | null>(null);
    const [status, setStatus] = useState<'loading' | 'checking-report' | 'ready' | 'locked-no-report' | 'locked-with-report'>('loading');

    const user = authData?.userDetails;
    const teamRoles = authData?.userDetails?.team?.teamRoles;
    const hasAccess = hasAnyRole(teamRoles, ['LOCATION_ADMIN', 'ADMIN', 'PRICE_ADMIN']);
    const isUserLocked = user?.isLocked || false;

    useEffect(() => {
        if (userIsLoading || locationsIsLoading) {
            setStatus('loading');
            return;
        }

        if (isUserLocked && user) {
            setStatus('checking-report');
            checkForActiveReport(String(user.userId))
                .then(report => {
                    setActiveReport(report);
                    setStatus(report ? 'locked-with-report' : 'locked-no-report');
                })
                .catch(() => {
                    setStatus('locked-no-report');
                });
        } else if (!userIsLoading && !locationsIsLoading) {
            setStatus('ready');
        }
    }, [user, userIsLoading, locationsIsLoading, isUserLocked]);

    if (status === 'loading' || status === 'checking-report') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }
    
    if (status === 'locked-with-report' && activeReport) {
        return (
          <div className="p-6">
            <Header name="Price Portal" />
            <div className="mt-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <div className="text-center mb-6">
                  <div className="text-blue-600 dark:text-blue-400 text-xl font-bold mb-2">
                    Price Report In Progress
                  </div>
                  <div className="text-blue-700 dark:text-blue-300 mb-4">
                    Your price changes have been submitted and are being processed.
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    You will be notified when the report is complete. Contact support for assistance: ITSUPPORT@hueymagoos.com
                  </div>
                </div>
                
                {/* Show actual submitted report details */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Submitted Changes</h3>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Report ID: <span className="font-mono text-blue-600 dark:text-blue-400">{activeReport.id}</span>
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status: <span className="text-yellow-600 dark:text-yellow-400">Pending Review</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Submitted: {new Date(activeReport.submittedDate).toLocaleDateString()} at {new Date(activeReport.submittedDate).toLocaleTimeString()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Group: {activeReport.groupName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Total Changes: {activeReport.changes.length}
                    </div>
                  </div>

                  {/* Show the actual price changes */}
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Item</th>
                          <th className="px-3 py-2 text-left">Location</th>
                          <th className="px-3 py-2 text-right">Old Price</th>
                          <th className="px-3 py-2 text-right">New Price</th>
                          <th className="px-3 py-2 text-right">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeReport.changes.map((change: ReportChangeDetail, index: number) => (
                          <tr key={index} className="border-b border-gray-200 dark:border-gray-600">
                            <td className="px-3 py-2 text-gray-900 dark:text-white">{change.itemName}</td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{change.locationId}</td>
                            <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">${change.oldPrice.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-medium">${change.newPrice.toFixed(2)}</td>
                            <td className={`px-3 py-2 text-right font-medium ${
                              change.newPrice > change.oldPrice
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-green-600 dark:text-green-400'
                            }`}>{change.newPrice > change.oldPrice ? '+' : ''}${(change.newPrice - change.oldPrice).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }

    if (status === 'locked-no-report') {
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
                  Contact your administrator for assistance: ITSUPPORT@hueymagoos.com
                </div>
              </div>
            </div>
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

    return <PricePortalContent user={user} locationsData={locationsData} hasAccess={hasAccess} locationsIsLoading={locationsIsLoading} isPriceDataLoading={userIsLoading} />;
};

export default PricePortalPage;