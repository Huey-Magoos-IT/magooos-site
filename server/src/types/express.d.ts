import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        cognitoId: string;
        username: string;
      };
    }
  }
}

export {};