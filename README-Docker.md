# Running TubeOffline with Docker

This guide explains how to run TubeOffline using Docker, which simplifies setup and ensures consistent performance across different environments.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your system
- [Docker Compose](https://docs.docker.com/compose/install/) installed on your system (comes with Docker Desktop for Windows/Mac)

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tube-offline.git
   cd tube-offline
   ```

2. Make the start script executable:
   ```bash
   chmod +x start.sh
   ```

3. Run the start script:
   ```bash
   ./start.sh
   ```

4. Access TubeOffline in your browser at [http://localhost:5000](http://localhost:5000) (or your custom port if configured)

## Configuration Options

You can customize TubeOffline by editing the `.env` file:

```
# Port to access the application (default: 5000)
PORT=5000

# Path to store data on the host machine (default: ./data)
DATA_DIR=./data

# Download configuration
MAX_CONCURRENT_DOWNLOADS=3
DEFAULT_VIDEO_QUALITY=720
DOWNLOAD_SUBTITLES=true

# Timezone (default: UTC)
TZ=UTC
```

### Important Configuration Options:

- **PORT**: The port on which the application will be accessible (default: 5000)
- **DATA_DIR**: The directory on your host machine where all data will be stored (default: ./data)
- **MAX_CONCURRENT_DOWNLOADS**: Maximum number of simultaneous downloads (default: 3)
- **DEFAULT_VIDEO_QUALITY**: Default video quality (default: 720)
- **DOWNLOAD_SUBTITLES**: Whether to download subtitles automatically (default: true)
- **TZ**: Timezone for the application (default: UTC)

## Data Persistence

All your videos, thumbnails, and database are stored in the directory specified by `DATA_DIR` in your `.env` file. This data persists even when the container is stopped or removed.

## Managing the Application

### Start the Application

```bash
docker-compose up -d
```

### Stop the Application

```bash
docker-compose down
```

### View Logs

```bash
docker-compose logs -f
```

### Update the Application

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

## Troubleshooting

### yt-dlp Not Working

If you encounter issues with downloading videos, it might be because yt-dlp needs an update:

```bash
docker-compose exec tube-offline pip install --upgrade yt-dlp
```

### Permission Issues with Data Directory

If you encounter permission issues with the data directory:

```bash
sudo chown -R 1000:1000 ./data
```

### Port Already in Use

If the port is already in use, change the `PORT` value in your `.env` file.

## Backup and Restore

### Backup

To backup your TubeOffline data, simply create a copy of your data directory:

```bash
cp -r ./data ./tube-offline-backup-$(date +%Y%m%d)
```

### Restore

To restore from a backup:

1. Stop the application:
   ```bash
   docker-compose down
   ```

2. Replace the data directory with your backup:
   ```bash
   rm -rf ./data
   cp -r ./tube-offline-backup-YYYYMMDD ./data
   ```

3. Restart the application:
   ```bash
   docker-compose up -d
   ```