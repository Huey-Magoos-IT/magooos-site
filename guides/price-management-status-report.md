# Price Management System - Technical Status Report

## Summary

The Price Users Management and Price Portal functionality has solid frontend foundations with role-based access control and price calculation logic, but requires AWS Lambda infrastructure completion and API integration to become fully operational. The system currently operates on mock data and needs AWS Lambda + S3 integration, API development, and location selection functionality.

---

## Current Implementation Status

### ✅ **Completed Components**

#### Frontend Infrastructure
- **Price Portal UI** - Complete interface with embedded CSV data simulation
- **Price Users Management Dashboard** - Full admin interface with mock data
- **Role-Based Access Control** - Implemented for `LOCATION_ADMIN`, `ADMIN`, `PRICE_ADMIN` roles
- **Category-Based Filtering** - Price filtering and sorting by menu categories
- **Sauced Tender Calculations** - Automatic price calculation logic for sauced items
- **Multi-Location Interface** - UI supports multiple location price inputs
- **Report Management Modals** - View, send, and archive report interfaces

#### Data Models & Utilities
- **User Schema** - Supports `locationIds` array for location access
- **Role-Based Permissions** - Complete permission system implementation
- **Group Model** - Location clustering for franchisee management
- **Price Item Parsing** - CSV parsing utilities with category mapping
- **Access Control Library** - Comprehensive role and location access functions

### 🟡 **Partially Implemented**

#### Price Portal Limitations
- **Location Selection** - Hardcoded to mock data (`Downtown Location`, `Mall Location`)
- **Price Submission** - Only logs to console, no backend integration
- **Price Loading** - No API integration for real price data
- **Change Workflow** - Missing location-based price change processing

#### Price Users Management Gaps
- **Franchisee Data** - All data is mocked, no database integration
- **Report Actions** - Send, archive, clear functions only log to console
- **User Lock/Unlock** - Frontend interface only, no backend implementation
- **Email Integration** - Send report modal exists but no actual email functionality

---

## Required Development Work

### **1. AWS Lambda Infrastructure**

**AWS Components (External to Site):**
```
✅ Scheduled Lambda - Raw price data processing (COMPLETED)
🔄 Organization Lambda - Format data into readable format (TO BE BUILT)
🔄 S3 Storage - Daily current prices by date (TO BE BUILT)
🔄 Step Functions - Orchestrate Lambda workflow (TO BE BUILT)
```

**S3 Bucket Structure:**
```
price-data-bucket/
├── current-prices.json              // Single file, replaced daily
├── price-change-reports/
│   ├── in-progress/
│   │   ├── report-{uuid}-{date}.json
│   │   └── ...
│   └── archived/
│       ├── report-{uuid}-{date}.json
│       └── ...
```

### **2. Lambda API Gateway Integration**

**New Lambda Endpoints (Following Existing Pattern):**
```typescript
// Add to existing API Gateway: https://sutpql04fb.execute-api.us-east-2.amazonaws.com/prod

GET    /price-data/current          // Fetch today's price file from S3
POST   /price-changes               // Create S3 report + email
GET    /price-reports/:reportId     // Full report from S3
GET    /price-reports/summary/:id   // Quick summary popup
```

**Lambda Functions Required:**
- `getPriceDataFunction` - Read daily price files from S3
- `createPriceChangeFunction` - Generate reports and store in S3
- `getPriceReportFunction` - Retrieve reports from S3
- `sendReportEmailFunction` - Email notification handling

**Site Integration (lambdaApi.ts):**
```typescript
// Add to existing lambdaApi.ts following current pattern
export const getPriceData = async (): Promise<PriceItem[]> => {
  const response = await fetch(`${LAMBDA_BASE_URL}/price-data/current`, {
    headers: { Authorization: `Bearer ${await getIdToken()}` }
  });
  return response.json();
};

export const submitPriceChanges = async (changes: PriceChange[]): Promise<string> => {
  const response = await fetch(`${LAMBDA_BASE_URL}/price-changes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getIdToken()}`
    },
    body: JSON.stringify(changes)
  });
  return response.json().reportId;
};
```

### **3. Location Selection Page**

**Price Portal Modifications:**
```typescript
// Add to price portal state management
const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
const [showLocationModal, setShowLocationModal] = useState(false);
const [availableLocations, setAvailableLocations] = useState<Location[]>([]);

// New API integration
const { data: userLocations } = useGetUserLocationsQuery(user?.userId);

// Location selection modal component
const LocationSelectionModal = () => {
  // Multi-select interface for user's available locations
  // "Select All" / "Deselect All" functionality
  // Location search and filtering
  // Confirmation before proceeding to price changes
};
```

**Implementation Steps:**
1. Create location selection modal component
2. Replace hardcoded location array with API call
3. Add location filtering to price change workflow
4. Implement "Select All Locations" functionality
5. Add location validation before price submission

### **4. Site Integration & Data Flow**

**Required Tasks:**
- **Lambda API Integration** - Add price endpoints to `lambdaApi.ts`
- **S3 Data Replacement** - Replace embedded CSV with S3 data
- **Location API Enhancement** - Extend existing location APIs for price portal
- **Report Workflow** - Integrate S3 report generation with admin interface
- **Email Service** - Connect Lambda email functions to admin actions

### **5. Real-time Features & Notifications**

**Email System Integration:**
```typescript
// Email service for report sending
interface EmailService {
  sendPriceChangeReport(reportId: string, recipients: string[], locations: string[]): Promise<void>;
  sendPriceAccessNotification(userId: string, isLocked: boolean): Promise<void>;
  sendScheduledPriceUpdate(reportId: string, scheduledDate: Date): Promise<void>;
}
```

**Additional Features:**
- **WebSocket Integration** - Real-time notifications for price change approvals
- **Scheduled Execution** - Automated price change implementation at specified times
- **Audit Logging** - Comprehensive tracking of all price modifications
- **Report Templates** - Standardized email templates for different report types

### **6. Security & Validation Enhancements**

**Price Change Validation:**
- Price range validation (prevent unrealistic price changes)
- Rate limiting on price update requests
- Approval workflows for large price changes
- Rollback functionality for erroneous changes

**Access Control Improvements:**
- Location-specific permission validation
- Time-based access restrictions
- IP-based access controls for sensitive operations
- Enhanced audit trails with user attribution

---

## Development Effort Estimation

### **Backend Development: ~40 hours**
- **Database Schema & Migrations:** 8 hours
- **API Endpoint Development:** 20 hours
- **Business Logic Implementation:** 12 hours

### **Frontend Integration: ~24 hours**
- **Location Selection Feature:** 8 hours
- **API Integration & State Management:** 10 hours
- **UI Enhancements & Error Handling:** 6 hours

### **Infrastructure & Testing: ~16 hours**
- **Email Service Integration:** 6 hours
- **Unit & Integration Testing:** 8 hours
- **Deployment & Configuration:** 2 hours

### **Total Estimated Effort: ~80 hours**

---

## Priority Implementation Roadmap

### **Phase 1: AWS Infrastructure (Weeks 1-2)**
1. **Organization Lambda Development** - Format raw data for daily use
2. **S3 Bucket Setup** - Structure for daily prices and reports
3. **Step Functions** - Orchestrate data processing workflow
4. **Lambda API Endpoints** - Price data and report management

### **Phase 2: Site Integration (Weeks 3-4)**
5. **Lambda API Integration** - Add endpoints to `lambdaApi.ts`
6. **Price Portal S3 Integration** - Replace CSV with S3 data
7. **Location Selection Enhancement** - Dynamic user locations
8. **Report Generation** - S3-based price change reports

### **Phase 3: Admin Features (Weeks 5-6)**
9. **Admin Report Interface** - View/details from S3
10. **Email Integration** - Lambda-based notifications
11. **User Access Control** - Lock/unlock functionality
12. **Report Workflow** - Send/archive/clear actions

### **Phase 4: Advanced Features (Weeks 7-8)**
13. **Scheduled Price Changes** - Advanced workflow features
14. **Audit Logging** - S3-based change tracking
15. **Performance Optimization** - Caching and error handling

---

## Technical Considerations

### **Performance Optimization**
- **Database Indexing** - Optimize queries for location and price lookups
- **Caching Strategy** - Redis caching for frequently accessed price data
- **API Rate Limiting** - Prevent abuse of price change endpoints
- **Pagination** - Handle large datasets in price catalogs and reports

### **Scalability Planning**
- **Microservice Architecture** - Consider separating price management into dedicated service
- **Event-Driven Updates** - Use message queues for price change propagation
- **CDN Integration** - Cache static price data for faster loading
- **Database Partitioning** - Partition price data by location or date ranges

### **Integration Points**
- **POS System Integration** - Sync price changes with point-of-sale systems
- **Inventory Management** - Connect with inventory systems for item validation
- **Financial Reporting** - Integration with accounting systems for price change tracking
- **External APIs** - Potential integration with third-party pricing services

---

## Risk Assessment & Mitigation

### **High-Risk Areas**
- **Data Migration** - Risk of price data corruption during CSV to database migration
- **Price Synchronization** - Potential for price discrepancies across systems
- **User Access Management** - Risk of unauthorized price modifications

### **Mitigation Strategies**
- **Comprehensive Testing** - Extensive testing of price calculations and data integrity
- **Rollback Procedures** - Ability to revert price changes if issues arise
- **Access Logging** - Detailed audit trails for all price-related actions
- **Staged Deployment** - Gradual rollout with monitoring at each phase

---

## Conclusion

The Price Management System has excellent frontend foundations but requires substantial backend development to become production-ready. The location selection feature is a straightforward enhancement once the location APIs are implemented.

**Immediate Next Steps:**
1. Complete AWS Lambda infrastructure (organization Lambda, S3, Step Functions)
2. Create Lambda API endpoints following existing pattern
3. Integrate price data endpoints into `lambdaApi.ts`
4. Implement dynamic location selection in price portal

The system architecture is well-designed for scalability, and the modular approach will allow for incremental deployment of features as they're completed.