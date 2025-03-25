# Running TubeOffline with Docker

This guide explains how to run TubeOffline using Docker, which simplifies setup and ensures consistent performance across different environments.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration Options](#configuration-options)
- [Data Persistence](#data-persistence)
- [Managing the Application](#managing-the-application)
- [Storage Management](#storage-management)
- [Performance Tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)
- [Backup and Restore](#backup-and-restore)

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your system
- [Docker Compose](https://docs.docker.com/compose/install/) installed on your system (comes with Docker Desktop for Windows/Mac)

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://git.eidenz.moe/Eidenz/tube-offline.git
   cd tube-offline
   ```

2. Make the start script executable:
   ```bash
   chmod +x tubeoffline.sh
   ```

3. Run the start script:
   ```bash
   ./tubeoffline.sh start
   ```

4. Access TubeOffline in your browser at [http://localhost:5000](http://localhost:5000) (or your custom port if configured)

**Note: You can view all available commands by running `./tubeoffline.sh help`.**

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
or
```bash
./tubeoffline.sh start
```

### Stop the Application

```bash
docker-compose down
```
or
```bash
./tubeoffline.sh stop
```

### View Logs

```bash
docker-compose logs -f
```
or
```bash
./tubeoffline.sh logs
```

### Update the Application

When a new version of TubeOffline is available, follow these steps to update:

```bash
# Using the management script (recommended)
./tubeoffline.sh update

# Or manually:
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

Note: Your database and videos will be preserved during updates since they are stored in the mounted volume. However, it's always good practice to create a backup before updating:

```bash
./tubeoffline.sh backup
```

## Storage Management

Over time, your video collection may grow substantially. Here are some tips for managing your storage:

### Monitoring Storage Usage

Check the storage usage of your data directory:
```bash
du -sh ./data
du -sh ./data/* | sort -hr  # See breakdown by subdirectory
```

### Moving Data to a Different Location

If you need to move your data to a larger storage location:

1. Stop the application:
   ```bash
   ./tubeoffline.sh stop
   ```

2. Edit your `.env` file to change the `DATA_DIR` value:
   ```
   DATA_DIR=/path/to/new/location
   ```

3. Copy your existing data to the new location:
   ```bash
   mkdir -p /path/to/new/location
   cp -r ./data/* /path/to/new/location/
   ```

4. Start the application with the new data location:
   ```bash
   ./tubeoffline.sh start
   ```

### External Storage Management

For large collections, consider mounting external storage:

- **NAS/Network Storage**: Set `DATA_DIR` to a NFS or SMB mount point
- **External HDD/SSD**: Mount your drive and set `DATA_DIR` to the mount point

## Performance Tuning

### Docker Resource Allocation

If you experience performance issues, you can adjust Docker's resource allocation:

```bash
# Limit CPU usage (e.g., to 2 cores)
docker update --cpus=2 tube-offline

# Limit memory usage (e.g., to 4GB)
docker update --memory=4g tube-offline

# View current resource usage
docker stats tube-offline
```

### Optimizing Concurrent Downloads

Adjust the `MAX_CONCURRENT_DOWNLOADS` setting based on your network and system capabilities:
- For slower connections or less powerful systems: set to 1-2
- For high-bandwidth connections and powerful systems: set to 4-5

**Note**: Setting this too high may cause downloads to fail or your network connection to become unstable.

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

### Container Won't Start or Crashes

Check the logs for detailed error information:
```bash
docker-compose logs -f
```

If the database is corrupted, you may need to restore from a backup or, as a last resort, delete the database file and let the application create a new one:
```bash
# Only if absolutely necessary and you accept losing your library structure:
rm ./data/tube-offline.db
```

## Backup and Restore

### Backup

To backup your TubeOffline data, simply create a copy of your data directory:

```bash
# Using the management script
./tubeoffline.sh backup

# Or manually
cp -r ./data ./tube-offline-backup-$(date +%Y%m%d)
```

For automated backups, consider setting up a cron job:
```bash
# Add to crontab (crontab -e)
# This example runs a backup every Sunday at 2 AM
0 2 * * 0 cd /path/to/tube-offline && ./tubeoffline.sh backup
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