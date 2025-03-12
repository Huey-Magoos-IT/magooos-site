/**
 * Legacy Lambda Processing Logic
 * 
 * This file contains the original Lambda-based report generation logic
 * preserved for reference. This approach is no longer used in the UI
 * but kept for documentation and potential future Lambda implementations.
 */

import { format } from "date-fns";

// Default values from DynamoDB - all 78 locations
export const DEFAULT_LOCATION_IDS = [
  "4145","4849","5561","9905","4167","4249","4885","7025","4255","4878","4045",
  "4872","4166","4868","4887","7027","4245","5563","6785","10533","4258","4046",
  "5765","4148","4886","4243","4814","4884","4261","4120","10477","4147","4260",
  "4242","5805","4350","6809","5559","4252","4146","10448","4165","10534","6705",
  "5691","4238","10497","4867","9559","4256","10150","10093","4250","4150","4259",
  "4253","4225","5359","4254","10476","5346","9591","9999","4078","4251","5865",
  "1825","4799","4077","4247","4241","6658","4244","4248","6778","4237","4149","4246"
];

export const DEFAULT_DISCOUNT_IDS = [77406, 135733, 135736, 135737, 135738, 135739, 135910];

/**
 * Format date for Lambda API
 * @param date Date object
 * @returns Formatted date string in MMddyyyy format
 */
export const formatDateForApi = (date: Date | null): string => {
  return date ? format(date, "MMddyyyy") : "";
};

/**
 * Generate report via Lambda function
 * Legacy implementation preserved for reference
 */
export const generateLambdaReport = async (
  startDate: Date | null,
  endDate: Date | null,
  selectedLocations: { id: string }[],
  discountIds: number[],
  processData: (formData: any) => Promise<any>,
  callbacks: {
    onStart: () => void,
    onSuccess: (result: any, filePattern: string) => void,
    onError: (error: any) => void,
    onComplete: () => void
  }
) => {
  if (!startDate || !endDate) {
    alert("Please select both start and end dates");
    return;
  }

  callbacks.onStart();
  
  // If no locations are selected, use all default locations
  const locationIds = selectedLocations.length > 0
    ? selectedLocations.map(loc => loc.id).join(",")
    : DEFAULT_LOCATION_IDS.join(",");
  
  const formData = {
    start_date: formatDateForApi(startDate),
    end_date: formatDateForApi(endDate),
    output_bucket: "redflag-reporting",
    location_id: locationIds,
    discount_ids: discountIds
  };

  console.log("Generating report with data:", formData);
  
  try {
    // Add timing for diagnostic purposes
    const startTime = performance.now();
    
    // Call the Lambda function via API Gateway
    const result = await processData(formData);
    
    // Calculate request duration for diagnostic purposes
    const duration = Math.round(performance.now() - startTime);
    console.log(`Lambda function result (took ${duration}ms):`, result);
    
    // Create a pattern to identify the new file based on the date range
    const filePattern = `${formatDateForApi(startDate)}${formatDateForApi(endDate)}`;
    
    callbacks.onSuccess(result, filePattern);
  } catch (error: any) {
    console.error("Error calling Lambda function:", error);
    
    // Improved error handling with special case for timeout errors
    if (error?.status === 504 || (error?.toString && error.toString().includes("timeout"))) {
      callbacks.onError({
        message: "Gateway Timeout (504): The report generation request took too long to complete and timed out.",
        isTimeout: true
      });
    } else if (error?.data?.message) {
      // Use the formatted error message from our API
      callbacks.onError({
        message: error.data.message,
        isTimeout: false
      });
    } else {
      // Fallback for general errors
      callbacks.onError({
        message: typeof error === 'object' && error !== null ? error.toString() : String(error),
        isTimeout: false
      });
    }
  } finally {
    callbacks.onComplete();
  }
};