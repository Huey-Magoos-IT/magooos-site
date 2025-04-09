import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Authentication middleware to extract user information from the Authorization header
 * and attach it to the request object.
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(`[authMiddleware] Path: ${req.path}`);
    console.log(`[authMiddleware] Headers: ${JSON.stringify(req.headers)}`);
    
    // Multiple authentication methods for flexibility with API Gateway
    let userId = null;
    let username = null;
    
    // Method 1: Check for Cognito ID in Authorization header (JWT token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('[authMiddleware] Authorization header found');
      
      // Extract the token
      const token = authHeader.split(' ')[1];
      console.log(`[authMiddleware] Token: ${token.substring(0, 20)}...`);
      
      try {
        // Simple approach to extract the Cognito ID from the token
        // In a production system, we would use a proper JWT library
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log('[authMiddleware] Token payload:', JSON.stringify(payload));
          
          // Extract the Cognito ID (sub claim)
          const cognitoIdFromToken = payload.sub;
          if (cognitoIdFromToken) {
            console.log(`[authMiddleware] Extracted Cognito ID from token: ${cognitoIdFromToken}`);
            
            // Look up the user by Cognito ID
            const userFromToken = await prisma.user.findUnique({
              where: { cognitoId: cognitoIdFromToken }
            });
            
            if (userFromToken) {
              console.log(`[authMiddleware] Found user from token: ${userFromToken.username}`);
              userId = userFromToken.userId;
              username = userFromToken.username;
            }
          }
        }
      } catch (error) {
        console.error('[authMiddleware] Error extracting Cognito ID from token:', error);
      }
    }
    
    // Method 2: Check for Cognito ID in x-user-cognito-id header
    const cognitoId = req.headers['x-user-cognito-id'] as string;
    if (cognitoId) {
      console.log(`[authMiddleware] Using Cognito ID from header: ${cognitoId}`);
      const userFromCognito = await prisma.user.findUnique({
        where: { cognitoId }
      });
      
      if (userFromCognito) {
        console.log(`[authMiddleware] Found user from Cognito ID: ${userFromCognito.username}`);
        userId = userFromCognito.userId;
        username = userFromCognito.username;
      }
    }
    
    // Method 3: Check for requestingUserId in body
    if (!userId && req.body && req.body.requestingUserId) {
      console.log(`[authMiddleware] Using requestingUserId from body: ${req.body.requestingUserId}`);
      const userFromId = await prisma.user.findUnique({
        where: { userId: parseInt(req.body.requestingUserId) }
      });
      
      if (userFromId) {
        console.log(`[authMiddleware] Found user from ID: ${userFromId.username}`);
        userId = userFromId.userId;
        username = userFromId.username;
      }
    }
    
    // Fallback for 'admin' user in development/testing
    if (!userId && process.env.NODE_ENV !== 'production') {
      console.log('[authMiddleware] No authenticated user found, looking for admin user');
      // Find the admin user for testing purposes
      const adminUser = await prisma.user.findFirst({
        where: { username: 'admin' }
      });
      
      if (adminUser) {
        console.log('[authMiddleware] Using admin user as fallback in non-production mode');
        userId = adminUser.userId;
        username = adminUser.username;
      }
    }
    
    // If we found a user, attach it to the request
    if (userId && username) {
      req.user = {
        userId,
        username
      };
      console.log(`[authMiddleware] User attached to request: ${username} (${userId})`);
    } else {
      console.log('[authMiddleware] No user identified');
    }
    
    next();
  } catch (error) {
    console.error('[authMiddleware] Unexpected error:', error);
    next();
  }
};