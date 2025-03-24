#!/bin/bash

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from example..."
  cp .env.example .env
fi

# Create data directory if it doesn't exist
DATA_DIR=$(grep DATA_DIR .env | cut -d '=' -f2 || echo "./data")
mkdir -p $DATA_DIR

# Pull the latest images and start the containers
echo "Starting TubeOffline..."
docker-compose up -d

# Get the port from the .env file
PORT=$(grep PORT .env | cut -d '=' -f2 || echo "5000")

echo "TubeOffline is now running!"
echo "You can access it at: http://localhost:$PORT"
echo "Data is being stored in: $DATA_DIR"
echo ""
echo "To stop the application, use: docker-compose down"