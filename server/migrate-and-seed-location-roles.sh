#!/bin/bash

# Migration and seeding script for location-based roles
# To be run on the EC2 server

echo "Starting migration and seeding for location-based roles..."

# Navigate to the server directory
# Change to the directory where this script is located
cd "$(dirname "$0")" || exit 1

# Now we are inside /root/magooos-site/server or wherever the script is
echo "Current directory: $(pwd)"

# Check if node_modules exists, if not, install dependencies
if [ ! -d "node_modules" ]; then
  echo "node_modules not found. Installing dependencies..."
  npm install
fi

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