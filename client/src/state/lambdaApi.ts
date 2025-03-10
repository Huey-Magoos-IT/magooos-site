import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession } from "aws-amplify/auth";

// Define your Lambda API Gateway URL here
// This should be the URL of your NEW API Gateway dedicated to Lambda functions
const LAMBDA_API_URL = process.env.NEXT_PUBLIC_LAMBDA_API_URL || "https://sutpql04fb.execute-api.us-east-2.amazonaws.com/prod";

// Data report request interface
export interface DataReportRequest {
  start_date: string;
  end_date: string;
  output_bucket: string;
  location_id: string;
  discount_ids: number[];
}

// Data report response interface
export interface DataReportResponse {
  message: string;
  reportKey?: string;
  status?: string;
}

// Location interface
export interface Location {
  id: string;
  name: string;
  __typename: string;
}

// Locations response interface
export interface LocationsResponse {
  locations: Location[];
}

// Create the API with RTK Query
export const lambdaApi = createApi({
  reducerPath: "lambdaApi",
  baseQuery: fetchBaseQuery({
    baseUrl: LAMBDA_API_URL,
    prepareHeaders: async (headers, { endpoint }) => {
      console.log(`Preparing headers for endpoint: ${endpoint}`);
      try {
        // Get auth session from Cognito
        const session = await fetchAuthSession();
        const { accessToken } = session.tokens ?? {};
        
        if (accessToken) {
          // Add the token to the Authorization header
          headers.set("Authorization", `Bearer ${accessToken.toString()}`);
          console.log("Authorization header set successfully");
        } else {
          console.warn("No access token available from Cognito session");
        }
        
        // Add additional headers for debugging
        headers.set("Accept", "application/json");
        headers.set("Content-Type", "application/json");
        
        return headers;
      } catch (error) {
        console.error("Error setting auth headers:", error);
        return headers;
      }
    },
  }),
  endpoints: (builder) => ({
    // Data report processing endpoint
    processData: builder.mutation<DataReportResponse, DataReportRequest>({
      query: (data) => ({
        url: "process-data", // Matches the resource path in your new API Gateway
        method: "POST",
        body: data,
      }),
      // Add error transformation specific to the processData endpoint
      transformErrorResponse: (response, meta, arg) => {
        console.error("Process Data API error:", response);
        
        // Check for timeout error
        if (response.status === 504) {
          return {
            status: response.status,
            data: {
              message: "Report generation exceeded API Gateway's 29-second timeout limit. Reports with all locations or large date ranges cannot complete within this constraint."
            }
          };
        }
        
        // Check for unauthorized access
        if (response.status === 403) {
          return {
            status: response.status,
            data: {
              message: "Authentication failed. Make sure your API Gateway endpoint has the proper authentication and role permissions."
            }
          };
        }
        
        return response;
      },
    }),
    
    // Locations endpoint - direct DynamoDB integration
    getLocations: builder.query<LocationsResponse, void>({
      query: () => ({
        url: "locations",
        method: "POST", 
        body: {}, // Empty body since the mapping template will provide the TableName
      }),
      // Add better error transformation
      transformErrorResponse: (response, meta, arg) => {
        console.error("Location API error:", response);
        if (response.status === 403) {
          return {
            status: response.status,
            message: "Authentication failed. Make sure your API Gateway endpoint has the proper authentication and CORS settings."
          };
        }
        return response;
      },
      keepUnusedDataFor: 86400, // 24 hours since locations update infrequently
    }),
  }),
});

// Export the hooks for use in components
export const { useProcessDataMutation, useGetLocationsQuery } = lambdaApi;