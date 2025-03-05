import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * This script will reset the teams data and create 3 demo teams,
 * each with a specific role (ADMIN, DATA, REPORTING)
 */
async function resetTeamsAndRoles() {
  try {
    console.log("Starting database cleanup...");
    
    // Step 1: Delete existing TeamRole entries
    await prisma.teamRole.deleteMany({});
    console.log("Cleared all TeamRole entries");
    
    // Step 2: Make sure roles exist
    console.log("Setting up roles...");
    const roles = [
      { name: "ADMIN", description: "Full access to all areas" },
      { name: "DATA", description: "Access to data department" },
      { name: "REPORTING", description: "Access to reporting department" }
    ];
    
    type Role = {
      id: number;
      name: string;
      description: string | null;
    };
    
    const createdRoles: Role[] = [];
    for (const role of roles) {
      const createdRole = await prisma.role.upsert({
        where: { name: role.name },
        update: { description: role.description },
        create: role
      });
      createdRoles.push(createdRole);
      console.log(`Role created/updated: ${role.name} (ID: ${createdRole.id})`);
    }

    // Find the admin role
    const adminRole = createdRoles.find(r => r.name === "ADMIN");
    const dataRole = createdRoles.find(r => r.name === "DATA");
    const reportingRole = createdRoles.find(r => r.name === "REPORTING");
    
    if (!adminRole || !dataRole || !reportingRole) {
      throw new Error("Failed to create all required roles");
    }
    
    // Step 3: Keep Administrator team (ID: 6) but update other teams
    const teamUpdates = [
      { id: 6, teamName: "Administrators", isAdmin: true, role: adminRole },
      { id: 1, teamName: "Data Team", isAdmin: false, role: dataRole },
      { id: 2, teamName: "Reporting Team", isAdmin: false, role: reportingRole }
    ];
    
    // Delete unneeded teams (keep ID 1, 2, 6 from the update list)
    const teamIdsToKeep = teamUpdates.map(t => t.id);
    
    // First, update users that belong to teams we're going to delete to be part of the admin team
    await prisma.user.updateMany({
      where: {
        teamId: {
          notIn: teamIdsToKeep
        }
      },
      data: {
        teamId: 6 // Move to admin team
      }
    });
    
    // Now delete the teams we don't need
    const deletedTeams = await prisma.team.deleteMany({
      where: {
        id: {
          notIn: teamIdsToKeep
        }
      }
    });
    console.log(`Deleted ${deletedTeams.count} unnecessary teams`);
    
    // Update the teams we're keeping
    for (const teamUpdate of teamUpdates) {
      // Update the team info
      await prisma.team.update({
        where: { id: teamUpdate.id },
        data: {
          teamName: teamUpdate.teamName,
          isAdmin: teamUpdate.teamName === "Administrators"
        }
      });
      
      // Assign the role
      await prisma.teamRole.create({
        data: {
          teamId: teamUpdate.id,
          roleId: teamUpdate.role.id
        }
      });
      
      console.log(`Updated team ${teamUpdate.teamName} (ID: ${teamUpdate.id}) with role ${teamUpdate.role.name}`);
    }
    
    // Step 4: Fix the teamController getTeams function to include roles
    console.log("\nIMPORTANT: You must also update the teamController.ts file to include teamRoles in the response!");
    console.log(`
In server/src/controllers/teamController.ts find the getTeams function and update the prisma.team.findMany call:

const teams = await prisma.team.findMany({
  include: {
    user: {
      select: {
        userId: true,
        username: true
      }
    },
    teamRoles: {
      include: {
        role: true
      }
    }
  }
});
`);
    
    console.log("\nCompleted teams and roles reset!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetTeamsAndRoles();