import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  CognitoIdentityProviderClient,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
  AdminCreateUserCommand,
  ResendConfirmationCodeCommand,
  AdminUpdateUserAttributesCommand,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";

// Initialize Cognito Client
// Ensure AWS_REGION, COGNITO_USER_POOL_ID, and COGNITO_CLIENT_ID are set in the server's environment
// The SDK will automatically use credentials from the EC2 instance's IAM role.
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "us-east-2_5rTsYPjpA";
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || "11rv3fvrcmla2kgi5fs1ois71f";

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
      select: {
        userId: true,
        cognitoId: true,
        username: true,
        email: true,
        profilePictureUrl: true,
        teamId: true,
        groupId: true,
        locationIds: true,
        isDisabled: true,
        isLocked: true, // Ensure isLocked is included in the response
        team: true,
        group: true
      }
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
      email,
      profilePictureUrl = "i1.jpg",
      teamId = 1, // Default teamId if not provided
      locationIds = [], // Default to empty array if not provided
    } = req.body;

    console.log("[postUser] Extracted data:", { username, cognitoId, email, profilePictureUrl, teamId, locationIds });

    // Ensure locationIds are strings if Prisma expects String[] and receives numbers
    const processedLocationIds = Array.isArray(locationIds) ? locationIds.map(id => String(id)) : [];

    const newUser = await prisma.user.create({
      data: {
        username,
        cognitoId,
        email,
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

  // Authorization check: Only admins can disable users
  const requestingUserId = req.user?.userId;
  if (!requestingUserId) {
    console.error("[PATCH /users/:userId/disable] No user ID in request");
    res.status(401).json({ message: "Unauthorized: Authentication required." });
    return;
  }

  try {
    const requestingUser = await prisma.user.findUnique({
      where: { userId: requestingUserId },
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

    const isAdmin = requestingUser?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');

    if (!isAdmin) {
      console.error(`[PATCH /users/:userId/disable] User ${requestingUser?.username} is not an admin`);
      res.status(403).json({ message: "Forbidden: Administrator access required." });
      return;
    }
  } catch (error: any) {
    console.error("[PATCH /users/:userId/disable] Error checking permissions:", error);
    res.status(500).json({ message: "Error checking permissions" });
    return;
  }

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
      if (cognitoError.name === 'UserNotFoundException') {
        console.info(`[PATCH /users/${targetUserIdString}/disable] Cognito user ${userToDisable.username} not found. Assuming already disabled or does not exist in Cognito. DB user is disabled.`);
        res.status(200).json({
            message: "User disabled successfully in database. User not found in Cognito (assumed already actioned).",
            user: updatedUserInDb
        });
      } else {
        console.error(`[PATCH /users/${targetUserIdString}/disable] Cognito Error for user ${userToDisable.username}:`, cognitoError);
        // User was disabled in DB, but Cognito operation failed. This is a critical state.
        res.status(500).json({
          message: `User marked as disabled in DB, but Cognito operation failed: ${cognitoError.name || 'Unknown Cognito Error'} - ${cognitoError.message || ''}. Manual Cognito check may be required.`,
          user: updatedUserInDb, // Return the DB state
          cognitoErrorDetails: {
            name: cognitoError.name,
            message: cognitoError.message,
          }
        });
      }
    }

  } catch (dbError: any) {
    console.error(`[PATCH /users/${targetUserIdString}/disable] Database or general error:`, dbError);
    res.status(500).json({ message: `Error processing disable user request: ${dbError.message}` });
  }
};

export const enableUser = async (req: Request, res: Response): Promise<void> => {
  const { userId: targetUserIdString } = req.params;
  const targetUserId = parseInt(targetUserIdString);

  // Authorization check: Only admins can enable users
  const requestingUserId = req.user?.userId;
  if (!requestingUserId) {
    console.error("[PATCH /users/:userId/enable] No user ID in request");
    res.status(401).json({ message: "Unauthorized: Authentication required." });
    return;
  }

  try {
    const requestingUser = await prisma.user.findUnique({
      where: { userId: requestingUserId },
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

    const isAdmin = requestingUser?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');

    if (!isAdmin) {
      console.error(`[PATCH /users/:userId/enable] User ${requestingUser?.username} is not an admin`);
      res.status(403).json({ message: "Forbidden: Administrator access required." });
      return;
    }
  } catch (error: any) {
    console.error("[PATCH /users/:userId/enable] Error checking permissions:", error);
    res.status(500).json({ message: "Error checking permissions" });
    return;
  }

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
      if (cognitoError.name === 'UserNotFoundException') {
        console.info(`[PATCH /users/${targetUserIdString}/enable] Cognito user ${userToEnable.username} not found. Cannot enable in Cognito if user does not exist. DB user is enabled.`);
        // This is a bit of an edge case. User is enabled in DB but doesn't exist in Cognito.
        // For consistency, we might want to prevent enabling in DB if not in Cognito, or flag this.
        // For now, report success for DB and note Cognito status.
        res.status(200).json({
            message: "User enabled successfully in database. User not found in Cognito.",
            user: updatedUserInDb
        });
      } else {
        console.error(`[PATCH /users/${targetUserIdString}/enable] Cognito Error for user ${userToEnable.username}:`, cognitoError);
        res.status(500).json({
          message: `User marked as enabled in DB, but Cognito operation failed: ${cognitoError.name || 'Unknown Cognito Error'} - ${cognitoError.message || ''}. Manual Cognito check may be required.`,
          user: updatedUserInDb, // Return the DB state
          cognitoErrorDetails: {
            name: cognitoError.name,
            message: cognitoError.message,
          }
        });
      }
    }

  } catch (dbError: any) {
    console.error(`[PATCH /users/${targetUserIdString}/enable] Database or general error:`, dbError);
    res.status(500).json({ message: `Error processing enable user request: ${dbError.message}` });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { userId: targetUserIdString } = req.params;
  const targetUserId = parseInt(targetUserIdString);

  // Authorization check: Only admins can delete users
  const requestingUserId = req.user?.userId;
  if (!requestingUserId) {
    console.error("[DELETE /users/:userId] No user ID in request");
    res.status(401).json({ message: "Unauthorized: Authentication required." });
    return;
  }

  try {
    const requestingUser = await prisma.user.findUnique({
      where: { userId: requestingUserId },
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

    const isAdmin = requestingUser?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');

    if (!isAdmin) {
      console.error(`[DELETE /users/:userId] User ${requestingUser?.username} is not an admin`);
      res.status(403).json({ message: "Forbidden: Administrator access required." });
      return;
    }
  } catch (error: any) {
    console.error("[DELETE /users/:userId] Error checking permissions:", error);
    res.status(500).json({ message: "Error checking permissions" });
    return;
  }

  if (isNaN(targetUserId)) {
    console.error(`[DELETE /users/${targetUserIdString}] Invalid user ID format.`);
    res.status(400).json({ message: "Invalid user ID format." });
    return;
  }

  if (!COGNITO_USER_POOL_ID) {
    console.error("[DELETE /users/:userId] Server configuration error: COGNITO_USER_POOL_ID environment variable is not set.");
    res.status(500).json({ message: "Server configuration error: Cognito User Pool ID not set. Cannot proceed with deletion." });
    return;
  }

  let userToDelete;
  try {
    userToDelete = await prisma.user.findUnique({
      where: { userId: targetUserId },
    });

    if (!userToDelete) {
      console.log(`[DELETE /users/${targetUserIdString}] User not found in database.`);
      res.status(404).json({ message: "User not found." });
      return;
    }

    console.log(`[DELETE /users/${targetUserIdString}] Initiating deletion for user ${userToDelete.username} (ID: ${targetUserId}).`);

    // Database cleanup and user deletion within a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete comments directly made by the user
      console.log(`[DELETE /users/${targetUserIdString}] Deleting comments authored by user ID: ${targetUserId}`);
      await tx.comment.deleteMany({ where: { userId: targetUserId } });

      // 2. Delete attachments uploaded by the user
      console.log(`[DELETE /users/${targetUserIdString}] Deleting attachments uploaded by user ID: ${targetUserId}`);
      await tx.attachment.deleteMany({ where: { uploadedById: targetUserId } });

      // 3. Delete task assignments for the user
      console.log(`[DELETE /users/${targetUserIdString}] Deleting task assignments for user ID: ${targetUserId}`);
      await tx.taskAssignment.deleteMany({ where: { userId: targetUserId } });

      // 4. Find all tasks authored by the user
      const tasksAuthoredByUser = await tx.task.findMany({
        where: { authorUserId: targetUserId },
        select: { id: true } // Only need the IDs
      });
      const authoredTaskIds = tasksAuthoredByUser.map(task => task.id);

      if (authoredTaskIds.length > 0) {
        // 5. Delete comments associated with tasks authored by the user
        console.log(`[DELETE /users/${targetUserIdString}] Deleting comments on tasks authored by user ID: ${targetUserId} (Task IDs: ${authoredTaskIds.join(', ')})`);
        await tx.comment.deleteMany({
          where: { taskId: { in: authoredTaskIds } }
        });

        // 6. Delete attachments associated with tasks authored by the user
        console.log(`[DELETE /users/${targetUserIdString}] Deleting attachments on tasks authored by user ID: ${targetUserId} (Task IDs: ${authoredTaskIds.join(', ')})`);
        await tx.attachment.deleteMany({
            where: { taskId: { in: authoredTaskIds } }
        });
      }

      // 7. Nullify other users' tasks assigned to the target user
      console.log(`[DELETE /users/${targetUserIdString}] Nullifying assigned tasks for user ID: ${targetUserId}`);
      await tx.task.updateMany({
        where: { assignedUserId: targetUserId },
        data: { assignedUserId: null },
      });

      // 8. Delete tasks authored by the user
      // This must happen after comments/attachments on these tasks are deleted
      if (authoredTaskIds.length > 0) {
        console.log(`[DELETE /users/${targetUserIdString}] Deleting tasks authored by user ID: ${targetUserId}`);
        await tx.task.deleteMany({ where: { id: { in: authoredTaskIds } } });
      }
      
      // 9. Delete the user record
      console.log(`[DELETE /users/${targetUserIdString}] Deleting user record from database for user ID: ${targetUserId}`);
      await tx.user.delete({ where: { userId: targetUserId } });
    });

    console.log(`[DELETE /users/${targetUserIdString}] User ${userToDelete.username} and related data successfully deleted from database.`);

    // Delete user from Cognito
    try {
      const cognitoCommand = new AdminDeleteUserCommand({
        UserPoolId: COGNITO_USER_POOL_ID,
        Username: userToDelete.username, // Using app username, consistent with disable/enable
      });

      console.log(`[DELETE /users/${targetUserIdString}] Attempting to delete Cognito user: ${userToDelete.username} from pool ${COGNITO_USER_POOL_ID}`);
      await cognitoClient.send(cognitoCommand);
      console.log(`[DELETE /users/${targetUserIdString}] Successfully deleted user ${userToDelete.username} from Cognito.`);
      
      res.status(200).json({
          message: "User permanently deleted successfully from database and Cognito."
      });

    } catch (cognitoError: any) {
      if (cognitoError.name === 'UserNotFoundException') {
        console.info(`[DELETE /users/${targetUserIdString}] Cognito user ${userToDelete.username} not found. Assuming already deleted or never existed in Cognito. DB user and related data deleted.`);
        res.status(200).json({
            message: "User permanently deleted successfully from database. User not found in Cognito (assumed already actioned)."
        });
      } else {
        console.error(`[DELETE /users/${targetUserIdString}] Cognito Deletion Error for user ${userToDelete.username}:`, cognitoError);
        // User was deleted from DB, but Cognito operation failed. This is a critical state.
        res.status(500).json({
          message: `User deleted from DB, but Cognito deletion failed: ${cognitoError.name || 'Unknown Cognito Error'} - ${cognitoError.message || ''}. Manual Cognito cleanup may be required for user ${userToDelete.username}.`,
          cognitoErrorDetails: {
            name: cognitoError.name,
            message: cognitoError.message,
          }
        });
      }
    }

  } catch (dbError: any) {
    console.error(`[DELETE /users/${targetUserIdString}] Database transaction or general error during deletion:`, dbError);
    res.status(500).json({ message: `Error processing delete user request: ${dbError.message}` });
  }
};

/**
 * List users from Cognito with optional filtering
 */
export const listCognitoUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filter, limit = 60, paginationToken, groupId } = req.query;
    
    console.log(`[GET /users/cognito/list] Listing Cognito users with filter: ${filter}, groupId: ${groupId}`);
    
    // Admin authorization check using existing pattern
    let requestingUser = null;
    const requestingUserIdFromBody = req.body.requestingUserId;
    const cognitoIdFromHeader = req.headers['x-user-cognito-id'] as string;
    const authHeader = req.headers['authorization'] as string;

    if (requestingUserIdFromBody) {
      requestingUser = await prisma.user.findUnique({ where: { userId: Number(requestingUserIdFromBody) } });
    } else if (cognitoIdFromHeader) {
      requestingUser = await prisma.user.findUnique({ where: { cognitoId: cognitoIdFromHeader } });
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      requestingUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    } else if (process.env.NODE_ENV !== 'production') {
      requestingUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    }

    if (!requestingUser) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

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

    const isAdmin = userWithRoles?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');
    const isLocationAdmin = userWithRoles?.team?.teamRoles?.some((tr: any) => tr.role.name === 'LOCATION_ADMIN');
    
    // Enhanced authorization: Allow location admins for their own group
    if (!isAdmin && !isLocationAdmin) {
      res.status(403).json({ message: "Access denied: Admin or Location Admin role required" });
      return;
    }

    // For location admins, ensure they can only see their group's users
    if (isLocationAdmin && !isAdmin) {
      if (!groupId || userWithRoles?.groupId !== parseInt(groupId as string)) {
        res.status(403).json({ message: "Access denied: Can only view users from your assigned group" });
        return;
      }
    }

    if (!COGNITO_USER_POOL_ID) {
      res.status(500).json({ message: "Server configuration error: Cognito User Pool ID not set" });
      return;
    }

    // Build Cognito command
    const command = new ListUsersCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Limit: parseInt(limit as string),
      PaginationToken: paginationToken as string,
      Filter: filter as string
    });

    const response = await cognitoClient.send(command);
    
    // Transform and filter Cognito users
    let users = response.Users?.map(cognitoUser => ({
      Username: cognitoUser.Username,
      UserStatus: cognitoUser.UserStatus,
      Email: cognitoUser.Attributes?.find(attr => attr.Name === 'email')?.Value,
      EmailVerified: cognitoUser.Attributes?.find(attr => attr.Name === 'email_verified')?.Value === 'true',
      CreatedDate: cognitoUser.UserCreateDate,
      LastModifiedDate: cognitoUser.UserLastModifiedDate,
      Enabled: cognitoUser.Enabled,
      GroupId: cognitoUser.Attributes?.find(attr => attr.Name === 'custom:groupId')?.Value,
      TeamId: cognitoUser.Attributes?.find(attr => attr.Name === 'custom:teamId')?.Value,
      LocationIds: cognitoUser.Attributes?.find(attr => attr.Name === 'custom:locationIds')?.Value
    })) || [];

    // Filter by groupId if specified (for location admins)
    if (groupId) {
      users = users.filter(user => user.GroupId === groupId);
    }

    console.log(`[GET /users/cognito/list] Found ${users.length} Cognito users`);
    
    res.json({
      users,
      paginationToken: response.PaginationToken
    });
  } catch (error: any) {
    console.error("[GET /users/cognito/list] Error:", error);
    res.status(500).json({
      message: "Error listing Cognito users",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Resend verification link for a Cognito user
 */
export const resendVerificationLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    
    console.log(`[POST /users/cognito/${username}/resend-verification] Resending verification link`);
    
    // Admin authorization check using existing pattern
    let requestingUser = null;
    const requestingUserIdFromBody = req.body.requestingUserId;
    const cognitoIdFromHeader = req.headers['x-user-cognito-id'] as string;
    const authHeader = req.headers['authorization'] as string;

    if (requestingUserIdFromBody) {
      requestingUser = await prisma.user.findUnique({ where: { userId: Number(requestingUserIdFromBody) } });
    } else if (cognitoIdFromHeader) {
      requestingUser = await prisma.user.findUnique({ where: { cognitoId: cognitoIdFromHeader } });
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      requestingUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    } else if (process.env.NODE_ENV !== 'production') {
      requestingUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    }

    if (!requestingUser) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

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

    const isAdmin = userWithRoles?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');
    const isLocationAdmin = userWithRoles?.team?.teamRoles?.some((tr: any) => tr.role.name === 'LOCATION_ADMIN');
    
    if (!isAdmin && !isLocationAdmin) {
      res.status(403).json({ message: "Access denied: Admin or Location Admin role required" });
      return;
    }

    if (!COGNITO_USER_POOL_ID) {
      res.status(500).json({ message: "Server configuration error: Cognito User Pool ID not set" });
      return;
    }

    if (!COGNITO_CLIENT_ID) {
      res.status(500).json({ message: "Server configuration error: Cognito Client ID not set" });
      return;
    }

    // Use ResendConfirmationCodeCommand for unconfirmed users
    const command = new ResendConfirmationCodeCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: username
    });

    await cognitoClient.send(command);
    
    console.log(`[POST /users/cognito/${username}/resend-verification] Verification link resent successfully`);
    
    res.json({
      message: `Verification link resent successfully to ${username}`
    });
  } catch (error: any) {
    console.error(`[POST /users/cognito/${req.params.username}/resend-verification] Error:`, error);
    
    if (error.name === 'UserNotFoundException') {
      res.status(404).json({ message: "User not found in Cognito" });
      return;
    }
    
    res.status(500).json({
      message: "Error resending verification link",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get users with PRICE_USER role
 */
export const getPriceUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[GET /users/price-users] Fetching users with PRICE_USER role');
    
    // Get users with teams that have PRICE_USER role
    const priceUsers = await prisma.user.findMany({
      where: {
        isDisabled: false,
        team: {
          teamRoles: {
            some: {
              role: {
                name: 'PRICE_USER'
              }
            }
          }
        }
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
        },
        group: true
      },
      orderBy: {
        username: 'asc'
      }
    });
    
    console.log(`[GET /users/price-users] Found ${priceUsers.length} price users`);
    
    // Debug: Log each user found
    priceUsers.forEach(user => {
      console.log(`[GET /users/price-users] User: ${user.username} (ID: ${user.userId}) - Team: ${user.team?.teamName} (ID: ${user.teamId}) - Roles: ${user.team?.teamRoles?.map(tr => tr.role.name).join(', ')}`);
    });
    
    // Debug: Also check if corporateuser exists at all
    const corporateUser = await prisma.user.findFirst({
      where: { username: 'corporateuser' },
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
    
    if (corporateUser) {
      console.log(`[GET /users/price-users] DEBUG - corporateuser found: ID ${corporateUser.userId}, Team: ${corporateUser.team?.teamName} (ID: ${corporateUser.teamId}), isDisabled: ${corporateUser.isDisabled}, Roles: ${corporateUser.team?.teamRoles?.map(tr => tr.role.name).join(', ')}`);
    } else {
      console.log('[GET /users/price-users] DEBUG - corporateuser NOT found in database');
    }
    
    res.json(priceUsers);
  } catch (error: any) {
    console.error('[GET /users/price-users] Error:', error);
    res.status(500).json({
      message: "Error fetching price users",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Toggle user status (enable/disable) for price users
 */
export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const targetUserId = parseInt(userId);
    
    console.log(`[PATCH /users/${userId}/toggle-status] Toggling user status`);
    
    if (isNaN(targetUserId)) {
      res.status(400).json({ message: "Invalid user ID format" });
      return;
    }
    
    // Authentication check using existing pattern
    let requestingUser = null;
    const requestingUserIdFromBody = req.body.requestingUserId;
    const cognitoIdFromHeader = req.headers['x-user-cognito-id'] as string;
    const authHeader = req.headers['authorization'] as string;

    if (requestingUserIdFromBody) {
      requestingUser = await prisma.user.findUnique({ where: { userId: Number(requestingUserIdFromBody) } });
    } else if (cognitoIdFromHeader) {
      requestingUser = await prisma.user.findUnique({ where: { cognitoId: cognitoIdFromHeader } });
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      requestingUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    } else if (process.env.NODE_ENV !== 'production') {
      requestingUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    }

    if (!requestingUser) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Check if requesting user has PRICE_ADMIN or ADMIN role
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

    const isAdmin = userWithRoles?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');
    const isPriceAdmin = userWithRoles?.team?.teamRoles?.some((tr: any) => tr.role.name === 'PRICE_ADMIN');
    
    if (!isAdmin && !isPriceAdmin) {
      res.status(403).json({ message: "Access denied: ADMIN or PRICE_ADMIN role required" });
      return;
    }
    
    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { userId: targetUserId },
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
    
    if (!targetUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Verify target user has PRICE_USER role
    const hasPriceUserRole = targetUser.team?.teamRoles?.some((tr: any) => tr.role.name === 'PRICE_USER');
    if (!hasPriceUserRole) {
      res.status(400).json({ message: "User does not have PRICE_USER role" });
      return;
    }
    
    // Toggle the user's locked status
    const newLockedStatus = !targetUser.isLocked;
    
    const updatedUser = await prisma.user.update({
      where: { userId: targetUserId },
      data: { isLocked: newLockedStatus },
      include: {
        team: {
          include: {
            teamRoles: {
              include: { role: true }
            }
          }
        },
        group: true
      }
    });
    
    console.log(`[PATCH /users/${userId}/toggle-status] User ${updatedUser.username} lock status changed to ${newLockedStatus ? 'locked' : 'unlocked'}`);
    
    res.json({
      message: `User ${newLockedStatus ? 'locked' : 'unlocked'} successfully`,
      user: updatedUser
    });
  } catch (error: any) {
    console.error(`[PATCH /users/${req.params.userId}/toggle-status] Error:`, error);
    res.status(500).json({
      message: "Error toggling user status",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const updateUserEmail = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Email is required." });
    return;
  }
 
  try {
    // --- Authorization Check ---
    let requestingUser = null;
    const requestingUserIdFromBody = req.body.requestingUserId;
    const cognitoIdFromHeader = req.headers['x-user-cognito-id'] as string;
    const authHeader = req.headers['authorization'] as string;
 
    if (requestingUserIdFromBody) {
      requestingUser = await prisma.user.findUnique({ where: { userId: Number(requestingUserIdFromBody) } });
    } else if (cognitoIdFromHeader) {
      requestingUser = await prisma.user.findUnique({ where: { cognitoId: cognitoIdFromHeader } });
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      requestingUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    } else if (process.env.NODE_ENV !== 'production') {
      requestingUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    }
 
    if (!requestingUser) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
 
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
 
    const isAdmin = userWithRoles?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');
    
    if (!isAdmin) {
      res.status(403).json({ message: "Access denied: Admin role required to update user email" });
      return;
    }
    // --- End Authorization Check ---
 
    const user = await prisma.user.findUnique({
      where: { userId: parseInt(userId) },
    });
 
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    // Update in Cognito
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: user.username,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "false" },
      ],
    });
    await cognitoClient.send(command);

    // Update in local DB
    await prisma.user.update({
      where: { userId: parseInt(userId) },
      data: { email },
    });

    res.status(200).json({ message: "User email updated successfully. A new verification link has been sent." });

  } catch (error: any) {
    console.error(`Error updating email for user ${userId}:`, error);
    res.status(500).json({ message: `Error updating email: ${error.message}` });
  }
};

/**
 * Delete an unconfirmed user from Cognito only (no local DB record)
 */
export const deleteCognitoUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    
    console.log(`[DELETE /users/cognito/${username}] Deleting unconfirmed Cognito user`);
    
    // Admin authorization check using existing pattern
    let requestingUser = null;
    const requestingUserIdFromBody = req.body.requestingUserId;
    const cognitoIdFromHeader = req.headers['x-user-cognito-id'] as string;
    const authHeader = req.headers['authorization'] as string;

    if (requestingUserIdFromBody) {
      requestingUser = await prisma.user.findUnique({ where: { userId: Number(requestingUserIdFromBody) } });
    } else if (cognitoIdFromHeader) {
      requestingUser = await prisma.user.findUnique({ where: { cognitoId: cognitoIdFromHeader } });
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      requestingUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    } else if (process.env.NODE_ENV !== 'production') {
      requestingUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    }

    if (!requestingUser) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

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

    const isAdmin = userWithRoles?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');
    const isLocationAdmin = userWithRoles?.team?.teamRoles?.some((tr: any) => tr.role.name === 'LOCATION_ADMIN');
    
    if (!isAdmin && !isLocationAdmin) {
      res.status(403).json({ message: "Access denied: Admin or Location Admin role required" });
      return;
    }

    if (!COGNITO_USER_POOL_ID) {
      res.status(500).json({ message: "Server configuration error: Cognito User Pool ID not set" });
      return;
    }

    // Delete user from Cognito
    const command = new AdminDeleteUserCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: username
    });

    await cognitoClient.send(command);
    
    console.log(`[DELETE /users/cognito/${username}] Successfully deleted unconfirmed user from Cognito`);
    
    res.json({
      message: `Unconfirmed user ${username} deleted successfully from Cognito`
    });
  } catch (error: any) {
    console.error(`[DELETE /users/cognito/${req.params.username}] Error:`, error);
    
    if (error.name === 'UserNotFoundException') {
      res.status(404).json({ message: "User not found in Cognito" });
      return;
    }
    
    res.status(500).json({
      message: "Error deleting Cognito user",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
export const adminResetUserPassword = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    res.status(400).json({ message: "New password is required." });
    return;
  }

  try {
    // --- Authorization Check (copied from updateUserEmail) ---
    let requestingUser = null;
    const requestingUserIdFromBody = req.body.requestingUserId;
    const cognitoIdFromHeader = req.headers['x-user-cognito-id'] as string;
    const authHeader = req.headers['authorization'] as string;
 
    if (requestingUserIdFromBody) {
      requestingUser = await prisma.user.findUnique({ where: { userId: Number(requestingUserIdFromBody) } });
    } else if (cognitoIdFromHeader) {
      requestingUser = await prisma.user.findUnique({ where: { cognitoId: cognitoIdFromHeader } });
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      requestingUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    } else if (process.env.NODE_ENV !== 'production') {
      requestingUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    }
 
    if (!requestingUser) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
 
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
 
    const isAdmin = userWithRoles?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');
    
    if (!isAdmin) {
      res.status(403).json({ message: "Access denied: Admin role required to reset password" });
      return;
    }
    // --- End Authorization Check ---

    const user = await prisma.user.findUnique({
      where: { userId: parseInt(userId) },
    });

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: user.username,
      Password: newPassword,
      Permanent: true,
    });

    await cognitoClient.send(setPasswordCommand);
    
    // After setting the password, we must update an attribute to clear the RESET_REQUIRED status.
    // We can "touch" the email attribute without changing it.
    const updateUserAttributesCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: COGNITO_USER_POOL_ID,
        Username: user.username,
        UserAttributes: [{
            Name: 'email_verified',
            Value: 'true'
        }]
    });
    await cognitoClient.send(updateUserAttributesCommand);


    res.status(200).json({ message: "User password reset successfully." });

  } catch (error: any) {
    console.error(`Error resetting password for user ${userId}:`, error);
    res.status(500).json({ message: `Error resetting password: ${error.message}` });
  }
};
