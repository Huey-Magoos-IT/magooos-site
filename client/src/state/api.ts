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

export interface User {
  userId?: number;
  username: string;
  email: string;
  profilePictureUrl?: string;
  cognitoId?: string;
  teamId?: number;
  team?: Team;
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
  tagTypes: ["Projects", "Tasks", "Users", "Teams", "Roles"],
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
        url: `teams/${teamId}/delete`,
        method: "POST",  // Using POST instead of DELETE for API Gateway compatibility
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
} = api;
