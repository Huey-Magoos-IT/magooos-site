# Decision Log

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