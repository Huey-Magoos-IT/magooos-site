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
    
    // Fetch all available roles first
    const allRoles = await prisma.role.findMany();
    console.log(`[GET /teams] Found ${allRoles.length} available roles:`, allRoles.map(r => r.name).join(', '));
    
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

    // DEBUG: Log all raw team roles before processing
    console.log("RAW TEAM ROLES:");
    teams.forEach(team => {
      console.log(`- Team ${team.id} (${team.teamName}): ${JSON.stringify(team.teamRoles || [])}`);
    });

    // Create a new fix script that adds roles to teams based on their names
    // This is a temporary measure to ensure all teams have proper roles
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const dataRole = await prisma.role.findUnique({ where: { name: 'DATA' } });
    const reportingRole = await prisma.role.findUnique({ where: { name: 'REPORTING' } });
    
    // Log all roles to ensure they exist
    console.log("Available roles:", { adminRole, dataRole, reportingRole });
    
    // If they don't exist, create them (this should never happen if seed was run)
    if (!adminRole || !dataRole || !reportingRole) {
      console.error("CRITICAL: Missing roles! Please run seed script to create roles.");
    }
    
    // Add appropriate roles to teams that don't have them
    for (const team of teams) {
      if (team.isAdmin && adminRole && team.teamRoles.length === 0) {
        console.log(`Adding ADMIN role to team: ${team.teamName} (ID: ${team.id})`);
        await prisma.teamRole.create({
          data: {
            teamId: team.id,
            roleId: adminRole.id
          }
        });
        
        // Add the role to the in-memory team object
        team.teamRoles.push({
          id: -1, // Placeholder that will be replaced
          teamId: team.id,
          roleId: adminRole.id,
          role: adminRole
        });
      }
      
      // Add DATA role to Data Team if needed
      if (team.teamName.toLowerCase().includes('data') && dataRole &&
          !team.teamRoles.some(tr => tr.roleId === dataRole.id)) {
        console.log(`Adding DATA role to team: ${team.teamName} (ID: ${team.id})`);
        const newRole = await prisma.teamRole.create({
          data: {
            teamId: team.id,
            roleId: dataRole.id
          }
        });
        
        // Add the role to the in-memory team object
        team.teamRoles.push({
          id: newRole.id,
          teamId: team.id,
          roleId: dataRole.id,
          role: dataRole
        });
      }
      
      // Add REPORTING role to Reporting Team if needed
      if (team.teamName.toLowerCase().includes('reporting') && reportingRole &&
          !team.teamRoles.some(tr => tr.roleId === reportingRole.id)) {
        console.log(`Adding REPORTING role to team: ${team.teamName} (ID: ${team.id})`);
        const newRole = await prisma.teamRole.create({
          data: {
            teamId: team.id,
            roleId: reportingRole.id
          }
        });
        
        // Add the role to the in-memory team object
        team.teamRoles.push({
          id: newRole.id,
          teamId: team.id,
          roleId: reportingRole.id,
          role: reportingRole
        });
      }
    }
    
    // Re-fetch teams with roles to ensure we have the latest data
    const updatedTeams = await prisma.team.findMany({
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
    
    // Process the teams with guaranteed role data
    const processedTeams = updatedTeams.map(team => {
      console.log(`Processing team ${team.id} with ${team.teamRoles?.length || 0} roles`);
      
      // Clone the team object with explicit teamRoles property
      const processedTeam = {
        id: team.id,
        teamName: team.teamName,
        isAdmin: team.isAdmin,
        productOwnerUserId: team.productOwnerUserId,
        projectManagerUserId: team.projectManagerUserId,
        user: team.user,
        
        // Always include teamRoles as a property, even if it's an empty array
        teamRoles: (team.teamRoles || []).map(tr => {
          console.log(`  - Adding role: ${tr.role.name}`);
          return {
            id: tr.id,
            teamId: tr.teamId,
            roleId: tr.roleId,
            role: {
              id: tr.role.id,
              name: tr.role.name,
              description: tr.role.description
            }
          };
        })
      };
      
      return processedTeam;
    });

    console.log(`[GET /teams] Found ${teams.length} teams`);
    console.log("Sample team with roles:", JSON.stringify(processedTeams[0], null, 2));
    
    // FINAL RESPONSE LOG - critical for debugging
    console.log("FINAL RESPONSE - ALL TEAMS:");
    processedTeams.forEach(team => {
      console.log(`- Team ${team.id} (${team.teamName}): Has ${team.teamRoles?.length || 0} roles`);
      if (team.teamRoles?.length > 0) {
        team.teamRoles.forEach(role => {
          console.log(`  * Role: ${role.role?.name || 'Unknown'}`);
        });
      }
    });
    
    // Set explicit content type and anti-caching headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Create a response that includes both teams and all available roles
    const responseData = {
      teams: processedTeams,
      availableRoles: allRoles
    };

    // Use stringification and parsing to ensure proper JSON structure
    const finalResponseJson = JSON.stringify(responseData);
    console.log("STRING LENGTH:", finalResponseJson.length);
    console.log("CONTAINS teamRoles:", finalResponseJson.includes("teamRoles"));
    console.log("CONTAINS availableRoles:", finalResponseJson.includes("availableRoles"));
    
    res.send(finalResponseJson);
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
    
    // Make sure the response includes all necessary team role data
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

export const deleteTeam = async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.params;
  
  if (!teamId) {
    if (!res.headersSent) {
      res.status(400).json({ message: "Team ID is required" });
    }
    return;
  }

  try {
    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: Number(teamId) }
    });

    if (!team) {
      if (!res.headersSent) {
        res.status(404).json({ message: "Team not found" });
      }
      return;
    }

    // Delete all team roles first (cascade should handle this, but just to be safe)
    await prisma.teamRole.deleteMany({
      where: { teamId: Number(teamId) }
    });

    // Update users to remove their team ID
    await prisma.user.updateMany({
      where: { teamId: Number(teamId) },
      data: { teamId: null }
    });

    // Delete the team
    await prisma.team.delete({
      where: { id: Number(teamId) }
    });

    if (!res.headersSent) {
      res.status(200).json({ message: "Team deleted successfully" });
    }
  } catch (error: any) {
    console.error("[DELETE /teams/:teamId] Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Error deleting team",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// Create a separate function for the POST-based deletion to avoid path confusion with API Gateway
export const deleteTeamPost = async (req: Request, res: Response): Promise<void> => {
  // Get teamId from either params or body to support multiple access patterns
  const teamId = req.params.teamId || req.body.teamId;
  
  console.log("[POST /teams/delete-team] Deleting team with ID:", teamId);
  
  if (!teamId) {
    if (!res.headersSent) {
      res.status(400).json({ message: "Team ID is required" });
    }
    return;
  }

  try {
    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: Number(teamId) }
    });

    if (!team) {
      if (!res.headersSent) {
        res.status(404).json({ message: "Team not found" });
      }
      return;
    }

    // Delete all team roles first (cascade should handle this, but just to be safe)
    await prisma.teamRole.deleteMany({
      where: { teamId: Number(teamId) }
    });

    // Update users to remove their team ID
    await prisma.user.updateMany({
      where: { teamId: Number(teamId) },
      data: { teamId: null }
    });

    // Delete the team
    await prisma.team.delete({
      where: { id: Number(teamId) }
    });

    if (!res.headersSent) {
      res.status(200).json({ message: "Team deleted successfully" });
    }
  } catch (error: any) {
    console.error("[POST /teams/delete-team] Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Error deleting team",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  if (!teamId) {
    res.status(400).json({ message: "Team ID is required" });
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

    // Delete all team roles first (cascade should handle this, but just to be safe)
    await prisma.teamRole.deleteMany({
      where: { teamId: Number(teamId) }
    });

    // Update users to remove their team ID
    await prisma.user.updateMany({
      where: { teamId: Number(teamId) },
      data: { teamId: null }
    });

    // Delete the team
    await prisma.team.delete({
      where: { id: Number(teamId) }
    });

    res.status(200).json({ message: "Team deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE /teams/:teamId] Error:", error);
    res.status(500).json({
      message: "Error deleting team",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const updateTeam = async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.params;
  const { teamName } = req.body;
  
  if (!teamId || !teamName) {
    res.status(400).json({ message: "Team ID and Team Name are required" });
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

    // Check if new name already exists (except for the current team)
    const existingTeam = await prisma.team.findFirst({
      where: { 
        teamName: teamName.trim(),
        id: { not: Number(teamId) }
      }
    });

    if (existingTeam) {
      res.status(409).json({ message: "Team name already exists" });
      return;
    }

    // Update the team
    const updatedTeam = await prisma.team.update({
      where: { id: Number(teamId) },
      data: { teamName: teamName.trim() },
      include: {
        teamRoles: {
          include: {
            role: true
          }
        }
      }
    });

    res.status(200).json(updatedTeam);
  } catch (error: any) {
    console.error("[PATCH /teams/:teamId] Error:", error);
    res.status(500).json({
      message: "Error updating team",
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
