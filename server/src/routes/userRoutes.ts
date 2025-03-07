import { Router } from "express";

import { getUser, getUsers, postUser, updateUserTeam } from "../controllers/userController";

const router = Router();

router.get("/", getUsers);
router.post("/", postUser);
router.get("/:cognitoId", getUser);
router.patch("/:userId/team", updateUserTeam);

export default router;
