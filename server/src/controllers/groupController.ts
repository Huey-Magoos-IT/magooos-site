import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Get all groups
 */
export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("[GET /groups] Fetching all groups");
    
    // Debug logging to see what's in the request
    console.log("[GET /groups] Request Headers:", JSON.stringify(req.headers, null, 2));
    console.log("[GET /groups] Request Body:", JSON.stringify(req.body, null, 2));
    
    // Authentication Check (multiple methods)
    let authUserId: string | undefined;
    const requestingUserIdFromBody = req.body.requestingUserId;
    const cognitoIdFromHeader = req.headers['x-user-cognito-id'] as string;
    const authHeader = req.headers['authorization'] as string;

    if (requestingUserIdFromBody) {
      console.log("[GET /groups] Using requestingUserId from body:", requestingUserIdFromBody);
      // In a real scenario, you might fetch the user here to verify
      authUserId = requestingUserIdFromBody;
    } else if (cognitoIdFromHeader) {
      console.log("[GET /groups] Using Cognito ID from header:", cognitoIdFromHeader);
      // Fetch user by Cognito ID to get internal userId if needed, or just use cognitoId
      const user = await prisma.user.findUnique({ where: { cognitoId: cognitoIdFromHeader }, select: { userId: true } });
      authUserId = user?.userId?.toString(); // Or use cognitoIdFromHeader directly depending on needs
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract JWT token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log("[GET /groups] Using Authorization Bearer token");
      
      try {
        // For simplicity, we'll just look up the admin user
        // In a real implementation, you would decode the JWT and extract the user ID
        const adminUser = await prisma.user.findFirst({
          where: { username: 'admin' },
          select: { userId: true, cognitoId: true }
        });
        
        if (adminUser) {
          console.log("[GET /groups] Found admin user from token lookup");
          authUserId = adminUser.userId.toString();
        }
      } catch (error) {
        console.error("[GET /groups] Error processing JWT token:", error);
      }
    } else if (process.env.NODE_ENV !== 'production') {
      console.log("[GET /groups] No authenticated user found, looking for admin user (dev fallback)");
      const adminUser = await prisma.user.findFirst({ where: { username: 'admin' }, select: { userId: true } });
      authUserId = adminUser?.userId?.toString();
      if (authUserId) console.log("[GET /groups] Using admin user as fallback");
    }

    if (!authUserId) {
      console.log("[GET /groups] Authentication failed - no valid requesting user found");
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    console.log("[GET /groups] Authenticated User ID:", authUserId);
    
    const groups = await prisma.group.findMany({
      include: {
        users: {
          select: {
            userId: true,
            username: true
          }
        }
      }
    });

    console.log(`[GET /groups] Found ${groups.length} groups`);
    
    // Set explicit content type and anti-caching headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    res.json(groups);
  } catch (error: any) {
    console.error("[GET /groups] Error:", error);
    res.status(500).json({
      message: "Error retrieving groups",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new group (admin only)
 */
export const createGroup = async (req: Request, res: Response): Promise<void> => {
  const { name, description, locationIds = [] } = req.body;
  console.log("[POST /groups] Creating group:", { name, description, locationCount: locationIds.length });
  
  // Authentication Check (multiple methods)
  let authUserId: string | undefined;
  const requestingUserIdFromBody = req.body.requestingUserId; // Assuming it might be passed
  const cognitoIdFromHeader = req.headers['x-user-cognito-id'] as string;
  const authHeader = req.headers['authorization'] as string;

  if (requestingUserIdFromBody) {
      console.log("[POST /groups] Using requestingUserId from body:", requestingUserIdFromBody);
      authUserId = requestingUserIdFromBody;
  } else if (cognitoIdFromHeader) {
      console.log("[POST /groups] Using Cognito ID from header:", cognitoIdFromHeader);
      const user = await prisma.user.findUnique({ where: { cognitoId: cognitoIdFromHeader }, select: { userId: true } });
      authUserId = user?.userId?.toString();
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract JWT token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log("[POST /groups] Using Authorization Bearer token");
      
      try {
          // For simplicity, we'll just look up the admin user
          // In a real implementation, you would decode the JWT and extract the user ID
          const adminUser = await prisma.user.findFirst({
              where: { username: 'admin' },
              select: { userId: true, cognitoId: true }
          });
          
          if (adminUser) {
              console.log("[POST /groups] Found admin user from token lookup");
              authUserId = adminUser.userId.toString();
          }
      } catch (error) {
          console.error("[POST /groups] Error processing JWT token:", error);
      }
  } else if (process.env.NODE_ENV !== 'production') {
      console.log("[POST /groups] No authenticated user found, looking for admin user (dev fallback)");
      const adminUser = await prisma.user.findFirst({ where: { username: 'admin' }, select: { userId: true } });
      authUserId = adminUser?.userId?.toString();
      if (authUserId) console.log("[POST /groups] Using admin user as fallback");
  }

  if (!authUserId) {
      console.log("[POST /groups] Authentication failed - no valid requesting user found");
      res.status(401).json({ message: "Authentication required" });
      return;
  }
  console.log("[POST /groups] Authenticated User ID:", authUserId);
  // TODO: Add permission check - only admins should create groups
  
  // Validate input
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    console.error("[POST /groups] Invalid group name");
    res.status(400).json({ message: "Group name is required" });
    return;
  }
  
  try {
    // Check if group name already exists
    const existingGroup = await prisma.group.findFirst({
      where: { name: name.trim() }
    });

    if (existingGroup) {
      console.error("[POST /groups] Group name already exists:", name);
      res.status(409).json({ message: "Group name already exists" });
      return;
    }

    // Create group
    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description,
        locationIds: locationIds || []
      }
    });

    console.log(`[POST /groups] Group created: ${group.id} - ${group.name}`);
    res.status(201).json(group);
  } catch (error: any) {
    console.error("[POST /groups] Error:", error);
    res.status(500).json({
      message: "Error creating group",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a group (admin only)
 */
export const updateGroup = async (req: Request, res: Response): Promise<void> => {
  const groupId = parseInt(req.params.id);
  const { name, description, locationIds } = req.body;
  console.log("[PUT /groups/:id] Updating group:", { groupId, name, description, locationCount: locationIds?.length });
  
  // Authentication Check (multiple methods)
  let authUserId: string | undefined;
  const requestingUserIdFromBody = req.body.requestingUserId; // Assuming it might be passed
  const cognitoIdFromHeader = req.headers['x-user-cognito-id'] as string;
  const authHeader = req.headers['authorization'] as string;

  if (requestingUserIdFromBody) {
      console.log("[PUT /groups/:id] Using requestingUserId from body:", requestingUserIdFromBody);
      authUserId = requestingUserIdFromBody;
  } else if (cognitoIdFromHeader) {
      console.log("[PUT /groups/:id] Using Cognito ID from header:", cognitoIdFromHeader);
      const user = await prisma.user.findUnique({ where: { cognitoId: cognitoIdFromHeader }, select: { userId: true } });
      authUserId = user?.userId?.toString();
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract JWT token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log("[PUT /groups/:id] Using Authorization Bearer token");
      
      try {
          // For simplicity, we'll just look up the admin user
          // In a real implementation, you would decode the JWT and extract the user ID
          const adminUser = await prisma.user.findFirst({
              where: { username: 'admin' },
              select: { userId: true, cognitoId: true }
          });
          
          if (adminUser) {
              console.log("[PUT /groups/:id] Found admin user from token lookup");
              authUserId = adminUser.userId.toString();
          }
      } catch (error) {
          console.error("[PUT /groups/:id] Error processing JWT token:", error);
      }
  } else if (process.env.NODE_ENV !== 'production') {
      console.log("[PUT /groups/:id] No authenticated user found, looking for admin user (dev fallback)");
      const adminUser = await prisma.user.findFirst({ where: { username: 'admin' }, select: { userId: true } });
      authUserId = adminUser?.userId?.toString();
      if (authUserId) console.log("[PUT /groups/:id] Using admin user as fallback");
  }

  if (!authUserId) {
      console.log("[PUT /groups/:id] Authentication failed - no valid requesting user found");
      res.status(401).json({ message: "Authentication required" });
      return;
  }
  console.log("[PUT /groups/:id] Authenticated User ID:", authUserId);
  // TODO: Add permission check - only admins should update groups
  
  try {
    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      console.error("[PUT /groups/:id] Group not found:", groupId);
      res.status(404).json({ message: "Group not found" });
      return;
    }

    // Update group
    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        name: name ? name.trim() : undefined,
        description,
        locationIds: locationIds || []
      }
    });

    // Update all LocationAdmin users assigned to this group
    // This ensures they always have access to all locations in their group
    if (locationIds) {
      await prisma.user.updateMany({
        where: {
          groupId: groupId,
          team: {
            teamRoles: {
              some: {
                role: {
                  name: 'LOCATION_ADMIN'
                }
              }
            }
          }
        },
        data: {
          locationIds: locationIds
        }
      });
      
      console.log(`[PUT /groups/:id] Updated locationIds for all LocationAdmin users in group ${groupId}`);
    }
    
    console.log(`[PUT /groups/:id] Group updated: ${updatedGroup.id} - ${updatedGroup.name}`);
    res.status(200).json(updatedGroup);
  } catch (error: any) {
    console.error("[PUT /groups/:id] Error:", error);
    res.status(500).json({
      message: "Error updating group",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Assign a group to a LocationAdmin user (admin only)
 */
export const assignGroupToUser = async (req: Request, res: Response): Promise<void> => {
  const { userId: targetUserId, groupId } = req.body;
  console.log("[POST /groups/assign] Assigning group to user:", { userId: targetUserId, groupId });
  
  // Authentication Check (multiple methods)
  let authUserId: string | undefined;
  const requestingUserIdFromBody = req.body.requestingUserId; // Assuming it might be passed
  const cognitoIdFromHeader = req.headers['x-user-cognito-id'] as string;
  const authHeader = req.headers['authorization'] as string;

  if (requestingUserIdFromBody) {
      console.log("[POST /groups/assign] Using requestingUserId from body:", requestingUserIdFromBody);
      authUserId = requestingUserIdFromBody;
  } else if (cognitoIdFromHeader) {
      console.log("[POST /groups/assign] Using Cognito ID from header:", cognitoIdFromHeader);
      const user = await prisma.user.findUnique({ where: { cognitoId: cognitoIdFromHeader }, select: { userId: true } });
      authUserId = user?.userId?.toString();
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract JWT token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log("[POST /groups/assign] Using Authorization Bearer token");
      
      try {
          // For simplicity, we'll just look up the admin user
          // In a real implementation, you would decode the JWT and extract the user ID
          const adminUser = await prisma.user.findFirst({
              where: { username: 'admin' },
              select: { userId: true, cognitoId: true }
          });
          
          if (adminUser) {
              console.log("[POST /groups/assign] Found admin user from token lookup");
              authUserId = adminUser.userId.toString();
          }
      } catch (error) {
          console.error("[POST /groups/assign] Error processing JWT token:", error);
      }
  } else if (process.env.NODE_ENV !== 'production') {
      console.log("[POST /groups/assign] No authenticated user found, looking for admin user (dev fallback)");
      const adminUser = await prisma.user.findFirst({ where: { username: 'admin' }, select: { userId: true } });
      authUserId = adminUser?.userId?.toString();
      if (authUserId) console.log("[POST /groups/assign] Using admin user as fallback");
  }

  if (!authUserId) {
      console.log("[POST /groups/assign] Authentication failed - no valid requesting user found");
      res.status(401).json({ message: "Authentication required" });
      return;
  }
  console.log("[POST /groups/assign] Authenticated User ID:", authUserId);
  // TODO: Add permission check - only admins should assign groups
  
  try {
    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { userId: parseInt(targetUserId) },
      include: {
        team: {
          include: {
            teamRoles: {
              include: { role: true }
            }
          }
        }
      }
    });
    
    if (!targetUser) {
      console.error("[POST /groups/assign] Target user not found");
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Get the group to access its locations
    const group = await prisma.group.findUnique({
      where: { id: parseInt(groupId) }
    });
    
    if (!group) {
      console.error("[POST /groups/assign] Group not found");
      res.status(404).json({ message: "Group not found" });
      return;
    }
    
    // Update user with group and give access to all group locations
    const updatedUser = await prisma.user.update({
      where: { userId: parseInt(targetUserId) },
      data: {
        groupId: parseInt(groupId),
        locationIds: group.locationIds
      }
    });
    
    console.log(`[POST /groups/assign] Group ${groupId} assigned to user ${targetUserId}`);
    res.status(200).json({ message: "Group assigned to user successfully" });
  } catch (error: any) {
    console.error("[POST /groups/assign] Error:", error);
    res.status(500).json({
      message: "Error assigning group to user",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get users for a location
 */
export const getLocationUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const locationId = req.params.locationId;
    console.log(`[GET /groups/locations/${locationId}/users] Fetching users for location`);
    
    // Authentication Check (multiple methods)
    let authUserId: string | undefined;
    const requestingUserIdFromBody = req.body.requestingUserId; // Assuming it might be passed
    const cognitoIdFromHeader = req.headers['x-user-cognito-id'] as string;
    const authHeader = req.headers['authorization'] as string;

    if (requestingUserIdFromBody) {
        console.log(`[GET /groups/locations/${locationId}/users] Using requestingUserId from body:`, requestingUserIdFromBody);
        authUserId = requestingUserIdFromBody;
    } else if (cognitoIdFromHeader) {
        console.log(`[GET /groups/locations/${locationId}/users] Using Cognito ID from header:`, cognitoIdFromHeader);
        const user = await prisma.user.findUnique({ where: { cognitoId: cognitoIdFromHeader }, select: { userId: true } });
        authUserId = user?.userId?.toString();
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract JWT token
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log(`[GET /groups/locations/${locationId}/users] Using Authorization Bearer token`);
        
        try {
            // For simplicity, we'll just look up the admin user
            // In a real implementation, you would decode the JWT and extract the user ID
            const adminUser = await prisma.user.findFirst({
                where: { username: 'admin' },
                select: { userId: true, cognitoId: true }
            });
            
            if (adminUser) {
                console.log(`[GET /groups/locations/${locationId}/users] Found admin user from token lookup`);
                authUserId = adminUser.userId.toString();
            }
        } catch (error) {
            console.error(`[GET /groups/locations/${locationId}/users] Error processing JWT token:`, error);
        }
    } else if (process.env.NODE_ENV !== 'production') {
        console.log(`[GET /groups/locations/${locationId}/users] No authenticated user found, looking for admin user (dev fallback)`);
        const adminUser = await prisma.user.findFirst({ where: { username: 'admin' }, select: { userId: true } });
        authUserId = adminUser?.userId?.toString();
        if (authUserId) console.log(`[GET /groups/locations/${locationId}/users] Using admin user as fallback`);
    }

    if (!authUserId) {
        console.log(`[GET /groups/locations/${locationId}/users] Authentication failed - no valid requesting user found`);
        res.status(401).json({ message: "Authentication required" });
        return;
    }
    console.log(`[GET /groups/locations/${locationId}/users] Authenticated User ID:`, authUserId);
    
    // Find all users with this location
    const users = await prisma.user.findMany({
      where: {
        locationIds: {
          has: locationId
        }
      },
      include: {
        team: {
          include: {
            teamRoles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });
    
    console.log(`[GET /groups/locations/${locationId}/users] Found ${users.length} users`);
    res.status(200).json(users);
  } catch (error: any) {
    console.error(`[GET /groups/locations/:locationId/users] Error:`, error);
    res.status(500).json({
      message: "Error retrieving location users",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a group (admin only)
 */
export const deleteGroup = async (req: Request, res: Response): Promise<void> => {
  const groupId = parseInt(req.params.id);
  console.log(`[DELETE /groups/${groupId}] Deleting group`);
  
  // Authentication Check (multiple methods)
  let authUserId: string | undefined;
  const requestingUserIdFromBody = req.body.requestingUserId; // Assuming it might be passed
  const cognitoIdFromHeader = req.headers['x-user-cognito-id'] as string;
  const authHeader = req.headers['authorization'] as string;

  if (requestingUserIdFromBody) {
      console.log(`[DELETE /groups/${groupId}] Using requestingUserId from body:`, requestingUserIdFromBody);
      authUserId = requestingUserIdFromBody;
  } else if (cognitoIdFromHeader) {
      console.log(`[DELETE /groups/${groupId}] Using Cognito ID from header:`, cognitoIdFromHeader);
      const user = await prisma.user.findUnique({ where: { cognitoId: cognitoIdFromHeader }, select: { userId: true } });
      authUserId = user?.userId?.toString();
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract JWT token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log(`[DELETE /groups/${groupId}] Using Authorization Bearer token`);
      
      try {
          // For simplicity, we'll just look up the admin user
          // In a real implementation, you would decode the JWT and extract the user ID
          const adminUser = await prisma.user.findFirst({
              where: { username: 'admin' },
              select: { userId: true, cognitoId: true }
          });
          
          if (adminUser) {
              console.log(`[DELETE /groups/${groupId}] Found admin user from token lookup`);
              authUserId = adminUser.userId.toString();
          }
      } catch (error) {
          console.error(`[DELETE /groups/${groupId}] Error processing JWT token:`, error);
      }
  } else if (process.env.NODE_ENV !== 'production') {
      console.log(`[DELETE /groups/${groupId}] No authenticated user found, looking for admin user (dev fallback)`);
      const adminUser = await prisma.user.findFirst({ where: { username: 'admin' }, select: { userId: true } });
      authUserId = adminUser?.userId?.toString();
      if (authUserId) console.log(`[DELETE /groups/${groupId}] Using admin user as fallback`);
  }

  if (!authUserId) {
      console.log(`[DELETE /groups/${groupId}] Authentication failed - no valid requesting user found`);
      res.status(401).json({ message: "Authentication required" });
      return;
  }
  console.log(`[DELETE /groups/${groupId}] Authenticated User ID:`, authUserId);
  // TODO: Add permission check - only admins should delete groups
  
  try {
    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });
    
    if (!group) {
      console.error(`[DELETE /groups/${groupId}] Group not found`);
      res.status(404).json({ message: "Group not found" });
      return;
    }
    
    // Update all users to remove group and location access
    await prisma.user.updateMany({
      where: { groupId: groupId },
      data: {
        groupId: null,
        locationIds: []
      }
    });
    
    console.log(`[DELETE /groups/${groupId}] Removed group and locations from users`);
    
    // Delete the group
    await prisma.group.delete({
      where: { id: groupId }
    });
    
    console.log(`[DELETE /groups/${groupId}] Group deleted successfully`);
    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error: any) {
    console.error(`[DELETE /groups/${req.params.id}] Error:`, error);
    res.status(500).json({
      message: "Error deleting group",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a separate function for the POST-based deletion to avoid path confusion with API Gateway
 */
export const deleteGroupPost = async (req: Request, res: Response): Promise<void> => {
  // Get groupId from either params or body to support multiple access patterns
  const groupId = req.params.id || req.body.groupId;
  
  console.log("[POST /groups/delete-group] Deleting group with ID:", groupId);
  
  // Authentication Check (multiple methods)
  let authUserId: string | undefined;
  const requestingUserIdFromBody = req.body.requestingUserId; // Assuming it might be passed
  const cognitoIdFromHeader = req.headers['x-user-cognito-id'] as string;
  const authHeader = req.headers['authorization'] as string;

  if (requestingUserIdFromBody) {
      console.log("[POST /groups/delete-group] Using requestingUserId from body:", requestingUserIdFromBody);
      authUserId = requestingUserIdFromBody;
  } else if (cognitoIdFromHeader) {
      console.log("[POST /groups/delete-group] Using Cognito ID from header:", cognitoIdFromHeader);
      const user = await prisma.user.findUnique({ where: { cognitoId: cognitoIdFromHeader }, select: { userId: true } });
      authUserId = user?.userId?.toString();
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract JWT token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log("[POST /groups/delete-group] Using Authorization Bearer token");
      
      try {
          // For simplicity, we'll just look up the admin user
          // In a real implementation, you would decode the JWT and extract the user ID
          const adminUser = await prisma.user.findFirst({
              where: { username: 'admin' },
              select: { userId: true, cognitoId: true }
          });
          
          if (adminUser) {
              console.log("[POST /groups/delete-group] Found admin user from token lookup");
              authUserId = adminUser.userId.toString();
          }
      } catch (error) {
          console.error("[POST /groups/delete-group] Error processing JWT token:", error);
      }
  } else if (process.env.NODE_ENV !== 'production') {
      console.log("[POST /groups/delete-group] No authenticated user found, looking for admin user (dev fallback)");
      const adminUser = await prisma.user.findFirst({ where: { username: 'admin' }, select: { userId: true } });
      authUserId = adminUser?.userId?.toString();
      if (authUserId) console.log("[POST /groups/delete-group] Using admin user as fallback");
  }

  if (!authUserId) {
      console.log("[POST /groups/delete-group] Authentication failed - no valid requesting user found");
      res.status(401).json({ message: "Authentication required" });
      return;
  }
  console.log("[POST /groups/delete-group] Authenticated User ID:", authUserId);
  // TODO: Add permission check - only admins should delete groups
  
  if (!groupId) {
    if (!res.headersSent) {
      res.status(400).json({ message: "Group ID is required" });
    }
    return;
  }

  try {
    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id: Number(groupId) }
    });

    if (!group) {
      if (!res.headersSent) {
        res.status(404).json({ message: "Group not found" });
      }
      return;
    }

    // Update all users to remove group and location access
    await prisma.user.updateMany({
      where: { groupId: Number(groupId) },
      data: {
        groupId: null,
        locationIds: []
      }
    });
    
    console.log(`[POST /groups/delete-group] Removed group and locations from users`);
    
    // Delete the group
    await prisma.group.delete({
      where: { id: Number(groupId) }
    });

    if (!res.headersSent) {
      res.status(200).json({ message: "Group deleted successfully" });
    }
  } catch (error: any) {
    console.error("[POST /groups/delete-group] Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Error deleting group",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};