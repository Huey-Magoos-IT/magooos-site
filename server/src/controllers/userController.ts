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
  const { teamId } = req.body;
  
  console.log("[PATCH /users/:userId/team] Updating user team:", { userId, teamId });
  
  if (!userId || !teamId) {
    console.error("[PATCH /users/:userId/team] Missing required fields");
    res.status(400).json({ message: "User ID and Team ID are required" });
    return;
  }

  try {
    // Verify the requesting user is an admin
    const requestingUserCognitoId = req.headers['x-user-cognito-id'] as string;
    
    if (!requestingUserCognitoId) {
      console.error("[PATCH /users/:userId/team] No user cognito ID in request headers");
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    
    const requestingUser = await prisma.user.findUnique({
      where: { cognitoId: requestingUserCognitoId },
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
    
    if (!requestingUser) {
      console.error("[PATCH /users/:userId/team] Requesting user not found:", requestingUserCognitoId);
      res.status(404).json({ message: "Requesting user not found" });
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
