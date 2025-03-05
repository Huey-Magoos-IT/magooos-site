import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * This script verifies that the role-based access setup is complete
 * and performs emergency fixes if needed.
 */
async function verifyRolesSetup() {
  try {
    console.log("==========================================");
    console.log("VERIFYING ROLE-BASED ACCESS CONTROL SETUP");
    console.log("==========================================");
    
    // 1. Check if roles exist in the database
    const roles = await prisma.role.findMany();
    console.log(`\n1. Database has ${roles.length} roles:`);
    roles.forEach(role => {
      console.log(`   - ${role.name} (ID: ${role.id}): ${role.description || 'No description'}`);
    });
    
    if (roles.length < 3) {
      console.error("\n❌ ERROR: Not all required roles exist in the database!");
      return;
    }
    
    // 2. Check if teams have roles assigned
    const teams = await prisma.team.findMany({
      include: {
        teamRoles: {
          include: {
            role: true
          }
        }
      }
    });
    
    console.log(`\n2. Database has ${teams.length} teams:`);
    let hasRoleAssignments = true;
    let adminRole = roles.find(r => r.name === "ADMIN");
    let dataRole = roles.find(r => r.name === "DATA");
    let reportingRole = roles.find(r => r.name === "REPORTING");
    
    teams.forEach(team => {
      console.log(`   - ${team.teamName} (ID: ${team.id}, isAdmin: ${team.isAdmin})`);
      console.log(`     * Has ${team.teamRoles.length} roles assigned:`);
      
      if (team.teamRoles.length === 0) {
        hasRoleAssignments = false;
        console.log("       None");
      } else {
        team.teamRoles.forEach(tr => {
          console.log(`       * ${tr.role.name}`);
        });
      }
    });
    
    // 3. Fix missing role assignments if needed
    if (!hasRoleAssignments) {
      console.log("\n3. EMERGENCY FIX: Some teams have no roles assigned! Adding role assignments...");
      
      for (const team of teams) {
        if (team.teamRoles.length === 0) {
          let roleId: number | null = null;
          
          // Assign role based on team type
          if (team.isAdmin && adminRole) {
            roleId = adminRole.id;
            console.log(`   - Assigning ADMIN role to team: ${team.teamName} (ID: ${team.id})`);
          } else if (team.teamName.includes("Data") && dataRole) {
            roleId = dataRole.id;
            console.log(`   - Assigning DATA role to team: ${team.teamName} (ID: ${team.id})`);
          } else if (team.teamName.includes("Report") && reportingRole) {
            roleId = reportingRole.id;
            console.log(`   - Assigning REPORTING role to team: ${team.teamName} (ID: ${team.id})`);
          } else if (adminRole) {
            roleId = adminRole.id;
            console.log(`   - Assigning default ADMIN role to team: ${team.teamName} (ID: ${team.id})`);
          }
          
          if (roleId) {
            try {
              await prisma.teamRole.create({
                data: {
                  teamId: team.id,
                  roleId: roleId
                }
              });
              console.log(`     ✓ Role assignment successful`);
            } catch (err) {
              console.log(`     ❌ Role assignment failed:`, err);
            }
          }
        }
      }
      
      // Verify the fixes
      console.log("\n4. Verifying fixes...");
      const updatedTeams = await prisma.team.findMany({
        include: {
          teamRoles: {
            include: {
              role: true
            }
          }
        }
      });
      
      console.log(`   Database now has ${updatedTeams.length} teams:`);
      let stillMissingRoles = false;
      
      updatedTeams.forEach(team => {
        console.log(`   - ${team.teamName} (ID: ${team.id}, isAdmin: ${team.isAdmin})`);
        console.log(`     * Has ${team.teamRoles.length} roles assigned:`);
        
        if (team.teamRoles.length === 0) {
          stillMissingRoles = true;
          console.log("       Still none! ❌");
        } else {
          team.teamRoles.forEach(tr => {
            console.log(`       * ${tr.role.name} ✓`);
          });
        }
      });
      
      if (stillMissingRoles) {
        console.log("\n❌ WARNING: Some teams still have no roles assigned!");
      } else {
        console.log("\n✓ All teams now have roles assigned!");
      }
    }
    
    console.log("\n==========================================");
    console.log("VERIFICATION AND FIXES COMPLETE");
    console.log("==========================================");
    console.log("\nIMPORTANT: Please restart the server to apply all changes:");
    console.log("pm2 restart all");
    
  } catch (error) {
    console.error("Error in verification script:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyRolesSetup();