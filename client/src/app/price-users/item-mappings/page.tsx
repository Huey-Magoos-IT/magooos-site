"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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

    const groupedMappings = useMemo(() => {
        return mappings.reduce((acc: { [key: string]: any[] }, mapping: any) => {
            const category = mapping.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(mapping);
            return acc;
        }, {});
    }, [mappings]);
    
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
            <div className="mt-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Manage Friendly Names for Price Portal Items
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                Here you can define user-friendly names for items that appear in the price portal.
                            </p>
                        </div>
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 transition-colors"
                        >
                            Back
                        </button>
                    </div>
                </div>
                
                <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
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
                                {Object.entries(groupedMappings).map(([category, items]) => (
                                    <React.Fragment key={category}>
                                        <tr className="bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 cursor-pointer" onClick={() => setExpandedCategories(prev => ({...prev, [category]: !prev[category]}))}>
                                            <td colSpan={2} className="px-6 py-3 text-left">
                                                <div className="flex items-center">
                                                    <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                                                        {expandedCategories[category] ? '▼' : '►'} {category} ({items.length})
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedCategories[category] && items.map((mapping: any, index: number) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{mapping.originalName}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="text"
                                                        value={editedMappings[mapping.originalName] ?? mapping.friendlyName}
                                                        onChange={(e) => handleMappingChange(mapping.originalName, e.target.value)}
                                                        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                                                            editedMappings[mapping.originalName] !== undefined
                                                            ? 'border-yellow-400 ring-2 ring-yellow-200'
                                                            : 'border-gray-300 dark:border-gray-600'
                                                        }`}
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

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSaveChanges}
                        disabled={Object.keys(editedMappings).length === 0}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                            Object.keys(editedMappings).length > 0
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                        }`}
                    >
                        Save Changes {Object.keys(editedMappings).length > 0 && `(${Object.keys(editedMappings).length})`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ItemMappingsPage;