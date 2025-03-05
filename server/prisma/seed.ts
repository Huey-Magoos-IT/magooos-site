import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
const prisma = new PrismaClient();

// The correct deletion order to respect foreign key constraints
async function deleteAllData() {
  const deletionOrder = [
    // Delete dependent tables first (children)
    "Comment",
    "Attachment",
    "TaskAssignment",
    "TeamRole", // New table from role-based access control
    "Task",
    "ProjectTeam",
    "User",
    "Project",
    "Team",
    "Role", // New table from role-based access control
  ];

  for (const modelName of deletionOrder) {
    const model: any = prisma[modelName.toLowerCase() as keyof typeof prisma];
    try {
      await model.deleteMany({});
      console.log(`Cleared data from ${modelName}`);
    } catch (error) {
      console.error(`Error clearing data from ${modelName}:`, error);
    }
  }
}

async function setupRoles() {
  console.log("Setting up roles...");
  
  // Default roles to create
  const roles = [
    { name: "ADMIN", description: "Full access to all areas" },
    { name: "DATA", description: "Access to data department" },
    { name: "REPORTING", description: "Access to reporting department" }
  ];

  // Create roles if they don't exist
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role
    });
  }
  
  console.log("Roles setup complete");
}

async function migrateAdminTeams() {
  console.log("Migrating admin teams to role-based system...");
  
  // Get the admin role
  const adminRole = await prisma.role.findUnique({
    where: { name: "ADMIN" }
  });
  
  if (!adminRole) {
    console.error("Admin role not found, skipping admin team migration");
    return;
  }
  
  // Find all admin teams
  const adminTeams = await prisma.team.findMany({
    where: { isAdmin: true }
  });
  
  console.log(`Found ${adminTeams.length} admin teams to migrate`);
  
  // For each admin team, create a TeamRole entry if it doesn't exist
  for (const team of adminTeams) {
    const existingTeamRole = await prisma.teamRole.findFirst({
      where: {
        teamId: team.id,
        roleId: adminRole.id
      }
    });
    
    if (!existingTeamRole) {
      await prisma.teamRole.create({
        data: {
          teamId: team.id,
          roleId: adminRole.id
        }
      });
      console.log(`Added ADMIN role to team: ${team.teamName} (ID: ${team.id})`);
    } else {
      console.log(`Team ${team.teamName} already has ADMIN role`);
    }
  }
  
  console.log("Admin team migration complete");
}

async function main() {
  const dataDirectory = path.join(__dirname, "seedData");
  
  // Flag to control whether to clear and reseed data
  // Set to false if you only want to run the role setup and migration
  const shouldClearAndReseedData = false;

  if (shouldClearAndReseedData) {
    console.log("Clearing existing data...");
    await deleteAllData();
    
    console.log("Seeding base data...");
    // Correct creation order (parents first)
    const creationOrder = [
      "team.json",
      "project.json",
      "user.json",
      "projectTeam.json",
      "task.json",
      "attachment.json",
      "comment.json",
      "taskAssignment.json",
    ];
    
    for (const fileName of creationOrder) {
      const filePath = path.join(dataDirectory, fileName);
      const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const modelName = path.basename(fileName, path.extname(fileName));
      const model: any = prisma[modelName as keyof typeof prisma];

      try {
        for (const data of jsonData) {
          // Use upsert instead of create to avoid unique constraint issues
          const idField = modelName === "user" ? "userId" : "id";
          
          if (data[idField]) {
            await model.upsert({
              where: { [idField]: data[idField] },
              update: data,
              create: data
            });
          } else {
            await model.create({ data });
          }
        }
        console.log(`Seeded ${modelName} with data from ${fileName}`);
      } catch (error) {
        console.error(`Error seeding data for ${modelName}:`, error);
      }
    }
  } else {
    console.log("Skipping data clearing and reseeding, proceeding with role setup only.");
  }
  
  try {
    // Set up roles
    await setupRoles();
    
    // Migrate existing admin teams to have the ADMIN role
    await migrateAdminTeams();
  } catch (error) {
    console.error("Error in role setup or migration:", error);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
