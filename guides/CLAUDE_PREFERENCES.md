# Claude Preferences for Magooos Site Project

## Project Context
**Magooos Site** is a full-stack project management application with role-based access control (RBAC), location-based permissions, and department-specific features. Built with Next.js 14, Express/TypeScript, Prisma ORM, and AWS infrastructure.

---

## 🚨 CRITICAL: Git Operations Policy

### ❌ NEVER Do This:
- **NEVER** commit or push to git without explicit user permission
- **NEVER** make automated commits without asking first
- **NEVER** assume the user wants changes committed

### ✅ ALWAYS Do This:
- **ALWAYS** ask the user before committing any changes
- **ALWAYS** ask the user before pushing to remote
- **ALWAYS** let the user review changes before git operations

---

## 🚨 CRITICAL: AWS SDK Usage Policy

### ❌ NEVER Do This:
- **NEVER** use AWS SDK in the frontend (`client/` directory)
- **NEVER** use AWS SDK for simple operations that can use API Gateway mapping templates (e.g., DynamoDB reads)
- **NEVER** bundle AWS SDK dependencies in the client-side code

### ✅ ALWAYS Do This:
- **ALWAYS** use AWS SDK in backend (`server/`) for Cognito admin operations (enable/disable users, admin updates)
- **ALWAYS** use direct HTTP/HTTPS requests or API Gateway integrations for AWS services when possible
- **ALWAYS** use `@aws-sdk/client-cognito-identity-provider` for user management in `server/src/controllers/userController.ts`
- **ALWAYS** prefer API Gateway mapping templates for DynamoDB (see `lambdaApi.ts` locations endpoint)

**Why?** This avoids unnecessary bundle bloat, reduces frontend complexity, and maintains clear separation between client and server responsibilities.

---

## 🏗️ Architecture & Tech Stack

### Frontend Stack
- **Framework**: Next.js 14 with App Router (NOT Pages Router)
- **Language**: TypeScript (strict mode enabled)
- **State Management**: Redux Toolkit with RTK Query for API calls
- **Styling**: Tailwind CSS with custom Huey Magoo's brand colors
- **UI Components**: Material UI (@mui/material) + custom components
- **Authentication**: AWS Amplify with Cognito
- **Key Libraries**:
  - `react-dnd` for drag-and-drop
  - `papaparse` for CSV processing
  - `recharts` for data visualization
  - `date-fns` for date manipulation

### Backend Stack
- **Runtime**: Node.js with Express
- **Language**: TypeScript (compiled to `dist/` folder)
- **ORM**: Prisma with PostgreSQL
- **Process Manager**: PM2 (via `ecosystem.config.js`)
- **Authentication**: JWT validation via API Gateway Cognito authorizer
- **Key Libraries**:
  - `@aws-sdk/client-cognito-identity-provider` for user management
  - `helmet` for security headers
  - `morgan` for request logging

### AWS Infrastructure
- **Hosting**: Frontend on Amplify, Backend on EC2
- **Database**: RDS PostgreSQL
- **Authentication**: Cognito User Pools
- **Storage**: S3 (profile pictures, CSV data)
- **CDN**: CloudFront
- **APIs**: Two API Gateways (main EC2 proxy + Lambda/DynamoDB direct)
- **Functions**: Lambda for cron jobs, data processing, user sync
- **NoSQL**: DynamoDB for locations table

---

## 📝 Code Style & Conventions

### TypeScript Guidelines
```typescript
// ✅ ALWAYS use strict typing
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  // Function body
};

// ✅ ALWAYS use async/await (NOT .then() chains)
const user = await prisma.user.findUnique({ where: { userId } });

// ✅ ALWAYS use descriptive interfaces
export interface Team {
  id: number;
  teamName: string;
  isAdmin: boolean;
  teamRoles?: TeamRole[];
}

// ❌ NEVER use 'any' type unless absolutely necessary
// ❌ NEVER ignore TypeScript errors
```

### Logging Patterns
```typescript
// ✅ ALWAYS use descriptive log prefixes with HTTP method and route
console.log("[GET /teams] Fetching all teams");
console.log(`[POST /users] Creating user: ${username}`);
console.error("[DELETE /projects] Error:", error);

// ✅ ALWAYS log important operations for debugging
console.log(`[GET /teams/roles] Found ${roles.length} roles:`, roles.map(r => r.name).join(', '));

// ❌ NEVER use console.log without context prefixes
```

### Error Handling
```typescript
// ✅ ALWAYS use try-catch in async functions
export const createTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input first
    if (!teamName || typeof teamName !== 'string' || teamName.trim().length === 0) {
      console.error("[POST /teams] Invalid team name");
      res.status(400).json({ message: "Team name is required" });
      return;
    }

    // Check for duplicates
    const existingTeam = await prisma.team.findFirst({
      where: { teamName: teamName.trim() }
    });

    if (existingTeam) {
      console.error("[POST /teams] Team name already exists:", teamName);
      res.status(409).json({ message: "Team name already exists" });
      return;
    }

    // Perform operation
    const team = await prisma.team.create({
      data: { teamName: teamName.trim(), isAdmin: Boolean(isAdmin) }
    });

    console.log("[POST /teams] Team created:", team);
    res.status(201).json(team);
  } catch (error: any) {
    console.error("[POST /teams] Error:", error);
    res.status(500).json({
      message: "Error creating team",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ ALWAYS return appropriate HTTP status codes:
// - 200: Success
// - 201: Created
// - 400: Bad Request (validation errors)
// - 401: Unauthorized
// - 403: Forbidden (permission denied)
// - 404: Not Found
// - 409: Conflict (duplicates)
// - 500: Internal Server Error
```

### Component Structure
```typescript
// ✅ ALWAYS use the index.tsx pattern for components
// File: client/src/components/Header/index.tsx

import React from "react";

type Props = {
  name: string;
  buttonComponent?: any;
  isSmallText?: boolean;
};

const Header = ({ name, buttonComponent, isSmallText = false }: Props) => {
  return (
    <div className="mb-5 flex w-full items-center justify-between">
      <h1 className={`${isSmallText ? "text-lg" : "text-2xl"} font-semibold dark:text-white`}>
        {name}
      </h1>
      {buttonComponent}
    </div>
  );
};

export default Header;
```

---

## 🔐 Role-Based Access Control (RBAC)

### Available Roles
- **ADMIN**: Full system access (equivalent to `isAdmin: true`)
- **DATA**: Access to data department
- **REPORTING**: Access to reporting department
- **SCANS**: Access to percent-of-scans department
- **LOCATION_ADMIN**: Can manage users within assigned location groups
- **LOCATION_USER**: Has access to specific locations only
- **PRICE_ADMIN**: Price portal management
- **PRICE_USER**: Price portal user access

### Access Control Utilities
```typescript
// Location: client/src/lib/accessControl.ts

// ✅ ALWAYS use these utility functions for permission checks
import { hasRole, hasAnyRole, isLocationAdmin } from "@/lib/accessControl";

// Check for a single role
const hasDataAccess = hasRole(teamRoles, 'DATA');

// Check for multiple roles (OR logic)
const hasReportAccess = hasAnyRole(teamRoles, ['REPORTING', 'SCANS']);

// Check location-based permissions
const isLocAdmin = isLocationAdmin(teamRoles);
const hasPriceAccess = isPriceAdmin(teamRoles);

// ❌ NEVER manually check roles with array.find() or array.some()
// ❌ NEVER forget that ADMIN role has access to everything
```

### Server-Side Permission Checks
```typescript
// ✅ ALWAYS validate permissions in controllers
export const getDataDepartmentData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId; // From JWT middleware

    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        team: {
          include: {
            teamRoles: { include: { role: true } }
          }
        }
      }
    });

    // Check if user's team has DATA or ADMIN role
    const hasDataAccess = user?.team?.teamRoles.some(
      tr => tr.role.name === 'DATA' || tr.role.name === 'ADMIN'
    );

    if (!hasDataAccess) {
      return res.status(403).json({
        message: "Access denied: requires DATA or ADMIN role"
      });
    }

    // Continue with authorized logic...
  } catch (error: any) {
    console.error("[GET /data] Error:", error);
    res.status(500).json({ message: "Error retrieving data" });
  }
};
```

### Client-Side Access Control
```typescript
// ✅ ALWAYS check permissions before rendering components
import { useGetAuthUserQuery } from "@/state/api";
import { hasRole } from "@/lib/accessControl";

export default function DataDepartmentPage() {
  const { data: userData, isLoading } = useGetAuthUserQuery();
  const teamRoles = userData?.userDetails?.team?.teamRoles;

  const hasDataAccess = hasRole(teamRoles, 'DATA');

  if (isLoading) return <LoadingSpinner />;

  if (!hasDataAccess) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p>You need DATA role access to view this content.</p>
      </div>
    );
  }

  return (
    <div>
      <Header name="Data Department" />
      {/* Department content */}
    </div>
  );
}
```

---

## 🎨 Styling Guidelines

### Tailwind CSS Best Practices
```typescript
// ✅ ALWAYS use Huey Magoo's brand colors
<div className="bg-orange-500 text-white">Brand Primary</div>
<div className="bg-red-500">Energy Red</div>
<div className="bg-gold-500">Warmth Gold</div>
<div className="bg-charcoal-900">Sophisticated Dark</div>

// ✅ ALWAYS support dark mode with dark: prefix
<div className="bg-white dark:bg-dark-bg text-gray-900 dark:text-white">
  Content
</div>

// ✅ ALWAYS use responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <ItemCard key={item.id} {...item} />)}
</div>

// ✅ ALWAYS use custom animations from tailwind.config.ts
<div className="animate-fade-in">Fading in</div>
<div className="animate-slide-in-right">Sliding in</div>

// ❌ NEVER use inline styles unless absolutely necessary
// ❌ NEVER hardcode hex colors (use Tailwind classes)
```

### Material UI Integration
```typescript
// ✅ ALWAYS use MUI components for complex UI elements
import { Button, TextField, Dialog, Table, Chip } from "@mui/material";

// ✅ ALWAYS make MUI components responsive to dark mode
<Button
  variant="contained"
  className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-pastel"
>
  Action
</Button>
```

---

## 🔄 State Management & API Calls

### RTK Query Patterns
```typescript
// Location: client/src/state/api.ts

// ✅ ALWAYS define typed endpoints
getTeams: build.query<Team[], void>({
  query: () => "teams",
  providesTags: ["Teams"]
}),

// ✅ ALWAYS use mutations for write operations
createTeam: build.mutation<Team, { teamName: string; isAdmin: boolean }>({
  query: (body) => ({
    url: "teams",
    method: "POST",
    body
  }),
  invalidatesTags: ["Teams", "Auth"] // Refresh related queries
}),

// ✅ ALWAYS include authentication headers
prepareHeaders: async (headers) => {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken;
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return headers;
}
```

### Using Hooks in Components
```typescript
// ✅ ALWAYS use generated hooks from RTK Query
import { useGetTeamsQuery, useCreateTeamMutation } from "@/state/api";

const TeamsPage = () => {
  // Query hook
  const { data: teams, isLoading, error } = useGetTeamsQuery();

  // Mutation hook
  const [createTeam, { isLoading: isCreating }] = useCreateTeamMutation();

  const handleCreateTeam = async () => {
    try {
      await createTeam({ teamName: "New Team", isAdmin: false }).unwrap();
      toast.success("Team created successfully");
    } catch (err) {
      console.error("Failed to create team:", err);
      toast.error("Failed to create team");
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {teams?.map(team => <TeamCard key={team.id} team={team} />)}
    </div>
  );
};
```

---

## 🗄️ Database & Prisma

### Migration Workflow
```bash
# ✅ ALWAYS create migrations for schema changes
npx prisma migrate dev --name add_new_feature

# ✅ ALWAYS generate Prisma client after schema changes
npx prisma generate

# ✅ ALWAYS run seed script after fresh migrations
npm run seed

# ✅ ALWAYS test migrations locally before production
```

### Prisma Query Patterns
```typescript
// ✅ ALWAYS include related data with 'include'
const user = await prisma.user.findUnique({
  where: { userId },
  include: {
    team: {
      include: {
        teamRoles: {
          include: { role: true }
        }
      }
    },
    group: true,
  }
});

// ✅ ALWAYS use select for performance when you don't need all fields
const teams = await prisma.team.findMany({
  select: {
    id: true,
    teamName: true,
    isAdmin: true
  }
});

// ✅ ALWAYS order results for consistency
const users = await prisma.user.findMany({
  orderBy: { username: 'asc' }
});

// ✅ ALWAYS validate before create/update
const existingUser = await prisma.user.findUnique({
  where: { username }
});

if (existingUser) {
  return res.status(409).json({ message: "Username already exists" });
}

// ❌ NEVER perform raw SQL queries unless absolutely necessary
// ❌ NEVER forget to handle null/undefined in optional relations
```

---

## 🚀 Deployment & Build Process

### Server Deployment (EC2)
```bash
# ⚠️ CRITICAL: ALWAYS run these steps in order

# 1. SSH into EC2
# Use EC2 Instance Connect (IP: 3.15.240.21)

# 2. Switch to root
sudo su -

# 3. Navigate to repo
cd magooos-site

# 4. Pull latest changes
git pull origin master

# 5. Install dependencies
cd server
npm install

# 6. ⚠️ CRITICAL: Build TypeScript (NEVER skip this!)
npm run build

# 7. Run migrations (only if schema changed)
npx prisma migrate deploy
npx prisma generate

# 8. Run seed if needed
npm run seed

# 9. Restart PM2
pm2 restart all

# 10. Verify deployment
pm2 logs
pm2 status
```

### Frontend Deployment (Amplify)
```bash
# ✅ Amplify CI/CD handles this automatically
# Deploys on push to master branch
# Check Amplify console for build status

# ⚠️ ALWAYS verify environment variables in Amplify:
# - NEXT_PUBLIC_API_BASE_URL
# - NEXT_PUBLIC_LAMBDA_API_URL
# - NEXT_PUBLIC_COGNITO_USER_POOL_ID
# - NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID
```

### Verification Checklist
```bash
# ✅ ALWAYS verify after deployment:

# 1. Check server is running
pm2 status

# 2. Test API endpoints
curl -v https://puvzjk01yl.execute-api.us-east-2.amazonaws.com/prod/teams

# 3. Check logs for errors
pm2 logs --lines 50

# 4. Test frontend build
# Visit: https://master.d25xr2dg5ij9ce.amplifyapp.com

# 5. Test authentication flow
# Try logging in with test user

# 6. Verify role-based access
# Test different user roles and permissions
```

---

## 🐛 Debugging & Troubleshooting

### Common Issues & Solutions

#### 1. "Headers already sent" Error
```typescript
// ❌ WRONG: Multiple responses
export const endpoint = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true });
  res.status(500).json({ error: "Error" }); // Error!
};

// ✅ CORRECT: Single response per request
export const endpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    // Logic here
    if (!res.headersSent) {
      res.status(200).json({ success: true });
    }
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: "An error occurred" });
    }
  }
};
```

#### 2. Authentication Issues
```typescript
// ✅ ALWAYS support multiple authentication methods
// 1. Bearer token (preferred)
const authHeader = req.headers.authorization;
if (authHeader?.startsWith('Bearer ')) {
  const token = authHeader.substring(7);
  // Verify token
}

// 2. Custom headers (fallback)
const cognitoId = req.headers['x-user-cognito-id'];

// 3. Body parameters (legacy)
const { requestingUserId } = req.body;

// ✅ ALWAYS log authentication attempts
console.log("[Auth] Headers:", req.headers);
console.log("[Auth] Method:", req.method);
console.log("[Auth] Path:", req.path);
```

#### 3. CORS Issues
```typescript
// ✅ ALWAYS configure CORS properly in server/src/index.ts
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://master.d25xr2dg5ij9ce.amplifyapp.com'
    : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-cognito-id'],
  credentials: true
}));

// ✅ ALWAYS handle OPTIONS preflight requests
app.options('*', cors());
```

#### 4. Stale Data After Login/Logout
```typescript
// ✅ ALWAYS reset RTK Query cache on auth changes
// Location: client/src/app/authProvider.tsx

import { Hub } from 'aws-amplify/utils';
import { useDispatch } from 'react-redux';
import { api } from '@/state/api';

useEffect(() => {
  const unsubscribe = Hub.listen('auth', ({ payload }) => {
    if (payload.event === 'signedIn' || payload.event === 'signedOut') {
      // Reset all cached data
      dispatch(api.util.resetApiState());
    }
  });

  return unsubscribe;
}, [dispatch]);
```

---

## 📋 Development Workflow

### Before Starting Work
1. ✅ Pull latest changes: `git pull origin master`
2. ✅ Check for dependency updates: `npm install`
3. ✅ Verify database is up-to-date: `npx prisma migrate status`
4. ✅ Check guides for relevant documentation

### During Development
1. ✅ Read relevant guide files in `guides/` folder first
2. ✅ Follow existing code patterns and conventions
3. ✅ Use TodoWrite tool to track multi-step tasks
4. ✅ Add detailed console.log statements for debugging
5. ✅ Test locally before committing
6. ✅ Verify role-based access control for new features

### Adding New Features
```
1. Database Changes:
   - Update prisma/schema.prisma
   - Create migration: npx prisma migrate dev --name feature_name
   - Update seed script if needed

2. Backend Implementation:
   - Create/update controller in server/src/controllers/
   - Add routes in server/src/routes/
   - Implement permission checks
   - Add error handling and logging

3. Frontend Implementation:
   - Add API endpoints to client/src/state/api.ts
   - Create/update components in client/src/components/
   - Add pages in client/src/app/
   - Implement access control checks
   - Add to sidebar navigation if needed

4. Testing:
   - Test all CRUD operations
   - Test role-based access control
   - Test error scenarios
   - Test on different user roles

5. Documentation:
   - Update relevant guide files
   - Add changelog entry in CHANGELOGS/
   - Document any new environment variables
```

### Git Commit Messages
```bash
# ✅ ALWAYS use descriptive commit messages
git commit -m "Add SCANS role support to percent-of-scans department"
git commit -m "Fix location update 500 error in UserCard"
git commit -m "Implement client-side CSV processing for reporting"

# ❌ NEVER use vague messages
# Bad: "Fix bug"
# Bad: "Update code"
# Bad: "Changes"
```

---

## 🔍 Key Files Reference

### Must-Read Documentation
- `guides/PROJECT_GUIDE.md` - Complete architecture overview
- `guides/CLIENT_GUIDE.md` - Frontend architecture details
- `guides/SERVER_GUIDE.md` - Backend architecture details
- `guides/COGNITO_SETUP.md` - Authentication setup
- `guides/IMPLEMENTATION_GUIDE_GROUPS.md` - Location-based access

### Critical Configuration Files
- `client/next.config.ts` - Next.js configuration
- `client/tailwind.config.ts` - Styling configuration
- `server/prisma/schema.prisma` - Database schema
- `server/ecosystem.config.js` - PM2 configuration
- `server/tsconfig.json` - TypeScript configuration

### Core Implementation Files
- `client/src/state/api.ts` - Main API endpoints
- `client/src/state/lambdaApi.ts` - Lambda/DynamoDB endpoints
- `client/src/lib/accessControl.ts` - Permission utilities
- `server/src/controllers/*.ts` - Business logic
- `server/src/routes/*.ts` - API route definitions

---

## 🎯 Special Considerations

### Location-Based Access Control
```typescript
// ✅ ALWAYS filter data by user's location access
const userData = await useGetAuthUserQuery();
const userLocations = userData?.userDetails?.locationIds || [];

const filteredData = data.filter(item =>
  userLocations.includes(item.locationId)
);

// ✅ ALWAYS sync locations for LocationAdmin users via lambda
// Location: extras/location_sync_lambda.py
```

### CSV Processing
```typescript
// ✅ ALWAYS use dual processing approach for reporting:
// 1. Client-side: For immediate results (no API Gateway timeout)
// 2. Lambda: For large datasets exceeding client capabilities

// Client-side processing
import Papa from 'papaparse';
import { parseCSV, filterData, downloadCSV } from '@/lib/csvProcessing';

// Lambda processing
import { useProcessDataMutation } from '@/state/lambdaApi';
```

### Department Pages
```typescript
// ✅ ALWAYS restrict department pages by role:
// - /departments/data → DATA or ADMIN
// - /departments/reporting → REPORTING or ADMIN
// - /departments/percent-of-scans → SCANS or REPORTING or ADMIN
// - /departments/price-portal → PRICE_ADMIN or ADMIN
// - /departments/raw-data → DATA or ADMIN
// - /departments/raw-loyalty → REPORTING or ADMIN
```

---

## 🎓 Learning & Best Practices

### When Implementing New Features
1. ✅ **ALWAYS** check if similar functionality exists in the codebase
2. ✅ **ALWAYS** read the relevant guide files first
3. ✅ **ALWAYS** follow existing patterns (don't reinvent the wheel)
4. ✅ **ALWAYS** implement role-based access control
5. ✅ **ALWAYS** add comprehensive error handling
6. ✅ **ALWAYS** include detailed logging
7. ✅ **ALWAYS** test with multiple user roles
8. ✅ **ALWAYS** update documentation

### Code Review Checklist
- [ ] TypeScript types are properly defined
- [ ] Error handling is comprehensive
- [ ] Logging includes descriptive prefixes
- [ ] Role-based access control is implemented
- [ ] Input validation is present
- [ ] Duplicate checks are performed
- [ ] HTTP status codes are appropriate
- [ ] Frontend includes loading and error states
- [ ] Dark mode is supported
- [ ] Mobile responsiveness is maintained
- [ ] Console.log statements are present for debugging
- [ ] Environment variables are used for sensitive data

---

## 🔧 Environment Variables

### Client (.env.local)
```bash
NEXT_PUBLIC_API_BASE_URL=https://puvzjk01yl.execute-api.us-east-2.amazonaws.com/prod
NEXT_PUBLIC_LAMBDA_API_URL=https://sutpql04fb.execute-api.us-east-2.amazonaws.com/prod
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-2_5rTsYPjpA
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=[your-client-id]
```

### Server (.env)
```bash
DATABASE_URL=postgresql://user:password@host:5432/database
PORT=3000
NODE_ENV=production
AWS_REGION=us-east-2
COGNITO_USER_POOL_ID=us-east-2_5rTsYPjpA
```

---

## 📞 Quick Reference

### Common Commands
```bash
# Frontend Development
cd client && npm run dev

# Backend Development
cd server && npm run dev

# Build Server (CRITICAL before deployment!)
cd server && npm run build

# Database
npx prisma migrate dev --name migration_name
npx prisma generate
npx prisma studio

# PM2
pm2 restart all
pm2 logs
pm2 status
pm2 monit
```

### API Gateway Endpoints
- **Main API**: `https://puvzjk01yl.execute-api.us-east-2.amazonaws.com/prod`
- **Lambda API**: `https://sutpql04fb.execute-api.us-east-2.amazonaws.com/prod`
- **Frontend**: `https://master.d25xr2dg5ij9ce.amplifyapp.com`

### Important AWS Resources
- **EC2 Instance**: `3.15.240.21` (port 80)
- **RDS**: PostgreSQL in private subnet
- **S3 Buckets**: `huey-site-images` (profiles), data bucket (CSV)
- **Cognito Pool**: `us-east-2_5rTsYPjpA`
- **DynamoDB Table**: `Location-u3tk7jwqujcqfedzbv7hksrt4a-NONE`

---

## 🎉 Summary

When working on the **Magooos Site** project, ALWAYS remember:

1. **Git Operations**: NEVER commit or push without explicit user permission
2. **AWS SDK**: Forbidden in frontend, required for backend Cognito operations
3. **TypeScript Build**: ALWAYS run `npm run build` before server deployment
4. **Access Control**: ALWAYS use `hasRole`/`hasAnyRole` utilities
5. **Logging**: ALWAYS include descriptive `[PREFIX]` in console.log statements
6. **Error Handling**: ALWAYS use try-catch with appropriate HTTP status codes
7. **Validation**: ALWAYS validate input and check for duplicates
8. **Dark Mode**: ALWAYS support with `dark:` Tailwind classes
9. **Responsiveness**: ALWAYS test on mobile, tablet, and desktop
10. **Role Testing**: ALWAYS test with different user roles
11. **Documentation**: ALWAYS update guides when adding features

This project emphasizes **security**, **scalability**, and **maintainability** through role-based access control, comprehensive error handling, and clear separation of concerns. Follow these guidelines to maintain code quality and consistency across the entire application.

---

**Last Updated**: January 2025
**Project**: Magooos Site (Huey-Magoos-IT)
**Tech Stack**: Next.js 14, Express/TypeScript, Prisma, PostgreSQL, AWS
