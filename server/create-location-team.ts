import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * This script creates a team with the LOCATION_USER role
 * for use with the location-based access control system.
 */
async function createLocationTeam() {
  console.log("Creating a team with LOCATION_USER role...");
  
  try {
    // Find the LOCATION_USER role
    const locationUserRole = await prisma.role.findUnique({
      where: { name: "LOCATION_USER" }
    });
    
    if (!locationUserRole) {
      console.error("LOCATION_USER role not found. Please run the seed script first.");
      return;
    }
    
    // Create a new team for location users
    const teamName = `Location Users Team ${new Date().toISOString().slice(0, 10)}`;
    
    const team = await prisma.team.create({
      data: {
        teamName,
        isAdmin: false
      }
    });
    
    console.log(`Created team: ${team.teamName} (ID: ${team.id})`);
    
    // Assign the LOCATION_USER role to the team
    const teamRole = await prisma.teamRole.create({
      data: {
        teamId: team.id,
        roleId: locationUserRole.id
      }
    });
    
    console.log(`Assigned LOCATION_USER role to team ${team.teamName}`);
    
    // Find the LOCATION_ADMIN role
    const locationAdminRole = await prisma.role.findUnique({
      where: { name: "LOCATION_ADMIN" }
    });
    
    if (!locationAdminRole) {
      console.error("LOCATION_ADMIN role not found. Please run the seed script first.");
      return;
    }
    
    // Create a team for location admins
    const adminTeamName = `Location Admins Team ${new Date().toISOString().slice(0, 10)}`;
    
    const adminTeam = await prisma.team.create({
      data: {
        teamName: adminTeamName,
        isAdmin: false
      }
    });
    
    console.log(`Created team: ${adminTeam.teamName} (ID: ${adminTeam.id})`);
    
    // Assign the LOCATION_ADMIN role to the team
    const adminTeamRole = await prisma.teamRole.create({
      data: {
        teamId: adminTeam.id,
        roleId: locationAdminRole.id
      }
    });
    
    console.log(`Assigned LOCATION_ADMIN role to team ${adminTeam.teamName}`);
    
    console.log("\nTeams created successfully!");
    console.log(`Location Users Team ID: ${team.id}`);
    console.log(`Location Admins Team ID: ${adminTeam.id}`);
    console.log("\nYou can now assign users to these teams.");
    
  } catch (error) {
    console.error("Error creating location teams:", error);
  }
}

createLocationTeam()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());