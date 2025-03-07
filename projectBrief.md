# Magooos Site - Project Brief

## Project Overview
Magooos Site is a comprehensive project management application with role-based access control features. The application allows users to manage projects, tasks, teams, and provides specialized department access based on user roles.

## Architecture
- **Frontend**: Next.js 14 with TypeScript, Redux Toolkit, and Tailwind CSS
- **Backend**: Express.js REST API with Prisma ORM
- **Database**: PostgreSQL on AWS RDS
- **Authentication**: AWS Cognito with JWT validation
- **Hosting**: Frontend on AWS Amplify, Backend on EC2 auto-scaling groups

## Key Features
1. **Role-Based Access Control (RBAC)**:
   - Granular permissions with roles: ADMIN, DATA, REPORTING
   - Department access restrictions based on team roles
   - Role management and team administration features

2. **Project & Task Management**:
   - Project creation and assignment to teams
   - Task tracking with multiple views (Board, List, Table, Timeline)
   - Priority-based organization

3. **Team Management**:
   - Team creation with role assignment
   - User-team associations
   - Automatic role assignment based on team properties

4. **Department-Specific Features**:
   - Data department for data analysis
   - Reporting department for generating reports
   - Access controlled by team roles

## AWS Integration
- Critical note: AWS SDK is strictly prohibited in the codebase
- All AWS interactions must use direct HTTP/HTTPS requests or API Gateway
- Services used: EC2, RDS, Cognito, API Gateway, Lambda, S3, DynamoDB, CloudFront

## Current Development Focus
- Enhancing role-based access control
- Improving team management functionality
- API optimization and error handling
- Building department-specific features

## Project Status
Active development with ongoing improvements to role and team management features.