# TubeOffline - YouTube Offline Library

An elegant offline YouTube video library using YT-DLP with a React frontend and Express backend.

![TubeOffline Screenshot](screenshot.png)

## Features

- Download and store YouTube videos locally using YT-DLP
- Beautiful library interface to browse and watch offline videos
- Create and organize playlists
- Automatic English subtitle downloading when available
- Metadata extraction and tag-based browsing
- High-quality video playback with subtitle support
- Real-time download progress updates
- Search functionality for your offline library

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) (v6 or higher)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (must be installed and in your PATH)

### Installing yt-dlp

#### Windows
```
winget install yt-dlp
```
or download from https://github.com/yt-dlp/yt-dlp/releases and add to PATH

#### macOS
```
brew install yt-dlp
```

#### Linux
```
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tube-offline.git
cd tube-offline
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

This will start both the frontend (Vite) and backend (Express) servers concurrently.

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Production Build

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory. To serve these files along with the backend:

```bash
npm start
```

## Configuration

You can modify the server configuration in `server/.env`:

- `PORT`: Backend server port (default: 5000)
- `DB_PATH`: SQLite database file path
- `VIDEOS_DIR`: Directory to store downloaded videos
- `THUMBNAILS_DIR`: Directory to store video thumbnails
- `SUBTITLES_DIR`: Directory to store subtitles
- `DEFAULT_VIDEO_QUALITY`: Default video quality for downloads
- `DOWNLOAD_SUBTITLES`: Whether to download subtitles by default
- `MAX_CONCURRENT_DOWNLOADS`: Maximum number of concurrent downloads

## Tech Stack

### Frontend
- React
- React Router Dom
- Framer Motion for animations
- Tailwind CSS for styling
- Vite for development and building
- React Player for video playback
- Axios for API requests
- React Beautiful DnD for drag-and-drop playlist management

### Backend
- Express.js
- Better-SQLite3 for database
- yt-dlp for YouTube downloading
- WebSockets for real-time updates

## License

MIT