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
  deleteUser,
  listCognitoUsers,
  resendVerificationLink,
  deleteCognitoUser,
  getPriceUsers,
  toggleUserStatus,
  updateUserEmail,
  adminResetUserPassword,
} from "../controllers/userController";

const router = Router();

// --- Standard User Routes ---

router.get("/", getUsers); // GET all users from local DB
router.post("/", postUser); // POST a new user (typically called by Cognito post-confirmation Lambda)
router.get("/:cognitoId", getUser); // GET a specific user by cognitoId from local DB
router.patch("/:userId/team", updateUserTeam); // PATCH to update a user's team
router.patch("/:id/locations", updateUserLocations); // PATCH to update a user's assigned locations
router.post("/location-user", createLocationUser); // POST to create a new location user
router.patch("/:userId/disable", disableUser); // PATCH to disable a user (in DB and Cognito)
router.patch("/:userId/enable", enableUser); // PATCH to enable a user (in DB and Cognito)
router.delete("/:userId", deleteUser); // DELETE a user (permanent from DB and Cognito)
router.patch("/:userId/email", updateUserEmail); // PATCH to update a user's email
router.patch("/:userId/reset-password", adminResetUserPassword); // PATCH to reset a user's password

// --- Cognito Management Routes ---
router.get("/cognito/list", listCognitoUsers); // GET Cognito users with optional filtering
router.post("/cognito/:username/resend-verification", resendVerificationLink); // POST to resend verification link
router.delete("/cognito/:username", deleteCognitoUser); // DELETE a Cognito user

// --- Price User Management Routes ---
router.get("/price-users", getPriceUsers); // GET users with PRICE_USER role
router.patch("/:userId/toggle-status", toggleUserStatus); // PATCH to toggle user status (lock/unlock)

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
