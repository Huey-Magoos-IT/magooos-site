import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Get all groups (admin) or assigned group (locationAdmin)
 */
export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("[GET /groups] Fetching groups");
    
    // Fetch all groups with their users
    const groups = await prisma.$queryRaw`
      SELECT g.*,
        (SELECT json_agg(json_build_object('userId', u."userId", 'username', u.username))
         FROM "User" u
         WHERE u."groupId" = g.id) as users
      FROM "Group" g
    `;
    
    console.log(`[GET /groups] Found ${(groups as any[]).length} groups`);
    
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
  try {
    const { name, description, locationIds = [] } = req.body;
    console.log("[POST /groups] Creating group:", { name, description, locationCount: locationIds.length });
    
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.error("[POST /groups] Invalid group name");
      res.status(400).json({ message: "Group name is required" });
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
    
    // Check if user exists
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
    
    if (!targetUser) {
      console.error("[POST /groups/assign] User not found");
      res.status(404).json({ message: "User not found" });
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