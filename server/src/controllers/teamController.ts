import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const teams = await prisma.team.findMany();

    const teamsWithUsernames = await Promise.all(
      teams.map(async (team: any) => {
        const productOwner = await prisma.user.findUnique({
          where: { userId: team.productOwnerUserId! },
          select: { username: true },
        });

        const projectManager = await prisma.user.findUnique({
          where: { userId: team.projectManagerUserId! },
          select: { username: true },
        });

        return {
          ...team,
          productOwnerUsername: productOwner?.username,
          projectManagerUsername: projectManager?.username,
        };
      })
    );

    res.json(teamsWithUsernames);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving teams: ${error.message}` });
  }
};

export const createTeam = async (req: Request, res: Response): Promise<void> => {
  const { teamName, isAdmin = false } = req.body;
  try {
    const newTeam = await prisma.team.create({
      data: {
        teamName,
        isAdmin,
        productOwnerUserId: null,
        projectManagerUserId: null
      }
    });

    // Return in same format as getTeams
    const teamWithUsernames = {
      ...newTeam,
      productOwnerUsername: null,
      projectManagerUsername: null
    };

    res.status(201).json(teamWithUsernames);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error creating team: ${error.message}` });
  }
};
