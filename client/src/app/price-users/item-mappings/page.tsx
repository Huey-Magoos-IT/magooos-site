"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useGetAuthUserQuery } from "@/state/api";
import { isPriceAdmin, hasRole } from "@/lib/accessControl";
import {
    fetchUniqueItemNames,
    fetchItemNameMappings,
    saveItemNameMappings,
    ItemMapping
} from "@/lib/itemNameMappings";

const ItemMappingsPage = () => {
    const { data: userData, isLoading: userLoading } = useGetAuthUserQuery({});
    const teamRoles = userData?.userDetails?.team?.teamRoles;
    const hasAdminAccess = isPriceAdmin(teamRoles) || hasRole(teamRoles, 'ADMIN');

    const [mappings, setMappings] = useState<ItemMapping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editedMappings, setEditedMappings] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            const [uniqueNames, savedMappings] = await Promise.all([
                fetchUniqueItemNames(),
                fetchItemNameMappings(),
            ]);

            const savedMappingsMap = new Map(savedMappings.map(m => [m.originalName, m.friendlyName]));

            const initialMappings = uniqueNames.map(name => ({
                originalName: name,
                friendlyName: savedMappingsMap.get(name) || name,
            }));

            setMappings(initialMappings);
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
        
        const updatedMappings = mappings.map(mapping => ({
            ...mapping,
            friendlyName: editedMappings[mapping.originalName] || mapping.friendlyName,
        }));
        
        setMappings(updatedMappings);
        setEditedMappings({});
        alert("Changes saved successfully! (Simulated)");
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
            <div className="mt-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Manage Friendly Names for Price Portal Items
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        Here you can define user-friendly names for items that appear in the price portal.
                    </p>
                </div>
                <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    {/* Mappings table */}
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
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {mappings.map((mapping, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{mapping.originalName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={editedMappings[mapping.originalName] ?? mapping.friendlyName}
                                                onChange={(e) => handleMappingChange(mapping.originalName, e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <button
                            onClick={handleSaveChanges}
                            disabled={Object.keys(editedMappings).length === 0}
                            className={`px-4 py-2 rounded-md transition-colors ${
                                Object.keys(editedMappings).length > 0
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                            }`}
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemMappingsPage;