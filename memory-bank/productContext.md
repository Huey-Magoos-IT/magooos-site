# Product Context

## Product Vision
Magooos Site is a comprehensive project management platform designed to facilitate team collaboration, task organization, and department-specific workflows. The product emphasizes role-based access control to ensure proper security and functionality separation.

## Key Product Goals
1. Provide an intuitive project and task management interface
2. Enable granular role-based access control for teams and departments
3. Support specialized department workflows (Data, Reporting)
4. Maintain high security standards with Cognito authentication
5. Deliver performant AWS-based infrastructure without AWS SDK dependencies
6. Implement location-based access control through Groups functionality

## User Personas

### Admin Users
- Manage all aspects of the system
- Create and configure teams with appropriate roles
- Access all departments and functionalities
- Monitor system usage and performance

### Team Leaders
- Manage projects and tasks for their teams
- Assign tasks to team members
- Track progress and generate reports
- Limited to their team's scope and assigned departments

### Department Users
- Access department-specific functionalities (Data, Reporting)
- View and manipulate data relevant to their department
- Generate reports based on department requirements
- Limited by role-based permissions

### Location Administrators
- Manage specific groups of locations
- Create and manage LocationUsers with access to specific locations
- View data filtered by their assigned locations
- Limited to their assigned group's locations

### Location Users
- Access data for specific locations only
- View filtered reports based on location permissions
- Limited to their assigned locations
- Restricted functionality based on location access

### General Users
- View and update assigned tasks
- Participate in project activities
- Access general features without special permissions
- Limited to their assigned teams and projects

## Authentication System

### Implementation
The application uses AWS Cognito for user authentication with the following flow:
1. User registers or signs in through the Amplify UI components
2. Upon successful authentication, Cognito issues JWT tokens
3. Post-confirmation Lambda trigger creates user in database
4. Frontend stores tokens and includes them in API requests
5. API Gateway validates tokens before allowing access

### Components
- **Cognito User Pool**: Handles user registration, authentication, and token issuance
- **Lambda Trigger**: Creates user records in the application database
- **AuthProvider.tsx**: Cognito integration in the frontend
- **Token Injection**: Automatic JWT injection in API requests

### Features
- MFA support for admin users
- Email verification for new accounts
- Password policies with security requirements
- Token refresh logic for session maintenance

## Component Features

### Project Management
- **Projects Page**: Main dashboard for project overview
- **Project Details**: Individual project view with tasks and timeline
- **Multiple Views**:
  - **Board View**: Kanban-style task management
  - **List View**: Linear list of tasks with filtering
  - **Table View**: Spreadsheet-style task management
  - **Timeline View**: Gantt chart of project timeline

### Task System
- **TaskCard Component**: Drag-and-drop functionality
- **Priority Levels**: Urgent, High, Medium, Low, Backlog
- **Assignment System**: Task allocation to team members
- **Status Tracking**: Backlog, In Progress, Completed
- **Comment System**: Discussion threads on tasks

### Team Management
- **Teams Page**: Team creation and management
- **Role Assignment**: Control access through role assignments
- **Team Membership**: User-team associations
- **Department Access**: Role-based access to specialized departments

### Groups Management
- **Groups Page**: Create and manage location groups
- **Location Assignment**: Select locations for each group
- **User Assignment**: Assign LocationAdmin users to groups
- **User Removal**: Remove users from groups with automatic location access revocation
- **Automatic Synchronization**: LocationAdmin users automatically get access to all locations in their group
- **Permission Boundaries**: Enforce location-based access control
- **Sidebar Navigation**: Quick access to Groups page for admins and location admins
- **Enhanced UI**: Visually appealing GroupCard component with improved user management

### Department Features
- **Data Department**:
  - Data analysis tools (planned)
  - CSV data visualization (planned)
  - S3 integration for data storage
  - Location-based data filtering
  - Restricted to DATA role
  
- **Reporting Department**:
  - Report generation with dual processing approach:
    - Lambda-based processing for large reports
    - Client-side processing for immediate results
  - Date range filtering with file name pattern matching
  - Location filtering with store name matching
  - Discount ID filtering with special handling for defaults
  - Direct S3 data access for CSV files
  - CSV data parsing and manipulation in browser
  - Data export to CSV format
  - Sortable data tables with pagination
  - Location-based access control
  - Analytics dashboards (planned)
  - Data visualization (planned)
  - Restricted to REPORTING role

### User Management
- **User Profile**: Personal settings and information.
- **Team Assignment**: Join and leave teams (Admin controlled).
- **Role Visibility**: Display current permissions via badges.
- **Profile Picture**: S3-hosted user images.
- **Location Assignment**: Admins can assign specific `locationIds` to users via a modal dialog in the `UserCard`. Backend authentication fixed to support this.
- **User List Sorting**: Users page now consistently sorts users by username.

## AWS Infrastructure

### Frontend
- **Amplify**: CI/CD and hosting
- **CloudFront**: Content delivery
- **S3**: Asset storage

### Backend
- **EC2**: Auto-scaled application servers
- **RDS**: PostgreSQL database
- **API Gateway**: HTTP API endpoints
- **Lambda**: Serverless functions
- **DynamoDB**: Location data storage
- **Cognito**: User authentication

### Integration Architecture
- All AWS services accessed via direct HTTP/HTTPS requests (no AWS SDK)
- API Gateway mapping templates for DynamoDB integration
- Cognito JWT authorization for all API requests
- EC2 servers running Express with PM2 process management

## Product Requirements

### Functional Requirements
1. **User Management**
   - User registration and authentication via Cognito
   - User profile management
   - Role assignment and team membership

2. **Team Management**
   - Team creation, editing, and deletion
   - Role assignment to teams
   - User-team association

3. **Project Management**
   - Project creation with team assignment
   - Multiple project views (Board, List, Table, Timeline)
   - Task creation, assignment, and tracking

4. **Department Features**
   - Data department with data analysis tools
   - Reporting department with report generation
   - Role-based access to department features

### Non-Functional Requirements
1. **Security**
   - JWT-based authentication
   - Role-based access control
   - Secure AWS infrastructure

2. **Performance**
   - Fast loading times for all views
   - Efficient API responses
   - Optimized database queries

3. **Scalability**
   - Support for growing number of users
   - Auto-scaling EC2 infrastructure
   - Efficient data storage and retrieval

4. **Compliance**
   - AWS best practices
   - No AWS SDK dependencies (HTTP/API Gateway only)
   - Proper error handling and logging

## UI/UX Principles (Updated April 22, 2025)
- **Role-Based Visibility**: Hide UI elements (like sidebar links or pages) if the user lacks the required role (e.g., Users page hidden for non-admins).
- **Contextual Filtering**: Filter data displayed based on user context (e.g., Teams page shows only user's teams, Users page filters for Location Admins).
- **Consistent Navigation**: Maintain logical navigation flow and provide clear access points (e.g., Groups link in sidebar).
- **Clear Default States**: Define sensible default views or redirects (e.g., redirecting to `/teams` by default).
- **User-Friendly Editing**: Use modals and familiar components (like `LocationTable`) for complex data editing (e.g., user location assignment).
- **Consistent Sorting**: Ensure lists are sorted predictably (e.g., Users list sorted by username).

## Architecture & Development Principles

### API Gateway Integration Patterns
1. **Route Pattern Constraints**
   - Use established route patterns: `/teams/*` and `/projects/*`
   - Avoid custom route patterns that aren't configured in API Gateway
   - Follow consistent URL structure across all endpoints

2. **API Design Guidelines**
   - Use POST for most operations (even updates) for API Gateway compatibility
   - Create dedicated endpoints for edge cases (e.g., "no team" option)
   - Handle special values (null, 0, undefined) with specific endpoints
   - Maintain consistent response formats across all endpoints

3. **Client-Side Processing Pattern**
   - Implement dual processing approaches where appropriate (client-side and server-side)
   - Allow users to choose between processing methods based on dataset size
   - Access S3 data directly from the browser when possible
   - Process data incrementally to maintain UI responsiveness
   - Handle special cases in filter logic to match user expectations
   - Skip restrictive filtering for default values (show all data)
   - Provide clear progress indicators for multi-stage processing

4. **Simplicity First**
   - Use standard RTK Query patterns over custom implementations
   - Keep conditional logic simple and explicit
   - Prefer tried and tested library features over custom overrides
   - Implement minimal viable solutions first, then add complexity if needed

5. **Debugging Best Practices**
   - Add comprehensive logging at every stage of request processing
   - Include context details in all error messages
   - Test edge cases explicitly before deploying
   - Document known limitations and workarounds
   - Consider correlation IDs for cross-service request tracking