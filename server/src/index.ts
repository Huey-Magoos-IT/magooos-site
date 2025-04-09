import express, { Request, Response } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "./middleware/authMiddleware";
/* ROUTE IMPORTS */
import projectRoutes from "./routes/projectRoutes";
import taskRoutes from "./routes/taskRoutes";
import searchRoutes from "./routes/searchRoutes";
import userRoutes from "./routes/userRoutes";
import teamRoutes from "./routes/teamRoutes";
import groupRoutes from "./routes/groupRoutes";

/* CONFIGURATIONS */
dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://master.d25xr2dg5ij9ce.amplifyapp.com'
    : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires', 'Surrogate-Control', 'X-User-Cognito-Id'],
  exposedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires', 'Surrogate-Control'],
  credentials: true
}));

// Apply authentication middleware globally
app.use(authMiddleware);

/* ERROR HANDLING */
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/* ROUTES */
app.get("/", (req, res) => {
  res.send("This is home route");
});

/* DIRECT ENDPOINTS FOR ROLES - Must be BEFORE route registration */
app.get("/api-roles", async (req, res) => {
  try {
    console.log("[GET /api-roles] Direct root roles endpoint called");
    const prisma = new PrismaClient();
    const roles = await prisma.role.findMany();
    
    // Set explicit no-cache headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    console.log(`Found ${roles.length} roles:`, roles.map(r => r.name).join(', '));
    
    // Send the response
    res.json(roles);
  } catch (error) {
    console.error("[GET /api-roles] Error:", error);
    res.status(500).json({ message: "Error retrieving roles" });
  }
});

// Direct roles endpoint at root to ensure it works with API Gateway
app.get("/teams/roles", async (req, res) => {
  try {
    console.log("[GET /teams/roles] Direct root endpoint called");
    const prisma = new PrismaClient();
    const roles = await prisma.role.findMany();
    
    // Set explicit no-cache headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    console.log(`Found ${roles.length} roles:`, roles.map(r => r.name).join(', '));
    res.json(roles);
  } catch (error) {
    console.error("[GET /teams/roles] Direct endpoint error:", error);
    res.status(500).json({ message: "Error retrieving roles" });
  }
});

/* JSON TRANSFORM MIDDLEWARE */
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(body) {
    // If this is a teams response
    if (Array.isArray(body) && body.length > 0 && body[0].teamName) {
      console.log("Intercepting teams response to ensure teamRoles");
      // Add teamRoles if not present
      const teamsWithRoles = body.map(team => {
        if (!team.teamRoles) {
          return {
            ...team,
            teamRoles: [] // Ensure teamRoles exists even if empty
          };
        }
        return team;
      });
      return originalJson.call(this, teamsWithRoles);
    }
    return originalJson.call(this, body);
  };
  next();
});

// All other routes
app.use("/projects", projectRoutes);
app.use("/tasks", taskRoutes);
app.use("/search", searchRoutes);
app.use("/users", userRoutes);
app.use("/teams", teamRoutes);
app.use("/groups", groupRoutes);

/* SERVER */
const port = Number(process.env.PORT) || 80;
app.listen(port, "0.0.0.0", () => {
  console.log("\n=================================");
  console.log(`🚀 Server Status`);
  console.log(`---------------------------------`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔌 Port: ${port}`);
  console.log(`🔒 CORS: ${process.env.NODE_ENV === 'production'
    ? 'https://main.d2qm7hnxk5z1hy.amplifyapp.com'
    : 'http://localhost:3000'}`);
  console.log(`=================================\n`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
