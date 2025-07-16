import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Starting database restoration...");

  // Clear existing data
  await prisma.teamRole.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.group.deleteMany({});

  console.log("Creating roles...");
  
  // Create all roles
  const roles = [
    { id: 1, name: "ADMIN", description: "Full access to all areas" },
    { id: 2, name: "DATA", description: "Access to data department" },
    { id: 3, name: "REPORTING", description: "Access to reporting department" },
    { id: 26, name: "SCANS", description: "Access to scans department" },
    { id: 21, name: "LOCATION_ADMIN", description: "Can manage users within assigned group" },
    { id: 22, name: "LOCATION_USER", description: "Has access to data for assigned locations" },
    { id: 35, name: "PRICE_ADMIN", description: "Access to price portal and price users management" },
    { id: 36, name: "PRICE_USER", description: "Can change prices in the price portal" }
  ];

  for (const role of roles) {
    await prisma.role.create({ data: role });
  }

  console.log("Creating groups...");
  
  // Create groups
  const groups = [
    { id: 3, name: "FBC Group", description: "FBC locations", locationIds: ["1825", "5765"] },
    { id: 4, name: "Test Group", description: "Test group", locationIds: ["4146", "4149", "4244", "4885"] },
    { id: 5, name: "Jhance Group", description: "Jhance locations", locationIds: ["4146", "4149", "7025", "4867", "4147"] }
  ];

  for (const group of groups) {
    await prisma.group.create({ data: group });
  }

  console.log("Creating teams...");
  
  // Create teams
  const teams = [
    { id: 6, teamName: "Administrators", isAdmin: true },
    { id: 2, teamName: "Reporting Team", isAdmin: false, productOwnerUserId: 13, projectManagerUserId: 4 },
    { id: 1, teamName: "Data Team", isAdmin: false, productOwnerUserId: 11, projectManagerUserId: 2 },
    { id: 15, teamName: "FBC", isAdmin: false },
    { id: 18, teamName: "Franchisees", isAdmin: false },
    { id: 19, teamName: "Location User", isAdmin: false },
    { id: 20, teamName: "Scan Team", isAdmin: false }
  ];

  for (const team of teams) {
    await prisma.team.create({ data: team });
  }

  console.log("Creating team roles...");
  
  // Create team roles
  const teamRoles = [
    // Administrators team (ID: 6)
    { id: 5, teamId: 6, roleId: 1 }, // ADMIN
    
    // Reporting Team (ID: 2)
    { id: 7, teamId: 2, roleId: 3 }, // REPORTING
    
    // Data Team (ID: 1)
    { id: 12, teamId: 1, roleId: 2 }, // DATA
    
    // FBC team (ID: 15)
    { id: 15, teamId: 15, roleId: 3 }, // REPORTING
    { id: 29, teamId: 15, roleId: 26 }, // SCANS
    { id: 30, teamId: 15, roleId: 21 }, // LOCATION_ADMIN
    { id: 32, teamId: 15, roleId: 36 }, // PRICE_USER
    
    // Franchisees team (ID: 18)
    { id: 24, teamId: 18, roleId: 21 }, // LOCATION_ADMIN
    { id: 25, teamId: 18, roleId: 3 }, // REPORTING
    
    // Location User team (ID: 19)
    { id: 26, teamId: 19, roleId: 22 }, // LOCATION_USER
    { id: 27, teamId: 19, roleId: 3 }, // REPORTING
    
    // Scan Team (ID: 20)
    { id: 28, teamId: 20, roleId: 26 } // SCANS
  ];

  for (const teamRole of teamRoles) {
    await prisma.teamRole.create({ data: teamRole });
  }

  console.log("Creating users...");
  
  // Create all users
  const users = [
    {
      userId: 29,
      cognitoId: "91eb1560-5081-70fb-3473-60bb8242d775",
      username: "admin",
      profilePictureUrl: "i1.jpg",
      teamId: 6,
      groupId: null,
      locationIds: ["4146", "4244", "10093"],
      isDisabled: false
    },
    {
      userId: 42,
      cognitoId: "711b55a0-70d1-70dd-8c00-9cfe055cb2d0",
      username: "brandonboone",
      profilePictureUrl: "i1.jpg",
      teamId: 6,
      groupId: null,
      locationIds: ["4145","4849","5561","9905","4167","4249","4885","7025","4255","4878","4045","4872","4166","4868","4887","7027","4245","5563","6785","10533","4258","4046","5765","4148","4886","4243","4814","4884","4261","4120","10477","4147","4260","4242","5805","4350","6809","5559","4252","4146","10448","4165","10534","6705","5691","4238","10497","4867","9559","4256","10150","10093","4250","4150","4259","4253","4225","5359","4254","10476","5346","9591","9999","4078","4251","5865","1825","4799","4077","4247","4241","6658","4244","4248","6778","4237","4149","4246"],
      isDisabled: false
    },
    {
      userId: 38,
      cognitoId: "e1bb4520-4001-704b-0448-05570881fc35",
      username: "codystoltenberg",
      profilePictureUrl: "i1.jpg",
      teamId: 1,
      groupId: null,
      locationIds: ["4145","4849","5561","9905","4167","4249","4885","7025","4255","4878","4045","4872","4166","4868","4887","7027","4245","5563","6785","10533","4258","4046","5765","4148","4886","4243","4814","4884","4261","4120","10477","4147","4260","4242","5805","4350","6809","5559","4252","4146","10448","4165","10534","6705","5691","4238","10497","4867","9559","4256","10150","10093","4250","4150","4259","4253","4225","5359","4254","10476","5346","9591","9999","4078","4251","5865","1825","4799","4077","4247","4241","6658","4244","4248","6778","4237","4149","4246"],
      isDisabled: false
    },
    {
      userId: 48,
      cognitoId: "a14b5560-0001-703f-ed21-7da45f324541",
      username: "corporateuser",
      profilePictureUrl: "i1.jpg",
      teamId: 15,
      groupId: 3,
      locationIds: ["1825", "5765"],
      isDisabled: false
    },
    {
      userId: 46,
      cognitoId: "c16bc5b0-80f1-70bb-82e6-6589d035a947",
      username: "dummyuser",
      profilePictureUrl: "i1.jpg",
      teamId: 19,
      groupId: null,
      locationIds: ["4146"],
      isDisabled: true
    },
    {
      userId: 44,
      cognitoId: "b12bb540-70e1-702b-c3e2-6d69c497f0d2",
      username: "grouptest",
      profilePictureUrl: "i1.jpg",
      teamId: 18,
      groupId: 4,
      locationIds: ["4146", "4149", "4244", "4885"],
      isDisabled: false
    },
    {
      userId: 28,
      cognitoId: "912b7550-d091-70cf-e2dc-6b806ac8a274",
      username: "jhance",
      profilePictureUrl: "i1.jpg",
      teamId: 15,
      groupId: 5,
      locationIds: ["4146", "4149", "7025", "4867", "4147"],
      isDisabled: false
    },
    {
      userId: 45,
      cognitoId: "d16b6530-00c1-7055-06c6-47f19bdc176b",
      username: "locationusertest",
      profilePictureUrl: "i1.jpg",
      teamId: 19,
      groupId: null,
      locationIds: ["4146"],
      isDisabled: true
    },
    {
      userId: 37,
      cognitoId: "f18b35e0-5001-708e-7cda-3afa25db9602",
      username: "test4jon",
      profilePictureUrl: "i1.jpg",
      teamId: 1,
      groupId: null,
      locationIds: ["4145", "4849"],
      isDisabled: true
    },
    {
      userId: 47,
      cognitoId: "516b0500-90e1-708e-b8ab-968ef3f8b515",
      username: "unconfirmedlocationtest",
      profilePictureUrl: "i1.jpg",
      teamId: 19,
      groupId: null,
      locationIds: ["4146", "4149", "4244", "4885"],
      isDisabled: false
    }
  ];

  for (const user of users) {
    await prisma.user.create({ data: user });
  }

  console.log("Database restoration complete!");
  console.log("Created:");
  console.log(`- ${roles.length} roles`);
  console.log(`- ${groups.length} groups`);
  console.log(`- ${teams.length} teams`);
  console.log(`- ${teamRoles.length} team roles`);
  console.log(`- ${users.length} users`);
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
