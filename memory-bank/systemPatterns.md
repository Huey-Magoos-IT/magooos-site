# System Architecture Patterns

## Role-Based Access Control Pattern

### Implementation
```
User -> Team Membership -> Team Roles -> Permission Checks -> Protected Resources
```

### Key Components
- `Role` and `TeamRole` models in Prisma schema
- `accessControl.ts` utility functions (`hasRole`, `hasAnyRole`)
- Role-based sidebar navigation
- Department page access restrictions

### Pattern Rules
1. Access checks should happen at both frontend and backend
2. Role names must be handled case-insensitively
3. Teams can have multiple roles
4. Department pages must check for specific roles
5. **Check authenticated user permissions, not target entity**: Permission logic should focus on the user making the request, not the entity being modified
6. **Avoid circular dependencies**: Don't create permission checks that depend on the outcome of the operation
7. **Provide special administrative overrides**: Include specific handling for admin users
8. **Handle "no team" case explicitly**: Users without teams need special handling in permission models
9. **Support multiple authentication methods**: Check for authentication in multiple places (headers, body, tokens)

## Permission Model Design Pattern

### Implementation
```
Request -> Authentication -> Permission Check (requesting user) -> Business Logic -> Response
```

### Key Components
- JWT token validation and user identification
- Team-based role assignment
- Permission checking middleware or controller logic
- Special case handling for administrative users

### Pattern Rules
1. **Check the right user**: Always validate permissions based on the authenticated user making the request
2. **Provide administrative overrides**: Include special handling for admin users or usernames
3. **Avoid circular dependencies**: Permission checks should never depend on the state being modified
4. **Handle edge cases explicitly**: Users with no team, system transitions, and special states need explicit handling
5. **Keep permission logic simple**: Prefer simple boolean checks over complex conditional chains
6. **Add robust logging**: Log permission decisions for auditing and debugging
7. **Test all pathways**: Ensure all possible state transitions are tested, including edge cases
8. **Document permission patterns**: Make permission models explicit in documentation

## AWS Integration Pattern (No SDK)

### Implementation
```
Client Request -> API Gateway -> HTTP Integration -> AWS Service
```

### Key Components
- Direct HTTP requests to AWS services
- API Gateway mapping templates
- JWT token handling for authentication
- Error handling and response transformation

### Pattern Rules
1. No AWS SDK dependencies allowed anywhere
2. Use API Gateway for service integration where possible
3. HTTP requests must include proper authentication
4. Error handling must be robust for all AWS interactions

## API Gateway Routing Constraints

### Implementation
```
Client Request -> API Gateway Routes -> Express Routes -> Controllers
```

### Key Components
- Fixed URL patterns configured in API Gateway
- Route patterns must match between Gateway and Express
- Proxy integration limitations
- Error handling for 404 and routing mismatches

### Pattern Rules
1. **Always use existing base routes**: Custom endpoints often fail with 404 errors
2. **Favor /teams and /projects routes**: These routes are properly configured in API Gateway
3. **Avoid /users/* custom URLs**: These endpoints are more likely to fail
4. **Use POST over PATCH/PUT**: For better compatibility with the API Gateway configuration
5. **Leverage teams/join endpoint**: Use for team assignments instead of custom user endpoints
6. **Consider API Gateway limitations**: When designing new endpoints
7. **Explicitly handle edge cases**: Create specific endpoints for special cases (e.g., "no team" option)
8. **Use special endpoints for null values**: Null or special values need dedicated server endpoints

## Simplicity-First Development Pattern

### Implementation
```
Standard Library Approach -> Simple Conditional Logic -> Minimal Custom Code
```

### Key Components
- RTK Query standard patterns
- Simple conditional routing
- Leveraging existing endpoints with different parameters
- Clear error handling and logging

### Pattern Rules
1. **Use standard RTK Query patterns**: Prefer `query` over complex `queryFn` implementations
2. **Keep conditional logic simple**: Use if/else in query functions rather than complex overrides
3. **Reuse existing endpoints**: Modify parameters instead of creating new endpoints
4. **Separate special case handling**: Create dedicated endpoints for edge cases
5. **Add comprehensive logging**: Include details for every stage of the request lifecycle
6. **Handle errors explicitly**: Each error condition should have clear handling code
7. **Validate user inputs client-side**: Prevent invalid requests before they reach the API
8. **Prefer explicit over implicit**: Be clear about what each endpoint does

## Debugging and Troubleshooting Pattern

### Implementation
```
Client Errors -> Server Logs -> API Gateway Logs -> Root Cause Analysis
```

### Key Components
- Client-side error capture
- Detailed server-side logging
- API Gateway routing analysis
- Error payload inspection

### Pattern Rules
1. **Log every stage of request processing**: Both client and server sides
2. **Add context to error messages**: Include user IDs, parameters, and request context
3. **Trace request paths through all services**: Follow from client -> API Gateway -> Server
4. **Test edge cases explicitly**: Zero values, null values, and boundary conditions
5. **Use fallback approaches**: Have alternatives when primary approach fails
6. **Document known limitations**: Update system patterns when constraints are discovered
7. **Isolate testing in simple environments**: Test API endpoints directly before full integration
8. **Add correlation IDs**: Use unique identifiers to track requests across systems

## Authentication Pattern

### Implementation
```
Cognito User Pool -> JWT Token -> API Authorization -> Protected Resources
```

### Key Components
- AWS Cognito for user authentication
- JWT token validation in API Gateway
- Lambda trigger for user creation in database
- Frontend auth providers in Next.js

### Pattern Rules
1. Use authProvider.tsx for Cognito integration
2. Include JWT tokens in all API requests
3. Validate tokens in API Gateway before forwarding requests
4. Synchronize Cognito users with application database

## Team Management Pattern

### Implementation
```
User Interface -> API Endpoint -> Controller -> Prisma Model -> Database
```

### Key Components
- Team CRUD operations in controller
- Role assignment and auto-assignment
- User-team associations
- Team management UI components

### Pattern Rules
1. Team operations must maintain role associations
2. Auto-assignment based on team properties
3. Cascading deletions must clean up relationships
4. Team updates must validate name uniqueness
5. Permission checks must focus on authenticated user, not target user
6. Special handling required for "no team" assignments
7. Maintain administrative override capabilities

## Frontend Component Organization

### Implementation
```
Page Components -> Feature Components -> Shared UI Components
```

### Key Components
- Page-level components in `src/app/`
- Feature-specific components (e.g., `BoardView`, `ListView`)
- Shared components in `src/components/`
- Modal components for creation/editing

### Pattern Rules
1. Pages should use feature components
2. Feature components should use shared components
3. Modals should be self-contained
4. Components should be properly typed with TypeScript

## State Management Pattern

### Implementation
```
Redux Store -> RTK Query API -> Backend Endpoints
```

### Key Components
- Redux store configuration in `src/state/index.ts`
- API definitions in `src/state/api.ts`
- Lambda API integration in `src/state/lambdaApi.ts`
- Component-level state where appropriate

### Pattern Rules
1. Use RTK Query for data fetching
2. Use Redux for global state
3. Use local state for UI-only concerns
4. Implement proper cache invalidation

## Database Access Pattern

### Implementation
```
Controller -> Prisma Client -> Database Model -> PostgreSQL
```

### Key Components
- Prisma schema definitions
- Controller functions for CRUD operations
- Relationship handling
- Transaction support for multi-step operations

### Pattern Rules
1. Use Prisma for all database access
2. Define clear relationships in schema
3. Use transactions for multi-step operations
4. Implement proper error handling

## API Response Pattern

### Implementation
```
Request -> Validation -> Controller Logic -> Standard Response
```

### Key Components
- Standard response structure
- Error handling middleware
- HTTP status codes
- Anti-caching headers where needed

### Pattern Rules
1. Consistent response format across endpoints
2. Proper HTTP status codes for different scenarios
3. Descriptive error messages
4. Check for already sent headers

## Direct DynamoDB Integration Pattern

### Implementation
```
Client -> API Gateway -> DynamoDB Mapping Template -> DynamoDB
```

### Key Components
- API Gateway mapping templates
- DynamoDB table configuration
- `lambdaApi.ts` for frontend integration
- Response transformations

### Pattern Rules
1. No SDK dependencies in code
2. Use mapping templates for operations
3. Implement proper error handling
4. Configure appropriate caching

## View System Pattern

### Implementation
```
Project Context -> View Type Selection -> Specialized View Components
```

### Key Components
- BoardView (Kanban)
- ListView (Linear list)
- TableView (Spreadsheet)
- TimelineView (Gantt chart)

### Pattern Rules
1. Consistent data model across views
2. Shared interaction patterns
3. View-specific optimizations
4. Common state management

## Client-Side CSV Processing Pattern

### Implementation
```
S3 Data Files -> Client-Side Fetch -> In-Browser Processing -> Filtered Results -> UI Display
```

### Key Components
- `csvProcessing.ts` utility library for all CSV operations
- S3 file listing and filtering functions
- PapaParse integration for CSV parsing
- Client-side filtering logic for location and discount filtering
- `CSVDataTable` component for displaying results
- Hybrid approach (client-side or Lambda) with user toggle

### Pattern Rules
1. **Use feature detection**: Allow users to choose between client-side and Lambda processing
2. **Prioritize browser capability over server resources**: Leverage client processing power when available
3. **Handle default values gracefully**: Skip restrictive filtering when default values are selected
4. **Provide intuitive filtering behavior**: Filter matching should work as users expect
5. **Process files sequentially**: Avoid overwhelming browser with parallel requests
6. **Support mixed filtering approaches**: Allow location and discount filtering together
7. **Maintain format consistency**: Ensure client-side results look like Lambda results
8. **Special handling for percentage values**: Don't directly convert percentage strings to numbers
9. **Include graceful error handling**: Detect and report issues during any processing stage
10. **Document filtering edge cases**: Clearly explain special handling for filter defaults

## Location-Based Access Control Pattern

### Implementation
```
User -> Group Assignment -> Location Access -> Data Filtering -> Protected Resources
```

### Key Components
- `Group` model with locationIds array
- `User` model with groupId relation and locationIds array
- Group controller with CRUD operations
- Location selection interface with LocationTable component

### Pattern Rules
1. **Group-based location assignment**: Locations are assigned to groups, then users are assigned to groups
2. **User removal with access revocation**: When users are removed from groups, their location access is automatically cleared
3. **Automatic location synchronization**: LocationAdmin users automatically get access to all locations in their group
4. **Cascading location updates**: When a group's locations change, update all associated users
5. **Permission boundaries**: Users can only access data for their assigned locations
6. **Multiple authentication methods**: Support various authentication approaches (headers, tokens, body parameters)
7. **Consistent UI patterns**: Use the same location selection interface across the application
8. **Clear visual feedback**: Show selected locations with options to undo or clear all
9. **Enhanced group visualization**: Use visually appealing GroupCard components with proper spacing and styling
10. **Efficient array storage**: Use array fields for location IDs to simplify queries
11. **Proper error handling**: Provide clear error messages for permission boundaries
12. **Documentation**: Clearly document the location-based access control model
13. **Navigation integration**: Include Groups in the sidebar navigation for both admins and location admins