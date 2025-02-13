import { Router } from "express";

import { getTeams, createTeam } from "../controllers/teamController";

const router = Router();

router.get("/", getTeams);
router.post("/", createTeam);

export default router;
