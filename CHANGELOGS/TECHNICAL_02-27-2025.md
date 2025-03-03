# Technical Changelog - February 27, 2025

## Separate API Gateway for Lambda Functions Implementation

### Issue Background
The project was experiencing issues with Lambda function integration through the main API Gateway. The proxy integration in the main API Gateway was intercepting all requests, preventing direct access to Lambda functions.

### Solution Implemented
Created a separate dedicated API Gateway specifically for Lambda function integrations, with direct Lambda integration (non-proxy) to allow proper communication between the frontend and Lambda functions.

### Technical Details

#### AWS Infrastructure Changes
1. **New API Gateway Creation**
   - Created new API Gateway: `huey-lambda-gateway` (ID: `sutpql04fb`)
   - Endpoint Type: Regional
   - Resource Path: `/process-data`
   - Method: POST with direct Lambda integration
   - Lambda Function: `Qu_API_Extraction_3-0`
   - Integration Type: Lambda (non-proxy)
   - Stage: prod

2. **Required API Gateway Configurations**
   - CORS settings enabled to allow cross-origin requests
   - Cognito authorization required for endpoint security
   - Mapping templates for request/response transformation

#### Frontend Changes
1. **Environment Configuration**
   - Added new environment variable: `NEXT_PUBLIC_LAMBDA_API_URL`
   - Value: `https://sutpql04fb.execute-api.us-east-2.amazonaws.com/prod`

2. **Lambda API Client**
   - Created new API client: `client/src/state/lambdaApi.ts`
   - Configured with RTK Query for type-safe API calls
   - Set up authentication using Cognito tokens
   - Defined request/response interfaces for data report generation

3. **Redux Store Integration**
   - Updated `redux.tsx` to include Lambda API reducer
   - Added Lambda API middleware to handle async requests
   - Maintained compatibility with existing Redux setup

4. **Data Department Page Updates**
   - Switched from main API to Lambda API for data processing
   - Enhanced UI feedback during report generation
   - Added automatic file detection and highlighting for newly generated reports

### Architecture Impact
This implementation creates a clear separation of concerns in the API layer:
- **Main API Gateway**: Continues to handle standard EC2-based API requests
- **Lambda API Gateway**: Dedicated for direct Lambda function integrations

This separation provides several advantages:
1. Enhanced maintainability with distinct API pathways
2. Improved error isolation between EC2 and Lambda functions
3. Ability to configure each gateway for its specific use case
4. Future extensibility for additional Lambda functions

### Security Considerations
- Both API Gateways use the same Cognito User Pool for authentication
- Authorization is maintained across the system
- CORS is properly configured to maintain security while allowing necessary access

### Testing Notes
The implementation has been tested with direct Lambda function calls for data report generation, confirming proper frontend-to-Lambda communication through the new API Gateway.