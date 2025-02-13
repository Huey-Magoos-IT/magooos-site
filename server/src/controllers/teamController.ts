import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("[GET /teams] Fetching all teams");
    
    const teams = await prisma.team.findMany({
      include: {
        user: {
          select: {
            userId: true,
            username: true
          }
        }
      }
    });

    console.log(`[GET /teams] Found ${teams.length} teams`);
    res.json(teams);
  } catch (error: any) {
    console.error("[GET /teams] Error:", error);
    res.status(500).json({ 
      message: "Error retrieving teams",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const createTeam = async (req: Request, res: Response): Promise<void> => {
  const { teamName, isAdmin } = req.body;
  console.log("[POST /teams] Creating team:", { teamName, isAdmin });

  // Validate input
  if (!teamName || typeof teamName !== 'string' || teamName.trim().length === 0) {
    console.error("[POST /teams] Invalid team name");
    res.status(400).json({ message: "Team name is required" });
    return;
  }

  try {
    // Check if team name already exists
    const existingTeam = await prisma.team.findFirst({
      where: { teamName: teamName.trim() }
    });

    if (existingTeam) {
      console.error("[POST /teams] Team name already exists:", teamName);
      res.status(409).json({ message: "Team name already exists" });
      return;
    }

    const team = await prisma.team.create({
      data: {
        teamName: teamName.trim(),
        isAdmin: Boolean(isAdmin)
      }
    });

    console.log("[POST /teams] Team created:", team);
    res.status(201).json(team);
  } catch (error: any) {
    console.error("[POST /teams] Error:", error);
    res.status(500).json({ 
      message: "Error creating team",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const joinTeam = async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.params;
  const { userId } = req.body;
  console.log("[POST /teams/join] Joining team:", { teamId, userId });

  if (!teamId || !userId) {
    console.error("[POST /teams/join] Missing required fields");
    res.status(400).json({ message: "Team ID and User ID are required" });
    return;
  }

  try {
    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: Number(teamId) }
    });

    if (!team) {
      console.error("[POST /teams/join] Team not found:", teamId);
      res.status(404).json({ message: "Team not found" });
      return;
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { userId: Number(userId) }
    });

    if (!user) {
      console.error("[POST /teams/join] User not found:", userId);
      res.status(404).json({ message: "User not found" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { userId: Number(userId) },
      data: { teamId: Number(teamId) },
      include: { team: true }
    });

    console.log("[POST /teams/join] User joined team:", updatedUser);
    res.json(updatedUser);
  } catch (error: any) {
    console.error("[POST /teams/join] Error:", error);
    res.status(500).json({ 
      message: "Error joining team",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
