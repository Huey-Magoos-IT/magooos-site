import { Router } from "express";
import { PrismaClient } from "@prisma/client";

import {
  getTeams,
  joinTeam,
  createTeam,
  getRoles,
  addRoleToTeam,
  removeRoleFromTeam
} from "../controllers/teamController";

const router = Router();
const prisma = new PrismaClient();

// Team routes
router.get("/", getTeams);
router.post("/", createTeam);
router.post("/:teamId/join", joinTeam);

// Role routes
router.get("/roles", (req, res) => {
  console.log("[Direct GET /teams/roles] Called directly!");
  
  // Set anti-caching headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  // Call the actual roles handler
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
