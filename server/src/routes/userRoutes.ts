import { Router } from "express";

import { getUser, getUsers, postUser, updateUserTeam } from "../controllers/userController";

const router = Router();

router.get("/", getUsers);
router.post("/", postUser);
router.get("/:cognitoId", getUser);
router.patch("/:userId/team", updateUserTeam);

// Alternative POST endpoint using existing API Gateway patterns
router.post("/:userId", (req, res) => {
  const { userId } = req.params;
  const { teamId, action } = req.body;
  
  // Only process team update actions
  if (action === 'updateTeam' && teamId) {
    console.log("[POST /users/:userId] Team update action:", { userId, teamId });
    // Set userId as a parameter for updateUserTeam
    // Forward to the PATCH implementation
    return updateUserTeam(req, res);
  }
  
  // For non-team actions or no action specified, return error
  return res.status(400).json({
    message: "Invalid action or missing parameters",
    details: "For team updates, 'action' must be 'updateTeam' and 'teamId' must be provided"
  });
});

export default router;
