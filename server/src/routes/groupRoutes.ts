import { Router } from "express";
import { PrismaClient } from "@prisma/client";

import {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  assignGroupToUser,
  getLocationUsers,
  deleteGroupPost,
  removeUserFromGroup
} from "../controllers/groupController";

const router = Router();
const prisma = new PrismaClient();

// Group management
router.get("/", getGroups);
router.post("/", createGroup);
router.put("/:id", updateGroup);
router.delete("/:id", deleteGroup);
router.post("/assign", assignGroupToUser);
router.post("/remove-user", removeUserFromGroup);

// Alternative endpoints for API Gateway compatibility
router.post("/:id/delete", deleteGroupPost);
router.post("/delete-group", deleteGroupPost); // Fallback endpoint without path parameter

// Location users
router.get("/locations/:locationId/users", getLocationUsers);

// Special endpoint for removing a user from any group
router.post("/remove-user-from-group", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    console.log("[POST /groups/remove-user-from-group] Removing user from group:", { userId });
    
    // Update the user to set groupId to null and clear locationIds
    const updatedUser = await prisma.user.update({
      where: { userId: Number(userId) },
      data: { 
        groupId: null,
        locationIds: []
      },
      include: {
        group: true // Include null group info for consistency with other endpoints
      }
    });
    
    console.log("[POST /groups/remove-user-from-group] User removed from group:", {
      userId: updatedUser.userId,
      username: updatedUser.username
    });
    
    res.json(updatedUser);
  } catch (error: any) {
    console.error("[POST /groups/remove-user-from-group] Error:", error);
    res.status(500).json({
      message: "Error removing user from group",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Debug endpoint to check all groups
router.get("/debug-groups", async (req, res) => {
  try {
    console.log("[GET /groups/debug-groups] Checking all groups");
    
    const groups = await prisma.group.findMany({
      include: {
        users: {
          select: {
            userId: true,
            username: true,
            locationIds: true
          }
        }
      }
    });
    
    // Set no-cache headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    const simplified = groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      locationCount: group.locationIds.length,
      locationIds: group.locationIds,
      userCount: group.users.length,
      users: group.users.map(user => ({
        userId: user.userId,
        username: user.username,
        locationCount: user.locationIds.length
      }))
    }));
    
    res.json(simplified);
  } catch (error) {
    console.error("[GET /groups/debug-groups] Error:", error);
    res.status(500).json({ message: "Error fetching groups" });
  }
});

export default router;