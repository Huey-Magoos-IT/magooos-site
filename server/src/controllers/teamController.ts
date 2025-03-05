import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("[GET /teams/roles] Fetching all roles");
    
    const roles = await prisma.role.findMany();
    
    console.log(`[GET /teams/roles] Found ${roles.length} roles:`);
    roles.forEach(role => {
      console.log(`- ${role.name} (ID: ${role.id}): ${role.description || 'No description'}`);
    });
    
    res.json(roles);
  } catch (error: any) {
    console.error("[GET /teams/roles] Error:", error);
    res.status(500).json({
      message: "Error retrieving roles",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("[GET /teams] Fetching all teams");
    
    const teams = await prisma.team.findMany({
      include: {
        user: {
          select: {
            userId: true,
            username: true
          }
        },
        teamRoles: {
          include: {
            role: true
          }
        }
      }
    });

    // Log team roles for debugging
    teams.forEach(team => {
      console.log(`Team ${team.teamName} (ID: ${team.id}) has ${team.teamRoles?.length || 0} roles:`);
      team.teamRoles?.forEach(tr => {
        console.log(`  - ${tr.role.name}`);
      });
    });

    // Make sure teamRoles is properly serialized in the response
    const processedTeams = teams.map(team => ({
      ...team,
      teamRoles: team.teamRoles
    }));

    console.log(`[GET /teams] Found ${teams.length} teams`);
    console.log("Sample team with roles:", JSON.stringify(processedTeams[0], null, 2));
    
    res.json(processedTeams);
  } catch (error: any) {
    console.error("[GET /teams] Error:", error);
    res.status(500).json({
      message: "Error retrieving teams",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const createTeam = async (req: Request, res: Response): Promise<void> => {
  const { teamName, roleIds = [] } = req.body;
  console.log("[POST /teams] Creating team:", { teamName, roleIds });

  // Validate input
  if (!teamName || typeof teamName !== 'string' || teamName.trim().length === 0) {
    console.error("[POST /teams] Invalid team name");
    res.status(400).json({ message: "Team name is required" });
    return;
  }

  if (!Array.isArray(roleIds)) {
    console.error("[POST /teams] Invalid roleIds format");
    res.status(400).json({ message: "roleIds must be an array" });
    return;
  }

  try {
    // Check if team name already exists
    const existingTeam = await prisma.team.findFirst({
      where: { teamName: teamName.trim() }
    });

    if (existingTeam) {
      console.error("[POST /teams] Team name already exists:", teamName);
      res.status(409).json({ message: "Team name already exists" });
      return;
    }

    // Find admin role (for backward compatibility)
    const adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' }
    });

    // Determine if team should have admin flag based on role selection
    const isAdmin = adminRole ? roleIds.includes(adminRole.id) : false;

    // Create team with roles in a transaction
    const newTeam = await prisma.$transaction(async (tx) => {
      // Create the team
      const team = await tx.team.create({
        data: {
          teamName: teamName.trim(),
          isAdmin: isAdmin
        }
      });
      
      // Create team role relationships
      if (roleIds.length > 0) {
        for (const roleId of roleIds) {
          await tx.teamRole.create({
            data: {
              teamId: team.id,
              roleId: Number(roleId)
            }
          });
        }
      }
      
      return team;
    });

    // Fetch the created team with roles for response
    const teamWithRoles = await prisma.team.findUnique({
      where: { id: newTeam.id },
      include: {
        teamRoles: {
          include: {
            role: true
          }
        }
      }
    });

    console.log("[POST /teams] Team created:", teamWithRoles);
    res.status(201).json(teamWithRoles);
  } catch (error: any) {
    console.error("[POST /teams] Error:", error);
    res.status(500).json({
      message: "Error creating team",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const joinTeam = async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.params;
  const { userId } = req.body;
  console.log("[POST /teams/join] Joining team:", { teamId, userId });

  if (!teamId || !userId) {
    console.error("[POST /teams/join] Missing required fields");
    res.status(400).json({ message: "Team ID and User ID are required" });
    return;
  }

  try {
    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: Number(teamId) },
      include: {
        teamRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!team) {
      console.error("[POST /teams/join] Team not found:", teamId);
      res.status(404).json({ message: "Team not found" });
      return;
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { userId: Number(userId) }
    });

    if (!user) {
      console.error("[POST /teams/join] User not found:", userId);
      res.status(404).json({ message: "User not found" });
      return;
    }

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

    console.log("[POST /teams/join] User joined team:", updatedUser);
    res.json(updatedUser);
  } catch (error: any) {
    console.error("[POST /teams/join] Error:", error);
    res.status(500).json({
      message: "Error joining team",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const addRoleToTeam = async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.params;
  const { roleId } = req.body;
  
  if (!teamId || !roleId) {
    res.status(400).json({ message: "Team ID and Role ID are required" });
    return;
  }

  try {
    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: Number(teamId) }
    });

    if (!team) {
      res.status(404).json({ message: "Team not found" });
      return;
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: Number(roleId) }
    });

    if (!role) {
      res.status(404).json({ message: "Role not found" });
      return;
    }

    // Check if relation already exists
    const existingTeamRole = await prisma.teamRole.findFirst({
      where: {
        teamId: Number(teamId),
        roleId: Number(roleId)
      }
    });

    if (existingTeamRole) {
      res.status(409).json({ message: "Team already has this role" });
      return;
    }

    // Add role to team
    const teamRole = await prisma.teamRole.create({
      data: {
        teamId: Number(teamId),
        roleId: Number(roleId)
      }
    });

    // Update isAdmin flag if adding admin role
    if (role.name === 'ADMIN') {
      await prisma.team.update({
        where: { id: Number(teamId) },
        data: { isAdmin: true }
      });
    }

    res.status(201).json(teamRole);
  } catch (error: any) {
    console.error("[POST /teams/:teamId/roles] Error:", error);
    res.status(500).json({
      message: "Error adding role to team",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const removeRoleFromTeam = async (req: Request, res: Response): Promise<void> => {
  const { teamId, roleId } = req.params;

  try {
    // Check if relation exists
    const teamRole = await prisma.teamRole.findFirst({
      where: {
        teamId: Number(teamId),
        roleId: Number(roleId)
      },
      include: {
        role: true
      }
    });

    if (!teamRole) {
      res.status(404).json({ message: "Team does not have this role" });
      return;
    }

    // Delete the relation
    await prisma.teamRole.delete({
      where: { id: teamRole.id }
    });

    // Update isAdmin flag if removing admin role
    if (teamRole.role.name === 'ADMIN') {
      await prisma.team.update({
        where: { id: Number(teamId) },
        data: { isAdmin: false }
      });
    }

    res.status(200).json({ message: "Role removed from team" });
  } catch (error: any) {
    console.error("[DELETE /teams/:teamId/roles/:roleId] Error:", error);
    res.status(500).json({
      message: "Error removing role from team",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Utility function to check if a team has a specific role
export const hasRole = async (teamId: number, roleName: string): Promise<boolean> => {
  if (!teamId) return false;
  
  const count = await prisma.teamRole.count({
    where: {
      teamId,
      role: {
        name: roleName
      }
    }
  });
  
  return count > 0;
};
