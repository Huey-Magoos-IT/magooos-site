import { Router } from "express";

import {
  getTeams,
  joinTeam,
  createTeam,
  getRoles,
  addRoleToTeam,
  removeRoleFromTeam
} from "../controllers/teamController";

const router = Router();

// Team routes
router.get("/", getTeams);
router.post("/", createTeam);
router.post("/:teamId/join", joinTeam);

// Role routes
router.get("/roles", getRoles);
router.post("/:teamId/roles", addRoleToTeam);
router.delete("/:teamId/roles/:roleId", removeRoleFromTeam);

export default router;
