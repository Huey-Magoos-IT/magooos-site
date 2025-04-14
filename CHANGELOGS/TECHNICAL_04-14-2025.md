# Technical Changelog: April 14, 2025

## Groups Functionality Enhancement

### Overview
We've implemented several enhancements to the Groups functionality to improve usability, management capabilities, and navigation. These changes include UI improvements, new API endpoints, and better integration with the application's navigation system.

### Changes

#### 1. Enhanced GroupCard Component
- Redesigned the GroupCard component with improved styling and larger size
- Added a gradient background to the avatar for a more modern look
- Improved spacing and typography throughout the card
- Enhanced the user section with better styling and user avatars
- Added shadow effects and hover states for better visual feedback

#### 2. User Removal Functionality
- Added a new API endpoint: `/groups/remove-user`
- Implemented the `removeUserFromGroup` controller function
- Added the corresponding Redux mutation in the client
- Added a "Remove" button for each user in the expanded group view
- Implemented confirmation dialogs to prevent accidental removals
- When a user is removed from a group, their location access is automatically cleared

#### 3. Sidebar Navigation
- Added a Groups link to the sidebar for both admins and location admins
- Used the FolderKanban icon for visual clarity
- Placed it logically after the Teams link in the navigation hierarchy

#### 4. Server Build Fixes
- Updated import statements to include the new `removeUserFromGroup` function
- Fixed TypeScript errors in the client code with proper null checks
- Ensured consistent error handling across all group management functions

#### 5. Authentication Fix
- Fixed an issue where the Group controller wasn't properly handling Bearer tokens
- Added support for multiple authentication methods in a single controller:
  - Bearer token from Authorization header
  - Custom x-user-cognito-id header
  - User ID in request body
- Implemented better logging for authentication debugging
- Added detailed error messages for authentication failures
- Maintained backward compatibility with existing authentication methods
- Added special handling for admin users

### Technical Details

#### New API Endpoint
```typescript
// POST /groups/remove-user
export const removeUserFromGroup = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.body;
  
  // Authentication and validation...
  
  try {
    // Update user to remove group and location access
    const updatedUser = await prisma.user.update({
      where: { userId: parseInt(userId) },
      data: {
        groupId: null,
        locationIds: []
      }
    });
    
    res.status(200).json({ message: "User removed from group successfully" });
  } catch (error: any) {
    // Error handling...
  }
};
```

#### Authentication Enhancement
```typescript
// Extract Bearer token from Authorization header
const authHeader = req.headers.authorization;
if (authHeader && authHeader.startsWith('Bearer ')) {
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  // Verify token and extract user information
  // ...
  console.log("[Authentication] Using Bearer token");
} else if (req.headers['x-user-cognito-id']) {
  // Check for custom Cognito ID header
  const cognitoId = req.headers['x-user-cognito-id'];
  // Look up user by Cognito ID
  // ...
  console.log("[Authentication] Using x-user-cognito-id header");
} else if (req.body.requestingUserId) {
  // Check for user ID in request body
  const { requestingUserId } = req.body;
  // Look up user by ID
  // ...
  console.log("[Authentication] Using requestingUserId from body");
} else {
  // No authentication method found
  console.error("[Authentication] No valid authentication method found");
  return res.status(401).json({ message: "Unauthorized: No valid authentication method" });
}
```

#### Client-Side Integration
```typescript
// Added to api.ts
removeUserFromGroup: build.mutation<void, { userId: number }>({
  query: ({ userId }) => ({
    url: "groups/remove-user",
    method: "POST",
    body: { userId }
  }),
  invalidatesTags: ["Groups", "Users"]
}),
```

#### User Interface Changes
- Enhanced GroupCard component with improved styling and user management
- Added user removal functionality with confirmation dialogs
- Added Groups link to the sidebar for better navigation

### Access Control Impact
- When users are assigned to a group, they automatically get access to all locations in that group
- When users are removed from a group, they lose access to all associated locations
- In the reporting and data pages, users will only see information for locations they have access to
- Admins can easily manage location access by assigning users to appropriate groups

### Testing Notes
- Verified that user removal correctly clears location access
- Confirmed that the sidebar link appears for both admins and location admins
- Tested the enhanced GroupCard component for proper styling and functionality
- Verified that the server builds successfully with the updated imports
- Confirmed that all authentication methods work correctly
- Tested error handling for invalid authentication attempts

### Future Considerations
- Consider adding bulk user management for groups
- Explore adding location-specific permissions within groups
- Implement audit logging for group membership changes
- Add more comprehensive authentication logging for debugging

## Reporting Page S3 Bucket Migration

### Overview
We've migrated the Reporting page from using a standalone S3 bucket to using a folder within our centralized data lake bucket. This change aligns the Reporting page with the Data page, which already uses this approach, and consolidates our data storage.

### Changes

#### 1. Updated S3 Bucket References
- Replaced the old standalone bucket reference with the new data lake bucket:
  ```javascript
  // Old
  const S3_DATA_BUCKET = process.env.NEXT_PUBLIC_S3_REPORTING_BUCKET_URL || "https://redflag-reporting.s3.us-east-2.amazonaws.com";
  
  // New
  const S3_DATA_LAKE = process.env.NEXT_PUBLIC_DATA_LAKE_S3_URL || "https://data-lake-magooos-site.s3.us-east-2.amazonaws.com";
  const REPORTING_DATA_FOLDER = process.env.NEXT_PUBLIC_REPORTING_DATA_FOLDER || "reporting-data-pool/";
  ```

#### 2. Updated File Fetching Logic
- Modified the file fetching to use the folder path:
  ```javascript
  // Old
  const fileList = await fetchS3Files(S3_DATA_BUCKET);
  
  // New
  console.log("REPORTING PAGE - Fetching files from:", S3_DATA_LAKE, REPORTING_DATA_FOLDER);
  const fileList = await fetchS3Files(S3_DATA_LAKE, REPORTING_DATA_FOLDER);
  console.log("REPORTING PAGE - Files found:", fileList);
  ```

#### 3. Updated File URL Construction
- Updated the file URL construction to include the folder path:
  ```javascript
  // Old
  const fileUrls = matchingFiles.map(filename => `${S3_DATA_BUCKET}/${filename}`);
  
  // New
  const fileUrls = matchingFiles.map(filename => `${S3_DATA_LAKE}/${REPORTING_DATA_FOLDER}${filename}`);
  ```

### Technical Details
- The reporting page now uses the same data lake bucket as the data page but with a different folder ("reporting-data-pool/" instead of "loyalty-data-pool/")
- Environment variables can still be used to override the default bucket URL and folder path
- Added additional logging to help with debugging during the transition

### Testing Notes
- Verified that the reporting page correctly fetches files from the new data lake folder
- Confirmed that file filtering by date and type still works correctly
- Tested that CSV processing and display functions as expected with the new file paths

### Future Considerations
- Consider migrating other standalone S3 buckets to the centralized data lake
- Implement a more robust folder structure within the data lake for different data types
- Add monitoring for S3 access patterns to optimize data retrieval