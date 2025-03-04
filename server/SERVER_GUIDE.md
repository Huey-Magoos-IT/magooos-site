# MagooOS Server Architecture Guide

## Server Structure Overview
```text
server/
├── prisma/
│   ├── schema.prisma              # Database schema and relationships
│   ├── migrations/                # Database migration history
│   │   └── YYYYMMDDHHMMSS_name/   # Timestamped migrations
│   └── seedData/                  # Sample data for development
│       ├── user.json
│       ├── team.json
│       ├── project.json
│       ├── task.json
│       ├── comment.json
│       └── attachment.json
├── src/
│   ├── index.ts                   # Main server entry point
│   ├── controllers/               # Business logic handlers
│   │   ├── projectController.ts   # Project management logic
│   │   ├── taskController.ts      # Task operations and assignments
│   │   ├── teamController.ts      # Team management operations
│   │   ├── userController.ts      # User operations and Cognito sync
│   │   └── searchController.ts    # Global search functionality
│   └── routes/                    # API endpoint definitions
│       ├── projectRoutes.ts       # Project-related endpoints
│       ├── taskRoutes.ts          # Task management endpoints
│       ├── teamRoutes.ts          # Team operations endpoints
│       ├── userRoutes.ts          # User management endpoints
│       └── searchRoutes.ts        # Search functionality endpoints
└── ecosystem.config.js            # PM2 production configuration
```

## Detailed Component Breakdown

### 1. Core Server Components

#### Main Server (`src/index.ts`)
- Express.js server configuration
- Middleware setup (CORS, Helmet, Morgan)
- Route registration and API endpoint mounting
- Environment configuration and server initialization
- Security headers and request parsing setup

#### Controllers
1. **Project Controller** (`controllers/projectController.ts`)
   - Project CRUD operations
   - Team assignment management
   - Project timeline handling

2. **Task Controller** (`controllers/taskController.ts`)
   - Task creation and updates
   - Status management
   - Assignment handling
   - Priority and timeline tracking

3. **Team Controller** (`controllers/teamController.ts`)
   - Team creation and management
   - Member assignments
   - Role management (Product Owner, Project Manager)

4. **User Controller** (`controllers/userController.ts`)
   - User profile management
   - AWS Cognito synchronization
   - Authentication handling
   - Profile picture management

5. **Search Controller** (`controllers/searchController.ts`)
   - Global search implementation
   - Cross-entity search functionality
   - Results aggregation

#### Routes
1. **Project Routes** (`routes/projectRoutes.ts`)
   - GET /projects - List all projects
   - POST /projects - Create new project
   - GET /projects/:id - Project details
   - PUT /projects/:id - Update project
   - DELETE /projects/:id - Remove project

2. **Task Routes** (`routes/taskRoutes.ts`)
   - GET /tasks - List tasks (with filters)
   - POST /tasks - Create task
   - PATCH /tasks/:id/status - Update status
   - GET /tasks/user/:userId - User's tasks

3. **Team Routes** (`routes/teamRoutes.ts`)
   - Team CRUD operations
   - Member management endpoints
   - Team assignment handling

4. **User Routes** (`routes/userRoutes.ts`)
   - User profile operations
   - Authentication endpoints
   - Profile updates

5. **Search Routes** (`routes/searchRoutes.ts`)
   - GET /search - Global search endpoint
   - Query parameter handling
   - Results filtering

### 2. Data Layer (Prisma)

#### Schema (`prisma/schema.prisma`)
Core Models:
1. **User**
   - Basic profile information
   - Cognito integration
   - Team associations
   - Task relationships (author/assignee)

2. **Team**
   - Team structure
   - Leadership roles
   - Project associations

3. **Project**
   - Project metadata
   - Timeline information
   - Team assignments

4. **Task**
   - Core task information
   - Status and priority
   - Assignments and relationships
   - Comments and attachments

5. **Supporting Models**
   - TaskAssignment: Many-to-many user-task relationships
   - Attachment: File management
   - Comment: Task discussions
   - ProjectTeam: Project-team associations

### 3. Data Model Details
```prisma
// Entity Relationships:
// User ↔ Task ↔ Project ↔ Team

// Actual Task Model (Lines 59-79):
model Task {
  id             Int       @id @default(autoincrement())
  title          String
  description    String?
  status         String?   // [Backlog, InProgress, Completed]
  priority       String?   // [Low, Medium, High, Urgent]
  tags           String?
  startDate      DateTime?
  dueDate        DateTime?
  points         Int?
  project        Project   @relation(fields: [projectId])
  author         User      @relation("TaskAuthor")
  assignee       User?     @relation("TaskAssignee")
}
```

### 4. Controller-Route Flow
```mermaid
sequenceDiagram
    Client->>Route: HTTP Request
    Route->>Middleware: JWT Validation
    Middleware->>Controller: Auth Context
    Controller->>Prisma: DB Operation
    Prisma->>Controller: Data Result
    Controller->>Client: JSON Response
```

## Modification Guide

### Adding Features (Example: Notifications)

1. **Extend Prisma Schema**
```prisma
// Add to schema.prisma
model Notification {
  id        Int      @id @default(autoincrement())
  message   String
  userId    Int
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId])
}
```

2. **Create Controller**
```typescript
// src/controllers/notificationController.ts
export const getNotifications = async (userId: number) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
};
```

3. **Implement Route**
```typescript
// src/routes/notificationRoutes.ts
router.get('/notifications', 
  authMiddleware,
  notificationController.getNotifications
);
```

4. **Generate Migration**
```bash
npx prisma migrate dev --name add_notifications
npx prisma generate
```

## AWS Integration

### EC2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: "magooos-backend",
    script: "npm",
    args: "start",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      DATABASE_URL: process.env.DATABASE_URL
    },
    error_file: "/home/ubuntu/.pm2/logs/magooos-backend-error.log",
    out_file: "/home/ubuntu/.pm2/logs/magooos-backend-out.log",
    time: true,
    watch: false,
    instances: 1,
    exec_mode: "fork",
    max_memory_restart: "500M",
    restart_delay: 4000,
    autorestart: true
  }]
}
```

### API Gateway Integration

#### Main API Gateway (Proxy Integration)
The main Express server is configured to handle API Gateway's `/prod` stage prefix:

```typescript
// src/index.ts
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://main.d2qm7hnxk5z1hy.amplifyapp.com'
    : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### Direct Lambda API Gateway
A separate API Gateway is used for direct Lambda integrations and DynamoDB access:

- **Gateway ID**: sutpql04fb.execute-api.us-east-2.amazonaws.com/prod
- **Integration Types**:
  * Direct Lambda (non-proxy) for compute functions
  * AWS Service Integration for DynamoDB operations
- **Resources**:
  * `/process-data` - Data extraction and report generation (Lambda)
  * `/locations` - Location data retrieval (DynamoDB)
- **Frontend Integration**: Accessed via `lambdaApi.ts` in the client

This separation provides several advantages:
1. Improved performance by eliminating proxy overhead
2. Direct service integration for simple data operations
3. Reduced cold start latency for data retrieval

#### DynamoDB Integration
The DynamoDB integration uses API Gateway's AWS Service Integration feature:

```
// API Gateway: /locations POST Method Request
Integration Request:
{
  "TableName": "Location-u3tk7jwqujcqfedzbv7hksrt4a-NONE"
}

// API Gateway: /locations POST Method Response
Integration Response:
{
  "locations": [
    #foreach($item in $inputRoot.Items)
    {
      "id": "$item.id.S",
      "name": "$item.name.S",
      "__typename": "Location"
    }#if($foreach.hasNext),#end
    #end
  ]
}
```

This pattern provides several advantages:
1. No Lambda cold starts for simple data operations
2. No SDK dependencies in frontend or backend code
3. Simplified maintenance with declarative mapping templates
4. Consistent authentication using the same Cognito flow

### Error Handling Middleware
```typescript
// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

### Enhanced Controller Implementation
Example of robust controller implementation with validation and error handling:

```typescript
// src/controllers/teamController.ts
export const createTeam = async (req: Request, res: Response): Promise<void> => {
  const { teamName, isAdmin } = req.body;
  console.log("[POST /teams] Creating team:", { teamName, isAdmin });

  // Input validation
  if (!teamName || typeof teamName !== 'string' || teamName.trim().length === 0) {
    console.error("[POST /teams] Invalid team name");
    res.status(400).json({ message: "Team name is required" });
    return;
  }

  try {
    // Check for duplicates
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
```

## Maintenance & Operations

| Task                      | Command                                | Frequency       |
|---------------------------|----------------------------------------|-----------------|
| Database Backups          | pg_dump -h RDS_ENDPOINT ...           | Daily           |
| Prisma Migrations         | npx prisma migrate deploy             | On schema change|
| PM2 Process Monitoring    | pm2 logs magooos-backend --lines 100  | As needed       |
| Server Status Check       | pm2 list                              | Daily           |
| Error Log Review          | pm2 logs magooos-backend --err        | Daily           |
| NGINX Config Test         | sudo nginx -t                         | After changes   |
| API Gateway Test          | curl -v API_GATEWAY_URL/prod/teams    | After deploy    |
| DynamoDB Table Status     | aws dynamodb describe-table           | Weekly          |

## Troubleshooting

1. **Database Connection Issues**
```bash
# Test connection:
psql $DATABASE_URL -c "SELECT 1"
```

2. **JWT Validation Failures**
```bash
# Decode token for inspection:
echo $TOKEN | jq -R 'split(".") | .[1] | @base64d | fromjson'
```

3. **Prisma Client Errors**
```bash
# Full clean rebuild:
rm -rf node_modules/.prisma
npm install
npx prisma generate
```

4. **API Gateway Integration Issues**
```bash
# Test API Gateway endpoints:
curl -v -H "Authorization: Bearer $TOKEN" https://sutpql04fb.execute-api.us-east-2.amazonaws.com/prod/locations
```

5. **DynamoDB Access Issues**
```bash
# Check IAM permissions for the API Gateway role
aws iam list-attached-role-policies --role-name ApiGatewayDynamoDBRole
