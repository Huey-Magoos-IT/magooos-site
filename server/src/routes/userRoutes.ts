import { Router } from "express";

import { getUser, getUsers, postUser, updateUserTeam } from "../controllers/userController";

const router = Router();

router.get("/", getUsers);
router.post("/", postUser);
router.get("/:cognitoId", getUser);
router.patch("/:userId/team", updateUserTeam);

// POST-based alternative for API Gateway compatibility
router.post("/update-team", (req, res) => {
  const { userId, teamId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }
  // Set userId as a parameter for updateUserTeam
  // Use type assertion to add userId to params
  req.params = {
    ...req.params,
    userId: userId.toString()
  };
  // Forward to the PATCH implementation
  return updateUserTeam(req, res);
});

export default router;
