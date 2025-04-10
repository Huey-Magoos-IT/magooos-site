# User, Team, and Group: Complete Mapping & Implementation Comparison

---

## 1. Database Schema (Prisma)

| Entity   | Key Fields                                      | Relationships                                  |
|----------|-------------------------------------------------|------------------------------------------------|
| **User** | userId, cognitoId, username, teamId, groupId, locationIds | team (Team), group (Group), authoredTasks, assignedTasks |
| **Team** | id, teamName, isAdmin                           | user (User[]), teamRoles (TeamRole[]), projectTeams      |
| **Group**| id, name, description, locationIds              | users (User[])                                 |
| **Role/TeamRole** | name, description                      | teamRoles (TeamRole[]), teams (Team[])         |

---

## 2. Backend: Controllers & Routes

### Controllers (`server/src/controllers/`)
- **userController.ts**: updateUserLocations, createLocationUser, getUsers, getUser, postUser, updateUserTeam
- **teamController.ts**: getRoles, getTeams, createTeam, joinTeam, addRoleToTeam, removeRoleFromTeam, deleteTeam, updateTeam, hasRole
- **groupController.ts**: getGroups, createGroup, updateGroup, assignGroupToUser, getLocationUsers, deleteGroup

### Routes (`server/src/routes/`)
- **userRoutes.ts**: /team-assignment (POST)
- **teamRoutes.ts**: /roles, /api-roles, /all-roles, /remove-user-from-team, /debug-team-roles, etc.
- **groupRoutes.ts**: /remove-user-from-group, /debug-groups

---

## 3. Frontend: API Layer (`client/src/state/api.ts`)

- **Users**
  - getAuthUser, getUsers, updateUserTeam, updateUserLocations, createLocationUser
- **Teams**
  - getTeams, getRoles, createTeam, deleteTeam, updateTeam, addRoleToTeam, removeRoleFromTeam, joinTeam
- **Groups**
  - getGroups, createGroup, updateGroup, deleteGroup, assignGroupToUser

---

## 4. Frontend: Pages & Components

| Domain | Page Location                        | Main Components Used                        |
|--------|--------------------------------------|---------------------------------------------|
| Users  | client/src/app/users/page.tsx        | UserCard (client/src/components/UserCard/)  |
| Teams  | client/src/app/teams/page.tsx        | (No TeamCard, likely rendered inline/shared)|
| Groups | client/src/app/groups/page.tsx       | GroupCard (client/src/components/GroupCard/)|

---

## 5. Shared Utilities

- **Role-Based Access Control**: `client/src/lib/accessControl.ts` (hasRole, hasAnyRole, etc.)

---

## 6. Data Flow Comparison

```mermaid
flowchart TD
  subgraph Backend
    A1[Prisma Schema] --> A2[Controller]
    A2 --> A3[Route]
  end
  subgraph Frontend
    B1[API Layer (api.ts)] --> B2[Page (page.tsx)]
    B2 --> B3[Component (UserCard/GroupCard)]
    B2 --> B4[accessControl.ts]
  end
  A3 --> B1
```

---

## 7. Implementation Comparison Table

| Aspect         | Users                                   | Teams                                   | Groups                                  |
|----------------|-----------------------------------------|-----------------------------------------|-----------------------------------------|
| **Schema**     | User model, teamId, groupId, locationIds| Team model, teamRoles, user[]           | Group model, users[], locationIds       |
| **Controller** | userController.ts                       | teamController.ts                       | groupController.ts                      |
| **Routes**     | userRoutes.ts                           | teamRoutes.ts                           | groupRoutes.ts                          |
| **API**        | getUsers, updateUserTeam, etc.          | getTeams, createTeam, joinTeam, etc.    | getGroups, createGroup, assignGroupToUser, etc. |
| **Page**       | users/page.tsx                          | teams/page.tsx                          | groups/page.tsx                         |
| **Component**  | UserCard                                | (inline or shared)                      | GroupCard                               |
| **RBAC**       | accessControl.ts                        | accessControl.ts                        | accessControl.ts                        |

---

## 8. Notes

- **Teams** do not have a dedicated TeamCard component; rendering is likely handled directly in the teams page or with shared UI.
- **Groups** and **Users** have dedicated card components for UI rendering.
- All three domains use the same RBAC utility for permission checks.
- API endpoints are consistently defined in `client/src/state/api.ts` and map directly to backend routes/controllers.

---

_Last updated: 2025-04-10_