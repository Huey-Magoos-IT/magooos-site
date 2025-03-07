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