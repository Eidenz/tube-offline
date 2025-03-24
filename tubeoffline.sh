#!/bin/bash

# TubeOffline management script

# Function to display help
show_help() {
  echo "TubeOffline Management Script"
  echo ""
  echo "Usage: ./tubeoffline.sh [command]"
  echo ""
  echo "Commands:"
  echo "  start       Start the application"
  echo "  stop        Stop the application"
  echo "  restart     Restart the application"
  echo "  status      Check application status"
  echo "  logs        View application logs"
  echo "  update      Update the application"
  echo "  backup      Create a backup of your data"
  echo "  help        Show this help message"
  echo ""
}

# Function to check if Docker and Docker Compose are installed
check_requirements() {
  if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    echo "Visit https://docs.docker.com/get-docker/ for installation instructions."
    exit 1
  fi
  
  if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit https://docs.docker.com/compose/install/ for installation instructions."
    exit 1
  fi
}

# Function to ensure .env file exists
ensure_env_file() {
  if [ ! -f .env ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
  fi
}

# Function to ensure data directory exists
ensure_data_dir() {
  DATA_DIR=$(grep DATA_DIR .env | cut -d '=' -f2 || echo "./data")
  mkdir -p $DATA_DIR
  echo "Using data directory: $DATA_DIR"
}

# Start the application
start_app() {
  ensure_env_file
  ensure_data_dir
  
  echo "Starting TubeOffline..."
  docker-compose up -d
  
  PORT=$(grep PORT .env | cut -d '=' -f2 || echo "5000")
  echo "TubeOffline is now running at: http://localhost:$PORT"
}

# Stop the application
stop_app() {
  echo "Stopping TubeOffline..."
  docker-compose down
  echo "TubeOffline stopped"
}

# Restart the application
restart_app() {
  stop_app
  start_app
}

# Check application status
check_status() {
  echo "TubeOffline Status:"
  docker-compose ps
}

# View application logs
view_logs() {
  echo "TubeOffline Logs:"
  docker-compose logs -f
}

# Update the application
update_app() {
  echo "Updating TubeOffline..."
  
  # Pull latest changes
  git pull
  
  # Stop the application
  docker-compose down
  
  # Rebuild the image
  docker-compose build
  
  # Start the application
  docker-compose up -d
  
  echo "TubeOffline updated successfully"
}

# Create a backup
create_backup() {
  DATA_DIR=$(grep DATA_DIR .env | cut -d '=' -f2 || echo "./data")
  BACKUP_NAME="tube-offline-backup-$(date +%Y%m%d-%H%M%S)"
  
  echo "Creating backup of your data..."
  cp -r "$DATA_DIR" "$BACKUP_NAME"
  
  echo "Backup created: $BACKUP_NAME"
}

# Check requirements
check_requirements

# Process command
case "$1" in
  start)
    start_app
    ;;
  stop)
    stop_app
    ;;
  restart)
    restart_app
    ;;
  status)
    check_status
    ;;
  logs)
    view_logs
    ;;
  update)
    update_app
    ;;
  backup)
    create_backup
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    show_help
    ;;
esac