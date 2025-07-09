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
3. **S3 Storage** - Stores daily CSV prices + approved change JSON files (TO BE BUILT)
4. **Step Functions** - Orchestrates the Lambda workflow (TO BE BUILT)

### Site Side (Existing Pattern)
- **Lambda API Gateway** - `https://sutpql04fb.execute-api.us-east-2.amazonaws.com/prod`
- **Cognito Auth** - Bearer token authentication for AWS services
- **S3 Integration** - Existing pattern for report generation and retrieval
- **Location APIs** - DynamoDB integration via API Gateway

---

## What's Missing

### API Gateway Endpoints (External Lambda Integration)
```
GET    /price-data/current          // Load base CSV + merge all change JSON files
POST   /price-changes               // Create temporary report for admin approval
POST   /price-changes/approve/:id   // Move from temporary to permanent change file
GET    /price-reports/:reportId     // Full report from S3 (temporary or archived)
GET    /price-reports/temporary     // List pending approval reports for admin
```

### S3 Integration (Following Existing Pattern)
- Use existing Lambda API Gateway endpoint
- Cognito Bearer token authentication
- S3 bucket structure:
  - `daily-prices/YYYY-MM-DD-prices.csv` (base prices from Lambda processing)
  - `daily-prices/YYYY-MM-DD-change-N.json` (approved price changes)
  - `price-change-reports/temporary/` (pending admin approval)
  - `price-change-reports/archived/` (completed reports)
- Workflow: Location submits → temporary folder → admin approves → moves to change file
- Loading logic: Base CSV + all change JSON files = current prices
- Follow existing `lambdaApi.ts` pattern for new endpoints

### Location Selection Feature
- Replace hardcoded locations with user's available locations
- Multi-select modal for location choice
- Location validation before submission

---

## Development Tasks

### Phase 1: AWS Lambda Infrastructure (2 weeks)
1. Complete organization Lambda for data formatting (raw data Lambda already exists)
2. Set up S3 bucket structure and Step Functions
3. Add API Gateway endpoints to existing endpoint (external Lambda functions)

### Phase 2: Site Integration (1 week)
5. Add price data endpoints to `lambdaApi.ts`
6. Replace embedded CSV with S3 data
7. Implement dynamic location selection in price portal

### Phase 3: Price Change Workflow (2 weeks)
8. Implement price change report workflow (external Lambda handles processing)
9. S3 storage integration for temporary/permanent reports
10. Admin view/details functionality using S3 data
11. Email notification system integration

**Total Effort:** ~80 hours

---

## Immediate Next Steps

1. **AWS Lambda Infrastructure** - Complete the external data processing pipeline
2. **API Gateway Endpoints** - Add price endpoints to existing API Gateway
3. **Site Integration** - Update `lambdaApi.ts` with new price endpoints
4. **Location Selection** - Replace hardcoded locations with user-specific data

**Integration Pattern:**
- Uses existing API Gateway: `https://sutpql04fb.execute-api.us-east-2.amazonaws.com/prod`
- Cognito Bearer token authentication (same as current pattern)
- RTK Query endpoints in `lambdaApi.ts` (following existing `processData` pattern)
- External Lambda functions handle processing (not part of site codebase)

The AWS Lambda infrastructure needs to be built first, then the site can integrate using the existing Lambda API Gateway pattern.