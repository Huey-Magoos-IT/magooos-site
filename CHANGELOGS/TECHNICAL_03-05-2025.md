# Technical Changelog - March 5, 2025

## Role-Based Access Control Implementation

### Issue Background
The original access control system used a binary approach with the `isAdmin` boolean field on the Team model. This limited flexibility as teams could only have full admin access or no special access. We needed a more granular system where teams could have access to specific department pages without necessarily having full admin privileges.

### Solution Implemented
Replaced the binary access control with a flexible, role-based system that allows teams to have multiple roles simultaneously. Each role grants access to specific parts of the application.

### Technical Details

#### Database Schema Changes
1. **Role Model:**
   - Added a new `Role` model for storing available roles
   - Each role has a name and optional description
   - Initial roles include: ADMIN, DATA, REPORTING

2. **TeamRole Model:**
   - Added a many-to-many relationship model between teams and roles
   - Allows teams to have multiple roles
   - Prevents duplicate role assignments with a unique constraint

3. **Team Model:**
   - Maintained the existing `isAdmin` boolean for backward compatibility
   - Added a relation to `TeamRole` for the new role-based system

#### Backend Changes
1. **Team Controller:**
   - Added `getRoles` endpoint to list available roles
   - Updated `createTeam` to handle multiple role assignments
   - Added endpoints for adding/removing roles from existing teams
   - Created utility function for checking if a team has a specific role

2. **Migration Strategy:**
   - Created a migration to add the new tables
   - Updated the seed script to create default roles
   - Added logic to migrate existing admin teams to have the ADMIN role

#### Frontend Changes
1. **Team Management:**
   - Updated the teams page to show assigned roles for each team
   - Replaced the admin checkbox with a multi-select role interface
   - Added UI for adding/removing roles from existing teams (admin-only)
   - Updated the create team function to support multiple roles

2. **Access Control:**
   - Created a utility library for role-based access checks
   - Updated department pages to verify specific role access
   - Added role-specific messaging in department pages
   - Display assigned roles in the user interface

### Migration Approach
The implementation maintains backward compatibility through these measures:
1. Keeping the `isAdmin` field and automatically setting it based on the ADMIN role
2. Automatically migrating existing admin teams to have the ADMIN role
3. Still respecting the `isAdmin` field in access checks for backward compatibility

### Security Considerations
- ADMIN role provides access to all areas (equivalent to old isAdmin=true)
- Specialized roles (DATA, REPORTING) only grant access to specific departments
- Access checks verify both the new role system and legacy isAdmin field
- Only users in admin teams can manage roles for other teams

### Testing
This implementation has been tested with various team configurations to ensure proper access control:
- Teams with ADMIN role have access to all areas
- Teams with DATA role have access only to the data department
- Teams with REPORTING role have access only to the reporting department
- Teams with multiple roles have access to all corresponding areas

### Production Deployment Steps

To deploy this change to production, follow these steps:

1. Connect to the EC2 instance using EC2 Instance Connect
   ```bash
   # Use EC2 Instance Connect to SSH into the production server
   # Instance IP: 3.15.240.21
   
   # Switch to root user
   sudo su -
   ```

2. Update the codebase from the repository
   ```bash
   # Navigate to the repository directory (in root home directory)
   cd magooos-site
   
   # Pull the latest changes from the master branch
   git pull origin master
   
   # Navigate to the server directory and install dependencies
   cd server
   npm install
   ```

3. Run the Prisma migration
   ```bash
   # Apply the migration to the production database
   npx prisma migrate deploy
   # Generate the Prisma client
   npx prisma generate
   ```

4. Initialize the roles and migrate existing admin teams
   ```bash
   # The seed script is already configured in package.json
   # Run the seed script to create roles and migrate admin teams
   npm run seed
   ```

5. Restart the server
   ```bash
   # Restart the PM2 processes
   pm2 restart all
   ```

6. Verify the deployment
   ```bash
   # Check the server logs for any errors
   pm2 logs
   
   # Test the new roles endpoint
   curl -v https://puvzjk01yl.execute-api.us-east-2.amazonaws.com/prod/teams/roles \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

### Deployment Issues and Fixes

During the deployment process, we encountered several issues with the seed script:

1. **Foreign Key Constraint Violations:**
   - The seed script initially failed with foreign key constraint errors when attempting to clear data
   - Error occurred because tables were being deleted in an order that violated referential integrity

2. **Unique Constraint Violations:**
   - When reseeding data, unique constraint errors occurred on existing IDs
   - This indicated that the seed script wasn't properly handling existing data

3. **Solution Implemented:**
   - Updated the seed script to respect proper deletion order (child tables before parent tables)
   - Added a `shouldClearAndReseedData` flag (set to false) to skip data clearing and focus only on role setup
   - Improved error handling and logging throughout the script
   - Used upsert operations instead of create to handle potential duplicates

4. **Final Approach:**
   - The final deployment only ran the role setup and admin team migration portions of the seed script
   - Existing data was preserved while still ensuring proper role assignments
   - This minimized disruption while successfully implementing the new role-based system

The fixed seed script was deployed successfully, and the role-based access control system is now fully functional in production.

### UI Enhancements to Teams Page

I've made several UI improvements to the Teams page:

1. **Modal-Based Team Creation:**
   - Moved team creation to a clean modal interface
   - Added a dedicated "Create New Team" button at the top of the page
   - Improved role selection interface with better spacing and organization
   - Restricted team creation to admin users only

2. **Team Management Controls:**
   - Added a settings menu with options to rename or delete teams (admin-only)
   - Implemented a dropdown interface for team management actions
   - Improved role management UI with better grid layout
   - Enhanced visual feedback for role assignment/removal
   
3. **User Permission Checks:**
   - Added `isUserAdmin` helper to streamline permission checks
   - Consistently applied permission restrictions across all team management features
   - Better visual feedback for non-admin users

These UI improvements make the role-based access system more intuitive while maintaining the security constraints.

After deploying these changes, users will be able to:
1. Create teams with specific roles through an improved modal interface
2. Assign different access levels to teams with better visual feedback
3. Access only the parts of the application their team has permission for