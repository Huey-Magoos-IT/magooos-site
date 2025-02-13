import { Router } from "express";

import { getTeams, joinTeam, createTeam } from "../controllers/teamController";

const router = Router();

router.get("/", getTeams);
router.post("/", createTeam);
router.post("/:teamId/join", joinTeam);

export default router;
