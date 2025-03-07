import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error']
});

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany();
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
    const {
      username,
      cognitoId,
      profilePictureUrl = "i1.jpg",
      teamId = 1,
    } = req.body;
    
    const newUser = await prisma.user.create({
      data: {
        username,
        cognitoId,
        profilePictureUrl,
        teamId,
      },
    });
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
