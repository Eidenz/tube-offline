#!/bin/bash

# This script updates the existing .env file to the new format

# Create a backup of the current .env file
if [ -f .env ]; then
  cp .env .env.backup
  echo "Created backup of existing .env file as .env.backup"
fi

# Create a new .env file from the example
cp .env.example .env

# If there was an existing .env file, try to migrate settings
if [ -f .env.backup ]; then
  # Extract settings from the backup
  OLD_PORT=$(grep PORT .env.backup | head -1 | cut -d '=' -f2 || echo "5000")
  
  # Update the new .env file
  sed -i "s/^PORT=.*/PORT=$OLD_PORT/" .env
  
  echo "Migrated settings from your previous configuration"
  echo "You can review the new .env file and modify any additional settings"
fi

echo "Updated .env file for Docker compatibility"
echo "Please check the settings in the .env file before starting the application"