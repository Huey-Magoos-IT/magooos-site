# Active Context - Users Page Redesign

## Current Focus: Users Page Enhancement

We're working on enhancing the Users page with the following priorities:

1. **Dual View Options (Grid/List)**
   - Implement a toggle between grid and card-based views
   - Grid view: Enhanced version of the current DataGrid
   - List view: Card-based layout with more detailed user information
   - Responsive design for all screen sizes

2. **Role Visualization**
   - Display user roles and permissions directly in the UI
   - Use color-coded badges to indicate different role types
   - Add tooltips with detailed role descriptions
   - Allow direct role management for admin users

3. **Team Selection Improvements**
   - Fix the team dropdown cutoff issue
   - Enhance the team selection interface
   - Show team roles directly in the user interface

4. **Layout Restructuring**
   - Better utilize available screen space
   - Create a more comprehensive layout
   - Improve mobile responsiveness

## Current Issues with Users Page

Based on the screenshot and code review:

1. The team selection dropdown is being cut off in the UI
2. The page doesn't display user roles or permissions
3. Limited search and filtering capabilities
4. Inefficient use of screen space
5. Lack of detailed user information

## Implementation Plan

### Phase 1: Core Layout and Dual View Implementation

1. **Create View Toggle Component**
   - Add toggle buttons for Grid/List views
   - Implement state management for view preference
   - Store preference in local storage for persistence

2. **Enhance Grid View**
   - Fix team dropdown cutoff issue
   - Add role information column
   - Implement role badges component
   - Optimize for mobile screens

3. **Implement List View**
   - Create UserCard component
   - Design card layout with user details
   - Include role badges and team information
   - Add expandable sections for more details

### Phase 2: Role Visualization

1. **Role Badge Component**
   - Create reusable role badge component
   - Implement color coding for different roles
   - Add tooltips with role descriptions
   - Handle multiple roles per user

2. **Team Role Integration**
   - Extend API queries to include role information
   - Map team roles to user display
   - Show inherited roles from team membership
   - Implement role filtering

3. **Admin Role Management**
   - Add role management UI for admin users
   - Implement direct role assignment
   - Create role modification interface
   - Add confirmation dialogs for role changes

### Phase 3: Team Selection Enhancement

1. **Fix Dropdown Cutoff**
   - Redesign team selection dropdown
   - Ensure proper sizing and positioning
   - Add scrolling for long team lists
   - Implement search within dropdown

2. **Team Selection Modal**
   - Create modal-based team selector for complex scenarios
   - Add team filtering and search
   - Show team details and roles
   - Implement batch assignment for multiple users

### Phase 4: Advanced Features

1. **Enhanced Search & Filtering**
   - Implement dedicated search component
   - Add filtering by role, team, and status
   - Create filter chip UI for active filters
   - Add saved search functionality

2. **User Details Expansion**
   - Add expandable details panel
   - Show assigned projects and tasks
   - Display activity history
   - Include direct role assignments

## Technical Implementation Details

### Component Structure

```
UsersPage
├── UsersHeader
│   ├── Title
│   └── ViewToggle
├── UsersFilters (future enhancement)
│   ├── SearchBar
│   └── FilterChips
├── GridView
│   ├── EnhancedDataGrid
│   ├── TeamSelector
│   └── RoleBadges
└── ListView
    ├── UserCardList
    └── UserCard
        ├── UserInfo
        ├── TeamInfo
        ├── RoleBadges
        └── UserActions
```

### Data Requirements

We need to extend the current API queries to include:
- User roles information
- Team roles relationship
- Role descriptions for tooltips

### UI Components Needed

1. **ViewToggle**: Toggle between grid and list views
2. **RoleBadge**: Display role with appropriate color and tooltip
3. **UserCard**: Card-based layout for list view
4. **TeamSelector**: Enhanced team selection dropdown/modal
5. **ExpandableDetails**: Collapsible section for additional user info

## Current Status

- ✅ Analyzed current Users page implementation
- ✅ Identified key issues and improvement areas
- ✅ Created comprehensive enhancement plan
- ✅ Prioritized dual view options and role visualization
- ⬜ Implement view toggle component
- ⬜ Enhance grid view with role information
- ⬜ Create list view with user cards
- ⬜ Implement role badge component
- ⬜ Fix team dropdown cutoff issue
- ⬜ Extend API queries for role information
- ⬜ Implement responsive design for all screen sizes

## Next Steps

1. Create the ViewToggle component
2. Enhance the current DataGrid with role information
3. Implement the RoleBadge component
4. Create the UserCard component for list view
5. Fix the team dropdown cutoff issue
6. Extend API queries to include role information
7. Implement responsive design for all screen sizes