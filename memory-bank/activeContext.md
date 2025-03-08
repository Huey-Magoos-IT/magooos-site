# Active Context - API Routing and Integration Patterns

## Current Focus: API Gateway Integration Constraints

We've identified critical patterns for working with our API Gateway configuration:

1. **Route Pattern Constraints**
   - Only certain base route patterns work reliably through API Gateway
   - `/teams/*` and `/projects/*` paths are properly configured 
   - Custom endpoints like `/users/team-assignment` fail with 404 errors
   - The API Gateway mapping doesn't always pass all Express routes correctly

2. **Special Cases and Edge Conditions**
   - Team ID 0 ("no team" option) requires special handling with a dedicated endpoint
   - Null/undefined value handling requires explicit server-side support
   - API Gateway has limits on how it maps paths with special characters or formats

3. **Simplicity Requirements**
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

## Most Recent Issue: Team Assignment API Failures

Problem: Team assignment API failing with 404 errors when:
- Using custom `/users/team-assignment` endpoint
- Attempting to set a user to "no team" (teamId = 0)

Root cause:
- API Gateway configuration only recognizes certain route patterns
- No server endpoint to explicitly handle the "no team" case

Solution implemented:
1. Use existing `/teams/:teamId/join` endpoint for team assignments
2. Create a special `/teams/remove-user-from-team` endpoint for the "no team" case
3. Handle routing conditionally in the RTK Query function
4. Use standard query pattern instead of complex queryFn override

## Current Investigation Status

✅ Fixed: Team assignment now works for assigning users to valid teams
✅ Fixed: "No team" option works using dedicated endpoint
✅ Documented: API Gateway constraints in systemPatterns.md

## Next Steps
- Consider similar patterns for other API endpoints
- Review other parts of the codebase for similar issues
- Update documentation to reflect these constraints