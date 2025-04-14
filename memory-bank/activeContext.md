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
- ✅ Fixed authentication issue in Group controller by adding Bearer token support

## Authentication Fix Details

We identified and fixed an authentication issue in the Group controller:

1. The frontend was sending authentication via the `Authorization` header with a Bearer token
2. The backend was only checking for `x-user-cognito-id` header or `requestingUserId` in the body
3. We added code to all group controller methods to also check for and use the Bearer token
4. The fix was successful, and the `/groups` endpoint now properly authenticates requests

## Next Steps

1. ✅ Fixed API Gateway authentication issue by adding Bearer token support in the controller
2. ⬜ Enhance the Groups page UI with a LocationTable component similar to the reporting page
3. ⬜ Create migration and update seed script with new roles (if not already done)
4. ⬜ Implement LocationUser creation for LocationAdmins
5. ⬜ Update data/reporting pages to filter by user's locations
6. ⬜ Test the implementation on the EC2 server
7. ⬜ Add documentation for the new features

## Current Focus: Enhancing Groups UI

We need to improve the location selection interface in the Groups page:
1. Replace the current dropdown with a LocationTable component (like in the reporting page)
2. Add the same "Selected Locations" display with Undo and Clear All buttons
3. Implement the same location selection workflow that users are already familiar with
4. Maintain the same styling and user experience as the reporting page

## Technical Considerations

- The LocationTable component is already available and can be reused
- We need to adapt the state management to work with the Group creation/editing flow
- The UI should maintain consistency with the reporting page for better user experience
- We should preserve all existing functionality while enhancing the interface