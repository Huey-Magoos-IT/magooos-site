# Technical Changelog: April 22, 2025

## Overview
This update focused on implementing several UI/UX improvements based on user feedback, fixing a critical bug in user location management, and ensuring consistent data presentation.

## Changes Made

### 1. Sidebar Navigation Updates
- **Hidden Links**: Removed the "Home", "Settings", and "Search" links from the main sidebar navigation (`client/src/components/Sidebar/index.tsx`) as they are not currently primary features.
- **Users Link Visibility**: Restricted the visibility of the "Users" link to users with "ADMIN" or "LOCATION_ADMIN" roles.

### 2. Users Page Enhancements & Access Control
- **Role-Based Access**: Implemented logic in `client/src/app/users/page.tsx` to redirect users without "ADMIN" or "LOCATION_ADMIN" roles to the `/teams` page.
- **Location Admin Filtering**: Added filtering logic so that users with the "LOCATION_ADMIN" role only see users belonging to their assigned group. Admins continue to see all users.

### 3. Teams Page Filtering
- **Membership-Based View**: Modified `client/src/app/teams/page.tsx` to display only the teams that the currently logged-in user is a member of.
- **Admin Exception**: Ensured that users with the "ADMIN" role or the specific username "admin" can still view all teams.

### 4. Default Route Change
- **Redirect Update**: Modified the root page (`client/src/app/page.tsx`) to redirect users to `/teams` instead of `/home` upon login or initial access.
- **Unauthorized Redirects**: Updated redirects for unauthorized access attempts (e.g., accessing the Users page without permission) to point to `/teams`.

### 5. User Location Management Fix & Enhancement
- **Problem**: Updating user locations via the `UserCard` resulted in a 500 Internal Server Error due to a server-side authentication failure. The server controller (`server/src/controllers/userController.ts`) was not correctly identifying the *requesting* user.
- **Client-Side Fixes**:
    - Implemented a modal dialog in `client/src/components/UserCard/index.tsx` using `LocationTable` for a user-friendly location selection experience, replacing the previous read-only display.
    - Updated the `updateUserLocations` mutation definition in `client/src/state/api.ts` to accept `requestingUserId`.
    - Modified the `handleSaveLocations` function in `UserCard` to fetch the authenticated user's ID (`authData.userDetails.userId`) and include it as `requestingUserId` in the mutation call body.
- **Server-Side Fix**:
    - Refactored the `updateUserLocations` function in `server/src/controllers/userController.ts` to use the robust authentication logic present in other controllers (checking `requestingUserId` from body, Cognito ID from headers, and Bearer token). This ensures the server correctly identifies the authenticated user making the request.
- **Result**: Location updates via the UserCard modal now work correctly without 500 errors.

### 6. User List Sorting
- **Problem**: The user list displayed on the Users page appeared in an inconsistent order after updates.
- **Fix**: Added an `orderBy: { username: 'asc' }` clause to the `prisma.user.findMany` call within the `getUsers` function in `server/src/controllers/userController.ts`.
- **Result**: Users are now consistently sorted alphabetically by username when fetched from the backend.

## Files Modified
- `client/src/components/Sidebar/index.tsx`
- `client/src/app/users/page.tsx`
- `client/src/app/teams/page.tsx`
- `client/src/app/page.tsx`
- `client/src/components/UserCard/index.tsx`
- `client/src/state/api.ts`
- `server/src/controllers/userController.ts`

## Benefits
- Streamlined sidebar navigation.
- Correct role-based access control enforced for the Users page.
- More relevant Teams page view for non-admin users.
- Consistent default landing page (`/teams`).
- Functional and user-friendly location management via the UserCard modal.
- Resolved critical 500 error related to location updates.
- Consistent and predictable user list sorting.
### 7. Authentication Refresh Fix
- **Problem**: Stale user data (permissions, details) persisted in the client-side UI after logging out and logging back in as a different user. This required a manual page refresh to see the correct information.
- **Root Cause**: The RTK Query cache, managed via `client/src/state/api.ts`, was not being automatically cleared when the user's authentication state changed via Amplify's `Authenticator` component.
- **Fix**:
    - Modified `client/src/app/authProvider.tsx` to utilize Amplify's `Hub` utility.
    - Added a `useEffect` hook to listen for `auth` channel events.
    - When `signedIn` or `signedOut` events are detected, the listener now dispatches `api.util.resetApiState()` using `useDispatch` from `react-redux`.
- **Result**: The entire RTK Query cache is now cleared upon user sign-in and sign-out, forcing the application to refetch all necessary data (including user details and permissions) for the new session, thus resolving the stale data issue.
- **Files Modified**:
    - `client/src/app/authProvider.tsx`
- **Benefits**:
    - Ensures UI consistency by displaying fresh data after authentication changes.
    - Improves user experience by eliminating the need for manual refreshes after login/logout.