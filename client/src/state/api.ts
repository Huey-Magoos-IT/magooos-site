import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";

export interface Project {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export enum Priority {
  Urgent = "Urgent",
  High = "High",
  Medium = "Medium",
  Low = "Low",
  Backlog = "Backlog",
}

export enum Status {
  ToDo = "To Do",
  WorkInProgress = "Work In Progress",
  UnderReview = "Under Review",
  Completed = "Completed",
}

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface TeamRole {
  id: number;
  teamId: number;
  roleId: number;
  role: Role;
}

export interface Team {
  id: number;
  teamName: string;
  isAdmin: boolean;
  productOwnerUserId?: number;
  projectManagerUserId?: number;
  teamRoles?: TeamRole[];
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  locationIds: string[];
  createdAt: Date;
  updatedAt: Date;
  users?: User[];
}

export interface User {
  userId?: number;
  username: string;
  email?: string;
  profilePictureUrl?: string;
  cognitoId?: string;
  teamId?: number;
  groupId?: number;
  locationIds?: string[];
  team?: Team;
  group?: Group;
  isDisabled?: boolean;
  isLocked?: boolean;
}

export interface CognitoUser {
  Username?: string;
  UserStatus?: string;
  Email?: string;
  EmailVerified?: boolean;
  CreatedDate?: string;
  LastModifiedDate?: string;
  Enabled?: boolean;
  GroupId?: string;
  TeamId?: string;
  LocationIds?: string;
}

export interface ListCognitoUsersResponse {
  users: CognitoUser[];
  paginationToken?: string;
}

export interface Attachment {
  id: number;
  fileURL: string;
  fileName: string;
  taskId: number;
  uploadedById: number;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  tags?: string;
  startDate?: string;
  dueDate?: string;
  points?: number;
  projectId: number;
  authorUserId?: number;
  assignedUserId?: number;

  author?: User;
  assignee?: User;
  comments?: Comment[];
  attachments?: Attachment[];
}

export interface SearchResults {
  tasks?: Task[];
  projects?: Project[];
  users?: User[];
}

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: async (headers) => {
      const session = await fetchAuthSession();
      const { accessToken } = session.tokens ?? {};
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
      return headers;
    },
  }),
  reducerPath: "api",
  tagTypes: ["Projects", "Tasks", "Users", "Teams", "Roles", "Groups", "CognitoUsers"],
  endpoints: (build) => ({
    getAuthUser: build.query({
      queryFn: async (_, _queryApi, _extraoptions, fetchWithBQ) => {
        try {
          const user = await getCurrentUser();
          const session = await fetchAuthSession();
          if (!session) throw new Error("No session found");
          const { userSub } = session;
          const { accessToken } = session.tokens ?? {};

          const userDetailsResponse = await fetchWithBQ(`users/${userSub}`);
          const userDetails = userDetailsResponse.data as User;

          return { data: { user, userSub, userDetails } };
        } catch (error: any) {
          return { error: error.message || "Could not fetch user data" };
        }
      },
      providesTags: ["Users"],
    }),
    getProjects: build.query<Project[], void>({
      query: () => "projects",
      providesTags: ["Projects"],
    }),
    createProject: build.mutation<Project, Partial<Project>>({
      query: (project) => ({
        url: "projects",
        method: "POST",
        body: project,
      }),
      invalidatesTags: ["Projects"],
    }),
    getTasks: build.query<Task[], { projectId: number }>({
      query: ({ projectId }) => `tasks?projectId=${projectId}`,
      providesTags: (result) =>
        result
          ? result.map(({ id }) => ({ type: "Tasks" as const, id }))
          : [{ type: "Tasks" as const }],
    }),
    getTasksByUser: build.query<Task[], number>({
      query: (userId) => `tasks/user/${userId}`,
      providesTags: (result, error, userId) =>
        result
          ? result.map(({ id }) => ({ type: "Tasks", id }))
          : [{ type: "Tasks", id: userId }],
    }),
    createTask: build.mutation<Task, Partial<Task>>({
      query: (task) => ({
        url: "tasks",
        method: "POST",
        body: task,
      }),
      invalidatesTags: ["Tasks"],
    }),
    updateTaskStatus: build.mutation<Task, { taskId: number; status: string }>({
      query: ({ taskId, status }) => ({
        url: `tasks/${taskId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { taskId }) => [
        { type: "Tasks", id: taskId },
      ],
    }),
    getUsers: build.query<User[], void>({
      query: () => "users",
      providesTags: ["Users"],
    }),
    getTeams: build.query<{teams: Team[], availableRoles: Role[]}, void>({
      query: () => "teams", // This now returns both teams and roles
      providesTags: ["Teams", "Roles"],
    }),
    // Keep the original roles endpoint but add a selector to extract roles from teams response
    getRoles: build.query<Role[], void>({
      // Use the teams endpoint which now includes availableRoles
      queryFn: (_, { dispatch, getState }) => {
        // Try to get roles from the teams query cache first
        const teamsResult = (getState() as any).api.queries['getTeams(undefined)']?.data;
        
        if (teamsResult?.availableRoles) {
          // If we already have the data, return it immediately
          return { data: teamsResult.availableRoles };
        } else {
          // Otherwise, force a refresh of the teams data
          dispatch(api.endpoints.getTeams.initiate(undefined, {
            subscribe: false,
            forceRefetch: true
          }));
          
          // Return empty array with pending status
          return { data: [] };
        }
      },
      providesTags: ["Roles"],
    }),
    createTeam: build.mutation<Team, { teamName: string; roleIds: number[] }>({
      query: (team) => ({
        url: "teams",
        method: "POST",
        body: team,
      }),
      invalidatesTags: ["Teams"],
    }),
    deleteTeam: build.mutation<{ message: string }, number>({
      query: (teamId) => ({
        url: `teams/delete-team`,
        method: "POST",  // Using POST instead of DELETE for API Gateway compatibility
        body: { teamId }
      }),
      invalidatesTags: ["Teams"],
    }),
    updateTeam: build.mutation<Team, { teamId: number; teamName: string }>({
      query: ({ teamId, teamName }) => ({
        url: `teams/${teamId}`,
        method: "PATCH",
        body: { teamName },
      }),
      invalidatesTags: ["Teams"],
    }),
    addRoleToTeam: build.mutation<void, { teamId: number; roleId: number }>({
      query: ({ teamId, roleId }) => ({
        url: `teams/${teamId}/roles`,
        method: "POST",
        body: { roleId },
      }),
      invalidatesTags: ["Teams"],
    }),
    removeRoleFromTeam: build.mutation<void, { teamId: number; roleId: number }>({
      query: ({ teamId, roleId }) => ({
        url: `teams/${teamId}/roles/${roleId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Teams"],
    }),
    joinTeam: build.mutation<User, { teamId: number; userId: number }>({
      query: ({ teamId, userId }) => ({
        url: `teams/${teamId}/join`,
        method: "POST",
        body: { userId },
      }),
      invalidatesTags: ["Users"],
    }),
    search: build.query<SearchResults, string>({
      query: (query) => `search?query=${query}`,
    }),
    
    // Lambda function endpoint for data processing
    processData: build.mutation<
      { message: string; reportKey?: string },
      {
        start_date: string;
        end_date: string;
        output_bucket: string;
        location_id: string;
        discount_ids: number[];
      }
    >({
      query: (data) => ({
        url: 'data-report/generate',
        method: 'POST',
        body: data,
      }),
    }),
    // Use the existing joinTeam functionality for team assignment
    // This is guaranteed to work with API Gateway as it's an existing endpoint
    updateUserTeam: build.mutation<User, { userId: number; teamId: number }>({
      // The simpler approach is just to select the appropriate endpoint based on the teamId
      query: ({ userId, teamId }) => {
        // Special case for "no team" option (teamId === 0)
        if (teamId === 0) {
          console.log("Team ID 0 detected - using remove-user-from-team endpoint");
          return {
            url: 'teams/remove-user-from-team',
            method: 'POST',
            body: { userId }
          };
        } else {
          // For all valid team IDs, use the join team endpoint
          console.log(`Joining team ${teamId}`);
          return {
            url: `teams/${teamId}/join`,
            method: 'POST',
            body: { userId }
          };
        }
      },
      // Add extensive debugging
      onQueryStarted: async (arg, { dispatch, queryFulfilled, getState }) => {
        try {
          // Get auth user for logging
          const state = getState() as any;
          const authUserDetails = state?.api?.queries['getAuthUser({})']?.data?.userDetails;
          
          const operationType = arg.teamId === 0 ? "removing from team" : "adding to team";
          console.log(`Starting team assignment operation (${operationType}):`, {
            userId: arg.userId,
            teamId: arg.teamId,
            byUser: authUserDetails?.username || 'unknown'
          });
          
          // Wait for the query to complete
          const { data } = await queryFulfilled;
          
          console.log("Team assignment completed successfully:", {
            userId: data.userId,
            username: data.username,
            teamId: data.teamId || "No Team"
          });
          
          // Force refresh users data after successful update
          dispatch(api.util.invalidateTags(['Users']));
        } catch (error) {
          console.error("Team assignment failed:", error);
        }
      },
      invalidatesTags: ["Users", "Teams"],
    }),
    // GROUPS FUNCTIONALITY
    getGroups: build.query<Group[], void>({
      query: () => "groups",
      providesTags: ["Groups", "Users"]
    }),
    createGroup: build.mutation<Group, { name: string; description?: string; locationIds?: string[] }>({
      query: (body) => ({
        url: "groups",
        method: "POST",
        body
      }),
      invalidatesTags: ["Groups", "Users"]
    }),
    updateGroup: build.mutation<Group, { id: number; name?: string; description?: string; locationIds?: string[] }>({
      query: ({ id, ...data }) => ({
        url: `groups/${id}`,
        method: "PUT",
        body: data
      }),
      invalidatesTags: ["Groups", "Users"]
    }),
    deleteGroup: build.mutation<void, number>({
      query: (id) => ({
        url: `groups/${id}`,
        method: "DELETE"
      }),
      invalidatesTags: ["Groups", "Users"]
    }),
    assignGroupToUser: build.mutation<void, { userId: number; groupId: number }>({
      query: (body) => ({
        url: "groups/assign",
        method: "POST",
        body
      }),
      invalidatesTags: ["Groups", "Users"]
    }),
    removeUserFromGroup: build.mutation<void, { userId: number }>({
      query: ({ userId }) => ({
        url: "groups/remove-user",
        method: "POST",
        body: { userId }
      }),
      invalidatesTags: ["Groups", "Users"]
    }),
    updateUserLocations: build.mutation<void, { userId: number; locationIds: string[]; requestingUserId?: number }>({
      query: ({ userId, locationIds, requestingUserId }) => ({
        url: `users/${userId}/locations`,
        method: "PATCH",
        body: { locationIds, requestingUserId } // Pass requestingUserId in the body
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
    }),
    disableUser: build.mutation<User, { userId: number }>({
      query: ({ userId }) => ({
        url: `users/${userId}/disable`,
        method: "PATCH",
      }),
      invalidatesTags: ["Users"],
    }),
    enableUser: build.mutation<User, { userId: number }>({ 
      query: ({ userId }) => ({
        url: `users/${userId}/enable`, 
        method: "PATCH",
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: build.mutation<User, { userId: number }>({
      query: ({ userId }) => ({
        url: `users/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),
    // Cognito user management endpoints
    listCognitoUsers: build.query<ListCognitoUsersResponse, { filter?: string; limit?: number; paginationToken?: string; groupId?: number }>({
      query: ({ filter, limit, paginationToken, groupId } = {}) => {
        const params = new URLSearchParams();
        if (filter) params.append('filter', filter);
        if (limit) params.append('limit', limit.toString());
        if (paginationToken) params.append('paginationToken', paginationToken);
        if (groupId) params.append('groupId', groupId.toString());
        
        return `users/cognito/list?${params.toString()}`;
      },
      providesTags: ["CognitoUsers"],
    }),
    resendVerificationLink: build.mutation<{ message: string }, { username: string }>({
      query: ({ username }) => ({
        url: `users/cognito/${username}/resend-verification`,
        method: "POST",
      }),
      invalidatesTags: ["CognitoUsers"],
    }),
    deleteCognitoUser: build.mutation<{ message: string }, { username: string }>({
      query: ({ username }) => ({
        url: `users/cognito/${username}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CognitoUsers"],
    }),
    // Toggle user status (lock/unlock) for price users
    toggleUserStatus: build.mutation<{ message: string; user: User }, { userId: number }>({
      query: ({ userId }) => ({
        url: `users/${userId}/toggle-status`,
        method: "PATCH",
      }),
      invalidatesTags: ["Users"],
    }),
    updateUserEmail: build.mutation<User, { userId: number; email: string }>({
      query: ({ userId, email }) => ({
        url: `users/${userId}/email`,
        method: "PATCH",
        body: { email },
      }),
      invalidatesTags: ["Users", "CognitoUsers"],
    }),
    adminResetUserPassword: build.mutation<{ message: string }, { userId: number; newPassword: string }>({
      query: ({ userId, newPassword }) => ({
        url: `users/${userId}/reset-password`,
        method: 'PATCH',
        body: { newPassword },
      }),
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useSearchQuery,
  useGetUsersQuery,
  useGetTeamsQuery,
  useGetRolesQuery,
  useCreateTeamMutation,
  useDeleteTeamMutation,
  useUpdateTeamMutation,
  useAddRoleToTeamMutation,
  useRemoveRoleFromTeamMutation,
  useJoinTeamMutation,
  useGetTasksByUserQuery,
  useGetAuthUserQuery,
  useProcessDataMutation,
  useUpdateUserTeamMutation,
  // Groups functionality hooks
  useGetGroupsQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useAssignGroupToUserMutation,
  useRemoveUserFromGroupMutation,
  useUpdateUserLocationsMutation,
  useCreateLocationUserMutation,
  useDisableUserMutation,
  useEnableUserMutation,
  useDeleteUserMutation,
  // Cognito user management hooks
  useListCognitoUsersQuery,
  useResendVerificationLinkMutation,
  useDeleteCognitoUserMutation,
  // Price user management hooks
  useToggleUserStatusMutation,
  useUpdateUserEmailMutation,
  useAdminResetUserPasswordMutation,
} = api;
