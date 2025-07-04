# Price Management System - Summary

## Current Status

**Frontend:** Complete UI with mock data
**AWS Infrastructure:** Lambda functions + S3 (in development)
**Site Backend:** Needs API endpoints to integrate with S3
**Key Gap:** Location selection uses hardcoded data instead of user's available locations

---

## What's Working

- Price Portal UI with CSV data simulation
- Price Users Management dashboard
- Role-based access control (`LOCATION_ADMIN`, `ADMIN`, `PRICE_ADMIN`)
- Price calculation logic for sauced items
- Report management interfaces
- Existing Lambda API Gateway pattern for S3 integration

## Current Architecture

### AWS Side (In Development)
1. **Scheduled AWS Lambda** - Processes raw price data daily
2. **Organization AWS Lambda** - Formats data into readable format (TO BE BUILT)
3. **S3 Storage** - Stores single current prices file (replaced daily) (TO BE BUILT)
4. **Step Functions** - Orchestrates the Lambda workflow (TO BE BUILT)

### Site Side (Existing Pattern)
- **Lambda API Gateway** - `https://sutpql04fb.execute-api.us-east-2.amazonaws.com/prod`
- **Cognito Auth** - Bearer token authentication for AWS services
- **S3 Integration** - Existing pattern for report generation and retrieval
- **Location APIs** - DynamoDB integration via API Gateway

---

## What's Missing

### AWS Lambda APIs (Following Existing Pattern)
```
GET    /price-data/current          // Fetch today's price file from S3
POST   /price-changes               // Create S3 report + email  
GET    /price-reports/:reportId     // Full report from S3
GET    /price-reports/summary/:id   // Quick summary popup
```

### S3 Integration (Following Existing Pattern)
- Use existing Lambda API Gateway endpoint
- Cognito Bearer token authentication
- S3 bucket structure:
  - `current-prices.json` (single file, replaced daily)
  - `price-change-reports/in-progress/` (active reports)
  - `price-change-reports/archived/` (completed reports)
- File naming conventions (similar to existing report pattern)
- Follow existing `lambdaApi.ts` pattern for new endpoints

### Location Selection Feature
- Replace hardcoded locations with user's available locations
- Multi-select modal for location choice
- Location validation before submission

---

## Development Tasks

### Phase 1: AWS Lambda Infrastructure (2 weeks)
1. Build scheduled Lambda for raw price data processing
2. Create organization Lambda for data formatting
3. Set up S3 bucket structure and Step Functions
4. Create Lambda API endpoints following existing pattern

### Phase 2: Site Integration (1 week)
5. Add price data endpoints to `lambdaApi.ts`
6. Replace embedded CSV with S3 data
7. Implement dynamic location selection in price portal

### Phase 3: Price Change Workflow (2 weeks)
8. Create price change report generation Lambda
9. S3 storage for in-progress reports
10. Admin view/details functionality
11. Email notification system

**Total Effort:** ~80 hours

---

## Immediate Next Steps

1. **AWS Lambda Infrastructure** - Build the scheduled data processing pipeline
2. **Lambda API Endpoints** - Add price endpoints to existing API Gateway
3. **Site Integration** - Update `lambdaApi.ts` with new price endpoints
4. **Location Selection** - Replace hardcoded locations with user-specific data

The AWS Lambda infrastructure needs to be built first, then the site can integrate using the existing Lambda API Gateway pattern.