# Location-Based Access Control Implementation

This document provides instructions for implementing the location-based access control system on the EC2 server.

## Overview

The location-based access control system allows:
- Admins to create groups of locations
- Admins to assign LocationAdmin users to manage these groups
- LocationAdmins to create LocationUsers with access to specific locations within their group
- Location-based filtering of data in reporting and data pages

## Implementation Steps

### 1. Prepare Environment and Run Migration Script

Before running the migration script, ensure you are in the **server** directory:

```bash
cd /root/magooos-site/server
```

Then install dependencies (if not done yet):

```bash
npm install
```

The migration script will apply the schema changes and create the necessary roles. It will also install dependencies automatically if missing.

```bash
# Make the script executable
chmod +x migrate-and-seed-location-roles.sh

# Run the script from inside the server directory
./migrate-and-seed-location-roles.sh
```

This script will:
- Run Prisma migrations to apply schema changes
- Generate the Prisma client
- Run the seed script to create the LOCATION_ADMIN and LOCATION_USER roles

### 2. Verify Roles

Verify that the roles were created correctly:

```bash
npm run verify-roles
```

This will check:
- If the LOCATION_ADMIN and LOCATION_USER roles exist
- How many teams have these roles assigned
- How many users have location IDs assigned
- How many groups exist

### 3. Create Location Teams

Create teams with the LOCATION_ADMIN and LOCATION_USER roles:

```bash
npm run create-location-team
```

This will:
- Create a team with the LOCATION_USER role
- Create a team with the LOCATION_ADMIN role
- Display the team IDs for reference

### 4. Assign Users to Teams

Use the existing user interface to:
1. Assign users to the LOCATION_ADMIN team
2. Create groups of locations
3. Assign LocationAdmin users to groups
4. Create LocationUser users with access to specific locations

## Schema Changes

The following schema changes have been made:

1. Added Group model:
```prisma
model Group {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  locationIds String[]  // Array of location IDs
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  users       User[]    // LocationAdmin users assigned to this group
}
```

2. Updated User model:
```prisma
model User {
  // Existing fields...
  groupId      Int?       // For LocationAdmin users
  group        Group?     @relation(fields: [groupId], references: [id])
  locationIds  String[]   // Array of location IDs the user has access to
}
```

3. Added new roles:
```
LOCATION_ADMIN: Can manage users within their assigned group
LOCATION_USER: Has access to data for their assigned locations
```

## Troubleshooting

If you encounter issues:

1. Check the Prisma migration status:
```bash
npx prisma migrate status
```

2. Verify the database schema:
```bash
npx prisma db pull
```

3. Regenerate the Prisma client:
```bash
npx prisma generate
```

4. Check the logs for any errors:
```bash
pm2 logs