import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error']
});

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving users: ${error.message}` });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  const { cognitoId } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: {
        cognitoId: cognitoId,
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

    // Explicitly format the response to ensure teamRoles are included
    if (user && user.team) {
      const formattedUser = {
        ...user,
        team: {
          ...user.team,
          // Ensure teamRoles are explicitly mapped in the response
          teamRoles: user.team.teamRoles?.map(tr => ({
            id: tr.id,
            teamId: tr.teamId,
            roleId: tr.roleId,
            role: {
              id: tr.role.id,
              name: tr.role.name,
              description: tr.role.description
            }
          })) || []
        }
      };
      console.log("User with roles:", JSON.stringify({
        userId: formattedUser.userId,
        username: formattedUser.username,
        teamName: formattedUser.team.teamName,
        roleCount: formattedUser.team.teamRoles.length,
        roles: formattedUser.team.teamRoles.map(tr => tr.role.name)
      }));
      
      res.setHeader('Content-Type', 'application/json');
      res.json(formattedUser);
      return; // Return void, not a value
    }

    // If no user or no team, return as is
    res.json(user);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving user: ${error.message}` });
  }
};

export const postUser = async (req: Request, res: Response) => {
  try {
    const {
      username,
      cognitoId,
      profilePictureUrl = "i1.jpg",
      teamId = 1,
    } = req.body;
    
    const newUser = await prisma.user.create({
      data: {
        username,
        cognitoId,
        profilePictureUrl,
        teamId,
      },
    });
    res.json({ message: "User Created Successfully", newUser });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error creating user: ${error.message}` });
  }
};
