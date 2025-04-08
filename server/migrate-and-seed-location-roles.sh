#!/bin/bash

# Migration and seeding script for location-based roles
# To be run on the EC2 server

echo "Starting migration and seeding for location-based roles..."

# Navigate to the server directory
cd /magooos-site/server

# Run Prisma migration to apply schema changes
echo "Running Prisma migration..."
npx prisma migrate deploy

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run the seed script to create new roles
echo "Running seed script to create roles..."
npm run seed

echo "Migration and seeding complete!"
echo "New roles added: LOCATION_ADMIN, LOCATION_USER"