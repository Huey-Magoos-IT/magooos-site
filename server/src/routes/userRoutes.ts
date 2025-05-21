import { Router } from "express";

import {
  getUser,
  getUsers,
  postUser,
  updateUserTeam,
  updateUserLocations,
  createLocationUser,
  disableUser,
  enableUser,
  deleteUser
} from "../controllers/userController";

const router = Router();

router.get("/", getUsers);
router.post("/", postUser);
router.get("/:cognitoId", getUser);
router.patch("/:userId/team", updateUserTeam);
router.patch("/:id/locations", updateUserLocations);
router.post("/location-user", createLocationUser);
router.patch("/:userId/disable", disableUser);
router.patch("/:userId/enable", enableUser);
router.delete("/:userId", deleteUser);

// Alternative POST endpoint using existing API Gateway patterns - fixed URL approach
router.post("/team-assignment", (req, res) => {
  const { userId, teamId } = req.body;
  
  console.log("[POST /users/team-assignment] Team update request:", { userId, teamId });
  
  if (!userId || !teamId) {
    return res.status(400).json({
      message: "Invalid parameters",
      details: "Both userId and teamId are required"
    });
  }

  // Set the userId in params for compatibility with the updateUserTeam function
  req.params = {
    ...req.params,
    userId: userId.toString()
  };
  
  // Forward to the PATCH implementation
  return updateUserTeam(req, res);
});

export default router;
