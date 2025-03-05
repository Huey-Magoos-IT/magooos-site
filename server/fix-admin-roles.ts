import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function fixAdminRoles() {
  console.log("Checking and fixing admin team roles...");
  
  // Get the admin role
  const adminRole = await prisma.role.findUnique({
    where: { name: "ADMIN" }
  });
  
  if (!adminRole) {
    console.error("ADMIN role not found in the database. Creating it first...");
    
    // Create the ADMIN role if it doesn't exist
    await prisma.role.create({
      data: {
        name: "ADMIN",
        description: "Full access to all areas"
      }
    });
    
    console.log("ADMIN role created. Finding it again...");
    
    // Get the newly created admin role
    const newAdminRole = await prisma.role.findUnique({
      where: { name: "ADMIN" }
    });
    
    if (!newAdminRole) {
      console.error("Failed to create ADMIN role. Exiting.");
      return;
    }
    
    console.log(`ADMIN role created with ID: ${newAdminRole.id}`);
  } else {
    console.log(`Found ADMIN role with ID: ${adminRole.id}`);
  }
  
  // Find all admin teams (using isAdmin flag)
  const adminTeams = await prisma.team.findMany({
    where: { isAdmin: true },
    include: {
      teamRoles: {
        include: {
          role: true
        }
      }
    }
  });
  
  console.log(`Found ${adminTeams.length} admin teams (isAdmin=true)`);
  for (const team of adminTeams) {
    console.log(`Team: ${team.teamName} (ID: ${team.id})`);
    console.log(`TeamRoles: ${JSON.stringify(team.teamRoles.map(tr => tr.role.name))}`);
    
    // Check if the team already has an ADMIN role
    const hasAdminRole = team.teamRoles.some(tr => tr.role.name === "ADMIN");
    
    if (!hasAdminRole) {
      console.log(`Adding ADMIN role to team: ${team.teamName}`);
      
      // Add the ADMIN role
      await prisma.teamRole.create({
        data: {
          teamId: team.id,
          roleId: adminRole!.id
        }
      });
      
      console.log(`Successfully added ADMIN role to team: ${team.teamName}`);
    } else {
      console.log(`Team already has ADMIN role: ${team.teamName}`);
    }
  }
  
  // Create DATA and REPORTING roles if they don't exist
  await prisma.role.upsert({
    where: { name: "DATA" },
    update: { description: "Access to data department" },
    create: { name: "DATA", description: "Access to data department" }
  });
  
  await prisma.role.upsert({
    where: { name: "REPORTING" },
    update: { description: "Access to reporting department" },
    create: { name: "REPORTING", description: "Access to reporting department" }
  });
  
  console.log("All roles are now set up correctly");
}

fixAdminRoles()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Done!");
  });