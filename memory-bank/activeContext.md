# Active Development Context

## Current Focus
- Role-based access control improvements
- Team management functionality with enhanced role assignment
- Department access restrictions for Data and Reporting departments
- API Gateway compatibility and optimization
- Direct DynamoDB integration for location data

## Active Components

### Team Management
- Enhanced CRUD operations for teams with role assignment
- Role auto-assignment based on team properties
- Multiple endpoint formats for API Gateway compatibility
- Team deletion with proper relationship cleanup
- Team updating with validation

### Role-Based Access Control
- Fixed case sensitivity issues in role name comparison
- Improved debugging for role permission checks
- Role-based department access (DATA, REPORTING roles)
- Frontend and backend permission verification
- Role-based UI rendering

### API Optimization
- Combined team and role data in single responses
- Anti-caching headers for dynamic data
- Multiple endpoint paths for critical resources
- POST-based alternatives for DELETE operations
- Enhanced error handling with proper status codes

### Frontend Components
- Fixed UI elements in team creation modal
- Corrected role display in team cards
- Added proper role management controls
- Implemented team deletion confirmation
- Fixed role-based sidebar navigation

## Recent Changes
As of March 6, 2025:

### API Improvements
- Fixed roles endpoint issue by adding multiple endpoint paths
- Created direct endpoint at application root level
- Added API Gateway compatibility fixes for HTTP methods
- Modified `/teams` response to include teams and roles
- Created standard response structures
- Completed team CRUD operations

### Backend Enhancements
- Added role auto-assignment system
- Improved error handling throughout team controllers
- Fixed "Headers already sent" error in team deletion
- Enhanced logging for request path analysis
- Implemented proper cascading deletion with relationship cleanup

### Frontend Updates
- Modified API client to extract roles data from teams response
- Fixed role-based access control issues
- Corrected team management UI elements
- Updated sidebar to check for specific roles when displaying department links
- Fixed case-insensitive comparison in access control functions

## Technical Debt
- Some API Gateway compatibility issues remain
- Need better error handling for user-team associations
- Role permissions need more granular control
- Server-side role validation needed for sensitive operations
- Dedicated user roles management interface needed

## Immediate Next Steps
- Implement server-side role validation for sensitive operations
- Add role-based access control to more areas of the application
- Create a dedicated user roles management interface
- Complete Data department functionality
- Enhance Reporting department features
  - Add additional visualization options
  - Implement report templates
  - Improve performance with large datasets

## Development Workflow Requirements
- After completing features, always commit changes to git:
  ```
  git add .
  git commit -m "descriptive message about changes"
  git push origin master
  ```
- This is required to test on the Amplify site

## Current AWS Architecture
- Cognito User Pools for authentication
- API Gateway with proxy integration to EC2
- Separate Lambda API Gateway for direct Lambda/DynamoDB access
- EC2 running Express.js with PM2
- RDS PostgreSQL database
- S3 buckets for profile pictures and data storage
- DynamoDB for location data