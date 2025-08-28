"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useGetAuthUserQuery } from "@/state/api";
import { isPriceAdmin, hasRole } from "@/lib/accessControl";
import {
    fetchUniqueItemsWithCategory,
    fetchItemNameMappings,
    saveItemNameMappings,
    ItemMapping,
    MappedItem
} from "@/lib/itemNameMappings";

const ItemMappingsPage = () => {
    const router = useRouter();
    const { data: userData, isLoading: userLoading } = useGetAuthUserQuery({});
    const teamRoles = userData?.userDetails?.team?.teamRoles;
    const hasAdminAccess = isPriceAdmin(teamRoles) || hasRole(teamRoles, 'ADMIN');

    const [mappings, setMappings] = useState<ItemMapping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editedMappings, setEditedMappings] = useState<{ [key: string]: string }>({});
    const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
    const [allExpanded, setAllExpanded] = useState<boolean>(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            const [uniqueItems, savedMappings] = await Promise.all([
                fetchUniqueItemsWithCategory(),
                fetchItemNameMappings(),
            ]);

            const savedMappingsMap = new Map(savedMappings.map((m: ItemMapping) => [m.originalName, m.friendlyName]));

            const initialMappings = uniqueItems.map((item: MappedItem) => ({
                originalName: item.name,
                friendlyName: savedMappingsMap.get(item.name) || item.name,
                category: item.category,
            }));

            // @ts-ignore
            setMappings(initialMappings);
            
            // Automatically expand all categories by default
            const allCategories = new Set(initialMappings.map(m => m.category));
            const initialExpansion: { [key: string]: boolean } = {};
            allCategories.forEach(cat => initialExpansion[cat] = true);
            setExpandedCategories(initialExpansion);

            setIsLoading(false);
        };

        if (hasAdminAccess) {
            loadInitialData();
        }
    }, [hasAdminAccess]);

    // Scroll event handling for floating back to top button
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setShowBackToTop(scrollTop > 100);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const handleMappingChange = (originalName: string, newFriendlyName: string) => {
        setEditedMappings(prev => ({ ...prev, [originalName]: newFriendlyName }));
    };

    const handleSaveChanges = async () => {
        await saveItemNameMappings(editedMappings);
        
        const updatedMappings = mappings.map((mapping:any) => ({
            ...mapping,
            friendlyName: editedMappings[mapping.originalName] || mapping.friendlyName,
        }));
        
        setMappings(updatedMappings);
        setEditedMappings({});
        alert("Changes saved successfully! (Simulated)");
    };

    const categoryList = useMemo(() => {
        const categories = [...new Set(mappings.map(m => m.category))];
        return [
            { value: 'all', label: 'All Categories' },
            ...categories.map(cat => ({
                value: cat,
                label: cat?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized'
            }))
        ];
    }, [mappings]);

    const filteredItems = selectedCategory === 'all'
        ? mappings
        : mappings.filter((item: any) => item.category === selectedCategory);

    const sortedItems = [...filteredItems].sort((a: any, b: any) => {
        return sortOrder === 'asc'
            ? a.originalName.localeCompare(b.originalName)
            : b.originalName.localeCompare(a.originalName);
    });

    const groupedMappings = useMemo(() => {
        return sortedItems.reduce((acc: { [key: string]: any[] }, mapping: any) => {
            const category = mapping.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(mapping);
            return acc;
        }, {});
    }, [sortedItems]);

    const toggleCategoryExpansion = (categoryName: string) => {
        setExpandedCategories(prev => ({ ...prev, [categoryName]: !prev[categoryName] }));
    };

    const toggleAllCategories = () => {
        const newExpandedState = !allExpanded;
        setAllExpanded(newExpandedState);
        
        const newExpandedCategories: { [key: string]: boolean } = {};
        Object.keys(groupedMappings).forEach(categoryName => {
            newExpandedCategories[categoryName] = newExpandedState;
        });
        setExpandedCategories(newExpandedCategories);
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };
    
    if (userLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (!hasAdminAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="text-xl font-semibold text-red-600">Access Denied</div>
                <div className="text-gray-600">
                    You need PRICE_ADMIN or ADMIN role access to manage Item Mappings.
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <Header name="Item Name Mappings" />
            
            <div className="mt-6 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Manage Friendly Names for Price Portal Items
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                Here you can define user-friendly names for items that appear in the price portal.
                            </p>
                        </div>
                        <button
                            onClick={() => router.back()}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            Back
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                {categoryList.map(category => (
                                    <option key={category.value} value={category.value}>{category.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort</label>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
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
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Item Name Management</h3>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {sortedItems.length} items
                            </span>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto" id="item-table-container" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Original Item Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Friendly Name
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800">
                                {Object.entries(groupedMappings).map(([categoryName, itemsInCategory]) => (
                                    <React.Fragment key={categoryName}>
                                        <tr className="bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 cursor-pointer border-t border-b border-gray-300 dark:border-gray-600" onClick={() => toggleCategoryExpansion(categoryName)}>
                                            <td colSpan={2} className="px-6 py-3 text-left">
                                                <div className="flex items-center">
                                                    <svg
                                                        className={`w-4 h-4 mr-2 transition-transform duration-200 ${expandedCategories[categoryName] ? 'rotate-90' : ''}`}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                    <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                                                        {categoryName} ({itemsInCategory.length})
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedCategories[categoryName] && itemsInCategory.map((mapping: any, index: number) => (
                                            <tr key={`${categoryName}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700/50 last:border-b-0">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {mapping.originalName}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="text"
                                                        value={editedMappings[mapping.originalName] ?? mapping.friendlyName}
                                                        onChange={(e) => handleMappingChange(mapping.originalName, e.target.value)}
                                                        className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                            editedMappings[mapping.originalName] !== undefined
                                                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 ring-2 ring-yellow-200 dark:ring-yellow-800'
                                                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                                                        } text-gray-900 dark:text-white`}
                                                        placeholder={mapping.originalName}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pending Changes Summary */}
                {Object.keys(editedMappings).length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                    Pending Changes
                                </h4>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    {Object.keys(editedMappings).length} item{Object.keys(editedMappings).length !== 1 ? 's' : ''} modified
                                </p>
                            </div>
                            <button
                                onClick={() => setEditedMappings({})}
                                className="text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 underline"
                            >
                                Clear All Changes
                            </button>
                        </div>
                    </div>
                )}

                <div id="submit-section" className="flex justify-center pt-6">
                    <button
                        onClick={handleSaveChanges}
                        disabled={Object.keys(editedMappings).length === 0}
                        className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                            Object.keys(editedMappings).length > 0
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                        }`}
                    >
                        Save Changes {Object.keys(editedMappings).length > 0 && `(${Object.keys(editedMappings).length})`}
                    </button>
                </div>
            </div>

            {/* Floating Back to Top Button */}
            {showBackToTop && (
                <div className="fixed bottom-6 right-6 z-50">
                    <button
                        onClick={scrollToTop}
                        className="bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 text-white rounded-full h-12 w-12 flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110"
                        aria-label="Scroll to top"
                        title="Back to top"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ItemMappingsPage;