import { Request, Response, NextFunction } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import prisma from "../lib/prisma";

// Cognito JWT verifier — caches JWKS keys automatically
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID || "us-east-2_5rTsYPjpA",
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID || "11rv3fvrcmla2kgi5fs1ois71f",
});

// Routes that don't require authentication
const PUBLIC_PATHS = ["/", "/health"];

/**
 * Phase A Auth Middleware — LOG ONLY, does NOT block requests.
 *
 * What it does:
 * 1. Extracts Bearer token from Authorization header
 * 2. Cryptographically verifies it against Cognito's public keys
 * 3. Looks up the user by cognitoId (JWT sub claim) in PostgreSQL
 * 4. Attaches the user to req.user
 * 5. Logs the result — but ALWAYS calls next() regardless of outcome
 *
 * Phase B will make this authoritative (reject requests without valid tokens).
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip auth for public paths
  if (PUBLIC_PATHS.includes(req.path)) {
    next();
    return;
  }

  const authHeader = req.headers["authorization"] as string;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log(
      `[AUTH] No Bearer token on ${req.method} ${req.path} — falling through to controller auth`
    );
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    // Verify token cryptographically against Cognito JWKS
    const payload = await verifier.verify(token);
    const cognitoId = payload.sub;

    // Look up user in database
    const user = await prisma.user.findUnique({
      where: { cognitoId },
      select: {
        userId: true,
        cognitoId: true,
        username: true,
      },
    });

    if (user) {
      req.user = user;
      console.log(
        `[AUTH] Verified: ${user.username} (userId: ${user.userId}) on ${req.method} ${req.path}`
      );
    } else {
      console.warn(
        `[AUTH] Valid token but no DB user for cognitoId: ${cognitoId} on ${req.method} ${req.path}`
      );
    }
  } catch (error: any) {
    console.warn(
      `[AUTH] Token verification failed on ${req.method} ${req.path}: ${error.message}`
    );
  }

  // Phase A: ALWAYS proceed — controllers still have their own auth fallbacks
  next();
};

export default authMiddleware;
