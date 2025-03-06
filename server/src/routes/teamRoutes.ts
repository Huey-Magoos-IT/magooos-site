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
router.get("/roles", getRoles);
router.post("/:teamId/roles", addRoleToTeam);
router.delete("/:teamId/roles/:roleId", removeRoleFromTeam);

// Debug endpoint to check team roles directly
router.get("/debug/team-roles", async (req, res) => {
  try {
    console.log("[GET /teams/debug/team-roles] Checking team roles");
    
    const teamsWithRoles = await prisma.team.findMany({
      include: {
        teamRoles: {
          include: {
            role: true
          }
        }
      }
    });
    
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
    console.error("[GET /teams/debug/team-roles] Error:", error);
    res.status(500).json({ message: "Error fetching team roles" });
  }
});

export default router;
