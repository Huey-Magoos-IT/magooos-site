# PROJECT ARCHITECTURE

**IMPORTANT DEVELOPMENT REQUIREMENT**
THE AWS SDK IS GENERALLY PROHIBITED IN THIS PROJECT CODEBASE TO AVOID UNNECESSARY COMPLEXITY AND DEPENDENCIES, PARTICULARLY IN THE FRONTEND OR FOR SIMPLE AWS SERVICE INTERACTIONS THAT CAN BE HANDLED VIA API GATEWAY MAPPING TEMPLATES (E.G., DYNAMODB ACCESS).
HOWEVER, FOR COMPLEX BACKEND ADMINISTRATIVE OPERATIONS ON AWS SERVICES LIKE COGNITO (E.G., USER MANAGEMENT ACTIONS LIKE ENABLING/DISABLING USERS, RESENDING CONFIRMATIONS), THE AWS SDK (E.G., `@aws-sdk/client-cognito-identity-provider`) IS PERMITTED AND USED WITHIN THE EXPRESS SERVER (`server/src/controllers/`) TO INTERACT DIRECTLY WITH THE SERVICE.
All other AWS integrations should prefer direct HTTP/HTTPS requests or API Gateway integrations.

## Next.js 14 (`client/src/app/`)
- App Router: `dashboardWrapper.tsx` + `layout.tsx`
- Dynamic views: `/projects/[id]/page.tsx`
- Auth flow: `authProvider.tsx` → Cognito
- Role-based access control: `accessControl.ts` + `teams/page.tsx`
- Department pages: Restricted access based on user role permissions

## Express API (`server/src/`)
- Controllers: `taskController.ts` ↔ Prisma models
- Routes: JWT validation → API Gateway
- Team management: `teamController.ts` with role-based permissions
- Role management: `Role` and `TeamRole` models for granular access control
- User lifecycle management: Includes enabling and disabling user accounts (soft delete) via API, synchronized with AWS Cognito. Includes email field in User model (added via migrations like 20250908233723_add_email_feature_finally).

## State Management (`client/src/state/`)
- Redux Toolkit: `api.ts` handles Cognito token injection
- Lambda API: `lambdaApi.ts` for direct Lambda function access
- Dark mode: persisted via local storage
- Team state: managed through RTK Query

# AWS SERVICE MAP

**Frontend:**
```
Amplify (CI/CD) → S3 (assets) ↔ CloudFront
  Domain: <https://master.d25xr2dg5ij9ce.amplifyapp.com>
```

**Backend:**
```
EC2 (auto-scaled) ←→ RDS (VPC)
  ↑          ↓
 Cognito   Lambda (cron/users, data-processing)
  │          │
 API Gateway ←─┘
  Main Endpoint: <https://puvzjk01yl.execute-api.us-east-2.amazonaws.com/prod>
  Lambda Endpoint: <https://sutpql04fb.execute-api.us-east-2.amazonaws.com/prod>
```

**DynamoDB:**
- Locations table (`Location-u3tk7jwqujcqfedzbv7hksrt4a-NONE`)
- Direct API Gateway integration for location data

**S3 Buckets:**
1.  **Profile Pictures:**
    - Bucket: `huey-site-images.s3.us-east-2.amazonaws.com`
    - Public access for profile images
    - Used in `UserCard` component with Next.js `Image`
    - Default profile picture: `p1.jpeg`

2.  **Data Department:**
    - CSV data storage bucket
    - Restricted access for admin teams and users with `DATA` role
    - Integrated with data department page
    - Purpose: Display and analyze CSV data
    - Client-side CSV processing capabilities for immediate results
    - Direct browser access for S3 files without server-side processing

3.  **Net Sales Data:**
    - Folder: `net-sales-pool/` in `data-lake-magooos-site` bucket
    - CSV files with net sales aggregated by date, location, and order channel/type
    - File pattern: `net_sales_report_MM-DD-YYYY.csv`
    - Restricted to `REPORTING` role
    - Direct browser access for client-side processing

# CRITICAL CODE PATTERNS

1.  **Role-Based Access Control:**
    - Department pages require specific role permissions
    - Access verification through `accessControl.ts` utility functions
    - Roles include: `ADMIN` (all access), `DATA` (data department), `REPORTING` (reporting department), `SCANS` (scans-related access), `LOCATION_ADMIN` (group/location management), `LOCATION_USER` (location-specific access)
    - Teams can have multiple roles simultaneously
    - Restricted content with proper error handling
    - Reusable access control components and permission checks
    - Location-based access control through Groups functionality

2.  **Location-Based Access Control:**
    - Groups of locations managed by admins
    - `LocationAdmin` users assigned to groups
    - `LocationUsers` with access to specific locations
    - Automatic synchronization of locations for group members via `location_sync_lambda.py`
    - Location-based data filtering in reporting and data pages
    - Permission boundaries enforced at controller level
    - Multi-level permission hierarchy (`Admin` → `LocationAdmin` → `LocationUser`)
    - Direct DynamoDB integration for efficient location data access
    - Array fields (`locationIds`) for optimal performance with current scale
    - Comprehensive authentication with multiple methods for reliability
    - Dedicated `groups/page.tsx` for UI management
    - New components: `GroupCard/index.tsx`, `ModalCreateLocationUser/index.tsx`

3.  **Groups and Location Management:**
    - Enhanced with `groupController.ts` and `groupRoutes.ts` for CRUD operations
    - Multi-authentication support (body params, custom headers, Bearer tokens)
    - Scripts: `create-location-team.ts`, `migrate-and-seed-location-roles.sh` for setup
    - Postman collection: `postman_location_testing_collection.json` for testing

3.  **Priority System (Legacy):**
    - `client/src/app/priority/[level]/page.tsx`
    - Reusable template: `reusablePriorityPage/index.tsx`
    - Priority levels: Urgent, High, Medium, Low, Backlog (this will be removed for department pages)

4.  **Component Architecture:**
    - Modal system: `ModalNewProject` ↔ `ModalNewTask`, plus `ModalCreateUser`, `ModalCreateLocationUser`
    - View components: `BoardView` ↔ `taskController.ts`, with `ViewToggle` for switching
    - Team components: Role-aware UI with conditional rendering based on permissions, including `RoleBadge`
    - Permission utilities: `hasRole` and `hasAnyRole` functions for checking access
    - `GroupCard` for group visualization

5.  **Security Implementation:**
    - `server/prisma/schema.prisma`: `Role` and `TeamRole` models for granular permissions
    - `client/src/lib/accessControl.ts`: Permission checking utilities
    - `client/.env.local`: Amplify config
    - `server/ecosystem.config.js`: PM2 hardening
    - Role-based authorization: Multiple roles with specific access levels
    - Backward compatibility: Legacy `isAdmin` field maintained alongside new role system

6.  **Direct DynamoDB Integration:**
    - API Gateway to DynamoDB without Lambda or SDK
    - Uses mapping templates for request/response transformation
    - Reusable pattern for simple data access requirements
    - Implemented for `LocationTable` component

7.  **AWS SDK Usage Clarification:**
    - General Prohibition: The AWS SDK is generally avoided to minimize frontend bundle sizes and backend complexity where simpler API Gateway integrations suffice (e.g., direct DynamoDB access via mapping templates).
    - Permitted Backend Use: For complex administrative interactions with AWS services from the backend (e.g., Cognito user management in `server/src/controllers/userController.ts`), the AWS SDK (like `@aws-sdk/client-cognito-identity-provider`) IS used. This allows for robust interaction with service APIs that are difficult or insecure to replicate with direct HTTP calls or simple API Gateway proxies.
    - Frontend Prohibition: The AWS SDK should NOT be used in the client-side Next.js application.

8.  **Department Features:**
    - **Data Department** (`app/departments/data/page.tsx`):
        - Data analysis tools implemented with CSV processing
        - CSV data visualization using `CSVDataTable`
        - S3 integration for data storage
        - Restricted to `DATA` role
    - **Red Flag Reports** (`app/departments/reporting/page.tsx`):
        - Comprehensive report generation with dual processing approach:
            - Lambda-based processing for large reports (handles datasets exceeding client capabilities)
            - Client-side processing for immediate results (bypasses API Gateway 29-second timeout)
            - Toggle switch to select preferred processing method
        - CSV File Management:
            - Direct S3 data access for CSV files
            - File listing and filtering by date range and report type
            - Filename date extraction for temporal organization
        - Advanced Data Processing:
            - Multi-file CSV combining and aggregation
            - Location filtering with store name matching
            - Discount ID filtering with intelligent default handling (skips filtering for default selections)
            - CSV data parsing and manipulation in browser using PapaParse
        - Visualization and Export:
            - Data export to CSV format with client-side generation
            - Sortable data tables with pagination using `CSVDataTable` component
            - Search capabilities within processed data
            - Progress indicators for multi-stage processing
            - Analytics dashboards with `reportUtils.ts`
            - Data visualization with charts and graphs
        - Access Control:
            - Restricted to `REPORTING` role
            - Comprehensive error handling for permission boundaries
    - **Net Sales Report** (`app/reports/net-sales-report/page.tsx`):
        - Aggregated net sales by date, location, and order channel/type
        - S3 data source: `net-sales-pool/` folder in data-lake bucket
        - Filter Modes:
            - "Order Channel" - Shows channel column, hides Order Type
            - "Order Type" - Shows type column, hides Order Channel
            - "Both" - Shows both columns with dual filtering
        - Order Channel options: In Store, Web, UberEats, Doordash, Grubhub, Catering, Web Catering, ezCater, Off-Premise
        - Order Type options: Dine In, Drive-Thru, To-Go, Pickup, Third Party, Phone In, Web Orders, Unknown
        - Location filtering using Location ID matching
        - Date range selection from Dec 30, 2024 with preset options
        - CSV export functionality
        - Access Control:
            - Restricted to `REPORTING` role
    - **Percent of Scans Department** (`app/departments/percent-of-scans/page.tsx`):
        - Analysis of scan percentages, restricted to `SCANS` or `REPORTING` roles
        - Integrated with loyalty and price data
    - **Price Portal Department** (`app/departments/price-portal/page.tsx`):
        - Price management portal with location selection (`location-selection/page.tsx`)
        - Item mappings and price change tracking using `priceChangeUtils.ts` and `priceDataUtils.ts`
        - Restricted to `DATA` or `ADMIN` roles
    - **Raw Data Department** (`app/departments/raw-data/page.tsx`):
        - Direct access to raw CSV data from S3
        - Processing with `legacyLambdaProcessing.ts` for compatibility
    - **Raw Loyalty Department** (`app/departments/raw-loyalty/page.tsx`):
        - Raw loyalty data handling and reporting
        - Integration with `loyalty_data_report_lambda.py`

9.  **Price-Users Features** (`app/price-users/page.tsx`):
    - Management of price users and item mappings (`item-mappings/page.tsx`)
    - Utilities: `itemNameMappings.ts` for name standardization
    - Role-restricted to `DATA` or `ADMIN`
    - Supports price portal workflows

## AWS Infrastructure:
- EC2 auto-scaling groups for backend API (port 80)
- RDS PostgreSQL with read replicas and daily backups
- S3 buckets with versioning and access logging
- Cognito user pools with custom attributes
- API Gateway with rate limiting and updated CORS
- Lambda functions for cron jobs and user management
- DynamoDB for location data and reference tables
- CloudWatch monitoring and alerting

## Development Ecosystem:
- CI/CD pipelines with Amplify and GitHub Actions
- Infrastructure-as-code (Terraform) for AWS resources
- Local development environment with Docker
- Automated testing with Jest and Cypress
- Error tracking with Sentry integration
- Documentation system with architecture diagrams

## Extras Directory and Additional Tools:
- `extras/` contains Lambda scripts and utilities:
  - `post-confirmation-lambda.js`: Cognito post-confirmation trigger
  - `lambda_trigger_for_aws.js`: General AWS Lambda triggers
  - `lambda-data-extractor.py`: Data extraction from Lambda
  - `loyalty_lambda.py`: Loyalty program processing
  - `red_flag_report_lambda.py`: Red flag detection and reporting
  - `loyalty_data_report_lambda.py`: Loyalty data reporting
  - `location_sync_lambda.py`: Location synchronization
- Build and workflow guides: `price-pages-build-guide.md`, `modularized_lambda_workflow.md`
- Testing tools: `compare_csv.py`, `compare_endpoints.py`, `postman_location_testing_collection.json`, `postman_setup_guide.md`
- Server scripts: `create-location-team.ts`, `fix-admin-roles.ts`, `reset-teams-and-roles.ts`

# AWS OPERATIONAL DETAILS

## Network Architecture:
- Multi-AZ VPC with public/private subnets
- NAT Gateway in public subnet for Lambda outbound traffic
- Internet Gateway for public subnet access
- Private subnets route through NAT Gateway (`0.0.0.0/0`)
- Security groups with least-privilege access:
    * EC2: Inbound from API Gateway
    * RDS: Inbound from EC2 only
    * Lambda: Outbound through NAT Gateway
    * NAT Gateway: No inbound, all outbound

## EC2 Configuration:
- Amazon Linux AMI with PM2 process management
- Security hardening: SSH only via IAM keys, weekly AMI updates
- Auto-scaling based on CPU/memory metrics
- Port 80 exposed for API Gateway integration

## RDS Security:
- Private subnet placement with encrypted storage
- Daily automated backups retained for 35 days
- Connection limits and query timeouts
- Security group allows access only from EC2 instances

## Lambda Configuration:
- VPC-enabled for RDS access
- Private subnet placement with NAT Gateway access
- Cognito triggers for user management
- Security group allows outbound HTTPS (443)
- IAM role with VPC execution permissions
- Direct Lambda API Gateway integration:
    * Dedicated API Gateway: `<https://sutpql04fb.execute-api.us-east-2.amazonaws.com/prod>`
    * Non-proxy integration for data processing functions
    * Same Cognito authentication as main API Gateway
    * Frontend access via `lambdaApi.ts` configuration

## DynamoDB Configuration:
- On-demand capacity mode for cost efficiency
- Location data stored in `Location-u3tk7jwqujcqfedzbv7hksrt4a-NONE` table
- API Gateway direct integration for `/locations` endpoint
- Read-only access through IAM role permissions

## Cognito Integration:
- Frontend uses AWS Amplify UI components
- API Gateway Cognito authorizers for all endpoints
- JWT tokens required with 1-hour expiration
- Post-confirmation Lambda syncs users to RDS
- MFA enforcement for admin users

## S3 Configuration:
1.  **Profile Pictures Bucket (`huey-site-images`):**
    - Public read access for profile images
    - CORS enabled for frontend access
    - Used by `UserCard` component
    - Default profile images stored at root level

2.  **Data Department Bucket:**
    - Private access with IAM roles
    - CORS rules for frontend access
    - Bucket policies restricting access to admin teams and users with `REPORTING`/`DATA` roles
    - Stores CSV data for analysis and reporting
    - Direct client-side access for browser-based CSV processing
    - Configured with appropriate `cache-control` headers for performance
    - Supports the dual processing approach (Lambda and client-side)

## IAM Policies:
- EC2: S3 write access, Cognito admin privileges
- Lambda: RDS read/write access, VPC execution
- Amplify: CodeCommit pull access
- Data Bucket: Restricted to admin team access
- API Gateway: DynamoDB read-only access for locations table

## Monitoring:
- CloudWatch alarms for:
    - API 5xx errors > 1%
    - RDS CPU > 75%
    - S3 bucket size > 80% capacity
- Daily service health reports
- Lambda execution logs and metrics

# TECHNICAL STACK

## Frontend:
- Next.js 14 with TypeScript
- Redux Toolkit for state management
- Tailwind CSS + Material UI components
- Drag-and-drop functionality with `react-dnd`
- Charting with Recharts

## Backend:
- Node.js/Express REST API
- Prisma for database management
- JWT authentication
- Direct AWS integration (AWS SDK used in backend for specific services like Cognito admin operations, otherwise SDK-less approaches preferred)

## DevOps:
- PostgreSQL on AWS RDS
- EC2 for backend hosting
- S3 for file storage
- Cognito for user authentication
- PM2 process management

# EC2 SETUP AND MAINTENANCE

## Initial Setup:
1.  **Connect to EC2 Instance:**
    - Use EC2 Instance Connect
    - Instance IP: `3.15.240.21`
    - Security Groups: `huey_ec2-sg` (ports 22, 80, 443)

2.  **Node.js Installation:**
    ```bash
    sudo su -
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    . ~/.nvm/nvm.sh
    nvm install node
    ```

3.  **Git and Repository Setup:**
    ```bash
    sudo yum update -y
    sudo yum install git -y
    git clone [repository-url]
    cd magooos-site/server
    npm install
    ```

4.  **PM2 Process Management:**
    ```bash
    npm i pm2 -g
    # Create ecosystem.config.js
    pm2 start ecosystem.config.js
    pm2 startup systemd
    ```

## Server Configuration:
1.  **Port Configuration:**
    - Express server runs on port 80
    - API Gateway forwards to port 80
    - Security group allows inbound: 22 (SSH), 80 (HTTP), 443 (HTTPS)

2.  **API Gateway Integration:**
    - Proxy integration to EC2 public IP (`3.15.240.21`)
    - `{proxy+}` resource forwards all paths
    - HTTP integration type with proxy enabled
    - CORS configured for Amplify domain

## Maintenance Procedures:
1.  **Code Updates:**
    ```bash
    cd /home/ubuntu/magooos-site
    git pull origin main
    cd server
    npm install
    pm2 restart all
    ```

2.  **Server Monitoring:**
    ```bash
    pm2 list          # Check process status
    pm2 logs          # View application logs
    pm2 monit         # Monitor CPU/Memory
    ```

3.  **Common Issues:**
    - Port conflicts: Check `netstat -tuln`
    - Process crashes: View logs with `pm2 logs`
    - Permission issues: Verify user ownership