# Groups Functionality Implementation Plan

## Overview

This document outlines the implementation plan for adding Groups functionality to Magoo's Site. The feature will allow for location-based access control, where users can be assigned specific locations they can access.

## Database Schema Changes

```prisma
// Add to schema.prisma
model Group {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  locationIds String[]  // Array of location IDs
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
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

## New Roles

- `LOCATION_ADMIN`: Can manage users within their assigned group
- `LOCATION_USER`: Has access to data for their assigned locations

## Backend Implementation

1. **Group Controller**:
   - `getGroups()`: Get all groups (admin) or assigned group (locationAdmin)
   - `createGroup()`: Create a new group with name, description, and locations
   - `updateGroup()`: Update group details and locations
   - `assignGroupToUser()`: Assign a group to a LocationAdmin user

2. **User Controller Extensions**:
   - `updateUserLocations()`: Update a user's location access
   - `createLocationUser()`: Create a new user with LocationUser role and locations

3. **Key Features**:
   - Automatic location synchronization for LocationAdmins
   - Permission boundaries for location assignment
   - Location-based data filtering

## Frontend Implementation

1. **Groups Page**:
   - Admin view: List of all groups with creation and editing capabilities
   - LocationAdmin view: Only shows their assigned group
   - Reuse existing LocationTable component for location selection

2. **User Management Extensions**:
   - Add location access management to user profiles
   - Show assigned locations in user details
   - LocationAdmin interface for creating LocationUsers

## User Workflows

### Admin Workflow

1. Admin creates a new group
2. Admin selects locations from the LocationTable component
3. Admin assigns the group to a LocationAdmin user
4. The LocationAdmin automatically gets access to all locations in the group

### LocationAdmin Workflow

1. LocationAdmin sees their assigned group on the Groups page
2. LocationAdmin creates new LocationUsers
3. LocationAdmin selects locations from their group to assign to users
4. New users get access only to the selected locations

### LocationUser Experience

1. LocationUser logs in and accesses data/reporting pages
2. They only see data for their assigned locations
3. They cannot access the Groups management page

## Implementation Phases

1. **Database Setup**:
   - Update Prisma schema
   - Create migration
   - Update seed script with new roles

2. **Backend Implementation**:
   - Create GroupController
   - Update UserController
   - Add new API routes

3. **Frontend Implementation**:
   - Create Groups management page
   - Integrate LocationTable component
   - Add group assignment to user management

4. **Data Access Integration**:
   - Update data/reporting pages to filter by user's locations
   - Add location access indicators to user profiles

## Technical Considerations

1. **Array Field Performance**:
   - Add GIN indexes for locationIds fields
   - Array operations are well-supported in Prisma

2. **Synchronization Logic**:
   - When a group's locations change, update all associated LocationAdmins
   - When a LocationAdmin is assigned a group, give them access to all group locations

3. **Permission Boundaries**:
   - LocationAdmins can only assign locations from their group
   - LocationUsers cannot access the Groups management page
   - Regular users cannot see location-restricted data

## Summary

This implementation provides a balanced approach to the groups functionality:
- Uses array fields for simplicity while maintaining proper structure
- Reuses the existing LocationTable component
- Automatically synchronizes location access for LocationAdmins
- Enforces proper permission boundaries
- Allows for future extensibility
