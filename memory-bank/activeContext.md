# Active Context

## Current Task: Implementing Groups Functionality

We are implementing a new Groups functionality for Magoo's Site that will allow for location-based access control. This feature will enable:

1. Admins to create groups of locations
2. Admins to assign LocationAdmin users to manage these groups
3. LocationAdmins to create LocationUsers with access to specific locations within their group
4. Location-based filtering of data in reporting and data pages

## Implementation Approach

We've chosen a balanced approach that:
- Uses array fields for storing location IDs in both Group and User models
- Maintains proper relationships between entities
- Reuses existing components like LocationTable
- Enforces proper permission boundaries

## Key Components

1. **Database Schema**:
   - New Group model with locationIds array
   - Updated User model with groupId and locationIds fields
   - New roles: LOCATION_ADMIN and LOCATION_USER

2. **Backend**:
   - Group controller for CRUD operations
   - User controller extensions for location management
   - Permission checks and validation

3. **Frontend**:
   - Groups management page
   - Location selection interface
   - User creation flow for LocationAdmins

## Current Status

- ✅ Updated Prisma schema with Group model and User model changes
- ✅ Implemented Group controller and routes (now architecturally identical to Teams)
- ✅ Updated User controller with location management functions
- ✅ Created GroupCard component for UI
- ✅ Created Groups management page
- ✅ Updated API slice with new endpoints
- ✅ Added access control utilities for location-based permissions
- ⬜ GET /groups returns 401 Unauthorized due to API Gateway authorizer, not backend code

## Next Steps

1. ⬜ Check API Gateway: Is authorizer attached to /groups GET but not /teams or /users?
2. ⬜ Check proxy+ mapping: Is /groups included?
3. ⬜ Check frontend: Is Authorization header sent for /groups?
4. ⬜ Make /groups GET public in API Gateway if needed.
5. ⬜ Create migration and update seed script with new roles (if not already done)
6. ⬜ Implement LocationUser creation for LocationAdmins
7. ⬜ Update data/reporting pages to filter by user's locations
8. ⬜ Test the implementation on the EC2 server
9. ⬜ Add documentation for the new features

## Open Questions

- Why is API Gateway configured differently for /groups than for /teams or /users?
- Is there a reason to require JWT for /groups GET?
- How will the Cognito integration work for creating new LocationUsers?
- Should we implement server-side filtering for location-based data access?
- Do we need to add any additional indexes for performance optimization?