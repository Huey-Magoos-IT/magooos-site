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
                <div className="text-[var(--theme-text-secondary)]">
                    You need PRICE_ADMIN or ADMIN role access to manage Item Mappings.
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <Header name="Item Name Mappings" />
            
            <div className="mt-6 space-y-6">
                <div className="bg-[var(--theme-surface)] rounded-lg shadow p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--theme-text)]">
                                Manage Friendly Names for Price Portal Items
                            </h2>
                            <p className="text-sm text-[var(--theme-text-secondary)] mt-1">
                                Here you can define user-friendly names for items that appear in the price portal.
                            </p>
                        </div>
                        <button
                            onClick={() => router.back()}
                            className="px-3 py-1 text-sm bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded hover:opacity-90 transition-colors"
                        >
                            Back
                        </button>
                    </div>
                </div>

                <div className="bg-[var(--theme-surface)] rounded-lg shadow p-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                        <div>
                            <label className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">Category</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-3 py-2 border border-[var(--theme-border)] rounded-md bg-[var(--theme-surface)] text-[var(--theme-text)]"
                            >
                                {categoryList.map(category => (
                                    <option key={category.value} value={category.value}>{category.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">Sort</label>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                                className="px-3 py-2 border border-[var(--theme-border)] rounded-md bg-[var(--theme-surface)] text-[var(--theme-text)]"
                            >
                                <option value="asc">A-Z</option>
                                <option value="desc">Z-A</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">Categories</label>
                            <button
                                onClick={toggleAllCategories}
                                className="px-4 py-2 bg-[var(--theme-surface-hover)] text-[var(--theme-text)] rounded-md hover:bg-[var(--theme-surface-active)] transition-colors duration-200 flex items-center space-x-2"
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

                <div className="bg-[var(--theme-surface)] rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--theme-border)]">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-[var(--theme-text)]">Item Name Management</h3>
                            <span className="text-sm text-[var(--theme-text-muted)]">
                                {sortedItems.length} items
                            </span>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto" id="item-table-container" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <table className="w-full">
                            <thead className="bg-[var(--theme-surface-hover)]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--theme-text-muted)] uppercase tracking-wider">
                                        Original Item Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--theme-text-muted)] uppercase tracking-wider">
                                        Friendly Name
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-[var(--theme-surface)]">
                                {Object.entries(groupedMappings).map(([categoryName, itemsInCategory]) => (
                                    <React.Fragment key={categoryName}>
                                        <tr className="bg-[var(--theme-surface-hover)] hover:bg-[var(--theme-surface-active)] cursor-pointer border-t border-b border-[var(--theme-border)]" onClick={() => toggleCategoryExpansion(categoryName)}>
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
                                                    <span className="font-semibold text-sm text-[var(--theme-text)]">
                                                        {categoryName} ({itemsInCategory.length})
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedCategories[categoryName] && itemsInCategory.map((mapping: any, index: number) => (
                                            <tr key={`${categoryName}-${index}`} className="hover:bg-[var(--theme-surface-hover)] border-b border-[var(--theme-border)] last:border-b-0">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-[var(--theme-text)]">
                                                        {mapping.originalName}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="text"
                                                        value={editedMappings[mapping.originalName] ?? mapping.friendlyName}
                                                        onChange={(e) => handleMappingChange(mapping.originalName, e.target.value)}
                                                        className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] ${
                                                            editedMappings[mapping.originalName] !== undefined
                                                                ? 'bg-[var(--theme-warning)]/10 border-[var(--theme-warning)] ring-2 ring-[var(--theme-warning)]/30'
                                                                : 'bg-[var(--theme-surface)] border-[var(--theme-border)]'
                                                        } text-[var(--theme-text)]`}
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
                    <div className="bg-[var(--theme-warning)]/10 border border-[var(--theme-warning)]/30 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-medium text-[var(--theme-warning)]">
                                    Pending Changes
                                </h4>
                                <p className="text-sm text-[var(--theme-text-secondary)]">
                                    {Object.keys(editedMappings).length} item{Object.keys(editedMappings).length !== 1 ? 's' : ''} modified
                                </p>
                            </div>
                            <button
                                onClick={() => setEditedMappings({})}
                                className="text-sm text-[var(--theme-warning)] hover:opacity-80 underline"
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
                                ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] hover:opacity-90'
                                : 'bg-[var(--theme-surface-active)] text-[var(--theme-text-muted)] cursor-not-allowed'
                        }`}
                    >
                        Save Changes {Object.keys(editedMappings).length > 0 && `(${Object.keys(editedMappings).length})`}
                    </button>
                </div>
            </div>

            {/* Floating Action Buttons */}
            {showBackToTop && (
                <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
                    <button
                        onClick={scrollToTop}
                        className="bg-[var(--theme-text-secondary)] hover:bg-[var(--theme-text)] text-[var(--theme-surface)] rounded-full h-12 w-12 flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110"
                        aria-label="Scroll to top"
                        title="Back to top"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
                        className="bg-[var(--theme-text-secondary)] hover:bg-[var(--theme-text)] text-[var(--theme-surface)] rounded-full h-12 w-12 flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110"
                        aria-label="Scroll to bottom"
                        title="Go to bottom"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ItemMappingsPage;