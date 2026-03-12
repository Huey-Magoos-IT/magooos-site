import { Router } from "express";
import prisma from "../lib/prisma";

import {
  getTeams,
  joinTeam,
  createTeam,
  getRoles,
  addRoleToTeam,
  removeRoleFromTeam,
  deleteTeam,
  updateTeam,
  deleteTeamPost
} from "../controllers/teamController";

const router = Router();

// Team routes
router.get("/", getTeams);
router.post("/", createTeam);
router.delete("/:teamId", deleteTeam);
router.patch("/:teamId", updateTeam);
// Alternative endpoints for API Gateway compatibility
router.post("/:teamId/delete", deleteTeamPost);
router.post("/delete-team", deleteTeamPost); // Fallback endpoint without path parameter
router.post("/:teamId/join", joinTeam);

// Special endpoint for removing a user from any team (the "no team" option)
router.post("/remove-user-from-team", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    console.log("[POST /teams/remove-user-from-team] Removing user from team:", { userId });
    
    // Update the user to set teamId to null
    const updatedUser = await prisma.user.update({
      where: { userId: Number(userId) },
      data: { teamId: null },
      include: {
        team: true // Include null team info for consistency with other endpoints
      }
    });
    
    console.log("[POST /teams/remove-user-from-team] User removed from team:", {
      userId: updatedUser.userId,
      username: updatedUser.username,
      previousTeamId: updatedUser.teamId
    });
    
    res.json(updatedUser);
  } catch (error: any) {
    console.error("[POST /teams/remove-user-from-team] Error:", error);
    res.status(500).json({
      message: "Error removing user from team",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Role routes - make sure this route is correctly defined for API Gateway
router.get("/roles", (req, res) => {
  console.log("[Direct GET /teams/roles] Called directly!");
  console.log("Path:", req.path);
  console.log("URL:", req.url);
  console.log("Original URL:", req.originalUrl);
  
  // Set anti-caching headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  // Call the actual roles handler
  return getRoles(req, res);
});

// Alternate path for roles (in case of API Gateway path mapping issues)
router.get("/api-roles", (req, res) => {
  console.log("[GET /teams/api-roles] Alternate roles endpoint called");
  return getRoles(req, res);
});

router.post("/:teamId/roles", addRoleToTeam);
router.delete("/:teamId/roles/:roleId", removeRoleFromTeam);

// Direct endpoint for roles on the "teams" route
router.get("/all-roles", async (req, res) => {
  try {
    console.log("[GET /teams/all-roles] Alternate roles endpoint called");
    const roles = await prisma.role.findMany();
    res.setHeader('Cache-Control', 'no-store');
    res.json(roles);
  } catch (error) {
    console.error("[GET /teams/all-roles] Error:", error);
    res.status(500).json({ message: "Error retrieving roles" });
  }
});

// Debug endpoint to check team roles directly
router.get("/debug-team-roles", async (req, res) => {
  try {
    console.log("[GET /teams/debug-team-roles] Checking team roles");
    
    const teamsWithRoles = await prisma.team.findMany({
      include: {
        teamRoles: {
          include: {
            role: true
          }
        }
      }
    });
    
    // Set no-cache headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    const simplified = teamsWithRoles.map(team => ({
      id: team.id,
      teamName: team.teamName,
      isAdmin: team.isAdmin,
      roleCount: team.teamRoles.length,
      roles: team.teamRoles.map(tr => ({
        roleId: tr.roleId,
        roleName: tr.role.name
      }))
    }));
    
    res.json(simplified);
  } catch (error) {
    console.error("[GET /teams/debug-team-roles] Error:", error);
    res.status(500).json({ message: "Error fetching team roles" });
  }
});

export default router;
