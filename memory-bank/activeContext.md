# Active Context - API Routing and Integration Patterns

## Current Focus: Team Assignment Permission Model

We've identified and fixed critical patterns for team management permissions:

1. **Permission Model Design Flaw**
   - Previous implementation checked if the *target user* had admin privileges
   - This created a catch-22: Users removed from teams couldn't be added back (no team = no admin role)
   - Fixed by simplifying permission logic to focus on the requesting user's permissions
   - Special handling for the 'admin' user maintained as a system override

2. **API Gateway Route Pattern Constraints**
   - Only certain base route patterns work reliably through API Gateway
   - `/teams/*` and `/projects/*` paths are properly configured 
   - Custom endpoints like `/users/team-assignment` fail with 404 errors
   - The API Gateway mapping doesn't always pass all Express routes correctly

3. **Special Cases and Edge Conditions**
   - Team ID 0 ("no team" option) requires special handling with a dedicated endpoint
   - Null/undefined value handling requires explicit server-side support
   - API Gateway has limits on how it maps paths with special characters or formats

4. **Simplicity Requirements**
   - Standard RTK Query patterns work more reliably than custom implementations
   - Simple conditional routing in query functions is preferable to complex queryFn overrides
   - Using existing endpoints with different parameters is better than creating new endpoints

## Current AWS Architecture
- Cognito User Pools for authentication
- API Gateway with proxy integration to EC2
- Separate Lambda API Gateway for direct Lambda/DynamoDB access
- EC2 running Express.js with PM2
- RDS PostgreSQL database
- S3 buckets for profile pictures and data storage
- DynamoDB for location data

## Most Recent Issue: Team Assignment Permission Model Flaw

Problem: Team assignment API failing with access denied errors when:
- Trying to assign a user who has no current team
- Creating a catch-22 situation where users removed from teams can never be added back

Root cause:
- The joinTeam controller was checking if the target user had admin privileges
- Users without a team can't have admin privileges (roles are tied to teams)
- This created an impossible situation for reassigning previously removed users

Solution implemented:
1. Simplified permission model to focus on the authenticated user's permissions
2. Special handling for the 'admin' user to ensure administrative access
3. Enhanced error handling and logging for permission-related operations
4. Maintained backward compatibility with existing team assignment flows

## Current Status

✅ Fixed: Team assignment works for all users regardless of their current team status
✅ Fixed: "No team" option works using dedicated endpoint
✅ Fixed: Users can be removed from teams and later reassigned without permission errors
✅ Documented: Permission model best practices in SERVER_GUIDE.md

## Next Steps
- Implement comprehensive JWT-based permission system for authenticated user validation
- Refactor remaining permission checks to follow the same pattern
- Add unit tests for permission-related edge cases
- Create a more detailed user and team management guide