import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Authentication middleware to extract user information from the Authorization header
 * and attach it to the request object.
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization;
    
    // Log the auth header for debugging
    console.log(`[authMiddleware] Auth header: ${authHeader ? 'Present' : 'Missing'}`);
    console.log(`[authMiddleware] Path: ${req.path}`);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[authMiddleware] No valid Authorization header found');
      return next(); // Continue without user info
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('[authMiddleware] Token not found in Authorization header');
      return next(); // Continue without user info
    }
    
    // Extract the Cognito ID from the token
    // This is a simplified approach - in a real implementation, you would verify the token
    try {
      // For debugging, log the token (first 20 chars)
      console.log(`[authMiddleware] Token: ${token.substring(0, 20)}...`);
      
      // Find the user by Cognito ID
      // In a real implementation, you would extract the Cognito ID from the token
      // For now, we'll use a dummy user ID for testing
      const userId = 29; // Admin user ID
      const username = 'admin';
      
      // Attach user info to request
      req.user = {
        userId,
        username
      };
      
      console.log(`[authMiddleware] User attached to request: ${req.user.username} (${req.user.userId})`);
    } catch (error) {
      console.error('[authMiddleware] Error processing token:', error);
      // Continue without user info
    }
    
    next();
  } catch (error) {
    console.error('[authMiddleware] Unexpected error:', error);
    next();
  }
};