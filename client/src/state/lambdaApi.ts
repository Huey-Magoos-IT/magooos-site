import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession } from "aws-amplify/auth";

// Define your Lambda API Gateway URL here
// This should be the URL of your NEW API Gateway dedicated to Lambda functions
const LAMBDA_API_URL = process.env.NEXT_PUBLIC_LAMBDA_API_URL || "https://your-new-lambda-api-gateway.execute-api.us-east-2.amazonaws.com/prod";

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

// Location interface to match DynamoDB structure
export interface Location {
  id: string;
  name: string;
  __typename?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Location response interface
export interface LocationsResponse {
  locations: Location[];
  count: number;
}

// Create the API with RTK Query
export const lambdaApi = createApi({
  reducerPath: "lambdaApi",
  baseQuery: fetchBaseQuery({
    baseUrl: LAMBDA_API_URL,
    prepareHeaders: async (headers) => {
      // Same auth as main API
      const session = await fetchAuthSession();
      const { accessToken } = session.tokens ?? {};
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
      return headers;
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
    }),
    
    // Get locations from DynamoDB endpoint
    getLocations: builder.query<LocationsResponse, void>({
      query: () => ({
        url: "locations", // Will create this endpoint in Lambda/API Gateway
        method: "GET",
      }),
    }),
    
    // Add additional Lambda endpoints here as needed
  }),
});

// Export the hooks for use in components
export const {
  useProcessDataMutation,
  useGetLocationsQuery
} = lambdaApi;