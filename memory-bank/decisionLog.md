# Decision Log

## 2025-03-27: Employee Name Resolution Enhancement

### Problem
The reporting system displayed "Unknown" for guest names in CSV data, which limited the usefulness of the reports:
1. Users couldn't identify employees by name in the reports
2. The "Unknown" placeholder made it difficult to track patterns across reports
3. The original loyalty IDs were preserved but not in a user-friendly format

### Investigation
1. Examined the existing CSV data format and identified the "Unknown" guest name issue
2. Reviewed the Python implementation in the Lambda function that performs employee name resolution
3. Analyzed the structure of the "Customer_Export.csv" file in the "employee-list-incentivio" bucket
4. Evaluated the feasibility of implementing similar functionality in TypeScript for client-side processing

### Decision Points

#### Decision 1: Implement Client-Side Employee Data Resolution
- **Choice**: Create a client-side implementation of employee name resolution similar to the Lambda function
- **Rationale**: Enhances data quality without requiring server-side processing
- **Alternatives Considered**:
  - Modifying the Lambda function (rejected due to timeout constraints)
  - Creating a new Lambda function just for name resolution (rejected for simplicity)
- **Consequences**: Improved data quality with minimal performance impact

#### Decision 2: Use Caching for Employee Data
- **Choice**: Implement a module-level cache for employee data
- **Rationale**: Prevents redundant fetching of the same data during a session
- **Alternatives Considered**:
  - No caching (rejected due to performance concerns)
  - Local storage caching (rejected due to potential staleness issues)
- **Consequences**: Better performance without sacrificing data freshness

#### Decision 3: Preserve Original IDs While Adding Names
- **Choice**: Keep original loyalty IDs in the data while adding resolved names
- **Rationale**: Maintains traceability and debugging capability
- **Alternatives Considered**:
  - Completely replacing IDs with names (rejected for data integrity)
  - Adding a separate column (rejected for UI simplicity)
- **Consequences**: Enhanced data without losing original information

#### Decision 5: Handle Various CSV Formats
- **Choice**: Implement flexible column name detection and ID normalization
- **Rationale**: Ensures compatibility with different CSV export formats
- **Alternatives Considered**:
  - Requiring a specific format (rejected for flexibility)
  - Creating format-specific parsers (rejected for maintainability)
- **Consequences**: More robust solution that works with various data sources

#### Decision 4: Apply Enhancement to Both Departments
- **Choice**: Implement the enhancement for both Reporting and Data Department pages
- **Rationale**: Provides consistent user experience across the application
- **Alternatives Considered**:
  - Implementing only for Reporting (rejected for consistency)
  - Making it an optional feature (rejected for simplicity)
- **Consequences**: Unified data enhancement approach across the application

### Implementation
1. Added functions to fetch and parse employee data from S3
2. Created a mapping system to resolve loyalty IDs to employee names
3. Implemented caching to improve performance
4. Updated both department pages to use the new enhancement
5. Added progress indicators for the new processing steps
6. Created comprehensive documentation in the technical changelog

### Impact
- Enhanced data quality with actual employee names
- Improved report readability and usability
- Maintained backward compatibility with existing functionality
- Added minimal performance overhead due to efficient caching

### Update (March 27, 2025)
After initial implementation, we discovered that some employee names were still showing as "Unknown" in the reports. We made the following additional decisions:

#### Decision 6: Align CSV Parsing with Python Implementation
- **Choice**: Modify the CSV parsing to exactly match the Python implementation
- **Rationale**: Ensure consistent behavior between client-side and Lambda processing
- **Alternatives Considered**:
  - Using PapaParse with custom configuration (rejected for consistency)
  - Creating a hybrid approach (rejected for simplicity)
- **Consequences**: More reliable employee name resolution with consistent behavior

#### Decision 7: Add Comprehensive Debugging
- **Choice**: Implement detailed logging for employee name resolution
- **Rationale**: Provide visibility into why some names might still appear as "Unknown"
- **Alternatives Considered**:
  - Silent failure (rejected for troubleshooting needs)
  - Error reporting only (rejected for proactive monitoring)
- **Consequences**: Better ability to diagnose and fix issues with employee name resolution

#### Implementation Details
1. Modified CSV parsing to use manual line-by-line processing
2. Added detailed logging for unknown employee IDs
3. Implemented statistics tracking for name resolution success rates
4. Added sample data logging to verify loyalty ID formats
5. Enhanced error reporting for troubleshooting

## 2025-03-17: Data Department CSV Processing Enhancement

### Problem
The Data Department page needed enhanced functionality to:
1. Process CSV data from the "qu-location-ids" S3 bucket
2. Provide similar filtering and visualization capabilities as the Reporting page
3. Support location and discount ID filtering for data analysis

### Investigation
1. Examined the existing Reporting page implementation
2. Reviewed the CSV processing utilities and components
3. Analyzed the Data Department's current simple file listing functionality
4. Identified reusable components and patterns from the Reporting page

### Decision Points

#### Decision 1: Replicate Reporting Page Functionality
- **Choice**: Replicate the Reporting page's client-side CSV processing for the Data Department
- **Rationale**: Leverage existing, proven code to quickly implement similar functionality
- **Alternatives Considered**:
  - Creating a completely new implementation (rejected for efficiency and consistency)
  - Modifying the Reporting page to handle both types of data (rejected for separation of concerns)
- **Consequences**: Consistent user experience across departments with minimal development effort

#### Decision 2: Use "qu-location-ids" S3 Bucket
- **Choice**: Configure the Data Department to use the "qu-location-ids" S3 bucket
- **Rationale**: This bucket contains the specific data needed for the Data Department
- **Consequences**: Data Department has access to its own dedicated data source

#### Decision 3: Implement Placeholder Data Types
- **Choice**: Add placeholder data types until actual CSV format is provided
- **Rationale**: Allow for immediate implementation while maintaining flexibility for future updates
- **Alternatives Considered**:
  - Waiting for final CSV format (rejected to avoid implementation delays)
  - Using generic data types (rejected for lack of clarity)
- **Consequences**: Implementation can proceed with placeholders that can be easily updated later

#### Decision 4: Maintain Date Range Restrictions
- **Choice**: Keep the same date range restrictions (Jan 13, 2025 to yesterday)
- **Rationale**: Maintain consistency with the Reporting page and ensure data completeness
- **Consequences**: Consistent date handling across both department pages

### Implementation
1. Replicated the Reporting page structure for the Data Department
2. Updated S3 bucket reference to "qu-location-ids"
3. Added placeholder data types with clear documentation
4. Maintained the same date range restrictions
5. Reused existing CSV processing utilities and components
6. Updated Memory Bank documentation with implementation details

### Impact
- Enhanced Data Department with advanced CSV processing capabilities
- Maintained consistent user experience across departments
- Established a pattern for future data processing features
- Improved data analysis capabilities for the Data Department

## 2025-03-12: Reporting Date Range Update

### Problem
The reporting functionality needed an update to:
1. Expand the reporting pool to include January 13th, 2025 (previously started from January 14th)
2. Restrict the end date selection to yesterday's date instead of allowing current day selection

### Investigation
1. Reviewed current date restrictions in the reporting page
2. Identified code locations for both start and end date restrictions
3. Determined that the change affects both client-side and Lambda processing modes

### Decision Points

#### Decision 1: Expand Start Date to January 13th
- **Choice**: Change the minDate for start date from January 14th to January 13th, 2025
- **Rationale**: Allow access to additional historical data from January 13th
- **Consequences**: Increased data availability for reporting

#### Decision 2: Restrict End Date to Yesterday
- **Choice**: Calculate yesterday's date dynamically rather than allowing current day selection
- **Rationale**: Ensures reports only include complete days of data (current day is still in progress)
- **Alternatives Considered**:
  - Using a fixed cutoff time on current day (rejected for simplicity and consistency)
  - Keeping the original behavior (rejected to ensure data completeness)
- **Consequences**: More consistent reporting with complete daily data

#### Decision 3: Allow Empty Date Fields Initially
- **Choice**: Remove automatic date initialization, allowing date fields to be empty by default
- **Rationale**: Provides users full control over date selection rather than pre-selecting dates
- **Alternatives Considered**:
  - Pre-populating with default dates (rejected based on user preference)
  - Setting only start date automatically (rejected for consistency)
- **Consequences**: Users must explicitly select dates before generating reports

#### Decision 4: Expand Date Navigation Beyond February
- **Choice**: Update date range to allow navigation to March and beyond (up to yesterday)
- **Rationale**: Removes artificial restriction that prevented calendar navigation to March
- **Consequences**: More flexible date selection while still maintaining the "yesterday" limit

### Implementation
1. Updated the DatePicker minDate for start date from January 14th to January 13th, 2025
2. Modified both date pickers to use dynamically calculated yesterday's date as the maxDate
3. Removed automatic date initialization in the useEffect hook, allowing fields to remain empty
4. Removed helper text from date pickers for a cleaner interface
5. Fixed calendar navigation to allow viewing months beyond February

### Impact
- Expanded data access to include January 13th, 2025
- Improved data consistency by excluding current day data
- Enhanced user experience with sensible default date values
- Maintained consistent behavior across both processing modes

## 2025-03-11: Client-Side CSV Processing Implementation

### Problem
The existing Lambda-based report generation system had several limitations:
1. API Gateway's 29-second timeout prevented processing of large datasets
2. Users had to wait for the entire report to process before seeing any results
3. Each report generation required a full Lambda execution, increasing costs
4. Error handling was limited by the Lambda execution environment

### Investigation
1. Analyzed existing report processing flow in Lambda
2. Reviewed S3 data storage structure and file format conventions
3. Evaluated client-side processing capabilities in modern browsers
4. Tested PapaParse library for CSV parsing performance

### Root Causes
1. **Architecture Limitation**: Lambda functions have execution time limits
2. **User Experience Issue**: Full report processing before display causes delays
3. **Cost Concern**: Each report generation requires Lambda resources
4. **Flexibility Limitation**: Server-side processing limits filter customization

### Decision Points

#### Decision 1: Implement Dual Processing Approach
- **Choice**: Create a client-side processing system while maintaining Lambda capability
- **Rationale**: Provides flexibility based on report size and complexity
- **Alternatives Considered**:
  - Migrating entirely to client-side (rejected as some reports are too large)
  - Enhancing Lambda only (rejected due to timeout limitations)
- **Consequences**: More complex codebase but greater flexibility and performance

#### Decision 2: Direct S3 Access from Browser
- **Choice**: Allow browser to directly fetch CSV files from S3
- **Rationale**: Eliminates Lambda middleman for file retrieval
- **Alternatives Considered**:
  - Creating a proxy API (rejected due to added complexity)
  - Pre-processing files for smaller downloads (rejected due to maintenance overhead)
- **Consequences**: Better performance but requires proper S3 CORS configuration

#### Decision 3: Special Handling for Default Filters
- **Choice**: Skip discount filtering when default discount IDs are selected
- **Rationale**: Better matches user expectations and prevents confusing empty results
- **Alternatives Considered**:
  - Complex percentage-to-ID conversion logic (rejected as too brittle)
  - Requiring explicit filter selection (rejected for poor UX)
- **Consequences**: More intuitive filtering behavior at the cost of some technical "purity"

#### Decision 4: Expandable CSV Data Table View
- **Choice**: Implement a toggle for expanding CSV table to show all rows without scrolling
- **Rationale**: Improves data visibility and analysis capabilities while maintaining compact default view
- **Alternatives Considered**:
  - Permanently expanding the table (rejected for space efficiency)
  - Adding a separate "full view" mode (rejected for simplicity)
  - Complex windowing with virtual scrolling (rejected as overly complex for the use case)
- **Consequences**: Better data visualization while keeping the UI clean with user control over the view

#### Decision 5: Extended Date Range for Client-Side Processing
- **Choice**: Allow date selection up to the current day for client-side processing while maintaining original limits for Lambda
- **Rationale**: Client-side processing can handle more current data without the same limitations as Lambda processing
- **Alternatives Considered**:
  - Using the same date limits for both methods (rejected as unnecessarily restrictive)
  - Removing date limits entirely (rejected for performance reasons with very large datasets)
- **Consequences**: More flexibility for users while maintaining appropriate constraints based on processing method

### Implementation
1. Created new csvProcessing.ts utility library
2. Implemented client-side file fetching, parsing, and filtering
3. Added UI toggle to switch between processing methods
4. Fixed location filtering to work with discount filters
5. Added special handling for default discount values

### Lessons Learned
1. **Testing Edge Cases**: Filter logic needs explicit testing with percentage values
2. **User Expectation Modeling**: Default filter selections should show "everything"
3. **Hybrid Architecture Benefits**: Client/server hybrid approach provides flexibility
4. **Performance Trade-offs**: Moving processing to the client improves perceived performance

### Impact
- Improved performance for report generation
- Enhanced user experience with immediate data display
- Reduced Lambda execution costs
- Fixed filtering issues for better data exploration
- Established pattern for future client-side processing features

## 2025-03-07: Team Assignment Permission Model Fix

### Problem
Team assignment functionality was failing with permission errors when:
1. Trying to assign a user who has no current team to a team
2. Creating a catch-22 situation where users removed from teams could never be added back

### Investigation
1. Examined client-side error logs showing 403 "Access denied" errors
2. Reviewed server code to understand permission checking logic
3. Traced the execution path in the joinTeam controller
4. Identified flawed permission model that checked target user's permissions instead of requesting user's

### Root Causes
1. **Permission Model Logic Flaw**: The controller was checking if the *target user* had admin privileges
2. **Catch-22 Dependency**: Users without a team cannot have admin privileges (roles are tied to teams)
3. **Inadequate Special Case Handling**: The system had no override for administrative users

### Decision Points

#### Decision 1: Focus on Authenticated User's Permissions
- **Choice**: Check the requesting user's permissions instead of the target user's
- **Rationale**: This eliminates the catch-22 where users without teams can never be added back
- **Alternatives Considered**: 
  - Adding special "teamless" privileges (rejected as it adds complexity)
  - Implementing a temporary team assignment workaround (rejected as a hacky solution)
- **Consequences**: Simplified permission model that works consistently across all scenarios

#### Decision 2: Add Special Admin User Override
- **Choice**: Add specific handling for the 'admin' username to ensure administrative access 
- **Rationale**: Ensures at least one account can always manage teams regardless of permissions
- **Alternatives Considered**:
  - Using a list of admin usernames (rejected for simplicity)
  - Adding a super-admin flag to users table (rejected to avoid schema changes)
- **Consequences**: Maintains an administrative backdoor while simplifying the permission model

#### Decision 3: Maintain Backward Compatibility
- **Choice**: Keep existing no-team endpoint while fixing primary assignment flow
- **Rationale**: Ensures existing client code continues to work without breaking changes
- **Alternatives Considered**:
  - Rewriting the entire team assignment flow (rejected as too risky)
  - Adding a version parameter to endpoints (rejected as unnecessary complexity)
- **Consequences**: Smooth transition with no client-side changes required

### Implementation
1. Simplified permission logic in joinTeam controller to focus on authenticated user
2. Added special case handling for admin username
3. Enhanced logging for permission-related operations
4. Maintained backward compatibility with existing team assignment flows

### Lessons Learned
1. **Check The Right User**: Permission checks must focus on the authenticated user making the request
2. **Avoid Circular Dependencies**: Permission systems should avoid dependencies that create impossible conditions
3. **Plan for Edge Cases**: Always handle special cases like "no team" explicitly
4. **Test All Pathways**: Ensure all possible state transitions are tested, including edge cases

### Impact
- Fixed team assignment for all users regardless of their current team status
- Eliminated the catch-22 situation in permission model
- Improved system resilience with proper edge case handling
- Established a clearer pattern for permission checking

## 2025-03-07: Team Assignment API Fix

### Problem
Team assignment functionality was failing with 404 errors in two scenarios:
1. When using a custom `/users/team-assignment` endpoint
2. When attempting to set a user to "no team" (teamId = 0)

### Investigation
1. Examined client-side error logs showing 404 errors for API requests
2. Reviewed server logs to understand the request path through API Gateway
3. Compared working endpoints (teams/join) with non-working endpoints
4. Identified pattern that only certain route formats work with API Gateway

### Root Causes
1. **API Gateway Route Configuration**: Only specific route patterns are properly configured
   - `/teams/*` and `/projects/*` work reliably
   - Custom routes like `/users/team-assignment` are not recognized
2. **Missing Handling for "No Team"**: The system had no specific endpoint to handle null team assignment

### Decision Points

#### Decision 1: Use Existing Endpoints Instead of Custom Routes
- **Choice**: Use the existing `/teams/:teamId/join` endpoint instead of creating custom user endpoints
- **Rationale**: The existing endpoint is already configured in API Gateway and works reliably
- **Alternatives Considered**: 
  - Adding a new API Gateway route for custom endpoints (rejected due to complexity and deployment risks)
  - Creating a workaround using Lambda direct access (rejected due to consistency concerns)
- **Consequences**: Simplified approach but requires client-side logic to handle different team scenarios

#### Decision 2: Create Special Endpoint for "No Team" Option
- **Choice**: Create a dedicated `/teams/remove-user-from-team` endpoint 
- **Rationale**: Special case needs explicit server-side handling since "teamId=0" is not a valid team ID
- **Alternatives Considered**:
  - Using null in URL path (rejected due to routing issues)
  - Adding query parameter flag (rejected due to API Gateway limitations)
- **Consequences**: More explicit handling of special cases, at the cost of more endpoints to maintain

#### Decision 3: Use Standard RTK Query Patterns
- **Choice**: Use standard query function with conditional routing rather than complex queryFn override
- **Rationale**: Simpler approach is more maintainable and less error-prone
- **Alternatives Considered**:
  - Custom queryFn implementation (rejected due to TypeScript errors and complexity)
  - Separate mutation for "no team" (rejected for UX consistency reasons)
- **Consequences**: Cleaner code, better TypeScript support, more maintainable solution

### Implementation
1. Created a special server endpoint `/teams/remove-user-from-team` to handle "no team" case
2. Updated client code to conditionally route requests based on teamId
3. Added comprehensive logging for debugging
4. Documented API Gateway constraints in system patterns

### Lessons Learned
1. **Simplicity First**: Standard patterns are more reliable than custom implementations
2. **API Gateway Constraints**: Need to understand and work within the limitations of API Gateway
3. **Edge Case Handling**: Special cases need explicit handling with dedicated endpoints
4. **Documentation Importance**: System patterns need to reflect architectural constraints

### Impact
- Fixed team assignment functionality for all scenarios
- Established pattern for handling similar API issues
- Improved understanding of API Gateway constraints
- Updated documentation to prevent similar issues