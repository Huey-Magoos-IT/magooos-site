import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { CognitoIdentityProviderClient, AdminDisableUserCommand, AdminEnableUserCommand } from "@aws-sdk/client-cognito-identity-provider";

// Initialize Cognito Client
// Ensure AWS_REGION and COGNITO_USER_POOL_ID are set in the server's environment
// The SDK will automatically use credentials from the EC2 instance's IAM role.
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error']
});

/**
 * Update user locations (admin or locationAdmin)
 */
export const updateUserLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUserId = parseInt(req.params.id);
    const { locationIds } = req.body;
    
    console.log(`[PATCH /users/${targetUserId}/locations] Updating user locations:`, { locationCount: locationIds?.length });
    
    // --- Robust Authentication Check ---
    let requestingUser = null;
    const requestingUserIdFromBody = req.body.requestingUserId;
    const cognitoIdFromHeader = req.headers['x-user-cognito-id'] as string;
    const authHeader = req.headers['authorization'] as string;

    if (requestingUserIdFromBody) {
      console.log(`[PATCH /users/${targetUserId}/locations] Auth: Using requestingUserId from body:`, requestingUserIdFromBody);
      requestingUser = await prisma.user.findUnique({ where: { userId: Number(requestingUserIdFromBody) } });
    } else if (cognitoIdFromHeader) {
      console.log(`[PATCH /users/${targetUserId}/locations] Auth: Using Cognito ID from header:`, cognitoIdFromHeader);
      requestingUser = await prisma.user.findUnique({ where: { cognitoId: cognitoIdFromHeader } });
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      // In a real app, decode JWT here. For now, assume admin if token exists.
      console.log(`[PATCH /users/${targetUserId}/locations] Auth: Using Bearer token (assuming admin)`);
      requestingUser = await prisma.user.findFirst({ where: { username: 'admin' } }); // Fallback/placeholder
    } else if (process.env.NODE_ENV !== 'production') {
       console.log(`[PATCH /users/${targetUserId}/locations] Auth: No user found, using admin fallback (dev)`);
       requestingUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    }

    if (!requestingUser) {
      console.error(`[PATCH /users/${targetUserId}/locations] Authentication failed - no valid requesting user found`);
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    console.log(`[PATCH /users/${targetUserId}/locations] Authenticated User: ${requestingUser.username} (ID: ${requestingUser.userId})`);

    // Fetch requesting user's roles
    const userWithRoles = await prisma.user.findUnique({
      where: { userId: requestingUser.userId },
      include: {
        team: {
          include: {
            teamRoles: {
              include: { role: true }
            }
          }
        }
      }
    });
    // --- End Robust Authentication Check ---

    // Determine roles based on the fetched userWithRoles
    const isAdmin = userWithRoles?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');
    const isLocationAdmin = userWithRoles?.team?.teamRoles?.some((tr: any) => tr.role.name === 'LOCATION_ADMIN');

    // For LocationAdmin users, check if all locations are in their group
    if (isLocationAdmin && !isAdmin) {
      // Get the LocationAdmin's group and its locations
      const adminWithGroup = await prisma.$queryRaw`
        SELECT g."locationIds"
        FROM "User" u
        JOIN "Group" g ON u."groupId" = g.id
        WHERE u."userId" = ${requestingUser.userId} // Use the authenticated user's ID
      `;

      if (!adminWithGroup || (adminWithGroup as any[]).length === 0 || !(adminWithGroup as any[])[0].locationIds) {
        console.error(`[PATCH /users/${targetUserId}/locations] LocationAdmin has no group assigned`);
        res.status(403).json({ message: "Access denied: No group assigned" });
        return;
      }
      
      const groupLocationIds = (adminWithGroup as any[])[0].locationIds;
      
      // Check if all requested locations are in the admin's group
      const invalidLocations = locationIds.filter((id: string) => !groupLocationIds.includes(id));
      
      if (invalidLocations.length > 0) {
        console.error(`[PATCH /users/${targetUserId}/locations] Invalid locations:`, invalidLocations);
        res.status(403).json({
          message: "Access denied: Some locations are not in your group",
          invalidLocations
        });
        return;
      }
    } else if (!isAdmin) {
      // Regular users can't update locations
      console.error(`[PATCH /users/${targetUserId}/locations] Access denied: Not an admin or locationAdmin`);
      res.status(403).json({ message: "Access denied: Requires ADMIN or LOCATION_ADMIN role" });
      return;
    }
    
    // Update user locations
    await prisma.$executeRaw`
      UPDATE "User"
      SET "locationIds" = ${locationIds}
      WHERE "userId" = ${targetUserId}
    `;
    
    console.log(`[PATCH /users/${targetUserId}/locations] User locations updated successfully`);
    res.status(200).json({ message: "User locations updated successfully" });
  } catch (error: any) {
    console.error(`[PATCH /users/${req.params.id}/locations] Error:`, error);
    res.status(500).json({
      message: "Error updating user locations",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create LocationUser (admin or locationAdmin)
 */
export const createLocationUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, locationIds, teamId } = req.body;
    
    console.log("[POST /users/location-user] Creating location user:", { username, locationCount: locationIds?.length, teamId });
    
    // Validate input
    if (!username || !teamId || !locationIds || !Array.isArray(locationIds)) {
      console.error("[POST /users/location-user] Invalid input");
      res.status(400).json({ message: "Username, teamId, and locationIds are required" });
      return;
    }
    
    // Get current user with roles
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        team: {
          include: {
            teamRoles: {
              include: { role: true }
            }
          }
        }
      }
    });
    
    const isAdmin = user?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');
    const isLocationAdmin = user?.team?.teamRoles?.some((tr: any) => tr.role.name === 'LOCATION_ADMIN');
    
    // For LocationAdmin users, check if all locations are in their group
    if (isLocationAdmin && !isAdmin) {
      // Get the LocationAdmin's group and its locations
      const adminWithGroup = await prisma.$queryRaw`
        SELECT g."locationIds"
        FROM "User" u
        JOIN "Group" g ON u."groupId" = g.id
        WHERE u."userId" = ${userId}
      `;
      
      if (!(adminWithGroup as any[])[0]) {
        console.error("[POST /users/location-user] LocationAdmin has no group assigned");
        res.status(403).json({ message: "Access denied: No group assigned" });
        return;
      }
      
      const groupLocationIds = (adminWithGroup as any[])[0].locationIds;
      
      // Check if all requested locations are in the admin's group
      const invalidLocations = locationIds.filter((id: string) => !groupLocationIds.includes(id));
      
      if (invalidLocations.length > 0) {
        console.error("[POST /users/location-user] Invalid locations:", invalidLocations);
        res.status(403).json({
          message: "Access denied: Some locations are not in your group",
          invalidLocations
        });
        return;
      }
      
      // Check if the team has LOCATION_USER role
      const team = await prisma.team.findUnique({
        where: { id: parseInt(teamId) },
        include: {
          teamRoles: {
            include: {
              role: true
            }
          }
        }
      });
      
      const hasLocationUserRole = team?.teamRoles?.some((tr: any) => tr.role.name === 'LOCATION_USER');
      
      if (!hasLocationUserRole) {
        console.error("[POST /users/location-user] Team does not have LOCATION_USER role");
        res.status(400).json({ message: "Team must have LOCATION_USER role" });
        return;
      }
    } else if (!isAdmin) {
      // Regular users can't create location users
      console.error("[POST /users/location-user] Access denied: Not an admin or locationAdmin");
      res.status(403).json({ message: "Access denied: Requires ADMIN or LOCATION_ADMIN role" });
      return;
    }
    
    // Generate a random Cognito ID for now (this would be replaced by actual Cognito integration)
    const tempCognitoId = `temp-${Math.random().toString(36).substring(2, 15)}`;
    
    // Create user in database using raw SQL
    await prisma.$executeRaw`
      INSERT INTO "User" (username, "cognitoId", "teamId", "locationIds", "profilePictureUrl")
      VALUES (${username}, ${tempCognitoId}, ${parseInt(teamId)}, ${locationIds}::text[], 'i1.jpeg')
    `;
    
    // Get the created user
    const newUser = await prisma.user.findUnique({
      where: { cognitoId: tempCognitoId }
    });
    
    if (!newUser) {
      console.error("[POST /users/location-user] Failed to retrieve created user");
      res.status(500).json({ message: "User created but could not be retrieved" });
      return;
    }
    
    console.log(`[POST /users/location-user] User created: ${newUser.userId} - ${newUser.username}`);
    res.status(201).json(newUser);
  } catch (error: any) {
    console.error("[POST /users/location-user] Error:", error);
    res.status(500).json({
      message: "Error creating location user",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  const { status } = req.query; // active, disabled, all (or undefined)
  let whereClause = {};

  if (status === 'active') {
    whereClause = { isDisabled: false };
  } else if (status === 'disabled') {
    whereClause = { isDisabled: true };
  }
  // If status is 'all' or undefined, whereClause remains empty, fetching all users.

  try {
    console.log(`[GET /users] Fetching users with status: ${status || 'all'}`);
    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: {
        username: 'asc',
      },
    });
    res.json(users);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving users: ${error.message}` });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  const { cognitoId } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: {
        cognitoId: cognitoId,
      },
      include: {
        team: {
          include: {
            teamRoles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });

    // Explicitly format the response to ensure teamRoles are included
    if (user && user.team) {
      const formattedUser = {
        ...user,
        team: {
          ...user.team,
          // Ensure teamRoles are explicitly mapped in the response
          teamRoles: user.team.teamRoles?.map(tr => ({
            id: tr.id,
            teamId: tr.teamId,
            roleId: tr.roleId,
            role: {
              id: tr.role.id,
              name: tr.role.name,
              description: tr.role.description
            }
          })) || []
        }
      };
      console.log("User with roles:", JSON.stringify({
        userId: formattedUser.userId,
        username: formattedUser.username,
        teamName: formattedUser.team.teamName,
        roleCount: formattedUser.team.teamRoles.length,
        roles: formattedUser.team.teamRoles.map(tr => tr.role.name)
      }));
      
      res.setHeader('Content-Type', 'application/json');
      res.json(formattedUser);
      return; // Return void, not a value
    }

    // If no user or no team, return as is
    res.json(user);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving user: ${error.message}` });
  }
};

export const postUser = async (req: Request, res: Response) => {
  try {
    console.log("[postUser] Received request body:", JSON.stringify(req.body, null, 2));
    const {
      username,
      cognitoId,
      profilePictureUrl = "i1.jpg",
      teamId = 1, // Default teamId if not provided
      locationIds = [], // Default to empty array if not provided
    } = req.body;

    console.log("[postUser] Extracted data:", { username, cognitoId, profilePictureUrl, teamId, locationIds });

    // Ensure locationIds are strings if Prisma expects String[] and receives numbers
    const processedLocationIds = Array.isArray(locationIds) ? locationIds.map(id => String(id)) : [];

    const newUser = await prisma.user.create({
      data: {
        username,
        cognitoId,
        profilePictureUrl,
        teamId: Number(teamId), // Ensure teamId is a number
        locationIds: processedLocationIds, // Add locationIds
      },
    });
    console.log("[postUser] Successfully created user:", JSON.stringify(newUser, null, 2));
    res.json({ message: "User Created Successfully", newUser });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error creating user: ${error.message}` });
  }
};

export const updateUserTeam = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { teamId, action, requestingUserId } = req.body;
  
  console.log("[UserTeam Update] Request received:", {
    method: req.method,
    path: req.path,
    userId,
    teamId,
    action,
    requestingUserId,
    headers: Object.keys(req.headers)
  });
  
  // Verify this is a team update action if action is specified
  if (action && action !== 'updateTeam') {
    console.error("[UserTeam Update] Invalid action:", action);
    res.status(400).json({ message: "Invalid action. Expected 'updateTeam'." });
    return;
  }
  
  if (!userId || !teamId) {
    console.error("[UserTeam Update] Missing required fields:", { userId, teamId });
    res.status(400).json({ message: "User ID and Team ID are required" });
    return;
  }

  try {
    // Multiple authentication methods for flexibility with API Gateway
    let requestingUser = null;
    
    // Method 1: Check for explicit requestingUserId in body
    // This is helpful for API Gateway which might strip headers
    if (requestingUserId) {
      console.log("[UserTeam Update] Using requestingUserId from body:", requestingUserId);
      requestingUser = await prisma.user.findUnique({
        where: { userId: Number(requestingUserId) },
        include: {
          team: {
            include: {
              teamRoles: { include: { role: true } }
            }
          }
        }
      });
      
      if (requestingUser) {
        console.log("[UserTeam Update] Found requesting user from body param:", requestingUser.username);
      }
    }
    
    // Method 2: Check for Cognito ID in headers (traditional auth)
    if (!requestingUser) {
      const requestingUserCognitoId = req.headers['x-user-cognito-id'] as string;
      
      if (requestingUserCognitoId) {
        console.log("[UserTeam Update] Using Cognito ID from header:", requestingUserCognitoId);
        requestingUser = await prisma.user.findUnique({
          where: { cognitoId: requestingUserCognitoId },
          include: {
            team: {
              include: {
                teamRoles: { include: { role: true } }
              }
            }
          }
        });
        
        if (requestingUser) {
          console.log("[UserTeam Update] Found requesting user from Cognito ID:", requestingUser.username);
        }
      }
    }
    
    // Fallback for 'admin' user in development/testing
    if (!requestingUser && process.env.NODE_ENV !== 'production') {
      console.log("[UserTeam Update] No authenticated user found, looking for admin user");
      // Find the admin user for testing purposes
      requestingUser = await prisma.user.findFirst({
        where: { username: 'admin' },
        include: {
          team: {
            include: {
              teamRoles: { include: { role: true } }
            }
          }
        }
      });
      
      if (requestingUser) {
        console.log("[UserTeam Update] Using admin user as fallback in non-production mode");
      }
    }
    
    if (!requestingUser) {
      console.error("[UserTeam Update] Authentication failed - no valid requesting user found");
      res.status(401).json({
        message: "Authentication required",
        details: "Please provide authentication via header or requestingUserId parameter"
      });
      return;
    }
    
    // Check if the requesting user is an admin or has admin role
    const isAdmin = requestingUser.team?.isAdmin ||
                   requestingUser.team?.teamRoles?.some(tr => tr.role.name.toUpperCase() === 'ADMIN') ||
                   requestingUser.username === 'admin';
    
    if (!isAdmin) {
      console.error("[PATCH /users/:userId/team] Access denied: User is not an admin");
      res.status(403).json({ message: "Access denied: Only administrators can assign teams" });
      return;
    }
    
    // Verify target user exists
    const userToUpdate = await prisma.user.findUnique({
      where: { userId: Number(userId) }
    });
    
    if (!userToUpdate) {
      console.error("[PATCH /users/:userId/team] User to update not found:", userId);
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: Number(teamId) }
    });
    
    if (!team) {
      console.error("[PATCH /users/:userId/team] Team not found:", teamId);
      res.status(404).json({ message: "Team not found" });
      return;
    }
    
    // Update user's team
    const updatedUser = await prisma.user.update({
      where: { userId: Number(userId) },
      data: { teamId: Number(teamId) },
      include: {
        team: {
          include: {
            teamRoles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });
    
    console.log("[PATCH /users/:userId/team] User team updated:", {
      userId: updatedUser.userId,
      username: updatedUser.username,
      teamId: updatedUser.teamId,
      teamName: updatedUser.team?.teamName
    });
    
    // Format the response to ensure all necessary data is included
    const processedUser = {
      ...updatedUser,
      team: updatedUser.team ? {
        ...updatedUser.team,
        teamRoles: updatedUser.team.teamRoles?.map(tr => ({
          id: tr.id,
          teamId: tr.teamId,
          roleId: tr.roleId,
          role: {
            id: tr.role.id,
            name: tr.role.name,
            description: tr.role.description
          }
        })) || []
      } : null
    };
    
    res.json(processedUser);
  } catch (error: any) {
    console.error("[PATCH /users/:userId/team] Error:", error);
    res.status(500).json({
      message: "Error updating user team",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const disableUser = async (req: Request, res: Response): Promise<void> => {
  const { userId: targetUserIdString } = req.params;
  const targetUserId = parseInt(targetUserIdString);

  // TODO: Implement robust authentication and authorization to ensure only admins can perform this action.
  // For example, check req.user or a similar mechanism established by your auth middleware.
  // const requestingUser = req.user; // Placeholder
  // if (!requestingUser || !requestingUser.isAdmin) { // Replace with actual admin check
  //   res.status(403).json({ message: "Forbidden: Administrator access required." });
  //   return;
  // }

  if (isNaN(targetUserId)) {
    console.error(`[PATCH /users/${targetUserIdString}/disable] Invalid user ID format.`);
    res.status(400).json({ message: "Invalid user ID format." });
    return;
  }

  if (!COGNITO_USER_POOL_ID) {
    console.error("[PATCH /users/:userId/disable] Server configuration error: COGNITO_USER_POOL_ID environment variable is not set.");
    res.status(500).json({ message: "Server configuration error: Cognito User Pool ID not set. Cannot proceed." });
    return;
  }

  let userToDisable;
  try {
    userToDisable = await prisma.user.findUnique({
      where: { userId: targetUserId },
    });

    if (!userToDisable) {
      console.log(`[PATCH /users/${targetUserIdString}/disable] User not found in database.`);
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (userToDisable.isDisabled) {
      console.log(`[PATCH /users/${targetUserIdString}/disable] User ${userToDisable.username} is already disabled.`);
      res.status(200).json({ message: "User is already disabled.", user: userToDisable });
      return;
    }

    // 1. Update user in local database
    const updatedUserInDb = await prisma.user.update({
      where: { userId: targetUserId },
      data: { isDisabled: true },
    });
    console.log(`[PATCH /users/${targetUserIdString}/disable] User ${updatedUserInDb.username} (ID: ${targetUserId}) marked as disabled in DB.`);

    // 2. Disable user in Cognito
    try {
      const cognitoCommand = new AdminDisableUserCommand({
        UserPoolId: COGNITO_USER_POOL_ID,
        Username: userToDisable.username, // Try using the app username, which might be Cognito's sign-in username
      });

      console.log(`[PATCH /users/${targetUserIdString}/disable] Attempting to disable Cognito user (using app username): ${userToDisable.username} in pool ${COGNITO_USER_POOL_ID}`);
      await cognitoClient.send(cognitoCommand);
      console.log(`[PATCH /users/${targetUserIdString}/disable] Successfully disabled user ${userToDisable.cognitoId} in Cognito.`);
      
      res.status(200).json({ 
          message: "User disabled successfully in database and Cognito.", 
          user: updatedUserInDb 
      });

    } catch (cognitoError: any) {
      console.error(`[PATCH /users/${targetUserIdString}/disable] Cognito Error for user ${userToDisable.cognitoId}:`, cognitoError);
      // User was disabled in DB, but Cognito operation failed. This is a critical state.
      // Log this error thoroughly. For now, respond with an error indicating partial success/failure.
      // A more robust solution might involve a retry mechanism for Cognito or a background job to reconcile.
      res.status(500).json({ 
        message: `User marked as disabled in DB, but Cognito operation failed: ${cognitoError.name || 'Unknown Cognito Error'} - ${cognitoError.message || ''}. Manual Cognito check may be required.`,
        user: updatedUserInDb, // Return the DB state
        cognitoErrorDetails: {
          name: cognitoError.name,
          message: cognitoError.message,
        }
      });
    }

  } catch (dbError: any) {
    console.error(`[PATCH /users/${targetUserIdString}/disable] Database or general error:`, dbError);
    res.status(500).json({ message: `Error processing disable user request: ${dbError.message}` });
  }
};

export const enableUser = async (req: Request, res: Response): Promise<void> => {
  const { userId: targetUserIdString } = req.params;
  const targetUserId = parseInt(targetUserIdString);

  // TODO: Implement robust authentication and authorization
  // Similar to disableUser, this should be restricted to admins.

  if (isNaN(targetUserId)) {
    console.error(`[PATCH /users/${targetUserIdString}/enable] Invalid user ID format.`);
    res.status(400).json({ message: "Invalid user ID format." });
    return;
  }

  if (!COGNITO_USER_POOL_ID) {
    console.error("[PATCH /users/:userId/enable] Server configuration error: COGNITO_USER_POOL_ID environment variable is not set.");
    res.status(500).json({ message: "Server configuration error: Cognito User Pool ID not set. Cannot proceed." });
    return;
  }

  let userToEnable;
  try {
    userToEnable = await prisma.user.findUnique({
      where: { userId: targetUserId },
    });

    if (!userToEnable) {
      console.log(`[PATCH /users/${targetUserIdString}/enable] User not found in database.`);
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (!userToEnable.isDisabled) {
      console.log(`[PATCH /users/${targetUserIdString}/enable] User ${userToEnable.username} is already enabled.`);
      res.status(200).json({ message: "User is already enabled.", user: userToEnable });
      return;
    }

    // 1. Update user in local database
    const updatedUserInDb = await prisma.user.update({
      where: { userId: targetUserId },
      data: { isDisabled: false }, // Set to false to enable
    });
    console.log(`[PATCH /users/${targetUserIdString}/enable] User ${updatedUserInDb.username} (ID: ${targetUserId}) marked as enabled in DB.`);

    // 2. Enable user in Cognito
    try {
      const cognitoCommand = new AdminEnableUserCommand({ // Use AdminEnableUserCommand
        UserPoolId: COGNITO_USER_POOL_ID,
        Username: userToEnable.username, // Consistent with disableUser
      });

      console.log(`[PATCH /users/${targetUserIdString}/enable] Attempting to enable Cognito user (using app username): ${userToEnable.username} in pool ${COGNITO_USER_POOL_ID}`);
      await cognitoClient.send(cognitoCommand);
      console.log(`[PATCH /users/${targetUserIdString}/enable] Successfully enabled user ${userToEnable.username} in Cognito.`);
      
      res.status(200).json({
          message: "User enabled successfully in database and Cognito.",
          user: updatedUserInDb
      });

    } catch (cognitoError: any) {
      console.error(`[PATCH /users/${targetUserIdString}/enable] Cognito Error for user ${userToEnable.username}:`, cognitoError);
      // User was enabled in DB, but Cognito operation failed.
      res.status(500).json({
        message: `User marked as enabled in DB, but Cognito operation failed: ${cognitoError.name || 'Unknown Cognito Error'} - ${cognitoError.message || ''}. Manual Cognito check may be required.`,
        user: updatedUserInDb, // Return the DB state
        cognitoErrorDetails: {
          name: cognitoError.name,
          message: cognitoError.message,
        }
      });
    }

  } catch (dbError: any) {
    console.error(`[PATCH /users/${targetUserIdString}/enable] Database or general error:`, dbError);
    res.status(500).json({ message: `Error processing enable user request: ${dbError.message}` });
  }
};
