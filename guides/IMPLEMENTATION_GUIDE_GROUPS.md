# Groups Functionality Implementation Guide

## Overview

This document provides a guide for implementing the Groups functionality in the Magoo's Site application. The feature allows for location-based access control, where users can be assigned specific locations they can access.

## 1. Database Schema Changes

### 1.1 Update Prisma Schema

```prisma
// Add to existing schema.prisma
model Group {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  locationIds String[]  // Array of location IDs
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // Relationships
  users       User[]    // LocationAdmin users assigned to this group
}

// Update User model
model User {
  // Existing fields...
  groupId      Int?       // For LocationAdmin users
  group        Group?     @relation(fields: [groupId], references: [id])
  locationIds  String[]   // Array of location IDs the user has access to
}
```

### 1.2 Create Migration

```bash
npx prisma migrate dev --name add_groups_functionality
```

### 1.3 Update Seed Script

```typescript
// Add to existing seed script
const newRoles = [
  { name: 'LOCATION_ADMIN', description: 'Can manage users within assigned group' },
  { name: 'LOCATION_USER', description: 'Has access to data for assigned locations' }
];

for (const role of newRoles) {
  await prisma.role.upsert({
    where: { name: role.name },
    update: { description: role.description },
    create: {
      name: role.name,
      description: role.description
    }
  });
}
```

## 2. Backend Implementation

### 2.1 Group Controller

Create a new file `server/src/controllers/groupController.ts` with these key functions:

- `getGroups()`: Get all groups (admin) or assigned group (locationAdmin)
- `createGroup()`: Create a new group with name, description, and locations
- `updateGroup()`: Update group details and locations
- `assignGroupToUser()`: Assign a group to a LocationAdmin user

### 2.2 User Controller Extensions

Add to `server/src/controllers/userController.ts`:

- `updateUserLocations()`: Update a user's location access
- `createLocationUser()`: Create a new user with LocationUser role and locations

### 2.3 Routes Setup

Create `server/src/routes/groupRoutes.ts`:

```typescript
import express from 'express';
import * as groupController from '../controllers/groupController';

const router = express.Router();

// Group management
router.get('/', groupController.getGroups);
router.post('/', groupController.createGroup);
router.put('/:id', groupController.updateGroup);
router.post('/assign', groupController.assignGroupToUser);

export default router;
```

Add to `server/src/routes/userRoutes.ts`:

```typescript
router.patch('/:id/locations', userController.updateUserLocations);
router.post('/location-user', userController.createLocationUser);
```

Register in `server/src/index.ts`:

```typescript
import groupRoutes from './routes/groupRoutes';
app.use('/groups', groupRoutes);
```

## 3. Frontend Implementation

### 3.1 API Slice Updates

Add to `client/src/state/api.ts`:

```typescript
// Add to existing API definitions
export interface Group {
  id: number;
  name: string;
  description?: string;
  locationIds: string[];
  createdAt: string;
  updatedAt: string;
}

// Add to endpoints
getGroups: build.query<Group[], void>({
  query: () => "groups",
  providesTags: ["Groups"]
}),

createGroup: build.mutation<Group, { name: string; description?: string; locationIds?: string[] }>({
  query: (body) => ({
    url: "groups",
    method: "POST",
    body
  }),
  invalidatesTags: ["Groups"]
}),

updateGroup: build.mutation<Group, { id: number; name?: string; description?: string; locationIds?: string[] }>({
  query: ({ id, ...data }) => ({
    url: `groups/${id}`,
    method: "PUT",
    body: data
  }),
  invalidatesTags: ["Groups"]
}),

assignGroupToUser: build.mutation<void, { userId: number; groupId: number }>({
  query: (body) => ({
    url: "groups/assign",
    method: "POST",
    body
  }),
  invalidatesTags: ["Groups", "Users"]
}),

updateUserLocations: build.mutation<void, { userId: number; locationIds: string[] }>({
  query: ({ userId, locationIds }) => ({
    url: `users/${userId}/locations`,
    method: "PATCH",
    body: { locationIds }
  }),
  invalidatesTags: ["Users"]
}),

createLocationUser: build.mutation<User, { username: string; locationIds: string[]; teamId: number }>({
  query: (body) => ({
    url: "users/location-user",
    method: "POST",
    body
  }),
  invalidatesTags: ["Users"]
})
```

### 3.2 Access Control Utilities

Add to `client/src/lib/accessControl.ts`:

```typescript
export const hasLocationAccess = (userLocations: string[] | undefined, locationId: string): boolean => {
  if (!userLocations || userLocations.length === 0) return false;
  return userLocations.includes(locationId);
};

export const hasGroupAccess = (userGroupId: number | null | undefined, groupId: number): boolean => {
  if (!userGroupId) return false;
  return userGroupId === groupId;
};

export const isLocationAdmin = (teamRoles: TeamRole[] | undefined): boolean => {
  if (!teamRoles || teamRoles.length === 0) return false;
  return teamRoles.some(tr => tr.role.name === 'LOCATION_ADMIN' || tr.role.name === 'ADMIN');
};

export const isLocationUser = (teamRoles: TeamRole[] | undefined): boolean => {
  if (!teamRoles || teamRoles.length === 0) return false;
  return teamRoles.some(tr => tr.role.name === 'LOCATION_USER');
};
```

### 3.3 Groups Page

Create a new file `client/src/app/groups/page.tsx` with:

- Admin view: List of all groups with creation and editing capabilities using `GroupCard/index.tsx`
- LocationAdmin view: Only shows their assigned group
- Group creation/editing dialog with location selection
- Group assignment dialog for assigning groups to LocationAdmin users, including `ModalCreateLocationUser/index.tsx` for location user creation

### 3.4 Update Sidebar

Add to `client/src/components/Sidebar/index.tsx`:

```tsx
{(isAdmin || isLocationAdmin) && (
  <li>
    <Link 
      href="/groups" 
      className={`flex items-center p-2 rounded hover:bg-blue-50 dark:hover:bg-slate-800 group ${
        pathname === '/groups' ? 'bg-blue-100 dark:bg-slate-800' : ''
      }`}
    >
      <Users className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500" />
      <span className="ml-3">Groups</span>
    </Link>
  </li>
)}
```

## 4. Data Access Integration

### 4.1 Location-Based Filtering

Add to data/reporting pages:

```typescript
// Client-side filtering example
const filteredData = useMemo(() => {
  if (!data || !userData?.userDetails?.locationIds) return [];
  
  // Get user's accessible locations
  const userLocations = userData.userDetails.locationIds;
  
  // Filter data to only include user's locations
  return data.filter(item => 
    userLocations.includes(item.locationId)
  );
}, [data, userData]);
```

### 4.2 User Profile Updates

Add to UserCard component:

```tsx
{user.locationIds && user.locationIds.length > 0 && (
  <div className="mt-2">
    <Typography variant="subtitle2" className="font-semibold">
      Assigned Locations:
    </Typography>
    <div className="flex flex-wrap gap-1 mt-1">
      {user.locationIds.slice(0, 3).map(locationId => (
        <Chip 
          key={locationId} 
          size="small"
          label={locationsMap[locationId]?.name || locationId}
          className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
        />
      ))}
      {user.locationIds.length > 3 && (
        <Chip 
          size="small"
          label={`+${user.locationIds.length - 3} more`}
          className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        />
      )}
    </div>
  </div>
)}
```

## 5. Implementation Phases

### Phase 1: Database Setup
1. Update Prisma schema with Group model and User model changes
2. Create migration and update seed script with new roles
3. Run migration and seed

### Phase 2: Backend Implementation
1. Create Group controller with CRUD operations
2. Update User controller with location management functions
3. Add new API routes for group management
4. Implement permission checks and validation

### Phase 3: Frontend Implementation
1. Create Groups management page
2. Integrate LocationTable component for location selection
3. Add group assignment to user management
4. Implement LocationUser creation for LocationAdmins

### Phase 4: Data Access Integration
1. Update data/reporting pages to filter by user's locations
2. Add location access indicators to user profiles
3. Implement automatic location synchronization for LocationAdmins

## 6. Testing Strategy

### 6.1 Unit Tests
- Test Group controller functions
- Test User controller extensions
- Test access control utilities

### 6.2 Integration Tests
- Test API endpoints for group management
- Test location-based data filtering
- Test permission boundaries

### 6.3 End-to-End Tests
- Test group creation and management
- Test LocationAdmin user management
- Test LocationUser data access

## 7. Deployment

### 7.1 Database Migration
```bash
npx prisma migrate deploy
```

### 7.2 Backend Deployment
```bash
git pull origin master
npm run build
pm2 restart all
```

### 7.3 Frontend Deployment
Deploy via Amplify CI/CD pipeline.

The implementation includes `location_sync_lambda.py` for automatic synchronization of locations to group members.
