# TubeOffline API Documentation

This document provides information about the TubeOffline REST API endpoints that can be used to automate tasks or integrate with other applications.

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Video Management](#video-management)
- [Download Management](#download-management)
- [Playlist Management](#playlist-management)
- [Search](#search)
- [Favorites](#favorites)
- [Automation Examples](#automation-examples)

## Base URL

All API endpoints are relative to the base URL where your TubeOffline instance is running.

Default: `http://localhost:5000/api`

## Authentication

Currently, the API does not require authentication, as it's designed for local use. If you've exposed the application externally, consider implementing appropriate security measures.

## Video Management

### List Videos

Retrieves a paginated list of videos in the library.

```
GET /api/videos
```

**Query Parameters:**
- `limit` (optional): Number of videos to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "videos": [
    {
      "id": 123,
      "youtube_id": "dQw4w9WgXcQ",
      "title": "Video Title",
      "channel": "Channel Name",
      "thumbnail_url": "/thumbnails/dQw4w9WgXcQ.jpg",
      "duration": 212,
      "duration_formatted": "03:32",
      "view_count": 5,
      "date_added": "2023-05-01T12:00:00.000Z",
      "last_viewed": "2023-05-10T15:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Get Video Details

Retrieves detailed information about a specific video.

```
GET /api/videos/:id
```

**Response:**
```json
{
  "id": 123,
  "youtube_id": "dQw4w9WgXcQ",
  "title": "Video Title",
  "description": "Video description text",
  "channel": "Channel Name",
  "video_url": "/videos/dQw4w9WgXcQ.mp4",
  "thumbnail_url": "/thumbnails/dQw4w9WgXcQ.jpg",
  "subtitle_url": "/subtitles/dQw4w9WgXcQ.en.vtt",
  "duration": 212,
  "duration_formatted": "03:32",
  "view_count": 5,
  "date_added": "2023-05-01T12:00:00.000Z",
  "last_viewed": "2023-05-10T15:30:00.000Z",
  "tags": [
    { "id": 1, "name": "music" },
    { "id": 2, "name": "official" }
  ],
  "metadata": {
    // Additional metadata from YouTube
  }
}
```

### Record Video View

Records that a video has been viewed.

```
POST /api/videos/:id/view
```

**Request Body:**
```json
{
  "duration": 120
}
```

**Response:**
```json
{
  "success": true
}
```

### Get Recent Videos

Retrieves recently viewed videos.

```
GET /api/videos/history/recent
```

**Query Parameters:**
- `limit` (optional): Number of videos to return (default: 10)

**Response:**
```json
[
  {
    "id": 123,
    "youtube_id": "dQw4w9WgXcQ",
    "title": "Video Title",
    "channel": "Channel Name",
    "thumbnail_url": "/thumbnails/dQw4w9WgXcQ.jpg",
    "duration": 212,
    "duration_formatted": "03:32",
    "last_viewed": "2023-05-10T15:30:00.000Z"
  }
]
```

### Delete Video

Deletes a video from the library.

```
DELETE /api/videos/:id
```

**Response:**
```json
{
  "success": true
}
```

### Get Related Videos

Retrieves videos related to a specific video based on shared tags.

```
GET /api/videos/:id/related
```

**Query Parameters:**
- `limit` (optional): Number of videos to return (default: 6)

**Response:**
```json
[
  {
    "id": 456,
    "youtube_id": "xvFZjo5PgG0",
    "title": "Related Video Title",
    "channel": "Channel Name",
    "thumbnail_url": "/thumbnails/xvFZjo5PgG0.jpg",
    "duration": 180,
    "duration_formatted": "03:00",
    "view_count": 3,
    "date_added": "2023-04-20T10:15:00.000Z",
    "sharedTags": [
      { "id": 1, "name": "music" }
    ]
  }
]
```

## Download Management

### Check yt-dlp Installation

Checks if yt-dlp is installed and available.

```
GET /api/download/check
```

**Response:**
```json
{
  "installed": true
}
```

### Get Video Info

Retrieves information about a YouTube video without downloading it.

```
GET /api/download/info?url=https://youtube.com/watch?v=dQw4w9WgXcQ
```

**Response:**
```json
{
  "id": "dQw4w9WgXcQ",
  "title": "Video Title",
  "description": "Video description",
  "channel": "Channel Name",
  "duration": 212,
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "upload_date": "20090225"
}
```

### Get Playlist Info

Retrieves information about a YouTube playlist without downloading it.

```
GET /api/download/playlist-info?url=https://youtube.com/playlist?list=PLexample
```

**Response:**
```json
{
  "success": true,
  "id": "PLexample",
  "title": "Playlist Title",
  "channel": "Channel Name",
  "videoCount": 50,
  "videos": [
    {
      "id": "dQw4w9WgXcQ",
      "title": "Video Title",
      "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg"
    }
  ]
}
```

### Start Download

Starts downloading a YouTube video.

```
POST /api/download
```

**Request Body:**
```json
{
  "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "quality": "1080",
  "downloadSubtitles": true,
  "addToPlaylistId": 5
}
```

**Response:**
```json
{
  "message": "Download started"
}
```

### Start Playlist Download

Starts downloading a YouTube playlist.

```
POST /api/download/playlist
```

**Request Body:**
```json
{
  "url": "https://youtube.com/playlist?list=PLexample",
  "quality": "720",
  "downloadSubtitles": true,
  "playlistId": 3
}
```

**Response:**
```json
{
  "message": "Playlist download started",
  "playlistId": "PLexample",
  "title": "Playlist Title",
  "videoCount": 50
}
```

### Cancel Download

Cancels an active download.

```
DELETE /api/download/:youtubeId
```

**Response:**
```json
{
  "success": true
}
```

### Get Active Downloads

Retrieves a list of currently active downloads.

```
GET /api/download/active
```

**Response:**
```json
[
  {
    "id": 5,
    "youtube_id": "dQw4w9WgXcQ",
    "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "title": "Video Title",
    "status": "downloading",
    "progress": 45.6,
    "quality": "1080",
    "download_subtitles": 1,
    "date_started": "2023-05-15T14:30:00.000Z"
  }
]
```

### Get Download History

Retrieves the download history.

```
GET /api/download/history
```

**Query Parameters:**
- `limit` (optional): Number of items to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "downloads": [
    {
      "id": 5,
      "youtube_id": "dQw4w9WgXcQ",
      "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "title": "Video Title",
      "status": "completed",
      "progress": 100,
      "quality": "1080",
      "download_subtitles": 1,
      "date_started": "2023-05-15T14:30:00.000Z",
      "date_completed": "2023-05-15T14:35:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

## Playlist Management

### List Playlists

Retrieves all playlists.

```
GET /api/playlists
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Playlist Name",
    "description": "Playlist description",
    "date_created": "2023-05-01T12:00:00.000Z",
    "last_updated": "2023-05-10T15:30:00.000Z",
    "video_count": 25,
    "thumbnail_url": "/thumbnails/dQw4w9WgXcQ.jpg"
  }
]
```

### Create Playlist

Creates a new playlist.

```
POST /api/playlists
```

**Request Body:**
```json
{
  "name": "New Playlist",
  "description": "Description for the new playlist"
}
```

**Response:**
```json
{
  "id": 2,
  "name": "New Playlist",
  "description": "Description for the new playlist",
  "date_created": "2023-05-20T10:00:00.000Z",
  "last_updated": "2023-05-20T10:00:00.000Z",
  "video_count": 0
}
```

### Get Playlist Details

Retrieves detailed information about a specific playlist including its videos.

```
GET /api/playlists/:id
```

**Response:**
```json
{
  "id": 1,
  "name": "Playlist Name",
  "description": "Playlist description",
  "date_created": "2023-05-01T12:00:00.000Z",
  "last_updated": "2023-05-10T15:30:00.000Z",
  "video_count": 25,
  "videos": [
    {
      "id": 123,
      "youtube_id": "dQw4w9WgXcQ",
      "title": "Video Title",
      "channel": "Channel Name",
      "thumbnail_url": "/thumbnails/dQw4w9WgXcQ.jpg",
      "duration": 212,
      "duration_formatted": "03:32",
      "position": 1,
      "last_viewed": "2023-05-10T15:30:00.000Z"
    }
  ]
}
```

### Update Playlist

Updates a playlist's information.

```
PUT /api/playlists/:id
```

**Request Body:**
```json
{
  "name": "Updated Playlist Name",
  "description": "Updated description",
  "thumbnail_id": 123
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Updated Playlist Name",
  "description": "Updated description",
  "date_created": "2023-05-01T12:00:00.000Z",
  "last_updated": "2023-05-20T11:00:00.000Z",
  "video_count": 25,
  "thumbnail_url": "/thumbnails/dQw4w9WgXcQ.jpg"
}
```

### Delete Playlist

Deletes a playlist.

```
DELETE /api/playlists/:id
```

**Response:**
```json
{
  "success": true
}
```

### Add Video to Playlist

Adds a video to a playlist.

```
POST /api/playlists/:id/videos
```

**Request Body:**
```json
{
  "videoId": 123
}
```

**Response:**
```json
{
  "success": true,
  "position": 26
}
```

### Remove Video from Playlist

Removes a video from a playlist.

```
DELETE /api/playlists/:id/videos/:videoId
```

**Response:**
```json
{
  "success": true
}
```

### Reorder Playlist Videos

Reorders videos within a playlist.

```
PUT /api/playlists/:id/reorder
```

**Request Body:**
```json
{
  "videoIds": [123, 456, 789]
}
```

**Response:**
```json
{
  "success": true
}
```

## Search

### Search Videos

Searches for videos in the library.

```
GET /api/search?query=search+term&type=all
```

**Query Parameters:**
- `query` (required): Search term
- `type` (optional): One of "all", "title", "channel", or "tag" (default: "all")
- `limit` (optional): Number of videos to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "videos": [
    {
      "id": 123,
      "youtube_id": "dQw4w9WgXcQ",
      "title": "Video Title",
      "channel": "Channel Name",
      "thumbnail_url": "/thumbnails/dQw4w9WgXcQ.jpg",
      "duration": 212,
      "duration_formatted": "03:32",
      "view_count": 5,
      "date_added": "2023-05-01T12:00:00.000Z",
      "last_viewed": "2023-05-10T15:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

### Get All Tags

Retrieves all tags used in the library.

```
GET /api/search/tags
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "music",
    "video_count": 50
  },
  {
    "id": 2,
    "name": "tutorial",
    "video_count": 25
  }
]
```

### Get Top Tags

Retrieves the most used tags in the library.

```
GET /api/search/tags/top
```

**Query Parameters:**
- `limit` (optional): Number of tags to return (default: 10)

**Response:**
```json
[
  {
    "id": 1,
    "name": "music",
    "video_count": 50
  },
  {
    "id": 2,
    "name": "tutorial",
    "video_count": 25
  }
]
```

## Favorites

### Get Favorite IDs

Retrieves all favorite video IDs in a single call.

```
GET /api/favorites/ids
```

**Response:**
```json
{
  "favoriteIds": [123, 456, 789]
}
```

### Check Favorite Status

Checks if a video is in the favorites.

```
GET /api/favorites/status/:id
```

**Response:**
```json
{
  "isFavorite": true
}
```

### Get Favorites

Retrieves all favorite videos.

```
GET /api/favorites
```

**Query Parameters:**
- `limit` (optional): Number of videos to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "videos": [
    {
      "id": 123,
      "youtube_id": "dQw4w9WgXcQ",
      "title": "Video Title",
      "channel": "Channel Name",
      "thumbnail_url": "/thumbnails/dQw4w9WgXcQ.jpg",
      "duration": 212,
      "duration_formatted": "03:32",
      "date_added": "2023-05-01T12:00:00.000Z",
      "last_viewed": "2023-05-10T15:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 30,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Add to Favorites

Adds a video to favorites.

```
POST /api/favorites/:id
```

**Response:**
```json
{
  "success": true,
  "added": true,
  "message": "Added to favorites"
}
```

### Remove from Favorites

Removes a video from favorites.

```
DELETE /api/favorites/:id
```

**Response:**
```json
{
  "success": true,
  "removed": true,
  "message": "Removed from favorites"
}
```

## Automation Examples

Here are some examples of how you might use the API for automation:

### Bash: Download a YouTube Video

```bash
#!/bin/bash

# URL of the YouTube video to download
VIDEO_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Start the download
curl -X POST http://localhost:5000/api/download \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$VIDEO_URL\",\"quality\":\"1080\",\"downloadSubtitles\":true}"

echo "Download initiated for $VIDEO_URL"
```

### Python: Batch Download Multiple Videos

```python
#!/usr/bin/env python3
import requests
import time
import sys

TUBEOFFLINE_API = "http://localhost:5000/api"

def download_video(url, quality="1080"):
    """Start a video download and return its YouTube ID"""
    response = requests.post(f"{TUBEOFFLINE_API}/download", json={
        "url": url,
        "quality": quality,
        "downloadSubtitles": True
    })
    
    if response.status_code == 202:
        # Get the video ID from the info endpoint
        info_response = requests.get(f"{TUBEOFFLINE_API}/download/info", params={"url": url})
        if info_response.status_code == 200:
            return info_response.json().get("id")
    
    return None

def check_download_status(youtube_id):
    """Check if a download is complete"""
    response = requests.get(f"{TUBEOFFLINE_API}/download/active")
    
    if response.status_code == 200:
        active_downloads = response.json()
        for download in active_downloads:
            if download.get("youtube_id") == youtube_id:
                return False  # Still downloading
    
    # Not in active downloads, so it's either complete or failed
    return True

def main():
    if len(sys.argv) < 2:
        print("Usage: python batch_download.py video_urls.txt")
        sys.exit(1)
    
    with open(sys.argv[1], 'r') as f:
        urls = [line.strip() for line in f if line.strip()]
    
    youtube_ids = []
    for url in urls:
        print(f"Starting download for {url}")
        youtube_id = download_video(url)
        if youtube_id:
            youtube_ids.append(youtube_id)
        time.sleep(2)  # Small delay between starting downloads
    
    print(f"Started {len(youtube_ids)} downloads")
    
    # Wait for all downloads to complete
    while youtube_ids:
        for yt_id in list(youtube_ids):
            if check_download_status(yt_id):
                print(f"Download complete for {yt_id}")
                youtube_ids.remove(yt_id)
        
        if youtube_ids:
            print(f"Waiting for {len(youtube_ids)} downloads to complete...")
            time.sleep(10)
    
    print("All downloads complete!")

if __name__ == "__main__":
    main()
```

### Node.js: Create a Playlist and Add Videos

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function createPlaylist(name, description) {
  try {
    const response = await axios.post(`${API_BASE}/playlists`, {
      name,
      description
    });
    return response.data;
  } catch (error) {
    console.error('Failed to create playlist:', error.message);
    return null;
  }
}

async function searchVideos(query) {
  try {
    const response = await axios.get(`${API_BASE}/search?query=${encodeURIComponent(query)}`);
    return response.data.videos;
  } catch (error) {
    console.error('Failed to search videos:', error.message);
    return [];
  }
}

async function addVideoToPlaylist(playlistId, videoId) {
  try {
    const response = await axios.post(`${API_BASE}/playlists/${playlistId}/videos`, {
      videoId
    });
    return response.data.success;
  } catch (error) {
    console.error(`Failed to add video ${videoId} to playlist ${playlistId}:`, error.message);
    return false;
  }
}

async function createCategoryPlaylist() {
  // Create a new playlist
  const playlist = await createPlaylist(
    'Programming Tutorials',
    'A collection of programming tutorial videos'
  );
  
  if (!playlist) {
    console.error('Failed to create playlist');
    return;
  }
  
  console.log(`Created playlist: ${playlist.name} (ID: ${playlist.id})`);
  
  // Search for videos with "programming tutorial" tag/keyword
  const videos = await searchVideos('programming tutorial');
  
  if (videos.length === 0) {
    console.log('No matching videos found');
    return;
  }
  
  console.log(`Found ${videos.length} matching videos`);
  
  // Add videos to the playlist
  for (const video of videos) {
    console.log(`Adding "${video.title}" to playlist...`);
    const success = await addVideoToPlaylist(playlist.id, video.id);
    if (success) {
      console.log('  Added successfully');
    } else {
      console.log('  Failed to add');
    }
  }
  
  console.log('Playlist creation complete!');
}

createCategoryPlaylist().catch(err => {
  console.error('Script failed:', err);
});
```

### WebSocket Connection for Real-Time Updates

For real-time updates on download progress, you can connect to the WebSocket endpoint:

```javascript
const socket = new WebSocket('ws://localhost:5000/ws');

socket.onopen = () => {
  console.log('Connected to TubeOffline WebSocket');
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Handle different message types
  switch (data.type) {
    case 'connection':
      console.log(`Connected as client ${data.clientId}`);
      break;
    
    case 'progress':
      console.log(`Download progress for ${data.youtubeId}: ${data.progress}%`);
      break;
    
    case 'download_completed':
      console.log(`Download completed for ${data.youtubeId}: ${data.videoData.title}`);
      break;
    
    case 'error':
      console.log(`Download error for ${data.youtubeId}: ${data.error}`);
      break;
    
    case 'playlist_progress':
      console.log(`Playlist ${data.playlistId} progress: ${data.completed}/${data.videoCount} videos (${data.progress}%)`);
      break;
  }
};

socket.onclose = () => {
  console.log('Connection closed');
};

socket.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

This documentation covers the main API endpoints available in TubeOffline that can be used for external automation. The examples demonstrate common use cases like batch downloading, playlist creation, and monitoring download progress.