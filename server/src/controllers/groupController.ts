import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Get all groups (admin) or assigned group (locationAdmin)
 */
export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("[GET /groups] Fetching groups");
    console.log("[GET /groups] Headers:", JSON.stringify(req.headers));
    
    // Multiple authentication methods for flexibility with API Gateway
    let userId = null;
    
    // Method 1: Check for user in req.user (set by middleware)
    if (req.user?.userId) {
      console.log("[GET /groups] Using userId from req.user:", req.user.userId);
      userId = req.user.userId;
    }
    
    // Method 2: Check for Cognito ID in headers (traditional auth)
    if (!userId) {
      const cognitoId = req.headers['x-user-cognito-id'] as string;
      if (cognitoId) {
        console.log("[GET /groups] Using Cognito ID from header:", cognitoId);
        const userFromCognito = await prisma.user.findUnique({
          where: { cognitoId }
        });
        
        if (userFromCognito) {
          console.log("[GET /groups] Found user from Cognito ID:", userFromCognito.username);
          userId = userFromCognito.userId;
        }
      }
    }
    
    // Method 3: Check for requestingUserId in body
    if (!userId && req.body && req.body.requestingUserId) {
      console.log("[GET /groups] Using requestingUserId from body:", req.body.requestingUserId);
      const userFromId = await prisma.user.findUnique({
        where: { userId: parseInt(req.body.requestingUserId) }
      });
      
      if (userFromId) {
        console.log("[GET /groups] Found user from ID:", userFromId.username);
        userId = userFromId.userId;
      }
    }
    
    // Fallback for 'admin' user in development/testing
    if (!userId && process.env.NODE_ENV !== 'production') {
      console.log("[GET /groups] No authenticated user found, looking for admin user");
      // Find the admin user for testing purposes
      const adminUser = await prisma.user.findFirst({
        where: { username: 'admin' }
      });
      
      if (adminUser) {
        console.log("[GET /groups] Using admin user as fallback in non-production mode");
        userId = adminUser.userId;
      }
    }
    
    if (!userId) {
      console.error("[GET /groups] No user ID in request");
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    // Get current user with roles
    const user = await prisma.user.findUnique({
      where: { userId },
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
    
    // Check if admin
    const isAdmin = user?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');
    const isLocationAdmin = user?.team?.teamRoles?.some((tr: any) => tr.role.name === 'LOCATION_ADMIN');
    
    console.log(`[GET /groups] User roles: Admin=${isAdmin}, LocationAdmin=${isLocationAdmin}`);
    
    if (isAdmin) {
      // Admins can see all groups
      const groups = await prisma.$queryRaw`
        SELECT g.*, 
          (SELECT json_agg(json_build_object('userId', u."userId", 'username', u.username))
           FROM "User" u
           WHERE u."groupId" = g.id) as users
        FROM "Group" g
      `;
      
      console.log(`[GET /groups] Found ${(groups as any[]).length} groups for admin`);
      res.json(groups);
    } else if (isLocationAdmin) {
      // LocationAdmins can only see their assigned group
      const userWithGroup = await prisma.$queryRaw`
        SELECT "groupId" FROM "User" WHERE "userId" = ${userId}
      `;
      
      if (!(userWithGroup as any[])[0]?.groupId) {
        console.error(`[GET /groups] No group assigned to LocationAdmin: ${userId}`);
        res.status(404).json({ message: "No group assigned" });
        return;
      }
      
      const group = await prisma.$queryRaw`
        SELECT g.*,
          (SELECT json_agg(json_build_object('userId', u."userId", 'username', u.username))
           FROM "User" u
           WHERE u."groupId" = g.id) as users
        FROM "Group" g
        WHERE g.id = ${(userWithGroup as any[])[0].groupId}
      `;
      
      if (!(group as any[])[0]) {
        console.error(`[GET /groups] Group not found for LocationAdmin: ${(userWithGroup as any[])[0].groupId}`);
        res.status(404).json({ message: "Group not found" });
        return;
      }
      
      console.log(`[GET /groups] Found group for LocationAdmin: ${(group as any[])[0].name}`);
      res.json([group]); // Return as array for consistent frontend handling
    } else {
      // Others can't see any groups
      console.error(`[GET /groups] Access denied for user: ${userId}`);
      res.status(403).json({ message: "Access denied: Requires ADMIN or LOCATION_ADMIN role" });
    }
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
  try {
    const { name, description, locationIds = [] } = req.body;
    console.log("[POST /groups] Creating group:", { name, description, locationCount: locationIds.length });
    console.log("[POST /groups] Headers:", JSON.stringify(req.headers));
    
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.error("[POST /groups] Invalid group name");
      res.status(400).json({ message: "Group name is required" });
      return;
    }
    
    // Multiple authentication methods for flexibility with API Gateway
    let userId = null;
    let user = null;
    
    // Method 1: Check for user in req.user (set by middleware)
    if (req.user?.userId) {
      console.log("[POST /groups] Using userId from req.user:", req.user.userId);
      userId = req.user.userId;
    }
    
    // Method 2: Check for Cognito ID in headers (traditional auth)
    if (!userId) {
      const cognitoId = req.headers['x-user-cognito-id'] as string;
      if (cognitoId) {
        console.log("[POST /groups] Using Cognito ID from header:", cognitoId);
        const userFromCognito = await prisma.user.findUnique({
          where: { cognitoId }
        });
        
        if (userFromCognito) {
          console.log("[POST /groups] Found user from Cognito ID:", userFromCognito.username);
          userId = userFromCognito.userId;
        }
      }
    }
    
    // Method 3: Check for requestingUserId in body
    if (!userId && req.body && req.body.requestingUserId) {
      console.log("[POST /groups] Using requestingUserId from body:", req.body.requestingUserId);
      const userFromId = await prisma.user.findUnique({
        where: { userId: parseInt(req.body.requestingUserId) }
      });
      
      if (userFromId) {
        console.log("[POST /groups] Found user from ID:", userFromId.username);
        userId = userFromId.userId;
      }
    }
    
    // Fallback for 'admin' user in development/testing
    if (!userId && process.env.NODE_ENV !== 'production') {
      console.log("[POST /groups] No authenticated user found, looking for admin user");
      // Find the admin user for testing purposes
      const adminUser = await prisma.user.findFirst({
        where: { username: 'admin' }
      });
      
      if (adminUser) {
        console.log("[POST /groups] Using admin user as fallback in non-production mode");
        userId = adminUser.userId;
      }
    }
    
    if (!userId) {
      console.error("[POST /groups] No user ID in request");
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    // Get user with roles
    user = await prisma.user.findUnique({
      where: { userId },
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
    
    const isAdmin = user?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');
    
    if (!isAdmin) {
      console.error("[POST /groups] Access denied: Not an admin");
      res.status(403).json({ message: "Access denied: Only admins can create groups" });
      return;
    }
    
    // Create group
    const group = await prisma.$executeRaw`
      INSERT INTO "Group" (name, description, "locationIds", "createdAt", "updatedAt")
      VALUES (${name.trim()}, ${description}, ${locationIds}::text[], NOW(), NOW())
      RETURNING *
    `;
    
    // Get the created group
    const createdGroup = await prisma.$queryRaw`
      SELECT * FROM "Group" WHERE name = ${name.trim()} ORDER BY id DESC LIMIT 1
    `;
    
    console.log(`[POST /groups] Group created: ${(createdGroup as any[])[0].id} - ${(createdGroup as any[])[0].name}`);
    res.status(201).json((createdGroup as any[])[0]);
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
  try {
    const groupId = parseInt(req.params.id);
    const { name, description, locationIds } = req.body;
    console.log("[PUT /groups/:id] Updating group:", { groupId, name, description, locationCount: locationIds?.length });
    console.log("[PUT /groups/:id] Headers:", JSON.stringify(req.headers));
    
    // Multiple authentication methods for flexibility with API Gateway
    let userId = null;
    let user = null;
    
    // Method 1: Check for user in req.user (set by middleware)
    if (req.user?.userId) {
      console.log("[PUT /groups/:id] Using userId from req.user:", req.user.userId);
      userId = req.user.userId;
    }
    
    // Method 2: Check for Cognito ID in headers (traditional auth)
    if (!userId) {
      const cognitoId = req.headers['x-user-cognito-id'] as string;
      if (cognitoId) {
        console.log("[PUT /groups/:id] Using Cognito ID from header:", cognitoId);
        const userFromCognito = await prisma.user.findUnique({
          where: { cognitoId }
        });
        
        if (userFromCognito) {
          console.log("[PUT /groups/:id] Found user from Cognito ID:", userFromCognito.username);
          userId = userFromCognito.userId;
        }
      }
    }
    
    // Method 3: Check for requestingUserId in body
    if (!userId && req.body && req.body.requestingUserId) {
      console.log("[PUT /groups/:id] Using requestingUserId from body:", req.body.requestingUserId);
      const userFromId = await prisma.user.findUnique({
        where: { userId: parseInt(req.body.requestingUserId) }
      });
      
      if (userFromId) {
        console.log("[PUT /groups/:id] Found user from ID:", userFromId.username);
        userId = userFromId.userId;
      }
    }
    
    // Fallback for 'admin' user in development/testing
    if (!userId && process.env.NODE_ENV !== 'production') {
      console.log("[PUT /groups/:id] No authenticated user found, looking for admin user");
      // Find the admin user for testing purposes
      const adminUser = await prisma.user.findFirst({
        where: { username: 'admin' }
      });
      
      if (adminUser) {
        console.log("[PUT /groups/:id] Using admin user as fallback in non-production mode");
        userId = adminUser.userId;
      }
    }
    
    if (!userId) {
      console.error("[PUT /groups/:id] No user ID in request");
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    // Get user with roles
    user = await prisma.user.findUnique({
      where: { userId },
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
    
    const isAdmin = user?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');
    
    if (!isAdmin) {
      console.error("[PUT /groups/:id] Access denied: Not an admin");
      res.status(403).json({ message: "Access denied: Only admins can update groups" });
      return;
    }
    
    // Update group
    await prisma.$executeRaw`
      UPDATE "Group"
      SET 
        name = ${name ? name.trim() : null},
        description = ${description},
        "locationIds" = ${locationIds ? locationIds : []},
        "updatedAt" = NOW()
      WHERE id = ${groupId}
    `;
    
    // Get the updated group
    const updatedGroup = await prisma.$queryRaw`
      SELECT * FROM "Group" WHERE id = ${groupId}
    `;
    
    // Update all LocationAdmin users assigned to this group
    // This ensures they always have access to all locations in their group
    if (locationIds) {
      await prisma.$executeRaw`
        UPDATE "User"
        SET "locationIds" = ${locationIds}
        WHERE "groupId" = ${groupId}
        AND EXISTS (
          SELECT 1 FROM "User" u
          JOIN "Team" t ON u."teamId" = t.id
          JOIN "TeamRole" tr ON tr."teamId" = t.id
          JOIN "Role" r ON tr."roleId" = r.id
          WHERE u."userId" = "User"."userId"
          AND r.name = 'LOCATION_ADMIN'
        )
      `;
      
      console.log(`[PUT /groups/:id] Updated locationIds for all LocationAdmin users in group ${groupId}`);
    }
    
    console.log(`[PUT /groups/:id] Group updated: ${(updatedGroup as any[])[0].id} - ${(updatedGroup as any[])[0].name}`);
    res.status(200).json((updatedGroup as any[])[0]);
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
  try {
    const { userId, groupId } = req.body;
    console.log("[POST /groups/assign] Assigning group to user:", { userId, groupId });
    console.log("[POST /groups/assign] Headers:", JSON.stringify(req.headers));
    
    // Multiple authentication methods for flexibility with API Gateway
    let adminId = null;
    let admin = null;
    
    // Method 1: Check for user in req.user (set by middleware)
    if (req.user?.userId) {
      console.log("[POST /groups/assign] Using userId from req.user:", req.user.userId);
      adminId = req.user.userId;
    }
    
    // Method 2: Check for Cognito ID in headers (traditional auth)
    if (!adminId) {
      const cognitoId = req.headers['x-user-cognito-id'] as string;
      if (cognitoId) {
        console.log("[POST /groups/assign] Using Cognito ID from header:", cognitoId);
        const userFromCognito = await prisma.user.findUnique({
          where: { cognitoId }
        });
        
        if (userFromCognito) {
          console.log("[POST /groups/assign] Found user from Cognito ID:", userFromCognito.username);
          adminId = userFromCognito.userId;
        }
      }
    }
    
    // Method 3: Check for requestingUserId in body
    if (!adminId && req.body && req.body.requestingUserId) {
      console.log("[POST /groups/assign] Using requestingUserId from body:", req.body.requestingUserId);
      const userFromId = await prisma.user.findUnique({
        where: { userId: parseInt(req.body.requestingUserId) }
      });
      
      if (userFromId) {
        console.log("[POST /groups/assign] Found user from ID:", userFromId.username);
        adminId = userFromId.userId;
      }
    }
    
    // Fallback for 'admin' user in development/testing
    if (!adminId && process.env.NODE_ENV !== 'production') {
      console.log("[POST /groups/assign] No authenticated user found, looking for admin user");
      // Find the admin user for testing purposes
      const adminUser = await prisma.user.findFirst({
        where: { username: 'admin' }
      });
      
      if (adminUser) {
        console.log("[POST /groups/assign] Using admin user as fallback in non-production mode");
        adminId = adminUser.userId;
      }
    }
    
    if (!adminId) {
      console.error("[POST /groups/assign] No user ID in request");
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    // Get admin user with roles
    admin = await prisma.user.findUnique({
      where: { userId: adminId },
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
    
    const isAdmin = admin?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');
    
    if (!isAdmin) {
      console.error("[POST /groups/assign] Access denied: Not an admin");
      res.status(403).json({ message: "Access denied: Only admins can assign groups" });
      return;
    }
    
    // Check if user has LOCATION_ADMIN role
    const targetUser = await prisma.user.findUnique({
      where: { userId: parseInt(userId) },
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
    
    const isLocationAdmin = targetUser?.team?.teamRoles?.some((tr: any) => tr.role.name === 'LOCATION_ADMIN');
    
    if (!isLocationAdmin) {
      console.error("[POST /groups/assign] User is not a LocationAdmin");
      res.status(400).json({ message: "User must have LOCATION_ADMIN role to be assigned a group" });
      return;
    }
    
    // Get the group to access its locations
    const group = await prisma.$queryRaw`
      SELECT * FROM "Group" WHERE id = ${parseInt(groupId)}
    `;
    
    if (!(group as any[])[0]) {
      console.error("[POST /groups/assign] Group not found");
      res.status(404).json({ message: "Group not found" });
      return;
    }
    
    // Update user with group and give access to all group locations
    await prisma.$executeRaw`
      UPDATE "User"
      SET 
        "groupId" = ${parseInt(groupId)},
        "locationIds" = ${(group as any[])[0].locationIds}
      WHERE "userId" = ${parseInt(userId)}
    `;
    
    console.log(`[POST /groups/assign] Group ${groupId} assigned to user ${userId}`);
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
    console.log(`[GET /groups/locations/${locationId}/users] Headers:`, JSON.stringify(req.headers));
    
    // Multiple authentication methods for flexibility with API Gateway
    let userId = null;
    let user = null;
    
    // Method 1: Check for user in req.user (set by middleware)
    if (req.user?.userId) {
      console.log(`[GET /groups/locations/${locationId}/users] Using userId from req.user:`, req.user.userId);
      userId = req.user.userId;
    }
    
    // Method 2: Check for Cognito ID in headers (traditional auth)
    if (!userId) {
      const cognitoId = req.headers['x-user-cognito-id'] as string;
      if (cognitoId) {
        console.log(`[GET /groups/locations/${locationId}/users] Using Cognito ID from header:`, cognitoId);
        const userFromCognito = await prisma.user.findUnique({
          where: { cognitoId }
        });
        
        if (userFromCognito) {
          console.log(`[GET /groups/locations/${locationId}/users] Found user from Cognito ID:`, userFromCognito.username);
          userId = userFromCognito.userId;
        }
      }
    }
    
    // Method 3: Check for requestingUserId in body
    if (!userId && req.body && req.body.requestingUserId) {
      console.log(`[GET /groups/locations/${locationId}/users] Using requestingUserId from body:`, req.body.requestingUserId);
      const userFromId = await prisma.user.findUnique({
        where: { userId: parseInt(req.body.requestingUserId) }
      });
      
      if (userFromId) {
        console.log(`[GET /groups/locations/${locationId}/users] Found user from ID:`, userFromId.username);
        userId = userFromId.userId;
      }
    }
    
    // Fallback for 'admin' user in development/testing
    if (!userId && process.env.NODE_ENV !== 'production') {
      console.log(`[GET /groups/locations/${locationId}/users] No authenticated user found, looking for admin user`);
      // Find the admin user for testing purposes
      const adminUser = await prisma.user.findFirst({
        where: { username: 'admin' }
      });
      
      if (adminUser) {
        console.log(`[GET /groups/locations/${locationId}/users] Using admin user as fallback in non-production mode`);
        userId = adminUser.userId;
      }
    }
    
    if (!userId) {
      console.error(`[GET /groups/locations/${locationId}/users] No user ID in request`);
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    // Get user with roles
    user = await prisma.user.findUnique({
      where: { userId },
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
    
    // Also get user's group to check location access
    const userWithGroup = await prisma.$queryRaw`
      SELECT u."groupId", g."locationIds"
      FROM "User" u
      LEFT JOIN "Group" g ON u."groupId" = g.id
      WHERE u."userId" = ${userId}
    `;
    
    const isAdmin = user?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');
    const isLocationAdmin = user?.team?.teamRoles?.some((tr: any) => tr.role.name === 'LOCATION_ADMIN');
    
    // For LocationAdmin users, check if the location is in their group
    if (isLocationAdmin && !isAdmin) {
      const userGroup = (userWithGroup as any[])[0];
      if (!userGroup || !userGroup.locationIds.includes(locationId)) {
        console.error(`[GET /groups/locations/${locationId}/users] Access denied: Location not in user's group`);
        res.status(403).json({ message: "Access denied: Location not in your group" });
        return;
      }
    }
    
    // Find all users with this location
    const users = await prisma.$queryRaw`
      SELECT u.*, 
        (SELECT json_build_object(
          'id', t.id,
          'teamName', t."teamName",
          'isAdmin', t."isAdmin",
          'teamRoles', (
            SELECT json_agg(json_build_object(
              'id', tr.id,
              'teamId', tr."teamId",
              'roleId', tr."roleId",
              'role', json_build_object(
                'id', r.id,
                'name', r.name,
                'description', r.description
              )
            ))
            FROM "TeamRole" tr
            JOIN "Role" r ON tr."roleId" = r.id
            WHERE tr."teamId" = t.id
          )
        ))
        FROM "User" u
        LEFT JOIN "Team" t ON u."teamId" = t.id
        WHERE ${locationId} = ANY(u."locationIds")
    `;
    
    console.log(`[GET /groups/locations/${locationId}/users] Found ${(users as any[]).length} users`);
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
  try {
    const groupId = parseInt(req.params.id);
    console.log(`[DELETE /groups/${groupId}] Deleting group`);
    console.log(`[DELETE /groups/${groupId}] Headers:`, JSON.stringify(req.headers));
    
    // Multiple authentication methods for flexibility with API Gateway
    let userId = null;
    let user = null;
    
    // Method 1: Check for user in req.user (set by middleware)
    if (req.user?.userId) {
      console.log(`[DELETE /groups/${groupId}] Using userId from req.user:`, req.user.userId);
      userId = req.user.userId;
    }
    
    // Method 2: Check for Cognito ID in headers (traditional auth)
    if (!userId) {
      const cognitoId = req.headers['x-user-cognito-id'] as string;
      if (cognitoId) {
        console.log(`[DELETE /groups/${groupId}] Using Cognito ID from header:`, cognitoId);
        const userFromCognito = await prisma.user.findUnique({
          where: { cognitoId }
        });
        
        if (userFromCognito) {
          console.log(`[DELETE /groups/${groupId}] Found user from Cognito ID:`, userFromCognito.username);
          userId = userFromCognito.userId;
        }
      }
    }
    
    // Method 3: Check for requestingUserId in body
    if (!userId && req.body && req.body.requestingUserId) {
      console.log(`[DELETE /groups/${groupId}] Using requestingUserId from body:`, req.body.requestingUserId);
      const userFromId = await prisma.user.findUnique({
        where: { userId: parseInt(req.body.requestingUserId) }
      });
      
      if (userFromId) {
        console.log(`[DELETE /groups/${groupId}] Found user from ID:`, userFromId.username);
        userId = userFromId.userId;
      }
    }
    
    // Fallback for 'admin' user in development/testing
    if (!userId && process.env.NODE_ENV !== 'production') {
      console.log(`[DELETE /groups/${groupId}] No authenticated user found, looking for admin user`);
      // Find the admin user for testing purposes
      const adminUser = await prisma.user.findFirst({
        where: { username: 'admin' }
      });
      
      if (adminUser) {
        console.log(`[DELETE /groups/${groupId}] Using admin user as fallback in non-production mode`);
        userId = adminUser.userId;
      }
    }
    
    if (!userId) {
      console.error(`[DELETE /groups/${groupId}] No user ID in request`);
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    // Get user with roles
    user = await prisma.user.findUnique({
      where: { userId },
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
    
    const isAdmin = user?.team?.teamRoles?.some((tr: any) => tr.role.name === 'ADMIN');
    
    if (!isAdmin) {
      console.error(`[DELETE /groups/${groupId}] Access denied: Not an admin`);
      res.status(403).json({ message: "Access denied: Only admins can delete groups" });
      return;
    }
    
    // Update all users to remove group and location access
    await prisma.$executeRaw`
      UPDATE "User"
      SET
        "groupId" = NULL,
        "locationIds" = '{}'::text[]
      WHERE "groupId" = ${groupId}
    `;
    
    console.log(`[DELETE /groups/${groupId}] Removed group and locations from users`);
    
    // Delete the group
    await prisma.$executeRaw`
      DELETE FROM "Group"
      WHERE id = ${groupId}
    `;
    
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
