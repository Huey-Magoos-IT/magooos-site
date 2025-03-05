import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
const prisma = new PrismaClient();

async function deleteAllData(orderedFileNames: string[]) {
  const modelNames = orderedFileNames.map((fileName) => {
    const modelName = path.basename(fileName, path.extname(fileName));
    return modelName.charAt(0).toUpperCase() + modelName.slice(1);
  });

  for (const modelName of modelNames) {
    const model: any = prisma[modelName as keyof typeof prisma];
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

  const orderedFileNames = [
    "team.json",
    "project.json",
    "projectTeam.json",
    "user.json",
    "task.json",
    "attachment.json",
    "comment.json",
    "taskAssignment.json",
  ];

  await deleteAllData(orderedFileNames);

  for (const fileName of orderedFileNames) {
    const filePath = path.join(dataDirectory, fileName);
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const modelName = path.basename(fileName, path.extname(fileName));
    const model: any = prisma[modelName as keyof typeof prisma];

    try {
      for (const data of jsonData) {
        await model.create({ data });
      }
      console.log(`Seeded ${modelName} with data from ${fileName}`);
    } catch (error) {
      console.error(`Error seeding data for ${modelName}:`, error);
    }
  }
  
  // Set up roles after base data is seeded
  await setupRoles();
  
  // Migrate existing admin teams to have the ADMIN role
  await migrateAdminTeams();
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
