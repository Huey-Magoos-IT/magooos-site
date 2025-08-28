import { fetchFiles, fetchCSV } from "./csvProcessing";
import { parseCrossLocationPriceData } from "./priceDataUtils";

const S3_DATA_LAKE = process.env.NEXT_PUBLIC_DATA_LAKE_S3_URL || "https://data-lake-magooos-site.s3.us-east-2.amazonaws.com";

/**
 * Fetches all unique item names from the price data files in S3.
 * This function is designed to be called on the client-side, specifically in an admin-only section.
 */
export const fetchUniqueItemNames = async (): Promise<string[]> => {
    try {
        const files = await fetchFiles(S3_DATA_LAKE, 'price-pool/');
        if (files.length === 0) {
            console.error('No price data files found in S3.');
            return [];
        }

        // Use the latest file to get the most up-to-date item list
        const latestFile = files[0];
        const csvData = await fetchCSV(`${S3_DATA_LAKE}/price-pool/${latestFile}`);

        const { items } = await parseCrossLocationPriceData(csvData);

        const uniqueNames = new Set(items.map(item => item.name));

        return Array.from(uniqueNames).sort();

    } catch (error) {
        console.error("Error fetching unique item names from S3:", error);
        // In case of an error, return an empty array to prevent the page from crashing.
        return [];
    }
};

export interface ItemMapping {
    originalName: string;
    friendlyName: string;
}

/**
 * Fetches item name mappings from a (simulated) DynamoDB source.
 * In a real application, this would make an API call to a Lambda function.
 * @returns A promise that resolves to an array of ItemMapping.
 */
export const fetchItemNameMappings = async (): Promise<ItemMapping[]> => {
    // Simulate an API call latency
    await new Promise(resolve => setTimeout(resolve, 500)); 

    // Return mock data for now. This will be replaced with a real API call.
    // In a real implementation, you might fetch this from a DynamoDB table.
    const mockMappings: ItemMapping[] = [
        { originalName: "MEALS-5 Original", friendlyName: "5 Tenders - Original" },
        { originalName: "MEALS-5 Sauced", friendlyName: "5 Tenders - Sauced" },
        { originalName: "DRINKS-Fountain", friendlyName: "Fountain Drink" },
    ];
    
    return mockMappings;
};

/**
 * Saves item name mappings to a (simulated) DynamoDB source.
 * @param mappings The array of item mappings to save.
 * @returns A promise that resolves when the save operation is complete.
 */
export const saveItemNameMappings = async (mappings: { [originalName: string]: string }): Promise<void> => {
    // Simulate an API call latency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real application, this would make a POST request to a Lambda function
    // that updates the DynamoDB table.
    console.log("Simulating save to DynamoDB:", mappings);

    // For now, we can log to the console to verify the data being "sent".
    // No actual state change will happen on the "server" in this simulation.
    
    return;
};