# Active Context - Reporting System and Data Processing

## Current Focus: Client-Side CSV Processing System

We've implemented a new client-side processing system for reports with these key components:

1. **Dual Processing Architecture**
   - New client-side processing for immediate results and smaller datasets
   - Existing Lambda processing maintained for large reports
   - UI toggle to switch between processing methods
   - Shared filtering logic to ensure consistent results

2. **Direct S3 Data Access**
   - Browser directly fetches CSV files from the S3 data bucket
   - File date filtering based on standardized file naming conventions
   - Sequential processing to avoid overwhelming the browser
   - Combined data from multiple files with consistent structure

3. **Filtering Implementation**
   - Location filtering using store name matching
   - Special handling for default discount IDs to show all data
   - Proper handling for percentage values in discount fields
   - Intuitive filtering that matches user expectations
   - Extended date range support for client-side processing (up to current day)

4. **UI Enhancements**
   - Data table with expandable view for seeing all rows at once
   - Toggle button to switch between compact and expanded views
   - Visual indicators for expanded state
   - Smooth transitions between view states

5. **Performance Optimizations**
   - Client-side processing eliminates Lambda execution time
   - Direct S3 access reduces server load
   - Immediate data display improves perceived performance
   - Pagination to handle large result sets efficiently

## Current AWS Architecture
- Cognito User Pools for authentication
- API Gateway with proxy integration to EC2
- Separate Lambda API Gateway for direct Lambda/DynamoDB access
- EC2 running Express.js with PM2
- RDS PostgreSQL database
- S3 buckets for profile pictures and CSV data storage
- DynamoDB for location data
- Direct S3 data access from browser for client-side processing

## Most Recent Issue: Employee Name Resolution in Reports

Problem: Some employee names were still showing as "Unknown" in the CSV reports:
- The employee name resolution feature was implemented but some names remained as "Unknown"
- The issue was observed in both Reporting and Data Department pages
- The same data processed by the Python Lambda function showed proper names

Root cause:
- The CSV parsing implementation in TypeScript differed from the Python implementation
- The loyalty ID format in the CSV data might not match exactly with the employee data
- Lack of detailed debugging made it difficult to identify specific mismatches

Solution implemented:
1. Modified the CSV parsing to exactly match the Python implementation
2. Added manual line-by-line parsing for better control over the format
3. Enhanced logging to show header information and record counts
4. Added detailed logging for unknown employee IDs
5. Implemented statistics tracking for name resolution success rates
6. Added sample data logging to verify loyalty ID formats

## Previous Issue: Location Filtering in Reports

Problem: Location filtering in the reporting page was failing with these symptoms:
- When selecting "Winter Garden, FL" (ID: 4046), no data was displayed
- Data was confirmed to exist for this location in the CSV files
- Filter showed "No data available" despite matching records

Root cause:
- Location filtering was working correctly
- But the discount filtering was blocking all results because:
  - CSV data contained discount values formatted as percentage strings (e.g., "62.15%")
  - Converting these strings with `Number("62.15%")` resulted in `NaN`
  - `NaN` didn't match any discount IDs, causing all records to be filtered out
  - Since both location AND discount filters needed to pass, no records were displayed

Solution implemented:
1. Modified the discount ID filtering logic to skip filtering when default IDs are selected
2. Added special handling for percentage strings in discount fields
3. Enhanced logging and error handling for filter operations
4. Implemented a more intuitive filter model matching user expectations

## Recent Enhancement: Data Department CSV Processing

We've replicated the Reporting Department's client-side CSV processing functionality for the Data Department page, with these key features:

1. **New Data Department Processing**
   - Replicated the reporting page's client-side CSV processing capabilities
   - Configured to use the "qu-location-ids" S3 bucket
   - Maintained the same date range restrictions (Jan 13, 2025 to yesterday)
   - Implemented location and discount ID filtering
   - Added placeholder data types until actual CSV format is provided

2. **Implementation Details**
   - Reused existing CSV processing utilities and components
   - Maintained consistent user experience between Reporting and Data departments
   - Added placeholder sorting functionality to be updated when CSV format is finalized
   - Preserved role-based access control (DATA role required)

## Recent UI Update: Sidebar Redesign and Build Fixes

Updated the sidebar with the following changes:

### Header Redesign
1. Consolidated the two header sections (HUEY and HUEY TEAM) into a single header
2. Replaced "HUEY" with "Huey Magoo's" for better branding clarity
3. Moved the logo to the top header section next to the brand name
4. Removed the "HUEY TEAM" section and the "Private" text
5. Maintained the X button for closing the sidebar
6. Added proper border styling to the consolidated header

### Navigation Simplification
1. Removed the Timeline link from the main navigation
2. Hidden the entire Projects section (including the dropdown and all project links)
3. Kept the code commented out for future reference when the feature is ready to be reintroduced

### Build Fixes
1. Fixed ESLint error in Sidebar component by properly escaping the apostrophe in "Huey Magoo's" to "Huey Magoo&apos;s"
2. Fixed React Hooks exhaustive-deps warning in users/page.tsx by adding handleTeamChange to the dependency array of the useMemo hook

These changes create a cleaner, more focused UI that highlights only the currently active features while preserving the ability to restore work-in-progress features in the future. The build fixes ensure that the application can be successfully built and deployed without errors or warnings.

A detailed technical changelog has been created at CHANGELOGS/TECHNICAL_03-31-2025.md to document these changes.

## Current Status

✅ Implemented: New client-side CSV processing system for reports
✅ Fixed: Location filtering now works correctly with all discount filters
✅ Added: Direct S3 data access for improved performance
✅ Added: Comprehensive CSV utilities and data table components
✅ Documented: New client-side processing approach in technical changelog
✅ Enhanced: CSV data table with expandable view functionality
✅ Improved: Extended date range selection for client-side processing up to current day
✅ Updated: Technical changelog with the latest enhancements
✅ Replicated: CSV processing functionality for Data Department page
✅ Configured: Data Department to use "qu-location-ids" S3 bucket
✅ Enhanced: CSV data with employee name resolution from "employee-list-incentivio" bucket
✅ Implemented: Caching mechanism for employee data to improve performance
✅ Documented: Employee name resolution enhancement in technical changelog
✅ Updated: Replaced the "E" logo with "g_with_tm_black-01" in the sidebar next to Huey Team
✅ Enhanced: Sidebar UI with consolidated header and improved branding
✅ Fixed: Build issues with proper escaping of apostrophes and React Hooks dependencies
✅ Added: Support for rendering Excel-style hyperlinks as clickable links in CSV data tables
✅ Enhanced: Location selection with search functionality, clickable chips, undo/clear buttons, and improved date pickers

## Next Steps
- Add data visualization and charts to reports
- Implement more advanced filtering options (date range, value ranges)
- Create unit tests for CSV processing utilities
- Optimize for large datasets with progressive loading
- Add export options for various file formats
- Update Data Department CSV processing when actual CSV format is provided
- Implement specific sorting and filtering for Data Department based on actual data structure