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
  const { teamName, isAdmin } = req.body;

  try {
    const team = await prisma.team.create({
      data: {
        teamName,
        isAdmin: isAdmin || false
      }
    });

    res.json(team);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error creating team: ${error.message}` });
  }
};

export const joinTeam = async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.params;
  const { userId } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { userId: Number(userId) },
      data: { teamId: Number(teamId) },
      include: { team: true }
    });

    res.json(updatedUser);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error joining team: ${error.message}` });
  }
};
