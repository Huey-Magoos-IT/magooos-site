import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyLocationRoles() {
  console.log("Verifying location-based roles...");
  
  try {
    // Check if the roles exist
    const locationAdminRole = await prisma.role.findUnique({
      where: { name: "LOCATION_ADMIN" }
    });
    
    const locationUserRole = await prisma.role.findUnique({
      where: { name: "LOCATION_USER" }
    });
    
    console.log("LOCATION_ADMIN role:", locationAdminRole ? "✅ Found" : "❌ Missing");
    console.log("LOCATION_USER role:", locationUserRole ? "✅ Found" : "❌ Missing");
    
    // Count teams with these roles
    if (locationAdminRole) {
      const teamsWithLocationAdmin = await prisma.teamRole.count({
        where: { roleId: locationAdminRole.id }
      });
      console.log(`Teams with LOCATION_ADMIN role: ${teamsWithLocationAdmin}`);
    }
    
    if (locationUserRole) {
      const teamsWithLocationUser = await prisma.teamRole.count({
        where: { roleId: locationUserRole.id }
      });
      console.log(`Teams with LOCATION_USER role: ${teamsWithLocationUser}`);
    }
    
    // Count users with location IDs - using raw query to avoid TypeScript errors
    // before Prisma client is regenerated
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "User"
        WHERE "locationIds" IS NOT NULL AND array_length("locationIds", 1) > 0
      `;
      console.log(`Users with assigned locations: ${(result as any)[0]?.count || 0}`);
    } catch (error) {
      console.log("Could not count users with locations:", error);
    }
    
    // Count groups - using raw query to avoid TypeScript errors
    // before Prisma client is regenerated
    try {
      const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Group"`;
      console.log(`Total groups: ${(result as any)[0]?.count || 0}`);
    } catch (error) {
      console.log("Could not count groups:", error);
    }
  } catch (error) {
    console.error("Error during verification:", error);
  }
}

verifyLocationRoles()
  .catch(e => console.error("Error verifying roles:", e))
  .finally(async () => await prisma.$disconnect());