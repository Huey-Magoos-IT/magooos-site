# Technical Changelog - March 6, 2025

## Team Management and Roles Fixes

### API Improvements

- **Fixed roles endpoint issue**: Resolved 404 errors when accessing `/teams/roles` endpoint by:
  - Added multiple endpoint paths to handle API Gateway mapping issues
  - Created a direct endpoint at the application root level to bypass routing problems
  - Added debug logging to track request paths

- **API Gateway compatibility fix**: Resolved issues with certain HTTP methods:
  - Added multiple POST-based alternatives for DELETE operations:
    - `POST /teams/:teamId/delete` (path parameter-based)
    - `POST /teams/delete-team` (body parameter-based)
  - Updated client API to use the most compatible endpoint format
  - Implemented comprehensive error handling for all deletion paths

- **Enhanced team response format**:
  - Modified `/teams` response to include both teams and available roles in a single request
  - Created a standard response structure with `{ teams: [...], availableRoles: [...] }`
  - Added anti-caching headers to prevent stale role data

- **Complete team CRUD operations**:
  - Added missing DELETE endpoint for teams (`/teams/:teamId`)
  - Added PATCH endpoint for team updates (`/teams/:teamId`)
  - Implemented proper cascading deletion with user relationship cleanup
  - Added validation for team name uniqueness during updates

### Backend Enhancements

- **Role auto-assignment system**:
  - Added logic to ensure teams have appropriate roles based on their names
  - Implemented automatic role assignment for:
    - ADMIN role for teams with admin privileges
    - DATA role for teams with "data" in their name
    - REPORTING role for teams with "reporting" in their name

- **Improved error handling**:
  - Enhanced logging throughout team controllers
  - Added detailed error messages with proper status codes
  - Ensured consistent error response format

### Frontend Updates

- **API client optimization**:
  - Modified API client to extract roles data from teams response
  - Reduced API calls by reusing existing responses
  - Implemented smarter caching with invalidation tags

- **Role-based access control fixes**:
  - Fixed case sensitivity issues in role name comparison
  - Added improved debugging for role checks
  - Ensured users with DATA role can access data department pages
  - Ensured users with REPORTING role can access reporting department pages

- **Team management UI fixes**:
  - Fixed broken UI elements in team creation modal
  - Corrected role display in team cards
  - Added proper role management controls that show available roles
  - Implemented team deletion confirmation workflow
  - Fixed team editing functionality
  
### Bug Fixes

- **"Headers already sent" error in team deletion**:
  - Fixed error where multiple controller functions were attempting to respond to the same request
  - Added response header checks with `!res.headersSent` guards
  - Prevented duplicate responses in delete operations
  - Ensured proper error handling in all response paths

## Future Work

- Implement server-side role validation for sensitive operations
- Add role-based access control to more areas of the application
- Create a dedicated user roles management interface